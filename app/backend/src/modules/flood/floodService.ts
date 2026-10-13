/**
 * FLOOD-01 — Flood Intersection Service
 *
 * Determines which physical road segments (and their directed arcs) are
 * affected by a simulated flood scenario using PostGIS ST_Intersects.
 *
 * Rules:
 *  - Boundary contact counts as intersection (ST_Intersects includes boundary).
 *  - Road-impact metrics count DISTINCT physical_segment_id (not arc pairs).
 *  - Routing uses all directed arc IDs belonging to affected segments.
 *  - Baseline = empty blocked set (no DB query needed).
 *  - Read-only: never mutates road_edges.is_routable.
 *  - BIGINT arc IDs returned as strings throughout.
 *
 * Classification: ALL flood scenarios are SIMULATED.
 * This does not imply real-world road closures.
 */

import type pg from 'pg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScenarioRecord {
  id: string;
  studyAreaId: string;
  slug: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  scenarioType: string;
}

// ---------------------------------------------------------------------------
// Scenario repository
// ---------------------------------------------------------------------------

/** Fetch a single active scenario, or null if not found / inactive. */
export async function getActiveScenario(
  pool: pg.Pool,
  scenarioId: string,
): Promise<ScenarioRecord | null> {
  const result = await pool.query<{
    id: string;
    study_area_id: string;
    slug: string;
    title: string;
    description: string | null;
    display_order: number;
    is_active: boolean;
    scenario_type: string;
  }>(
    `SELECT id::text, study_area_id::text, slug, title, description,
            display_order, is_active, scenario_type
     FROM flood_scenarios
     WHERE id = $1::uuid`,
    [scenarioId],
  );

  const row = result.rows[0];
  if (!row || !row.is_active) return null;

  return {
    id: row.id,
    studyAreaId: row.study_area_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    isActive: row.is_active,
    scenarioType: row.scenario_type,
  };
}

/** List all active scenarios for a study area, sorted by display_order. */
export async function listActiveScenarios(
  pool: pg.Pool,
  studyAreaId: string,
): Promise<ScenarioRecord[]> {
  const result = await pool.query<{
    id: string;
    study_area_id: string;
    slug: string;
    title: string;
    description: string | null;
    display_order: number;
    is_active: boolean;
    scenario_type: string;
  }>(
    `SELECT id::text, study_area_id::text, slug, title, description,
            display_order, is_active, scenario_type
     FROM flood_scenarios
     WHERE study_area_id = $1::uuid
       AND is_active = TRUE
     ORDER BY display_order ASC`,
    [studyAreaId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    studyAreaId: row.study_area_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    isActive: row.is_active,
    scenarioType: row.scenario_type,
  }));
}

export interface FloodIntersectionRow {
  directedArcId: string;     // BIGINT as string
  physicalSegmentId: string; // BIGINT as string
}

export interface ScenarioImpact {
  studyAreaId: string;
  scenarioId: string;
  datasetVersion: string;
  closurePolicyVersion: 'intersection-v1';

  totalPhysicalSegments: number;
  affectedPhysicalSegments: number;
  unaffectedPhysicalSegments: number;
  affectedRoadPercentage: number | null;

  totalDirectedArcs: number;
  blockedDirectedArcs: number;

  affectedPhysicalSegmentIds: string[];

  // Internal use only — not exposed in public response
  blockedArcIds: Set<string>;

  computedAt: string;
  classification: 'simulated';
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// Core intersection query
// ---------------------------------------------------------------------------


/**
 * Query PostGIS for all directed arcs affected by a scenario's flood zones.
 *
 * Algorithm:
 *   1. Collect all flood_zones for the scenario.
 *   2. Find road_edges whose geom intersects any zone geom (ST_Intersects).
 *   3. Extract DISTINCT physical_segment_ids from those edges.
 *   4. Return ALL directed arcs (both directions of bidirectional segments).
 *
 * Uses the `&&` bounding-box operator first for GiST index acceleration,
 * then ST_Intersects for exact predicate.
 *
 * This query is READ-ONLY. It never mutates road_edges.
 */
export async function queryFloodIntersection(
  pool: pg.Pool,
  scenarioId: string,
  studyAreaId: string,
): Promise<FloodIntersectionRow[]> {
  const result = await pool.query<{
    directed_arc_id: string;
    physical_segment_id: string;
  }>(
    `WITH affected_segments AS (
       SELECT DISTINCT e.physical_segment_id
       FROM flood_zones  AS z
       JOIN road_edges   AS e
         ON e.study_area_id = $2::uuid
        AND e.is_routable = TRUE
        AND e.geom && z.geom
        AND ST_Intersects(e.geom, z.geom)
       WHERE z.scenario_id = $1::uuid
     )
     SELECT
       e.id::text              AS directed_arc_id,
       e.physical_segment_id::text AS physical_segment_id
     FROM road_edges       AS e
     JOIN affected_segments AS a
       ON a.physical_segment_id = e.physical_segment_id
     WHERE e.study_area_id = $2::uuid
       AND e.is_routable = TRUE
     ORDER BY e.id`,
    [scenarioId, studyAreaId],
  );

  return result.rows.map((row) => ({
    directedArcId: row.directed_arc_id,
    physicalSegmentId: row.physical_segment_id,
  }));
}

/** Count total distinct physical segments and directed arcs for a study area. */
async function getGraphTotals(
  pool: pg.Pool,
  studyAreaId: string,
): Promise<{ totalSegments: number; totalArcs: number }> {
  const result = await pool.query<{
    total_segments: string;
    total_arcs: string;
  }>(
    `SELECT
       COUNT(DISTINCT physical_segment_id)::text AS total_segments,
       COUNT(*)::text                            AS total_arcs
     FROM road_edges
     WHERE study_area_id = $1::uuid
       AND is_routable = TRUE`,
    [studyAreaId],
  );

  const row = result.rows[0];
  return {
    totalSegments: row ? parseInt(row.total_segments, 10) : 0,
    totalArcs: row ? parseInt(row.total_arcs, 10) : 0,
  };
}

// ---------------------------------------------------------------------------
// Public API: compute flood impact
// ---------------------------------------------------------------------------

const DISCLAIMER =
  'This analysis is based on a simulated hypothetical flood scenario. ' +
  'It does not represent confirmed real-world road closures, official ' +
  'emergency guidance, or verified flood extents. Results are for ' +
  'scenario-analysis and demonstration purposes only.';

/**
 * Compute the blocked arc set and impact metrics for a scenario.
 *
 * For baseline: returns empty blocked set immediately (no DB query).
 * For scenarios: runs PostGIS intersection + builds metrics.
 *
 * @param pool       pg.Pool for DB access
 * @param scenarioId UUID string or "baseline"
 * @param studyAreaId UUID string
 * @param datasetVersion Active dataset version string
 */
export async function computeScenarioImpact(
  pool: pg.Pool,
  scenarioId: string | 'baseline',
  studyAreaId: string,
  datasetVersion: string,
): Promise<ScenarioImpact> {
  const totals = await getGraphTotals(pool, studyAreaId);
  const now = new Date().toISOString();

  // Baseline: no flood zones, empty blocked set
  if (scenarioId === 'baseline') {
    return {
      studyAreaId,
      scenarioId: 'baseline',
      datasetVersion,
      closurePolicyVersion: 'intersection-v1',
      totalPhysicalSegments: totals.totalSegments,
      affectedPhysicalSegments: 0,
      unaffectedPhysicalSegments: totals.totalSegments,
      affectedRoadPercentage: totals.totalSegments > 0 ? 0 : null,
      totalDirectedArcs: totals.totalArcs,
      blockedDirectedArcs: 0,
      affectedPhysicalSegmentIds: [],
      blockedArcIds: new Set<string>(),
      computedAt: now,
      classification: 'simulated',
      disclaimer: DISCLAIMER,
    };
  }

  // Scenario: run intersection
  const rows = await queryFloodIntersection(pool, scenarioId, studyAreaId);

  const affectedSegmentIds = new Set<string>();
  const blockedArcIds = new Set<string>();

  for (const row of rows) {
    affectedSegmentIds.add(row.physicalSegmentId);
    blockedArcIds.add(row.directedArcId);
  }

  const affected = affectedSegmentIds.size;
  const unaffected = totals.totalSegments - affected;
  const pct = totals.totalSegments > 0
    ? Math.round((affected / totals.totalSegments) * 10000) / 100
    : null;

  return {
    studyAreaId,
    scenarioId,
    datasetVersion,
    closurePolicyVersion: 'intersection-v1',
    totalPhysicalSegments: totals.totalSegments,
    affectedPhysicalSegments: affected,
    unaffectedPhysicalSegments: unaffected,
    affectedRoadPercentage: pct,
    totalDirectedArcs: totals.totalArcs,
    blockedDirectedArcs: blockedArcIds.size,
    affectedPhysicalSegmentIds: [...affectedSegmentIds].sort(),
    blockedArcIds,
    computedAt: now,
    classification: 'simulated',
    disclaimer: DISCLAIMER,
  };
}
