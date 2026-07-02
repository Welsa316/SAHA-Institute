import { eq, inArray } from 'drizzle-orm'
import { DateTime } from 'luxon'
import { db } from '../db/index.js'
import { students, teachers, classInstances } from '../db/schema.js'
import { sendEmail, escapeHtml, siteOrigin, adminContactEmail } from './email.js'
import { logger } from './log.js'

// Event-triggered email notifications. Every function is fire-and-forget: it
// returns void, runs its work async, and swallows+logs its own errors so a
// failed (or skipped) email NEVER breaks the user action that triggered it.
// Sending itself no-ops when RESEND_API_KEY is unset (see lib/email.ts), so this
// is inert in local/preview and only delivers in production.

const CENTRAL = 'America/Chicago'
const DAY_NAMES: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday' }

function fmtDate(isoDate: string): string {
  return DateTime.fromISO(isoDate, { zone: CENTRAL }).toFormat('EEEE, LLLL d, yyyy')
}
function fmtDateTime(utc: Date): string {
  return DateTime.fromJSDate(utc).setZone(CENTRAL).toFormat("EEEE, LLLL d 'at' h:mm a") + ' Central'
}
function fmtTime(hhmm: string): string {
  return DateTime.fromFormat(hhmm, 'HH:mm').toFormat('h:mm a')
}
function firstName(name: string): string {
  return (name || '').trim().split(/\s+/)[0] || ''
}

// Shared navy-branded shell, matching the admin-notification template.
function layout(heading: string, innerHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #001B3D; padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0;">${escapeHtml(heading)}</h2>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; color: #334155; line-height: 1.6;">
        ${innerHtml}
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">SAHA Institute For Learning</p>
      </div>
    </div>`
}

// Run an async notification body with uniform error isolation.
function fire(label: string, fn: () => Promise<void>): void {
  void fn().catch((err) => logger.error('notify', `${label} threw`, { message: (err as Error).message }))
}

// ---------- Student scheduled (→ parent) ----------
export function notifyStudentScheduled(args: {
  studentId: number
  teacherId: number
  daysOfWeek: number[]
  startTimeLocal: string
  durationMinutes: number
  startDate: string
}): void {
  fire('scheduled', async () => {
    const [s] = await db
      .select({ name: students.studentName, email: students.parentEmail })
      .from(students)
      .where(eq(students.id, args.studentId))
      .limit(1)
    if (!s?.email) {
      logger.info('notify', 'scheduled: no parent email, skipped', { studentId: args.studentId })
      return
    }
    const [t] = await db.select({ name: teachers.name }).from(teachers).where(eq(teachers.id, args.teacherId)).limit(1)
    const days = [...args.daysOfWeek].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).filter(Boolean).join(', ')
    const html = layout('Class Scheduled', `
      <p><strong>${escapeHtml(s.name)}</strong> has been scheduled for one-on-one tutoring:</p>
      <table style="border-collapse: collapse; margin: 8px 0;">
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Teacher</td><td style="padding: 4px 0;">${escapeHtml(t?.name ?? '')}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Days</td><td style="padding: 4px 0;">${escapeHtml(days)}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Time</td><td style="padding: 4px 0;">${escapeHtml(fmtTime(args.startTimeLocal))} Central</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Length</td><td style="padding: 4px 0;">${args.durationMinutes} minutes</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Starting</td><td style="padding: 4px 0;">${escapeHtml(fmtDate(args.startDate))}</td></tr>
      </table>
      <p>These classes repeat weekly. We'll let you know if anything changes.</p>`)
    logger.info('notify', 'student scheduled', { to: s.email })
    await sendEmail({ to: [s.email], subject: `${s.name}'s tutoring schedule is set`, html })
  })
}

// ---------- Teacher account ready (→ teacher) ----------
export function notifyTeacherReady(teacherId: number): void {
  fire('teacher-ready', async () => {
    const [t] = await db.select({ name: teachers.name, email: teachers.email }).from(teachers).where(eq(teachers.id, teacherId)).limit(1)
    if (!t?.email) {
      logger.info('notify', 'teacher-ready: no email, skipped', { teacherId })
      return
    }
    const url = `${siteOrigin()}/admin/login`
    const html = layout('Your account is ready', `
      <p>Hi ${escapeHtml(firstName(t.name))},</p>
      <p>Your SAHA Institute teacher account is set up. You can sign in to see your class schedule:</p>
      <p><a href="${escapeHtml(url)}" style="display: inline-block; background: #001B3D; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 14px;">Sign in</a></p>
      <p style="font-size: 13px; color: #64748b;">Use this email address and the password you just created.</p>`)
    logger.info('notify', 'teacher ready', { to: t.email })
    await sendEmail({ to: [t.email], subject: 'Your SAHA teacher account is ready', html })
  })
}

// ---------- Student approved (→ parent) ----------
export function notifyStudentApproved(studentId: number): void {
  fire('approved', async () => {
    const [s] = await db
      .select({ name: students.studentName, email: students.parentEmail })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1)
    if (!s?.email) {
      logger.info('notify', 'approved: no parent email, skipped', { studentId })
      return
    }
    const html = layout('Registration approved', `
      <p><strong>${escapeHtml(s.name)}</strong>'s registration has been approved — welcome to SAHA Institute!</p>
      <p>We'll be in touch about scheduling classes. You'll get a confirmation email once a class time is set.</p>`)
    logger.info('notify', 'student approved', { to: s.email })
    await sendEmail({ to: [s.email], subject: `${s.name}'s registration is approved`, html })
  })
}

// ---------- Teacher cancelled a class (→ admin) ----------
export function notifyAdminOfTeacherCancellation(args: { teacherId: number; instanceId: number }): void {
  fire('teacher-cancel-admin', async () => {
    const [inst] = await db
      .select({ startsAtUtc: classInstances.startsAtUtc, studentId: classInstances.studentId })
      .from(classInstances)
      .where(eq(classInstances.id, args.instanceId))
      .limit(1)
    if (!inst) return
    const [t] = await db.select({ name: teachers.name }).from(teachers).where(eq(teachers.id, args.teacherId)).limit(1)
    const [s] = await db.select({ name: students.studentName }).from(students).where(eq(students.id, inst.studentId)).limit(1)
    const html = layout('A teacher cancelled a class', `
      <p><strong>${escapeHtml(t?.name ?? 'A teacher')}</strong> cancelled a class:</p>
      <p>${escapeHtml(s?.name ?? 'Student')} — ${escapeHtml(fmtDateTime(inst.startsAtUtc))}</p>`)
    logger.info('notify', 'teacher cancellation -> admin', { to: adminContactEmail() })
    await sendEmail({ to: [adminContactEmail()], subject: `Class cancelled by ${t?.name ?? 'a teacher'}`, html })
  })
}

// ---------- Class rescheduled (→ parent) ----------
export function notifyClassRescheduled(args: { studentId: number; oldStartsAtUtc: Date; newStartsAtUtc: Date }): void {
  fire('rescheduled', async () => {
    const [s] = await db
      .select({ name: students.studentName, email: students.parentEmail })
      .from(students)
      .where(eq(students.id, args.studentId))
      .limit(1)
    if (!s?.email) {
      logger.info('notify', 'rescheduled: no parent email, skipped', { studentId: args.studentId })
      return
    }
    const html = layout('Class rescheduled', `
      <p><strong>${escapeHtml(s.name)}</strong>'s class has been moved:</p>
      <table style="border-collapse: collapse; margin: 8px 0;">
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Was</td><td style="padding: 4px 0; text-decoration: line-through; color: #94a3b8;">${escapeHtml(fmtDateTime(args.oldStartsAtUtc))}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Now</td><td style="padding: 4px 0;">${escapeHtml(fmtDateTime(args.newStartsAtUtc))}</td></tr>
      </table>
      <p>The rest of the schedule is unchanged.</p>`)
    logger.info('notify', 'class rescheduled', { to: s.email })
    await sendEmail({ to: [s.email], subject: `${s.name}'s class has moved`, html })
  })
}

// ---------- Series rescheduled (→ parent) ----------
export function notifySeriesRescheduled(args: {
  studentId: number
  daysOfWeek: number[]
  startTimeLocal: string
  durationMinutes: number
}): void {
  fire('series-rescheduled', async () => {
    const [s] = await db
      .select({ name: students.studentName, email: students.parentEmail })
      .from(students)
      .where(eq(students.id, args.studentId))
      .limit(1)
    if (!s?.email) {
      logger.info('notify', 'series-rescheduled: no parent email, skipped', { studentId: args.studentId })
      return
    }
    const days = [...args.daysOfWeek].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).filter(Boolean).join(', ')
    const html = layout('Schedule changed', `
      <p><strong>${escapeHtml(s.name)}</strong>'s weekly schedule has changed. From today onward:</p>
      <table style="border-collapse: collapse; margin: 8px 0;">
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Days</td><td style="padding: 4px 0;">${escapeHtml(days)}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Time</td><td style="padding: 4px 0;">${escapeHtml(fmtTime(args.startTimeLocal))} Central</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; font-weight: bold;">Length</td><td style="padding: 4px 0;">${args.durationMinutes} minutes</td></tr>
      </table>
      <p>Classes already held are unaffected.</p>`)
    logger.info('notify', 'series rescheduled', { to: s.email })
    await sendEmail({ to: [s.email], subject: `${s.name}'s weekly schedule has changed`, html })
  })
}

// ---------- Teacher's classes cancelled, e.g. on teacher removal (→ parents) ----------
export function notifyTeacherClassesCancelled(studentIds: number[], teacherName: string): void {
  fire('teacher-classes-cancelled', async () => {
    if (studentIds.length === 0) return
    const rows = await db
      .select({ name: students.studentName, email: students.parentEmail })
      .from(students)
      .where(inArray(students.id, studentIds))
    let sent = 0
    for (const s of rows) {
      if (!s.email) continue
      const html = layout('Classes cancelled', `
        <p><strong>${escapeHtml(s.name)}</strong>'s upcoming classes with ${escapeHtml(teacherName)} have been cancelled.</p>
        <p>Please reach out to set up a new schedule.</p>`)
      await sendEmail({ to: [s.email], subject: `${s.name}'s upcoming classes are cancelled`, html })
      sent += 1
    }
    logger.info('notify', 'teacher classes cancelled', { affected: rows.length, sent, teacherName })
  })
}

// ---------- Cancellations (→ affected parents) ----------
export type CancelType = 'student_off' | 'series_cancelled' | 'day_closed'

export interface CancellationEvent {
  type: CancelType
  instanceIds: number[]
  studentIds: number[]
  context?: Record<string, unknown>
}

export function notifyCancellation(event: CancellationEvent): void {
  fire(`cancel:${event.type}`, async () => {
    if (event.type === 'student_off') {
      const instanceId = event.instanceIds[0]
      if (!instanceId) return
      const [inst] = await db
        .select({ startsAtUtc: classInstances.startsAtUtc, studentId: classInstances.studentId })
        .from(classInstances)
        .where(eq(classInstances.id, instanceId))
        .limit(1)
      if (!inst) return
      const [s] = await db
        .select({ name: students.studentName, email: students.parentEmail })
        .from(students)
        .where(eq(students.id, inst.studentId))
        .limit(1)
      if (!s?.email) return
      const html = layout('Class cancelled', `
        <p><strong>${escapeHtml(s.name)}</strong>'s class has been cancelled:</p>
        <p>${escapeHtml(fmtDateTime(inst.startsAtUtc))}</p>
        <p>The rest of the schedule is unchanged.</p>`)
      logger.info('notify', 'cancel student_off', { to: s.email })
      await sendEmail({ to: [s.email], subject: `${s.name}'s class on ${DateTime.fromJSDate(inst.startsAtUtc).setZone(CENTRAL).toFormat('LLL d')} is cancelled`, html })
      return
    }

    if (event.type === 'series_cancelled') {
      const studentId = event.studentIds[0]
      if (!studentId) return
      const [s] = await db
        .select({ name: students.studentName, email: students.parentEmail })
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1)
      if (!s?.email) return
      const html = layout('Classes cancelled', `
        <p>All of <strong>${escapeHtml(s.name)}</strong>'s upcoming classes have been cancelled.</p>
        <p>Please reach out if you'd like to set up a new schedule.</p>`)
      logger.info('notify', 'cancel series', { to: s.email })
      await sendEmail({ to: [s.email], subject: `${s.name}'s upcoming classes are cancelled`, html })
      return
    }

    // day_closed — notify every affected parent, one email each (so each only
    // sees their own child).
    if (event.studentIds.length === 0) return
    const dateStr = typeof event.context?.date === 'string' ? event.context.date : null
    const rows = await db
      .select({ name: students.studentName, email: students.parentEmail })
      .from(students)
      .where(inArray(students.id, event.studentIds))
    const dayLabel = dateStr ? fmtDate(dateStr) : 'that day'
    let sent = 0
    for (const s of rows) {
      if (!s.email) continue
      const html = layout('Class cancelled — closure', `
        <p>Due to a closure, all classes on <strong>${escapeHtml(dayLabel)}</strong> are cancelled, including ${escapeHtml(s.name)}'s.</p>
        <p>The rest of the schedule is unchanged. We'll see you at the next class.</p>`)
      await sendEmail({ to: [s.email], subject: `Classes cancelled ${dateStr ? `on ${DateTime.fromISO(dateStr, { zone: CENTRAL }).toFormat('LLL d')}` : ''} — closure`, html })
      sent += 1
    }
    logger.info('notify', 'cancel day_closed', { affected: rows.length, sent })
  })
}
