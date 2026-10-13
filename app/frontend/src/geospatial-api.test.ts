import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { readApi } from './geospatial-api';
afterEach(() => vi.unstubAllGlobals());
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
