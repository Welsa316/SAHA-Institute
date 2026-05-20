import { Router } from 'express'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { students, type Program } from '../db/schema.js'
import {
  idParamSchema,
  studentCreateSchema,
  studentUpdateSchema,
} from '../schemas/index.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { logger } from '../lib/log.js'

// One factory backs both /api/summer-camp and /api/stem-program. The two programs share
// storage and schema; only the `program` enum value differs.

export function studentsRouter(program: Program): Router {
  const router = Router()

  // All endpoints require the admin session — there's no public surface for student records.
  router.use(requireAuth)

  // GET — list all students in this program, ordered by grade then last-updated.
  // The admin UI groups visually by grade, so we send a flat list and let the client group.
  router.get('/', async (_req, res, next) => {
    try {
      const rows = await db
        .select()
        .from(students)
        .where(eq(students.program, program))
        .orderBy(asc(students.gradeLevel), asc(students.studentName))
      res.json({ students: rows })
    } catch (err) {
      next(err)
    }
  })

  // POST — manually add a student. Used by the "Add Student" modal in the admin UI.
  router.post('/', async (req, res, next) => {
    try {
      const input = studentCreateSchema.parse(req.body)
      const [row] = await db
        .insert(students)
        .values({
          program,
          parentName: input.parentName,
          studentName: input.studentName,
          gradeLevel: input.gradeLevel,
          paid: input.paid ?? false,
          paidUntil: input.paidUntil ?? null,
          notes: input.notes ?? null,
        })
        .returning()
      logger.info('student', 'created', { id: row.id, program, user: res.locals.user?.email })
      res.status(201).json({ student: row })
    } catch (err) {
      next(err)
    }
  })

  // PATCH — update any subset of fields.
  router.patch('/:id', async (req, res, next) => {
    try {
      const { id } = idParamSchema.parse(req.params)
      const patch = studentUpdateSchema.parse(req.body)

      // Match the workshop_signups behaviour: clearing `paid` also clears the date
      // unless the client explicitly sent one.
      if (patch.paid === false && patch.paidUntil === undefined) {
        patch.paidUntil = null
      }

      const [row] = await db
        .update(students)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(students.id, id), eq(students.program, program)))
        .returning()

      if (!row) throw new HttpError(404, 'Student not found.')
      logger.info('student', 'updated', { id, program, fields: Object.keys(patch), user: res.locals.user?.email })
      res.json({ student: row })
    } catch (err) {
      next(err)
    }
  })

  // DELETE — remove a student.
  router.delete('/:id', async (req, res, next) => {
    try {
      const { id } = idParamSchema.parse(req.params)
      const result = await db
        .delete(students)
        .where(and(eq(students.id, id), eq(students.program, program)))
        .returning()
      if (result.length === 0) throw new HttpError(404, 'Student not found.')
      logger.info('student', 'deleted', { id, program, user: res.locals.user?.email })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  return router
}
