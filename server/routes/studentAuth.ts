import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { assignments, students } from '../db/schema.js'
import {
  studentRegisterSchema,
  studentAddSiblingSchema,
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
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { logger } from '../lib/log.js'

// FAMILY accounts. An admin registers a family from the Students tab, which
// creates one login (parent email + password) covering one or more students —
// each student is still its own `students` row (own grade, own homework,
// own approval flag), but every row
// from the registration shares the SAME password hash string. That shared
// hash is the family link: at login we bcrypt-match the password to a row,
// then the family is "all rows with this email and this exact hash". The
// portal shows every student in the family side by side.
//
// Different families CAN share an email in principle (a legacy case from the
// earlier per-student-password model); the password still disambiguates.
// Registering again with an email+password that already matches an account
// is rejected — add more children to that family with admin-add-sibling.

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

// POST /api/student-auth/admin-register (admin) — body: { names: [..], parentEmail, parentPhone?, password }
// Families no longer self-register: an admin fills in the same form from the
// Students tab. Creates one APPROVED row per student, all sharing the login,
// and returns the new rows. No student session is set — the admin stays the
// admin — and no "new registration" email goes out, since the admin is the
// one who would have received it.
studentAuthRouter.post('/admin-register', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { names, parentEmail, parentPhone, password } = studentRegisterSchema.parse(req.body)

    // If this email+password already matches an account, that family exists —
    // registering it again would create a colliding family.
    const existing = await credentialRowsByEmail(parentEmail)
    for (const account of existing) {
      if (await verifyPassword(password, account.passwordHash!)) {
        throw new HttpError(
          409,
          'This family is already registered with this email and password. To add a child, open one of their students and use Add a sibling.',
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
          phoneNumber: parentPhone ?? null,
          passwordHash,
          approved: true, // an admin entered them, so they're already vetted
          paid: false,
        })),
      )
      .returning()

    logger.info('studentAuth', 'admin register ok', {
      ids: rows.map((r) => r.id),
      by: res.locals.user?.username,
    })
    res.status(201).json({
      students: rows.map((r) => ({
        id: r.id,
        studentName: r.studentName,
        parentEmail: r.parentEmail,
        phoneNumber: r.phoneNumber,
        approved: r.approved,
        gradeLevel: r.gradeLevel,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/student-auth/admin-add-sibling (admin) — body: { studentId, name }
// Adds a child to the family `studentId` belongs to. The new row copies that
// student's email, phone and the family's shared password hash — the hash is
// the family link, so the sibling appears in the same portal login without the
// admin ever needing the password.
const MAX_FAMILY_SIZE = 6
studentAuthRouter.post('/admin-add-sibling', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { studentId, name } = studentAddSiblingSchema.parse(req.body)

    const [source] = await db.select().from(students).where(eq(students.id, studentId)).limit(1)
    if (!source || source.program !== 'regular') throw new HttpError(404, 'Student not found.')
    if (!source.parentEmail || !source.passwordHash) {
      throw new HttpError(409, 'This student has no family login to add a sibling to.')
    }

    const family = await familyOf(source)
    if (family.length >= MAX_FAMILY_SIZE) {
      throw new HttpError(409, `This family already has ${MAX_FAMILY_SIZE} students, the most one login can hold.`)
    }
    if (family.some((r) => r.studentName.trim().toLowerCase() === name.toLowerCase())) {
      throw new HttpError(409, `${name} is already in this family.`)
    }

    const [row] = await db
      .insert(students)
      .values({
        program: 'regular',
        studentName: name,
        parentEmail: source.parentEmail,
        phoneNumber: source.phoneNumber,
        passwordHash: source.passwordHash,
        approved: true,
        paid: false,
      })
      .returning()

    logger.info('studentAuth', 'admin add sibling ok', { id: row.id, siblingOf: studentId, by: res.locals.user?.username })
    res.status(201).json({
      student: {
        id: row.id,
        studentName: row.studentName,
        parentEmail: row.parentEmail,
        phoneNumber: row.phoneNumber,
        approved: row.approved,
        gradeLevel: row.gradeLevel,
      },
    })
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
