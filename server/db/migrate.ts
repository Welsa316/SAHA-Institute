import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { logger } from '../lib/log.js'

// Apply pending Drizzle migrations at server boot. Idempotent — Drizzle tracks applied
// migrations in a metadata table, so running this on every start is safe and avoids the
// "I forgot to run migrations" footgun on Railway.

export async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('[migrate] DATABASE_URL not set.')
  }

  const ssl = databaseUrl.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false

  const client = new pg.Pool({ connectionString: databaseUrl, ssl, max: 1 })
  const db = drizzle(client)

  try {
    logger.info('migrate', 'starting')
    await migrate(db, { migrationsFolder: './drizzle/migrations' })
    logger.info('migrate', 'complete')
  } finally {
    await client.end()
  }
}
