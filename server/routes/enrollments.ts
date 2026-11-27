import { Router } from 'express'
import { and, desc, eq, gte, ne, notInArray } from 'drizzle-orm'
import { DateTime } from 'luxon'
import { db } from '../db/index.js'
import { enrollments, classInstances, students, teachers } from '../db/schema.js'
import { enrollmentCreateSchema, enrollmentRescheduleSchema, idParamSchema } from '../schemas/index.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { generateOccurrenceInstants, sixMonthsLater, CENTRAL_ZONE } from '../lib/schedule.js'
import { checkPatternWithinHours } from '../lib/hours.js'
import { assertTeacherFree } from '../lib/teacherConflicts.js'
import { notifyStudentScheduled, notifySeriesRescheduled } from '../lib/notifications.js'
import { logger } from '../lib/log.js'

export const enrollmentsRouter: Router = Router()

enrollmentsRouter.use(requireAuth)

// GET /api/enrollments/students (admin or teacher) — the approved regular
// students a class can be scheduled for. Teachers enroll students themselves
// now but can't call the admin-only /api/students, so this is the minimal
// picker list: id, name, grade. A teacher doesn't see students whose active
// schedule belongs to another teacher (one teacher per student — the POST would
// reject them anyway).
enrollmentsRouter.get('/students', async (_req, res, next) => {
  try {
    const user = res.locals.user!
    const base = and(eq(students.approved, true), eq(students.program, 'regular'))
    const where =
      user.role === 'teacher'
        ? and(
            base,
            notInArray(
              students.id,
              db
                .select({ id: enrollments.studentId })
                .from(enrollments)
                .where(and(eq(enrollments.status, 'active'), ne(enrollments.teacherId, user.teacherId ?? -1))),
            ),
          )
        : base
    const rows = await db
      .select({ id: students.id, studentName: students.studentName, gradeLevel: students.gradeLevel })
      .from(students)
      .where(where)
      .orderBy(students.studentName)
    res.json({ students: rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/enrollments (admin or teacher) — create the recurring rule and
// generate 6 months of individual class_instances. Enrollment + instances are
// written in a single transaction so a partial failure leaves nothing behind.
// A teacher always enrolls under THEMSELVES: teacher_id comes from the token
// and any body value is ignored. An admin picks the teacher.
enrollmentsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = enrollmentCreateSchema.parse(req.body)
    const user = res.locals.user!
    let teacherId: number
    if (user.role === 'teacher') {
      if (user.teacherId == null) throw new HttpError(403, 'Your account isn’t linked to a teacher profile.')
      teacherId = user.teacherId
    } else {
      if (parsed.teacherId == null) throw new HttpError(400, 'Pick a teacher.')
      teacherId = parsed.teacherId
    }
    const input = { ...parsed, teacherId }

    const [student] = await db
      .select({ id: students.id, approved: students.approved })
      .from(students)
      .where(eq(students.id, input.studentId))
      .limit(1)
    if (!student) throw new HttpError(404, 'Student not found.')
    // A student must be approved (by an admin/teacher) before they can be put on
    // the schedule. Legacy self-registrations landed unapproved; admin-registered
    // students are approved from the start. This is the authoritative gate — the form also hides
    // unapproved students, but never trust the client.
    if (!student.approved) {
      throw new HttpError(409, 'This student hasn’t been approved yet. Approve them in the Students tab first, then schedule their classes.')
    }
    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, input.teacherId)).limit(1)
    if (!teacher) throw new HttpError(404, 'Teacher not found.')

    // One teacher per student: a student's active schedule belongs to a single
    // teacher. More time slots with the SAME teacher are fine; a second teacher
    // is not — cancel or reschedule the existing series first.
    const [conflicting] = await db
      .select({ teacherName: teachers.name })
      .from(enrollments)
      .innerJoin(teachers, eq(enrollments.teacherId, teachers.id))
      .where(
        and(
          eq(enrollments.studentId, input.studentId),
          eq(enrollments.status, 'active'),
          ne(enrollments.teacherId, input.teacherId),
        ),
      )
      .limit(1)
    if (conflicting) {
      throw new HttpError(
        409,
        `This student already has an active schedule with ${conflicting.teacherName}. One teacher per student — cancel that schedule first, or add this class under ${conflicting.teacherName}.`,
      )
    }

    // Every selected day must be able to hold the class inside that day's
    // opening hours (weekdays 3-9 PM, weekends 2-6 PM).
    const hoursProblem = checkPatternWithinHours(
      input.daysOfWeek,
      input.startTimeLocal,
      input.durationMinutes,
    )
    if (hoursProblem) throw new HttpError(400, hoursProblem)

    const endDate = sixMonthsLater(input.startDate)
    const instants = generateOccurrenceInstants({
      startDate: input.startDate,
      endDate,
      daysOfWeek: input.daysOfWeek,
      startTimeLocal: input.startTimeLocal,
    })

    const enrollment = await db.transaction(async (tx) => {
      await assertTeacherFree(
        tx,
        input.teacherId,
        instants.map((start) => ({ start, durationMinutes: input.durationMinutes })),
        { who: user.role === 'teacher' ? 'you' : 'teacher' },
      )
      const [row] = await tx
        .insert(enrollments)
        .values({
          studentId: input.studentId,
          teacherId: input.teacherId,
          daysOfWeek: input.daysOfWeek,
          startTimeLocal: input.startTimeLocal,
          durationMinutes: input.durationMinutes,
          startDate: input.startDate,
          endDate,
        })
        .returning()

      if (instants.length > 0) {
        await tx.insert(classInstances).values(
          instants.map((startsAt) => ({
            enrollmentId: row.id,
            studentId: input.studentId,
            teacherId: input.teacherId,
            startsAtUtc: startsAt,
            durationMinutes: input.durationMinutes,
          })),
        )
      }
      return row
    })

    notifyStudentScheduled({
      studentId: input.studentId,
      teacherId: input.teacherId,
      daysOfWeek: input.daysOfWeek,
      startTimeLocal: input.startTimeLocal,
      durationMinutes: input.durationMinutes,
      startDate: input.startDate,
    })
    logger.info('enrollment', 'created', {
      id: enrollment.id,
      instances: instants.length,
      user: res.locals.user?.username,
    })
    res.status(201).json({ enrollment, instancesGenerated: instants.length })
  } catch (err) {
    next(err)
  }
})

// POST /api/enrollments/:id/reschedule (admin) — re-pattern a series from today
// onward: new weekdays / start time / duration. Classes already held (or already
// cancelled) stay as history at their old slots; FUTURE scheduled occurrences are
// replaced with the new pattern through the series' original end date (the
// 6-month horizon does not extend).
enrollmentsRouter.post('/:id/reschedule', requireAdmin, async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const input = enrollmentRescheduleSchema.parse(req.body)

    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, id)).limit(1)
    if (!enrollment) throw new HttpError(404, 'Series not found.')
    if (enrollment.status !== 'active') {
      throw new HttpError(409, 'This series is cancelled — schedule a new class instead.')
    }

    const hoursProblem = checkPatternWithinHours(
      input.daysOfWeek,
      input.startTimeLocal,
      input.durationMinutes,
    )
    if (hoursProblem) throw new HttpError(400, hoursProblem)

    const now = new Date()
    const todayCentral = DateTime.now().setZone(CENTRAL_ZONE).toISODate() as string
    // Regenerate from today through the ORIGINAL end date; drop any instant that
    // is already in the past (e.g. earlier today).
    const instants = generateOccurrenceInstants({
      startDate: todayCentral,
      endDate: enrollment.endDate,
      daysOfWeek: input.daysOfWeek,
      startTimeLocal: input.startTimeLocal,
    }).filter((d) => d.getTime() >= now.getTime())

    const result = await db.transaction(async (tx) => {
      // This series' own future classes are being replaced, so they don't
      // count as clashes; every other class on the teacher's calendar does.
      await assertTeacherFree(
        tx,
        enrollment.teacherId,
        instants.map((start) => ({ start, durationMinutes: input.durationMinutes })),
        { excludeEnrollmentId: id },
      )
      await tx
        .update(enrollments)
        .set({
          daysOfWeek: input.daysOfWeek,
          startTimeLocal: input.startTimeLocal,
          durationMinutes: input.durationMinutes,
          updatedAt: now,
        })
        .where(eq(enrollments.id, id))

      // The future scheduled occurrences are being MOVED, so the old rows go
      // away (they're not history — they never happened). Past rows and
      // cancelled rows are untouched.
      const removed = await tx
        .delete(classInstances)
        .where(
          and(
            eq(classInstances.enrollmentId, id),
            eq(classInstances.status, 'scheduled'),
            gte(classInstances.startsAtUtc, now),
          ),
        )
        .returning({ id: classInstances.id })

      if (instants.length > 0) {
        await tx.insert(classInstances).values(
          instants.map((startsAt) => ({
            enrollmentId: id,
            studentId: enrollment.studentId,
            teacherId: enrollment.teacherId,
            startsAtUtc: startsAt,
            durationMinutes: input.durationMinutes,
          })),
        )
      }
      return { removed: removed.length, generated: instants.length }
    })

    notifySeriesRescheduled({
      studentId: enrollment.studentId,
      daysOfWeek: input.daysOfWeek,
      startTimeLocal: input.startTimeLocal,
      durationMinutes: input.durationMinutes,
    })
    logger.info('enrollment', 'rescheduled', { id, ...result, by: res.locals.user?.username })
    res.json({ ok: true, instancesRemoved: result.removed, instancesGenerated: result.generated })
  } catch (err) {
    next(err)
  }
})

// GET /api/enrollments — admin: all; teacher: only their own (teacher_id forced
// from the token, never trusted from the client).
enrollmentsRouter.get('/', async (_req, res, next) => {
  try {
    const user = res.locals.user!
    const rows =
      user.role === 'admin'
        ? await db.select().from(enrollments).orderBy(desc(enrollments.createdAt))
        : await db
            .select()
            .from(enrollments)
            .where(eq(enrollments.teacherId, user.teacherId ?? -1))
            .orderBy(desc(enrollments.createdAt))
    res.json({ enrollments: rows })
  } catch (err) {
    next(err)
  }
})
