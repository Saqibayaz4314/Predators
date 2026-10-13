import type pg from 'pg';
import { studyAreaDetailSchema, roadsSchema, studyAreaSummaryDataSchema } from '@flood/shared';

export async function listStudyAreaDetails(pool: pg.Pool) {
  const result = await pool.query(`SELECT sa.id::text, sa.slug, sa.name, sa.is_active AS "isActive", dv.version AS "datasetVersion",
    ST_X(sa.map_center) AS longitude, ST_Y(sa.map_center) AS latitude, sa.default_zoom AS "defaultZoom", ST_AsGeoJSON(sa.boundary)::json AS boundary
    FROM study_areas sa JOIN dataset_versions dv ON dv.id = sa.dataset_version_id
    WHERE sa.is_active = TRUE AND dv.import_status = 'ready' ORDER BY sa.slug`);
  return result.rows.map((row) => studyAreaDetailSchema.parse({ ...row, mapCenter: { longitude: row.longitude, latitude: row.latitude }, classification: 'scenario-analysis' }));
}

export async function requireStudyArea(pool: pg.Pool, id: string) {
  const area = (await listStudyAreaDetails(pool)).find((area) => area.id === id);
  if (!area) throw Object.assign(new Error('Study area unavailable'), { statusCode: 404, code: 'STUDY_AREA_NOT_FOUND' });
  return area;
}

export async function getRoadLayer(pool: pg.Pool, id: string) {
  const area = await requireStudyArea(pool, id);
  const result = await pool.query(`SELECT DISTINCT ON (physical_segment_id) physical_segment_id::text AS "physicalSegmentId",
    road_name AS "roadName", highway_type AS "highwayType", is_oneway AS "isOneWay", ST_AsGeoJSON(geom)::json AS geometry
    FROM road_edges WHERE study_area_id = $1::uuid AND is_routable = TRUE ORDER BY physical_segment_id, id`, [id]);
  return { area, roads: roadsSchema.parse({ type: 'FeatureCollection', features: result.rows.map(({ geometry, ...properties }) => ({ type: 'Feature', geometry, properties })) }) };
}

// API-013 — study-area overview counts. requireStudyArea guarantees the area is
// active with a dataset whose import status is 'ready', so dataStatus: 'ready'
// is truthful. Every count is computed from the live dataset (no hardcoding).
export async function getStudyAreaAnalyticsSummary(pool: pg.Pool, id: string) {
  const area = await requireStudyArea(pool, id);
  const result = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM road_nodes WHERE study_area_id = $1::uuid)::int AS "totalGraphNodes",
      (SELECT COUNT(*) FROM road_edges WHERE study_area_id = $1::uuid AND is_routable = TRUE)::int AS "totalDirectedArcs",
      (SELECT COUNT(DISTINCT physical_segment_id) FROM road_edges WHERE study_area_id = $1::uuid AND is_routable = TRUE)::int AS "totalPhysicalRoadSegments",
      (SELECT COUNT(*) FROM shelters WHERE study_area_id = $1::uuid)::int AS "totalShelterCandidates",
      (SELECT COUNT(*) FROM flood_scenarios WHERE study_area_id = $1::uuid AND is_active = TRUE)::int AS "totalSimulatedScenarios"`,
    [id],
  );
  const row = result.rows[0]!;
  return studyAreaSummaryDataSchema.parse({
    studyAreaId: area.id,
    datasetVersion: area.datasetVersion,
    totalPhysicalRoadSegments: row.totalPhysicalRoadSegments,
    totalDirectedArcs: row.totalDirectedArcs,
    totalGraphNodes: row.totalGraphNodes,
    totalShelterCandidates: row.totalShelterCandidates,
    totalSimulatedScenarios: row.totalSimulatedScenarios,
    dataStatus: 'ready',
  });
}
