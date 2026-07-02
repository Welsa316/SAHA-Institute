import { Router } from 'express'
import { and, asc, eq, gte, lt, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import { classInstances, students, teachers, enrollments } from '../db/schema.js'
import { instancesQuerySchema, instanceRescheduleSchema, idParamSchema } from '../schemas/index.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { centralDateRangeToUtc, centralDateTimeToUtc } from '../lib/schedule.js'
import { notifyCancellation, notifyAdminOfTeacherCancellation, notifyClassRescheduled } from '../lib/notifications.js'
import { logger } from '../lib/log.js'

export const instancesRouter: Router = Router()

instancesRouter.use(requireAuth)

// GET /api/instances?from=&to=&teacher_id= — the occurrences the calendar
// renders for a date range. Joined with student name + teacher name/colour so
// the grid can label and colour-code blocks. from/to are Central dates,
// inclusive. Admin sees all (optional teacher_id filter); a teacher is FORCED to
// their own teacher_id from the token, regardless of any teacher_id param.
instancesRouter.get('/', async (req, res, next) => {
  try {
    const { from, to, teacher_id } = instancesQuerySchema.parse(req.query)
    const user = res.locals.user!
    const { fromUtc, toExclusiveUtc } = centralDateRangeToUtc(from, to)

    const conditions: SQL[] = [
      gte(classInstances.startsAtUtc, fromUtc),
      lt(classInstances.startsAtUtc, toExclusiveUtc),
    ]
    if (user.role === 'teacher') {
      conditions.push(eq(classInstances.teacherId, user.teacherId ?? -1))
    } else if (teacher_id !== undefined) {
      conditions.push(eq(classInstances.teacherId, teacher_id))
    }

    const rows = await db
      .select({
        id: classInstances.id,
        enrollmentId: classInstances.enrollmentId,
        studentId: classInstances.studentId,
        teacherId: classInstances.teacherId,
        startsAtUtc: classInstances.startsAtUtc,
        durationMinutes: classInstances.durationMinutes,
        status: classInstances.status,
        cancelType: classInstances.cancelType,
        studentName: students.studentName,
        teacherName: teachers.name,
        teacherColor: teachers.color,
        // The parent series' current pattern, so the calendar's reschedule-series
        // form can prefill without a second fetch.
        enrollmentDays: enrollments.daysOfWeek,
        enrollmentTime: enrollments.startTimeLocal,
        enrollmentDuration: enrollments.durationMinutes,
        enrollmentStatus: enrollments.status,
      })
      .from(classInstances)
      .innerJoin(students, eq(classInstances.studentId, students.id))
      .innerJoin(teachers, eq(classInstances.teacherId, teachers.id))
      .innerJoin(enrollments, eq(classInstances.enrollmentId, enrollments.id))
      .where(and(...conditions))
      .orderBy(asc(classInstances.startsAtUtc))

    res.json({ instances: rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/instances/:id/cancel — cancel ONE occurrence (cancel_type
// 'student_off'); the series continues. Admin may cancel any class; a teacher
// may only cancel one on their OWN calendar (teacher_id from the token).
instancesRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const user = res.locals.user!

    const [inst] = await db.select().from(classInstances).where(eq(classInstances.id, id)).limit(1)
    if (!inst) throw new HttpError(404, 'Class not found.')
    if (user.role === 'teacher' && inst.teacherId !== user.teacherId) {
      throw new HttpError(403, 'You can only cancel classes on your own calendar.')
    }
    // Idempotency + history guard: an already-cancelled instance keeps its
    // ORIGINAL cancel_type (day_closed / series_cancelled must not be rewritten
    // to student_off by a retry or a stale client).
    if (inst.status === 'cancelled') {
      throw new HttpError(409, 'This class is already cancelled.')
    }

    const [updated] = await db
      .update(classInstances)
      .set({ status: 'cancelled', cancelType: 'student_off', updatedAt: new Date() })
      .where(and(eq(classInstances.id, id), eq(classInstances.status, 'scheduled')))
      .returning()
    if (!updated) throw new HttpError(409, 'This class is already cancelled.')

    notifyCancellation({ type: 'student_off', instanceIds: [id], studentIds: [inst.studentId] })
    // When a TEACHER cancels their own class, give the admin a heads-up so
    // closures don't happen without their awareness.
    if (user.role === 'teacher' && user.teacherId != null) {
      notifyAdminOfTeacherCancellation({ teacherId: user.teacherId, instanceId: id })
    }
    logger.info('instance', 'cancelled', { id, by: user.username, role: user.role })
    res.json({ instance: updated })
  } catch (err) {
    next(err)
  }
})

// POST /api/instances/:id/reschedule — move ONE occurrence to a new Central
// date + start time. Duration, teacher and the series are untouched. Admin may
// move any class; a teacher only ones on their OWN calendar (teacher_id from
// the token). Only scheduled, future-bound moves: cancelled instances are
// history and stay where they were.
instancesRouter.post('/:id/reschedule', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { date, startTimeLocal } = instanceRescheduleSchema.parse(req.body)
    const user = res.locals.user!

    const [inst] = await db.select().from(classInstances).where(eq(classInstances.id, id)).limit(1)
    if (!inst) throw new HttpError(404, 'Class not found.')
    if (user.role === 'teacher' && inst.teacherId !== user.teacherId) {
      throw new HttpError(403, 'You can only reschedule classes on your own calendar.')
    }
    if (inst.status === 'cancelled') {
      throw new HttpError(409, 'This class is cancelled — schedule a new one instead.')
    }

    const { instant, weekday } = centralDateTimeToUtc(date, startTimeLocal)
    if (weekday > 5) throw new HttpError(400, 'Classes run Monday–Friday.')
    if (instant.getTime() < Date.now()) throw new HttpError(400, 'Pick a time in the future.')

    const oldStartsAtUtc = inst.startsAtUtc
    const [updated] = await db
      .update(classInstances)
      .set({ startsAtUtc: instant, updatedAt: new Date() })
      .where(and(eq(classInstances.id, id), eq(classInstances.status, 'scheduled')))
      .returning()
    if (!updated) throw new HttpError(409, 'This class is already cancelled.')

    notifyClassRescheduled({ studentId: inst.studentId, oldStartsAtUtc, newStartsAtUtc: instant })
    logger.info('instance', 'rescheduled', { id, by: user.username, role: user.role })
    res.json({ instance: updated })
  } catch (err) {
    next(err)
  }
})
