import { afterEach, expect, it, vi } from 'vitest';
import { fetchServiceStatus } from './api';
import { frontendEnvSchema } from './env';

afterEach(() => vi.unstubAllGlobals());
it('validates the status contract and propagates a cancellation signal', async () => {
  const data = { service: 'flood-digital-twin', phase: 'foundation', ready: false, checks: { backend: 'initialized', database: 'not_configured', dataset: 'not_initialized', graph: 'not_initialized' } };
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data, meta: { requestId: 'test' } })));
  vi.stubGlobal('fetch', mock);
  await expect(fetchServiceStatus('/api/v1', new AbortController().signal)).resolves.toEqual(data);
  expect(mock).toHaveBeenCalledWith('/api/v1/status', { signal: expect.any(AbortSignal) });
});
it('rejects failed HTTP requests', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
  await expect(fetchServiceStatus('/api/v1')).rejects.toThrow('API is unavailable');
});
it('rejects a successful HTTP response with an invalid contract', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
  await expect(fetchServiceStatus('/api/v1')).rejects.toThrow('unexpected response');
});
it('validates public API configuration', () => {
  expect(frontendEnvSchema.parse({}).VITE_API_BASE_URL).toBe('/api/v1');
  expect(frontendEnvSchema.safeParse({ VITE_API_BASE_URL: 'https://example.com/api/v1' }).success).toBe(true);
  for (const value of ['', '//example.com/api/v1', 'javascript:alert(1)', 'https://user:secret@example.com/api/v1', '/wrong']) {
    expect(frontendEnvSchema.safeParse({ VITE_API_BASE_URL: value }).success).toBe(false);
  }
});
