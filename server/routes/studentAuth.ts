import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
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
import { adminContactEmail, escapeHtml, sendEmail, siteOrigin } from '../lib/email.js'
import { SESSION_COOKIE_NAME, verifySession } from '../lib/auth.js'
import { logger } from '../lib/log.js'

// FAMILY accounts. A registration creates one login (parent email + password)
// covering one or more students — each student is still its own `students`
// row (own pending-approval entry, own grade, own homework), but every row
// from the registration shares the SAME password hash string. That shared
// hash is the family link: at login we bcrypt-match the password to a row,
// then the family is "all rows with this email and this exact hash". The
// portal shows every student in the family side by side.
//
// Different families CAN share an email in principle (a legacy case from the
// earlier per-student-password model); the password still disambiguates.
// Registering again with an email+password that already matches an account
// is rejected — that account exists; log in instead.

export const studentAuthRouter: Router = Router()

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this address. Please try again in an hour.' },
})

// Fixed hash for a constant-time compare when no credential matches, so a login
// miss costs the same bcrypt work whether or not the email is registered.
const DUMMY_HASH = '$2b$12$abcdefghijklmnopqrstuuVQT1XfXr5p9oN1OkONjJtJrJZJZJZJZ.'

// Per-student shape inside the account payload — never the password hash, and
// no payment fields (the site doesn't track tutoring payments).
function publicStudent(row: typeof students.$inferSelect) {
  return {
    id: row.id,
    name: row.studentName,
    approved: row.approved,
    gradeLevel: row.gradeLevel,
  }
}

function accountPayload(rows: (typeof students.$inferSelect)[]) {
  return {
    parentEmail: rows[0]?.parentEmail ?? null,
    students: rows.map(publicStudent),
  }
}

// Bounded: parent_email is non-unique, so without a cap a flooded email could
// make login iterate an unbounded number of (blocking, CPU-bound) bcrypt
// compares. Families are at most MAX_STUDENTS, so 20 is comfortably above any
// real account.
const MAX_CREDENTIAL_ROWS = 20
function credentialRowsByEmail(email: string) {
  return db
    .select()
    .from(students)
    .where(and(eq(students.parentEmail, email), isNotNull(students.passwordHash)))
    .limit(MAX_CREDENTIAL_ROWS)
}

// The family = every row sharing the session row's email AND exact hash
// string (siblings registered together share the literal hash; a different
// registration under the same email has a different salt, hence a different
// hash, hence a different family).
async function familyOf(sessionRow: typeof students.$inferSelect) {
  const rows = await credentialRowsByEmail(sessionRow.parentEmail!)
  return rows
    .filter((r) => r.passwordHash === sessionRow.passwordHash)
    .sort((a, b) => a.studentName.localeCompare(b.studentName))
}

function notifyAdminOfRegistration(args: { names: string[]; parentEmail: string; parentPhone: string; submittedAt: Date }): void {
  const { names, parentEmail, parentPhone, submittedAt } = args
  const adminUrl = `${siteOrigin()}/admin/students`
  const nameList = names.map((n) => `<li style="margin: 4px 0;">${escapeHtml(n)}</li>`).join('')
  void sendEmail({
    to: [adminContactEmail()],
    subject: `New Student Registration (pending) — ${names.join(', ')}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0;">New Student Registration — Pending Approval</h2>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
          <p style="font-weight: bold; color: #001B3D; margin: 0 0 8px;">Student${names.length > 1 ? 's' : ''}:</p>
          <ul style="color: #334155; padding-left: 20px; margin: 0 0 16px;">${nameList}</ul>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 150px;">Parent email:</td>
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
            Review in the dashboard — confirm the family is real, assign grades,
            and approve each student, or delete anything that doesn't look
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

// POST /api/student-auth/register — body: { names: [..], parentEmail, parentPhone, password }
// Creates one pending row per student, all sharing the login. Logs the family
// in and returns the account.
studentAuthRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { names, parentEmail, parentPhone, password } = studentRegisterSchema.parse(req.body)

    // If this email+password already matches an account, that account exists —
    // direct them to log in rather than creating a colliding family.
    const existing = await credentialRowsByEmail(parentEmail)
    for (const account of existing) {
      if (await verifyPassword(password, account.passwordHash!)) {
        throw new HttpError(
          409,
          'An account with this parent email and password already exists. Please log in instead.',
        )
      }
    }

    // ONE hash shared by every sibling row — this is what links the family.
    const passwordHash = await hashPassword(password)
    const rows = await db
      .insert(students)
      .values(
        names.map((name) => ({
          program: 'regular' as const,
          studentName: name,
          parentEmail,
          phoneNumber: parentPhone,
          passwordHash,
          approved: false, // each student pends until a teacher confirms
          paid: false,
        })),
      )
      .returning()

    const token = signStudentSession({ studentId: rows[0]!.id, email: parentEmail })
    res.cookie(STUDENT_COOKIE_NAME, token, sessionCookieOptions)

    const adminToken = req.cookies?.[SESSION_COOKIE_NAME]
    const byAdmin = adminToken ? verifySession(adminToken) !== null : false
    if (!byAdmin) notifyAdminOfRegistration({ names, parentEmail, parentPhone, submittedAt: rows[0]!.createdAt })

    logger.info('studentAuth', 'register ok', { ids: rows.map((r) => r.id) })
    res.status(201).json({ account: accountPayload(rows) })
  } catch (err) {
    next(err)
  }
})

// POST /api/student-auth/login — body: { email, password }
// Matches the password to a row, then returns the whole family. A dummy
// compare runs when nothing matches so timing doesn't reveal which emails
// are registered.
studentAuthRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = studentLoginSchema.parse(req.body)

    const candidates = await credentialRowsByEmail(email)

    // Siblings registered together share one hash, so compare against DISTINCT
    // hashes only. A normal family is then a single bcrypt compare — the same
    // cost as an unregistered email (the dummy compare below) — which closes
    // the timing oracle that iterating every row would open (it would leak
    // whether the email exists and roughly how many students it has).
    const seenHashes = new Set<string>()
    const distinct: (typeof students.$inferSelect)[] = []
    for (const row of candidates) {
      if (row.passwordHash && !seenHashes.has(row.passwordHash)) {
        seenHashes.add(row.passwordHash)
        distinct.push(row)
      }
    }

    let matched: typeof students.$inferSelect | null = null
    for (const account of distinct) {
      if (await verifyPassword(password, account.passwordHash!)) {
        matched = account
        break
      }
    }
    if (distinct.length === 0) {
      await verifyPassword(password, DUMMY_HASH)
    }

    if (!matched) {
      logger.warn('studentAuth', 'login failed', { email })
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const family = await familyOf(matched)
    const token = signStudentSession({ studentId: matched.id, email: matched.parentEmail! })
    res.cookie(STUDENT_COOKIE_NAME, token, sessionCookieOptions)
    logger.info('studentAuth', 'login ok', { ids: family.map((r) => r.id) })
    res.json({ account: accountPayload(family) })
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

// Resolve the session's student row, or null if it's gone (e.g. the admin
// rejected/deleted it). Shared by /me and the assignment endpoints.
async function sessionRow(studentId: number) {
  const rows = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.program, 'regular')))
    .limit(1)
  return rows[0] ?? null
}

// GET /api/student-auth/me — the whole family, fresh from the DB so approval
// changes the admin made show up without re-login.
studentAuthRouter.get('/me', requireStudentAuth, async (_req, res, next) => {
  try {
    const row = await sessionRow(res.locals.student!.studentId)
    if (!row) {
      res.clearCookie(STUDENT_COOKIE_NAME, clearSessionCookieOptions)
      res.status(401).json({ error: 'Account no longer exists.' })
      return
    }
    const family = await familyOf(row)
    res.json({ account: accountPayload(family) })
  } catch (err) {
    next(err)
  }
})

// ---------- Assignments (student side) ----------

// GET /api/student-auth/assignments — homework for EVERY student in the
// family. Each row carries its studentId; the portal groups them under each
// student's name. Open items first, newest first within each group.
studentAuthRouter.get('/assignments', requireStudentAuth, async (_req, res, next) => {
  try {
    const row = await sessionRow(res.locals.student!.studentId)
    if (!row) {
      res.status(401).json({ error: 'Account no longer exists.' })
      return
    }
    const family = await familyOf(row)
    const ids = family.map((r) => r.id)
    const rows = await db
      .select()
      .from(assignments)
      .where(inArray(assignments.studentId, ids))
      .orderBy(assignments.completed, desc(assignments.createdAt))
    res.json({ assignments: rows })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/student-auth/assignments/:id — toggle completed on any
// assignment belonging to a student IN THIS FAMILY (siblings share the
// device/login, so checking off each other's work is expected). Anything
// outside the family 404s.
studentAuthRouter.patch('/assignments/:id', requireStudentAuth, async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { completed } = assignmentStudentUpdateSchema.parse(req.body)

    const row = await sessionRow(res.locals.student!.studentId)
    if (!row) {
      res.status(401).json({ error: 'Account no longer exists.' })
      return
    }
    const family = await familyOf(row)
    const ids = family.map((r) => r.id)

    const [updated] = await db
      .update(assignments)
      .set({ completed, updatedAt: new Date() })
      .where(and(eq(assignments.id, id), inArray(assignments.studentId, ids)))
      .returning()
    if (!updated) {
      res.status(404).json({ error: 'Assignment not found.' })
      return
    }
    logger.info('assignment', 'student toggled', { id, completed })
    res.json({ assignment: updated })
  } catch (err) {
    next(err)
  }
})
