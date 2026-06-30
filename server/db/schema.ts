import { pgTable, serial, text, boolean, timestamp, date, integer, pgEnum } from 'drizzle-orm/pg-core'

// ---------- Enums ----------

// 'regular' = year-round tutoring students (not tied to a season). Added in the second
// admin pass after Mrs. Anila asked for a master roster separate from the camp / STEM
// signup queues.
export const programEnum = pgEnum('program', ['summer_camp', 'stem_program', 'regular'])
export const gradeLevelEnum = pgEnum('grade_level', ['elementary', 'middle', 'high'])

// Scheduling-module enums.
export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher'])
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'cancelled'])
export const classInstanceStatusEnum = pgEnum('class_instance_status', ['scheduled', 'cancelled'])
export const cancelTypeEnum = pgEnum('cancel_type', ['student_off', 'series_cancelled', 'day_closed'])

// ---------- teachers ----------
// One row per teaching staff member. `color` colour-codes this teacher's classes
// on the master calendar. Teacher login accounts (users.role='teacher') link
// here via users.teacher_id. The count is not fixed — more teachers can be added.

export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  // Captured when an admin invites a teacher; reserved for future Resend emails
  // and used as the login username once the invite is completed. Nullable —
  // env-seeded teachers have none. Unique (NULLs exempt in Postgres).
  email: text('email').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- users (admin + teacher auth) ----------
// The shared admin account plus one account per teacher. Login identifier is
// `username` (the admin's value carried over from the old `email` column on
// migration 0012). `role` gates access; a teacher account carries `teacher_id`
// and every teacher-scoped query filters by it server-side. Seeded on boot from
// env vars — admin from ADMIN_EMAIL/ADMIN_PASSWORD, teachers from
// TEACHER{n}_USERNAME/TEACHER{n}_PASSWORD (see db/seed.ts).

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('admin'),
  teacherId: integer('teacher_id').references(() => teachers.id),
  displayTimezone: text('display_timezone').notNull().default('America/Chicago'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
// This table also backs self-service STUDENT ACCOUNTS: a student who registers
// at /register creates a `program='regular'` row carrying the student's name,
// the PARENT's email + phone, and a password hash. Login is parent email +
// password — the email is deliberately NOT unique (migration 0010) because
// siblings register under the same parent email; the (email, password) pair
// identifies the student, and registration rejects a duplicate pair.
// Admin-created roster rows (camp / STEM) leave the credential fields null.
// New registrations land `approved=false` and wait in the admin's pending
// queue, where the parent contact info is shown so the team can verify the
// registration is real. The password hash never leaves the server.

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  program: programEnum('program').notNull(),
  // Parent display name. Set by admin entry on camp/STEM rows; null on
  // self-registered accounts (registration collects parent email + phone,
  // not the parent's name).
  parentName: text('parent_name'),
  studentName: text('student_name').notNull(),
  // Nullable — self-registrations don't pick a grade. Admin assigns one later
  // on the Students tab; until then the row shows in an "Unassigned" group.
  gradeLevel: gradeLevelEnum('grade_level'),
  // Parent phone. Required at registration (formatted client-side); optional
  // on admin-entered camp/STEM rows.
  phoneNumber: text('phone_number'),
  // Self-registrations land unapproved (false) and sit in a "Pending approval"
  // section in the admin until a real person is confirmed — a spam/fake-name
  // gate. Everything admin-created defaults to true.
  approved: boolean('approved').notNull().default(true),
  // ---- Login credentials (self-registered accounts only). parent_email was
  // `username` until migration 0010; NOT unique — see header comment. ----
  parentEmail: text('parent_email'),
  passwordHash: text('password_hash'),
  // One-time payment flag. Camp/STEM rosters use this as a simple paid/unpaid
  // toggle. Regular (tutoring) rows don't track payment on the site at all —
  // the columns below are vestigial for them and unused by the UI.
  paid: boolean('paid').notNull().default(false),
  paidFrom: date('paid_from'),
  paidUntil: date('paid_until'),
  notes: text('notes'),
  // Reserved for future student-facing schedule display (migration 0012). Not
  // used yet — all display currently happens in the logged-in user's timezone.
  timezone: text('timezone').notNull().default('America/Chicago'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- assignments ----------
// Homework a teacher assigns to a specific student (admin-side CRUD). The
// student sees their own list in the portal and can mark items done; the
// teacher can also toggle completion (e.g. when work is handed in on paper).
// Cascade delete: removing a student removes their assignments.

export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  details: text('details'),
  dueDate: date('due_date'),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- enrollments (the recurring class rule) ----------
// One enrollment = one student, one teacher, one start time + duration, on one
// or more Mon-Fri weekdays (days_of_week: 1=Mon … 5=Fri). On creation we set
// end_date = start_date + 6 months and generate the individual class_instances.
// Different times on different days = separate enrollments.

export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  teacherId: integer('teacher_id').notNull().references(() => teachers.id),
  daysOfWeek: integer('days_of_week').array().notNull(),
  // Wall-clock start time in Central, 'HH:mm'. Same start for every weekday in
  // this enrollment.
  startTimeLocal: text('start_time_local').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: enrollmentStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- class_instances (generated occurrences) ----------
// What the calendar renders and what cancellation acts on. `starts_at_utc` is
// the canonical instant — the Central wall-clock time converted to UTC at
// generation, so DST (CST vs CDT) is correct per occurrence. teacher_id and
// student_id are denormalised for cheap calendar range queries. Cancelled rows
// are kept for history (status='cancelled' + cancel_type), never deleted.

export const classInstances = pgTable('class_instances', {
  id: serial('id').primaryKey(),
  enrollmentId: integer('enrollment_id').notNull().references(() => enrollments.id),
  studentId: integer('student_id').notNull().references(() => students.id),
  teacherId: integer('teacher_id').notNull().references(() => teachers.id),
  startsAtUtc: timestamp('starts_at_utc', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  status: classInstanceStatusEnum('status').notNull().default('scheduled'),
  cancelType: cancelTypeEnum('cancel_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- Inferred row types for use in route handlers and the frontend ----------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Teacher = typeof teachers.$inferSelect
export type NewTeacher = typeof teachers.$inferInsert

export type Enrollment = typeof enrollments.$inferSelect
export type NewEnrollment = typeof enrollments.$inferInsert

export type ClassInstance = typeof classInstances.$inferSelect
export type NewClassInstance = typeof classInstances.$inferInsert

export type UserRole = (typeof userRoleEnum.enumValues)[number]

export type Assignment = typeof assignments.$inferSelect
export type NewAssignment = typeof assignments.$inferInsert

export type WorkshopSignup = typeof workshopSignups.$inferSelect
export type NewWorkshopSignup = typeof workshopSignups.$inferInsert

export type Student = typeof students.$inferSelect
export type NewStudent = typeof students.$inferInsert

export type Program = (typeof programEnum.enumValues)[number]
export type GradeLevel = (typeof gradeLevelEnum.enumValues)[number]
