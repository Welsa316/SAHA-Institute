import { Router } from 'express'
import { and, asc, eq, gte, lt, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import { classInstances, students, teachers } from '../db/schema.js'
import { instancesQuerySchema } from '../schemas/index.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { centralDateRangeToUtc } from '../lib/schedule.js'

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
      })
      .from(classInstances)
      .innerJoin(students, eq(classInstances.studentId, students.id))
      .innerJoin(teachers, eq(classInstances.teacherId, teachers.id))
      .where(and(...conditions))
      .orderBy(asc(classInstances.startsAtUtc))

    res.json({ instances: rows })
  } catch (err) {
    next(err)
  }
})
