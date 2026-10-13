/**
 * API-013 — study-area summary integration tests (SELECT-only).
 *
 * These tests require DATABASE_URL (loaded from app/backend/.env) and are
 * SKIPPED otherwise. They use only SELECT queries — no INSERT/UPDATE/DELETE,
 * no DROP, no migration changes, and no writes to production tables.
 */
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { studyAreaSummaryDataSchema } from '@flood/shared';

const envPath = resolve(fileURLToPath(import.meta.url), '../../.env');
loadDotenv({ path: envPath, override: false });

import { parseEnv } from '../src/config/env.js';
import { getPool, closePool, _resetPoolForTests } from '../src/db/connection.js';
import { buildApp } from '../src/app.js';
import { STUDY_AREA_ID } from '../src/modules/routing/routeService.js';

const databaseUrl = process.env['DATABASE_URL'];
const runIntegration = Boolean(databaseUrl);

describe.skipIf(!runIntegration)('API-013 study-area summary (SELECT-only)', () => {
  let pool: Awaited<ReturnType<typeof getPool>> | null = null;

  beforeAll(() => {
    _resetPoolForTests();
    if (!runIntegration) return;
    const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl });
    pool = getPool(env);
  });

  afterAll(async () => {
    await closePool();
    _resetPoolForTests();
  });

  it('returns live dataset counts validated by the shared contract schema', async () => {
    const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl });
    const app = buildApp(env, pool!);
    const response = await app.inject({ method: 'GET', url: `/api/v1/study-areas/${STUDY_AREA_ID}/summary` });
    await app.close();

    expect(response.statusCode).toBe(200);
    const body = response.json<{ data: unknown }>();
    const data = studyAreaSummaryDataSchema.parse(body.data);

    // Cross-check every count against direct SQL — no hardcoded metrics.
    const direct = await pool!.query(
      `SELECT
        (SELECT COUNT(*) FROM road_nodes WHERE study_area_id = $1::uuid)::int AS nodes,
        (SELECT COUNT(*) FROM road_edges WHERE study_area_id = $1::uuid AND is_routable)::int AS arcs,
        (SELECT COUNT(DISTINCT physical_segment_id) FROM road_edges WHERE study_area_id = $1::uuid AND is_routable)::int AS segments,
        (SELECT COUNT(*) FROM shelters WHERE study_area_id = $1::uuid)::int AS shelters,
        (SELECT COUNT(*) FROM flood_scenarios WHERE study_area_id = $1::uuid AND is_active)::int AS scenarios`,
      [STUDY_AREA_ID],
    );
    const row = direct.rows[0]!;
    expect(data.studyAreaId).toBe(STUDY_AREA_ID);
    expect(data.dataStatus).toBe('ready');
    expect(data.totalGraphNodes).toBe(row.nodes);
    expect(data.totalDirectedArcs).toBe(row.arcs);
    expect(data.totalPhysicalRoadSegments).toBe(row.segments);
    expect(data.totalShelterCandidates).toBe(row.shelters);
    expect(data.totalSimulatedScenarios).toBe(row.scenarios);
    // Structural invariants of a directed graph with deduplicated segments.
    expect(data.totalGraphNodes).toBeGreaterThan(0);
    expect(data.totalDirectedArcs).toBeGreaterThanOrEqual(data.totalPhysicalRoadSegments);
  });

  it('rejects a malformed id with 400 INVALID_STUDY_AREA_ID', async () => {
    const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl });
    const app = buildApp(env, pool!);
    const response = await app.inject({ method: 'GET', url: '/api/v1/study-areas/not-a-uuid/summary' });
    await app.close();

    expect(response.statusCode).toBe(400);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('INVALID_STUDY_AREA_ID');
  });

  it('returns 404 STUDY_AREA_NOT_FOUND for an unknown study area', async () => {
    const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl });
    const app = buildApp(env, pool!);
    const response = await app.inject({ method: 'GET', url: '/api/v1/study-areas/9a0c29ee-1c3b-4a2e-9f14-63d2a1f8b3c7/summary' });
    await app.close();

    expect(response.statusCode).toBe(404);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('STUDY_AREA_NOT_FOUND');
  });
});
