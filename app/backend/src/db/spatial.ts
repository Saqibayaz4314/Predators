/**
 * Spatial query helpers — parameterized PostGIS SQL.
 *
 * All queries use $N parameters to prevent SQL injection.
 * Geometry values are passed as WKT or GeoJSON strings, not interpolated.
 *
 * These are the foundational spatial queries for flood impact analysis.
 * Full business-logic wiring belongs to the flood and routing modules (FLOOD-03+).
 */
import type pg from 'pg';

// ---------------------------------------------------------------------------
// Query: Find affected physical road segment IDs for a flood scenario
// ---------------------------------------------------------------------------
export interface AffectedSegmentRow {
  physical_segment_id: string; // BIGINT returned as string per ADR-016
}

/**
 * Returns the set of physical_segment_id values whose directed-edge geometry
 * intersects any flood zone polygon for the given scenario.
 *
 * Deduplicates so forward/reverse arcs of the same road count once.
 */
export async function queryAffectedSegmentIds(
  client: pg.PoolClient | pg.Pool,
  scenarioId: string,
): Promise<string[]> {
  const result = await client.query<AffectedSegmentRow>(
    `SELECT DISTINCT e.physical_segment_id::text
     FROM road_edges AS e
     JOIN flood_scenarios AS s
       ON s.study_area_id = e.study_area_id
     JOIN flood_zones AS z
       ON z.scenario_id = s.id
     WHERE s.id = $1::uuid
       AND e.is_routable = TRUE
       AND e.geom && z.geom
       AND ST_Intersects(e.geom, z.geom)`,
    [scenarioId],
  );
  return result.rows.map((row) => row.physical_segment_id);
}

// ---------------------------------------------------------------------------
// Query: Find directed edge IDs to block for a flood scenario
// ---------------------------------------------------------------------------
export interface BlockedEdgeRow {
  id: string; // BIGINT returned as string per ADR-016
}

/**
 * Returns every directed road_edge ID that must be blocked for the given
 * scenario. Both forward and reverse arcs of affected physical segments
 * are included.
 */
export async function queryBlockedEdgeIds(
  client: pg.PoolClient | pg.Pool,
  scenarioId: string,
): Promise<string[]> {
  const result = await client.query<BlockedEdgeRow>(
    `WITH affected_segments AS (
       SELECT DISTINCT e.physical_segment_id
       FROM road_edges AS e
       JOIN flood_scenarios AS s
         ON s.study_area_id = e.study_area_id
       JOIN flood_zones AS z
         ON z.scenario_id = s.id
       WHERE s.id = $1::uuid
         AND e.is_routable = TRUE
         AND e.geom && z.geom
         AND ST_Intersects(e.geom, z.geom)
     )
     SELECT e.id::text
     FROM road_edges AS e
     JOIN flood_scenarios AS s
       ON s.study_area_id = e.study_area_id
     JOIN affected_segments AS a
       ON a.physical_segment_id = e.physical_segment_id
     WHERE s.id = $1::uuid
       AND e.is_routable = TRUE`,
    [scenarioId],
  );
  return result.rows.map((row) => row.id);
}

// ---------------------------------------------------------------------------
// Query: Count of affected physical road segments
// ---------------------------------------------------------------------------
export async function queryAffectedSegmentCount(
  client: pg.PoolClient | pg.Pool,
  scenarioId: string,
): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(DISTINCT e.physical_segment_id)::text AS count
     FROM road_edges AS e
     JOIN flood_scenarios AS s
       ON s.study_area_id = e.study_area_id
     JOIN flood_zones AS z
       ON z.scenario_id = s.id
     WHERE s.id = $1::uuid
       AND e.is_routable = TRUE
       AND ST_Intersects(e.geom, z.geom)`,
    [scenarioId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

// ---------------------------------------------------------------------------
// Query: Find candidate nearest road nodes (for snapping)
// ---------------------------------------------------------------------------
export interface NearestNodeRow {
  id: string;         // BIGINT as string
  distance_m: number; // Exact geography distance
}

/**
 * Returns up to 10 nearest road nodes ordered by spatial proximity (KNN).
 * The caller should then evaluate exact geography distance, graph
 * connectivity, and the maximum allowed snap distance.
 *
 * @param pointWkt WKT like 'POINT(lng lat)'
 * @param studyAreaId UUID string
 */
export async function queryNearestNodes(
  client: pg.PoolClient | pg.Pool,
  pointWkt: string,
  studyAreaId: string,
): Promise<NearestNodeRow[]> {
  const result = await client.query<NearestNodeRow>(
    `SELECT
       n.id::text,
       ST_Distance(
         n.geom::geography,
         ST_GeomFromText($1, 4326)::geography
       ) AS distance_m
     FROM road_nodes AS n
     WHERE n.study_area_id = $2::uuid
     ORDER BY n.geom <-> ST_GeomFromText($1, 4326)
     LIMIT 10`,
    [pointWkt, studyAreaId],
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Query: Load routable graph edges for a study area
// ---------------------------------------------------------------------------
export interface RoutableEdgeRow {
  id: string;
  source_node_id: string;
  target_node_id: string;
  physical_segment_id: string;
  length_m: number;
  geometry: object; // Parsed GeoJSON from ST_AsGeoJSON
}

/**
 * Returns all routable directed edges for graph construction.
 * Geometry is included for route assembly; avoid calling repeatedly
 * per-request — cache the result in the graph module.
 */
export async function queryRoutableEdges(
  client: pg.PoolClient | pg.Pool,
  studyAreaId: string,
): Promise<RoutableEdgeRow[]> {
  const result = await client.query<{
    id: string;
    source_node_id: string;
    target_node_id: string;
    physical_segment_id: string;
    length_m: number;
    geometry: string;
  }>(
    `SELECT
       id::text,
       source_node_id::text,
       target_node_id::text,
       physical_segment_id::text,
       length_m,
       ST_AsGeoJSON(geom)::text AS geometry
     FROM road_edges
     WHERE study_area_id = $1::uuid
       AND is_routable = TRUE
     ORDER BY id`,
    [studyAreaId],
  );
  return result.rows.map((row) => ({
    ...row,
    geometry: JSON.parse(row.geometry) as object,
  }));
}

// ---------------------------------------------------------------------------
// Query: Load road nodes for a study area (visualization / snapping)
// ---------------------------------------------------------------------------
export interface RoadNodeRow {
  id: string;
  lon: number;
  lat: number;
  source_osm_id: string | null;
}

/**
 * Returns road nodes as plain coordinates.
 * Used by the routing engine to build adjacency lists and by the frontend
 * to render clickable node markers.
 */
export async function queryRoadNodes(
  client: pg.PoolClient | pg.Pool,
  studyAreaId: string,
): Promise<RoadNodeRow[]> {
  const result = await client.query<{
    id: string;
    lon: string;
    lat: string;
    source_osm_id: string | null;
  }>(
    `SELECT
       n.id::text,
       ST_X(n.geom) AS lon,
       ST_Y(n.geom) AS lat,
       n.source_osm_id::text
     FROM road_nodes n
     WHERE n.study_area_id = $1::uuid
     ORDER BY n.id`,
    [studyAreaId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    lon: parseFloat(row.lon),
    lat: parseFloat(row.lat),
    source_osm_id: row.source_osm_id,
  }));
}

// ---------------------------------------------------------------------------
// Query: Road segments for map display (deduplicated to physical segments)
// ---------------------------------------------------------------------------
export interface RoadSegmentDisplayRow {
  physical_segment_id: string;
  highway_type: string;
  road_name: string | null;
  length_m: number;
  geometry: object;
}

/**
 * Returns unique physical road segments for frontend map rendering.
 *
 * Uses DISTINCT ON (physical_segment_id) to return each physical road
 * segment exactly once — avoids double-rendering bidirectional arcs.
 */
export async function queryRoadSegmentsForDisplay(
  client: pg.PoolClient | pg.Pool,
  studyAreaId: string,
): Promise<RoadSegmentDisplayRow[]> {
  const result = await client.query<{
    physical_segment_id: string;
    highway_type: string;
    road_name: string | null;
    length_m: number;
    geometry: string;
  }>(
    `SELECT DISTINCT ON (physical_segment_id)
       physical_segment_id::text,
       highway_type,
       road_name,
       length_m,
       ST_AsGeoJSON(geom)::text AS geometry
     FROM road_edges
     WHERE study_area_id = $1::uuid
       AND is_routable = TRUE
     ORDER BY physical_segment_id, id`,
    [studyAreaId],
  );
  return result.rows.map((row) => ({
    ...row,
    geometry: JSON.parse(row.geometry) as object,
  }));
}
