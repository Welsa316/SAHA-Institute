# Automated reminders — design

**Date:** 2026-11-27

## Intent and why

Anila currently nudges families by hand over WhatsApp. Two things should happen
on a clock instead: parents should be reminded of an upcoming class, and
families should be reminded that a tuition payment is coming due. Teachers
should also see their day laid out before it starts.

Nothing in the project does this today. Every email in `lib/notifications.ts`
is event-triggered (an admin schedules, approves, cancels or reschedules);
there is no scheduler of any kind — no cron dependency, no `setInterval`, no
Railway cron service.

## Goals

- Parent gets one email ~24h before each scheduled class.
- Each teacher gets one morning digest listing their classes that day.
- Parent gets a payment reminder a few days before each biweekly due date.
- A reminder is sent **at most once**, across restarts and redeploys.

## Non-goals

- Online payment / Stripe. Payment stays off-platform; this only reminds.
- Invoicing or amounts owed. No money figures in the emails.
- SMS / WhatsApp delivery.
- Parent-facing reminder preferences or opt-out UI.

## Anti-goals

Things that would make this a failure even if it technically runs:

- **Duplicate emails.** Worse than no reminder — it trains families to ignore
  them. This is the single hardest requirement.
- Reminders for cancelled classes, or for a removed teacher's classes.
- Reminders to families with no email on file (log and skip, never crash).
- A failed send breaking anything else. Reminders are peripheral.

## Constraints

- One Railway instance running `tsx server/index.ts`. No queue, no cron service.
- Resend no-ops without `RESEND_API_KEY`, so this is inert locally and in
  preview and only delivers in production.
- All scheduling is Central (`America/Chicago`) and must stay DST-correct per
  occurrence. Luxon is already a dependency and `class_instances.starts_at_utc`
  is already the canonical instant.
- `students.parent_email` is the only parent address and is nullable.
- Tutoring payment is **not tracked** today: `paid` / `paid_from` / `paid_until`
  are vestigial for `program='regular'`, surfaced in no admin screen, and
  `routes/payments.ts` excludes tutoring rows on purpose.

## Approaches

**1. In-process hourly scheduler + database ledger — chosen.**
A timer in the Express process wakes hourly; each reminder is *claimed* by
inserting into a `reminder_log` table before the email is sent, and the row's
`UNIQUE(kind, ref_key)` constraint is what makes a double-send impossible.
No new infrastructure, no new secret, survives restarts, and catches up after
downtime. If the app were ever scaled to two instances, both would tick but the
unique constraint still admits only one sender.

**2. External cron hitting a token-gated endpoint** (Railway cron, GitHub
Actions). Rejected: another service and another secret to keep alive, and it
adds a public endpoint whose whole job is to send mail — an attack surface for
something that needs none.

**3. Compute-on-read, no ledger** — send when "now" falls in the window.
Rejected: it fails both ways. A restart inside the window re-sends; a tick
missed during a redeploy never sends at all.

## Decisions made with the client

- **Class reminder audience:** parent 24h before, **plus** a per-teacher
  morning digest.
- **Billing model:** one **anchor date** per tutoring student ("billing starts
  here") with the cycle computed forward from it, rather than an admin
  re-entering a "paid through" date after every payment. Chosen so nothing has
  to be maintained per cycle.

## Schema

- `reminder_log(id, kind, ref_key, sent_at)` with `UNIQUE(kind, ref_key)`.
  `ref_key` is the thing being reminded about: `inst:<id>` for a class,
  `t:<teacherId>:<localDate>` for a digest, `s:<studentId>:<dueDate>` for a
  payment.
- `students.billing_anchor_date date` — nullable. Null means "no payment
  reminders for this student", which is the default and keeps every existing
  row silent until an admin opts them in.
- `students.billing_cadence enum('biweekly','monthly') default 'biweekly'` —
  **my call, not asked for.** The stored requirements list Academics at $30/hr
  "biweekly or monthly" and Islamic Studies at $250/month, so monthly is a real
  case; representing it now costs one enum and a branch in the date math
  instead of a second migration later. Biweekly is the default and the
  requested behaviour.

## Jobs

Hourly tick, plus one shortly after boot.

1. **`class_24h`** — scheduled instances starting within the next 24h with no
   ledger row → email the parent. Querying a *window to now* rather than a
   fixed hourly slice is what makes it catch up after downtime.
2. **`teacher_daily`** — at or after 07:00 Central, for each teacher with
   classes that day → one digest. Keyed on teacher + local date.
3. **`payment_biweekly`** — for each `regular` student with an anchor set,
   compute the next due date from the anchor; if it is between today and
   `REMINDER_PAYMENT_LEAD_DAYS` (default 3) away, email the parent. Keyed on
   student + due date.

## Left to the builder

- Exact copy wording, within the existing navy `layout()` shell.
- The lead-day and digest-hour constants, env-overridable.
- Where the anchor date lands in the admin UI (the Students tab detail view).
