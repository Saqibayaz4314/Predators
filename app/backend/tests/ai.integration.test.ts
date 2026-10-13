/**
 * AI-01 / API-11 — read-only integration tests.
 *
 * These tests require DATABASE_URL (loaded from app/backend/.env) and are
 * SKIPPED otherwise. They use only SELECT queries through the existing
 * repositories — no INSERT/UPDATE/DELETE, no DROP, no migration changes,
 * and no writes to production tables.
 *
 * The AI provider key is intentionally NOT configured here, so the
 * explanation endpoint must return the deterministic fallback.
 */
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const envPath = resolve(fileURLToPath(import.meta.url), '../../.env');
loadDotenv({ path: envPath, override: false });

import { parseEnv } from '../src/config/env.js';
import { getPool, closePool, _resetPoolForTests } from '../src/db/connection.js';
import { buildApp } from '../src/app.js';
import { STUDY_AREA_ID } from '../src/modules/routing/routeService.js';

const databaseUrl = process.env['DATABASE_URL'];
const runIntegration = Boolean(databaseUrl);

describe.skipIf(!runIntegration)('AI explanation and provenance integration (SELECT-only)', () => {
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

  it('AI-01: /api/v1/ai/explain returns deterministic fallback without a provider key', async () => {
    const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl });
    const app = buildApp(env, pool!);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/explain',
      payload: { studyAreaId: STUDY_AREA_ID, scenarioId: 'baseline', language: 'en' },
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      data: { title: string; summary: string; observations: string[]; limitations: string[]; language: string; source: string; classification: string };
    }>();
    expect(body.data.source).toBe('deterministic_fallback');
    expect(body.data.classification).toBe('simulated');
    expect(body.data.observations.length).toBeGreaterThanOrEqual(1);
    expect(body.data.observations[0]).toMatch(/\d+ of \d+ modeled road segments/);
    expect(body.data.limitations.join(' ')).toMatch(/simulated, not forecasts/i);
    // No credentials or provider internals in the response
    expect(response.body).not.toContain('password');
    expect(response.body).not.toContain('api_key');
  });

  it('AI-01: unknown scenario id returns 404 SCENARIO_NOT_FOUND', async () => {
    const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl });
    const app = buildApp(env, pool!);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/explain',
      payload: {
        studyAreaId: STUDY_AREA_ID,
        scenarioId: '9a0c29ee-1c3b-4a2e-9f14-63d2a1f8b3c7',
        language: 'en',
      },
    });
    await app.close();

    expect(response.statusCode).toBe(404);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('SCENARIO_NOT_FOUND');
  });

  it('AI-01: malformed request body returns 400 VALIDATION_ERROR', async () => {
    const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl });
    const app = buildApp(env, pool!);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/explain',
      payload: { studyAreaId: 'not-a-uuid', scenarioId: 'baseline', language: 'en' },
    });
    await app.close();

    expect(response.statusCode).toBe(400);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('API-11: /api/v1/data/provenance returns real dataset provenance', async () => {
    const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl });
    const app = buildApp(env, pool!);
    const response = await app.inject({ method: 'GET', url: '/api/v1/data/provenance' });
    await app.close();

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      data: {
        studyAreaId: string;
        datasetVersion: string;
        osmSource: string;
        osmLicense: string;
        retrievedAt: string | null;
        importedAt: string;
        floodScenarioClassification: string;
        roadRoutingLimitations: string[];
        shelterDataLimitations: string[];
        attribution: string[];
      };
    }>();
    expect(body.data.studyAreaId).toBe(STUDY_AREA_ID);
    expect(body.data.datasetVersion).toBe('sukkur-osm-2026-10-v1');
    expect(body.data.osmSource.length).toBeGreaterThan(0);
    expect(body.data.osmLicense).toBe('ODbL');
    expect(body.data.floodScenarioClassification).toBe('simulated');
    expect(body.data.roadRoutingLimitations.length).toBeGreaterThanOrEqual(3);
    expect(body.data.shelterDataLimitations.length).toBeGreaterThanOrEqual(2);
    expect(body.data.attribution.length).toBeGreaterThanOrEqual(2);
    // No credentials in the response
    expect(response.body).not.toContain('password');
  });
});
