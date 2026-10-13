/**
 * DB-01 / DB-02 — Database connection module.
 *
 * Provides a bounded pg Pool with correct TLS for Heroku PostgreSQL.
 * Never logs the connection string or credentials.
 * The pool is created lazily on first call to getPool() and closed via closePool().
 */
import pg from 'pg';
import { rdsCertificateAuthorities } from './rds-ca.js';
import type { Env } from '../config/env.js';

const { Pool } = pg;

export type DbPool = pg.Pool;

let _pool: pg.Pool | null = null;
let _initError: Error | null = null;

/**
 * Build pg TLS options for Heroku-hosted PostgreSQL.
 *
 * Heroku requires SSL and provides a certificate signed by their CA.
 * Trust Amazon's published RDS CA bundle for RDS endpoints. Other endpoints use
 * the platform trust store or an explicit DATABASE_CA_CERT. Never bypass TLS.
 */
export function databasePoolConfig(connectionString: string): pg.PoolConfig {
  const url = new URL(connectionString);
  // pg URL SSL parameters override the explicit TLS object. Always enforce
  // certificate-chain AND hostname verification, including sslmode=require URLs.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  const ca = process.env.DATABASE_CA_CERT || (url.hostname.endsWith('.rds.amazonaws.com')
    ? rdsCertificateAuthorities
    : undefined);
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: false,
  };
}

/**
 * Create a new connection pool from the given DATABASE_URL.
 * Connection pool is sized conservatively for a limited hosted database.
 */
function createPool(connectionString: string): pg.Pool {
  return new Pool(databasePoolConfig(connectionString));
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
      console.error('[db] Pool client error');
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
