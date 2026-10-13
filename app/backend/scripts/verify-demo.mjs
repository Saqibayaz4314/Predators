import 'dotenv/config';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { buildApp } from '../dist/app.js';
import { parseEnv } from '../dist/config/env.js';
import { getPool, closePool } from '../dist/db/connection.js';
import { getOrLoadGraph } from '../dist/routing/graphCache.js';
import { computeScenarioImpact } from '../dist/modules/flood/floodService.js';
import { apiSuccessSchema, studyAreasSchema, studyAreaDetailSchema, roadsSchema, scenariosSchema, scenarioDetailSchema, zonesSchema, impactSchema, comparisonSchema, snapResultSchema } from '@flood/shared';

const env = parseEnv({ ...process.env, NODE_ENV: 'test' });
const pool = getPool(env);
assert(pool, 'DATABASE_URL is required');
const app = buildApp(env, pool);
async function request(url, schema, payload) {
  const response = await app.inject({ method: payload ? 'POST' : 'GET', url: `/api/v1${url}`, ...(payload ? { payload } : {}) });
  assert.equal(response.statusCode, 200, `${url} failed`);
  return apiSuccessSchema(schema).parse(response.json()).data;
}
try {
  const { items } = await request('/study-areas', studyAreasSchema);
  const area = items.find((area) => area.slug === 'sukkur-rohri');
  assert(area, 'Sukkur/Rohri dataset is required');
  const context = { studyAreaId: area.id, expectedDatasetVersion: area.datasetVersion };
  const started = performance.now();
  const graph = await getOrLoadGraph(pool, area.id, area.datasetVersion);
  const graphLoadMs = Math.round(performance.now() - started);
  await request(`/study-areas/${area.id}`, studyAreaDetailSchema);
  const roads = await request(`/study-areas/${area.id}/roads`, roadsSchema);
  assert.equal(new Set(roads.features.map((feature) => feature.properties.physicalSegmentId)).size, roads.features.length);
  const { scenarios } = await request(`/study-areas/${area.id}/scenarios`, scenariosSchema);
  assert.equal(scenarios.length, 3);
  const output = [];
  for (const scenario of scenarios) {
    const detail = await request(`/scenarios/${scenario.id}`, scenarioDetailSchema);
    const zones = await request(`/scenarios/${scenario.id}/zones`, zonesSchema);
    assert.equal(detail.zoneCount, zones.features.length);
    const impact = await request(`/scenarios/${scenario.id}/impact`, impactSchema);
    const internal = await computeScenarioImpact(pool, scenario.id, area.id, area.datasetVersion);
    const affected = new Set(impact.affectedPhysicalSegmentIds);
    assert.equal(roads.features.filter((feature) => affected.has(feature.properties.physicalSegmentId)).length, impact.affectedPhysicalSegments);
    for (const arc of graph.arcs.values()) assert.equal(internal.blockedArcIds.has(arc.id), affected.has(arc.physicalSegmentId));
    const pairs = [];
    for (const [originNodeId, destinationNodeId] of [['11243', '2814'], ['4416', '2908']]) {
      const origin = graph.nodes.get(originNodeId);
      const destination = graph.nodes.get(destinationNodeId);
      for (const node of [origin, destination]) {
        const snap = await request('/routing/snap', snapResultSchema, { studyAreaId: area.id, point: { longitude: node.longitude, latitude: node.latitude } });
        assert.equal(snap.nodeId, node.id);
      }
      const comparison = await request('/routing/compare', comparisonSchema, { ...context, scenarioId: scenario.id, originNodeId, destinationNodeId });
      assert.equal(comparison.baseline.status, 'reachable');
      if (comparison.scenario.status === 'reachable') {
        assert(comparison.scenario.distanceMeters >= comparison.baseline.distanceMeters);
        assert(comparison.scenario.arcIds.every((id) => !internal.blockedArcIds.has(id)));
      } else assert.equal(comparison.scenario.geometry, null);
      pairs.push({ originNodeId, destinationNodeId, origin, destination, outcome: comparison.outcome, baselineMeters: comparison.baseline.distanceMeters, scenarioMeters: comparison.scenario.distanceMeters });
    }
    output.push({ scenarioId: scenario.id, title: scenario.title, zones: zones.features.length, affectedSegments: impact.affectedPhysicalSegments, blockedArcs: impact.blockedDirectedArcs, pairs });
  }
  assert(output.some((scenario) => scenario.pairs.some((pair) => ['rerouted', 'unreachable'].includes(pair.outcome))), 'A verified flood-routing demo is required');
  const valid = await pool.query('SELECT bool_and(ST_IsValid(geom) AND NOT ST_IsEmpty(geom) AND ST_SRID(geom) = 4326) AS valid FROM flood_zones');
  assert.equal(valid.rows[0].valid, true);
  console.log(JSON.stringify({ status: 'PASSED', datasetVersion: area.datasetVersion, nodes: graph.nodeCount, arcs: graph.arcCount, physicalSegments: roads.features.length, graphLoadMs, scenarios: output }, null, 2));
} catch (error) {
  console.error('Demo verification FAILED:', error instanceof assert.AssertionError ? error.message : 'API, database or contract verification failed.');
  process.exitCode = 1;
} finally {
  await app.close();
  await closePool();
}
