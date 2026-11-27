-- Automated reminders: class reminders (parent 24h + teacher daily digest) and
-- recurring tuition reminders. Two independent pieces.
--
-- 1. reminder_log is the IDEMPOTENCY LEDGER, and it is the whole reason this
--    feature is safe. The scheduler claims a reminder by INSERTing here first
--    and only sends the email if the insert succeeded; the unique index on
--    (kind, ref_key) is what guarantees a parent never receives the same
--    reminder twice, even if the process restarts mid-tick, a redeploy replays
--    an hour, or the app is ever scaled to more than one instance.
--
-- 2. students.billing_anchor_date + billing_cadence give tutoring students a
--    recurring due date. Tutoring payment was previously untracked on the site
--    (paid/paid_from/paid_until are vestigial for program='regular'). The
--    anchor is the single date an admin sets -- "billing starts here" -- and
--    every later due date is computed forward from it, so nothing has to be
--    re-entered each cycle. NULL means "no payment reminders for this student",
--    which is the default, so every existing row stays silent until an admin
--    opts them in.

CREATE TYPE "billing_cadence" AS ENUM ('biweekly', 'monthly');

-- ---- reminder_log -------------------------------------------------------
-- `kind` is the reminder type, `ref_key` identifies the exact thing reminded
-- about (a class instance, a teacher's day, a student's due date). Rows are
-- kept as a send history -- never updated, never deleted by the app.
CREATE TABLE "reminder_log" (
  "id" serial PRIMARY KEY,
  "kind" text NOT NULL,
  "ref_key" text NOT NULL,
  "sent_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "reminder_log_kind_ref_idx" ON "reminder_log" ("kind", "ref_key");

-- Sweeping the ledger for "has this been sent?" is always scoped by kind, and
-- the unique index above already serves that. A separate sent_at index keeps
-- any future retention cleanup cheap.
CREATE INDEX "reminder_log_sent_at_idx" ON "reminder_log" ("sent_at");

-- ---- students: recurring billing cycle ----------------------------------
ALTER TABLE "students" ADD COLUMN "billing_anchor_date" date;
ALTER TABLE "students" ADD COLUMN "billing_cadence" "billing_cadence" NOT NULL DEFAULT 'biweekly';
