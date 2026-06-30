import { Router } from 'express'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { students, type Program } from '../db/schema.js'
import {
  idParamSchema,
  studentCreateSchema,
  studentUpdateSchema,
} from '../schemas/index.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { logger } from '../lib/log.js'

// One factory backs both /api/summer-camp and /api/stem-program. The two programs share
// storage and schema; only the `program` enum value differs.

// Explicit projection reused across GET / POST / PATCH `.returning()`.
// parent_email + phone_number are PARENT CONTACT info collected at
// registration — the admin needs them to verify a pending registration is
// real and to reach the family. The password hash is the only credential and
// is deliberately absent so it can never reach a client.
const publicColumns = {
  id: students.id,
  program: students.program,
  parentName: students.parentName,
  studentName: students.studentName,
  gradeLevel: students.gradeLevel,
  phoneNumber: students.phoneNumber,
  parentEmail: students.parentEmail,
  approved: students.approved,
  paid: students.paid,
  paidFrom: students.paidFrom,
  paidUntil: students.paidUntil,
  notes: students.notes,
  createdAt: students.createdAt,
  updatedAt: students.updatedAt,
}

export function studentsRouter(program: Program): Router {
  const router = Router()

  // All endpoints require the admin session — there's no public surface for student records.
  router.use(requireAuth, requireAdmin)

  // GET — list all students in this program, ordered by grade then last-updated.
  // The admin UI groups visually by grade, so we send a flat list and let the client group.
  router.get('/', async (_req, res, next) => {
    try {
      const rows = await db
        .select(publicColumns)
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
          gradeLevel: input.gradeLevel ?? null,
          phoneNumber: input.phoneNumber ?? null,
          paid: input.paid ?? false,
          paidFrom: input.paidFrom ?? null,
          paidUntil: input.paidUntil ?? null,
          notes: input.notes ?? null,
        })
        .returning(publicColumns)
      logger.info('student', 'created', { id: row.id, program, user: res.locals.user?.username })
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

      // Match the workshop_signups behaviour: clearing `paid` also clears both date
      // bounds unless the client explicitly sent them. Otherwise we'd have a row with
      // paid=false but a paid_until in the future, which the Payments view would
      // mistakenly count as "still in window."
      if (patch.paid === false) {
        if (patch.paidUntil === undefined) patch.paidUntil = null
        if (patch.paidFrom === undefined) patch.paidFrom = null
      }

      const [row] = await db
        .update(students)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(students.id, id), eq(students.program, program)))
        .returning(publicColumns)

      if (!row) throw new HttpError(404, 'Student not found.')
      logger.info('student', 'updated', { id, program, fields: Object.keys(patch), user: res.locals.user?.username })
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
      logger.info('student', 'deleted', { id, program, user: res.locals.user?.username })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  return router
}
