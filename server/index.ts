import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { runMigrations } from './db/migrate.js'
import { seedAdmin } from './db/seed.js'
import { logger } from './lib/log.js'
import { errorHandler } from './middleware/errorHandler.js'

import { authRouter } from './routes/auth.js'
import { workshopSignupsRouter } from './routes/workshopSignups.js'
import { studentsRouter } from './routes/students.js'
import { paymentsRouter } from './routes/payments.js'
import { contactRouter } from './routes/contact.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = Number(process.env.PORT ?? 3000)

// Railway terminates TLS at its proxy. Tell Express so req.ip and rate-limit work right.
app.set('trust proxy', 1)

app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

// ---------- Health check ----------
// Returns immediately without touching the DB — Railway's liveness probe needs to be cheap.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// ---------- API routes ----------
app.use('/api/auth', authRouter)
app.use('/api/contact', contactRouter)
app.use('/api/workshop-signups', workshopSignupsRouter)
app.use('/api/summer-camp', studentsRouter('summer_camp'))
app.use('/api/stem-program', studentsRouter('stem_program'))
app.use('/api/students', studentsRouter('regular'))
app.use('/api/payments', paymentsRouter)

// ---------- Static frontend ----------
// In production the Vite build lands in /dist. In dev (`npm run dev`) Vite serves the
// frontend on a different port — this static middleware is harmless when /dist is missing.
// `redirect: false` disables Express's automatic trailing-slash redirect for directory
// URLs. Without it, `/summer-camp` 301s to `/summer-camp/` (because dist/summer-camp/
// holds flyer images), which breaks vue-router for that route.
const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath, { redirect: false }))

// SPA fallback — any non-API GET that didn't match static gets index.html so vue-router
// can take over. Anything starting with /api that didn't match a route falls through to
// the 404 below.
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Not found.')
    }
  })
})

// 404 for unmatched /api routes.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' })
})

// Centralized error handler — must come last.
app.use(errorHandler)

async function start(): Promise<void> {
  try {
    if (process.env.DATABASE_URL) {
      await runMigrations()
      await seedAdmin()
    } else {
      logger.warn('boot', 'DATABASE_URL is not set — DB-backed routes will 500 until configured')
    }

    const server = app.listen(PORT, () => {
      logger.info('boot', 'server up', { port: PORT, env: process.env.NODE_ENV ?? 'development' })
    })

    function shutdown(signal: string): void {
      logger.info('boot', 'shutdown', { signal })
      server.close(() => process.exit(0))
      setTimeout(() => {
        logger.error('boot', 'forced shutdown after 10s')
        process.exit(1)
      }, 10_000).unref()
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (err) {
    logger.error('boot', 'failed', { message: (err as Error).message })
    process.exit(1)
  }
}

void start()
