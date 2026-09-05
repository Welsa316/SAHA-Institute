import { Router } from 'express'
import { and, asc, eq, gte } from 'drizzle-orm'
import { db } from '../db/index.js'
import { teachers, users, enrollments, classInstances } from '../db/schema.js'
import { teacherCreateSchema, idParamSchema } from '../schemas/index.js'
import { signInviteToken, signResetToken, passwordFingerprint } from '../lib/auth.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { notifyTeacherClassesCancelled } from '../lib/notifications.js'
import { sendTeacherInvite, sendTeacherReset } from '../lib/notifications.js'
import { logger } from '../lib/log.js'

export const teachersRouter: Router = Router()

// Teacher management is admin-only across the board.
teachersRouter.use(requireAuth, requireAdmin)

// GET /api/teachers — list for the master-calendar filter, the scheduling form's
// teacher picker, and the Teachers admin tab. `status` is 'active' when a login
// exists (invited teachers who finished setup) or 'pending' (invited, no
// password yet).
teachersRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: teachers.id,
        name: teachers.name,
        color: teachers.color,
        email: teachers.email,
        userId: users.id,
      })
      .from(teachers)
      .leftJoin(users, eq(users.teacherId, teachers.id))
      .orderBy(asc(teachers.name))

    const list = rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      email: r.email,
      status: r.userId ? 'active' : 'pending',
    }))
    res.json({ teachers: list })
  } catch (err) {
    next(err)
  }
})

// POST /api/teachers — create a teacher (name, email, colour) and return a
// one-time invite token. No login is created yet; the teacher sets their own
// password via the invite link. The email becomes their username at that point,
// so reject collisions up front with a friendly message.
teachersRouter.post('/', async (req, res, next) => {
  try {
    const { name, email, color } = teacherCreateSchema.parse(req.body)

    const [dupeTeacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.email, email)).limit(1)
    if (dupeTeacher) throw new HttpError(409, 'A teacher with this email already exists.')
    const [dupeUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, email)).limit(1)
    if (dupeUser) throw new HttpError(409, 'That email is already in use by another account.')

    const [teacher] = await db.insert(teachers).values({ name, email, color }).returning()
    const inviteToken = signInviteToken(teacher.id)
    // Email the setup link to the TEACHER so onboarding is self-serve — the
    // admin never has to forward anything. Awaited (not fire-and-forget)
    // because the response tells the UI whether to fall back to a copyable
    // link; a send failure must not undo the teacher that was just created.
    const invited = await sendTeacherInvite({ name: teacher.name, email, token: inviteToken })
    logger.info('teachers', 'created', { teacherId: teacher.id, invited })
    res.status(201).json({
      teacher: { id: teacher.id, name: teacher.name, color: teacher.color, email: teacher.email, status: 'pending' },
      inviteToken,
      invited,
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/teachers/:id/invite — mint a fresh invite token for a teacher who
// hasn't set up their account yet (so the admin can re-copy the link). Tokens
// aren't stored; they're regenerated on demand and expire on their own.
teachersRouter.post('/:id/invite', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1)
    if (!teacher) throw new HttpError(404, 'Teacher not found.')
    if (!teacher.email) throw new HttpError(400, 'This teacher has no email on file to invite.')

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.teacherId, id)).limit(1)
    if (existing) throw new HttpError(409, 'This teacher already has an account.')

    const inviteToken = signInviteToken(teacher.id)
    const invited = await sendTeacherInvite({ name: teacher.name, email: teacher.email, token: inviteToken })
    logger.info('teachers', 'invite resent', { teacherId: teacher.id, invited })
    res.json({ inviteToken, invited })
  } catch (err) {
    next(err)
  }
})

// POST /api/teachers/:id/reset — issue a one-time password-RESET link for a
// teacher who already has an account. The teacher opens it and sets a new
// password themselves (we never handle it). The token is fingerprint-bound to
// the current password hash, so it's spent the instant the password changes.
teachersRouter.post('/:id/reset', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1)
    if (!teacher) throw new HttpError(404, 'Teacher not found.')

    const [account] = await db.select().from(users).where(eq(users.teacherId, id)).limit(1)
    if (!account) throw new HttpError(409, "This teacher hasn't set up their account yet — send the invite link instead.")

    const resetToken = signResetToken(teacher.id, passwordFingerprint(account.passwordHash))
    const sent = teacher.email
      ? await sendTeacherReset({ name: teacher.name, email: teacher.email, token: resetToken })
      : false
    logger.info('teachers', 'reset link issued', { teacherId: teacher.id, sent })
    res.json({ resetToken, sent })
  } catch (err) {
    next(err)
  }
})

// POST /api/teachers/:id/cancel-classes — cancel ALL of a teacher's upcoming
// scheduled classes (and their active enrollments) so the teacher can be
// removed. Affected families are emailed. Cancelled rows stay as history.
teachersRouter.post('/:id/cancel-classes', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1)
    if (!teacher) throw new HttpError(404, 'Teacher not found.')
    const now = new Date()

    const cancelled = await db.transaction(async (tx) => {
      await tx
        .update(enrollments)
        .set({ status: 'cancelled', updatedAt: now })
        .where(and(eq(enrollments.teacherId, id), eq(enrollments.status, 'active')))
      return tx
        .update(classInstances)
        .set({ status: 'cancelled', cancelType: 'series_cancelled', updatedAt: now })
        .where(and(eq(classInstances.teacherId, id), eq(classInstances.status, 'scheduled'), gte(classInstances.startsAtUtc, now)))
        .returning({ studentId: classInstances.studentId })
    })

    const studentIds = [...new Set(cancelled.map((r) => r.studentId))]
    notifyTeacherClassesCancelled(studentIds, teacher.name)
    logger.info('teachers', 'classes cancelled', { teacherId: id, instances: cancelled.length, students: studentIds.length, by: res.locals.user?.username })
    res.json({ ok: true, instancesCancelled: cancelled.length, studentsAffected: studentIds.length })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/teachers/:id — permanently remove a teacher. Blocked while they
// still have upcoming scheduled classes (cancel those first, which notifies the
// families). Then the teacher and their whole scheduling footprint — past/
// cancelled class_instances, enrollments, and login — are hard-deleted.
teachersRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, id)).limit(1)
    if (!teacher) throw new HttpError(404, 'Teacher not found.')

    const now = new Date()
    const upcoming = await db
      .select({ id: classInstances.id })
      .from(classInstances)
      .where(and(eq(classInstances.teacherId, id), eq(classInstances.status, 'scheduled'), gte(classInstances.startsAtUtc, now)))
    if (upcoming.length > 0) {
      res.status(409).json({
        error: `This teacher has ${upcoming.length} upcoming class${upcoming.length === 1 ? '' : 'es'}. Cancel them first, then remove the teacher.`,
        upcomingCount: upcoming.length,
      })
      return
    }

    await db.transaction(async (tx) => {
      await tx.delete(classInstances).where(eq(classInstances.teacherId, id))
      await tx.delete(enrollments).where(eq(enrollments.teacherId, id))
      await tx.delete(users).where(eq(users.teacherId, id))
      await tx.delete(teachers).where(eq(teachers.id, id))
    })
    logger.info('teachers', 'deleted', { teacherId: id, by: res.locals.user?.username })
    res.json({ ok: true, result: 'deleted' })
  } catch (err) {
    next(err)
  }
})
