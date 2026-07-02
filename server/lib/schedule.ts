import { DateTime } from 'luxon'

// Teachers always input start times in Central. Occurrence instants are computed
// by combining each date's wall-clock start time in this IANA zone and
// converting to UTC, so DST (CST vs CDT) is correct PER occurrence — never a
// hardcoded offset.
export const CENTRAL_ZONE = 'America/Chicago'

// end_date = start_date + 6 months (Central wall-clock), as 'YYYY-MM-DD'.
export function sixMonthsLater(startDate: string): string {
  const dt = DateTime.fromISO(startDate, { zone: CENTRAL_ZONE })
  return dt.plus({ months: 6 }).toISODate() as string
}

// Convert an INCLUSIVE Central date range to UTC bounds for querying
// starts_at_utc on the calendar: [fromUtc, toExclusiveUtc). Both ends are
// anchored to Central midnight so the range covers full Central days regardless
// of DST.
export function centralDateRangeToUtc(from: string, to: string): { fromUtc: Date; toExclusiveUtc: Date } {
  const fromUtc = DateTime.fromISO(from, { zone: CENTRAL_ZONE }).startOf('day').toJSDate()
  const toExclusiveUtc = DateTime.fromISO(to, { zone: CENTRAL_ZONE }).startOf('day').plus({ days: 1 }).toJSDate()
  return { fromUtc, toExclusiveUtc }
}

// Combine one Central date + wall-clock time into its UTC instant, and report
// the Central weekday (1=Mon … 7=Sun) so callers can enforce Mon–Fri.
export function centralDateTimeToUtc(date: string, timeLocal: string): { instant: Date; weekday: number } {
  const [hour, minute] = timeLocal.split(':').map(Number)
  const local = DateTime.fromISO(date, { zone: CENTRAL_ZONE }).set({ hour, minute, second: 0, millisecond: 0 })
  return { instant: local.toJSDate(), weekday: local.weekday }
}

// Generate the UTC start instants for a recurring class: for every date from
// startDate through endDate (inclusive) whose weekday is in daysOfWeek
// (1=Mon … 5=Fri, matching Luxon's weekday numbering), combine the date with the
// Central wall-clock startTimeLocal ('HH:mm') and convert to a UTC instant.
// Class hours (8:00–21:00) never hit the spring-forward gap, so every start time
// is a valid Central wall-clock time.
export function generateOccurrenceInstants(opts: {
  startDate: string // 'YYYY-MM-DD'
  endDate: string // 'YYYY-MM-DD'
  daysOfWeek: number[] // 1=Mon … 5=Fri
  startTimeLocal: string // 'HH:mm' in Central
}): Date[] {
  const [hour, minute] = opts.startTimeLocal.split(':').map(Number)
  const days = new Set(opts.daysOfWeek)
  const start = DateTime.fromISO(opts.startDate, { zone: CENTRAL_ZONE }).startOf('day')
  const end = DateTime.fromISO(opts.endDate, { zone: CENTRAL_ZONE }).startOf('day')

  const out: Date[] = []
  for (let d = start; d <= end; d = d.plus({ days: 1 })) {
    if (!days.has(d.weekday)) continue
    const local = d.set({ hour, minute, second: 0, millisecond: 0 })
    out.push(local.toJSDate()) // JS Date is the absolute UTC instant
  }
  return out
}
