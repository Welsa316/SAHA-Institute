import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { adminContactEmail, escapeHtml, sendEmail } from '../lib/email.js'
import { logger } from '../lib/log.js'

// Public contact form endpoint — same behaviour as the original server.js version,
// just moved into the new router structure and using the shared email helper.

export const contactRouter: Router = Router()

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many contact requests. Please try again in a few minutes.' },
})

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  subject: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().min(5).max(5000),
})

function stripNewlines(str: string): string {
  return str.replace(/[\r\n]+/g, ' ').trim()
}

contactRouter.post('/', contactLimiter, async (req, res, next) => {
  try {
    const input = contactSchema.parse(req.body)
    const adminEmail = adminContactEmail()

    const safe = {
      name: escapeHtml(input.name),
      email: escapeHtml(input.email),
      phone: escapeHtml(input.phone || 'Not provided'),
      subject: escapeHtml(input.subject || 'General Inquiry'),
      message: escapeHtml(input.message),
    }
    const subjectLine = stripNewlines(`New Contact: ${input.subject || 'Website Inquiry'} — from ${input.name}`).slice(0, 200)

    const ok = await sendEmail({
      to: [adminEmail],
      subject: subjectLine,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0;">New Contact Form Submission</h2>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 100px;">Name:</td><td style="padding: 8px 0; color: #334155;">${safe.name}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Email:</td><td style="padding: 8px 0; color: #334155;"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Phone:</td><td style="padding: 8px 0; color: #334155;">${safe.phone}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Subject:</td><td style="padding: 8px 0; color: #334155;">${safe.subject}</td></tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <p style="font-weight: bold; color: #001B3D; margin-bottom: 8px;">Message:</p>
            <p style="color: #334155; white-space: pre-wrap; line-height: 1.6;">${safe.message}</p>
          </div>
        </div>
      `,
    })

    if (!ok) {
      res.status(500).json({ error: 'Failed to send email. Please try again.' })
      return
    }
    logger.info('contact', 'submitted', { fromEmail: input.email })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
