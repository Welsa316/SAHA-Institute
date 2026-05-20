# Next Steps

Scratchpad for the next person picking this up. None of this is in scope for the current
backend + admin dashboard delivery — but it's the natural follow-on work once Mrs. Anila
is using the dashboard in production and feedback starts coming back.

---

## Soon — small follow-ups

- **Populate the workshop list.** `src/views/SignupView.vue` has `const WORKSHOPS = []`
  with a TODO comment. Once Anila sends the 11 workshop names, drop them in there. The
  signup form already hides itself behind a "Workshop list coming soon" notice while
  empty, so this is a one-line change with no other code impact.
- **Bulk-import existing roster.** Anila currently keeps the Summer Camp and STEM rosters
  in her phone / WhatsApp. Add a CSV import on the two roster pages so she can paste a
  spreadsheet instead of typing each row. Endpoint already exists (`POST /api/summer-camp`,
  `POST /api/stem-program`); this is purely a frontend bulk-upload UX.
- **Parent confirmation email.** The spec deliberately left this out — currently only
  the admin gets emailed on a new workshop signup. Once the workshop list is finalized
  and parents are actually signing up, send them a confirmation email too with what
  they registered for + next-step instructions.
- **Export to CSV.** Anila will eventually want to send the roster to the city / a
  funder. Add a "Download CSV" button on each admin list page.

## Medium — feature work

- **Per-parent login.** Right now there's one shared admin account. Parents have no
  login. A parent portal at `/parent` would let them:
  - See their kid's enrollment status (paid? paid until?)
  - Pay online (Stripe — needs a separate plan, see below)
  - Update contact info
  - View assignments / progress reports if/when those exist
  This is a real feature build — new `parents` table, magic-link auth (no passwords for
  parents, it'll be a support burden), and a separate set of API routes scoped to the
  parent's own children. Plan it as its own milestone.
- **Online payments via Stripe.** Today "paid" is a manual toggle Anila flips after she
  sees Zelle / cash come in. A Stripe Checkout integration would let parents pay tuition
  directly, then a webhook flips `paid` automatically and sets `paidUntil` one month out.
  Requires the parent login above to be useful.
- **Assignments + progress reports.** The product brief from the client meeting mentioned
  homework tracking and report cards as a "phase 2" feature. New `assignments` and
  `grades` tables, instructor-side UI to create/grade them, parent-side UI to view.
  Substantial — probably a 1-2 week build on its own.
- **Multi-admin with roles.** If Anila brings on an assistant, we'll need a second admin
  account and probably role differentiation (e.g. an instructor role that can see their
  own students but not edit billing). The `users` table is already there; just needs a
  `role` column and middleware that checks it.

## Later — infrastructure

- **Audit log.** Every PATCH / DELETE in the admin should write to an `audit_log` table
  with who, when, before, after. Cheap insurance against fat-finger mistakes and useful
  when Anila wants to know "who marked this kid unpaid?"
- **Email deliverability.** Resend is configured but we haven't validated SPF / DKIM /
  DMARC on `sahainstituteforlearning.com`. Should do that before the parent confirmation
  emails go live, or they'll land in spam.
- **Backups.** Railway snapshots Postgres daily but they're tied to the project. Set up
  a weekly pg_dump to S3 (or similar) for off-platform backup.
- **Monitoring.** No error tracking right now. Wire up Sentry (or Better Stack, or
  whatever's cheapest) so we hear about crashes before Anila does.
- **Rate limit per-user, not just per-IP.** The public workshop signup is rate-limited
  to 5/IP/hour, which is fine for now. If we add the parent portal we'll want per-user
  limits on the authenticated endpoints too (e.g. don't let one parent spam 1000 PATCHes
  on their own kid's row).

## Cleanup nits

- The student email/phone fields are intentionally absent from the current students
  table — Anila said she'd contact via WhatsApp directly. If that changes, add nullable
  `parentEmail` + `parentPhone` columns and surface them on the roster UI.
- The `additionalNotes` field on `workshop_signups` is read-only in the admin (parent
  wrote it, admin reads it). The teacher's own notes live in the separate `notes` field.
  This split is intentional — don't merge them.
- `useAdminAuth.js` keeps the session in memory, so a hard refresh hits `/api/auth/me`
  to re-check. That's fine for a low-traffic admin but if we ever load 10+ admin pages
  in tabs we should debounce.
