import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import type { Env } from '../config/env.js';
import { generateScenarioExplanation } from '../modules/ai/ai.service.js';
import { aiExplainRequestSchema } from '../modules/ai/ai.schemas.js';

export async function registerAiRoutes(app: FastifyInstance, pool: pg.Pool, env: Env) {
  // Strictest limit in the API: each call may hit a paid inference provider
  // and always runs graph + PostGIS + Dijkstra analysis first.
  app.post('/ai/explain', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = aiExplainRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      // API-015 documents 400 INVALID_AI_REQUEST for malformed bodies.
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_AI_REQUEST', message: 'Invalid AI request.', details: parsed.error.flatten() },
        meta: { requestId: request.id },
      });
    }
    const data = await generateScenarioExplanation(pool, env, parsed.data);
    return { success: true, data, meta: { requestId: request.id } };
  });
}
