import { and, eq, gte, lt, ne, sql } from 'drizzle-orm'
import { DateTime } from 'luxon'
import { classInstances, students } from '../db/schema.js'
import { HttpError } from '../middleware/errorHandler.js'
import { firstOverlap, slotEnd, type Slot } from './overlap.js'
import { CENTRAL_ZONE } from './schedule.js'

// A teacher can't be in two classes at once. Every route that gives a class a
// time (new series, series re-pattern, single-class move) calls this inside its
// write transaction, so the check and the write happen together.

// Longest class the schemas allow, so a lookback this long catches any class
// that started earlier and is still running.
const MAX_DURATION_MINUTES = 600

// Arbitrary namespace for pg advisory locks taken on a teacher's calendar.
const TEACHER_LOCK_NS = 7301

// Anything with drizzle's select/execute API (the db or a transaction).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = any

export async function assertTeacherFree(
  tx: Executor,
  teacherId: number,
  slots: Slot[],
  opts: { excludeEnrollmentId?: number; excludeInstanceId?: number; who?: 'you' | 'teacher' } = {},
): Promise<void> {
  if (slots.length === 0) return

  // Serialise bookings per teacher until the transaction ends, so two people
  // booking the same free slot at the same moment can't both succeed.
  await tx.execute(sql`select pg_advisory_xact_lock(${TEACHER_LOCK_NS}, ${teacherId})`)

  const from = new Date(Math.min(...slots.map((s) => s.start.getTime())) - MAX_DURATION_MINUTES * 60_000)
  const to = new Date(Math.max(...slots.map(slotEnd)))

  const conditions = [
    eq(classInstances.teacherId, teacherId),
    eq(classInstances.status, 'scheduled'),
    gte(classInstances.startsAtUtc, from),
    lt(classInstances.startsAtUtc, to),
  ]
  if (opts.excludeEnrollmentId != null) conditions.push(ne(classInstances.enrollmentId, opts.excludeEnrollmentId))
  if (opts.excludeInstanceId != null) conditions.push(ne(classInstances.id, opts.excludeInstanceId))

  const rows: { start: Date; durationMinutes: number; studentName: string }[] = await tx
    .select({
      start: classInstances.startsAtUtc,
      durationMinutes: classInstances.durationMinutes,
      studentName: students.studentName,
    })
    .from(classInstances)
    .innerJoin(students, eq(classInstances.studentId, students.id))
    .where(and(...conditions))

  const hit = firstOverlap(slots, rows)
  if (!hit) return

  const s = DateTime.fromJSDate(hit.existing.start).setZone(CENTRAL_ZONE)
  const e = s.plus({ minutes: hit.existing.durationMinutes })
  const subject = opts.who === 'you' ? 'You already have' : 'This teacher already has'
  throw new HttpError(
    409,
    `${subject} ${hit.existing.studentName} on ${s.toFormat('EEE, MMM d')} from ${s.toFormat('h:mm')} to ${e.toFormat('h:mm a')}. Pick a different time.`,
  )
}
