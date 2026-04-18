import express from 'express'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// Trust Railway's reverse proxy so rate-limit sees real client IPs
app.set('trust proxy', 1)

// Cap JSON body size well below Express default to reduce abuse surface
app.use(express.json({ limit: '10kb' }))

// Serve static Vue build
app.use(express.static(join(__dirname, 'dist')))

// Health check for Railway liveness probes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Escape HTML entities in user input before embedding in email template
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]))
}

// Strip newlines and carriage returns to prevent header injection
function stripNewlines(str) {
  return String(str).replace(/[\r\n]+/g, ' ').trim()
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many contact requests. Please try again in a few minutes.' },
})

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, phone, subject, message } = req.body

  // Required field check
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' })
  }

  // Length + format validation
  if (typeof name !== 'string' || name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' })
  }
  if (typeof email !== 'string' || !emailRegex.test(email) || email.length > 200) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (typeof message !== 'string' || message.length < 5 || message.length > 5000) {
    return res.status(400).json({ error: 'Message must be between 5 and 5000 characters.' })
  }
  if (phone && (typeof phone !== 'string' || phone.length > 40)) {
    return res.status(400).json({ error: 'Phone number is too long.' })
  }
  if (subject && (typeof subject !== 'string' || subject.length > 200)) {
    return res.status(400).json({ error: 'Subject is too long.' })
  }

  const resendKey = process.env.RESEND_API_KEY
  const contactEmail = process.env.CONTACT_EMAIL || 'sahaforlearning1675@gmail.com'

  if (!resendKey) {
    console.error('RESEND_API_KEY not configured')
    return res.status(500).json({ error: 'Email service not configured.' })
  }

  // Safe values for template use
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safePhone = escapeHtml(phone || 'Not provided')
  const safeSubject = escapeHtml(subject || 'General Inquiry')
  const safeMessage = escapeHtml(message)
  const subjectLine = stripNewlines(`New Contact: ${subject || 'Website Inquiry'} — from ${name}`).slice(0, 200)

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SAHA Institute <contact@sahainstituteforlearning.com>',
        to: [contactEmail],
        subject: subjectLine,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0;">New Contact Form Submission</h2>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 100px;">Name:</td>
                  <td style="padding: 8px 0; color: #334155;">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Email:</td>
                  <td style="padding: 8px 0; color: #334155;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Phone:</td>
                  <td style="padding: 8px 0; color: #334155;">${safePhone}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Subject:</td>
                  <td style="padding: 8px 0; color: #334155;">${safeSubject}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              <p style="font-weight: bold; color: #001B3D; margin-bottom: 8px;">Message:</p>
              <p style="color: #334155; white-space: pre-wrap; line-height: 1.6;">${safeMessage}</p>
            </div>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      console.error('Resend API returned', emailRes.status)
      return res.status(500).json({ error: 'Failed to send email. Please try again.' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Contact endpoint error:', err.message || err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

const server = app.listen(PORT, () => {
  console.log(`SAHA Institute server running on port ${PORT}`)
})

// Graceful shutdown — let Railway drain in-flight requests on deploy
function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`)
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
  // If connections don't close within 10s, force exit
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
