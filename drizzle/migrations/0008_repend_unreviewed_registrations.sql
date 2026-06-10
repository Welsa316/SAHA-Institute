-- Data fix: migration 0006 added `approved` with DEFAULT true, which silently
-- auto-approved any self-registration that existed before the approval gate
-- shipped. Those students never went through review — they landed in the
-- roster's "Unassigned" group instead of the Pending queue, where the admin
-- couldn't find them ("got the pending email, but no pending students visible").
--
-- Re-pend exactly the rows that can only be unreviewed self-registrations:
--   - program 'regular' (the only program self-registration writes)
--   - has login credentials (username) — admin-created roster rows never do
--   - no grade and no parent assigned — i.e. no admin has touched the row
-- Idempotent; a no-op on databases with no such rows.
UPDATE "students"
SET "approved" = false
WHERE "program" = 'regular'
  AND "approved" = true
  AND "username" IS NOT NULL
  AND "grade_level" IS NULL
  AND "parent_name" IS NULL;
