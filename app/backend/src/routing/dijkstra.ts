/**
 * ROUTE-03 / ROUTE-04 / ROUTE-05 — Dijkstra Shortest Path Engine
 *
 * Implements:
 *   - Dijkstra with binary min-heap (ROUTE-03)
 *   - Path reconstruction (ROUTE-04)
 *   - Route GeoJSON assembly (ROUTE-05)
 *
 * Critical safety invariants (from AGENTS.md section 8):
 *   1. Never routes through blocked arcs.
 *   2. Scenario route cannot be shorter than baseline (same endpoints, only arcs removed).
 *   3. Returns explicit UNREACHABLE result — never a fake straight-line route.
 *   4. Uses only real imported arc geometries.
 *   5. Node IDs are strings throughout (BIGINT safety).
 */

import type { RoadGraph, GraphArc } from './graph.js';
import { MinHeap } from './heap.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RouteStatus = 'found' | 'unreachable' | 'invalid_origin' | 'invalid_destination';

export interface RouteFound {
  readonly status: 'found';
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly totalDistanceMeters: number;
  readonly nodeIdPath: readonly string[];
  readonly arcIdPath: readonly string[];
  readonly geometry: GeoJSON.LineString;  // full concatenated route geometry
  readonly segmentGeometries: readonly GeoJSON.LineString[];
  readonly arcCount: number;
  readonly blockedArcCount: number; // 0 for baseline
}

export interface RouteUnreachable {
  readonly status: 'unreachable' | 'invalid_origin' | 'invalid_destination';
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly reason: string;
  readonly blockedArcCount: number;
}

export type RouteResult = RouteFound | RouteUnreachable;

export interface RouteRequest {
  originNodeId: string;
  destinationNodeId: string;
  /** Set of arc IDs to block — empty Set for baseline routing. */
  blockedArcIds: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// Dijkstra implementation
// ---------------------------------------------------------------------------

/**
 * Run Dijkstra on the road graph from origin to destination.
 *
 * @param graph      Loaded RoadGraph (adjacency, arcs, nodes)
 * @param request    Origin, destination, and blocked arc set
 * @returns          RouteResult — either found with geometry, or unreachable
 */
export function dijkstra(graph: RoadGraph, request: RouteRequest): RouteResult {
  const { originNodeId, destinationNodeId, blockedArcIds } = request;

  // Validate nodes exist
  if (!graph.nodes.has(originNodeId)) {
    return {
      status: 'invalid_origin',
      originNodeId,
      destinationNodeId,
      reason: `Origin node ${originNodeId} not found in graph`,
      blockedArcCount: blockedArcIds.size,
    };
  }
  if (!graph.nodes.has(destinationNodeId)) {
    return {
      status: 'invalid_destination',
      originNodeId,
      destinationNodeId,
      reason: `Destination node ${destinationNodeId} not found in graph`,
      blockedArcCount: blockedArcIds.size,
    };
  }

  // Trivial case
  if (originNodeId === destinationNodeId) {
    const node = graph.nodes.get(originNodeId)!;
    return {
      status: 'found',
      originNodeId,
      destinationNodeId,
      totalDistanceMeters: 0,
      nodeIdPath: [originNodeId],
      arcIdPath: [],
      geometry: {
        type: 'LineString',
        coordinates: [[node.longitude, node.latitude]],
      },
      segmentGeometries: [],
      arcCount: 0,
      blockedArcCount: blockedArcIds.size,
    };
  }

  // Dijkstra state
  const dist = new Map<string, number>();
  const prevNode = new Map<string, string>();   // nodeId -> previous nodeId
  const prevArc  = new Map<string, string>();   // nodeId -> arc ID used to reach it
  const settled  = new Set<string>();

  dist.set(originNodeId, 0);
  const heap = new MinHeap();
  heap.push({ nodeId: originNodeId, dist: 0 });

  while (!heap.isEmpty) {
    const top = heap.pop()!;
    const { nodeId: u, dist: du } = top;

    // Lazy deletion: skip if we already found a shorter path to u
    if (settled.has(u)) continue;
    settled.add(u);

    if (u === destinationNodeId) break; // found — early exit

    const outgoing = graph.adjacency.get(u) ?? [];
    for (const arc of outgoing) {
      if (blockedArcIds.has(arc.id)) continue; // CRITICAL: respect scenario closures
      const v = arc.targetNodeId;
      if (settled.has(v)) continue;

      const newDist = du + arc.lengthMeters;
      const existing = dist.get(v) ?? Infinity;
      if (newDist < existing) {
        dist.set(v, newDist);
        prevNode.set(v, u);
        prevArc.set(v, arc.id);
        heap.push({ nodeId: v, dist: newDist });
      }
    }
  }

  // Check reachability
  const totalDist = dist.get(destinationNodeId);
  if (totalDist === undefined || totalDist === Infinity) {
    return {
      status: 'unreachable',
      originNodeId,
      destinationNodeId,
      reason: blockedArcIds.size > 0
        ? `Destination unreachable with ${blockedArcIds.size} blocked arc(s) from flood scenario`
        : 'Destination unreachable (disconnected graph component)',
      blockedArcCount: blockedArcIds.size,
    };
  }

  // Reconstruct path
  const nodeIdPath: string[] = [];
  const arcIdPath: string[] = [];
  let cur = destinationNodeId;

  while (cur !== originNodeId) {
    nodeIdPath.unshift(cur);
    const arcId = prevArc.get(cur);
    if (!arcId) {
      // Should not happen if Dijkstra is correct
      return {
        status: 'unreachable',
        originNodeId,
        destinationNodeId,
        reason: 'Path reconstruction failed — internal error',
        blockedArcCount: blockedArcIds.size,
      };
    }
    arcIdPath.unshift(arcId);
    cur = prevNode.get(cur)!;
  }
  nodeIdPath.unshift(originNodeId);

  // Assemble geometry from arc geometries
  const segmentGeometries: GeoJSON.LineString[] = [];
  const allCoords: GeoJSON.Position[] = [];

  for (const arcId of arcIdPath) {
    const arc = graph.arcs.get(arcId)!;
    segmentGeometries.push(arc.geometry);
    // Append coords (skip first coord of each arc after the first to avoid duplicates)
    const coords = arc.geometry.coordinates;
    const previous = allCoords.at(-1);
    const first = coords[0];
    if (coords.length < 2 || !first || (previous &&
      (Math.abs(previous[0]! - first[0]!) > 1e-7 || Math.abs(previous[1]! - first[1]!) > 1e-7))) {
      throw new Error('Route geometry is discontinuous');
    }
    if (allCoords.length === 0) {
      allCoords.push(...coords);
    } else {
      allCoords.push(...coords.slice(1));
    }
  }

  return {
    status: 'found',
    originNodeId,
    destinationNodeId,
    totalDistanceMeters: totalDist,
    nodeIdPath,
    arcIdPath,
    geometry: { type: 'LineString', coordinates: allCoords },
    segmentGeometries,
    arcCount: arcIdPath.length,
    blockedArcCount: blockedArcIds.size,
  };
}

// ---------------------------------------------------------------------------
// ROUTE-05 — Scenario comparison
// ---------------------------------------------------------------------------

export interface RouteComparison {
  readonly baseline: RouteResult;
  readonly scenario: RouteResult;
  readonly baselineDistanceMeters: number | null;
  readonly scenarioDistanceMeters: number | null;
  readonly detourMeters: number | null;
  readonly detourPercent: number | null;
  readonly routeChanged: boolean;
  readonly scenarioUnreachable: boolean;
  readonly invariantValid: boolean; // scenario dist >= baseline dist
}

/**
 * Compare baseline and scenario routes.
 *
 * Invariant: scenarioDistance >= baselineDistance (scenario only removes arcs).
 */
export function compareRoutes(
  baseline: RouteResult,
  scenario: RouteResult,
): RouteComparison {
  const baselineDist = baseline.status === 'found' ? baseline.totalDistanceMeters : null;
  const scenarioDist = scenario.status === 'found' ? scenario.totalDistanceMeters : null;

  const detourMeters =
    baselineDist !== null && scenarioDist !== null
      ? Math.round((scenarioDist - baselineDist) * 10) / 10
      : null;

  const detourPercent =
    baselineDist !== null && baselineDist > 0 && detourMeters !== null
      ? Math.round((detourMeters / baselineDist) * 1000) / 10
      : null;

  // Verify invariant: scenario cannot be shorter than baseline
  const invariantValid =
    baselineDist === null ||
    scenarioDist === null ||
    scenarioDist >= baselineDist - 0.01; // allow for floating-point epsilon

  return {
    baseline,
    scenario,
    baselineDistanceMeters: baselineDist,
    scenarioDistanceMeters: scenarioDist,
    detourMeters,
    detourPercent,
    routeChanged:
      baseline.status === 'found' &&
      scenario.status === 'found' &&
      JSON.stringify(baseline.arcIdPath) !== JSON.stringify(scenario.arcIdPath),
    scenarioUnreachable: scenario.status !== 'found',
    invariantValid,
  };
}
