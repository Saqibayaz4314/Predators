/**
 * GEO-04 — PostGIS Road Graph Importer (Bulk Insert Version)
 *
 * Uses multi-row VALUES inserts (1000 rows per query) for fast bulk loading.
 * 11940 nodes + 29448 edges should import in ~30-60 seconds.
 *
 * Safety:
 *   - Checks for existing dataset_version before inserting (idempotent).
 *   - Never drops or truncates tables.
 *   - Uses transactions.
 *   - Verifies DB size before and after.
 *   - Never logs credentials.
 *
 * Usage:
 *   node scripts/import_road_graph.mjs --data dataset/processed/sukkur
 *   (from app/backend/ dir, or via pnpm geo:import)
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const dataDir = args[args.indexOf('--data') + 1] ?? '../../dataset/processed/sukkur';
const NODES_FILE = join(dataDir, 'nodes.json');
const EDGES_FILE = join(dataDir, 'edges.json');
const META_FILE  = join(dataDir, 'metadata.json');

const BULK_SIZE = 1000; // rows per INSERT statement

function log(msg) { process.stdout.write(`${msg}\n`); }

function buildWKTPoint(lon, lat)   { return `POINT(${lon} ${lat})`; }
function buildWKTPolygon(b)        {
  return `MULTIPOLYGON(((${b.lon_min} ${b.lat_min},${b.lon_max} ${b.lat_min},${b.lon_max} ${b.lat_max},${b.lon_min} ${b.lat_max},${b.lon_min} ${b.lat_min})))`;
}
function buildWKTLine(coords) {
  return `LINESTRING(${coords.map(([lon, lat]) => `${lon} ${lat}`).join(',')})`;
}

async function getDbSizeMB(client, dbName) {
  const r = await client.query(`SELECT pg_database_size($1)::bigint AS s`, [dbName]);
  return Math.round(Number(r.rows[0].s) / 1_048_576 * 10) / 10;
}

// ---------------------------------------------------------------------------
// Bulk insert helpers
// ---------------------------------------------------------------------------
async function bulkInsertNodes(client, studyAreaId, nodes) {
  let inserted = 0;
  for (let i = 0; i < nodes.length; i += BULK_SIZE) {
    const batch = nodes.slice(i, i + BULK_SIZE);
    const params = [];
    const rows = batch.map((n, j) => {
      const base = j * 4;
      params.push(n.id, studyAreaId, n.source_osm_id,
        `POINT(${n.lon} ${n.lat})`);
      return `($${base+1}, $${base+2}, $${base+3}, ST_GeomFromText($${base+4}, 4326), 'connector')`;
    });
    await client.query(
      `INSERT INTO road_nodes (id, study_area_id, source_osm_id, geom, node_type)
       VALUES ${rows.join(',')} ON CONFLICT (id) DO NOTHING`,
      params
    );
    inserted += batch.length;
  }
  return inserted;
}

async function bulkInsertEdges(client, studyAreaId, edges) {
  let inserted = 0;
  let skipped = 0;
  const valid = edges.filter(e =>
    e.coords?.length >= 2 && e.length_m > 0 && isFinite(e.length_m)
  );
  skipped = edges.length - valid.length;

  for (let i = 0; i < valid.length; i += BULK_SIZE) {
    const batch = valid.slice(i, i + BULK_SIZE);
    const params = [];
    const rows = batch.map((e, j) => {
      const base = j * 12;
      const wkt = buildWKTLine(e.coords);
      params.push(
        e.id, studyAreaId,
        e.source_node_id, e.target_node_id,
        e.physical_segment_id, e.osm_way_id ?? null,
        e.road_name || null, e.highway_type,
        e.is_oneway, e.length_m,
        wkt, e.is_routable
      );
      return `($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, $${base+7}, $${base+8}, $${base+9}, $${base+10}, ST_GeomFromText($${base+11}, 4326), $${base+12})`;
    });
    await client.query(
      `INSERT INTO road_edges
         (id, study_area_id, source_node_id, target_node_id, physical_segment_id,
          osm_way_id, road_name, highway_type, is_oneway, length_m, geom, is_routable)
       VALUES ${rows.join(',')} ON CONFLICT (id) DO NOTHING`,
      params
    );
    inserted += batch.length;
    if (i % 5000 < BULK_SIZE && i > 0) {
      log(`  ${inserted.toLocaleString()}/${valid.length.toLocaleString()} edges...`);
    }
  }
  return { inserted, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  log(`\n${'='.repeat(60)}`);
  log('Flood Digital Twin — Road Graph PostGIS Importer (Bulk)');
  log(`Data: ${dataDir}`);
  log(`${'='.repeat(60)}\n`);

  for (const f of [NODES_FILE, EDGES_FILE, META_FILE]) {
    if (!existsSync(f)) { log(`ERROR: Missing: ${f}`); process.exit(1); }
  }

  log('Loading JSON...');
  const nodes = JSON.parse(readFileSync(NODES_FILE, 'utf8'));
  const edges = JSON.parse(readFileSync(EDGES_FILE, 'utf8'));
  const meta  = JSON.parse(readFileSync(META_FILE, 'utf8'));
  log(`  Nodes: ${nodes.length.toLocaleString()}`);
  log(`  Edges: ${edges.length.toLocaleString()}`);
  log(`  Version: ${meta.dataset_version}`);

  if (!process.env.DATABASE_URL) {
    log('ERROR: DATABASE_URL not set.'); process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  const client = await pool.connect();
  log('Connected.\n');

  try {
    const dbName = (await client.query('SELECT current_database() AS n')).rows[0].n;
    const sizeBefore = await getDbSizeMB(client, dbName);
    log(`DB size before: ${sizeBefore} MB`);

    // Check existing dataset version
    const existing = await client.query(
      `SELECT id, import_status FROM dataset_versions WHERE version = $1`,
      [meta.dataset_version]
    );
    if (existing.rows.length > 0) {
      const ex = existing.rows[0];
      if (ex.import_status === 'ready') {
        log(`\nVersion '${meta.dataset_version}' already exists (status: ready).`);
        log('Import SKIPPED — data already present. Delete manually to re-import.');
        return;
      }
      log(`Cleaning up partial import (status: ${ex.import_status})...`);
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM road_edges WHERE study_area_id IN (SELECT id FROM study_areas WHERE dataset_version_id=$1)`,
        [ex.id]
      );
      await client.query(
        `DELETE FROM road_nodes WHERE study_area_id IN (SELECT id FROM study_areas WHERE dataset_version_id=$1)`,
        [ex.id]
      );
      await client.query(`DELETE FROM study_areas WHERE dataset_version_id=$1`, [ex.id]);
      await client.query(`DELETE FROM dataset_versions WHERE id=$1`, [ex.id]);
      await client.query('COMMIT');
      log('  Removed partial import.\n');
    }

    const sa = meta.study_area;

    // 1. dataset_version
    log('1. Inserting dataset_version...');
    const dvId = randomUUID();
    await client.query(
      `INSERT INTO dataset_versions (id, version, osm_source, osm_license, retrieved_at, imported_at, import_status, metadata)
       VALUES ($1,$2,$3,$4,NOW(),NOW(),'pending',$5)`,
      [dvId, meta.dataset_version, sa.osm_source, sa.osm_license,
       JSON.stringify({ pbf_source: meta.pbf_source, node_count: meta.graph.node_count,
         arc_count: meta.graph.directed_arc_count, seg_count: meta.graph.physical_segment_count })]
    );
    log(`  id: ${dvId}`);

    // 2. study_area
    log('2. Inserting study_area...');
    const saId = randomUUID();
    const cb = sa.core_bbox;
    const [clon, clat] = sa.map_center;
    await client.query(
      `INSERT INTO study_areas (id, dataset_version_id, slug, name, boundary, map_center, default_zoom, is_active)
       VALUES ($1,$2,$3,$4,ST_GeomFromText($5,4326),ST_GeomFromText($6,4326),$7,true)`,
      [saId, dvId, sa.slug, sa.name,
       buildWKTPolygon(cb), buildWKTPoint(clon, clat),
       sa.default_zoom]
    );
    log(`  id: ${saId}  slug: ${sa.slug}`);

    // 3. road_nodes (bulk)
    log(`\n3. Bulk inserting ${nodes.length.toLocaleString()} road_nodes (${BULK_SIZE}/batch)...`);
    await client.query('BEGIN');
    const nodeCount = await bulkInsertNodes(client, saId, nodes);
    await client.query('COMMIT');
    log(`  Inserted: ${nodeCount.toLocaleString()} nodes`);

    // 4. road_edges (bulk)
    log(`\n4. Bulk inserting ${edges.length.toLocaleString()} road_edges (${BULK_SIZE}/batch)...`);
    await client.query('BEGIN');
    const { inserted: edgeCount, skipped } = await bulkInsertEdges(client, saId, edges);
    await client.query('COMMIT');
    log(`  Inserted: ${edgeCount.toLocaleString()} edges`);
    if (skipped > 0) log(`  Skipped : ${skipped} invalid`);

    // 5. Mark ready
    log('\n5. Marking dataset ready...');
    await client.query(
      `UPDATE dataset_versions SET import_status='ready', metadata = metadata || $1 WHERE id=$2`,
      [JSON.stringify({
        imported_node_count: nodeCount, imported_edge_count: edgeCount,
        connectivity: meta.connectivity, demo_pairs: meta.demo_pairs,
      }), dvId]
    );

    // 6. Verify
    log('\n6. Post-import verification...');
    const vn = parseInt((await client.query(`SELECT COUNT(*) AS c FROM road_nodes WHERE study_area_id=$1`, [saId])).rows[0].c);
    const ve = parseInt((await client.query(`SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id=$1`, [saId])).rows[0].c);
    const vs = parseInt((await client.query(`SELECT COUNT(DISTINCT physical_segment_id) AS c FROM road_edges WHERE study_area_id=$1`, [saId])).rows[0].c);
    const vz = parseInt((await client.query(`SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id=$1 AND length_m<=0`, [saId])).rows[0].c);
    const vi = parseInt((await client.query(`SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id=$1 AND NOT ST_IsValid(geom)`, [saId])).rows[0].c);
    const sizeAfter = await getDbSizeMB(client, dbName);

    log(`  Nodes in DB          : ${vn.toLocaleString()}`);
    log(`  Edges in DB          : ${ve.toLocaleString()}`);
    log(`  Physical segments    : ${vs.toLocaleString()}`);
    log(`  Zero-length edges    : ${vz}`);
    log(`  Invalid geometries   : ${vi}`);
    log(`  DB size before       : ${sizeBefore} MB`);
    log(`  DB size after        : ${sizeAfter} MB`);
    log(`  Import added         : ${(sizeAfter - sizeBefore).toFixed(1)} MB`);

    // Demo pairs
    if (meta.demo_pairs?.length) {
      log('\n7. Demo O/D pairs:');
      for (const p of meta.demo_pairs) {
        log(`  Pair ${p.pair}: node ${p.origin_node_id} -> ${p.destination_node_id}`);
        log(`    ${p.description}`);
        log(`    Est. distance: ~${p.estimated_baseline_distance_m}m`);
        log(`    ${p.note}`);
      }
    }

    const ok = vz === 0 && vi === 0 && vn > 0 && ve > 0;

    log(`\n${'='.repeat(60)}`);
    log('IMPORT COMPLETE');
    log(`  Study area     : ${sa.name}`);
    log(`  Version        : ${meta.dataset_version}`);
    log(`  dataset_version_id: ${dvId}`);
    log(`  study_area_id     : ${saId}`);
    log(`  Nodes          : ${vn.toLocaleString()}`);
    log(`  Edges          : ${ve.toLocaleString()}`);
    log(`  Segments       : ${vs.toLocaleString()}`);
    log(`  DB growth      : ${sizeBefore} -> ${sizeAfter} MB`);
    log(`  Verification   : ${ok ? 'PASSED' : 'FAILED'}`);
    log(`${'='.repeat(60)}\n`);

    if (!ok) process.exitCode = 1;

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    log(`\nERROR: ${err.message?.replace(/password|credential|postgresql:\/\//gi, '[REDACTED]')}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
