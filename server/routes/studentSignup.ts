import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from '../db/index.js'
import { students } from '../db/schema.js'
import { studentSignupCreateSchema } from '../schemas/index.js'
import { escapeHtml, sendEmail } from '../lib/email.js'
import { logger } from '../lib/log.js'
import { SESSION_COOKIE_NAME, verifySession } from '../lib/auth.js'

// Public student-signup endpoint. Inserts a row into the `students` table with
// program = 'regular' (year-round tutoring roster). Same shape as the workshop
// signup: rate-limited by IP, skipped for authenticated admin sessions so
// Anila can batch-enter from /admin/students without tripping the cap, and the
// notification email is suppressed when an admin POSTs (no point pinging her
// about a row she just typed in herself).

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

const GRADE_LABELS: Record<'elementary' | 'middle' | 'high', string> = {
  elementary: 'Elementary',
  middle: 'Middle School',
  high: 'High School',
}

function buildSignupEmail(args: {
  parentName: string
  studentName: string
  gradeLevel: 'elementary' | 'middle' | 'high'
  phoneNumber: string | null | undefined
  notes: string | null | undefined
  submittedAt: Date
  adminUrl: string
}): string {
  const { parentName, studentName, gradeLevel, phoneNumber, notes, submittedAt, adminUrl } = args
  const phoneRow = phoneNumber
    ? `<tr>
         <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Phone:</td>
         <td style="padding: 8px 0; color: #334155;">${escapeHtml(phoneNumber)}</td>
       </tr>`
    : ''
  const notesBlock = notes
    ? `<p style="font-weight: bold; color: #001B3D; margin: 16px 0 8px;">Notes:</p>
       <p style="color: #334155; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(notes)}</p>`
    : ''
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0;">New Tutoring Signup</h2>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 140px;">Parent:</td>
            <td style="padding: 8px 0; color: #334155;">${escapeHtml(parentName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Student:</td>
            <td style="padding: 8px 0; color: #334155;">${escapeHtml(studentName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Grade:</td>
            <td style="padding: 8px 0; color: #334155;">${escapeHtml(GRADE_LABELS[gradeLevel])}</td>
          </tr>
          ${phoneRow}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Submitted:</td>
            <td style="padding: 8px 0; color: #334155;">${submittedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
          </tr>
        </table>
        ${notesBlock}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
        <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #001B3D; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Open Admin Dashboard
        </a>
      </div>
    </div>
  `
}

// POST /api/student-signup — public.
// Creates a row in students with program='regular' + paid=false. Admin
// follows up off-platform to collect first payment, then flips the toggle
// (or clicks Renew +1mo) from /admin/students.
studentSignupRouter.post('/', publicLimiter, async (req, res, next) => {
  try {
    const input = studentSignupCreateSchema.parse(req.body)

    const [row] = await db
      .insert(students)
      .values({
        program: 'regular',
        parentName: input.parentName,
        studentName: input.studentName,
        gradeLevel: input.gradeLevel,
        phoneNumber: input.phoneNumber ?? null,
        paid: false,
        paidFrom: null,
        paidUntil: null,
        notes: input.notes ?? null,
      })
      .returning()

    const adminToken = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE_NAME]
    const isAdmin = adminToken ? verifySession(adminToken) !== null : false

    logger.info('studentSignup', 'created', { id: row.id, grade: input.gradeLevel, source: isAdmin ? 'admin' : 'public' })

    if (!isAdmin) {
      const siteOrigin = process.env.SITE_ORIGIN ?? 'https://sahainstituteforlearning.com'
      const adminEmail = process.env.CONTACT_EMAIL ?? 'sahaforlearning1675@gmail.com'
      void sendEmail({
        to: [adminEmail],
        subject: `New Tutoring Signup — ${input.studentName}`,
        html: buildSignupEmail({
          parentName: input.parentName,
          studentName: input.studentName,
          gradeLevel: input.gradeLevel,
          phoneNumber: input.phoneNumber,
          notes: input.notes,
          submittedAt: row.createdAt,
          adminUrl: `${siteOrigin}${ADMIN_PATH}`,
        }),
      })
    }

    res.status(201).json({ ok: true, id: row.id })
  } catch (err) {
    next(err)
  }
})
