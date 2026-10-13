#!/usr/bin/env node
/**
 * Verify flood intersection — quick diagnostic
 * Checks how many physical segments each scenario blocks.
 */
import pg from 'pg';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env'), override: false });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
});

const STUDY_AREA_ID = '020ce29e-ec4f-4514-b14f-58c1252191cc';

async function verify() {
  const client = await pool.connect();
  try {
    // List scenarios
    const scenarios = await client.query(
      `SELECT id::text, slug, title FROM flood_scenarios WHERE study_area_id = $1::uuid ORDER BY display_order`,
      [STUDY_AREA_ID]
    );
    console.log(`\nScenarios in DB: ${scenarios.rows.length}`);

    for (const s of scenarios.rows) {
      // Count zones
      const zones = await client.query(
        `SELECT COUNT(*) AS cnt FROM flood_zones WHERE scenario_id = $1::uuid`,
        [s.id]
      );
      // Count affected segments
      const impact = await client.query(
        `WITH affected AS (
           SELECT DISTINCT e.physical_segment_id
           FROM flood_zones z
           JOIN road_edges e
             ON e.study_area_id = $2::uuid
            AND e.is_routable = TRUE
            AND e.geom && z.geom
            AND ST_Intersects(e.geom, z.geom)
           WHERE z.scenario_id = $1::uuid
         )
         SELECT COUNT(*) AS affected_segments FROM affected`,
        [s.id, STUDY_AREA_ID]
      );
      // Count blocked arcs
      const arcs = await client.query(
        `WITH affected AS (
           SELECT DISTINCT e.physical_segment_id
           FROM flood_zones z
           JOIN road_edges e
             ON e.study_area_id = $2::uuid
            AND e.is_routable = TRUE
            AND e.geom && z.geom
            AND ST_Intersects(e.geom, z.geom)
           WHERE z.scenario_id = $1::uuid
         )
         SELECT COUNT(e.id) AS blocked_arcs
         FROM road_edges e
         JOIN affected a ON a.physical_segment_id = e.physical_segment_id
         WHERE e.study_area_id = $2::uuid AND e.is_routable = TRUE`,
        [s.id, STUDY_AREA_ID]
      );

      console.log(`\n${s.title}`);
      console.log(`  Zones: ${zones.rows[0].cnt}`);
      console.log(`  Affected segments: ${impact.rows[0].affected_segments}`);
      console.log(`  Blocked arcs: ${arcs.rows[0].blocked_arcs}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

verify().catch((e) => {
  console.error('Error:', e.message.replace(/password=[^ ]*/gi, '[REDACTED]'));
  process.exit(1);
});
