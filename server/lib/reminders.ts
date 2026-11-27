import { and, eq, gt, gte, lt, lte, isNotNull } from 'drizzle-orm'
import { DateTime } from 'luxon'
import { db } from '../db/index.js'
import { classInstances, students, teachers, reminderLog } from '../db/schema.js'
import { logger } from './log.js'
import { nextDueDate } from './billing.js'
import {
  sendClassReminderEmail,
  sendTeacherDailyDigestEmail,
  sendPaymentReminderEmail,
} from './notifications.js'

// Clock-driven reminders. Everything else that emails in this codebase is
// event-triggered (an admin acts, a mail goes out); this is the only thing that
// fires on its own.
//
// THE ONE INVARIANT: a family never receives the same reminder twice. That
// matters more than delivering every reminder, because a duplicate teaches
// people to ignore the next one. It is enforced in `claim()` below by a unique
// index in the database, not by bookkeeping in this process — so a restart
// mid-tick, a redeploy replaying an hour, or a second app instance cannot
// double-send.
//
// Sending itself no-ops without RESEND_API_KEY (see lib/email.ts), so this
// whole module is inert locally and in preview and only delivers in production.

const CENTRAL = 'America/Chicago'

export const REMINDER_KINDS = {
  class24h: 'class_24h',
  teacherDaily: 'teacher_daily',
  paymentCycle: 'payment_cycle',
} as const

// Hourly. A tick is cheap (three indexed queries against small tables) and an
// hour is fine granularity for "tomorrow's class" and "payment due in 3 days".
const TICK_MS = 60 * 60 * 1000

// Run one tick shortly after boot rather than waiting a full hour, so a
// redeploy doesn't open an hour-long hole. Delayed a little so it never
// competes with migrations/seeding for the connection pool.
const BOOT_DELAY_MS = 20_000

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < min || n > max) {
    logger.warn('reminders', `${name} is not an integer in ${min}..${max} — using default`, { raw, fallback })
    return fallback
  }
  return n
}

// Local hour at which a teacher's daily digest goes out. Before their first
// class (the earliest weekday slot is 3:15 PM) and late enough to be a morning
// email rather than an overnight one.
function digestHour(): number {
  return envInt('REMINDER_DIGEST_HOUR', 7, 0, 23)
}

// How many days ahead of a due date the payment reminder goes out.
function paymentLeadDays(): number {
  return envInt('REMINDER_PAYMENT_LEAD_DAYS', 3, 0, 60)
}

// ---------- The idempotency claim ----------
// Insert-first, send-second. `onConflictDoNothing` + `returning` means exactly
// one caller gets a row back for a given (kind, refKey); everyone else gets
// nothing and sends nothing. This is the double-send guard.
async function claim(kind: string, refKey: string): Promise<boolean> {
  const rows = await db
    .insert(reminderLog)
    .values({ kind, refKey })
    .onConflictDoNothing({ target: [reminderLog.kind, reminderLog.refKey] })
    .returning({ id: reminderLog.id })
  return rows.length > 0
}

// Hand a claim back when the send failed, so the next tick retries instead of
// silently swallowing the reminder. The unique index still prevents a
// concurrent double-send in the meantime; this only re-opens a claim nobody
// managed to act on.
async function release(kind: string, refKey: string): Promise<void> {
  try {
    await db.delete(reminderLog).where(and(eq(reminderLog.kind, kind), eq(reminderLog.refKey, refKey)))
  } catch (err) {
    logger.error('reminders', 'failed to release claim', { kind, refKey, message: (err as Error).message })
  }
}

// Claim → send → release-on-failure. Returns true only when an email actually
// went out.
async function claimAndSend(kind: string, refKey: string, send: () => Promise<boolean>): Promise<boolean> {
  if (!(await claim(kind, refKey))) return false
  let ok = false
  try {
    ok = await send()
  } catch (err) {
    logger.error('reminders', 'send threw', { kind, refKey, message: (err as Error).message })
    ok = false
  }
  if (!ok) await release(kind, refKey)
  return ok
}

// Billing cycle maths lives in lib/billing.ts so the admin API computes due
// dates from the same code that decides who gets emailed. Re-exported here
// because this module is where the reminder flow is read from.
export { nextDueDate }

// ---------- Job 1: class reminder to the parent, ~24h ahead ----------
// Queries a WINDOW UP TO NOW+24h rather than a one-hour slice. That is
// deliberate: if the process is down for a few hours, the next tick still
// catches every class inside the window instead of skipping the ones whose
// slice was missed.
async function runClassReminders(now: DateTime): Promise<void> {
  const rows = await db
    .select({
      instanceId: classInstances.id,
      startsAtUtc: classInstances.startsAtUtc,
      durationMinutes: classInstances.durationMinutes,
      studentName: students.studentName,
      parentEmail: students.parentEmail,
      teacherName: teachers.name,
    })
    .from(classInstances)
    .innerJoin(students, eq(students.id, classInstances.studentId))
    .innerJoin(teachers, eq(teachers.id, classInstances.teacherId))
    .where(
      and(
        eq(classInstances.status, 'scheduled'),
        gt(classInstances.startsAtUtc, now.toJSDate()),
        lte(classInstances.startsAtUtc, now.plus({ hours: 24 }).toJSDate()),
      ),
    )

  let sent = 0
  let skipped = 0
  for (const r of rows) {
    if (!r.parentEmail) {
      skipped += 1
      continue
    }
    const ok = await claimAndSend(REMINDER_KINDS.class24h, `inst:${r.instanceId}`, () =>
      sendClassReminderEmail({
        to: r.parentEmail as string,
        studentName: r.studentName,
        teacherName: r.teacherName,
        startsAtUtc: r.startsAtUtc,
        durationMinutes: r.durationMinutes,
      }),
    )
    if (ok) sent += 1
  }
  if (rows.length > 0) {
    logger.info('reminders', 'class reminders', { candidates: rows.length, sent, noEmail: skipped })
  }
}

// ---------- Job 2: daily digest to each teacher ----------
async function runTeacherDigests(now: DateTime): Promise<void> {
  if (now.hour < digestHour()) return

  const dayStart = now.startOf('day')
  const dayEnd = dayStart.plus({ days: 1 })
  const localDate = dayStart.toISODate() as string

  const rows = await db
    .select({
      teacherId: classInstances.teacherId,
      teacherName: teachers.name,
      teacherEmail: teachers.email,
      startsAtUtc: classInstances.startsAtUtc,
      durationMinutes: classInstances.durationMinutes,
      studentName: students.studentName,
    })
    .from(classInstances)
    .innerJoin(teachers, eq(teachers.id, classInstances.teacherId))
    .innerJoin(students, eq(students.id, classInstances.studentId))
    .where(
      and(
        eq(classInstances.status, 'scheduled'),
        gte(classInstances.startsAtUtc, dayStart.toJSDate()),
        lt(classInstances.startsAtUtc, dayEnd.toJSDate()),
        isNotNull(teachers.email),
      ),
    )

  // Group by teacher so each gets ONE email listing their whole day, rather
  // than one per class.
  const byTeacher = new Map<
    number,
    { name: string; email: string; classes: { startsAtUtc: Date; durationMinutes: number; studentName: string }[] }
  >()
  for (const r of rows) {
    if (!r.teacherEmail) continue
    let entry = byTeacher.get(r.teacherId)
    if (!entry) {
      entry = { name: r.teacherName, email: r.teacherEmail, classes: [] }
      byTeacher.set(r.teacherId, entry)
    }
    entry.classes.push({
      startsAtUtc: r.startsAtUtc,
      durationMinutes: r.durationMinutes,
      studentName: r.studentName,
    })
  }

  let sent = 0
  let stale = 0
  for (const [teacherId, entry] of byTeacher) {
    entry.classes.sort((a, b) => a.startsAtUtc.getTime() - b.startsAtUtc.getTime())
    // Only send while some of the day is still ahead. `hour >= digestHour` on
    // its own would also fire for a process that boots in the evening, mailing
    // a teacher a digest of a day that is already over — noise, and noise is
    // how a reminder channel gets ignored. At the normal 7am run every class
    // (earliest slot 2pm) is still upcoming, so this never suppresses a real
    // digest; it only drops the retrospective ones.
    if (entry.classes[entry.classes.length - 1].startsAtUtc <= now.toJSDate()) {
      stale += 1
      continue
    }
    const ok = await claimAndSend(REMINDER_KINDS.teacherDaily, `t:${teacherId}:${localDate}`, () =>
      sendTeacherDailyDigestEmail({
        to: entry.email,
        teacherName: entry.name,
        localDate,
        classes: entry.classes,
      }),
    )
    if (ok) sent += 1
  }
  if (byTeacher.size > 0) {
    logger.info('reminders', 'teacher digests', { teachers: byTeacher.size, sent, dayOver: stale, date: localDate })
  }
}

// ---------- Job 3: recurring tuition reminder to the parent ----------
async function runPaymentReminders(now: DateTime): Promise<void> {
  const todayIso = now.startOf('day').toISODate() as string
  const lead = paymentLeadDays()

  const rows = await db
    .select({
      id: students.id,
      studentName: students.studentName,
      parentEmail: students.parentEmail,
      anchor: students.billingAnchorDate,
      cadence: students.billingCadence,
    })
    .from(students)
    // Tutoring students only, and only those an admin has opted in by setting
    // an anchor date. `approved` guards the legacy pending-registration queue.
    .where(
      and(
        eq(students.program, 'regular'),
        eq(students.approved, true),
        isNotNull(students.billingAnchorDate),
        isNotNull(students.parentEmail),
      ),
    )

  let sent = 0
  let due = 0
  for (const r of rows) {
    if (!r.anchor || !r.parentEmail) continue
    const dueDate = nextDueDate(r.anchor, r.cadence, todayIso)
    if (!dueDate) {
      logger.warn('reminders', 'could not compute due date', { studentId: r.id, anchor: r.anchor })
      continue
    }
    const daysAway = Math.round(
      DateTime.fromISO(dueDate, { zone: CENTRAL }).diff(DateTime.fromISO(todayIso, { zone: CENTRAL }), 'days').days,
    )
    if (daysAway < 0 || daysAway > lead) continue
    due += 1
    const ok = await claimAndSend(REMINDER_KINDS.paymentCycle, `s:${r.id}:${dueDate}`, () =>
      sendPaymentReminderEmail({
        to: r.parentEmail as string,
        studentName: r.studentName,
        dueDate,
        cadence: r.cadence,
        daysAway,
      }),
    )
    if (ok) sent += 1
  }
  if (due > 0) {
    logger.info('reminders', 'payment reminders', { enrolled: rows.length, due, sent, lead })
  }
}

// ---------- The tick ----------
let ticking = false

export async function runRemindersOnce(reference?: DateTime): Promise<void> {
  if (ticking) {
    logger.warn('reminders', 'tick still running — skipping this one')
    return
  }
  ticking = true
  const now = (reference ?? DateTime.now()).setZone(CENTRAL)
  try {
    // Each job is isolated: one failing (a bad row, a transient DB error) must
    // not stop the other two from running.
    const jobs: [string, Promise<void>][] = [
      ['class', runClassReminders(now)],
      ['teacherDigest', runTeacherDigests(now)],
      ['payment', runPaymentReminders(now)],
    ]
    const results = await Promise.allSettled(jobs.map(([, p]) => p))
    results.forEach((res, i) => {
      if (res.status === 'rejected') {
        logger.error('reminders', `${jobs[i][0]} job failed`, { message: String((res.reason as Error)?.message ?? res.reason) })
      }
    })
  } finally {
    ticking = false
  }
}

export function startReminderScheduler(): void {
  if (process.env.REMINDERS_ENABLED?.trim() === 'false') {
    logger.warn('reminders', 'scheduler disabled by REMINDERS_ENABLED=false')
    return
  }

  const boot = setTimeout(() => {
    void runRemindersOnce()
  }, BOOT_DELAY_MS)
  // Don't hold the process open on shutdown.
  boot.unref()

  const timer = setInterval(() => {
    void runRemindersOnce()
  }, TICK_MS)
  timer.unref()

  logger.info('reminders', 'scheduler started', {
    tickMinutes: TICK_MS / 60000,
    digestHour: digestHour(),
    paymentLeadDays: paymentLeadDays(),
  })
}
