/**
 * DB health check functions.
 *
 * Provides lightweight database connectivity and PostGIS verification
 * for the /ready endpoint and startup diagnostics.
 *
 * SECURITY: Never logs connection strings, credentials or pg error messages
 * that may include host/auth details.
 */
import type pg from 'pg';

export type DbHealthResult =
  | { status: 'ok'; postgresVersion: string; postgisVersion: string }
  | { status: 'error'; reason: string };

/**
 * Verify that the database is reachable and PostGIS is available.
 * Uses a single acquired-and-released client for isolation.
 */
export async function checkDatabaseHealth(pool: pg.Pool): Promise<DbHealthResult> {
  let client: pg.PoolClient | undefined;
  try {
    client = await pool.connect();

    // Verify basic connectivity and PostgreSQL version.
    const pgResult = await client.query<{ version: string }>(
      'SELECT version() AS version',
    );
    const pgVersion = pgResult.rows[0]?.version ?? 'unknown';

    // Verify PostGIS is installed and usable.
    // This will throw if PostGIS is not enabled.
    const postgisResult = await client.query<{ version: string }>(
      'SELECT PostGIS_Version() AS version',
    );
    const postgisVersion = postgisResult.rows[0]?.version ?? 'unknown';

    return {
      status: 'ok',
      postgresVersion: pgVersion,
      postgisVersion: postgisVersion,
    };
  } catch (err) {
    // Sanitize: never expose hostname, credentials or full pg error messages.
    const isAuthErr =
      err instanceof Error &&
      (err.message.includes('password') ||
        err.message.includes('authentication') ||
        err.message.includes('pg_hba'));
    const reason = isAuthErr
      ? 'Database authentication failed'
      : err instanceof Error
        ? categorizeDbError(err)
        : 'Unknown database error';
    return { status: 'error', reason };
  } finally {
    client?.release();
  }
}

/** Categorize a pg error without echoing sensitive connection details. */
function categorizeDbError(err: Error): string {
  const msg = err.message.toLowerCase();
  if (msg.includes('connect econnrefused') || msg.includes('enotfound')) {
    return 'Database host unreachable';
  }
  if (msg.includes('timeout')) {
    return 'Database connection timed out';
  }
  if (msg.includes('ssl')) {
    return 'Database TLS handshake failed';
  }
  if (msg.includes('postgis_version') || msg.includes('does not exist')) {
    return 'PostGIS extension not available on this database';
  }
  // Return a generic message; avoid echoing pg's internal detail fields.
  return 'Database connectivity check failed';
}
