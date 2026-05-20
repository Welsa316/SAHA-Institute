import type { Config } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.warn('[drizzle.config] DATABASE_URL not set — migrations/introspection will fail until it is provided.')
}

export default {
  schema: './server/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl ?? '',
  },
  strict: true,
  verbose: true,
} satisfies Config
