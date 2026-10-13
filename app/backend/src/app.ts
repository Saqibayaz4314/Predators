import { randomUUID } from 'node:crypto';
import Fastify, { LogController } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import type { Env } from './config/env.js';
import type pg from 'pg';
import { registerStatusRoutes } from './routes/status.js';
import { registerRoutingRoutes } from './routes/routing.js';
import { registerScenarioRoutes } from './routes/scenarios.js';
import { registerStudyAreaRoutes } from './routes/studyAreas.js';
import { registerAccessibilityRoutes } from './routes/accessibility.js';
import { registerAiRoutes } from './routes/ai.js';
import { registerDataRoutes } from './routes/data.js';

/**
 * Error codes documented in the API contract error registry
 * (docs/10-API-CONTRACT.md §18), plus SERVICE_NOT_READY from /ready.
 *
 * Only these authored domain codes are allowed through the error handler with
 * their own status, code and message. Any other error — framework errors
 * (FST_*), database driver errors (pg 28P01, ECONNREFUSED, ...), unexpected
 * exceptions — is sanitized to a generic envelope so internal details never
 * reach clients. A whitelist (not a pattern) is required because driver codes
 * such as ECONNREFUSED also match uppercase-code shapes, and their messages
 * can contain connection details.
 */
const DOMAIN_ERROR_CODES = new Set([
  'SERVICE_NOT_READY',
  'INVALID_STUDY_AREA_ID',
  'STUDY_AREA_NOT_FOUND',
  'DATASET_NOT_READY',
  'INVALID_SCENARIO_ID',
  'SCENARIO_NOT_FOUND',
  'SCENARIO_STUDY_AREA_MISMATCH',
  'SPATIAL_ANALYSIS_UNAVAILABLE',
  'INVALID_COORDINATES',
  'NO_NEARBY_ROAD_NODE',
  'INVALID_ROUTE_REQUEST',
  'ORIGIN_NODE_NOT_FOUND',
  'DESTINATION_NODE_NOT_FOUND',
  'DATASET_VERSION_MISMATCH',
  'GRAPH_UNAVAILABLE',
  'ROUTING_UNAVAILABLE',
  'ANALYSIS_UNAVAILABLE',
  'INVALID_AI_REQUEST',
  'RATE_LIMITED',
]);

export function buildApp(env: Env, pool: pg.Pool | null = null) {
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
    const domainCode = !validation && error instanceof Error && 'code' in error
      && typeof error.code === 'string' && DOMAIN_ERROR_CODES.has(error.code)
        ? error.code : null;
    // Domain errors (e.g. 503 GRAPH_UNAVAILABLE, 503 ANALYSIS_UNAVAILABLE,
    // 404 STUDY_AREA_NOT_FOUND) keep their documented status, code and authored
    // message per the API contract; everything else is sanitized.
    const status = validation ? 400
      : domainCode && statusCode >= 400 && statusCode < 600 ? statusCode
      : statusCode >= 400 && statusCode < 500 ? statusCode : 500;
    const code = validation ? 'VALIDATION_ERROR'
      : domainCode ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
    const message = validation ? 'The request could not be processed.'
      : domainCode && error instanceof Error ? error.message
      : status >= 500 ? 'An unexpected server error occurred.' : 'The request could not be processed.';
    // Do not log raw errors: database errors and malformed input may contain secrets.
    request.log.error({ statusCode: status, errorCode: code }, 'Request failed');
    return reply.code(status).send({
      success: false,
      error: { code, message },
      meta: { requestId: request.id },
    });
  });
  app.setNotFoundHandler((request, reply) => reply.code(404).send({
    success: false, error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
    meta: { requestId: request.id },
  }));
  app.register(cors, { origin: env.CORS_ORIGIN });
  // Rate limiting is opt-in per route via `config.rateLimit` and only applied
  // to the expensive endpoints (AI explanations, routing, shelter and scenario
  // analysis) per the API contract §21 cost controls.
  //
  // Buckets are keyed by request.ip — the socket address. trustProxy is
  // deliberately NOT enabled: X-Forwarded-For / X-Real-IP are client-spoofable
  // on the NLB → nginx pass-through chain, and trusting the client-supplied XFF
  // entries would let a caller rotate fake IPs to dodge the limits. Behind the
  // frontend reverse proxy every external client therefore shares one bucket
  // per frontend pod (2 replicas ⇒ effective aggregate ≈ 2× each per-route
  // max), which is the intended conservative cost protection for this demo.
  app.register(rateLimit, {
    global: false,
    max: 300,
    timeWindow: '1 minute',
    // The plugin THROWS the builder's return value into Fastify's error
    // pipeline (its own defaultErrorResponse returns an Error carrying
    // statusCode). Returning a plain envelope object here would reach the
    // global error handler as a non-Error and be sanitized to a 500. The
    // RATE_LIMITED code is whitelisted above, so the handler preserves the
    // 429 status, code and authored message and wraps them in the standard
    // error envelope.
    errorResponseBuilder: (_request, context) =>
      Object.assign(new Error(`Too many requests. Please retry in ${context.after}.`), {
        statusCode: context.statusCode,
        code: 'RATE_LIMITED',
      }),
  });
  app.register(async (instance) => registerStatusRoutes(instance, env, pool));
  if (pool) {
    app.register(async (instance) =>
      instance.register(async (sub) => {
        await registerRoutingRoutes(sub, pool);
        await registerScenarioRoutes(sub, pool);
        await registerStudyAreaRoutes(sub, pool);
        await registerAccessibilityRoutes(sub, pool, env);
        await registerAiRoutes(sub, pool, env);
        await registerDataRoutes(sub, pool);
      }, { prefix: '/api/v1' })
    );
  }
  return app;
}
