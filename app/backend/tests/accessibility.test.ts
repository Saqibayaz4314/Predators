import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import 'dotenv/config';
import pg from 'pg';
import { analysisRequestSchema, shelterListSchema, shelterReachabilitySchema, analysisComparisonSchema, apiSuccessSchema } from '@flood/shared';
import { databasePoolConfig } from '../src/db/connection.js';
import { parseEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { singleSourceDistances, dijkstra } from '../src/routing/dijkstra.js';
import type { RoadGraph, GraphArc } from '../src/routing/graph.js';
import { connectShelters, classifyShelters, shelterSummary, requireScenario } from '../src/modules/shelters/shelterService.js';
import type { ShelterRecord } from '../src/modules/shelters/shelterRepository.js';
import { closureOverlap, routeDelta } from '../src/modules/analysis/comparisonService.js';

const areaId = '020ce29e-ec4f-4514-b14f-58c1252191cc';
const version = 'sukkur-osm-2026-10-v1';
const ids = [1, 2, 3].map((index) => `a1b2c3d4-000${index}-4000-8000-00000000000${index}`);
const nodes = new Map(['1', '2', '3', '4'].map((id, index) => [id, { id, longitude: 68.85 + index * .001, latitude: 27.7 }]));
const arcs = new Map(['1', '2'].map((id, index) => {
  const source = nodes.get(String(index + 1))!, target = nodes.get(String(index + 2))!;
  const arc: GraphArc = { id, sourceNodeId: source.id, targetNodeId: target.id, physicalSegmentId: id, lengthMeters: 100, geometry: { type: 'LineString', coordinates: [[source.longitude, source.latitude], [target.longitude, target.latitude]] } };
  return [id, arc];
}));
const graph: RoadGraph = { studyAreaId: areaId, datasetVersion: version, nodes, arcs, adjacency: new Map([...arcs.values()].map((arc) => [arc.sourceNodeId, [arc]])), loadedAt: new Date(), arcCount: arcs.size, nodeCount: nodes.size };
const record = (id: string, location: ShelterRecord['location']): ShelterRecord => ({ id: `de000000-0000-4000-8000-${id.padStart(12, '0')}`, name: 'Hypothetical unit fixture', location, dataStatus: 'demonstration', capacity: null, sourceName: 'Unit fixture only' });

describe('deterministic shelter routing and comparison', () => {
  it('single-source distances match point-to-point Dijkstra and respect one-way closures', () => {
    for (const blocked of [new Set<string>(), new Set(['2']), new Set(['1'])]) {
      const distances = singleSourceDistances(graph, '1', blocked);
      for (const id of nodes.keys()) {
        const result = dijkstra(graph, { originNodeId: '1', destinationNodeId: id, blockedArcIds: blocked });
        expect(distances.get(id)).toBe(result.status === 'found' ? result.totalDistanceMeters : undefined);
      }
    }
    expect(singleSourceDistances(graph, '3', new Set()).has('1')).toBe(false);
    expect(() => singleSourceDistances(graph, '99', new Set())).toThrow('Origin not found');
  });
  it('keeps invalid, missing and outside-radius locations unknown without invented connections', () => {
    const shelters = connectShelters(graph, [record('1', { longitude: 190, latitude: 27 }), record('2', null), record('3', { longitude: 69.9, latitude: 29.7 }), record('4', { longitude: Number.NaN, latitude: 27.7 })]);
    const items = classifyShelters(shelters, new Map(), new Map(), new Map());
    expect(shelterSummary(items)).toEqual({ reachable: 0, unreachable: 0, unknown: 4 });
    expect(shelters.map((shelter) => shelter.connectionReason)).toEqual(['invalid_coordinates', 'invalid_coordinates', 'outside_snap_radius', 'invalid_coordinates']);
    expect(shelters.every((shelter) => shelter.nearestNodeId === null && shelter.capacity === null)).toBe(true);
    expect(items.every((item) => item.networkDistanceMeters === null)).toBe(true);
  });
  it('distinguishes scenario blockage, baseline disconnection and polygon overlap', () => {
    const shelters = connectShelters(graph, [record('1', nodes.get('2')!), record('2', nodes.get('3')!), record('3', nodes.get('4')!), record('4', null)]);
    const base = singleSourceDistances(graph, '1', new Set());
    const active = singleSourceDistances(graph, '1', new Set(['2']));
    const items = classifyShelters(shelters, base, active, new Map([[shelters[0]!.id, true]]));
    expect(items.map((item) => item.status)).toEqual(['reachable', 'unreachable', 'unreachable', 'unknown']);
    expect(items[0]).toMatchObject({ networkDistanceMeters: 100, withinSimulatedFloodZone: true });
    expect(items[1]).toMatchObject({ baselineDistanceMeters: 200, networkDistanceMeters: null, reason: 'scenario_blocked' });
    expect(items[2]?.reason).toBe('baseline_disconnected');
    expect(shelterSummary(items, true)).toEqual({ reachable: 2, unreachable: 1, unknown: 1 });
    expect(shelterSummary(items)).toEqual({ reachable: 1, unreachable: 2, unknown: 1 });
  });
  it('deduplicates shared physical closures and defines unique versus shared sets', () => {
    const result = closureOverlap([{ scenarioId: ids[0]!, physicalIds: ['1', '1', '2', '4'] }, { scenarioId: ids[1]!, physicalIds: ['2', '3', '4'] }, { scenarioId: ids[2]!, physicalIds: ['4', '5'] }]);
    expect(result.closures.unionPhysicalSegmentIds).toEqual(['1', '2', '3', '4', '5']);
    expect(result.closures.sharedByAllPhysicalSegmentIds).toEqual(['4']);
    expect(result.perScenario[0]?.uniqueBlockedPhysicalSegmentIds).toEqual(['1']);
    expect(result.perScenario[0]?.sharedBlockedPhysicalSegmentIds).toEqual(['2', '4']);
    expect(result.closures.pairwise[0]?.sharedPhysicalSegmentIds).toEqual(['2', '4']);
  });
  it('uses null deltas for unavailable routes and zero-distance percentages', () => {
    expect(routeDelta(100, undefined)).toEqual({ distanceChangeMeters: null, distanceChangePercent: null });
    expect(routeDelta(undefined, undefined).distanceChangePercent).toBeNull();
    expect(routeDelta(0, 0)).toEqual({ distanceChangeMeters: 0, distanceChangePercent: null });
    expect(routeDelta(4417.8, 4981.7)).toEqual({ distanceChangeMeters: 563.9, distanceChangePercent: 12.76 });
    expect(() => routeDelta(100, 90)).toThrow('invariant');
  });
  it('rejects duplicate and oversized scenario batches', () => {
    const input = { studyAreaId: areaId, originNodeId: '1' };
    expect(analysisRequestSchema.safeParse({ ...input, scenarioIds: [ids[0], ids[0]] }).success).toBe(false);
    expect(analysisRequestSchema.safeParse({ ...input, scenarioIds: [...ids, ids[0]] }).success).toBe(false);
    expect(analysisRequestSchema.safeParse({ ...input, scenarioIds: [] }).success).toBe(false);
  });
  it('prohibits hypothetical fixtures in production', () => {
    expect(() => parseEnv({ NODE_ENV: 'production', SHELTER_DEMO: 'true' })).toThrow('SHELTER_DEMO');
    expect(parseEnv({ NODE_ENV: 'production' }).SHELTER_DEMO).toBe(false);
    expect(() => parseEnv({ NODE_ENV: 'development', SHELTER_DEMO: 'true' })).toThrow('HOST');
    expect(parseEnv({ NODE_ENV: 'development', HOST: '127.0.0.1', SHELTER_DEMO: 'true' }).SHELTER_DEMO).toBe(true);
  });
  it('rejects a scenario from another study area', async () => {
    const pool = { query: async () => ({ rows: [{ id: ids[0], study_area_id: 'de000000-0000-4000-8000-000000000009', is_active: true }] }) } as unknown as pg.Pool;
    await expect(requireScenario(pool, areaId, ids[0]!)).rejects.toMatchObject({ statusCode: 409, code: 'SCENARIO_STUDY_AREA_MISMATCH' });
  });
});

describe('existing PostGIS data and API contracts (read only)', () => {
  let pool: pg.Pool;
  let app: ReturnType<typeof buildApp>;
  let demo: ReturnType<typeof buildApp>;
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required for real-data verification');
    pool = new pg.Pool(databasePoolConfig(process.env.DATABASE_URL));
    app = buildApp(parseEnv({ ...process.env, NODE_ENV: 'test', SHELTER_DEMO: 'false' }), pool);
    demo = buildApp(parseEnv({ ...process.env, NODE_ENV: 'test', SHELTER_DEMO: 'true' }), pool);
    await app.ready(); await demo.ready();
    await app.inject(`/api/v1/study-areas/${areaId}/shelters`);
  });
  afterAll(async () => { await app?.close(); await demo?.close(); await pool?.end(); });
  const input = { studyAreaId: areaId, originNodeId: '11243', scenarioId: ids[1], expectedDatasetVersion: version };
  it('returns the actual live directory with an honest empty summary', async () => {
    const response = await app.inject(`/api/v1/study-areas/${areaId}/shelters`);
    expect(response.statusCode).toBe(200);
    const data = apiSuccessSchema(shelterListSchema).parse(response.json()).data;
    const count = await pool.query('SELECT COUNT(*)::int AS count FROM shelters WHERE study_area_id = $1', [areaId]);
    expect(data.items.length).toBe(count.rows[0].count);
    expect(data.dataMode).toBe('live');
    const analysis = await app.inject({ method: 'POST', url: '/api/v1/shelters/reachability', payload: input });
    expect(analysis.statusCode).toBe(200);
    const reach = apiSuccessSchema(shelterReachabilitySchema).parse(analysis.json()).data;
    expect(reach.items.length).toBe(data.items.length);
    if (data.items.length === 0) expect(reach.summary).toEqual({ reachable: 0, unreachable: 0, unknown: 0 });
  });
  it('classifies hypothetical fixtures without inserting any rows', async () => {
    const before = (await pool.query('SELECT COUNT(*)::int AS count FROM shelters')).rows[0].count;
    const response = await demo.inject({ method: 'POST', url: '/api/v1/shelters/reachability', payload: input });
    expect(response.statusCode).toBe(200);
    const reach = apiSuccessSchema(shelterReachabilitySchema).parse(response.json()).data;
    expect(reach.dataMode).toBe('hypothetical_demo');
    expect(reach.items).toHaveLength(4);
    expect(reach.items[1]).toMatchObject({ status: 'unreachable', baselineStatus: 'reachable', reason: 'scenario_blocked' });
    expect(reach.items[3]).toMatchObject({ status: 'unknown', reason: 'invalid_coordinates' });
    expect((await pool.query('SELECT COUNT(*)::int AS count FROM shelters')).rows[0].count).toBe(before);
  });
  it('compares all scenarios and preserves the 4.42 → 4.98 km route', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/analysis/compare', payload: { studyAreaId: areaId, originNodeId: '529', destinationNodeId: '806', scenarioIds: ids, expectedDatasetVersion: version } });
    expect(response.statusCode).toBe(200);
    const data = apiSuccessSchema(analysisComparisonSchema).parse(response.json()).data;
    expect(data.baselineRouteDistanceMeters).toBe(4417.8);
    expect(data.items[1]).toMatchObject({ routeStatus: 'reachable', routeDistanceMeters: 4981.7, distanceChangeMeters: 563.9, distanceChangePercent: 12.76, affectedPhysicalSegments: 1971, blockedDirectedArcs: 3906 });
    expect(data.items.map((item) => item.affectedPhysicalSegments)).toEqual([549, 1971, 1682]);
    expect(new Set(data.closures.unionPhysicalSegmentIds).size).toBe(data.closures.unionPhysicalSegmentIds.length);
  });
  it('compares unavailable routes without inventing distances or percentages', async () => {
    const response = await demo.inject({ method: 'POST', url: '/api/v1/analysis/compare', payload: { studyAreaId: areaId, originNodeId: '11243', destinationNodeId: '2814', scenarioIds: ids, expectedDatasetVersion: version } });
    expect(response.statusCode).toBe(200);
    const data = apiSuccessSchema(analysisComparisonSchema).parse(response.json()).data;
    expect(data.items[1]).toMatchObject({ routeStatus: 'unreachable', routeDistanceMeters: null, distanceChangeMeters: null, distanceChangePercent: null });
    expect(data.items[1]!.unreachableShelters).toBeGreaterThan(0);
    expect(data.items[1]!.unknownShelters).toBe(1);
    const noDest = await app.inject({ method: 'POST', url: '/api/v1/analysis/compare', payload: { studyAreaId: areaId, originNodeId: '529', scenarioIds: ids } });
    expect(apiSuccessSchema(analysisComparisonSchema).parse(noDest.json()).data.items.every((item) => item.routeStatus === 'not_requested' && item.routeDistanceMeters === null)).toBe(true);
  });
  it.each([
    [{ ...input, expectedDatasetVersion: 'stale' }, 409, 'DATASET_VERSION_MISMATCH'],
    [{ ...input, originNodeId: '999999999999' }, 404, 'ORIGIN_NODE_NOT_FOUND'],
    [{ ...input, scenarioId: 'de000000-0000-4000-8000-000000000099' }, 404, 'SCENARIO_NOT_FOUND'],
    [{ ...input, originNodeId: 529 }, 400, 'VALIDATION_ERROR'],
  ])('rejects invalid or stale shelter contexts', async (payload, status, code) => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/shelters/reachability', payload });
    expect(response.statusCode).toBe(status); expect(response.json().error.code).toBe(code);
  });
});
