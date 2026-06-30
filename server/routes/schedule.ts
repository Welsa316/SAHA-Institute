import { Router } from 'express'
import { and, eq, gte, lt } from 'drizzle-orm'
import { db } from '../db/index.js'
import { enrollments, classInstances } from '../db/schema.js'
import { cancelDaySchema, idParamSchema } from '../schemas/index.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'
import { centralDateRangeToUtc } from '../lib/schedule.js'
import { notifyCancellation } from '../lib/notifyCancellation.js'
import { logger } from '../lib/log.js'

// Mounted at /api/students — the whole-student schedule cancellation lives under
// the student it acts on, kept out of the generic students CRUD factory.
export const studentScheduleRouter: Router = Router()

// POST /api/students/:id/cancel-schedule (admin) — permanent, per student.
// Cancels ALL the student's active enrollments and every FUTURE scheduled
// instance (cancel_type 'series_cancelled'). Past instances are left as history;
// nothing is regenerated.
studentScheduleRouter.post('/:id/cancel-schedule', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const now = new Date()

    const result = await db.transaction(async (tx) => {
      const cancelledEnrollments = await tx
        .update(enrollments)
        .set({ status: 'cancelled', updatedAt: now })
        .where(and(eq(enrollments.studentId, id), eq(enrollments.status, 'active')))
        .returning({ id: enrollments.id })

      const cancelledInstances = await tx
        .update(classInstances)
        .set({ status: 'cancelled', cancelType: 'series_cancelled', updatedAt: now })
        .where(
          and(
            eq(classInstances.studentId, id),
            eq(classInstances.status, 'scheduled'),
            gte(classInstances.startsAtUtc, now),
          ),
        )
        .returning({ id: classInstances.id })

      return { enrollments: cancelledEnrollments.length, instanceIds: cancelledInstances.map((r) => r.id) }
    })

    notifyCancellation({ type: 'series_cancelled', instanceIds: result.instanceIds, studentIds: [id] })
    logger.info('schedule', 'student schedule cancelled', {
      studentId: id,
      enrollments: result.enrollments,
      instances: result.instanceIds.length,
      by: res.locals.user?.username,
    })
    res.json({ ok: true, enrollmentsCancelled: result.enrollments, instancesCancelled: result.instanceIds.length })
  } catch (err) {
    next(err)
  }
})

// Mounted at /api/schedule.
export const scheduleRouter: Router = Router()

// POST /api/schedule/cancel-day (admin) — emergency closure. Cancels every
// SCHEDULED instance whose Central-local date equals `date`, across all teachers
// and students (cancel_type 'day_closed').
scheduleRouter.post('/cancel-day', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { date } = cancelDaySchema.parse(req.body)
    const { fromUtc, toExclusiveUtc } = centralDateRangeToUtc(date, date)

    const cancelled = await db
      .update(classInstances)
      .set({ status: 'cancelled', cancelType: 'day_closed', updatedAt: new Date() })
      .where(
        and(
          eq(classInstances.status, 'scheduled'),
          gte(classInstances.startsAtUtc, fromUtc),
          lt(classInstances.startsAtUtc, toExclusiveUtc),
        ),
      )
      .returning({ id: classInstances.id, studentId: classInstances.studentId })

    notifyCancellation({
      type: 'day_closed',
      instanceIds: cancelled.map((r) => r.id),
      studentIds: [...new Set(cancelled.map((r) => r.studentId))],
      context: { date },
    })
    logger.info('schedule', 'day closed', { date, instances: cancelled.length, by: res.locals.user?.username })
    res.json({ ok: true, instancesCancelled: cancelled.length })
  } catch (err) {
    next(err)
  }
})
