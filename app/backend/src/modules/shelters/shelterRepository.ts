import type pg from 'pg';
import { geoPointSchema } from '@flood/shared';

export interface ShelterRecord {
  id: string; name: string; location: { longitude: number; latitude: number } | null;
  capacity: number | null; dataStatus: 'verified' | 'unverified' | 'demonstration'; sourceName: string | null;
}
/** Spatial reads only. Revalidate locations; stale stored node associations are not trusted. */
export async function readShelterRecords(pool: pg.Pool, studyAreaId: string): Promise<ShelterRecord[]> {
  const rows = await pool.query(`SELECT id::text, name, capacity, data_status AS "dataStatus", source_name AS "sourceName",
    CASE WHEN NOT ST_IsEmpty(geom) AND ST_IsValid(geom) AND ST_SRID(geom) = 4326 AND ST_GeometryType(geom) = 'ST_Point'
    THEN json_build_object('longitude', ST_X(geom), 'latitude', ST_Y(geom)) ELSE NULL END AS location
    FROM shelters WHERE study_area_id = $1::uuid ORDER BY name, id`, [studyAreaId]);
  return rows.rows.map((row) => {
    const location = geoPointSchema.safeParse(row.location);
    return { ...row, location: location.success ? location.data : null } as ShelterRecord;
  });
}

/** Separately flag candidate locations intersecting a hypothetical polygon. */
export async function readFloodFlags(pool: pg.Pool, scenarioId: string, records: readonly ShelterRecord[]): Promise<Map<string, boolean | null>> {
  const flags = new Map(records.map((record) => [record.id, record.location ? false : null]));
  if (scenarioId === 'baseline' || !records.some((record) => record.location)) return flags;
  const points = records.filter((record) => record.location).map((record) => ({ id: record.id, lon: record.location!.longitude, lat: record.location!.latitude }));
  const result = await pool.query<{ id: string; intersects: boolean }>(`SELECT p.id, EXISTS (
    SELECT 1 FROM flood_zones z WHERE z.scenario_id = $1::uuid AND ST_Intersects(z.geom, ST_SetSRID(ST_MakePoint(p.lon, p.lat), 4326))) AS intersects
    FROM jsonb_to_recordset($2::jsonb) AS p(id text, lon double precision, lat double precision)`, [scenarioId, JSON.stringify(points)]);
  for (const row of result.rows) flags.set(row.id, row.intersects);
  return flags;
}
