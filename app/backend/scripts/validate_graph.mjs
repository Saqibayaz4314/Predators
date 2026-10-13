/**
 * GEO-05 — Graph Topology Validator
 *
 * Runs automated validation against the imported graph in PostGIS:
 *   1. Node count / edge count / segment count
 *   2. Zero-length edges
 *   3. Invalid geometries
 *   4. Missing node references
 *   5. One-way direction integrity
 *   6. Reverse-arc consistency
 *   7. Connected components (BFS via adjacency query)
 *   8. Isolated nodes
 *   9. DB-level geometry length vs stored length
 *  10. Demo pair connectivity check (simple BFS in memory)
 *
 * Usage:
 *   node scripts/geospatial/validate_graph.mjs
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

function log(msg) { process.stdout.write(`${msg}\n`); }
function pass(msg) { log(`  PASS  ${msg}`); }
function fail(msg) { log(`  FAIL  ${msg}`); process.exitCode = 1; }
function info(msg) { log(`  INFO  ${msg}`); }
function warn(msg) { log(`  WARN  ${msg}`); }

async function main() {
  log(`\n${'='.repeat(60)}`);
  log('Flood Digital Twin — Graph Topology Validator');
  log(`${'='.repeat(60)}\n`);

  if (!process.env.DATABASE_URL) {
    log('ERROR: DATABASE_URL not set.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });
  const client = await pool.connect();
  log('Connected to database.\n');

  let totalChecks = 0;
  let passedChecks = 0;

  function check(label, passed, detail = '') {
    totalChecks++;
    if (passed) { passedChecks++; pass(`${label}${detail ? ': ' + detail : ''}`); }
    else { fail(`${label}${detail ? ': ' + detail : ''}`); }
  }

  try {
    // Get active study area
    const saRow = await client.query(
      `SELECT id, slug, name FROM study_areas WHERE is_active = true LIMIT 1`
    );
    if (saRow.rows.length === 0) {
      log('ERROR: No active study area found. Run import first.');
      process.exitCode = 1;
      return;
    }
    const sa = saRow.rows[0];
    info(`Study area: "${sa.name}" (${sa.id})`);

    // Get dataset version
    const dvRow = await client.query(
      `SELECT dv.id, dv.version, dv.import_status, dv.metadata
       FROM dataset_versions dv
       JOIN study_areas sa ON sa.dataset_version_id = dv.id
       WHERE sa.id = $1`,
      [sa.id]
    );
    const dv = dvRow.rows[0];
    info(`Dataset version: ${dv.version} (status: ${dv.import_status})`);

    log('\n--- 1. Row counts ---');
    const nodeCount = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM road_nodes WHERE study_area_id = $1`, [sa.id]
    )).rows[0].c);
    const edgeCount = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1`, [sa.id]
    )).rows[0].c);
    const segCount = parseInt((await client.query(
      `SELECT COUNT(DISTINCT physical_segment_id) AS c FROM road_edges WHERE study_area_id = $1`,
      [sa.id]
    )).rows[0].c);

    info(`Nodes    : ${nodeCount.toLocaleString()}`);
    info(`Arcs     : ${edgeCount.toLocaleString()}`);
    info(`Segments : ${segCount.toLocaleString()}`);
    check('Node count > 0', nodeCount > 0, nodeCount.toString());
    check('Edge count > 0', edgeCount > 0, edgeCount.toString());
    check('Segment count > 0', segCount > 0, segCount.toString());
    check('Arc:segment ratio plausible (1.0–2.0)', edgeCount / segCount >= 1.0 && edgeCount / segCount <= 2.0,
      `${(edgeCount / segCount).toFixed(2)}`);

    log('\n--- 2. Zero-length and invalid edges ---');
    const zeroLen = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1 AND length_m <= 0`, [sa.id]
    )).rows[0].c);
    const negLen = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1 AND length_m < 0`, [sa.id]
    )).rows[0].c);
    check('No zero-length edges', zeroLen === 0, zeroLen > 0 ? `${zeroLen} found` : 'none');
    check('No negative-length edges', negLen === 0, negLen > 0 ? `${negLen} found` : 'none');

    log('\n--- 3. Geometry validity ---');
    const invalidGeom = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1 AND NOT ST_IsValid(geom)`,
      [sa.id]
    )).rows[0].c);
    const invalidNodeGeom = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM road_nodes WHERE study_area_id = $1 AND NOT ST_IsValid(geom)`,
      [sa.id]
    )).rows[0].c);
    check('No invalid edge geometries', invalidGeom === 0, invalidGeom > 0 ? `${invalidGeom} invalid` : 'all valid');
    check('No invalid node geometries', invalidNodeGeom === 0, invalidNodeGeom > 0 ? `${invalidNodeGeom} invalid` : 'all valid');

    log('\n--- 4. Node reference integrity ---');
    const orphanSrc = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM road_edges e
       WHERE e.study_area_id = $1
       AND NOT EXISTS (SELECT 1 FROM road_nodes n WHERE n.id = e.source_node_id AND n.study_area_id = $1)`,
      [sa.id]
    )).rows[0].c);
    const orphanTgt = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM road_edges e
       WHERE e.study_area_id = $1
       AND NOT EXISTS (SELECT 1 FROM road_nodes n WHERE n.id = e.target_node_id AND n.study_area_id = $1)`,
      [sa.id]
    )).rows[0].c);
    check('No orphaned source nodes', orphanSrc === 0, orphanSrc > 0 ? `${orphanSrc} missing` : 'all found');
    check('No orphaned target nodes', orphanTgt === 0, orphanTgt > 0 ? `${orphanTgt} missing` : 'all found');

    log('\n--- 5. Self-loop check ---');
    const selfLoops = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1 AND source_node_id = target_node_id`,
      [sa.id]
    )).rows[0].c);
    check('No self-loop edges', selfLoops === 0, selfLoops > 0 ? `${selfLoops} found` : 'none');

    log('\n--- 6. Oneway / bidirectional arc consistency ---');
    // Each non-oneway physical segment should have exactly 2 arcs
    const badBidir = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM (
         SELECT physical_segment_id, COUNT(*) AS arc_count
         FROM road_edges WHERE study_area_id = $1 AND is_oneway = false
         GROUP BY physical_segment_id
         HAVING COUNT(*) != 2
       ) t`,
      [sa.id]
    )).rows[0].c);
    // Each oneway physical segment should have exactly 1 arc
    const badOneway = parseInt((await client.query(
      `SELECT COUNT(*) AS c FROM (
         SELECT physical_segment_id, COUNT(*) AS arc_count
         FROM road_edges WHERE study_area_id = $1 AND is_oneway = true
         GROUP BY physical_segment_id
         HAVING COUNT(*) != 1
       ) t`,
      [sa.id]
    )).rows[0].c);
    check('Bidirectional segments have 2 arcs', badBidir === 0, badBidir > 0 ? `${badBidir} segments wrong` : 'all correct');
    check('Oneway segments have 1 arc', badOneway === 0, badOneway > 0 ? `${badOneway} segments wrong` : 'all correct');

    log('\n--- 7. Length comparison (stored vs PostGIS) ---');
    // Sample 100 edges and compare stored length_m vs ST_Length(geog)
    const lenCompare = await client.query(
      `SELECT id, length_m, ST_Length(geom::geography) AS postgis_len
       FROM road_edges WHERE study_area_id = $1
       ORDER BY id LIMIT 100`,
      [sa.id]
    );
    const bigMismatch = lenCompare.rows.filter(r => {
      const diff = Math.abs(r.length_m - parseFloat(r.postgis_len));
      const rel = diff / Math.max(r.length_m, 0.1);
      return rel > 0.01; // >1% mismatch
    });
    check('Stored lengths match PostGIS (sample 100)', bigMismatch.length === 0,
      bigMismatch.length > 0 ? `${bigMismatch.length}/100 mismatches >1%` : '0 mismatches');

    log('\n--- 8. Dataset version consistency ---');
    const allSameDataset = parseInt((await client.query(
      `SELECT COUNT(DISTINCT e.study_area_id) AS c FROM road_edges e
       JOIN study_areas sa ON sa.id = e.study_area_id
       WHERE sa.dataset_version_id = $1`,
      [dv.id]
    )).rows[0].c);
    check('All edges reference correct study area', allSameDataset <= 1,
      `${allSameDataset} study area(s) in dataset`);

    log('\n--- 9. Connected components (in-memory BFS) ---');
    // Load adjacency from DB
    info('Loading graph adjacency from DB (may take a moment)...');
    const adjRows = await client.query(
      `SELECT source_node_id::text AS s, target_node_id::text AS t
       FROM road_edges WHERE study_area_id = $1`,
      [sa.id]
    );
    const adj = new Map();
    for (const row of adjRows.rows) {
      const s = row.s, t = row.t;
      if (!adj.has(s)) adj.set(s, []);
      if (!adj.has(t)) adj.set(t, []);
      adj.get(s).push(t);
      adj.get(t).push(s); // undirected for component analysis
    }
    const visited = new Set();
    const components = [];
    for (const nodeId of adj.keys()) {
      if (visited.has(nodeId)) continue;
      const stack = [nodeId];
      let size = 0;
      while (stack.length > 0) {
        const cur = stack.pop();
        if (visited.has(cur)) continue;
        visited.add(cur);
        size++;
        for (const nb of (adj.get(cur) || [])) {
          if (!visited.has(nb)) stack.push(nb);
        }
      }
      components.push(size);
    }
    components.sort((a, b) => b - a);
    const largestComp = components[0] ?? 0;
    const compCount = components.length;
    const isolatedNodes = components.filter(c => c === 1).length;
    const largestPct = Math.round(largestComp / nodeCount * 100);

    info(`Connected components : ${compCount}`);
    info(`Largest component    : ${largestComp.toLocaleString()} nodes (${largestPct}%)`);
    info(`Isolated nodes       : ${isolatedNodes}`);
    info(`Top 5 sizes          : ${components.slice(0, 5).join(', ')}`);

    check('Largest component covers >50% of nodes', largestPct > 50,
      `${largestPct}% of ${nodeCount.toLocaleString()} nodes`);

    log('\n--- 10. Demo pair connectivity check ---');
    // Load demo pairs from dataset version metadata
    let demoPairs = [];
    try {
      const metaObj = typeof dv.metadata === 'object' ? dv.metadata : JSON.parse(dv.metadata || '{}');
      demoPairs = metaObj.demo_pairs ?? [];
    } catch {}

    if (demoPairs.length === 0) {
      warn('No demo pairs found in dataset metadata — skipping connectivity check');
    } else {
      // Build weighted adjacency for Dijkstra check
      const wAdj = new Map();
      const edgeRows = await client.query(
        `SELECT source_node_id::text AS s, target_node_id::text AS t, length_m
         FROM road_edges WHERE study_area_id = $1 AND is_routable = true`,
        [sa.id]
      );
      for (const row of edgeRows.rows) {
        if (!wAdj.has(row.s)) wAdj.set(row.s, []);
        wAdj.get(row.s).push({ t: row.t, w: parseFloat(row.length_m) });
      }

      for (const pair of demoPairs) {
        const origin = pair.origin_node_id.toString();
        const dest   = pair.destination_node_id.toString();

        // Simple BFS reachability check (no full Dijkstra)
        const bfsVisited = new Set();
        const queue = [origin];
        let found = false;
        while (queue.length > 0 && !found) {
          const cur = queue.shift();
          if (bfsVisited.has(cur)) continue;
          bfsVisited.add(cur);
          if (cur === dest) { found = true; break; }
          for (const nb of (wAdj.get(cur) || [])) {
            if (!bfsVisited.has(nb.t)) queue.push(nb.t);
          }
        }

        check(
          `Demo pair ${pair.pair} reachable (node ${origin} -> ${dest})`,
          found,
          found
            ? `reachable (estimated ~${pair.estimated_baseline_distance_m}m)`
            : 'UNREACHABLE - check graph connectivity'
        );

        if (found) {
          info(`    ${pair.description}`);
          info(`    Note: ${pair.note}`);
        }
      }
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    log(`\n${'='.repeat(60)}`);
    log('VALIDATION SUMMARY');
    log(`  Study area    : ${sa.name}`);
    log(`  Dataset ver   : ${dv.version}`);
    log(`  Nodes         : ${nodeCount.toLocaleString()}`);
    log(`  Arcs          : ${edgeCount.toLocaleString()}`);
    log(`  Segments      : ${segCount.toLocaleString()}`);
    log(`  Components    : ${compCount} (largest: ${largestComp.toLocaleString()} = ${largestPct}%)`);
    log(`  Checks passed : ${passedChecks}/${totalChecks}`);
    log(`  Result        : ${passedChecks === totalChecks ? 'ALL PASSED' : 'SOME FAILED'}`);
    log(`${'='.repeat(60)}\n`);

    if (passedChecks < totalChecks) {
      process.exitCode = 1;
    }

  } catch (err) {
    const safeMsg = err.message?.replace(/password|credential|postgresql:\/\//gi, '[REDACTED]');
    log(`\nERROR: ${safeMsg}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`Fatal: ${err.message?.replace(/password|credential/gi, '[REDACTED]')}`);
  process.exitCode = 1;
});
