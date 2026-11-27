import { DateTime } from 'luxon'
import type { BillingCadence } from '../db/schema.js'

// Recurring tuition cycle maths. Lives on its own so the reminder scheduler and
// the admin API compute due dates from the SAME code — a second copy for
// display would eventually disagree with the one that decides who gets emailed.

const CENTRAL = 'America/Chicago'

// The next due date on or after `todayIso`, counting forward from the anchor.
// Pure: no DB, no clock. Returns null if either date is unparseable.
export function nextDueDate(
  anchorIso: string,
  cadence: BillingCadence,
  todayIso: string,
): string | null {
  const anchor = DateTime.fromISO(anchorIso, { zone: CENTRAL }).startOf('day')
  const today = DateTime.fromISO(todayIso, { zone: CENTRAL }).startOf('day')
  if (!anchor.isValid || !today.isValid) return null

  // Anchor not reached yet — the first cycle is the anchor itself.
  if (anchor >= today) return anchor.toISODate()

  if (cadence === 'biweekly') {
    // What makes this DST-safe is the pair above: both dates are normalised to
    // midnight IN THE ZONE, and Luxon's diff is calendar-aware, so it returns
    // whole days even across a 23- or 25-hour day. Math.round is defence in
    // depth, not the mechanism — it only matters if this is ever rewritten as
    // a millisecond subtraction, where a DST boundary yields e.g. 14.04 days
    // and ceil() would silently skip a whole cycle. (Verified both ways.)
    const days = Math.round(today.diff(anchor, 'days').days)
    const periods = Math.ceil(days / 14)
    return anchor.plus({ days: periods * 14 }).toISODate()
  }

  // Monthly. Stepped with Luxon rather than computed, so month lengths and an
  // anchor late in the month (the 31st landing in February) behave the way
  // someone reading a calendar expects.
  const monthsApart = Math.floor(today.diff(anchor, 'months').months)
  for (let k = Math.max(0, monthsApart); k <= monthsApart + 2; k += 1) {
    const candidate = anchor.plus({ months: k })
    if (candidate >= today) return candidate.toISODate()
  }
  return null
}

// Today's date in the scheduling timezone, as YYYY-MM-DD.
export function todayCentral(): string {
  return DateTime.now().setZone(CENTRAL).toISODate() as string
}
