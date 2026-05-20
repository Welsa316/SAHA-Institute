import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { loginSchema } from '../schemas/index.js'
import {
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
  sessionCookieOptions,
  signSession,
  verifyPassword,
} from '../lib/auth.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { logger } from '../lib/log.js'

export const authRouter: Router = Router()

// POST /api/auth/login — body: { email, password }
// Always returns within ~constant time whether the user exists or not (verifyPassword still runs)
// so we don't leak account existence through response timing.
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const user = rows[0]

    // Always run bcrypt compare against *something* so failed lookups take the same time
    // as failed passwords.
    const dummyHash = '$2b$12$abcdefghijklmnopqrstuuVQT1XfXr5p9oN1OkONjJtJrJZJZJZJZ.'
    const ok = await verifyPassword(password, user?.passwordHash ?? dummyHash)

    if (!user || !ok) {
      logger.warn('auth', 'login failed', { email })
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const token = signSession({ userId: user.id, email: user.email })
    res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions)
    logger.info('auth', 'login ok', { email })
    res.json({ user: { id: user.id, email: user.email } })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/logout — clears the session cookie.
authRouter.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions)
  logger.info('auth', 'logout', { ip: req.ip })
  res.json({ ok: true })
})

// GET /api/auth/me — returns the current session info, or 401 if no/invalid cookie.
// Used by the frontend on app load to decide whether to redirect to /admin/login.
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: res.locals.user })
})
