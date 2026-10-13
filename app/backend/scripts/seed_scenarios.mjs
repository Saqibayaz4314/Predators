#!/usr/bin/env node
/**
 * Flood scenario seed script
 *
 * Seeds 3 simulated flood scenarios with polygon geometries
 * in the Sukkur/Rohri study area bbox (lon 68.80-68.97, lat 27.63-27.79).
 *
 * These are HYPOTHETICAL SIMULATED POLYGONS.
 * They do not represent actual flood events, forecasts, or official data.
 *
 * Run: node scripts/seed_scenarios.mjs
 *
 * Safety: uses INSERT ... ON CONFLICT DO NOTHING (idempotent).
 * Never drops or truncates existing data.
 *
 * Polygon coordinates verified to intersect real imported road segments:
 *   - Scenario 01: small area near Sukkur city center
 *   - Scenario 02: larger area crossing Sukkur-Rohri connector
 *   - Scenario 03: wide area causing significant network disruption
 */

import pg from 'pg';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env'), override: false });

const STUDY_AREA_ID  = '020ce29e-ec4f-4514-b14f-58c1252191cc';

// ---------------------------------------------------------------------------
// Scenario definitions
// Each polygon is a GeoJSON MultiPolygon in EPSG:4326.
// Coordinates are within Sukkur bbox: lon 68.80-68.97, lat 27.63-27.79.
// ---------------------------------------------------------------------------

const SCENARIOS = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    slug: 'scenario-01-localized',
    title: 'Scenario 01 — Localized Flood',
    description: 'Simulated localized flooding in southern Sukkur urban area. Limited road impact expected.',
    displayOrder: 1,
    methodology: 'PostGIS ST_Intersects against a simulated hypothetical flood polygon. Not a real forecast.',
    zones: [
      {
        id: 'b0000001-0001-4000-8000-000000000001',
        label: 'Zone A — Southern Sukkur (simulated)',
        // Small rectangle in southern Sukkur urban grid
        geojson: {
          type: 'MultiPolygon',
          coordinates: [[
            [
              [68.860, 27.690],
              [68.875, 27.690],
              [68.875, 27.700],
              [68.860, 27.700],
              [68.860, 27.690],
            ],
          ]],
        },
      },
    ],
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    slug: 'scenario-02-reroute',
    title: 'Scenario 02 — Bridge Corridor Flood',
    description: 'Simulated flooding along the Sukkur-Rohri corridor. Baseline route affected. Rerouting expected.',
    displayOrder: 2,
    methodology: 'PostGIS ST_Intersects against a simulated hypothetical flood polygon. Not a real forecast.',
    zones: [
      {
        id: 'b0000002-0002-4000-8000-000000000002',
        label: 'Zone B — Barrage/Indus Corridor (simulated)',
        // Wider rectangle crossing the main N55 corridor near Sukkur Barrage
        geojson: {
          type: 'MultiPolygon',
          coordinates: [[
            [
              [68.855, 27.700],
              [68.900, 27.700],
              [68.900, 27.720],
              [68.855, 27.720],
              [68.855, 27.700],
            ],
          ]],
        },
      },
    ],
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    slug: 'scenario-03-wide-disruption',
    title: 'Scenario 03 — Wide Flood Disruption',
    description: 'Simulated large-scale flooding covering significant portions of Sukkur/Rohri network.',
    displayOrder: 3,
    methodology: 'PostGIS ST_Intersects against a simulated hypothetical flood polygon. Not a real forecast.',
    zones: [
      {
        id: 'b0000003-0003-4000-8000-000000000003',
        label: 'Zone C — Northern Sukkur (simulated)',
        geojson: {
          type: 'MultiPolygon',
          coordinates: [[
            [
              [68.840, 27.720],
              [68.920, 27.720],
              [68.920, 27.760],
              [68.840, 27.760],
              [68.840, 27.720],
            ],
          ]],
        },
      },
      {
        id: 'b0000004-0003-4000-8000-000000000004',
        label: 'Zone D — Eastern Rohri (simulated)',
        geojson: {
          type: 'MultiPolygon',
          coordinates: [[
            [
              [68.890, 27.680],
              [68.950, 27.680],
              [68.950, 27.710],
              [68.890, 27.710],
              [68.890, 27.680],
            ],
          ]],
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 2,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const scenario of SCENARIOS) {
      // Upsert scenario (idempotent)
      await client.query(
        `INSERT INTO flood_scenarios (
           id, study_area_id, slug, title, description,
           is_active, display_order, scenario_type
         ) VALUES (
           $1::uuid, $2::uuid, $3, $4, $5,
           TRUE, $6, 'simulated'
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          scenario.id,
          STUDY_AREA_ID,
          scenario.slug,
          scenario.title,
          scenario.description,
          scenario.displayOrder,
        ],
      );

      for (const zone of scenario.zones) {
        const geomWkt = JSON.stringify(zone.geojson);
        await client.query(
          `INSERT INTO flood_zones (
             id, scenario_id, zone_label, methodology, geom
           ) VALUES (
             $1::uuid, $2::uuid, $3, $4,
             ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)
           )
           ON CONFLICT (id) DO NOTHING`,
          [zone.id, scenario.id, zone.label, scenario.methodology, geomWkt],
        );
      }

      console.log(`  ✓ Seeded: ${scenario.title}`);
    }

    await client.query('COMMIT');
    console.log('\nSeed complete — 3 simulated scenarios, 4 zones.');
    console.log('DISCLAIMER: These are hypothetical flood polygons for demonstration only.');
  } catch (err) {
    await client.query('ROLLBACK');
    // Redact credentials from error message
    const safe = (err instanceof Error ? err.message : String(err))
      .replace(/password=[^ ]*/gi, 'password=[REDACTED]');
    console.error('Seed failed (rolled back):', safe);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
