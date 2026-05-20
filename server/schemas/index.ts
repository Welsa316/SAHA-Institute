import { z } from 'zod'

// ---------- Auth ----------

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
})

// ---------- Workshop signups ----------

// Public form submission. Workshops list comes from the frontend dropdown.
export const workshopSignupCreateSchema = z.object({
  parentName: z.string().trim().min(2).max(100),
  studentName: z.string().trim().min(2).max(100),
  workshops: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  additionalNotes: z.string().trim().max(2000).optional().nullable(),
})

// Teacher-side update. Every field is optional — partial updates allowed.
// `paidUntil` accepts an ISO date string (yyyy-mm-dd) or null.
export const workshopSignupUpdateSchema = z.object({
  contacted: z.boolean().optional(),
  paid: z.boolean().optional(),
  paidUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
})

// ---------- Students (summer camp + STEM program) ----------

export const gradeLevelSchema = z.enum(['elementary', 'middle', 'high'])
export const programSchema = z.enum(['summer_camp', 'stem_program'])

export const studentCreateSchema = z.object({
  parentName: z.string().trim().min(2).max(100),
  studentName: z.string().trim().min(2).max(100),
  gradeLevel: gradeLevelSchema,
  paid: z.boolean().optional(),
  paidUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
})

export const studentUpdateSchema = z.object({
  parentName: z.string().trim().min(2).max(100).optional(),
  studentName: z.string().trim().min(2).max(100).optional(),
  gradeLevel: gradeLevelSchema.optional(),
  paid: z.boolean().optional(),
  paidUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
})

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type WorkshopSignupCreate = z.infer<typeof workshopSignupCreateSchema>
export type WorkshopSignupUpdate = z.infer<typeof workshopSignupUpdateSchema>
export type StudentCreate = z.infer<typeof studentCreateSchema>
export type StudentUpdate = z.infer<typeof studentUpdateSchema>
