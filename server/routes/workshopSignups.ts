import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { workshopSignups } from '../db/schema.js'
import {
  workshopSignupCreateSchema,
  workshopSignupUpdateSchema,
  idParamSchema,
} from '../schemas/index.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'
import { HttpError } from '../middleware/errorHandler.js'
import { adminContactEmail, escapeHtml, sendEmail, siteOrigin } from '../lib/email.js'
import { logger } from '../lib/log.js'
import { SESSION_COOKIE_NAME, verifySession } from '../lib/auth.js'

export const workshopSignupsRouter: Router = Router()

// Public form is rate-limited to slow spam without inconveniencing real parents.
// 5 submissions per IP per hour matches the spec. Authenticated admin requests
// skip the limiter — Anila adds signups manually from the dashboard and would
// otherwise hit the cap doing batch entry off a paper list.
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

const ADMIN_PATH = '/admin/workshop-signups'

function buildSignupEmail(args: {
  parentName: string
  studentName: string | null | undefined
  workshops: string[]
  additionalNotes: string | null | undefined
  submittedAt: Date
  adminUrl: string
}): string {
  const { parentName, studentName, workshops, additionalNotes, submittedAt, adminUrl } = args
  const workshopList = workshops.map((w) => `<li style="margin: 4px 0;">${escapeHtml(w)}</li>`).join('')
  const notesBlock = additionalNotes
    ? `<p style="font-weight: bold; color: #001B3D; margin: 16px 0 8px;">Additional Notes:</p>
       <p style="color: #334155; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(additionalNotes)}</p>`
    : ''
  // Student row is omitted entirely when the form was filled without a student
  // name — the form is now signed by "the participant" rather than "a parent
  // on behalf of a student," so the absence is meaningful, not missing data.
  const studentRow = studentName
    ? `<tr>
         <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Student:</td>
         <td style="padding: 8px 0; color: #334155;">${escapeHtml(studentName)}</td>
       </tr>`
    : ''
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0;">New Workshop Signup</h2>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 140px;">Name:</td>
            <td style="padding: 8px 0; color: #334155;">${escapeHtml(parentName)}</td>
          </tr>
          ${studentRow}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Submitted:</td>
            <td style="padding: 8px 0; color: #334155;">${submittedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
          </tr>
        </table>
        <p style="font-weight: bold; color: #001B3D; margin: 16px 0 8px;">Workshops:</p>
        <ul style="color: #334155; padding-left: 20px; margin: 0;">${workshopList}</ul>
        ${notesBlock}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
        <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #001B3D; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Open Admin Dashboard
        </a>
      </div>
    </div>
  `
}

// POST /api/workshop-signups — public OR admin (rate limit auto-skipped above
// when the request carries a valid admin session cookie).
// Creates a row, then fires a Resend notification email to the admin IF the
// submission came from a parent. Admin manual additions skip the email so
// Anila isn't pinged about signups she just typed in herself.
// Email failure does NOT block the response — the row is safely persisted
// either way.
workshopSignupsRouter.post('/', publicLimiter, async (req, res, next) => {
  try {
    const input = workshopSignupCreateSchema.parse(req.body)

    // One row PER STUDENT — a family submission ("more than one student?") fans
    // out into sibling rows under the same parent, so the admin can mark each
    // student's workshops paid individually. All rows land in one transaction.
    const studentNames: (string | null)[] = [
      input.studentName ?? null,
      ...(input.additionalStudents ?? []),
    ]

    const rows = await db.transaction(async (tx) => {
      const created = []
      for (const name of studentNames) {
        const [row] = await tx
          .insert(workshopSignups)
          .values({
            parentName: input.parentName,
            studentName: name,
            workshops: input.workshops,
            additionalNotes: input.additionalNotes ?? null,
          })
          .returning()
        created.push(row)
      }
      return created
    })

    const adminToken = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE_NAME]
    const isAdmin = adminToken ? verifySession(adminToken) !== null : false

    logger.info('signup', 'created', {
      ids: rows.map((r) => r.id),
      students: studentNames.length,
      workshops: input.workshops.length,
      source: isAdmin ? 'admin' : 'public',
    })

    if (!isAdmin) {
      const namedStudents = studentNames.filter((n): n is string => Boolean(n))
      // Fire-and-forget email — don't make the parent wait on Resend latency.
      void sendEmail({
        to: [adminContactEmail()],
        // Subject lists the students, falling back to the parent/registrant
        // name when no separate student name was provided.
        subject: `New Workshop Signup — ${namedStudents.length ? namedStudents.join(', ') : input.parentName}`,
        html: buildSignupEmail({
          parentName: input.parentName,
          studentName: namedStudents.length ? namedStudents.join(', ') : null,
          workshops: input.workshops,
          additionalNotes: input.additionalNotes,
          submittedAt: rows[0].createdAt,
          adminUrl: `${siteOrigin()}${ADMIN_PATH}`,
        }),
      })
    }

    res.status(201).json({ ok: true, ids: rows.map((r) => r.id) })
  } catch (err) {
    next(err)
  }
})

// GET /api/workshop-signups — admin, newest first.
workshopSignupsRouter.get('/', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(workshopSignups)
      .orderBy(desc(workshopSignups.createdAt))
    res.json({ signups: rows })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/workshop-signups/:id — admin. Partial update of teacher-side fields.
// With per-workshop payment tracking there's no global paid flag to auto-clear
// anymore; clients just send the new paidWorkshops array.
workshopSignupsRouter.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const patch = workshopSignupUpdateSchema.parse(req.body)

    const [row] = await db
      .update(workshopSignups)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(workshopSignups.id, id))
      .returning()

    if (!row) throw new HttpError(404, 'Signup not found.')
    logger.info('signup', 'updated', { id, fields: Object.keys(patch), user: res.locals.user?.username })
    res.json({ signup: row })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/workshop-signups/:id — admin. Spec lists this implicitly via the UI delete button.
workshopSignupsRouter.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = await db.delete(workshopSignups).where(eq(workshopSignups.id, id)).returning()
    if (result.length === 0) throw new HttpError(404, 'Signup not found.')
    logger.info('signup', 'deleted', { id, user: res.locals.user?.username })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
