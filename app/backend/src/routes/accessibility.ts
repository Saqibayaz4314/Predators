import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { uuidSchema, shelterRequestSchema, analysisRequestSchema } from '@flood/shared';
import type { Env } from '../config/env.js';
import { listShelterCandidates, evaluateShelters } from '../modules/shelters/shelterService.js';
import { compareScenarios } from '../modules/analysis/comparisonService.js';

export async function registerAccessibilityRoutes(app: FastifyInstance, pool: pg.Pool, env: Env) {
  app.get<{ Params: { id: string } }>('/study-areas/:id/shelters', async (request) => {
    const id = uuidSchema.parse(request.params.id);
    const data = await listShelterCandidates(pool, env, id);
    return { success: true, data, meta: { requestId: request.id, datasetVersion: data.datasetVersion } };
  });
  app.post('/shelters/reachability', async (request) => {
    const data = await evaluateShelters(pool, env, shelterRequestSchema.parse(request.body));
    return { success: true, data, meta: { requestId: request.id, datasetVersion: data.datasetVersion } };
  });
  app.post('/analysis/compare', async (request) => {
    const data = await compareScenarios(pool, env, analysisRequestSchema.parse(request.body));
    return { success: true, data, meta: { requestId: request.id, datasetVersion: data.datasetVersion } };
  });
}
