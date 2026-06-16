-- Unify the admin login identity onto the public contact email.
-- The admin account was seeded as sahaforlearning1675@gmail.com (ADMIN_EMAIL);
-- the public contact email is sahaforlearning@gmail.com. The "Signed in as"
-- line on the dashboard exposed the old 1675 address, so we rename the existing
-- admin row to match. ADMIN_EMAIL must be updated to the new address in the
-- environment at the same time so seedAdmin() finds (and rotates) this same row
-- on boot instead of creating a fresh one.
--
-- Idempotent and safe:
--   - Only renames when the target email isn't already present, so re-runs and
--     databases that already hold sahaforlearning@gmail.com are left untouched.
--   - Preserves the password hash, so there is no admin lockout.
UPDATE "users"
SET "email" = 'sahaforlearning@gmail.com'
WHERE "email" = 'sahaforlearning1675@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM "users" u2 WHERE u2."email" = 'sahaforlearning@gmail.com'
  );
