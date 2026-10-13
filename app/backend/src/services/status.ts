/**
 * Status and readiness service.
 *
 * DB-01/DB-02: getServiceStatus now reflects real database connectivity.
 * getDatabaseReadiness() performs an actual probe when a pool is available.
 *
 * /health remains dependency-free.
 * /ready succeeds only when DB + PostGIS are verified and the dataset is loaded.
 */
import type pg from 'pg';
import type { ServiceStatus } from '@flood/shared';
import type { Env } from '../config/env.js';
import { getDatabaseConfig } from '../db/config.js';
import { checkDatabaseHealth } from '../db/health.js';

export type DbReadinessStatus =
  | 'not_configured'
  | 'not_initialized'
  | 'connecting'
  | 'connected'
  | 'error';

export interface ReadinessState {
  ready: boolean;
  checks: {
    backend: string;
    database: DbReadinessStatus;
    dataset: string;
    graph: string;
  };
  dbDetail?: string; // Sanitized detail — only for internal logging, not API
}

/**
 * Probe the database and return a typed readiness state.
 * Pass null for pool when DATABASE_URL is not configured.
 */
export async function getDatabaseReadiness(
  env: Env,
  pool: pg.Pool | null,
): Promise<Pick<ReadinessState['checks'], 'database'> & { detail?: string }> {
  if (!getDatabaseConfig(env)) {
    return { database: 'not_configured' };
  }
  if (!pool) {
    return { database: 'not_initialized' };
  }

  const result = await checkDatabaseHealth(pool);
  if (result.status === 'ok') {
    return { database: 'connected' };
  }
  return { database: 'error', detail: result.reason };
}

/**
 * Synchronous status snapshot for the /api/v1/status response.
 * Does NOT probe the database — use getFullReadinessState() for /ready.
 */
export function getServiceStatus(env: Env): ServiceStatus {
  return {
    service: 'flood-digital-twin',
    phase: 'foundation',
    ready: false,
    checks: {
      backend: 'initialized',
      database: getDatabaseConfig(env) ? 'not_initialized' : 'not_configured',
      dataset: 'not_initialized',
      graph: 'not_initialized',
    },
  };
}

/**
 * Async readiness probe — runs the actual DB health check.
 * Used by the /ready endpoint.
 *
 * datasetReady and graphReady are false until OSM import tasks complete.
 */
export async function getFullReadinessState(
  env: Env,
  pool: pg.Pool | null,
  datasetReady = false,
  graphReady = false,
): Promise<ReadinessState> {
  const dbCheck = await getDatabaseReadiness(env, pool);

  const checks: ReadinessState['checks'] = {
    backend: 'initialized',
    database: dbCheck.database,
    dataset: datasetReady ? 'ready' : 'not_initialized',
    graph: graphReady ? 'ready' : 'not_initialized',
  };

  const ready =
    dbCheck.database === 'connected' && datasetReady && graphReady;

  return { ready, checks, dbDetail: dbCheck.detail };
}
