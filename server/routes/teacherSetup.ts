import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { teachers, users } from '../db/schema.js'
import { teacherSetupSchema } from '../schemas/index.js'
import { verifyInviteToken, verifyResetToken, passwordFingerprint, hashPassword } from '../lib/auth.js'
import { notifyTeacherReady } from '../lib/notifications.js'
import { logger } from '../lib/log.js'

// Public, token-gated. Two flows share this surface:
//   • INVITE  — admin invited a teacher; no login exists yet → first-time setup
//               creates the users row (username = the teacher's email).
//   • RESET   — admin issued a reset link for an EXISTING account → set a NEW
//               password on that login.
// There is NO open registration — a valid token only comes from an admin action.
export const teacherSetupRouter: Router = Router()

const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this address. Please try again in an hour.' },
})

type SetupContext =
  | { status: 'ok'; mode: 'invite'; teacher: typeof teachers.$inferSelect; account: null }
  | { status: 'ok'; mode: 'reset'; teacher: typeof teachers.$inferSelect; account: typeof users.$inferSelect }
  | { status: 'used'; mode: 'invite' | 'reset'; teacher: typeof teachers.$inferSelect }
  | { status: 'invalid' }

// Resolve a token to its flow + current validity WITHOUT consuming it. An invite
// is 'used' once a login exists; a reset is 'used' once the password (and thus
// its fingerprint) has changed since the link was issued.
async function resolve(token: string): Promise<SetupContext> {
  const inv = verifyInviteToken(token)
  if (inv) {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, inv.teacherId)).limit(1)
    if (!teacher || !teacher.email) return { status: 'invalid' }
    const [account] = await db.select().from(users).where(eq(users.teacherId, teacher.id)).limit(1)
    if (account) return { status: 'used', mode: 'invite', teacher }
    return { status: 'ok', mode: 'invite', teacher, account: null }
  }
  const rst = verifyResetToken(token)
  if (rst) {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, rst.teacherId)).limit(1)
    if (!teacher || !teacher.email) return { status: 'invalid' }
    const [account] = await db.select().from(users).where(eq(users.teacherId, teacher.id)).limit(1)
    if (!account) return { status: 'invalid' }
    if (passwordFingerprint(account.passwordHash) !== rst.pv) return { status: 'used', mode: 'reset', teacher }
    return { status: 'ok', mode: 'reset', teacher, account }
  }
  return { status: 'invalid' }
}

// GET /api/teacher-setup/:token — validate without consuming, so the page can
// greet the teacher and pick the right copy (set vs reset) or explain the link.
teacherSetupRouter.get('/:token', async (req, res, next) => {
  try {
    const r = await resolve(req.params.token)
    if (r.status === 'invalid') {
      res.status(400).json({ valid: false, reason: 'invalid' })
      return
    }
    if (r.status === 'used') {
      res.json({ valid: false, reason: 'used', mode: r.mode, name: r.teacher.name })
      return
    }
    res.json({ valid: true, mode: r.mode, name: r.teacher.name, email: r.teacher.email })
  } catch (err) {
    next(err)
  }
})

// POST /api/teacher-setup — { token, password }. Invite → create the login;
// reset → update the existing login's password. Both one-time by construction.
teacherSetupRouter.post('/', setupLimiter, async (req, res, next) => {
  try {
    const { token, password } = teacherSetupSchema.parse(req.body)
    const r = await resolve(token)

    if (r.status === 'invalid') {
      res.status(400).json({ error: 'This link is invalid or has expired.' })
      return
    }
    if (r.status === 'used') {
      res.status(409).json({
        error:
          r.mode === 'reset'
            ? 'This reset link has already been used. Ask the admin for a new one.'
            : 'This account has already been set up. Please log in.',
      })
      return
    }

    const passwordHash = await hashPassword(password)
    if (r.mode === 'invite') {
      try {
        await db.insert(users).values({ username: r.teacher.email!, passwordHash, role: 'teacher', teacherId: r.teacher.id })
      } catch {
        res.status(409).json({ error: 'An account with this email already exists. Please log in.' })
        return
      }
      notifyTeacherReady(r.teacher.id)
      logger.info('teacherSetup', 'account created', { teacherId: r.teacher.id })
      res.status(201).json({ ok: true, mode: 'invite', username: r.teacher.email })
      return
    }

    // reset
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, r.account.id))
    logger.info('teacherSetup', 'password reset', { teacherId: r.teacher.id })
    res.json({ ok: true, mode: 'reset', username: r.teacher.email })
  } catch (err) {
    next(err)
  }
})
