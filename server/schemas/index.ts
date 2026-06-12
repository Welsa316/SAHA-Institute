import { z } from 'zod'

// ---------- Auth ----------

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
})

// ---------- Workshop signups ----------

// Public form submission. Workshops list comes from the frontend dropdown.
// `parentName` is required and holds "the full name of whoever signed up" —
// could be a parent or the student themselves. `studentName` is optional;
// the frontend sends null when blank.
export const workshopSignupCreateSchema = z.object({
  parentName: z.string().trim().min(2).max(100),
  studentName: z.string().trim().min(2).max(100).nullable().optional(),
  workshops: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  additionalNotes: z.string().trim().max(2000).optional().nullable(),
})

// Teacher-side update. Every field is optional — partial updates allowed.
// Workshop payments are tracked PER WORKSHOP via paidWorkshops (subset of the
// row's workshops). `paid` + `paidUntil` were removed in migration 0003 because
// they couldn't express "paid for Henna, not paid for Baking" — see schema.ts.
// `contacted` was removed earlier in migration 0002.
export const workshopSignupUpdateSchema = z.object({
  paidWorkshops: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
})

// ---------- Students (summer camp + STEM program + regular tutoring) ----------

export const gradeLevelSchema = z.enum(['elementary', 'middle', 'high'])
export const programSchema = z.enum(['summer_camp', 'stem_program', 'regular'])

// Lenient phone validator — Anila's roster will have a mix of formats and we shouldn't
// reject "(504) 373-9778" or "504.373.9778". Just enforce reasonable length and that
// digits exist somewhere in there.
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .refine((v) => /\d/.test(v), 'Phone number must contain digits.')

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const studentCreateSchema = z.object({
  parentName: z.string().trim().min(2).max(100),
  studentName: z.string().trim().min(2).max(100),
  // Optional — camp/STEM rosters stopped categorizing by grade, so their
  // add-student form no longer asks for one.
  gradeLevel: gradeLevelSchema.nullable().optional(),
  phoneNumber: phoneSchema.nullable().optional(),
  paid: z.boolean().optional(),
  paidFrom: isoDateSchema.nullable().optional(),
  paidUntil: isoDateSchema.nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
})

export const studentUpdateSchema = z.object({
  parentName: z.string().trim().min(2).max(100).optional(),
  studentName: z.string().trim().min(2).max(100).optional(),
  gradeLevel: gradeLevelSchema.optional(),
  phoneNumber: phoneSchema.nullable().optional(),
  approved: z.boolean().optional(),
  paid: z.boolean().optional(),
  paidFrom: isoDateSchema.nullable().optional(),
  paidUntil: isoDateSchema.nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
})

// Self-service registration: one FAMILY account. A parent registers one or
// more students (the "more than one student?" checkbox on /register) under a
// single parent email + password; every student in the registration shares
// that login, and the portal shows each student's homework side by side.
export const studentRegisterSchema = z.object({
  names: z.array(z.string().trim().min(2).max(100)).min(1).max(6),
  parentEmail: z.string().trim().toLowerCase().email().max(200),
  parentPhone: phoneSchema,
  password: z.string().min(6).max(200),
})

export const studentLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
})

// ---------- Assignments (homework) ----------

// Teacher-side create. Assigned to one student.
export const assignmentCreateSchema = z.object({
  studentId: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  details: z.string().trim().max(5000).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

// Teacher-side update — any subset of fields.
export const assignmentUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  details: z.string().trim().max(5000).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  completed: z.boolean().optional(),
})

// Student-side update — the ONLY thing a student may change on their own
// assignment is the completed flag.
export const assignmentStudentUpdateSchema = z.object({
  completed: z.boolean(),
})

export const studentIdQuerySchema = z.object({
  studentId: z.coerce.number().int().positive(),
})

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type WorkshopSignupCreate = z.infer<typeof workshopSignupCreateSchema>
export type WorkshopSignupUpdate = z.infer<typeof workshopSignupUpdateSchema>
export type StudentCreate = z.infer<typeof studentCreateSchema>
export type StudentUpdate = z.infer<typeof studentUpdateSchema>
export type StudentRegister = z.infer<typeof studentRegisterSchema>
export type StudentLogin = z.infer<typeof studentLoginSchema>
export type AssignmentCreate = z.infer<typeof assignmentCreateSchema>
export type AssignmentUpdate = z.infer<typeof assignmentUpdateSchema>
