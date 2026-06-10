import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { assignments, students } from '../db/schema.js'
import {
  assignmentCreateSchema,
  assignmentUpdateSchema,
  idParamSchema,
  studentIdQuerySchema,
} from '../schemas/index.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { logger } from '../lib/log.js'

// Teacher-side homework management. All endpoints require the admin session.
// Assignments hang off a student row; the student sees their own list via
// /api/student-auth/assignments and can only toggle `completed` there.

export const assignmentsRouter: Router = Router()

assignmentsRouter.use(requireAuth)

// GET /api/assignments?studentId=N — all assignments for one student,
// newest first (open items are usually recent; the client groups/sorts
// further if needed).
assignmentsRouter.get('/', async (req, res, next) => {
  try {
    const { studentId } = studentIdQuerySchema.parse(req.query)
    const rows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.studentId, studentId))
      .orderBy(desc(assignments.createdAt))
    res.json({ assignments: rows })
  } catch (err) {
    next(err)
  }
})

// POST /api/assignments — create homework for a student. 404s on a bad
// studentId up front rather than throwing an FK error.
assignmentsRouter.post('/', async (req, res, next) => {
  try {
    const input = assignmentCreateSchema.parse(req.body)

    const exists = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, input.studentId))
      .limit(1)
    if (exists.length === 0) throw new HttpError(404, 'Student not found.')

    const [row] = await db
      .insert(assignments)
      .values({
        studentId: input.studentId,
        title: input.title,
        details: input.details ?? null,
        dueDate: input.dueDate ?? null,
      })
      .returning()
    logger.info('assignment', 'created', { id: row.id, studentId: input.studentId, user: res.locals.user?.email })
    res.status(201).json({ assignment: row })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/assignments/:id — update any subset (title, details, dueDate,
// completed). Teachers can mark complete too — useful when work is handed
// in on paper.
assignmentsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const patch = assignmentUpdateSchema.parse(req.body)

    const [row] = await db
      .update(assignments)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning()
    if (!row) throw new HttpError(404, 'Assignment not found.')
    logger.info('assignment', 'updated', { id, fields: Object.keys(patch), user: res.locals.user?.email })
    res.json({ assignment: row })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/assignments/:id
assignmentsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = await db.delete(assignments).where(eq(assignments.id, id)).returning()
    if (result.length === 0) throw new HttpError(404, 'Assignment not found.')
    logger.info('assignment', 'deleted', { id, user: res.locals.user?.email })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
