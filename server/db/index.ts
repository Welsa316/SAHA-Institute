import pg from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'
import { logger } from '../lib/log.js'

// Lazy DB connection. We don't want the whole server to crash at import time if
// DATABASE_URL is missing — the boot script logs a warning and routes that touch
// the DB will fail with a clear 500 instead of preventing the process from starting.

let _pool: pg.Pool | null = null
let _db: NodePgDatabase<typeof schema> | null = null

function init(): { pool: pg.Pool; db: NodePgDatabase<typeof schema> } {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      '[db] DATABASE_URL is not set. Provision a Postgres database on Railway (or set DATABASE_URL locally) before using DB-backed endpoints.',
    )
  }

  // Railway's managed Postgres requires TLS but uses a self-signed cert chain in some regions.
  // The connection is still encrypted and only reaches Railway's internal network.
  const isRailway = databaseUrl.includes('railway')
  const ssl = isRailway || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl,
    max: 10,
    idleTimeoutMillis: 30_000,
  })

  pool.on('error', (err) => {
    // Don't crash the process on idle-client errors — pg will recover and the next
    // request will get a fresh client.
    logger.error('db', 'idle client error', { message: err.message })
  })

  return { pool, db: drizzle(pool, { schema }) }
}

function getPool(): pg.Pool {
  if (!_pool) {
    const { pool, db } = init()
    _pool = pool
    _db = db
  }
  return _pool
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    const { pool, db } = init()
    _pool = pool
    _db = db
  }
  return _db
}

// Public exports use Proxy so call sites can keep `db.select()...` syntax without
// caring about init order. Each property access lazily initializes the pool.
export const pool = new Proxy({} as pg.Pool, {
  get(_, prop) {
    return Reflect.get(getPool(), prop)
  },
}) as pg.Pool

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop)
  },
}) as NodePgDatabase<typeof schema>

export { schema }
export type DB = typeof db
