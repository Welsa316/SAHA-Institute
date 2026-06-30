import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { enrollments, classInstances, students, teachers } from '../db/schema.js'
import { enrollmentCreateSchema } from '../schemas/index.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { generateOccurrenceInstants, sixMonthsLater } from '../lib/schedule.js'
import { logger } from '../lib/log.js'

export const enrollmentsRouter: Router = Router()

enrollmentsRouter.use(requireAuth)

// POST /api/enrollments (admin) — create the recurring rule and generate 6
// months of individual class_instances. Enrollment + instances are written in a
// single transaction so a partial failure leaves nothing behind.
enrollmentsRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const input = enrollmentCreateSchema.parse(req.body)

    const [student] = await db.select({ id: students.id }).from(students).where(eq(students.id, input.studentId)).limit(1)
    if (!student) throw new HttpError(404, 'Student not found.')
    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, input.teacherId)).limit(1)
    if (!teacher) throw new HttpError(404, 'Teacher not found.')

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
