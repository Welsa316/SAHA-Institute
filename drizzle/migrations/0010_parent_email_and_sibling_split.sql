-- Account model change: students register with their PARENT's email + phone
-- instead of picking a username. Siblings share a parent email, so the old
-- unique constraint must go — login matches the (email, password) pair to the
-- right student, and registration rejects an identical email+password combo.
ALTER TABLE "students" DROP CONSTRAINT "students_username_unique";--> statement-breakpoint
ALTER TABLE "students" RENAME COLUMN "username" TO "parent_email";--> statement-breakpoint

-- Data fix: some roster rows were entered as one row holding several siblings
-- ("Aisha + Yusuf" in student_name). Split those into one row per student so
-- each gets its own paid flag (payment is per student). Only non-account rows
-- are split (password_hash IS NULL) — a login account holds ONE password and
-- one set of assignments, so it can't be split mechanically; none should have
-- "+" names anyway since registration takes a single student name.
INSERT INTO "students" (
  "program", "parent_name", "student_name", "grade_level", "phone_number",
  "approved", "paid", "paid_from", "paid_until", "notes", "created_at", "updated_at"
)
SELECT
  s."program", s."parent_name", trim(part.name), s."grade_level", s."phone_number",
  s."approved", s."paid", s."paid_from", s."paid_until", s."notes", s."created_at", now()
FROM "students" s,
     LATERAL regexp_split_to_table(s."student_name", '\+') AS part(name)
WHERE s."student_name" LIKE '%+%'
  AND s."password_hash" IS NULL
  AND length(trim(part.name)) > 0;--> statement-breakpoint
DELETE FROM "students"
WHERE "student_name" LIKE '%+%'
  AND "password_hash" IS NULL;
