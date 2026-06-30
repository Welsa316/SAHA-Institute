-- Scheduling module: roles + teachers, the recurring-class model (enrollments),
-- and the generated occurrences the calendar renders (class_instances).

-- ---- Enums --------------------------------------------------------------
CREATE TYPE "user_role" AS ENUM ('admin', 'teacher');
CREATE TYPE "enrollment_status" AS ENUM ('active', 'cancelled');
CREATE TYPE "class_instance_status" AS ENUM ('scheduled', 'cancelled');
CREATE TYPE "cancel_type" AS ENUM ('student_off', 'series_cancelled', 'day_closed');

-- ---- teachers -----------------------------------------------------------
-- One row per teaching staff member. `color` colour-codes this teacher's
-- classes on the master calendar.
CREATE TABLE "teachers" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "color" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ---- users: expand the single shared admin into roles + accounts --------
-- The login identifier moves from `email` to `username` (value preserved, so
-- the existing admin keeps the same credential). `role` defaults to 'admin' so
-- the existing row stays admin; teacher accounts link to a teachers row.
ALTER TABLE "users" RENAME COLUMN "email" TO "username";
ALTER TABLE "users" ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'admin';
ALTER TABLE "users" ADD COLUMN "teacher_id" integer REFERENCES "teachers"("id");
ALTER TABLE "users" ADD COLUMN "display_timezone" text NOT NULL DEFAULT 'America/Chicago';
ALTER TABLE "users" ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now();

-- ---- enrollments: the recurring class rule ------------------------------
-- One enrollment = one student, one teacher, one start time + duration, on one
-- or more Mon-Fri weekdays (1=Mon … 5=Fri). end_date is start_date + 6 months,
-- computed at creation. Different times on different days = separate enrollments.
CREATE TABLE "enrollments" (
  "id" serial PRIMARY KEY,
  "student_id" integer NOT NULL REFERENCES "students"("id"),
  "teacher_id" integer NOT NULL REFERENCES "teachers"("id"),
  "days_of_week" integer[] NOT NULL,
  "start_time_local" text NOT NULL,
  "duration_minutes" integer NOT NULL DEFAULT 60,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "status" "enrollment_status" NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ---- class_instances: generated occurrences -----------------------------
-- One row per individual class. `starts_at_utc` is the canonical instant
-- (Central wall-clock + IANA tz → UTC at generation, so DST is correct per
-- occurrence). teacher_id/student_id are denormalised for cheap calendar
-- queries. Cancelled rows are kept (history), never deleted.
CREATE TABLE "class_instances" (
  "id" serial PRIMARY KEY,
  "enrollment_id" integer NOT NULL REFERENCES "enrollments"("id"),
  "student_id" integer NOT NULL REFERENCES "students"("id"),
  "teacher_id" integer NOT NULL REFERENCES "teachers"("id"),
  "starts_at_utc" timestamptz NOT NULL,
  "duration_minutes" integer NOT NULL,
  "status" "class_instance_status" NOT NULL DEFAULT 'scheduled',
  "cancel_type" "cancel_type",
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "class_instances_starts_at_idx" ON "class_instances" ("starts_at_utc");
CREATE INDEX "class_instances_teacher_idx" ON "class_instances" ("teacher_id");
CREATE INDEX "class_instances_enrollment_idx" ON "class_instances" ("enrollment_id");
CREATE INDEX "class_instances_student_idx" ON "class_instances" ("student_id");

-- ---- students: reserve a per-student display tz for future use ----------
ALTER TABLE "students" ADD COLUMN "timezone" text NOT NULL DEFAULT 'America/Chicago';
