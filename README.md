# SAHA Institute For Learning

The marketing site, public workshop signup form, and admin dashboard for
[sahainstituteforlearning.com](https://sahainstituteforlearning.com).

- **Frontend:** Vue 3 (Composition API) + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript, run via `tsx` (no compile step)
- **Database:** PostgreSQL (Railway in prod, local Postgres in dev) with Drizzle ORM
- **Auth:** JWT in httpOnly cookies — single shared admin account
- **Email:** Resend for the contact form and admin signup notifications
- **Hosting:** Railway (single service for both API + static frontend)

## Quickstart

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD, RESEND_API_KEY
npm run db:migrate     # runs the SQL in drizzle/migrations against $DATABASE_URL
npm run dev            # Vite dev server on :5173 (proxies /api -> :3000)
npm run dev:server     # Express on :3000 with file-watch reload
```

Open <http://localhost:5173>. The admin lives at `/admin/login`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server (frontend only) |
| `npm run dev:server` | API server with `tsx --watch` |
| `npm run build` | Production Vite build into `dist/` |
| `npm start` | Runs the API server; serves `dist/` as static + SPA fallback |
| `npm run typecheck` | `tsc --noEmit` against the server code |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply all pending migrations |
| `npm run db:studio` | Open Drizzle Studio against `$DATABASE_URL` |

## Repo layout

```
server/             Express + TypeScript backend
  db/               Drizzle schema, migration runner, admin seeder
  lib/              auth (JWT, bcrypt), email (Resend), logger
  middleware/       requireAuth, errorHandler
  routes/           auth, contact, workshopSignups, students (factory)
  schemas/          Zod request validators
  index.ts          Entrypoint — wires middleware + routes + SPA fallback
drizzle/migrations/ SQL migrations (versioned, idempotent)
src/                Vue frontend
  views/            Top-level routes
    admin/          Admin dashboard pages
  components/admin/ Shared admin UI (PageHeader, ToggleSwitch, StudentList, …)
  composables/      useAdminAuth, useAdminApi, useIntersectionReveal, …
  i18n/             EN + UR translations
  router/index.js   Routes incl. /admin auth guard
dist/               Vite build output (gitignored)
public/             Static assets copied as-is into dist/
NEXT-STEPS.md       Out-of-scope follow-ups for whoever picks this up next
```

## Routes

Public:

- `/` — homepage
- `/about` — team + mission
- `/summer-camp` — Summer Camp + STEM detail page
- `/contact` — contact form (hits `POST /api/contact`)
- `/signup` — workshop signup form (hits `POST /api/workshop-signups`, rate-limited 5/hr/IP)

Admin (auth-gated):

- `/admin/login`
- `/admin/workshop-signups` — work the parent signup inbox (toggle contacted/paid, notes, delete)
- `/admin/summer-camp` — Summer Camp roster, grouped by grade level
- `/admin/stem-program` — STEM Program roster, grouped by grade level

API:

```
GET    /api/health                       no-auth, returns {status:"ok"}
POST   /api/auth/login                   {email,password} -> sets saha_session cookie
POST   /api/auth/logout                  clears cookie
GET    /api/auth/me                      [auth] -> {user}
POST   /api/contact                      public, rate-limited; sends email
POST   /api/workshop-signups             public, rate-limited; saves row + emails admin
GET    /api/workshop-signups             [auth] list
PATCH  /api/workshop-signups/:id         [auth] update
DELETE /api/workshop-signups/:id         [auth] delete
GET    /api/summer-camp                  [auth] list students in summer_camp program
POST   /api/summer-camp                  [auth] add
PATCH  /api/summer-camp/:id              [auth] update
DELETE /api/summer-camp/:id              [auth] delete
GET    /api/stem-program                 same shape, scoped to stem_program
POST   /api/stem-program
PATCH  /api/stem-program/:id
DELETE /api/stem-program/:id
```

## Environment variables

See [`.env.example`](.env.example) for the canonical list. Required at runtime:

- `DATABASE_URL` — Postgres connection string. Railway provides this automatically.
- `JWT_SECRET` — 32+ char random string. Generate with `openssl rand -hex 48`.
- `ADMIN_EMAIL` — login email for the shared admin account.
- `ADMIN_PASSWORD` — only read at boot. Used to seed or rotate the bcrypt hash in the
  `users` table. Safe to remove from the Railway env after first deploy; the hash
  persists in the DB.
- **Teacher accounts** (for the scheduling module) — numbered, seeded at boot. Add as
  many as you have teachers; seeding loops `TEACHER1_*`, `TEACHER2_*`, … and stops at
  the first missing `TEACHERn_USERNAME`. Like `ADMIN_PASSWORD`, the passwords are only
  read at boot to seed/rotate the bcrypt hash, then can be removed from the env.
  - `TEACHERn_USERNAME` — login username for teacher _n_ (required to seed that teacher).
  - `TEACHERn_PASSWORD` — login password for teacher _n_ (required).
  - `TEACHERn_NAME` — display name shown on the calendar. Optional; defaults to the username.
  - `TEACHERn_COLOR` — hex colour for that teacher's blocks. Optional; defaults to a
    colour from the built-in palette by index.
- `RESEND_API_KEY` — for the contact form and admin signup notifications.
- `CONTACT_EMAIL` — where contact form submissions and admin signup notifications go.
- `SITE_ORIGIN` — used in admin-notification email links. Defaults to the prod URL.
- `PORT` — Railway sets this automatically. Don't set in production.

## Deploying to Railway

1. Create a new service on Railway pointing at this repo.
2. Add the **PostgreSQL** plugin to the project. `DATABASE_URL` is injected automatically.
3. Set the remaining env vars listed above in the service's variables tab.
4. **Build command:** `npm run build`
5. **Start command:** `npm start`
6. First boot will run migrations (`drizzle/migrations/*.sql`), seed the admin user
   from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, and seed any teacher accounts from the
   `TEACHERn_*` vars. Seeding is idempotent — re-running rotates passwords and refreshes
   names/colours without creating duplicates.
7. Once the admin is seeded you can delete `ADMIN_PASSWORD` from Railway — the hash is
   in the DB. Re-set it later to rotate the admin password.

## Notes on a few intentional decisions

- **No frontend TypeScript.** The existing Vue codebase is plain JS; the new backend is
  TS. Don't migrate the frontend just for consistency — the value isn't there.
- **`tsx` in production.** No `tsc` compile step; we run TypeScript directly. Faster
  deploys, simpler config, no dual-publish drift. The trade-off is a tiny startup tax.
- **Single `students` table with a `program` enum**, not two tables. The two programs
  share 95% of their shape; an enum is cheaper than diverging schemas.
- **Manual paid toggle, not Stripe.** Anila collects Zelle / cash off-platform. The
  dashboard's job is to *track* what she's already collected, not to collect it.
- **Optimistic updates in the admin UI.** PATCH calls apply locally first and roll back
  on error. The admin is the only writer so race conditions aren't a concern.
- **Workshop list left empty on purpose.** `src/views/SignupView.vue` has `WORKSHOPS = []`
  and a "coming soon" notice. The 11 workshop names will land later — see `NEXT-STEPS.md`.
