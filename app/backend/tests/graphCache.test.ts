import { afterEach, expect, it, vi } from 'vitest';
import type pg from 'pg';
import type { RoadGraph } from '../src/routing/graph.js';
vi.mock('../src/routing/graph.js', () => ({ loadRoadGraph: vi.fn() }));
import { loadRoadGraph } from '../src/routing/graph.js';
import { getOrLoadGraph, invalidateGraphCache, getGraphCacheStatus } from '../src/routing/graphCache.js';
const loader = vi.mocked(loadRoadGraph);
const pool = {} as pg.Pool;
const graph = (studyAreaId = 'area', datasetVersion = 'v1') => ({ studyAreaId, datasetVersion, nodes: new Map(), arcs: new Map(), adjacency: new Map(), loadedAt: new Date(), nodeCount: 0, arcCount: 0 }) satisfies RoadGraph;
afterEach(() => { invalidateGraphCache(); vi.resetAllMocks(); });

it('deduplicates concurrent requests for the same graph', async () => {
  loader.mockResolvedValue(graph());
  const [first, second] = await Promise.all([getOrLoadGraph(pool, 'area', 'v1'), getOrLoadGraph(pool, 'area', 'v1')]);
  expect(first).toBe(second);
  expect(loader).toHaveBeenCalledTimes(1);
});
it('does not reuse a pending graph from another dataset', async () => {
  loader.mockImplementation(async (_pool, area, version) => graph(area, version));
  const results = await Promise.all([getOrLoadGraph(pool, 'area', 'v1'), getOrLoadGraph(pool, 'area', 'v2')]);
  expect(results.map((value) => value.datasetVersion)).toEqual(['v1', 'v2']);
  expect(loader).toHaveBeenCalledTimes(2);
});
it('allows retries after a failed connection or query', async () => {
  loader.mockRejectedValueOnce(new Error('Connection failed')).mockResolvedValueOnce(graph());
  await expect(getOrLoadGraph(pool, 'area', 'v1')).rejects.toThrow('Connection failed');
  await expect(getOrLoadGraph(pool, 'area', 'v1')).resolves.toMatchObject({ datasetVersion: 'v1' });
});
it('invalidation prevents an obsolete in-flight load from repopulating the cache', async () => {
  let finish!: (value: RoadGraph) => void;
  loader.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const pending = getOrLoadGraph(pool, 'area', 'v1');
  invalidateGraphCache();
  finish(graph());
  await pending;
  expect(getGraphCacheStatus().loaded).toBe(false);
});
