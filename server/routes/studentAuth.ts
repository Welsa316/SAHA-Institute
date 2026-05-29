import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { students } from '../db/schema.js'
import { studentAuthSignupSchema, studentAuthLoginSchema } from '../schemas/index.js'
import {
  STUDENT_COOKIE_NAME,
  clearSessionCookieOptions,
  sessionCookieOptions,
  signStudentSession,
  hashPassword,
  verifyPassword,
} from '../lib/auth.js'
import { requireStudentAuth } from '../middleware/requireStudentAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { logger } from '../lib/log.js'

// Self-service student accounts. Creates / authenticates rows in the `students`
// table that carry `email` + `password_hash` (program='regular'). Admin-created
// roster rows leave those null and are unaffected.

export const studentAuthRouter: Router = Router()

// Slow brute-force + signup spam. Generous enough that a real family fumbling
// their password a few times won't get locked out within the window.
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this address. Please try again in an hour.' },
})

// Shape returned to the client — never includes the password hash.
function publicStudent(row: typeof students.$inferSelect) {
  return {
    id: row.id,
    name: row.studentName,
    email: row.email,
    gradeLevel: row.gradeLevel,
    paid: row.paid,
    paidFrom: row.paidFrom,
    paidUntil: row.paidUntil,
  }
}

// POST /api/student-auth/signup — body: { name, email, password }
// Creates the account, logs them in (sets the cookie), returns the profile.
studentAuthRouter.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = studentAuthSignupSchema.parse(req.body)

    // Pre-check for a friendlier 409 than a raw unique-violation 500. There's a
    // small TOCTOU window, so the insert is still wrapped to catch a duplicate
    // that races in between.
    const existing = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.email, email))
      .limit(1)
    if (existing.length > 0) {
      throw new HttpError(409, 'An account with that email already exists. Try logging in.')
    }

    const passwordHash = await hashPassword(password)

    let row: typeof students.$inferSelect
    try {
      const inserted = await db
        .insert(students)
        .values({
          program: 'regular',
          studentName: name,
          email,
          passwordHash,
          paid: false,
        })
        .returning()
      row = inserted[0]!
    } catch (err) {
      // Unique violation that raced past the pre-check.
      if ((err as { code?: string }).code === '23505') {
        throw new HttpError(409, 'An account with that email already exists. Try logging in.')
      }
      throw err
    }

    const token = signStudentSession({ studentId: row.id, email: row.email! })
    res.cookie(STUDENT_COOKIE_NAME, token, sessionCookieOptions)
    logger.info('studentAuth', 'signup ok', { id: row.id })
    res.status(201).json({ student: publicStudent(row) })
  } catch (err) {
    next(err)
  }
})

// POST /api/student-auth/login — body: { email, password }
// Constant-ish time whether the account exists or not (always runs a bcrypt
// compare) so we don't leak which emails have accounts.
studentAuthRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = studentAuthLoginSchema.parse(req.body)

    // Only rows with a password_hash are real accounts (vs. admin-added roster
    // rows that happen to have no credentials).
    const rows = await db
      .select()
      .from(students)
      .where(eq(students.email, email))
      .limit(1)
    const account = rows[0]

    const dummyHash = '$2b$12$abcdefghijklmnopqrstuuVQT1XfXr5p9oN1OkONjJtJrJZJZJZJZ.'
    const ok = await verifyPassword(password, account?.passwordHash ?? dummyHash)

    if (!account || !account.passwordHash || !ok) {
      logger.warn('studentAuth', 'login failed', { email })
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const token = signStudentSession({ studentId: account.id, email: account.email! })
    res.cookie(STUDENT_COOKIE_NAME, token, sessionCookieOptions)
    logger.info('studentAuth', 'login ok', { id: account.id })
    res.json({ student: publicStudent(account) })
  } catch (err) {
    next(err)
  }
})

// POST /api/student-auth/logout — clears the student cookie.
studentAuthRouter.post('/logout', (req, res) => {
  res.clearCookie(STUDENT_COOKIE_NAME, clearSessionCookieOptions)
  logger.info('studentAuth', 'logout', { ip: req.ip })
  res.json({ ok: true })
})

// GET /api/student-auth/me — current student profile, fresh from the DB so the
// portal reflects any payment changes the admin made since login.
studentAuthRouter.get('/me', requireStudentAuth, async (_req, res, next) => {
  try {
    const id = res.locals.student!.studentId
    const rows = await db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.program, 'regular')))
      .limit(1)
    const account = rows[0]
    if (!account) {
      // Account was deleted out from under the session — clear it.
      res.clearCookie(STUDENT_COOKIE_NAME, clearSessionCookieOptions)
      res.status(401).json({ error: 'Account no longer exists.' })
      return
    }
    res.json({ student: publicStudent(account) })
  } catch (err) {
    next(err)
  }
})
