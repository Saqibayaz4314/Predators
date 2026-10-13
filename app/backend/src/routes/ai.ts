import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import type { Env } from '../config/env.js';
import { generateScenarioExplanation } from '../modules/ai/ai.service.js';
import { aiExplainRequestSchema } from '../modules/ai/ai.schemas.js';

export async function registerAiRoutes(app: FastifyInstance, pool: pg.Pool, env: Env) {
  app.post('/ai/explain', async (request) => {
    const input = aiExplainRequestSchema.parse(request.body);
    const data = await generateScenarioExplanation(pool, env, input);
    return { success: true, data, meta: { requestId: request.id } };
  });
}
