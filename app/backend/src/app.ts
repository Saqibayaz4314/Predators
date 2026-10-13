import { randomUUID } from 'node:crypto';
import Fastify, { LogController } from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import type { Env } from './config/env.js';
import { registerStatusRoutes } from './routes/status.js';

export function buildApp(env: Env) {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: env.LOG_LEVEL },
    logController: new LogController({ disableRequestLogging: true }),
    genReqId: () => randomUUID(),
    bodyLimit: 1_048_576,
  });
  app.addHook('onResponse', async (request, reply) => {
    request.log.info({ method: request.method, route: request.routeOptions.url, statusCode: reply.statusCode }, 'Request completed');
  });
  app.setErrorHandler((error, request, reply) => {
    const validation = error instanceof ZodError || (error instanceof Error && 'validation' in error);
    const statusCode = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    const status = validation ? 400 : statusCode >= 400 && statusCode < 500 ? statusCode : 500;
    // Do not log raw errors: database errors and malformed input may contain secrets.
    request.log.error({ statusCode: status }, 'Request failed');
    return reply.code(status).send({
      success: false,
      error: {
        code: validation ? 'VALIDATION_ERROR' : status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        message: status >= 500 ? 'An unexpected server error occurred.' : 'The request could not be processed.',
      },
      meta: { requestId: request.id },
    });
  });
  app.setNotFoundHandler((request, reply) => reply.code(404).send({
    success: false, error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
    meta: { requestId: request.id },
  }));
  app.register(cors, { origin: env.CORS_ORIGIN });
  app.register(async (instance) => registerStatusRoutes(instance, env));
  return app;
}
