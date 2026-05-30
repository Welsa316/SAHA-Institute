import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { students } from '../db/schema.js'
import { studentRegisterSchema, studentLoginSchema } from '../schemas/index.js'
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
import { escapeHtml, sendEmail } from '../lib/email.js'
import { SESSION_COOKIE_NAME, verifySession } from '../lib/auth.js'
import { logger } from '../lib/log.js'

// Self-service student accounts. Students pick their own name + username +
// password at /register; the row lands in the `students` table (program=
// 'regular') as PENDING (approved=false) and waits in the admin's approval
// queue. They can log in straight away but the portal shows "pending review"
// until a teacher approves. Admin only ever sees the student NAME.

export const studentAuthRouter: Router = Router()

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this address. Please try again in an hour.' },
})

// What the student sees about themselves — never includes the password hash.
function publicStudent(row: typeof students.$inferSelect) {
  return {
    id: row.id,
    name: row.studentName,
    username: row.username,
    approved: row.approved,
    gradeLevel: row.gradeLevel,
    paid: row.paid,
    paidFrom: row.paidFrom,
    paidUntil: row.paidUntil,
  }
}

function notifyAdminOfRegistration(name: string, submittedAt: Date): void {
  const siteOrigin = process.env.SITE_ORIGIN ?? 'https://sahainstituteforlearning.com'
  const adminEmail = process.env.CONTACT_EMAIL ?? 'sahaforlearning1675@gmail.com'
  const adminUrl = `${siteOrigin}/admin/students`
  void sendEmail({
    to: [adminEmail],
    subject: `New Student Registration (pending) — ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0;">New Student Registration — Pending Approval</h2>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 140px;">Name:</td>
              <td style="padding: 8px 0; color: #334155;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Registered:</td>
              <td style="padding: 8px 0; color: #334155;">${submittedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
            </tr>
          </table>
          <p style="color: #334155; margin: 16px 0; line-height: 1.6;">
            Review this registration in the dashboard — assign a grade and
            approve, or delete it if it doesn't look real.
          </p>
          <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #001B3D; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 14px;">
            Review in Dashboard
          </a>
        </div>
      </div>
    `,
  })
}

// POST /api/student-auth/register — body: { name, username, password }
// Creates a pending account, logs them in (sets the cookie), returns profile.
studentAuthRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { name, username, password } = studentRegisterSchema.parse(req.body)

    const existing = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.username, username))
      .limit(1)
    if (existing.length > 0) {
      throw new HttpError(409, 'That username is taken. Please choose another.')
    }

    const passwordHash = await hashPassword(password)

    let row: typeof students.$inferSelect
    try {
      const inserted = await db
        .insert(students)
        .values({
          program: 'regular',
          studentName: name,
          username,
          passwordHash,
          approved: false, // pending until a teacher confirms
          paid: false,
        })
        .returning()
      row = inserted[0]!
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new HttpError(409, 'That username is taken. Please choose another.')
      }
      throw err
    }

    const token = signStudentSession({ studentId: row.id, username: row.username! })
    res.cookie(STUDENT_COOKIE_NAME, token, sessionCookieOptions)

    // Skip the admin notification if a logged-in admin happened to register
    // someone — no point emailing the team about a row they just made.
    const adminToken = req.cookies?.[SESSION_COOKIE_NAME]
    const byAdmin = adminToken ? verifySession(adminToken) !== null : false
    if (!byAdmin) notifyAdminOfRegistration(name, row.createdAt)

    logger.info('studentAuth', 'register ok', { id: row.id })
    res.status(201).json({ student: publicStudent(row) })
  } catch (err) {
    next(err)
  }
})

// POST /api/student-auth/login — body: { username, password }
// Constant-ish time whether the account exists or not.
studentAuthRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = studentLoginSchema.parse(req.body)

    const rows = await db.select().from(students).where(eq(students.username, username)).limit(1)
    const account = rows[0]

    const dummyHash = '$2b$12$abcdefghijklmnopqrstuuVQT1XfXr5p9oN1OkONjJtJrJZJZJZJZ.'
    const ok = await verifyPassword(password, account?.passwordHash ?? dummyHash)

    if (!account || !account.passwordHash || !ok) {
      logger.warn('studentAuth', 'login failed', { username })
      res.status(401).json({ error: 'Invalid username or password.' })
      return
    }

    const token = signStudentSession({ studentId: account.id, username: account.username! })
    res.cookie(STUDENT_COOKIE_NAME, token, sessionCookieOptions)
    logger.info('studentAuth', 'login ok', { id: account.id })
    res.json({ student: publicStudent(account) })
  } catch (err) {
    next(err)
  }
})

// POST /api/student-auth/logout
studentAuthRouter.post('/logout', (req, res) => {
  res.clearCookie(STUDENT_COOKIE_NAME, clearSessionCookieOptions)
  logger.info('studentAuth', 'logout', { ip: req.ip })
  res.json({ ok: true })
})

// GET /api/student-auth/me — current profile, fresh from the DB so approval /
// payment changes the admin made show up without re-login.
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
      res.clearCookie(STUDENT_COOKIE_NAME, clearSessionCookieOptions)
      res.status(401).json({ error: 'Account no longer exists.' })
      return
    }
    res.json({ student: publicStudent(account) })
  } catch (err) {
    next(err)
  }
})
