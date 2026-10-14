import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { readApi } from './geospatial-api';
afterEach(() => vi.unstubAllGlobals());
async function caughtError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (caught) {
    return caught as Error & { code?: string; retryAfterSeconds?: number | null };
  }
  throw new Error('request unexpectedly succeeded');
}
it('rejects malformed analytical data instead of displaying guessed metrics', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { count: 'invented' }, meta: { requestId: 'test' } }))));
  await expect(readApi('/api/v1', '/impact', z.object({ count: z.number() }))).rejects.toThrow('unexpected response');
});
it('rejects stale dataset metadata', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: {}, meta: { requestId: 'test', datasetVersion: 'old' } }))));
  await expect(readApi('/api/v1', '/roads', z.object({}), undefined, undefined, 'current')).rejects.toThrow('dataset changed');
});
it('uses a useful snapping error without exposing backend diagnostics', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'NO_NEARBY_ROAD_NODE', message: 'private diagnostic' }, meta: { requestId: 'test' } }), { status: 404 })));
  await expect(readApi('/api/v1', '/routing/snap', z.unknown())).rejects.toThrow('within 500 m');
});
it('passes cancellation through to fetch', async () => {
  const controller = new AbortController(); controller.abort();
  const fetcher = vi.fn().mockImplementation((_url, options) => { expect(options.signal.aborted).toBe(true); return Promise.reject(new DOMException('Aborted', 'AbortError')); });
  vi.stubGlobal('fetch', fetcher);
  await expect(readApi('/api/v1', '/roads', z.unknown(), controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
});
it('surfaces a missing endpoint as a service-availability problem, not a data problem', async () => {
  // Exact envelope a stale backend emits when the route does not exist yet.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' }, meta: { requestId: 'stale' } }), { status: 404 })));
  const error = await caughtError(readApi('/api/v1', '/study-areas/x/shelters', z.unknown()));
  expect(error.message).toBe('This analysis endpoint is not available on the connected service. Reload the workspace or restart the analysis service.');
  expect(error.code).toBe('NOT_FOUND');
  expect(error.message).not.toContain('choose another point');
});
it('maps rate limiting to a retryable message carrying the retry-after seconds', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please retry in 42.' }, meta: { requestId: 'limited' } }), { status: 429, headers: { 'retry-after': '42' } })));
  const error = await caughtError(readApi('/api/v1', '/shelters/reachability', z.unknown(), undefined, {}));
  expect(error.message).toContain('retry');
  expect(error.code).toBe('RATE_LIMITED');
  expect(error.retryAfterSeconds).toBe(42);
});
it('keeps unmapped error codes behind the generic fallback message', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'X_UNMAPPED_CODE', message: 'internal detail' }, meta: { requestId: 'x' } }), { status: 418 })));
  const error = await caughtError(readApi('/api/v1', '/x', z.unknown()));
  expect(error.message).toBe('The analysis request failed. Retry or choose another point.');
  expect(error.code).toBe('X_UNMAPPED_CODE');
});
