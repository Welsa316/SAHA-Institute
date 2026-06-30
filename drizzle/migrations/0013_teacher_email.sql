-- Teachers gain an email. The admin captures it when inviting a teacher; it's
-- reserved for future reminder/notification emails (Resend) and is also used as
-- the teacher's login username once they complete the invite.
--
-- Nullable: teachers seeded from env vars before this migration have none. The
-- unique index keeps an email mapped to at most one teacher — Postgres treats
-- NULLs as distinct, so the email-less seeded teachers don't collide.
ALTER TABLE "teachers" ADD COLUMN "email" text;
CREATE UNIQUE INDEX "teachers_email_unique" ON "teachers" ("email");
