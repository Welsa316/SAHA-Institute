// Institute opening hours, as Central wall-clock minutes from midnight.
// Weekdays are the after-school block; weekends are a shorter afternoon block.
// This is the single source of truth every scheduling guard validates against —
// the calendar grid mirrors these numbers on the client.

export interface DayWindow {
  openMin: number
  closeMin: number
}

// Mon–Fri 3:00–9:00 PM, Sat–Sun 2:00–6:00 PM.
const WEEKDAY_WINDOW: DayWindow = { openMin: 15 * 60, closeMin: 21 * 60 }
const WEEKEND_WINDOW: DayWindow = { openMin: 14 * 60, closeMin: 18 * 60 }

// Luxon weekday numbering: 1=Mon … 5=Fri, 6=Sat, 7=Sun.
export function isWeekend(weekday: number): boolean {
  return weekday === 6 || weekday === 7
}

export function windowForWeekday(weekday: number): DayWindow {
  return isWeekend(weekday) ? WEEKEND_WINDOW : WEEKDAY_WINDOW
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// 900 -> '3:00 PM'
export function formatMinutes(min: number): string {
  const h24 = Math.floor(min / 60)
  const m = min % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function describeWindow(weekday: number): string {
  const w = windowForWeekday(weekday)
  return `${formatMinutes(w.openMin)}–${formatMinutes(w.closeMin)}`
}

export function parseTimeToMinutes(timeLocal: string): number {
  const [h, m] = timeLocal.split(':').map(Number)
  return h * 60 + m
}

// A class must START at or after opening and END at or before closing on that
// day. Returns a human-readable reason, or null when it fits.
export function checkWithinHours(
  weekday: number,
  startTimeLocal: string,
  durationMinutes: number,
): string | null {
  const { openMin, closeMin } = windowForWeekday(weekday)
  const start = parseTimeToMinutes(startTimeLocal)
  const end = start + durationMinutes
  if (start < openMin || end > closeMin) {
    return `${DAY_NAMES[weekday]} classes run ${describeWindow(weekday)} — a ${durationMinutes}-minute class starting at ${formatMinutes(start)} doesn't fit.`
  }
  return null
}

// Validate a recurring pattern: every selected weekday must accommodate the
// class. Returns the first failure, or null.
export function checkPatternWithinHours(
  daysOfWeek: number[],
  startTimeLocal: string,
  durationMinutes: number,
): string | null {
  for (const wd of [...daysOfWeek].sort((a, b) => a - b)) {
    const problem = checkWithinHours(wd, startTimeLocal, durationMinutes)
    if (problem) return problem
  }
  return null
}
