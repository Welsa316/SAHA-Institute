import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextDueDate } from './billing.js'

// The recurring tuition cycle. These dates decide who gets emailed a payment
// reminder and when, so the cases that matter are the ones where naive date
// arithmetic quietly goes wrong: a due date landing exactly on today, a DST
// transition making a "day" 23 or 25 hours long, and a monthly anchor on the
// 31st in a month that has no 31st.

const MON_JAN_5 = '2026-01-05'

test('a cycle due exactly today returns today, not the next one', () => {
  // The reminder window is inclusive of the due date, so an off-by-one here
  // would skip the last reminder before payment is actually due.
  assert.equal(nextDueDate(MON_JAN_5, 'biweekly', '2026-01-05'), '2026-01-05')
  assert.equal(nextDueDate(MON_JAN_5, 'biweekly', '2026-01-19'), '2026-01-19')
  assert.equal(nextDueDate(MON_JAN_5, 'biweekly', '2026-02-02'), '2026-02-02')
})

test('biweekly steps forward in whole 14-day cycles', () => {
  assert.equal(nextDueDate(MON_JAN_5, 'biweekly', '2026-01-06'), '2026-01-19')
  assert.equal(nextDueDate(MON_JAN_5, 'biweekly', '2026-01-18'), '2026-01-19')
  assert.equal(nextDueDate(MON_JAN_5, 'biweekly', '2026-01-20'), '2026-02-02')
  // 210 days = 15 whole cycles — it must not drift over a long run.
  assert.equal(nextDueDate(MON_JAN_5, 'biweekly', '2026-08-03'), '2026-08-03')
})

test('an anchor in the future is itself the first due date', () => {
  // A family set up before their cycle starts must not be billed early.
  assert.equal(nextDueDate(MON_JAN_5, 'biweekly', '2025-12-01'), '2026-01-05')
})

test('biweekly survives both DST transitions', () => {
  // US DST starts 2026-03-08 (a 23-hour day) and ends 2026-11-01 (25 hours).
  // Luxon's calendar diff over zone-normalised midnights already returns whole
  // days here, so these pass against the current code trivially. They earn
  // their place by failing the realistic rewrite: swap the diff for
  // millisecond subtraction and 2026-10-25 -> 2026-11-08 becomes 14.04 days,
  // which ceil()s into the NEXT cycle and skips a family's reminder entirely.
  assert.equal(nextDueDate('2026-03-01', 'biweekly', '2026-03-10'), '2026-03-15')
  assert.equal(nextDueDate('2026-03-01', 'biweekly', '2026-03-15'), '2026-03-15')
  assert.equal(nextDueDate('2026-03-01', 'biweekly', '2026-03-16'), '2026-03-29')
  assert.equal(nextDueDate('2026-10-25', 'biweekly', '2026-11-05'), '2026-11-08')
  assert.equal(nextDueDate('2026-10-25', 'biweekly', '2026-11-08'), '2026-11-08')
})

test('monthly clamps an end-of-month anchor into shorter months', () => {
  // The 31st has no February equivalent; it must land on the 28th rather than
  // spilling into March.
  assert.equal(nextDueDate('2026-01-31', 'monthly', '2026-02-01'), '2026-02-28')
  assert.equal(nextDueDate('2026-01-31', 'monthly', '2026-03-01'), '2026-03-31')
  // ...and clamping must not permanently drag the cycle earlier.
  assert.equal(nextDueDate('2026-01-31', 'monthly', '2026-04-01'), '2026-04-30')
})

test('monthly steps a mid-month anchor forward', () => {
  assert.equal(nextDueDate('2026-01-15', 'monthly', '2026-01-15'), '2026-01-15')
  assert.equal(nextDueDate('2026-01-15', 'monthly', '2026-01-16'), '2026-02-15')
  assert.equal(nextDueDate('2026-01-15', 'monthly', '2026-06-20'), '2026-07-15')
})

test('an unparseable date returns null instead of a bogus due date', () => {
  // The scheduler logs and skips on null. Returning a garbage date here would
  // email a family about a payment due on "Invalid Date".
  assert.equal(nextDueDate('not-a-date', 'biweekly', '2026-01-05'), null)
  assert.equal(nextDueDate(MON_JAN_5, 'biweekly', 'nonsense'), null)
})
