import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { teachers, users } from '../db/schema.js'
import { teacherSetupSchema } from '../schemas/index.js'
import { verifyInviteToken, hashPassword } from '../lib/auth.js'
import { logger } from '../lib/log.js'

// Public, token-gated. An admin invites a teacher (creating the teachers row);
// the teacher lands here via the invite link and sets their own password, which
// creates their login. There is NO open registration — the only way to reach a
// valid token is an admin handing out the link.
export const teacherSetupRouter: Router = Router()

const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this address. Please try again in an hour.' },
})

// GET /api/teacher-setup/:token — validate the invite WITHOUT consuming it, so
// the page can greet the teacher by name or explain why the link won't work.
teacherSetupRouter.get('/:token', async (req, res, next) => {
  try {
    const payload = verifyInviteToken(req.params.token)
    if (!payload) {
      res.status(400).json({ valid: false, reason: 'invalid' })
      return
    }
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, payload.teacherId)).limit(1)
    if (!teacher || !teacher.email) {
      res.status(400).json({ valid: false, reason: 'invalid' })
      return
    }
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.teacherId, teacher.id)).limit(1)
    if (existing) {
      res.json({ valid: false, reason: 'used', name: teacher.name })
      return
    }
    res.json({ valid: true, name: teacher.name, email: teacher.email })
  } catch (err) {
    next(err)
  }
})

// POST /api/teacher-setup — { token, password } → create the teacher's login.
// One-time by construction: a second submit finds the users row the first one
// created and is rejected. The email on the teachers row becomes the username.
teacherSetupRouter.post('/', setupLimiter, async (req, res, next) => {
  try {
    const { token, password } = teacherSetupSchema.parse(req.body)
    const payload = verifyInviteToken(token)
    if (!payload) {
      res.status(400).json({ error: 'This invite link is invalid or has expired.' })
      return
    }

    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, payload.teacherId)).limit(1)
    if (!teacher || !teacher.email) {
      res.status(400).json({ error: 'This invite link is invalid or has expired.' })
      return
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.teacherId, teacher.id)).limit(1)
    if (existing) {
      res.status(409).json({ error: 'This account has already been set up. Please log in.' })
      return
    }

    const passwordHash = await hashPassword(password)
    try {
      await db.insert(users).values({ username: teacher.email, passwordHash, role: 'teacher', teacherId: teacher.id })
    } catch {
      // Unique violation on username — the email got claimed by another account
      // between invite and setup.
      res.status(409).json({ error: 'An account with this email already exists. Please log in.' })
      return
    }
    logger.info('teacherSetup', 'account created', { teacherId: teacher.id })
    res.status(201).json({ ok: true, username: teacher.email })
  } catch (err) {
    next(err)
  }
})
