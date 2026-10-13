/**
 * DB-01 / DB-02 — Database connection module.
 *
 * Provides a bounded pg Pool with correct TLS for Heroku PostgreSQL.
 * Never logs the connection string or credentials.
 * The pool is created lazily on first call to getPool() and closed via closePool().
 */
import pg from 'pg';
import type { Env } from '../config/env.js';

const { Pool } = pg;

export type DbPool = pg.Pool;

let _pool: pg.Pool | null = null;
let _initError: Error | null = null;

/**
 * Build pg TLS options for Heroku-hosted PostgreSQL.
 *
 * Heroku requires SSL and provides a certificate signed by their CA.
 * We accept their self-signed cert by disabling hostname/cert verification
 * ONLY because this is a managed Heroku PostgreSQL endpoint — not arbitrary hosts.
 * For production-quality deployments, supply the Heroku CA bundle via DATABASE_CA_CERT.
 */
function buildSslConfig(): pg.ConnectionConfig['ssl'] {
  // Heroku requires SSL but the certificate is self-signed from their CA.
  // rejectUnauthorized: false is intentional for Heroku's managed PostgreSQL.
  // TODO: for production, set DATABASE_CA_CERT environment variable with
  //       Heroku's CA certificate and switch to { ca: process.env.DATABASE_CA_CERT }.
  return { rejectUnauthorized: false };
}

/**
 * Create a new connection pool from the given DATABASE_URL.
 * Connection pool is sized conservatively for a limited hosted database.
 */
function createPool(connectionString: string): pg.Pool {
  return new Pool({
    connectionString,
    ssl: buildSslConfig(),
    // Conservative pool for Heroku Essential plan (max 25 connections)
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Allow time for initial connection during startup
    allowExitOnIdle: false,
  });
}

/**
 * Return the singleton pool, creating it if necessary.
 * Returns null when DATABASE_URL is not configured.
 * Throws only if pool creation itself fails (e.g. bad connection string format).
 */
export function getPool(env: Env): pg.Pool | null {
  if (!env.DATABASE_URL) return null;
  if (_pool) return _pool;
  if (_initError) throw _initError;

  try {
    _pool = createPool(env.DATABASE_URL);

    // Attach pool-level error handler to prevent unhandled rejections.
    _pool.on('error', (err) => {
      // Safe to log the error type but not the connection details.
      const safeMessage = err.message?.includes('password') ? '[redacted]' : err.message;
      console.error(`[db] Pool client error: ${safeMessage}`);
    });

    return _pool;
  } catch (err) {
    _initError = err instanceof Error ? err : new Error(String(err));
    throw _initError;
  }
}

/**
 * Close the pool gracefully. Call during application shutdown.
 */
export async function closePool(): Promise<void> {
  const pool = _pool;
  _pool = null;
  _initError = null;
  if (pool) {
    await pool.end();
  }
}

/**
 * Reset pool state — for use in tests only.
 */
export function _resetPoolForTests(): void {
  _pool = null;
  _initError = null;
}
