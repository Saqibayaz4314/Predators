/**
 * Phase D — /ready endpoint with real DB health check.
 *
 * /health  — dependency-free, always 200 while the process is alive.
 * /ready   — 200 only when DB + PostGIS are verified and dataset/graph are loaded.
 * /api/v1/status — synchronous snapshot for frontend connectivity probing.
 *
 * Deployment note (K8s readiness probe): the graph cache loads lazily, so a
 * fresh pod would never pass a /ready probe by itself. When a pool is
 * available and the graph is not cached yet, the probe kicks off a background
 * load (getOrLoadGraph deduplicates concurrent loads), and a later probe
 * succeeds once the load completes.
 */
import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import type { Env } from '../config/env.js';
import { getServiceStatus, getFullReadinessState } from '../services/status.js';
import { getGraphCacheStatus, getOrLoadGraph } from '../routing/graphCache.js';
import { createDrizzle, getReadyDatasetVersion } from '../db/repositories.js';
import { STUDY_AREA_ID, DATASET_VERSION } from '../modules/routing/routeService.js';

export async function registerStatusRoutes(
  app: FastifyInstance,
  env: Env,
  pool: pg.Pool | null,
) {
  app.get('/health', async (request) => ({
    success: true, data: { status: 'ok' }, meta: { requestId: request.id },
  }));

  app.get('/ready', async (request, reply) => {
    let datasetReady = false;
    if (pool) {
      try {
        const db = createDrizzle(pool);
        datasetReady = (await getReadyDatasetVersion(db)) !== null;
      } catch {
        datasetReady = false; // Probe failures keep readiness false; never leak details.
      }
    }

    const graphReady = getGraphCacheStatus().loaded;

    // Self-heal: trigger the lazy graph load when dependencies exist but the
    // cache is cold. Non-blocking — this probe reports the current state and
    // a subsequent probe succeeds after the load finishes.
    if (pool && datasetReady && !graphReady) {
      void getOrLoadGraph(pool, STUDY_AREA_ID, DATASET_VERSION).catch(() => {
        // Failure is reflected in the next probe; do not crash on transient DB issues.
      });
    }

    const state = await getFullReadinessState(env, pool, datasetReady, graphReady);
    if (state.ready) {
      return reply.code(200).send({
        success: true,
        data: { status: 'ready', checks: state.checks },
        meta: { requestId: request.id },
      });
    }
    return reply.code(503).send({
      success: false,
      error: {
        code: 'SERVICE_NOT_READY',
        message: 'Required analysis dependencies are not initialized.',
        details: { checks: state.checks },
      },
      meta: { requestId: request.id },
    });
  });

  await app.register(async (api) => {
    api.get('/status', async (request) => ({
      success: true, data: getServiceStatus(env), meta: { requestId: request.id },
    }));
  }, { prefix: '/api/v1' });
}
