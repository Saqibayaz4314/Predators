/**
 * Scenario API routes
 *
 * GET /api/v1/study-areas/:id/scenarios   — API-004 list scenarios
 * GET /api/v1/scenarios/:id               — API-005 scenario details
 * GET /api/v1/scenarios/:id/zones         — API-006 flood zone GeoJSON
 * GET /api/v1/scenarios/:id/impact        — API-007 road impact analysis
 *
 * All data labeled classification: "simulated".
 * No real-world flood claim is made anywhere.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { requireStudyArea } from '../modules/studyAreas.js';
import {
  getActiveScenario,
  listActiveScenarios,
  computeScenarioImpact,
} from '../modules/flood/floodService.js';

const STUDY_AREA_ID  = '020ce29e-ec4f-4514-b14f-58c1252191cc';
const DISCLAIMER =
  'This analysis is based on simulated hypothetical flood polygons and does not ' +
  'represent real-world conditions, official forecasts, or emergency guidance.';

// ---------------------------------------------------------------------------
// Flood zone geometry query
// ---------------------------------------------------------------------------

async function getFloodZones(
  pool: pg.Pool,
  scenarioId: string,
): Promise<Array<{
  id: string;
  label: string | null;
  geometry: unknown;
}>> {
  const result = await pool.query<{
    id: string;
    label: string | null;
    geojson: string;
  }>(
    `SELECT id::text, zone_label AS label,
            ST_AsGeoJSON(geom)::json AS geojson
     FROM flood_zones
     WHERE scenario_id = $1::uuid
     ORDER BY id`,
    [scenarioId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    label: r.label,
    geometry: r.geojson,
  }));
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function registerScenarioRoutes(
  app: FastifyInstance,
  pool: pg.Pool,
): Promise<void> {
  // --- GET /api/v1/study-areas/:id/scenarios --------------------------------
  app.get('/study-areas/:id/scenarios', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_STUDY_AREA_ID', message: 'Study area ID must be a valid UUID.' },
        meta: { requestId: request.id },
      });
    }
    if (id !== STUDY_AREA_ID) {
      return reply.code(404).send({
        success: false,
        error: { code: 'STUDY_AREA_NOT_FOUND', message: 'Study area not found.' },
        meta: { requestId: request.id },
      });
    }
    const { datasetVersion } = await requireStudyArea(pool, id);
    const scenarios = await listActiveScenarios(pool, STUDY_AREA_ID);
    return reply.code(200).send({
      success: true,
      data: {
        baseline: {
          id: 'baseline',
          title: 'Baseline',
          description: 'No simulated flood closures. Real road network without modifications.',
        },
        scenarios: scenarios.map((s) => ({
          id: s.id,
          slug: s.slug,
          title: s.title,
          description: s.description,
          displayOrder: s.displayOrder,
          classification: 'simulated' as const,
        })),
        datasetVersion,
      },
      meta: { requestId: request.id, datasetVersion },
    });
  });

  // --- GET /api/v1/scenarios/:id -------------------------------------------
  app.get('/scenarios/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_SCENARIO_ID', message: 'Scenario ID must be a valid UUID.' },
        meta: { requestId: request.id },
      });
    }
    const scenario = await getActiveScenario(pool, id);
    if (!scenario) {
      return reply.code(404).send({
        success: false,
        error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario not found or inactive.' },
        meta: { requestId: request.id },
      });
    }
    const zones = await getFloodZones(pool, id);
    const { datasetVersion } = await requireStudyArea(pool, scenario.studyAreaId);
    return reply.code(200).send({
      success: true,
      data: {
        id: scenario.id,
        slug: scenario.slug,
        title: scenario.title,
        description: scenario.description,
        displayOrder: scenario.displayOrder,
        classification: 'simulated' as const,
        studyAreaId: scenario.studyAreaId,
        methodology: 'PostGIS ST_Intersects against simulated flood polygon geometries. Not a real forecast.',
        revision: '1',
        zoneCount: zones.length,
        disclaimer: DISCLAIMER,
      },
      meta: { requestId: request.id, datasetVersion },
    });
  });

  // --- GET /api/v1/scenarios/:id/zones -------------------------------------
  app.get('/scenarios/:id/zones', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_SCENARIO_ID', message: 'Scenario ID must be a valid UUID.' },
        meta: { requestId: request.id },
      });
    }
    const scenario = await getActiveScenario(pool, id);
    if (!scenario) {
      return reply.code(404).send({
        success: false,
        error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario not found.' },
        meta: { requestId: request.id },
      });
    }
    const zones = await getFloodZones(pool, id);
    const featureCollection = {
      type: 'FeatureCollection' as const,
      features: zones.map((z) => ({
        type: 'Feature' as const,
        properties: {
          zoneId: z.id,
          zoneLabel: z.label,
          classification: 'simulated' as const,
        },
        geometry: z.geometry,
      })),
    };
    return reply.code(200).send({
      success: true,
      data: featureCollection,
      meta: { requestId: request.id },
    });
  });

  // --- GET /api/v1/scenarios/:id/impact ------------------------------------
  app.get('/scenarios/:id/impact', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_SCENARIO_ID', message: 'Scenario ID must be a valid UUID.' },
        meta: { requestId: request.id },
      });
    }
    const scenario = await getActiveScenario(pool, id);
    if (!scenario) {
      return reply.code(404).send({
        success: false,
        error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario not found.' },
        meta: { requestId: request.id },
      });
    }
    const { datasetVersion } = await requireStudyArea(pool, scenario.studyAreaId);
    const impact = await computeScenarioImpact(pool, id, scenario.studyAreaId, datasetVersion);
    return reply.code(200).send({
      success: true,
      data: {
        studyAreaId: impact.studyAreaId,
        scenarioId: impact.scenarioId,
        datasetVersion: impact.datasetVersion,
        scenarioRevision: '1',
        closurePolicyVersion: impact.closurePolicyVersion,
        totalPhysicalSegments: impact.totalPhysicalSegments,
        affectedPhysicalSegments: impact.affectedPhysicalSegments,
        unaffectedPhysicalSegments: impact.unaffectedPhysicalSegments,
        affectedRoadPercentage: impact.affectedRoadPercentage,
        totalDirectedArcs: impact.totalDirectedArcs,
        blockedDirectedArcs: impact.blockedDirectedArcs,
        affectedPhysicalSegmentIds: impact.affectedPhysicalSegmentIds,
        classification: impact.classification,
        disclaimer: impact.disclaimer,
        computedAt: impact.computedAt,
      },
      meta: { requestId: request.id, datasetVersion, computedAt: impact.computedAt },
    });
  });
}
