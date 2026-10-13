import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { getServiceStatus } from '../services/status.js';

export async function registerStatusRoutes(app: FastifyInstance, env: Env) {
  app.get('/health', async (request) => ({
    success: true, data: { status: 'ok' }, meta: { requestId: request.id },
  }));
  app.get('/ready', async (request, reply) => reply.code(503).send({
    success: false,
    error: {
      code: 'SERVICE_NOT_READY', message: 'Required analysis dependencies are not initialized.',
      details: { checks: getServiceStatus(env).checks },
    },
    meta: { requestId: request.id },
  }));
  await app.register(async (api) => {
    api.get('/status', async (request) => ({
      success: true, data: getServiceStatus(env), meta: { requestId: request.id },
    }));
  }, { prefix: '/api/v1' });
}
