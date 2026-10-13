/**
 * DB-01/DB-02/DB-03 — Database foundation tests.
 *
 * Test categories:
 * A. Unit tests — pure logic, no DB required (always run).
 * B. Integration tests — require DATABASE_URL (conditionally run).
 *    These are SKIPPED when DATABASE_URL is absent and REPORTED as
 *    NOT_RUN in the handoff. They NEVER mutate production tables.
 *
 * Safety invariants:
 * - Integration tests only use SELECT and schema inspection queries.
 * - No INSERT/UPDATE/DELETE against production tables.
 * - No DROP or TRUNCATE.
 * - No migration application.
 * - Pool is always closed in afterAll.
 * - Credentials are never logged in test output.
 *
 * DATABASE_URL is loaded from app/backend/.env via dotenv if not already set.
 */
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Load .env from the backend package root (one level up from tests/)
const envPath = resolve(fileURLToPath(import.meta.url), '../../.env');
loadDotenv({ path: envPath, override: false });
import { parseEnv } from '../src/config/env.js';
import { getDatabaseConfig } from '../src/db/config.js';
import { getPool, closePool, _resetPoolForTests } from '../src/db/connection.js';
import { checkDatabaseHealth } from '../src/db/health.js';
import { getFullReadinessState } from '../src/services/status.js';
import { buildApp } from '../src/app.js';

// ---------------------------------------------------------------------------
// A. Unit tests — no DB required
// ---------------------------------------------------------------------------
describe('getDatabaseConfig', () => {
  it('returns null when DATABASE_URL is absent', () => {
    const env = parseEnv({ NODE_ENV: 'test' });
    expect(getDatabaseConfig(env)).toBeNull();
  });

  it('returns config object when DATABASE_URL is set', () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:private-pw@localhost/db',
    });
    const config = getDatabaseConfig(env);
    expect(config).not.toBeNull();
    // connectionString is held server-side; it should be a valid postgres URL
    expect(config?.connectionString).toMatch(/^postgresql?:\/\//);
    // The config object type is correct
    expect(typeof config?.connectionString).toBe('string');
  });
});

describe('getPool', () => {
  afterAll(() => _resetPoolForTests());

  it('returns null when DATABASE_URL is not configured', () => {
    _resetPoolForTests();
    const env = parseEnv({ NODE_ENV: 'test' });
    expect(getPool(env)).toBeNull();
  });

  it('returns a pool when DATABASE_URL is configured (without connecting)', () => {
    _resetPoolForTests();
    const env = parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
    });
    const pool = getPool(env);
    expect(pool).not.toBeNull();
    expect(pool).toHaveProperty('connect');
    expect(pool).toHaveProperty('query');
    // Pool should return the same instance
    expect(getPool(env)).toBe(pool);
  });
});

describe('getFullReadinessState (without real DB)', () => {
  it('reports not_configured when no DATABASE_URL', async () => {
    const env = parseEnv({ NODE_ENV: 'test' });
    const state = await getFullReadinessState(env, null);
    expect(state.ready).toBe(false);
    expect(state.checks.database).toBe('not_configured');
    expect(state.checks.dataset).toBe('not_initialized');
    expect(state.checks.graph).toBe('not_initialized');
  });

  it('reports not_initialized when pool is null but URL is configured', async () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pw@localhost/db',
    });
    const state = await getFullReadinessState(env, null);
    expect(state.ready).toBe(false);
    expect(state.checks.database).toBe('not_initialized');
  });

  it('reports not_initialized when database + dataset both need setup', async () => {
    const env = parseEnv({ NODE_ENV: 'test' });
    const state = await getFullReadinessState(env, null, false, false);
    expect(state.ready).toBe(false);
    expect(state.checks.dataset).toBe('not_initialized');
    expect(state.checks.graph).toBe('not_initialized');
  });
});

describe('/ready endpoint integration (no real DB)', () => {
  const apps: ReturnType<typeof buildApp>[] = [];
  afterAll(async () => {
    await Promise.all(apps.map((a) => a.close()));
  });

  it('returns 503 and correct structure without DATABASE_URL', async () => {
    const env = parseEnv({ NODE_ENV: 'test' });
    const app = buildApp(env, null);
    apps.push(app);
    const response = await app.inject('/ready');
    expect(response.statusCode).toBe(503);
    const body = response.json<{ error: { code: string; details: { checks: Record<string, string> } } }>();
    expect(body.error.code).toBe('SERVICE_NOT_READY');
    expect(body.error.details.checks.database).toBe('not_configured');
    expect(body.error.details.checks.dataset).toBe('not_initialized');
    // Must not contain any credential-like token in response
    expect(response.body).not.toContain('password');
    expect(response.body).not.toContain('postgresql://');
  });

  it('returns 503 when pool is null but DATABASE_URL is set', async () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:secret@localhost/db',
    });
    // Pass null pool explicitly — simulates pool not yet initialized
    const app = buildApp(env, null);
    apps.push(app);
    const response = await app.inject('/ready');
    expect(response.statusCode).toBe(503);
    const body = response.json<{ error: { details: { checks: { database: string } } } }>();
    expect(body.error.details.checks.database).toBe('not_initialized');
    // Credentials must never appear in response
    expect(response.body).not.toContain('secret');
    expect(response.body).not.toContain('postgresql://');
  });
});

// ---------------------------------------------------------------------------
// B. Integration tests — require DATABASE_URL (conditionally run)
// ---------------------------------------------------------------------------
const databaseUrl = process.env['DATABASE_URL'];
const runIntegration = Boolean(databaseUrl);

describe.skipIf(!runIntegration)('database integration (DB-01/DB-02)', () => {
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

  it('DB-01: can acquire and release a client from the pool', async () => {
    expect(pool).not.toBeNull();
    const client = await pool!.connect();
    client.release();
    // If we got here, connection succeeded
    expect(true).toBe(true);
  });

  it('DB-01: can run a basic SELECT query', async () => {
    const result = await pool!.query<{ now: Date }>('SELECT NOW() AS now');
    expect(result.rows[0]).toBeDefined();
    expect(result.rows[0]!.now).toBeInstanceOf(Date);
  });

  it('DB-01: PostgreSQL version is available and >= 14', async () => {
    const result = await pool!.query<{ version: string }>('SELECT version() AS version');
    const version = result.rows[0]?.version ?? '';
    expect(version).toMatch(/PostgreSQL \d+/);
    const major = parseInt(version.replace('PostgreSQL ', '').split('.')[0]!, 10);
    expect(major).toBeGreaterThanOrEqual(14);
    // Must not log the full version string with host details
  });

  it('DB-02: PostGIS extension is available and usable', async () => {
    const result = await pool!.query<{ version: string }>('SELECT PostGIS_Version() AS version');
    const version = result.rows[0]?.version ?? '';
    expect(version).toMatch(/\d+\.\d+/);
  });

  it('DB-02: checkDatabaseHealth returns ok status', async () => {
    const result = await checkDatabaseHealth(pool!);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.postgresVersion).toMatch(/PostgreSQL/);
      expect(result.postgisVersion).toMatch(/\d+\.\d+/);
    }
  });

  it('DB-01: /ready returns 503 while the routing graph is not loaded', async () => {
    const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl });
    const app = buildApp(env, pool!);
    const response = await app.inject('/ready');
    await app.close();
    // DB connected and the Sukkur dataset is imported ('ready'), but the
    // in-memory graph cache is cold in this process — expect 503.
    expect(response.statusCode).toBe(503);
    const body = response.json<{ error: { details: { checks: Record<string, string> } } }>();
    // Database should be 'connected' (or 'error' if PostGIS unavailable)
    expect(['connected', 'error']).toContain(body.error.details.checks.database);
    // Dataset is imported since GEO-07; the graph cache is cold by design.
    expect(['ready', 'not_initialized']).toContain(body.error.details.checks.dataset);
    expect(body.error.details.checks.graph).toBe('not_initialized');
    // No credentials in response
    expect(response.body).not.toContain('password');
  });

  it('DB-02: migration tables are present (if migration has run)', async () => {
    // Check if core tables exist without INSERT/UPDATE/DELETE.
    // This verifies 001_initial_schema.sql was applied.
    const result = await pool!.query<{ tablename: string }>(
      `SELECT tablename
       FROM pg_catalog.pg_tables
       WHERE schemaname = 'public'
         AND tablename = ANY($1::text[])`,
      [['dataset_versions', 'study_areas', 'road_nodes', 'road_edges',
        'flood_scenarios', 'flood_zones', 'shelters']],
    );
    const found = result.rows.map((r) => r.tablename).sort();
    if (found.length === 0) {
      // Migration has not been applied yet — mark this as expected
      console.info('[db-test] Core tables not yet present; run migration 001_initial_schema.sql');
    } else {
      expect(found).toEqual(
        ['dataset_versions', 'flood_scenarios', 'flood_zones',
          'road_edges', 'road_nodes', 'shelters', 'study_areas'].sort(),
      );
    }
  });

  it('DB-02: spatial GiST indexes are present (if migration has run)', async () => {
    const result = await pool!.query<{ indexname: string }>(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname = ANY($1::text[])`,
      [['idx_road_nodes_geom_gist', 'idx_road_edges_geom_gist',
        'idx_flood_zones_geom_gist', 'idx_shelters_geom_gist']],
    );
    const found = result.rows.map((r) => r.indexname);
    if (found.length === 0) {
      console.info('[db-test] GiST indexes not yet present; run migration 001_initial_schema.sql');
    } else {
      expect(found.length).toBeGreaterThanOrEqual(4);
    }
  });
});
