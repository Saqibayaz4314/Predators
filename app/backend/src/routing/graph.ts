/**
 * ROUTE-01 — Graph Types and Loader
 *
 * Defines the in-memory graph model and loads it from PostGIS.
 *
 * Key decisions:
 *   - All BIGINT IDs stored as strings (precision safety).
 *   - Graph is immutable after construction (ReadonlyMap).
 *   - adjacency maps source_node_id → outgoing arcs only.
 *   - Graph is loaded once and cached per study area (see graphCache.ts).
 *   - Geometry is stored as parsed GeoJSON LineString per arc.
 */

import type pg from 'pg';

// ---------------------------------------------------------------------------
// Types — match docs/09-ROUTING-ALGORITHMS.md section 4
// ---------------------------------------------------------------------------

export interface GraphNode {
  readonly id: string;          // BIGINT as string
  readonly longitude: number;
  readonly latitude: number;
}

export interface GraphArc {
  readonly id: string;               // BIGINT as string
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly physicalSegmentId: string;
  readonly lengthMeters: number;
  readonly geometry: GeoJSON.LineString;
}

export interface RoadGraph {
  readonly studyAreaId: string;
  readonly datasetVersion: string;
  readonly nodes: ReadonlyMap<string, GraphNode>;
  readonly arcs: ReadonlyMap<string, GraphArc>;
  readonly adjacency: ReadonlyMap<string, readonly GraphArc[]>;
  readonly loadedAt: Date;
  readonly arcCount: number;
  readonly nodeCount: number;
}

// ---------------------------------------------------------------------------
// Graph loader — reads from PostGIS using parameterized SQL
// ---------------------------------------------------------------------------

/** Load all routable edges for a study area from PostGIS. */
async function loadArcs(
  client: pg.PoolClient | pg.Pool,
  studyAreaId: string,
): Promise<Map<string, GraphArc>> {
  const result = await client.query<{
    id: string;
    source_node_id: string;
    target_node_id: string;
    physical_segment_id: string;
    length_m: string;
    geometry: string;
  }>(
    `SELECT
       id::text,
       source_node_id::text,
       target_node_id::text,
       physical_segment_id::text,
       length_m::text,
       ST_AsGeoJSON(geom)::text AS geometry
     FROM road_edges
     WHERE study_area_id = $1::uuid
       AND is_routable = TRUE
     ORDER BY id`,
    [studyAreaId],
  );

  const arcs = new Map<string, GraphArc>();
  for (const row of result.rows) {
    const lengthMeters = parseFloat(row.length_m);
    if (!isFinite(lengthMeters) || lengthMeters <= 0) continue; // skip invalid
    arcs.set(row.id, {
      id: row.id,
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      physicalSegmentId: row.physical_segment_id,
      lengthMeters,
      geometry: JSON.parse(row.geometry) as GeoJSON.LineString,
    });
  }
  return arcs;
}

/** Load all road nodes for a study area from PostGIS. */
async function loadNodes(
  client: pg.PoolClient | pg.Pool,
  studyAreaId: string,
): Promise<Map<string, GraphNode>> {
  const result = await client.query<{
    id: string;
    longitude: string;
    latitude: string;
  }>(
    `SELECT
       id::text,
       ST_X(geom) AS longitude,
       ST_Y(geom) AS latitude
     FROM road_nodes
     WHERE study_area_id = $1::uuid
     ORDER BY id`,
    [studyAreaId],
  );

  const nodes = new Map<string, GraphNode>();
  for (const row of result.rows) {
    nodes.set(row.id, {
      id: row.id,
      longitude: parseFloat(row.longitude),
      latitude: parseFloat(row.latitude),
    });
  }
  return nodes;
}

/** Build forward adjacency list from arc collection. */
export function buildAdjacency(
  arcs: ReadonlyMap<string, GraphArc>,
): Map<string, GraphArc[]> {
  const adjacency = new Map<string, GraphArc[]>();
  for (const arc of arcs.values()) {
    const outgoing = adjacency.get(arc.sourceNodeId) ?? [];
    outgoing.push(arc);
    adjacency.set(arc.sourceNodeId, outgoing);
  }
  return adjacency;
}

/** Validate loaded graph — throws if invariants are violated. */
function validateGraph(
  nodes: Map<string, GraphNode>,
  arcs: Map<string, GraphArc>,
): void {
  let orphans = 0;
  for (const arc of arcs.values()) {
    if (!nodes.has(arc.sourceNodeId)) orphans++;
    if (!nodes.has(arc.targetNodeId)) orphans++;
    if (orphans > 0) break; // fail fast
  }
  if (orphans > 0) {
    throw new Error(`Graph validation failed: ${orphans} orphaned node references`);
  }
  if (nodes.size === 0) {
    throw new Error('Graph validation failed: no nodes loaded');
  }
  if (arcs.size === 0) {
    throw new Error('Graph validation failed: no arcs loaded');
  }
}

/**
 * Load the complete road graph for a study area from PostGIS.
 *
 * @param client pg.Pool or pg.PoolClient
 * @param studyAreaId UUID of the active study area
 * @param datasetVersion version string for cache key
 */
export async function loadRoadGraph(
  client: pg.PoolClient | pg.Pool,
  studyAreaId: string,
  datasetVersion: string,
): Promise<RoadGraph> {
  const [arcs, nodes] = await Promise.all([
    loadArcs(client, studyAreaId),
    loadNodes(client, studyAreaId),
  ]);

  validateGraph(nodes, arcs);

  const adjacency = buildAdjacency(arcs);

  return {
    studyAreaId,
    datasetVersion,
    nodes: nodes as ReadonlyMap<string, GraphNode>,
    arcs:  arcs  as ReadonlyMap<string, GraphArc>,
    adjacency: adjacency as ReadonlyMap<string, readonly GraphArc[]>,
    loadedAt: new Date(),
    arcCount: arcs.size,
    nodeCount: nodes.size,
  };
}
