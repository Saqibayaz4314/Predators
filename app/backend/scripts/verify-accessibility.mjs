import 'dotenv/config';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/app.js';
import { parseEnv } from '../dist/config/env.js';
import { getPool, closePool } from '../dist/db/connection.js';
import { apiSuccessSchema, shelterListSchema, shelterReachabilitySchema, analysisComparisonSchema } from '@flood/shared';

const env = parseEnv({ ...process.env, NODE_ENV: 'test', SHELTER_DEMO: 'false' });
const pool = getPool(env); assert(pool, 'DATABASE_URL required');
const live = buildApp(env, pool);
const demo = buildApp(parseEnv({ ...process.env, NODE_ENV: 'test', SHELTER_DEMO: 'true' }), pool);
const studyAreaId = '020ce29e-ec4f-4514-b14f-58c1252191cc';
const expectedDatasetVersion = 'sukkur-osm-2026-10-v1';
const scenarioIds = [1, 2, 3].map((index) => `a1b2c3d4-000${index}-4000-8000-00000000000${index}`);
async function request(app, path, schema, payload) {
  const response = await app.inject({ method: payload ? 'POST' : 'GET', url: `/api/v1${path}`, ...(payload ? { payload } : {}) });
  assert.equal(response.statusCode, 200, path);
  return apiSuccessSchema(schema).parse(response.json()).data;
}
try {
  const before = (await pool.query('SELECT COUNT(*)::int AS count FROM shelters')).rows[0].count;
  const directory = await request(live, `/study-areas/${studyAreaId}/shelters`, shelterListSchema);
  assert.equal(directory.dataMode, 'live');
  const liveAccess = await request(live, '/shelters/reachability', shelterReachabilitySchema, { studyAreaId, scenarioId: scenarioIds[1], originNodeId: '11243', expectedDatasetVersion });
  const reroute = await request(live, '/analysis/compare', analysisComparisonSchema, { studyAreaId, scenarioIds, originNodeId: '529', destinationNodeId: '806', expectedDatasetVersion });
  assert.equal(reroute.baselineRouteDistanceMeters, 4417.8); assert.equal(reroute.items[1].routeDistanceMeters, 4981.7);
  const unreachable = await request(live, '/analysis/compare', analysisComparisonSchema, { studyAreaId, scenarioIds, originNodeId: '11243', destinationNodeId: '2814', expectedDatasetVersion });
  assert.equal(unreachable.items[1].routeStatus, 'unreachable'); assert.equal(unreachable.items[1].distanceChangePercent, null);
  const demoDirectory = await request(demo, `/study-areas/${studyAreaId}/shelters`, shelterListSchema);
  assert(demoDirectory.items.every((item) => item.dataStatus === 'demonstration' && item.capacity === null));
  const demoAccess = await request(demo, '/shelters/reachability', shelterReachabilitySchema, { studyAreaId, scenarioId: scenarioIds[1], originNodeId: '11243', expectedDatasetVersion });
  assert.equal(demoAccess.items[1].status, 'unreachable'); assert.equal(demoAccess.items[3].status, 'unknown');
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM shelters')).rows[0].count, before);
  console.log(JSON.stringify({ status: 'PASSED', liveShelters: directory.items.length, liveSummary: liveAccess.summary, demoOnly: { count: demoDirectory.items.length, baselineSummary: demoAccess.baselineSummary, scenarioSummary: demoAccess.summary }, comparison: reroute.items.map((item) => ({ ...item, uniqueBlockedPhysicalSegmentIds: item.uniqueBlockedPhysicalSegmentIds.length, sharedBlockedPhysicalSegmentIds: item.sharedBlockedPhysicalSegmentIds.length })), overlap: { union: reroute.closures.unionPhysicalSegmentIds.length, sharedByAll: reroute.closures.sharedByAllPhysicalSegmentIds.length, pairwise: reroute.closures.pairwise.map((pair) => ({ scenarioIds: pair.scenarioIds, shared: pair.sharedPhysicalSegmentIds.length })) }, unreachableStatuses: unreachable.items.map((item) => item.routeStatus), databaseShelterRowsUnchanged: true }, null, 2));
} finally { await live.close(); await demo.close(); await closePool(); }
