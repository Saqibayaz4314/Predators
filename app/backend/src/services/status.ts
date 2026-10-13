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
 * Status snapshot for the /api/v1/status response.
 *
 * By default this returns the foundation-era stub (no probing). Pass
 * overrides to report real dependency state; the route computes those from
 * the same probes used by /ready. `ready` is true only when database,
 * dataset and graph are all available.
 */
export function getServiceStatus(
  env: Env,
  overrides?: { database?: DbReadinessStatus; dataset?: string; graph?: string },
): ServiceStatus {
  const database = overrides?.database ?? (getDatabaseConfig(env) ? 'not_initialized' : 'not_configured');
  const dataset = overrides?.dataset === 'ready' ? 'ready' : 'not_initialized';
  const graph = overrides?.graph === 'ready' ? 'ready' : 'not_initialized';

  const ready = database === 'connected' && dataset === 'ready' && graph === 'ready';

  return {
    service: 'flood-digital-twin',
    phase: ready ? 'operational' : 'foundation',
    ready,
    checks: {
      backend: 'initialized',
      database,
      dataset,
      graph,
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
