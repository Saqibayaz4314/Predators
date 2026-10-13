/**
 * ROUTE-07 — In-memory graph cache
 *
 * Caches the loaded RoadGraph per study area to avoid re-querying PostGIS
 * on every routing request. The cache is invalidated when dataset version changes.
 *
 * Thread-safety note: Node.js is single-threaded; the async load guard
 * prevents duplicate concurrent loads.
 */

import type pg from 'pg';
import { loadRoadGraph, type RoadGraph } from './graph.js';

interface CacheEntry {
  graph: RoadGraph;
  datasetVersion: string;
  studyAreaId: string;
}

// Module-level cache (singleton per process)
let _cache: CacheEntry | null = null;

// Pending load guard — prevents duplicate concurrent DB queries
const pendingLoads = new Map<string, Promise<RoadGraph>>();
let generation = 0;

/**
 * Get the cached graph, or load it from PostGIS if not yet cached.
 *
 * If the cached graph's datasetVersion doesn't match the expected version,
 * the cache is cleared and reloaded.
 *
 * @param pool         pg.Pool (not a client — manages connection lifecycle)
 * @param studyAreaId  UUID of the active study area
 * @param datasetVersion  Expected dataset version string
 */
export async function getOrLoadGraph(
  pool: pg.Pool,
  studyAreaId: string,
  datasetVersion: string,
): Promise<RoadGraph> {
  // Cache hit: same study area + same version
  if (
    _cache &&
    _cache.studyAreaId === studyAreaId &&
    _cache.datasetVersion === datasetVersion
  ) {
    return _cache.graph;
  }

  // Another concurrent call is already loading — wait for it
  const key = `${studyAreaId}:${datasetVersion}`;
  const pending = pendingLoads.get(key);
  if (pending) return pending;
  const loadGeneration = generation;
  // Use the bounded pool: queries can use separate clients, released by pg.
  // finally also covers acquisition failure, so retries cannot get stuck.
  const load = loadRoadGraph(pool, studyAreaId, datasetVersion).then((graph) => {
    if (loadGeneration === generation) _cache = { graph, datasetVersion, studyAreaId };
    return graph;
  }).finally(() => {
    if (pendingLoads.get(key) === load) pendingLoads.delete(key);
  });
  pendingLoads.set(key, load);
  return load;
}

/** Invalidate the graph cache (e.g., after a new dataset is imported). */
export function invalidateGraphCache(): void {
  _cache = null;
  generation++;
  pendingLoads.clear();
}

/** Return cache status for health/ready checks. */
export function getGraphCacheStatus(): {
  loaded: boolean;
  studyAreaId: string | null;
  datasetVersion: string | null;
  loadedAt: Date | null;
  nodeCount: number | null;
  arcCount: number | null;
} {
  if (!_cache) {
    return {
      loaded: false,
      studyAreaId: null,
      datasetVersion: null,
      loadedAt: null,
      nodeCount: null,
      arcCount: null,
    };
  }
  return {
    loaded: true,
    studyAreaId: _cache.studyAreaId,
    datasetVersion: _cache.datasetVersion,
    loadedAt: _cache.graph.loadedAt,
    nodeCount: _cache.graph.nodeCount,
    arcCount: _cache.graph.arcCount,
  };
}

/** For testing only — reset module-level cache state. */
export function _resetCacheForTests(): void {
  invalidateGraphCache();
}
