import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { uuidSchema, shelterRequestSchema, analysisRequestSchema } from '@flood/shared';
import type { Env } from '../config/env.js';
import { listShelterCandidates, evaluateShelters } from '../modules/shelters/shelterService.js';
import { compareScenarios } from '../modules/analysis/comparisonService.js';

export async function registerAccessibilityRoutes(app: FastifyInstance, pool: pg.Pool, env: Env) {
  app.get<{ Params: { id: string } }>('/study-areas/:id/shelters', async (request, reply) => {
    const { id } = request.params;
    if (!uuidSchema.safeParse(id).success) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_STUDY_AREA_ID', message: 'Study area ID must be a valid UUID.' }, meta: { requestId: request.id } });
    }
    const data = await listShelterCandidates(pool, env, id);
    return { success: true, data, meta: { requestId: request.id, datasetVersion: data.datasetVersion } };
  });
  // Single-source Dijkstra over the full graph per request.
  app.post('/shelters/reachability', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request) => {
    const data = await evaluateShelters(pool, env, shelterRequestSchema.parse(request.body));
    return { success: true, data, meta: { requestId: request.id, datasetVersion: data.datasetVersion } };
  });
  // Heaviest analysis endpoint: per-scenario impact + routes + shelter evaluation.
  app.post('/analysis/compare', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request) => {
    const data = await compareScenarios(pool, env, analysisRequestSchema.parse(request.body));
    return { success: true, data, meta: { requestId: request.id, datasetVersion: data.datasetVersion } };
  });
}
