import { pgTable, serial, text, boolean, timestamp, date, pgEnum } from 'drizzle-orm/pg-core'

// ---------- Enums ----------

// 'regular' = year-round tutoring students (not tied to a season). Added in the second
// admin pass after Mrs. Anila asked for a master roster separate from the camp / STEM
// signup queues.
export const programEnum = pgEnum('program', ['summer_camp', 'stem_program', 'regular'])
export const gradeLevelEnum = pgEnum('grade_level', ['elementary', 'middle', 'high'])

// ---------- users (admin auth) ----------
// Single shared admin account, seeded on first boot from ADMIN_EMAIL + ADMIN_PASSWORD env vars.

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- workshop_signups ----------
// Parents submit themselves via the public form, OR Anila adds them manually
// from the admin dashboard. Either way, the row IS the signup.
//
// Payment is tracked PER WORKSHOP, not per family. A family that picks Henna +
// Baking pays separately for each — being unpaid on one doesn't make them
// unpaid overall. `paid_workshops` is a subset of `workshops`; the family is
// "fully paid" when paid_workshops covers workshops (computed at display time).

export const workshopSignups = pgTable('workshop_signups', {
  id: serial('id').primaryKey(),
  // `parent_name` is a misnomer kept for column stability — it's "the full
  // name of whoever filled the form." Often a parent, but a student can fill
  // it for themselves too, in which case it's the student's own name and
  // `student_name` below is left null.
  parentName: text('parent_name').notNull(),
  // Optional. If a parent fills the form, this is their child's name. If a
  // student fills it themselves, this is left null. Migration 0004 dropped
  // the NOT NULL constraint.
  studentName: text('student_name'),
  // What they signed up for. Postgres text[].
  workshops: text('workshops').array().notNull().default([]),
  additionalNotes: text('additional_notes'),
  // Which of those workshops have been paid for. Subset of `workshops`. Starts
  // empty; admin toggles individual workshops paid by clicking the pill.
  paidWorkshops: text('paid_workshops').array().notNull().default([]),
  // `contacted` lived here briefly (migration 0002 removed it). `paid` and
  // `paid_until` lived here too (migration 0003 removed them) once workshop
  // payments became per-workshop and one-time — no recurring "until" date.
  notes: text('notes'), // teacher-side notes (distinct from additional_notes which came from the parent)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- students ----------
// One table backs Summer Camp, STEM Program, and the year-round 'regular' roster.
// The admin UI keeps them on separate pages (filtered by `program`), but storage
// stays in a single shape.
//
// As of migration 0005 this table also backs self-service STUDENT ACCOUNTS:
// a student who signs up at /signup creates a `program='regular'` row carrying
// `email` + `password_hash`. Those credentials authenticate them at /login;
// admin-created roster rows (camp / STEM, or manual regular adds) simply leave
// email + password_hash null. `parent_name` and `grade_level` became nullable
// in 0005 because self-signup only collects a name — Anila fills the rest in
// later from the admin dashboard.

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  program: programEnum('program').notNull(),
  // Nullable since 0005 — self-signup accounts don't provide a parent name.
  parentName: text('parent_name'),
  studentName: text('student_name').notNull(),
  // Nullable since 0005 — self-signup accounts don't provide a grade. Admin
  // assigns one later; until then the row shows in an "Unassigned" group.
  gradeLevel: gradeLevelEnum('grade_level'),
  // Nullable — added retroactively, so existing summer_camp / stem_program rows have NULL.
  phoneNumber: text('phone_number'),
  // Self-signups land unapproved (false) and sit in a "Pending approval"
  // section in the admin until a real person is confirmed — a spam/fake-name
  // gate. Everything admin-created (camp / STEM / manual regular adds) defaults
  // to true, so only public name-only signups start pending.
  approved: boolean('approved').notNull().default(true),
  // ---- Reserved for a future self-service login (migration 0005, currently
  // unused — the public signup is name-only for now). Kept nullable so reviving
  // accounts later is a code change, not another migration. ----
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  paid: boolean('paid').notNull().default(false),
  // paid_from is mainly used for the year-round students roster — when the current billing
  // window started — but the column lives here for all three programs so we never have to
  // schema-fork later.
  paidFrom: date('paid_from'),
  paidUntil: date('paid_until'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- Inferred row types for use in route handlers and the frontend ----------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type WorkshopSignup = typeof workshopSignups.$inferSelect
export type NewWorkshopSignup = typeof workshopSignups.$inferInsert

export type Student = typeof students.$inferSelect
export type NewStudent = typeof students.$inferInsert

export type Program = (typeof programEnum.enumValues)[number]
export type GradeLevel = (typeof gradeLevelEnum.enumValues)[number]
