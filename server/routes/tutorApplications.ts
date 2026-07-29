import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { tutorApplicationSchema } from '../schemas/index.js'
import { adminContactEmail, escapeHtml, sendEmail } from '../lib/email.js'
import { HttpError } from '../middleware/errorHandler.js'
import { logger } from '../lib/log.js'

export const tutorApplicationsRouter: Router = Router()

// Public form → email only, no DB row. Stricter limit than the signup forms:
// applications are rarer than signups and each carries a potentially-large
// resume payload.
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many applications from this address. Please try again in an hour.' },
})

const GENDER_LABELS: Record<string, string> = {
  female: 'Female',
  male: 'Male',
  prefer_not: 'Prefer not to say',
}

function buildApplicationEmail(a: {
  name: string
  email: string
  phone: string
  country: string
  age: number
  gender: string
  education: string
  hasResume: boolean
  submittedAt: Date
}): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 150px; vertical-align: top;">${label}:</td>
      <td style="padding: 8px 0; color: #334155;">${value}</td>
    </tr>`
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0;">New Tutor Application</h2>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          ${row('Name', escapeHtml(a.name))}
          ${row('Email', escapeHtml(a.email))}
          ${row('Phone', escapeHtml(a.phone))}
          ${row('Country', escapeHtml(a.country))}
          ${row('Age', String(a.age))}
          ${row('Gender', escapeHtml(GENDER_LABELS[a.gender] ?? a.gender))}
          ${row('Resume', a.hasResume ? 'Attached to this email' : 'Not provided')}
          ${row('Submitted', a.submittedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' }))}
        </table>
        <p style="font-weight: bold; color: #001B3D; margin: 16px 0 8px;">Educational Background:</p>
        <p style="color: #334155; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(a.education)}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
        <a href="mailto:${escapeHtml(a.email)}" style="display: inline-block; background: #001B3D; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Reply to ${escapeHtml(a.name)}
        </a>
      </div>
    </div>
  `
}

// POST /api/tutor-applications — validate, forward to the admin inbox with the
// resume attached. The send is AWAITED (unlike the fire-and-forget notifs):
// with no DB row, a failed email means a lost application, so the applicant
// must see the error. Without RESEND_API_KEY (local/preview) the send no-ops
// and we treat the submission as successful so the form is testable.
tutorApplicationsRouter.post('/', limiter, async (req, res, next) => {
  try {
    const input = tutorApplicationSchema.parse(req.body)

    const delivered = await sendEmail({
      to: [adminContactEmail()],
      subject: `New Tutor Application — ${input.name}`,
      html: buildApplicationEmail({
        ...input,
        hasResume: Boolean(input.resume),
        submittedAt: new Date(),
      }),
      attachments: input.resume
        ? [{ filename: input.resume.fileName, content: input.resume.base64 }]
        : undefined,
    })

    if (!delivered && process.env.RESEND_API_KEY) {
      throw new HttpError(502, 'We could not submit your application right now. Please try again or email us directly.')
    }

    logger.info('tutor-app', 'received', {
      name: input.name,
      country: input.country,
      resume: Boolean(input.resume),
      delivered,
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})
