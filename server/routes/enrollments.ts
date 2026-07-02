import { Router } from 'express'
import { and, desc, eq, gte, ne } from 'drizzle-orm'
import { DateTime } from 'luxon'
import { db } from '../db/index.js'
import { enrollments, classInstances, students, teachers } from '../db/schema.js'
import { enrollmentCreateSchema, enrollmentRescheduleSchema, idParamSchema } from '../schemas/index.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { generateOccurrenceInstants, sixMonthsLater, CENTRAL_ZONE } from '../lib/schedule.js'
import { notifyStudentScheduled, notifySeriesRescheduled } from '../lib/notifications.js'
import { logger } from '../lib/log.js'

export const enrollmentsRouter: Router = Router()

enrollmentsRouter.use(requireAuth)

// POST /api/enrollments (admin) — create the recurring rule and generate 6
// months of individual class_instances. Enrollment + instances are written in a
// single transaction so a partial failure leaves nothing behind.
enrollmentsRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const input = enrollmentCreateSchema.parse(req.body)

    const [student] = await db
      .select({ id: students.id, approved: students.approved })
      .from(students)
      .where(eq(students.id, input.studentId))
      .limit(1)
    if (!student) throw new HttpError(404, 'Student not found.')
    // A student must be approved (by an admin/teacher) before they can be put on
    // the schedule. Self-registrations land unapproved; admin-added students are
    // approved by default. This is the authoritative gate — the form also hides
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

    const endDate = sixMonthsLater(input.startDate)
    const instants = generateOccurrenceInstants({
      startDate: input.startDate,
      endDate,
      daysOfWeek: input.daysOfWeek,
      startTimeLocal: input.startTimeLocal,
    })

    const enrollment = await db.transaction(async (tx) => {
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
