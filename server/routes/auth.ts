import { Router } from 'express'
import rateLimit from 'express-rate-limit'
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

// Brute-force guard on the single shared admin account. 10 attempts per IP per
// 15 minutes — comfortably above a fat-fingered human, far below an online
// guessing attack. Mirrors the limiter the student auth routes already use.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
})

// POST /api/auth/login — body: { username, password }
// Works for both admin and teacher accounts. Always runs a bcrypt compare
// whether the user exists or not, so response timing doesn't leak which
// usernames are registered.
authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body)

    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1)
    const user = rows[0]

    const dummyHash = '$2b$12$abcdefghijklmnopqrstuuVQT1XfXr5p9oN1OkONjJtJrJZJZJZJZ.'
    const ok = await verifyPassword(password, user?.passwordHash ?? dummyHash)

    if (!user || !ok) {
      logger.warn('auth', 'login failed', { username })
      res.status(401).json({ error: 'Invalid username or password.' })
      return
    }

    const token = signSession({ userId: user.id, role: user.role, teacherId: user.teacherId, username: user.username })
    res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions)
    logger.info('auth', 'login ok', { username, role: user.role })
    res.json({ user: { id: user.id, username: user.username, role: user.role, teacherId: user.teacherId, displayTimezone: user.displayTimezone } })
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

// GET /api/auth/me — current session info (incl. display_timezone for the
// calendar), or 401 if no/invalid cookie. Reads the row fresh so role/timezone
// changes take effect without re-login.
authRouter.get('/me', requireAuth, async (_req, res, next) => {
  try {
    const userId = res.locals.user!.userId
    const [row] = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        teacherId: users.teacherId,
        displayTimezone: users.displayTimezone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!row) {
      res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions)
      res.status(401).json({ error: 'Account no longer exists.' })
      return
    }
    res.json({ user: { id: row.id, username: row.username, role: row.role, teacherId: row.teacherId, displayTimezone: row.displayTimezone } })
  } catch (err) {
    next(err)
  }
})
