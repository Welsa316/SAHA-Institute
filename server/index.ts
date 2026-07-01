import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { fileURLToPath } from 'url'
import { dirname, join, sep } from 'path'

import { runMigrations } from './db/migrate.js'
import { seedAdmin } from './db/seed.js'
import { logger } from './lib/log.js'
import { errorHandler } from './middleware/errorHandler.js'

import { authRouter } from './routes/auth.js'
import { workshopSignupsRouter } from './routes/workshopSignups.js'
import { studentsRouter } from './routes/students.js'
import { studentAuthRouter } from './routes/studentAuth.js'
import { assignmentsRouter } from './routes/assignments.js'
import { paymentsRouter } from './routes/payments.js'
import { contactRouter } from './routes/contact.js'
import { enrollmentsRouter } from './routes/enrollments.js'
import { teachersRouter } from './routes/teachers.js'
import { instancesRouter } from './routes/instances.js'
import { scheduleRouter, studentScheduleRouter } from './routes/schedule.js'
import { teacherSetupRouter } from './routes/teacherSetup.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = Number(process.env.PORT ?? 3000)

// Don't advertise the framework.
app.disable('x-powered-by')

// Security response headers (HSTS, X-Content-Type-Options, frameguard, etc.).
// CSP is left off for now — the SPA pulls Google Fonts and embeds a Google Maps
// iframe, so a real policy needs to be authored deliberately rather than guessed.
// CORP is cross-origin so the OG image / static assets stay embeddable elsewhere.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
)

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
app.use('/api/students', studentScheduleRouter) // POST /:id/cancel-schedule (before the CRUD factory)
app.use('/api/students', studentsRouter('regular'))
app.use('/api/student-auth', studentAuthRouter)
app.use('/api/assignments', assignmentsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/enrollments', enrollmentsRouter)
app.use('/api/teachers', teachersRouter)
app.use('/api/instances', instancesRouter)
app.use('/api/schedule', scheduleRouter)
app.use('/api/teacher-setup', teacherSetupRouter) // public, token-gated

// ---------- Static frontend ----------
// In production the Vite build lands in /dist. In dev (`npm run dev`) Vite serves the
// frontend on a different port — this static middleware is harmless when /dist is missing.
// `redirect: false` disables Express's automatic trailing-slash redirect for directory
// URLs. Without it, `/summer-camp` 301s to `/summer-camp/` (because dist/summer-camp/
// holds flyer images), which breaks vue-router for that route.
//
// Cache policy matters here: Vite assets carry a content hash in the filename, so
// they're safe to cache forever (`immutable`). index.html must NEVER be cached
// stale — it's the pointer to the current hashes. Without this, a browser that
// cached index.html before a deploy keeps requesting old chunk files that no
// longer exist, the SPA fallback answers with HTML instead of JS, and lazy-loaded
// admin pages silently fail to open. (This bit a real user: the admin "Students"
// tab appeared to show nothing after a deploy.)
const distPath = join(__dirname, '..', 'dist')
app.use(
  express.static(distPath, {
    redirect: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${sep}assets${sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else {
        // index.html, favicons, images at the root — always revalidate.
        res.setHeader('Cache-Control', 'no-cache')
      }
    },
  }),
)

// SPA fallback — any non-API GET that didn't match static gets index.html so vue-router
// can take over. Anything starting with /api that didn't match a route falls through to
// the 404 below. A request for a stale hashed asset (old deploy) must 404 rather than
// receive index.html-as-JavaScript, so the chunk-error handler in the frontend can
// detect the failure and reload.
// Public routes vite-ssg prerendered to flat <route>.html files. Everything else
// (auth/admin) gets the clean empty shell to hydrate client-side. ('/' is served
// as the prerendered dist/index.html by express.static above.)
const PRERENDERED_ROUTES = new Set(['/about', '/summer-camp', '/enroll', '/contact', '/register'])

app.get(/^(?!\/api).*/, (req, res) => {
  if (req.path.startsWith('/assets/')) {
    res.status(404).send('Asset not found (stale deploy reference).')
    return
  }
  res.setHeader('Cache-Control', 'no-cache')
  const fallback = PRERENDERED_ROUTES.has(req.path) ? `${req.path.slice(1)}.html` : 'app-shell.html'
  res.sendFile(join(distPath, fallback), (err) => {
    if (!err) return
    // Prerendered/shell file missing (e.g. dev with no build) — serve index.html.
    res.sendFile(join(distPath, 'index.html'), (err2) => {
      if (err2) res.status(404).send('Not found.')
    })
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
      // Teachers are managed entirely from the admin Teachers tab now (invite,
      // reset, remove). Env-based seeding is retired: it would resurrect a
      // removed teacher on every boot and duplicate UI-created ones. The
      // TEACHER*_ env vars are now inert and can be deleted from the host.
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
