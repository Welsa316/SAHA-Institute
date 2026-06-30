import { eq } from 'drizzle-orm'
import { db } from './index.js'
import { users, teachers } from './schema.js'
import { hashPassword } from '../lib/auth.js'
import { logger } from '../lib/log.js'

// Seeded on every boot, idempotent. The admin is the existing shared account
// (its login identifier moved from email to username on migration 0012, value
// preserved). Teachers are seeded from numbered env vars so the count can grow
// without code changes — see seedTeachers().

// Default calendar colours, assigned by teacher index when TEACHER{n}_COLOR is
// not provided. Distinct hues that read as calendar block backgrounds.
const TEACHER_COLORS = ['#3B82C4', '#E07A5F', '#5B9279', '#9B6BB0', '#D9A441', '#4C8DA6', '#C2557B', '#7A8B3A']

// Ensure exactly one admin user exists, matching ADMIN_EMAIL (used as the
// username). On first boot the row is inserted from ADMIN_PASSWORD. On
// subsequent boots, if ADMIN_PASSWORD is set the hash is rotated to match it —
// this lets the password be changed by updating the env var and redeploying.
export async function seedAdmin(): Promise<void> {
  const username = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!username) {
    logger.warn('seed', 'ADMIN_EMAIL not set — skipping admin seed')
    return
  }

  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1)

  if (existing.length === 0) {
    if (!password) {
      logger.warn('seed', 'no admin user exists and ADMIN_PASSWORD is not set — login will be impossible until you set it and redeploy')
      return
    }
    const passwordHash = await hashPassword(password)
    await db.insert(users).values({ username, passwordHash, role: 'admin' })
    logger.info('seed', 'admin user created', { username })
    return
  }

  if (password) {
    const passwordHash = await hashPassword(password)
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.username, username))
    logger.info('seed', 'admin password rotated', { username })
  }
}

// Seed teacher accounts from TEACHER{n}_USERNAME / TEACHER{n}_PASSWORD env vars,
// for n = 1, 2, 3, … until the first gap. Each teacher gets a `teachers` row
// (name + colour) and a linked `users` row (role 'teacher'). Optional
// TEACHER{n}_NAME (defaults to the username) and TEACHER{n}_COLOR (defaults to a
// palette colour by index) customise the calendar label/colour. Idempotent:
// re-running rotates the password and refreshes name/colour, never duplicates.
export async function seedTeachers(): Promise<void> {
  for (let n = 1; ; n++) {
    const username = process.env[`TEACHER${n}_USERNAME`]
    if (!username) break // first missing index ends the list
    const password = process.env[`TEACHER${n}_PASSWORD`]
    const name = process.env[`TEACHER${n}_NAME`] || username
    const color = process.env[`TEACHER${n}_COLOR`] || TEACHER_COLORS[(n - 1) % TEACHER_COLORS.length]

    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1)

    if (existing.length > 0) {
      const u = existing[0]
      if (password) {
        await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, u.id))
      }
      if (u.teacherId) {
        await db.update(teachers).set({ name, color, updatedAt: new Date() }).where(eq(teachers.id, u.teacherId))
      }
      logger.info('seed', 'teacher refreshed', { username })
      continue
    }

    if (!password) {
      logger.warn('seed', `TEACHER${n}_USERNAME is set but TEACHER${n}_PASSWORD is not — skipping`, { username })
      continue
    }

    const [teacher] = await db.insert(teachers).values({ name, color }).returning()
    await db.insert(users).values({ username, passwordHash: await hashPassword(password), role: 'teacher', teacherId: teacher.id })
    logger.info('seed', 'teacher created', { username, teacherId: teacher.id, color })
  }
}
