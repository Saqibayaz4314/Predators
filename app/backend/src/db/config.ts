/**
 * DB-01 — Database configuration.
 *
 * Provides a sanitized connection config object from the validated environment.
 * Configuration alone does not prove connectivity — see DB health check.
 *
 * Never log or expose the DATABASE_URL or any derived credentials.
 */
import type { Env } from '../config/env.js';

export interface DatabaseConfig {
  connectionString: string;
}

/**
 * Return database configuration if DATABASE_URL is set, or null if unconfigured.
 * Does not attempt a connection — call getPool() from connection.ts for that.
 */
export function getDatabaseConfig(env: Env): DatabaseConfig | null {
  if (!env.DATABASE_URL) return null;
  return { connectionString: env.DATABASE_URL };
}
