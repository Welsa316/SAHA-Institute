import { Router } from 'express'
import { asc, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { students, workshopSignups } from '../db/schema.js'
import { requireAuth } from '../middleware/requireAuth.js'

// Read-only aggregated view for the Payments admin tab. Pulls every "billable" record
// from the four sources Mrs. Anila tracks — workshop signups + the three student
// programs (summer camp, STEM, regular tutoring) — normalizes them into a single
// shape, and tags each row with its source so the UI can color-code + deep-link.
//
// This endpoint exists purely so the admin doesn't have to bounce between four pages
// to see who owes money. All actual mutations still go through the source-specific
// PATCH endpoints (workshop_signups, summer-camp, stem-program, students).

export const paymentsRouter = Router()

paymentsRouter.use(requireAuth)

// The shape every row gets normalized into before going out the door.
interface PaymentRow {
  id: number
  source: 'workshop' | 'summer_camp' | 'stem_program' | 'regular'
  studentName: string
  parentName: string
  phoneNumber: string | null
  paid: boolean
  paidFrom: string | null
  paidUntil: string | null
  updatedAt: string
}

paymentsRouter.get('/', async (_req, res, next) => {
  try {
    // Fan out the four reads in parallel — they're independent and Postgres handles
    // concurrent SELECTs trivially. Keeps p95 down even as the roster grows.
    const [workshopRows, studentRows] = await Promise.all([
      db
        .select({
          id: workshopSignups.id,
          studentName: workshopSignups.studentName,
          parentName: workshopSignups.parentName,
          paid: workshopSignups.paid,
          paidUntil: workshopSignups.paidUntil,
          updatedAt: workshopSignups.updatedAt,
        })
        .from(workshopSignups)
        .orderBy(desc(workshopSignups.updatedAt)),
      db
        .select({
          id: students.id,
          program: students.program,
          studentName: students.studentName,
          parentName: students.parentName,
          phoneNumber: students.phoneNumber,
          paid: students.paid,
          paidFrom: students.paidFrom,
          paidUntil: students.paidUntil,
          updatedAt: students.updatedAt,
        })
        .from(students)
        .orderBy(asc(students.studentName)),
    ])

    const rows: PaymentRow[] = [
      ...workshopRows.map((r) => ({
        id: r.id,
        source: 'workshop' as const,
        studentName: r.studentName,
        parentName: r.parentName,
        phoneNumber: null, // workshop_signups doesn't carry a phone number — intentional
        paid: r.paid,
        paidFrom: null,
        paidUntil: r.paidUntil,
        updatedAt: r.updatedAt.toISOString(),
      })),
      ...studentRows.map((r) => ({
        id: r.id,
        source: r.program,
        studentName: r.studentName,
        parentName: r.parentName,
        phoneNumber: r.phoneNumber,
        paid: r.paid,
        paidFrom: r.paidFrom,
        paidUntil: r.paidUntil,
        updatedAt: r.updatedAt.toISOString(),
      })),
    ]

    // Default order: most recently updated first. Filtering / re-sorting happens
    // client-side since the dataset is small (sub-200 rows for the foreseeable future).
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    res.json({ payments: rows })
  } catch (err) {
    next(err)
  }
})
