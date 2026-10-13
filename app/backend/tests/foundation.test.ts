import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiErrorSchema, healthResponseSchema, serviceStatusResponseSchema } from '@flood/shared';
import { buildApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

const apps: ReturnType<typeof buildApp>[] = [];
function createApp(input: Record<string, unknown> = {}) {
  const app = buildApp(parseEnv({ NODE_ENV: 'test', ...input }));
  apps.push(app);
  return app;
}
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe('foundation API', () => {
  it('is live without credentials and returns the shared envelope', async () => {
    const response = await createApp().inject('/health');
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json()).data.status).toBe('ok');
  });
  it.each([
    [{}, 'not_configured'],
    [{ DATABASE_URL: 'postgresql://user:private-password@localhost/example' }, 'not_initialized'],
  ])('never equates configuration with dependency readiness', async (input, expected) => {
    const app = createApp(input);
    const readiness = await app.inject('/ready');
    expect(readiness.statusCode).toBe(503);
    expect(apiErrorSchema.parse(readiness.json()).error.code).toBe('SERVICE_NOT_READY');
    const status = await app.inject('/api/v1/status');
    expect(status.statusCode).toBe(200);
    const data = serviceStatusResponseSchema.parse(status.json()).data;
    expect(data.ready).toBe(false);
    expect(data.checks.database).toBe(expected);
    expect(data.checks.graph).toBe('not_initialized');
    expect(readiness.body + status.body).not.toContain('private-password');
  });
  it('uses only the configured CORS origin', async () => {
    const app = createApp();
    const allowed = await app.inject({ url: '/health', headers: { origin: 'http://localhost:5173' } });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const other = await app.inject({ url: '/health', headers: { origin: 'https://untrusted.example' } });
    expect(other.headers['access-control-allow-origin']).not.toBe('https://untrusted.example');
  });
  it('returns structured 404s outside registered paths', async () => {
    const response = await createApp().inject('/api/v1/study-areas');
    expect(response.statusCode).toBe(404);
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('NOT_FOUND');
  });
  it('does not leak unexpected exception messages', async () => {
    const app = createApp();
    app.get('/test-error', () => { throw new Error('private-password'); });
    const response = await app.inject('/test-error');
    expect(response.statusCode).toBe(500);
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('INTERNAL_ERROR');
    expect(response.body).not.toContain('private-password');
  });
  it('normalizes Zod errors and invalid JSON to HTTP 400 envelopes', async () => {
    const app = createApp();
    app.post('/test-validation', (request) => z.object({ count: z.number() }).parse(request.body));
    for (const payload of ['{"count":"private-password"}', '{']) {
      const response = await app.inject({ method: 'POST', url: '/test-validation', payload, headers: { 'content-type': 'application/json' } });
      expect(response.statusCode).toBe(400);
      expect(apiErrorSchema.safeParse(response.json()).success).toBe(true);
      expect(response.body).not.toContain('private-password');
    }
  });
});

describe('environment validation', () => {
  it('provides defaults and permits an empty database URL', () => {
    expect(parseEnv({ DATABASE_URL: '' })).toMatchObject({ PORT: 3001, HOST: '0.0.0.0', DATABASE_URL: undefined });
  });
  it.each([{ PORT: 'abc' }, { PORT: '0' }, { PORT: '65536' }, { NODE_ENV: 'invalid' }, { CORS_ORIGIN: '*' }, { CORS_ORIGIN: 'http://localhost:5173/path' }, { DATABASE_URL: 'https://example.com' }])('rejects invalid configuration %j', (input) => {
    expect(() => parseEnv(input)).toThrow('Invalid environment configuration:');
  });
  it('does not expose invalid credential values', () => {
    expect(() => parseEnv({ DATABASE_URL: 'private-password' })).toThrow('Invalid environment configuration: DATABASE_URL');
  });
});
