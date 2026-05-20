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
// Parents submit themselves via the public form. The teacher works the list from the admin dashboard:
// marks contacted, marks paid, records paid_until, leaves a note.

export const workshopSignups = pgTable('workshop_signups', {
  id: serial('id').primaryKey(),
  parentName: text('parent_name').notNull(),
  studentName: text('student_name').notNull(),
  // Postgres text[] — stored as the workshop IDs/names selected on the form.
  workshops: text('workshops').array().notNull().default([]),
  additionalNotes: text('additional_notes'),
  contacted: boolean('contacted').notNull().default(false),
  paid: boolean('paid').notNull().default(false),
  paidUntil: date('paid_until'),
  notes: text('notes'), // teacher-side notes (distinct from additional_notes which came from the parent)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- students ----------
// One table backs both Summer Camp and STEM Program. The admin UI keeps them on separate pages
// (filtered by `program`), but storage stays in a single shape so adding a third program later
// — or a "students" master list — is a column-add, not a table-add.

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  program: programEnum('program').notNull(),
  parentName: text('parent_name').notNull(),
  studentName: text('student_name').notNull(),
  gradeLevel: gradeLevelEnum('grade_level').notNull(),
  // Nullable — added retroactively, so existing summer_camp / stem_program rows have NULL.
  phoneNumber: text('phone_number'),
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
