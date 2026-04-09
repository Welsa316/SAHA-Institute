import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// Serve static Vue build
app.use(express.static(join(__dirname, 'dist')))

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' })
  }

  const resendKey = process.env.RESEND_API_KEY
  const contactEmail = process.env.CONTACT_EMAIL || 'sahaforlearning1675@gmail.com'

  if (!resendKey) {
    console.error('RESEND_API_KEY not configured')
    return res.status(500).json({ error: 'Email service not configured.' })
  }

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
        subject: `New Contact: ${subject || 'Website Inquiry'} — from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0;">New Contact Form Submission</h2>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #001B3D; width: 100px;">Name:</td>
                  <td style="padding: 8px 0; color: #334155;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Email:</td>
                  <td style="padding: 8px 0; color: #334155;"><a href="mailto:${email}">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Phone:</td>
                  <td style="padding: 8px 0; color: #334155;">${phone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #001B3D;">Subject:</td>
                  <td style="padding: 8px 0; color: #334155;">${subject || 'General Inquiry'}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              <p style="font-weight: bold; color: #001B3D; margin-bottom: 8px;">Message:</p>
              <p style="color: #334155; white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.error('Resend error:', errText)
      return res.status(500).json({ error: 'Failed to send email. Please try again.' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Contact error:', err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`SAHA Institute server running on port ${PORT}`)
})
