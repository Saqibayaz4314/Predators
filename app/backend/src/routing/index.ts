/**
 * Routing module barrel export.
 * Import from '@flood/backend/routing' for all routing functionality.
 */

export { MinHeap } from './heap.js';
export type { HeapItem } from './heap.js';

export { loadRoadGraph, buildAdjacency } from './graph.js';
export type { GraphNode, GraphArc, RoadGraph } from './graph.js';

export { dijkstra, compareRoutes } from './dijkstra.js';
export type {
  RouteStatus,
  RouteFound,
  RouteUnreachable,
  RouteResult,
  RouteRequest,
  RouteComparison,
} from './dijkstra.js';

export {
  getOrLoadGraph,
  invalidateGraphCache,
  getGraphCacheStatus,
  _resetCacheForTests,
} from './graphCache.js';

export {
  haversineMeters,
  snapToNearestNodeInMemory,
  snapToNearestNodePostGIS,
} from './snapping.js';
export type { SnapResult } from './snapping.js';
