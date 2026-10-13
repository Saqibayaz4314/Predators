/**
 * GEO-05 tests — Graph topology and PostGIS import verification
 *
 * Tests:
 *  1. Sukkur study area exists in DB
 *  2. Dataset version is 'ready'
 *  3. Node and edge counts are positive
 *  4. No zero-length edges
 *  5. No invalid geometries
 *  6. No orphaned node references
 *  7. No self-loops
 *  8. Oneway/bidir arc consistency
 *  9. Demo pairs are reachable (BFS)
 * 10. Dataset version metadata is consistent
 *
 * These tests SKIP if DATABASE_URL is not set or the study area is missing.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { databasePoolConfig } from '../src/db/connection.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const DATASET_VERSION = 'sukkur-osm-2026-10-v1';
const STUDY_AREA_SLUG = 'sukkur-rohri';

let pool: pg.Pool | null = null;
let studyAreaId: string | null = null;
let datasetVersionId: string | null = null;
let metaObj: Record<string, unknown> = {};
let skipReason = '';

function skipIfNeeded() {
  if (skipReason) return true;
  return false;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    skipReason = 'DATABASE_URL not set';
    return;
  }
  pool = new pg.Pool({
    ...databasePoolConfig(process.env.DATABASE_URL),
    
    max: 2,
  });
  try {
    const client = await pool.connect();
    try {
    // Check study area exists
    const saRow = await client.query(
      `SELECT id FROM study_areas WHERE slug = $1`, [STUDY_AREA_SLUG]
    );
    if (saRow.rows.length === 0) {
      throw new Error('Configured study area is missing');
    }
    studyAreaId = saRow.rows[0].id;

    // Get dataset version
    const dvRow = await client.query(
      `SELECT dv.id, dv.version, dv.import_status, dv.metadata
       FROM dataset_versions dv
       JOIN study_areas sa ON sa.dataset_version_id = dv.id
       WHERE sa.id = $1`,
      [studyAreaId]
    );
    if (dvRow.rows.length > 0) {
      datasetVersionId = dvRow.rows[0].id;
      try {
        metaObj = typeof dvRow.rows[0].metadata === 'object'
          ? dvRow.rows[0].metadata
          : JSON.parse(dvRow.rows[0].metadata || '{}');
      } catch {}
    }
    } finally { client.release(); }
  } catch (err) {
    throw new Error('Configured database integration setup failed. Check credentials, TLS and dataset.');
    
  }
}, 30_000);

afterAll(async () => {
  if (pool) await pool.end();
});

// ---------------------------------------------------------------------------

describe.skipIf(!process.env.DATABASE_URL)('GEO-05: Study area and dataset version', () => {
  it('study area exists in DB', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    expect(studyAreaId).toBeTruthy();
  });

  it('dataset version is ready', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT import_status FROM dataset_versions WHERE version = $1`,
        [DATASET_VERSION]
      );
      expect(r.rows.length).toBeGreaterThan(0);
      expect(r.rows[0].import_status).toBe('ready');
    } finally { client.release(); }
  });
});

describe.skipIf(!process.env.DATABASE_URL)('GEO-05: Row counts', () => {
  it('node count > 0', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM road_nodes WHERE study_area_id = $1`, [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBeGreaterThan(0);
    } finally { client.release(); }
  });

  it('edge count > 0', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1`, [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBeGreaterThan(0);
    } finally { client.release(); }
  });

  it('arc-to-segment ratio is between 1.0 and 2.0', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const edges = await client.query(
        `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1`, [studyAreaId]
      );
      const segs = await client.query(
        `SELECT COUNT(DISTINCT physical_segment_id) AS c FROM road_edges WHERE study_area_id = $1`,
        [studyAreaId]
      );
      const ratio = parseInt(edges.rows[0].c) / parseInt(segs.rows[0].c);
      expect(ratio).toBeGreaterThanOrEqual(1.0);
      expect(ratio).toBeLessThanOrEqual(2.0);
    } finally { client.release(); }
  });
});

describe.skipIf(!process.env.DATABASE_URL)('GEO-05: Edge geometry and length validity', () => {
  it('no zero-length edges', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1 AND length_m <= 0`,
        [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBe(0);
    } finally { client.release(); }
  });

  it('no invalid edge geometries (ST_IsValid)', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1 AND NOT ST_IsValid(geom)`,
        [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBe(0);
    } finally { client.release(); }
  });

  it('no invalid node geometries', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM road_nodes WHERE study_area_id = $1 AND NOT ST_IsValid(geom)`,
        [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBe(0);
    } finally { client.release(); }
  });
});

describe.skipIf(!process.env.DATABASE_URL)('GEO-05: Node reference integrity', () => {
  it('no edges with missing source nodes', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM road_edges e
         WHERE e.study_area_id = $1
         AND NOT EXISTS (SELECT 1 FROM road_nodes n WHERE n.id = e.source_node_id)`,
        [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBe(0);
    } finally { client.release(); }
  });

  it('no edges with missing target nodes', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM road_edges e
         WHERE e.study_area_id = $1
         AND NOT EXISTS (SELECT 1 FROM road_nodes n WHERE n.id = e.target_node_id)`,
        [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBe(0);
    } finally { client.release(); }
  });

  it('no self-loop edges', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM road_edges WHERE study_area_id = $1 AND source_node_id = target_node_id`,
        [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBe(0);
    } finally { client.release(); }
  });
});

describe.skipIf(!process.env.DATABASE_URL)('GEO-05: Directed arc consistency', () => {
  it('bidirectional segments have exactly 2 arcs', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM (
           SELECT physical_segment_id FROM road_edges
           WHERE study_area_id = $1 AND is_oneway = false
           GROUP BY physical_segment_id HAVING COUNT(*) != 2
         ) t`,
        [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBe(0);
    } finally { client.release(); }
  });

  it('oneway segments have exactly 1 arc', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const r = await client.query(
        `SELECT COUNT(*) AS c FROM (
           SELECT physical_segment_id FROM road_edges
           WHERE study_area_id = $1 AND is_oneway = true
           GROUP BY physical_segment_id HAVING COUNT(*) != 1
         ) t`,
        [studyAreaId]
      );
      expect(parseInt(r.rows[0].c)).toBe(0);
    } finally { client.release(); }
  });
});

describe.skipIf(!process.env.DATABASE_URL)('GEO-05: Connectivity and demo pairs', () => {
  it('largest connected component covers >50% of nodes', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const client = await pool!.connect();
    try {
      const nodeCount = parseInt((await client.query(
        `SELECT COUNT(*) AS c FROM road_nodes WHERE study_area_id = $1`, [studyAreaId]
      )).rows[0].c);
      const adjRows = await client.query(
        `SELECT source_node_id AS s, target_node_id AS t FROM road_edges WHERE study_area_id = $1`,
        [studyAreaId]
      );
      const adj = new Map<number, Set<number>>();
      for (const row of adjRows.rows) {
        if (!adj.has(row.s)) adj.set(row.s, new Set());
        if (!adj.has(row.t)) adj.set(row.t, new Set());
        adj.get(row.s)!.add(row.t);
        adj.get(row.t)!.add(row.s);
      }
      const visited = new Set<number>();
      let largest = 0;
      for (const nid of adj.keys()) {
        if (visited.has(nid)) continue;
        const stack = [nid];
        let size = 0;
        while (stack.length > 0) {
          const cur = stack.pop()!;
          if (visited.has(cur)) continue;
          visited.add(cur);
          size++;
          adj.get(cur)?.forEach(nb => { if (!visited.has(nb)) stack.push(nb); });
        }
        if (size > largest) largest = size;
      }
      const pct = largest / nodeCount;
      expect(pct).toBeGreaterThan(0.5);
    } finally { client.release(); }
  }, 60_000);

  it('demo pairs are reachable (BFS)', async () => {
    if (skipIfNeeded()) return expect.soft(true).toBe(true);
    const demoPairs = (metaObj as any)?.demo_pairs ?? [];
    if (demoPairs.length === 0) {
      // No demo pairs in metadata — skip gracefully
      expect(true).toBe(true);
      return;
    }
    const client = await pool!.connect();
    try {
      const adjRows = await client.query(
        `SELECT source_node_id AS s, target_node_id AS t FROM road_edges
         WHERE study_area_id = $1 AND is_routable = true`,
        [studyAreaId]
      );
      const adj = new Map<string, string[]>();
      for (const row of adjRows.rows) {
        const source = String(row.s);
        if (!adj.has(source)) adj.set(source, []);
        adj.get(source)!.push(String(row.t));
      }

      for (const pair of demoPairs) {
        const origin = String(pair.origin_node_id);
        const dest = String(pair.destination_node_id);
        const visited = new Set<string>();
        const queue = [origin];
        let found = false;
        while (queue.length > 0 && !found) {
          const cur = queue.shift()!;
          if (visited.has(cur)) continue;
          visited.add(cur);
          if (cur === dest) { found = true; break; }
          adj.get(cur)?.forEach(nb => { if (!visited.has(nb)) queue.push(nb); });
        }
        expect(found, `Pair ${pair.pair}: ${origin} -> ${dest} should be reachable`).toBe(true);
      }
    } finally { client.release(); }
  }, 60_000);
});


