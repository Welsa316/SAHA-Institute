import { Router } from 'express'
import { asc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { teachers } from '../db/schema.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'

export const teachersRouter: Router = Router()

// GET /api/teachers (admin) — for the master-calendar teacher filter + the
// scheduling form's teacher picker.
teachersRouter.get('/', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db.select().from(teachers).orderBy(asc(teachers.name))
    res.json({ teachers: rows })
  } catch (err) {
    next(err)
  }
})
