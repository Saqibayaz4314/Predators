/**
 * API-01 / ROUTE-09 — Route Service
 *
 * Wires together:
 *   graph cache → flood impact → Dijkstra → response
 *
 * The graph is loaded once and cached in memory.
 * Flood impact is computed per-request (fast: ~10ms on real graph).
 * Routing is O(E log V) in-memory Dijkstra.
 *
 * Public functions:
 *   snapPoint()     — snap lon/lat to nearest graph node
 *   calculateRoute()  — single route (baseline or scenario)
 *   compareRoutes()   — baseline vs scenario in one call
 */

import type pg from 'pg';
import {
  getOrLoadGraph,
  snapToNearestNodeInMemory,
  dijkstra as runDijkstra,
  compareRoutes as compareRouteResults,
} from '../../routing/index.js';
import { computeScenarioImpact, getActiveScenario } from '../flood/floodService.js';
import { requireStudyArea } from '../studyAreas.js';

// ---------------------------------------------------------------------------
// Known study area config
// ---------------------------------------------------------------------------
// Exported for startup graph warmup and the /ready self-healing trigger.
export const STUDY_AREA_ID  = '020ce29e-ec4f-4514-b14f-58c1252191cc';
export const DATASET_VERSION = 'sukkur-osm-2026-10-v1';
const MAX_SNAP_M = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveStudyArea(pool: pg.Pool, studyAreaId: string): Promise<{
  studyAreaId: string;
  datasetVersion: string;
}> {
  // For MVP: single study area
  if (studyAreaId !== STUDY_AREA_ID) {
    throw Object.assign(new Error('Study area not found'), { statusCode: 404, code: 'STUDY_AREA_NOT_FOUND' });
  }
  const area = await requireStudyArea(pool, studyAreaId);
  return { studyAreaId: area.id, datasetVersion: area.datasetVersion };
}

function assertVersionMatch(expectedVersion: string | undefined, actualVersion: string): void {
  if (expectedVersion && expectedVersion !== actualVersion) {
    throw Object.assign(
      new Error(`Dataset version mismatch: expected ${expectedVersion}, actual ${actualVersion}`),
      { statusCode: 409, code: 'DATASET_VERSION_MISMATCH' },
    );
  }
}

// ---------------------------------------------------------------------------
// Snap
// ---------------------------------------------------------------------------

export interface SnapInput {
  studyAreaId: string;
  longitude: number;
  latitude: number;
}

export interface SnapOutput {
  nodeId: string;
  snappedPoint: { longitude: number; latitude: number };
  snapDistanceMeters: number;
  datasetVersion: string;
}

export async function snapPoint(
  pool: pg.Pool,
  input: SnapInput,
): Promise<SnapOutput> {
  const { studyAreaId, datasetVersion } = await resolveStudyArea(pool, input.studyAreaId);
  const graph = await getOrLoadGraph(pool, studyAreaId, datasetVersion);

  const snap = snapToNearestNodeInMemory(graph, input.longitude, input.latitude, MAX_SNAP_M);
  if (!snap) {
    throw Object.assign(
      new Error('No road node within 500m of the provided coordinates.'),
      { statusCode: 404, code: 'NO_NEARBY_ROAD_NODE' },
    );
  }

  return {
    nodeId: snap.nodeId,
    snappedPoint: { longitude: snap.longitude, latitude: snap.latitude },
    snapDistanceMeters: snap.distanceMeters,
    datasetVersion,
  };
}

// ---------------------------------------------------------------------------
// Single route
// ---------------------------------------------------------------------------

export interface RouteInput {
  studyAreaId: string;
  scenarioId: string;      // UUID or "baseline"
  originNodeId: string;
  destinationNodeId: string;
  expectedDatasetVersion?: string;
}

export type RouteOutput =
  | {
      status: 'reachable';
      studyAreaId: string;
      scenarioId: string;
      datasetVersion: string;
      originNodeId: string;
      destinationNodeId: string;
      distanceMeters: number;
      arcIds: readonly string[];
      geometry: GeoJSON.LineString | null;
    }
  | {
      status: 'unreachable';
      studyAreaId: string;
      scenarioId: string;
      datasetVersion: string;
      originNodeId: string;
      destinationNodeId: string;
      distanceMeters: null;
      geometry: null;
      reason: 'disconnected' | 'scenario_blocked';
    };

export async function calculateRoute(
  pool: pg.Pool,
  input: RouteInput,
): Promise<RouteOutput> {
  const { studyAreaId, datasetVersion } = await resolveStudyArea(pool, input.studyAreaId);
  assertVersionMatch(input.expectedDatasetVersion, datasetVersion);

  const graph = await getOrLoadGraph(pool, studyAreaId, datasetVersion);

  // Validate nodes exist in graph
  if (!graph.nodes.has(input.originNodeId)) {
    throw Object.assign(new Error('Origin node not found in graph'), { statusCode: 404, code: 'ORIGIN_NODE_NOT_FOUND' });
  }
  if (!graph.nodes.has(input.destinationNodeId)) {
    throw Object.assign(new Error('Destination node not found in graph'), { statusCode: 404, code: 'DESTINATION_NODE_NOT_FOUND' });
  }

  // Resolve blocked arcs
  let blockedArcIds = new Set<string>();
  if (input.scenarioId !== 'baseline') {
    // Validate scenario exists and belongs to study area
    const scenario = await getActiveScenario(pool, input.scenarioId);
    if (!scenario) {
      throw Object.assign(new Error('Scenario not found or inactive'), { statusCode: 404, code: 'SCENARIO_NOT_FOUND' });
    }
    if (scenario.studyAreaId !== studyAreaId) {
      throw Object.assign(new Error('Scenario belongs to a different study area'), { statusCode: 409, code: 'SCENARIO_STUDY_AREA_MISMATCH' });
    }
    const impact = await computeScenarioImpact(pool, input.scenarioId, studyAreaId, datasetVersion);
    blockedArcIds = impact.blockedArcIds;
  }

  const result = runDijkstra(graph, {
    originNodeId: input.originNodeId,
    destinationNodeId: input.destinationNodeId,
    blockedArcIds,
  });

  if (result.status === 'invalid_origin') {
    throw Object.assign(new Error('Origin node not found in graph'), { statusCode: 404, code: 'ORIGIN_NODE_NOT_FOUND' });
  }
  if (result.status === 'invalid_destination') {
    throw Object.assign(new Error('Destination node not found in graph'), { statusCode: 404, code: 'DESTINATION_NODE_NOT_FOUND' });
  }

  if (result.status === 'found') {
    return {
      status: 'reachable',
      studyAreaId,
      scenarioId: input.scenarioId,
      datasetVersion,
      originNodeId: input.originNodeId,
      destinationNodeId: input.destinationNodeId,
      distanceMeters: Math.round(result.totalDistanceMeters * 10) / 10,
      arcIds: result.arcIdPath,
      geometry: result.geometry.coordinates.length >= 2 ? result.geometry : null,
    };
  }

  // unreachable
  const baselineReachable = input.scenarioId !== 'baseline' && runDijkstra(graph, {
    originNodeId: input.originNodeId, destinationNodeId: input.destinationNodeId, blockedArcIds: new Set(),
  }).status === 'found';
  const reason = baselineReachable ? 'scenario_blocked' : 'disconnected';

  return {
    status: 'unreachable',
    studyAreaId,
    scenarioId: input.scenarioId,
    datasetVersion,
    originNodeId: input.originNodeId,
    destinationNodeId: input.destinationNodeId,
    distanceMeters: null,
    geometry: null,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Compare baseline vs scenario
// ---------------------------------------------------------------------------

export interface CompareInput {
  studyAreaId: string;
  scenarioId: string;      // UUID (not "baseline")
  originNodeId: string;
  destinationNodeId: string;
  expectedDatasetVersion?: string;
}

export type CompareOutcome = 'unchanged' | 'rerouted' | 'unreachable' | 'baseline_unreachable';

export interface CompareOutput {
  studyAreaId: string;
  scenarioId: string;
  datasetVersion: string;
  baseline: RouteOutput;
  scenario: RouteOutput;
  distanceChangeMeters: number | null;
  distanceChangePercent: number | null;
  outcome: CompareOutcome;
}

export async function compareScenarioRoute(
  pool: pg.Pool,
  input: CompareInput,
): Promise<CompareOutput> {
  const { studyAreaId, datasetVersion } = await resolveStudyArea(pool, input.studyAreaId);
  assertVersionMatch(input.expectedDatasetVersion, datasetVersion);

  const graph = await getOrLoadGraph(pool, studyAreaId, datasetVersion);

  if (!graph.nodes.has(input.originNodeId)) {
    throw Object.assign(new Error('Origin node not found'), { statusCode: 404, code: 'ORIGIN_NODE_NOT_FOUND' });
  }
  if (!graph.nodes.has(input.destinationNodeId)) {
    throw Object.assign(new Error('Destination node not found'), { statusCode: 404, code: 'DESTINATION_NODE_NOT_FOUND' });
  }

  // Validate + load scenario
  const scenario = await getActiveScenario(pool, input.scenarioId);
  if (!scenario) {
    throw Object.assign(new Error('Scenario not found or inactive'), { statusCode: 404, code: 'SCENARIO_NOT_FOUND' });
  }
  if (scenario.studyAreaId !== studyAreaId) {
    throw Object.assign(new Error('Scenario belongs to a different study area'), { statusCode: 409, code: 'SCENARIO_STUDY_AREA_MISMATCH' });
  }

  // Compute impact (intersection)
  const impact = await computeScenarioImpact(pool, input.scenarioId, studyAreaId, datasetVersion);

  // Run both routes
  const baselineResult = runDijkstra(graph, {
    originNodeId: input.originNodeId,
    destinationNodeId: input.destinationNodeId,
    blockedArcIds: new Set<string>(),
  });

  const scenarioResult = runDijkstra(graph, {
    originNodeId: input.originNodeId,
    destinationNodeId: input.destinationNodeId,
    blockedArcIds: impact.blockedArcIds,
  });

  // Build RouteOutput objects
  const baselineOut: RouteOutput = baselineResult.status === 'found'
    ? {
        status: 'reachable',
        studyAreaId,
        scenarioId: 'baseline',
        datasetVersion,
        originNodeId: input.originNodeId,
        destinationNodeId: input.destinationNodeId,
        distanceMeters: Math.round(baselineResult.totalDistanceMeters * 10) / 10,
        arcIds: baselineResult.arcIdPath,
        geometry: baselineResult.geometry.coordinates.length >= 2 ? baselineResult.geometry : null,
      }
    : {
        status: 'unreachable',
        studyAreaId,
        scenarioId: 'baseline',
        datasetVersion,
        originNodeId: input.originNodeId,
        destinationNodeId: input.destinationNodeId,
        distanceMeters: null,
        geometry: null,
        reason: 'disconnected',
      };

  const scenarioOut: RouteOutput = scenarioResult.status === 'found'
    ? {
        status: 'reachable',
        studyAreaId,
        scenarioId: input.scenarioId,
        datasetVersion,
        originNodeId: input.originNodeId,
        destinationNodeId: input.destinationNodeId,
        distanceMeters: Math.round(scenarioResult.totalDistanceMeters * 10) / 10,
        arcIds: scenarioResult.arcIdPath,
        geometry: scenarioResult.geometry.coordinates.length >= 2 ? scenarioResult.geometry : null,
      }
    : {
        status: 'unreachable',
        studyAreaId,
        scenarioId: input.scenarioId,
        datasetVersion,
        originNodeId: input.originNodeId,
        destinationNodeId: input.destinationNodeId,
        distanceMeters: null,
        geometry: null,
        reason: baselineResult.status === 'found' ? 'scenario_blocked' : 'disconnected',
      };

  // Determine outcome and deltas
  let distanceChangeMeters: number | null = null;
  let distanceChangePercent: number | null = null;
  let outcome: CompareOutcome;

  if (baselineOut.status === 'unreachable') {
    outcome = 'baseline_unreachable';
  } else if (scenarioOut.status === 'unreachable') {
    outcome = 'unreachable';
  } else {
    const baseDist  = baselineOut.distanceMeters!;
    const scenDist  = scenarioOut.distanceMeters!;
    distanceChangeMeters  = Math.round((scenDist - baseDist) * 10) / 10;
    distanceChangePercent = baseDist > 0
      ? Math.round(((scenDist - baseDist) / baseDist) * 10000) / 100
      : null;
    // Use compareRoutes internal check
    const cmp = compareRouteResults(baselineResult, scenarioResult);
    if (!cmp.invariantValid) throw new Error('Scenario route distance invariant violated');
    outcome = cmp.routeChanged ? 'rerouted' : 'unchanged';
  }

  return {
    studyAreaId,
    scenarioId: input.scenarioId,
    datasetVersion,
    baseline: baselineOut,
    scenario: scenarioOut,
    distanceChangeMeters,
    distanceChangePercent,
    outcome,
  };
}
