import { Router } from 'express'
import { and, asc, desc, eq, ne } from 'drizzle-orm'
import { db } from '../db/index.js'
import { students, workshopSignups } from '../db/schema.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'

// Read-only aggregated view for the Payments admin tab: every record that has
// actually been PAID (fully or, for workshops, partially), across the sources
// the site tracks payment for — workshop signups and the camp/STEM rosters.
// All payments are one-time; there are no billing windows or expiry dates.
//
// Regular (tutoring) students are deliberately ABSENT: the site does not
// track tutoring payments at all — that happens off-platform.
//
// Workshop rows expose BOTH the workshops the family signed up for AND the
// subset they've paid for, so the client can render "Paid 2/3" / "Partial"
// badges without a second query. Mutations happen on the source pages.

export const paymentsRouter = Router()

paymentsRouter.use(requireAuth, requireAdmin)

interface PaymentRow {
  id: number
  source: 'workshop' | 'summer_camp' | 'stem_program'
  // Workshop rows can have a null studentName (form filled by the student
  // themselves — their name is in parentName instead).
  studentName: string | null
  parentName: string | null
  phoneNumber: string | null
  paid: boolean
  workshops: string[] | null
  paidWorkshops: string[] | null
  updatedAt: string
}

paymentsRouter.get('/', async (_req, res, next) => {
  try {
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
          updatedAt: students.updatedAt,
        })
        .from(students)
        // Camp/STEM only (no tutoring-payment tracking), approved, and
        // actually paid — Payments is a record of payments, not a roster.
        .where(and(ne(students.program, 'regular'), eq(students.approved, true), eq(students.paid, true)))
        .orderBy(asc(students.studentName)),
    ])

    // Workshop families belong here once they've paid for at least one workshop.
    const paidWorkshopRows = workshopRows.filter((r) => r.paidWorkshops.length > 0)

    const rows: PaymentRow[] = [
      ...paidWorkshopRows.map((r) => {
        const fullyPaid =
          r.workshops.length > 0 &&
          r.workshops.every((w) => r.paidWorkshops.includes(w))
        return {
          id: r.id,
          source: 'workshop' as const,
          studentName: r.studentName,
          parentName: r.parentName,
          phoneNumber: null,
          paid: fullyPaid,
          workshops: r.workshops,
          paidWorkshops: r.paidWorkshops,
          updatedAt: r.updatedAt.toISOString(),
        }
      }),
      ...studentRows.map((r) => ({
        id: r.id,
        source: r.program as 'summer_camp' | 'stem_program',
        studentName: r.studentName,
        parentName: r.parentName,
        phoneNumber: r.phoneNumber,
        paid: r.paid,
        workshops: null,
        paidWorkshops: null,
        updatedAt: r.updatedAt.toISOString(),
      })),
    ]

    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    res.json({ payments: rows })
  } catch (err) {
    next(err)
  }
})
