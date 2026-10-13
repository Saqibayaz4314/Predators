/**
 * F-02 / F-03 regression tests — error-contract preservation and rate limiting.
 *
 * No database required: the test routes throw authored domain errors directly
 * to exercise the global error handler, and a rate-limited test route
 * exercises the 429 envelope required by the API contract (§18: RATE_LIMITED).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { apiErrorSchema } from '@flood/shared';
import { buildApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

const apps: ReturnType<typeof buildApp>[] = [];
function createApp() {
  const app = buildApp(parseEnv({ NODE_ENV: 'test' }));
  apps.push(app);
  return app;
}
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

function domainError(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code });
}

describe('global error handler — documented domain errors survive to the wire', () => {
  it('preserves 503 GRAPH_UNAVAILABLE with its status, code and authored message', async () => {
    const app = createApp();
    app.get('/test/graph', () => { throw domainError(503, 'GRAPH_UNAVAILABLE', 'The requested graph dataset is unavailable.'); });
    const response = await app.inject('/test/graph');
    expect(response.statusCode).toBe(503);
    const body = apiErrorSchema.parse(response.json());
    expect(body.error.code).toBe('GRAPH_UNAVAILABLE');
    expect(body.error.message).toBe('The requested graph dataset is unavailable.');
  });

  it('preserves 503 ANALYSIS_UNAVAILABLE', async () => {
    const app = createApp();
    app.get('/test/analysis', () => { throw domainError(503, 'ANALYSIS_UNAVAILABLE', 'Analysis dataset is not available'); });
    const response = await app.inject('/test/analysis');
    expect(response.statusCode).toBe(503);
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('ANALYSIS_UNAVAILABLE');
  });

  it('preserves 4xx domain errors such as 404 STUDY_AREA_NOT_FOUND', async () => {
    const app = createApp();
    app.get('/test/missing', () => { throw domainError(404, 'STUDY_AREA_NOT_FOUND', 'Study area not found'); });
    const response = await app.inject('/test/missing');
    expect(response.statusCode).toBe(404);
    const body = apiErrorSchema.parse(response.json());
    expect(body.error.code).toBe('STUDY_AREA_NOT_FOUND');
    expect(body.error.message).toBe('Study area not found');
  });

  it('sanitizes unexpected exceptions to 500 INTERNAL_ERROR without leaking details', async () => {
    const app = createApp();
    app.get('/test/boom', () => { throw new Error('secret-private-password'); });
    const response = await app.inject('/test/boom');
    expect(response.statusCode).toBe(500);
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('INTERNAL_ERROR');
    expect(response.body).not.toContain('secret-private-password');
  });

  it('never passes non-registry error codes through, even with 5xx statuses', async () => {
    const app = createApp();
    // Database driver error shape: uppercase code, connection details in message.
    app.get('/test/driver', () => { throw domainError(503, 'ECONNREFUSED', 'connect ECONNREFUSED 10.1.2.3:5432 secret-private-password'); });
    const response = await app.inject('/test/driver');
    expect(response.statusCode).toBe(500);
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('INTERNAL_ERROR');
    expect(response.body).not.toContain('ECONNREFUSED');
    expect(response.body).not.toContain('10.1.2.3');
    expect(response.body).not.toContain('secret-private-password');
  });
});

describe('rate limiting (opt-in per route)', () => {
  it('returns the documented 429 RATE_LIMITED envelope after the per-route maximum', async () => {
    const app = createApp();
    // Per-route limits are attached via the plugin's onRoute hook, so the route
    // must register during boot AFTER the plugin — exactly like the real
    // /api/v1 routes, which register in a child scope queued after rateLimit.
    app.register(async (instance) => {
      instance.get('/test/limited', { config: { rateLimit: { max: 2, timeWindow: '1 minute' } } }, async (request) => ({ success: true, data: { ok: true }, meta: { requestId: request.id } }));
    });
    const first = await app.inject('/test/limited');
    const second = await app.inject('/test/limited');
    const third = await app.inject('/test/limited');
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    const body = apiErrorSchema.parse(third.json());
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(third.headers['retry-after']).toBeDefined();
    expect(third.headers['x-ratelimit-limit']).toBe('2');
  });

  it('does not limit routes without rateLimit config', async () => {
    const app = createApp();
    app.get('/test/unlimited', async (request) => ({ success: true, data: { ok: true }, meta: { requestId: request.id } }));
    for (let i = 0; i < 5; i++) {
      const response = await app.inject('/test/unlimited');
      expect(response.statusCode).toBe(200);
    }
  });
});
