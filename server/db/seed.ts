import { eq } from 'drizzle-orm'
import { db } from './index.js'
import { users } from './schema.js'
import { hashPassword } from '../lib/auth.js'
import { logger } from '../lib/log.js'

// Ensure exactly one admin user exists, matching ADMIN_EMAIL.
// On first boot the row is inserted from the env-var password.
// On subsequent boots, if ADMIN_PASSWORD is set the hash is rotated to match it —
// this lets the user change the password by updating the env var and redeploying.
// If ADMIN_PASSWORD is unset, we leave the existing hash alone.

export async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email) {
    logger.warn('seed', 'ADMIN_EMAIL not set — skipping admin seed')
    return
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (existing.length === 0) {
    if (!password) {
      logger.warn('seed', 'no admin user exists and ADMIN_PASSWORD is not set — login will be impossible until you set it and redeploy')
      return
    }
    const passwordHash = await hashPassword(password)
    await db.insert(users).values({ email, passwordHash })
    logger.info('seed', 'admin user created', { email })
    return
  }

  if (password) {
    const passwordHash = await hashPassword(password)
    await db.update(users).set({ passwordHash }).where(eq(users.email, email))
    logger.info('seed', 'admin password rotated', { email })
  }
}
