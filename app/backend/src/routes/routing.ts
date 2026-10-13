/**
 * Routing API routes
 *
 * POST /api/v1/routing/snap     — API-008 snap map point to graph node
 * POST /api/v1/routing/route    — API-009 calculate single route
 * POST /api/v1/routing/compare  — API-010 compare baseline vs scenario
 *
 * All requests validated with Zod. All responses use the shared envelope.
 * No SQL in this file. No routing algorithms in this file.
 * Pool must be non-null (checked at startup).
 */

import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { snapRequestSchema as SnapRequestSchema, routeRequestSchema as RouteRequestSchema, compareRequestSchema as CompareRequestSchema } from '@flood/shared';
import {
  snapPoint,
  calculateRoute,
  compareScenarioRoute,
} from '../modules/routing/routeService.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function registerRoutingRoutes(
  app: FastifyInstance,
  pool: pg.Pool,
): Promise<void> {
  // --- POST /api/v1/routing/snap -------------------------------------------
  app.post('/routing/snap', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = SnapRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      // API-008 documents 400 INVALID_COORDINATES for invalid map points.
      // Report an invalid study-area UUID with its own registry code.
      const invalidFields = new Set(parsed.error.issues.map((issue) => issue.path[0]));
      const pointInvalid = invalidFields.has('point') || invalidFields.size === 0;
      return reply.code(400).send({
        success: false,
        error: {
          code: pointInvalid ? 'INVALID_COORDINATES' : 'INVALID_STUDY_AREA_ID',
          message: pointInvalid ? 'The map point is invalid.' : 'Study area ID must be a valid UUID.',
          details: parsed.error.flatten(),
        },
        meta: { requestId: request.id },
      });
    }
    const { studyAreaId, point } = parsed.data;
    const result = await snapPoint(pool, {
      studyAreaId,
      longitude: point.longitude,
      latitude:  point.latitude,
    });
    return reply.code(200).send({
      success: true,
      data: result,
      meta: { requestId: request.id, datasetVersion: result.datasetVersion, computedAt: new Date().toISOString() },
    });
  });

  // --- POST /api/v1/routing/route ------------------------------------------
  app.post('/routing/route', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = RouteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_ROUTE_REQUEST', message: 'Invalid request body.', details: parsed.error.flatten() },
        meta: { requestId: request.id },
      });
    }
    const result = await calculateRoute(pool, parsed.data);
    return reply.code(200).send({
      success: true,
      data: result,
      meta: { requestId: request.id, datasetVersion: result.datasetVersion, computedAt: new Date().toISOString() },
    });
  });

  // --- POST /api/v1/routing/compare ----------------------------------------
  app.post('/routing/compare', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = CompareRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_ROUTE_REQUEST', message: 'Invalid request body.', details: parsed.error.flatten() },
        meta: { requestId: request.id },
      });
    }
    const result = await compareScenarioRoute(pool, parsed.data);
    return reply.code(200).send({
      success: true,
      data: result,
      meta: { requestId: request.id, datasetVersion: result.datasetVersion, computedAt: new Date().toISOString() },
    });
  });
}
