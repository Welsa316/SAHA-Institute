import { logger } from './log.js'

// Light wrapper around the Resend REST API. We use fetch instead of the SDK to keep the
// dependency footprint small and to match the pattern already used by the contact form.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

interface SendArgs {
  to: string[]
  subject: string
  html: string
  from?: string
}

const DEFAULT_FROM = 'SAHA Institute <contact@sahainstituteforlearning.com>'

// Single source of truth for the public contact address and site origin, used
// by every route that emails the admin or links back to the site. Keeping the
// defaults here means an address change is a one-line edit, not a sweep across
// routes. `.trim() ||` (not `??`) so a blank env var falls back to the default.
export function adminContactEmail(): string {
  return process.env.CONTACT_EMAIL?.trim() || 'sahaforlearning@gmail.com'
}

export function siteOrigin(): string {
  return process.env.SITE_ORIGIN?.trim() || 'https://sahainstituteforlearning.com'
}

export async function sendEmail({ to, subject, html, from = DEFAULT_FROM }: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    logger.warn('email', 'RESEND_API_KEY missing — skipping send', { subject })
    return false
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })

    if (!res.ok) {
      logger.error('email', 'resend non-2xx', { status: res.status, subject })
      return false
    }
    logger.info('email', 'sent', { subject, to: to.length })
    return true
  } catch (err) {
    logger.error('email', 'send threw', { subject, message: (err as Error).message })
    return false
  }
}

// HTML-escape values before interpolating into the email template so a malicious form
// submission can't inject markup into the admin's inbox.
export function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] ?? c))
}
