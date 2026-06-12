import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { assignments, students } from '../db/schema.js'
import {
  studentRegisterSchema,
  studentLoginSchema,
  assignmentStudentUpdateSchema,
  idParamSchema,
} from '../schemas/index.js'
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

// Self-service student accounts. Registration collects the student's name, the
// PARENT's email + phone, and a password. The row lands in `students`
// (program='regular') as PENDING (approved=false) and waits in the admin's
// approval queue — where the parent contact info is displayed so the team can
// verify the registration is real.
//
// Login is parent email + password. The email is NOT unique: siblings register
// under the same parent email, each with their own password. The (email,
// password) pair selects the student — login bcrypt-checks the password
// against every account under that email; registration rejects a pair that
// already exists so the mapping stays unambiguous.

export const studentAuthRouter: Router = Router()

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this address. Please try again in an hour.' },
})

// What the student sees about themselves — never the password hash, and no
// payment fields (the site doesn't track tutoring payments).
function publicStudent(row: typeof students.$inferSelect) {
  return {
    id: row.id,
    name: row.studentName,
    parentEmail: row.parentEmail,
    approved: row.approved,
    gradeLevel: row.gradeLevel,
  }
}

function accountsByEmail(email: string) {
  return db
    .select()
    .from(students)
    .where(and(eq(students.parentEmail, email), isNotNull(students.passwordHash)))
}

function notifyAdminOfRegistration(args: { name: string; parentEmail: string; parentPhone: string; submittedAt: Date }): void {
  const { name, parentEmail, parentPhone, submittedAt } = args
  const siteOrigin = process.env.SITE_ORIGIN ?? 'https://sahainstituteforlearning.com'
  const adminEmail = process.env.CONTACT_EMAIL ?? 'sahaforlearning@gmail.com'
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
              <td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 150px;">Student:</td>
              <td style="padding: 8px 0; color: #334155;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Parent email:</td>
              <td style="padding: 8px 0; color: #334155;">${escapeHtml(parentEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Parent phone:</td>
              <td style="padding: 8px 0; color: #334155;">${escapeHtml(parentPhone)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Registered:</td>
              <td style="padding: 8px 0; color: #334155;">${submittedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
            </tr>
          </table>
          <p style="color: #334155; margin: 16px 0; line-height: 1.6;">
            Review this registration in the dashboard — confirm the family is
            real, assign a grade, and approve, or delete it if it doesn't look
            legitimate.
          </p>
          <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #001B3D; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 14px;">
            Review in Dashboard
          </a>
        </div>
      </div>
    `,
  })
}

// POST /api/student-auth/register — body: { name, parentEmail, parentPhone, password }
// Creates a pending account, logs the student in, returns the profile.
studentAuthRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { name, parentEmail, parentPhone, password } = studentRegisterSchema.parse(req.body)

    // Same parent email is fine (siblings) — but the same email + password
    // pair would make login ambiguous, so reject that combination. This means
    // bcrypt-checking the new password against each existing account under
    // the email; family sizes make this a handful of compares at most.
    const existing = await accountsByEmail(parentEmail)
    for (const account of existing) {
      if (await verifyPassword(password, account.passwordHash!)) {
        throw new HttpError(
          409,
          'An account with this parent email and password already exists. Please choose a different password for this student.',
        )
      }
    }

    const passwordHash = await hashPassword(password)
    const [row] = await db
      .insert(students)
      .values({
        program: 'regular',
        studentName: name,
        parentEmail,
        phoneNumber: parentPhone,
        passwordHash,
        approved: false, // pending until a teacher confirms
        paid: false,
      })
      .returning()

    const token = signStudentSession({ studentId: row.id, email: row.parentEmail! })
    res.cookie(STUDENT_COOKIE_NAME, token, sessionCookieOptions)

    // Skip the notification when a logged-in admin registers someone manually.
    const adminToken = req.cookies?.[SESSION_COOKIE_NAME]
    const byAdmin = adminToken ? verifySession(adminToken) !== null : false
    if (!byAdmin) notifyAdminOfRegistration({ name, parentEmail, parentPhone, submittedAt: row.createdAt })

    logger.info('studentAuth', 'register ok', { id: row.id })
    res.status(201).json({ student: publicStudent(row) })
  } catch (err) {
    next(err)
  }
})

// POST /api/student-auth/login — body: { email, password }
// The password picks the right sibling under a shared parent email. A dummy
// compare runs when no accounts match so response timing doesn't reveal
// whether an email is registered.
studentAuthRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = studentLoginSchema.parse(req.body)

    const candidates = await accountsByEmail(email)

    let matched: typeof students.$inferSelect | null = null
    for (const account of candidates) {
      if (await verifyPassword(password, account.passwordHash!)) {
        matched = account
        break
      }
    }
    if (candidates.length === 0) {
      const dummyHash = '$2b$12$abcdefghijklmnopqrstuuVQT1XfXr5p9oN1OkONjJtJrJZJZJZJZ.'
      await verifyPassword(password, dummyHash)
    }

    if (!matched) {
      logger.warn('studentAuth', 'login failed', { email })
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const token = signStudentSession({ studentId: matched.id, email: matched.parentEmail! })
    res.cookie(STUDENT_COOKIE_NAME, token, sessionCookieOptions)
    logger.info('studentAuth', 'login ok', { id: matched.id })
    res.json({ student: publicStudent(matched) })
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

// GET /api/student-auth/me — current profile, fresh from the DB so approval
// changes the admin made show up without re-login.
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

// ---------- Assignments (student side) ----------

// GET /api/student-auth/assignments — the logged-in student's own homework,
// open items first (incomplete sorted before complete), newest first within
// each group.
studentAuthRouter.get('/assignments', requireStudentAuth, async (_req, res, next) => {
  try {
    const studentId = res.locals.student!.studentId
    const rows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.studentId, studentId))
      .orderBy(assignments.completed, desc(assignments.createdAt))
    res.json({ assignments: rows })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/student-auth/assignments/:id — a student may ONLY toggle the
// completed flag, and only on their own assignment (the WHERE clause binds
// the row to their session's studentId, so a guessed id 404s).
studentAuthRouter.patch('/assignments/:id', requireStudentAuth, async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { completed } = assignmentStudentUpdateSchema.parse(req.body)
    const studentId = res.locals.student!.studentId

    const [row] = await db
      .update(assignments)
      .set({ completed, updatedAt: new Date() })
      .where(and(eq(assignments.id, id), eq(assignments.studentId, studentId)))
      .returning()
    if (!row) {
      res.status(404).json({ error: 'Assignment not found.' })
      return
    }
    logger.info('assignment', 'student toggled', { id, studentId, completed })
    res.json({ assignment: row })
  } catch (err) {
    next(err)
  }
})
