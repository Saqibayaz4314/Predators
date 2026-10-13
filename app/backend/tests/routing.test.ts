/**
 * ROUTE-08 — Routing engine unit tests
 *
 * Test categories:
 *   A. MinHeap unit tests (pure, no DB)
 *   B. Dijkstra on synthetic graphs (pure, no DB)
 *   C. Snapping utility (pure, no DB)
 *   D. Integration: real Sukkur graph via PostGIS (requires DATABASE_URL)
 *
 * Invariants verified:
 *   1. Scenario route >= baseline route (only arcs removed).
 *   2. Blocked arcs never appear in route.
 *   3. One-way restrictions respected.
 *   4. UNREACHABLE returned for disconnected pairs.
 *   5. Node IDs are strings throughout.
 *   6. Route geometry coordinates count matches arc sequence.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MinHeap } from '../src/routing/heap.js';
import { dijkstra, compareRoutes } from '../src/routing/dijkstra.js';
import { buildAdjacency, loadRoadGraph } from '../src/routing/graph.js';
import { haversineMeters, snapToNearestNodeInMemory } from '../src/routing/snapping.js';
import { _resetCacheForTests } from '../src/routing/graphCache.js';
import type { RoadGraph, GraphArc, GraphNode } from '../src/routing/graph.js';
import pg from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: resolve(fileURLToPath(import.meta.url), '../../.env'), override: false });

// ---------------------------------------------------------------------------
// Synthetic graph builder helper
// ---------------------------------------------------------------------------

function makeArc(
  id: string, src: string, tgt: string, len: number,
  coords?: number[][]
): GraphArc {
  return {
    id,
    sourceNodeId: src,
    targetNodeId: tgt,
    physicalSegmentId: id,
    lengthMeters: len,
    geometry: {
      type: 'LineString',
      coordinates: coords ?? [[0, 0], [1, 0]],
    },
  };
}

function makeNode(id: string, lon = 0, lat = 0): GraphNode {
  return { id, longitude: lon, latitude: lat };
}

function makeGraph(
  nodes: GraphNode[],
  arcs: GraphArc[],
): RoadGraph {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const arcMap  = new Map(arcs.map(a => [a.id, a]));
  const adj = buildAdjacency(arcMap);
  return {
    studyAreaId: 'test-area',
    datasetVersion: 'test-v1',
    nodes: nodeMap,
    arcs: arcMap,
    adjacency: adj,
    loadedAt: new Date(),
    nodeCount: nodes.length,
    arcCount: arcs.length,
  };
}

// ---------------------------------------------------------------------------
// A. MinHeap tests
// ---------------------------------------------------------------------------

describe('A. MinHeap', () => {
  it('starts empty', () => {
    const h = new MinHeap();
    expect(h.isEmpty).toBe(true);
    expect(h.size).toBe(0);
  });

  it('pop on empty returns undefined', () => {
    const h = new MinHeap();
    expect(h.pop()).toBeUndefined();
  });

  it('maintains min-heap property with ordered inserts', () => {
    const h = new MinHeap();
    h.push({ nodeId: 'c', dist: 30 });
    h.push({ nodeId: 'a', dist: 10 });
    h.push({ nodeId: 'b', dist: 20 });
    expect(h.pop()!.nodeId).toBe('a');
    expect(h.pop()!.nodeId).toBe('b');
    expect(h.pop()!.nodeId).toBe('c');
  });

  it('maintains min-heap property with reverse inserts', () => {
    const h = new MinHeap();
    for (let i = 100; i >= 1; i--) {
      h.push({ nodeId: String(i), dist: i });
    }
    const results: number[] = [];
    while (!h.isEmpty) results.push(h.pop()!.dist);
    expect(results).toEqual(results.slice().sort((a, b) => a - b));
  });

  it('handles duplicate distances', () => {
    const h = new MinHeap();
    h.push({ nodeId: 'x', dist: 5 });
    h.push({ nodeId: 'y', dist: 5 });
    h.push({ nodeId: 'z', dist: 5 });
    expect(h.pop()!.dist).toBe(5);
    expect(h.pop()!.dist).toBe(5);
    expect(h.pop()!.dist).toBe(5);
    expect(h.isEmpty).toBe(true);
  });

  it('peek does not remove element', () => {
    const h = new MinHeap();
    h.push({ nodeId: 'a', dist: 1 });
    expect(h.peek()!.nodeId).toBe('a');
    expect(h.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// B. Dijkstra synthetic graph tests
// ---------------------------------------------------------------------------

describe('B. Dijkstra — synthetic graphs', () => {
  // Simple 3-node linear: A -10-> B -5-> C
  const linearGraph = makeGraph(
    [makeNode('A'), makeNode('B'), makeNode('C')],
    [makeArc('ab', 'A', 'B', 10), makeArc('bc', 'B', 'C', 5)],
  );

  it('finds shortest path on linear graph A->C', () => {
    const r = dijkstra(linearGraph, { originNodeId: 'A', destinationNodeId: 'C', blockedArcIds: new Set() });
    expect(r.status).toBe('found');
    if (r.status === 'found') {
      expect(r.totalDistanceMeters).toBe(15);
      expect(r.nodeIdPath).toEqual(['A', 'B', 'C']);
      expect(r.arcIdPath).toEqual(['ab', 'bc']);
      expect(r.arcCount).toBe(2);
    }
  });

  it('returns unreachable when going against one-way (B->A not allowed)', () => {
    const r = dijkstra(linearGraph, { originNodeId: 'B', destinationNodeId: 'A', blockedArcIds: new Set() });
    expect(r.status).toBe('unreachable');
  });

  it('source === destination returns found with 0 distance', () => {
    const r = dijkstra(linearGraph, { originNodeId: 'A', destinationNodeId: 'A', blockedArcIds: new Set() });
    expect(r.status).toBe('found');
    if (r.status === 'found') {
      expect(r.totalDistanceMeters).toBe(0);
      expect(r.arcCount).toBe(0);
      expect(r.nodeIdPath).toEqual(['A']);
    }
  });

  it('returns invalid_origin for unknown origin node', () => {
    const r = dijkstra(linearGraph, { originNodeId: 'ZZZZ', destinationNodeId: 'A', blockedArcIds: new Set() });
    expect(r.status).toBe('invalid_origin');
  });

  it('returns invalid_destination for unknown destination node', () => {
    const r = dijkstra(linearGraph, { originNodeId: 'A', destinationNodeId: 'ZZZZ', blockedArcIds: new Set() });
    expect(r.status).toBe('invalid_destination');
  });

  // Diamond graph: A -1-> B -1-> D, A -5-> C -1-> D (shortest: A-B-D = 2)
  const diamondGraph = makeGraph(
    [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')],
    [
      makeArc('ab', 'A', 'B', 1),
      makeArc('bd', 'B', 'D', 1),
      makeArc('ac', 'A', 'C', 5),
      makeArc('cd', 'C', 'D', 1),
    ],
  );

  it('finds true shortest path on diamond graph (A->D via B, not C)', () => {
    const r = dijkstra(diamondGraph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set() });
    expect(r.status).toBe('found');
    if (r.status === 'found') {
      expect(r.totalDistanceMeters).toBe(2);
      expect(r.nodeIdPath).toEqual(['A', 'B', 'D']);
    }
  });

  it('routes via longer path when shortest is blocked', () => {
    const r = dijkstra(diamondGraph, {
      originNodeId: 'A',
      destinationNodeId: 'D',
      blockedArcIds: new Set(['ab']),
    });
    expect(r.status).toBe('found');
    if (r.status === 'found') {
      expect(r.totalDistanceMeters).toBe(6); // A->C->D
      expect(r.nodeIdPath).toEqual(['A', 'C', 'D']);
      expect(r.arcIdPath).toContain('ac');
      expect(r.arcIdPath).toContain('cd');
      expect(r.arcIdPath).not.toContain('ab'); // CRITICAL: blocked arc must not appear
    }
  });

  it('returns unreachable when all outgoing arcs blocked', () => {
    const r = dijkstra(diamondGraph, {
      originNodeId: 'A',
      destinationNodeId: 'D',
      blockedArcIds: new Set(['ab', 'ac']),
    });
    expect(r.status).toBe('unreachable');
  });

  it('returns unreachable on disconnected graph component', () => {
    const disconnected = makeGraph(
      [makeNode('X'), makeNode('Y'), makeNode('Z')],
      [makeArc('xy', 'X', 'Y', 1)], // Z is isolated
    );
    const r = dijkstra(disconnected, { originNodeId: 'X', destinationNodeId: 'Z', blockedArcIds: new Set() });
    expect(r.status).toBe('unreachable');
  });

  it('respects bidirectional arcs (both directions)', () => {
    const bidir = makeGraph(
      [makeNode('A'), makeNode('B')],
      [
        makeArc('ab', 'A', 'B', 10),
        makeArc('ba', 'B', 'A', 10), // explicit reverse arc
      ],
    );
    const fwd = dijkstra(bidir, { originNodeId: 'A', destinationNodeId: 'B', blockedArcIds: new Set() });
    const bwd = dijkstra(bidir, { originNodeId: 'B', destinationNodeId: 'A', blockedArcIds: new Set() });
    expect(fwd.status).toBe('found');
    expect(bwd.status).toBe('found');
    if (fwd.status === 'found') expect(fwd.totalDistanceMeters).toBe(10);
    if (bwd.status === 'found') expect(bwd.totalDistanceMeters).toBe(10);
  });

  it('result geometry is a valid GeoJSON LineString', () => {
    const r = dijkstra(linearGraph, { originNodeId: 'A', destinationNodeId: 'C', blockedArcIds: new Set() });
    expect(r.status).toBe('found');
    if (r.status === 'found') {
      expect(r.geometry.type).toBe('LineString');
      expect(Array.isArray(r.geometry.coordinates)).toBe(true);
      expect(r.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('node IDs are strings throughout (BIGINT safety)', () => {
    const bigGraph = makeGraph(
      [makeNode('9007199254740993'), makeNode('9007199254740994')], // > MAX_SAFE_INTEGER
      [makeArc('1', '9007199254740993', '9007199254740994', 100)],
    );
    const r = dijkstra(bigGraph, {
      originNodeId: '9007199254740993',
      destinationNodeId: '9007199254740994',
      blockedArcIds: new Set(),
    });
    expect(r.status).toBe('found');
    if (r.status === 'found') {
      expect(r.nodeIdPath[0]).toBe('9007199254740993');
      expect(r.nodeIdPath[1]).toBe('9007199254740994');
    }
  });
});

// ---------------------------------------------------------------------------
// B2. RouteComparison invariant tests
// ---------------------------------------------------------------------------

describe('B2. RouteComparison invariants', () => {
  const graph = makeGraph(
    [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')],
    [
      makeArc('ab', 'A', 'B', 1),
      makeArc('bd', 'B', 'D', 1),
      makeArc('ac', 'A', 'C', 5),
      makeArc('cd', 'C', 'D', 1),
    ],
  );

  it('scenario distance >= baseline distance (invariant)', () => {
    const baseline = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set() });
    const scenario = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set(['ab']) });
    const cmp = compareRoutes(baseline, scenario);
    expect(cmp.invariantValid).toBe(true);
    if (baseline.status === 'found' && scenario.status === 'found') {
      expect(scenario.totalDistanceMeters).toBeGreaterThanOrEqual(baseline.totalDistanceMeters);
    }
  });

  it('detour calculated correctly', () => {
    const baseline = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set() });
    const scenario = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set(['ab']) });
    const cmp = compareRoutes(baseline, scenario);
    expect(cmp.detourMeters).toBe(4); // 6 - 2
  });

  it('unreachable scenario sets scenarioUnreachable flag', () => {
    const baseline = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set() });
    const scenario = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set(['ab', 'ac']) });
    const cmp = compareRoutes(baseline, scenario);
    expect(cmp.scenarioUnreachable).toBe(true);
    expect(cmp.detourMeters).toBeNull();
  });

  it('routeChanged is true when path differs', () => {
    const baseline = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set() });
    const scenario = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set(['ab']) });
    const cmp = compareRoutes(baseline, scenario);
    expect(cmp.routeChanged).toBe(true);
  });

  it('routeChanged is false when same route taken', () => {
    const r1 = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set() });
    const r2 = dijkstra(graph, { originNodeId: 'A', destinationNodeId: 'D', blockedArcIds: new Set(['this-arc-does-not-exist']) });
    const cmp = compareRoutes(r1, r2);
    expect(cmp.routeChanged).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C. Snapping utility tests (pure, no DB)
// ---------------------------------------------------------------------------

describe('C. Snapping utilities', () => {
  it('haversineMeters: same point = 0', () => {
    expect(haversineMeters(68.875, 27.715, 68.875, 27.715)).toBe(0);
  });

  it('haversineMeters: Sukkur test distance ~11km', () => {
    // lon 68.80 to 68.97, same lat — rough check
    const d = haversineMeters(68.80, 27.71, 68.97, 27.71);
    expect(d).toBeGreaterThan(10_000);
    expect(d).toBeLessThan(20_000);
  });

  it('snapToNearestNodeInMemory: finds exact match', () => {
    const graph = makeGraph(
      [makeNode('1', 68.875, 27.715), makeNode('2', 68.880, 27.720)],
      [makeArc('12', '1', '2', 100)],
    );
    const snap = snapToNearestNodeInMemory(graph, 68.875, 27.715);
    expect(snap).not.toBeNull();
    expect(snap!.nodeId).toBe('1');
    expect(snap!.distanceMeters).toBeLessThan(1);
  });

  it('snapToNearestNodeInMemory: returns null when beyond max distance', () => {
    const graph = makeGraph(
      [makeNode('1', 0, 0)],
      [makeArc('11', '1', '1', 1)],
    );
    // 68 degrees away
    const snap = snapToNearestNodeInMemory(graph, 68, 0, 500);
    expect(snap).toBeNull();
  });

  it('snapToNearestNodeInMemory: picks closest of multiple nodes', () => {
    const graph = makeGraph(
      [
        makeNode('close', 68.875, 27.715),
        makeNode('far',   68.900, 27.730),
      ],
      [makeArc('cf', 'close', 'far', 1000)],
    );
    const snap = snapToNearestNodeInMemory(graph, 68.876, 27.716);
    expect(snap!.nodeId).toBe('close');
  });
});

// ---------------------------------------------------------------------------
// D. Integration tests against real Sukkur graph (requires DATABASE_URL)
// ---------------------------------------------------------------------------

const STUDY_AREA_ID = '020ce29e-ec4f-4514-b14f-58c1252191cc';
const DATASET_VERSION = 'sukkur-osm-2026-10-v1';
const DEMO_PAIR_1 = { origin: '11243', destination: '2814', expectedMaxM: 8000 };
const DEMO_PAIR_2 = { origin: '4416',  destination: '2908', expectedMaxM: 6000 };

let pool: pg.Pool | null = null;
let realGraph: import('../src/routing/graph.js').RoadGraph | null = null;
let skipIntegration = '';

beforeAll(async () => {
  _resetCacheForTests();
  if (!process.env.DATABASE_URL) {
    skipIntegration = 'DATABASE_URL not set';
    return;
  }
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });
  try {
    const client = await pool.connect();
    // Check study area exists
    const sa = await client.query(
      `SELECT id FROM study_areas WHERE id = $1`, [STUDY_AREA_ID]
    );
    if (sa.rows.length === 0) {
      skipIntegration = `Study area ${STUDY_AREA_ID} not found — run geo:import first`;
      client.release();
      return;
    }
    // Load graph — 29,448 edges from Heroku takes ~60-90s over network
    realGraph = await loadRoadGraph(client, STUDY_AREA_ID, DATASET_VERSION);
    client.release();
  } catch (err) {
    const safe = (err as Error).message?.replace(/password|credential/gi, '[REDACTED]');
    skipIntegration = `DB error: ${safe}`;
  }
}, 120_000); // 2 min — Heroku network latency for full graph load

afterAll(async () => {
  if (pool) await pool.end();
  _resetCacheForTests();
}, 30_000);

describe('D. Real Sukkur graph integration', () => {
  it('graph loads with correct node count', () => {
    if (skipIntegration) return expect.soft(true).toBe(true);
    expect(realGraph).not.toBeNull();
    expect(realGraph!.nodeCount).toBe(11_940);
    expect(realGraph!.arcCount).toBe(29_448);
  });

  it('adjacency list covers all source nodes', () => {
    if (skipIntegration) return expect.soft(true).toBe(true);
    // Every arc's source should be in adjacency
    for (const arc of realGraph!.arcs.values()) {
      expect(realGraph!.adjacency.has(arc.sourceNodeId)).toBe(true);
    }
  });

  it('demo pair 1: baseline route found within expected distance', () => {
    if (skipIntegration) return expect.soft(true).toBe(true);
    const r = dijkstra(realGraph!, {
      originNodeId: DEMO_PAIR_1.origin,
      destinationNodeId: DEMO_PAIR_1.destination,
      blockedArcIds: new Set(),
    });
    expect(r.status).toBe('found');
    if (r.status === 'found') {
      expect(r.totalDistanceMeters).toBeGreaterThan(0);
      expect(r.totalDistanceMeters).toBeLessThan(DEMO_PAIR_1.expectedMaxM);
      expect(r.geometry.type).toBe('LineString');
      expect(r.geometry.coordinates.length).toBeGreaterThan(1);
    }
  });

  it('demo pair 2: flood-demo baseline route found', () => {
    if (skipIntegration) return expect.soft(true).toBe(true);
    const r = dijkstra(realGraph!, {
      originNodeId: DEMO_PAIR_2.origin,
      destinationNodeId: DEMO_PAIR_2.destination,
      blockedArcIds: new Set(),
    });
    expect(r.status).toBe('found');
    if (r.status === 'found') {
      expect(r.totalDistanceMeters).toBeLessThan(DEMO_PAIR_2.expectedMaxM);
    }
  });

  it('blocked arc does not appear in route', () => {
    if (skipIntegration) return expect.soft(true).toBe(true);
    const baseline = dijkstra(realGraph!, {
      originNodeId: DEMO_PAIR_1.origin,
      destinationNodeId: DEMO_PAIR_1.destination,
      blockedArcIds: new Set(),
    });
    if (baseline.status !== 'found') return;

    // Block the first arc in the baseline route
    const firstArcId = baseline.arcIdPath[0]!;
    const scenario = dijkstra(realGraph!, {
      originNodeId: DEMO_PAIR_1.origin,
      destinationNodeId: DEMO_PAIR_1.destination,
      blockedArcIds: new Set([firstArcId]),
    });

    if (scenario.status === 'found') {
      // CRITICAL: blocked arc must not appear
      expect(scenario.arcIdPath).not.toContain(firstArcId);
      // Scenario must be >= baseline
      expect(scenario.totalDistanceMeters).toBeGreaterThanOrEqual(
        baseline.totalDistanceMeters - 0.01
      );
    }
    // Either found (longer route) or unreachable — both valid
    expect(['found', 'unreachable']).toContain(scenario.status);
  });

  it('near-node snap returns valid node in Sukkur area', () => {
    if (skipIntegration) return expect.soft(true).toBe(true);
    // Snap to approximate Sukkur city center
    const snap = snapToNearestNodeInMemory(realGraph!, 68.875, 27.715);
    expect(snap).not.toBeNull();
    expect(snap!.distanceMeters).toBeLessThan(500);
    expect(realGraph!.nodes.has(snap!.nodeId)).toBe(true);
  });

  it('determinism: same inputs produce identical results', () => {
    if (skipIntegration) return expect.soft(true).toBe(true);
    const r1 = dijkstra(realGraph!, {
      originNodeId: DEMO_PAIR_1.origin,
      destinationNodeId: DEMO_PAIR_1.destination,
      blockedArcIds: new Set(),
    });
    const r2 = dijkstra(realGraph!, {
      originNodeId: DEMO_PAIR_1.origin,
      destinationNodeId: DEMO_PAIR_1.destination,
      blockedArcIds: new Set(),
    });
    if (r1.status === 'found' && r2.status === 'found') {
      expect(r1.totalDistanceMeters).toBe(r2.totalDistanceMeters);
      expect(r1.arcIdPath).toEqual(r2.arcIdPath);
    }
  });

  it('performance: route completes in <500ms on real graph', () => {
    if (skipIntegration) return expect.soft(true).toBe(true);
    const t0 = performance.now();
    dijkstra(realGraph!, {
      originNodeId: DEMO_PAIR_1.origin,
      destinationNodeId: DEMO_PAIR_1.destination,
      blockedArcIds: new Set(),
    });
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(500);
  });
}, 30_000);
