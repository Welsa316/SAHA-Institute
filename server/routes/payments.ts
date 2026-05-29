import { Router } from 'express'
import { asc, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { students, workshopSignups } from '../db/schema.js'
import { requireAuth } from '../middleware/requireAuth.js'

// Read-only aggregated view for the Payments admin tab. Pulls every "billable"
// record from the four sources Mrs. Anila tracks — workshop signups + the
// three student programs (summer camp, STEM, regular tutoring) — normalizes
// them into a single shape, and tags each row with its source so the UI can
// color-code + deep-link.
//
// Workshop rows now expose BOTH the workshops the family signed up for AND
// the subset they've paid for, so the client can render "Paid 2/3" /
// "Partial 1/3" / "Not paid 0/3" badges without a second query.
//
// This endpoint exists purely so the admin doesn't have to bounce between
// four pages to see who owes money. All actual mutations still go through
// the source-specific PATCH endpoints.

export const paymentsRouter = Router()

paymentsRouter.use(requireAuth)

// The shape every row gets normalized into before going out the door.
// Students rows: paid is a plain bool, paidFrom/paidUntil are dates.
// Workshop rows: paid is true iff all workshops are in paidWorkshops; the
//                workshops + paidWorkshops arrays are passed through so the
//                UI can show fractional progress.
interface PaymentRow {
  id: number
  source: 'workshop' | 'summer_camp' | 'stem_program' | 'regular'
  // Workshop rows can have a null studentName (form filled by the student
  // themselves — their name is in parentName instead). Student rows are
  // always populated since the camp/STEM/tutoring forms require it.
  studentName: string | null
  // Nullable since migration 0005 — self-signup student accounts don't carry
  // a parent name (workshop rows always do).
  parentName: string | null
  phoneNumber: string | null
  paid: boolean
  paidFrom: string | null
  paidUntil: string | null
  workshops: string[] | null
  paidWorkshops: string[] | null
  updatedAt: string
}

paymentsRouter.get('/', async (_req, res, next) => {
  try {
    // Fan out the two reads in parallel — they're independent and Postgres
    // handles concurrent SELECTs trivially. Keeps p95 down even as the roster
    // grows.
    const [workshopRows, studentRows] = await Promise.all([
      db
        .select({
          id: workshopSignups.id,
          studentName: workshopSignups.studentName,
          parentName: workshopSignups.parentName,
          workshops: workshopSignups.workshops,
          paidWorkshops: workshopSignups.paidWorkshops,
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
      ...workshopRows.map((r) => {
        // "Fully paid" for a workshop family means every workshop they signed
        // up for is in paidWorkshops. The UI can derive partial / unpaid from
        // the arrays we pass through.
        const fullyPaid =
          r.workshops.length > 0 &&
          r.workshops.every((w) => r.paidWorkshops.includes(w))
        return {
          id: r.id,
          source: 'workshop' as const,
          studentName: r.studentName,
          parentName: r.parentName,
          phoneNumber: null, // workshop_signups doesn't carry a phone number
          paid: fullyPaid,
          paidFrom: null,
          paidUntil: null, // workshop payments are one-time, no expiry
          workshops: r.workshops,
          paidWorkshops: r.paidWorkshops,
          updatedAt: r.updatedAt.toISOString(),
        }
      }),
      ...studentRows.map((r) => ({
        id: r.id,
        source: r.program,
        studentName: r.studentName,
        parentName: r.parentName,
        phoneNumber: r.phoneNumber,
        paid: r.paid,
        paidFrom: r.paidFrom,
        paidUntil: r.paidUntil,
        workshops: null,
        paidWorkshops: null,
        updatedAt: r.updatedAt.toISOString(),
      })),
    ]

    // Default order: most recently updated first. Filtering / re-sorting
    // happens client-side since the dataset is small (sub-200 rows for the
    // foreseeable future).
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    res.json({ payments: rows })
  } catch (err) {
    next(err)
  }
})
