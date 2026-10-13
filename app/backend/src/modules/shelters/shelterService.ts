import type pg from 'pg';
import { geoPointSchema, shelterListSchema, shelterReachabilitySchema, type Shelter, type ShelterReachabilityItem } from '@flood/shared';
import type { Env } from '../../config/env.js';
import type { RoadGraph } from '../../routing/graph.js';
import { getOrLoadGraph } from '../../routing/graphCache.js';
import { snapToNearestNodeInMemory } from '../../routing/snapping.js';
import { singleSourceDistances } from '../../routing/dijkstra.js';
import { requireStudyArea } from '../studyAreas.js';
import { computeScenarioImpact, getActiveScenario } from '../flood/floodService.js';
import { hypotheticalShelters } from './demoFixtures.js';
import { readShelterRecords, readFloodFlags, type ShelterRecord } from './shelterRepository.js';

export const SHELTER_MAX_SNAP_METERS = 500;
export const SHELTER_DISCLAIMER = 'Road reachability does not confirm shelter safety, capacity, occupancy or operational status. Flood zones are hypothetical. Demonstration destinations are not real shelters.';
export function fail(code: string, statusCode: number): never { throw Object.assign(new Error(code), { code, statusCode }); }
export async function assertDataset(pool: pg.Pool, studyAreaId: string, expected?: string) {
  const area = await requireStudyArea(pool, studyAreaId);
  if (expected && expected !== area.datasetVersion) fail('DATASET_VERSION_MISMATCH', 409);
  return area;
}
export async function requireScenario(pool: pg.Pool, studyAreaId: string, scenarioId: string) {
  if (scenarioId === 'baseline') return null;
  const scenario = await getActiveScenario(pool, scenarioId);
  if (!scenario) fail('SCENARIO_NOT_FOUND', 404);
  if (scenario.studyAreaId !== studyAreaId) fail('SCENARIO_STUDY_AREA_MISMATCH', 409);
  return scenario;
}
export function connectShelters(graph: RoadGraph, records: readonly ShelterRecord[]): Shelter[] {
  return records.map((record) => {
    const point = geoPointSchema.safeParse(record.location);
    const snap = point.success ? snapToNearestNodeInMemory(graph, point.data.longitude, point.data.latitude, SHELTER_MAX_SNAP_METERS) : null;
    return { ...record, location: point.success ? point.data : null, hasValidatedNetworkConnection: Boolean(snap), nearestNodeId: snap?.nodeId ?? null, snappedPoint: snap ? { longitude: snap.longitude, latitude: snap.latitude } : null, snapDistanceMeters: snap?.distanceMeters ?? null, connectionReason: !point.success ? 'invalid_coordinates' : snap ? 'connected' : 'outside_snap_radius' };
  });
}
export function classifyShelters(shelters: readonly Shelter[], baseline: ReadonlyMap<string, number>, scenario: ReadonlyMap<string, number>, flags: ReadonlyMap<string, boolean | null>) {
  return shelters.map((shelter): ShelterReachabilityItem => {
    const base = shelter.nearestNodeId ? baseline.get(shelter.nearestNodeId) : undefined;
    const active = shelter.nearestNodeId ? scenario.get(shelter.nearestNodeId) : undefined;
    if (active != null && (base == null || active < base - 0.01)) throw new Error('Shelter distance invariant violated');
    const connected = shelter.hasValidatedNetworkConnection && shelter.nearestNodeId !== null;
    const status = !connected ? 'unknown' : active == null ? 'unreachable' : 'reachable';
    return { shelterId: shelter.id, status, baselineStatus: !connected ? 'unknown' : base == null ? 'unreachable' : 'reachable', reason: !connected ? shelter.connectionReason === 'invalid_coordinates' ? 'invalid_coordinates' : 'outside_snap_radius' : active != null ? 'network_path_exists' : base != null ? 'scenario_blocked' : 'baseline_disconnected', networkDistanceMeters: active == null ? null : Math.round(active * 10) / 10, baselineDistanceMeters: base == null ? null : Math.round(base * 10) / 10, withinSimulatedFloodZone: flags.get(shelter.id) ?? null };
  });
}
export function shelterSummary(items: readonly ShelterReachabilityItem[], baseline = false) {
  const summary = { reachable: 0, unreachable: 0, unknown: 0 };
  for (const item of items) summary[baseline ? item.baselineStatus : item.status]++;
  return summary;
}
export async function loadShelters(pool: pg.Pool, env: Env, studyAreaId: string, graph: RoadGraph) {
  const demo = env.SHELTER_DEMO && env.NODE_ENV !== 'production';
  const records = demo ? hypotheticalShelters(graph) : await readShelterRecords(pool, studyAreaId);
  return { records, shelters: connectShelters(graph, records), dataMode: demo ? 'hypothetical_demo' as const : 'live' as const };
}
export async function listShelterCandidates(pool: pg.Pool, env: Env, studyAreaId: string) {
  const area = await assertDataset(pool, studyAreaId);
  const graph = await getOrLoadGraph(pool, studyAreaId, area.datasetVersion);
  const loaded = await loadShelters(pool, env, studyAreaId, graph);
  await assertDataset(pool, studyAreaId, area.datasetVersion);
  return shelterListSchema.parse({ items: loaded.shelters, datasetVersion: area.datasetVersion, dataMode: loaded.dataMode, maxSnapDistanceMeters: SHELTER_MAX_SNAP_METERS, disclaimer: SHELTER_DISCLAIMER });
}
export async function evaluateShelters(pool: pg.Pool, env: Env, input: { studyAreaId: string; scenarioId: string; originNodeId: string; expectedDatasetVersion?: string }) {
  const area = await assertDataset(pool, input.studyAreaId, input.expectedDatasetVersion);
  await requireScenario(pool, area.id, input.scenarioId);
  const graph = await getOrLoadGraph(pool, area.id, area.datasetVersion);
  const loaded = await loadShelters(pool, env, area.id, graph);
  const baseline = singleSourceDistances(graph, input.originNodeId, new Set());
  const impact = input.scenarioId === 'baseline' ? null : await computeScenarioImpact(pool, input.scenarioId, area.id, area.datasetVersion);
  const scenario = impact ? singleSourceDistances(graph, input.originNodeId, impact.blockedArcIds) : baseline;
  const flags = await readFloodFlags(pool, input.scenarioId, loaded.records);
  const items = classifyShelters(loaded.shelters, baseline, scenario, flags);
  await assertDataset(pool, area.id, area.datasetVersion);
  return shelterReachabilitySchema.parse({ ...input, datasetVersion: area.datasetVersion, dataMode: loaded.dataMode, items, summary: shelterSummary(items), baselineSummary: shelterSummary(items, true), disclaimer: SHELTER_DISCLAIMER });
}
