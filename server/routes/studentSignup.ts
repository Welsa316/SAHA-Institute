import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from '../db/index.js'
import { students } from '../db/schema.js'
import { studentSignupCreateSchema } from '../schemas/index.js'
import { escapeHtml, sendEmail } from '../lib/email.js'
import { logger } from '../lib/log.js'
import { SESSION_COOKIE_NAME, verifySession } from '../lib/auth.js'

// Public name-only student signup. The student-facing form collects nothing but
// a name; the row lands as a PENDING (approved=false) regular student. Mrs.
// Anila reviews it in the admin "Pending approval" section, assigns a grade,
// and approves — a gate against fake / spam names reaching the real roster.
//
// Rate-limited and, like the workshop signup, the limiter + notification email
// are skipped when an authenticated admin is the one POSTing.

export const studentSignupRouter: Router = Router()

const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signups from this address. Please try again in an hour or call us.' },
  skip: (req) => {
    const token = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE_NAME]
    if (!token) return false
    return verifySession(token) !== null
  },
})

const ADMIN_PATH = '/admin/students'

function buildSignupEmail(args: { name: string; submittedAt: Date; adminUrl: string }): string {
  const { name, submittedAt, adminUrl } = args
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0;">New Student Signup — Pending Approval</h2>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 140px;">Name:</td>
            <td style="padding: 8px 0; color: #334155;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Submitted:</td>
            <td style="padding: 8px 0; color: #334155;">${submittedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
          </tr>
        </table>
        <p style="color: #334155; margin: 16px 0; line-height: 1.6;">
          Review this signup in the dashboard — assign a grade and approve, or
          delete it if it doesn't look real.
        </p>
        <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #001B3D; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Review in Dashboard
        </a>
      </div>
    </div>
  `
}

// POST /api/student-signup — public. Body: { name }
studentSignupRouter.post('/', publicLimiter, async (req, res, next) => {
  try {
    const { name } = studentSignupCreateSchema.parse(req.body)

    const [row] = await db
      .insert(students)
      .values({
        program: 'regular',
        studentName: name,
        approved: false, // pending until an admin confirms
        paid: false,
      })
      .returning({ id: students.id, createdAt: students.createdAt })

    const adminToken = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE_NAME]
    const isAdmin = adminToken ? verifySession(adminToken) !== null : false

    logger.info('studentSignup', 'created', { id: row.id, source: isAdmin ? 'admin' : 'public' })

    if (!isAdmin) {
      const siteOrigin = process.env.SITE_ORIGIN ?? 'https://sahainstituteforlearning.com'
      const adminEmail = process.env.CONTACT_EMAIL ?? 'sahaforlearning1675@gmail.com'
      void sendEmail({
        to: [adminEmail],
        subject: `New Student Signup (pending) — ${name}`,
        html: buildSignupEmail({ name, submittedAt: row.createdAt, adminUrl: `${siteOrigin}${ADMIN_PATH}` }),
      })
    }

    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})
