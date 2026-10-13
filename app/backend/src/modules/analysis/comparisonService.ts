import type pg from 'pg';
import { analysisComparisonSchema, type AnalysisRequest } from '@flood/shared';
import type { Env } from '../../config/env.js';
import { getOrLoadGraph } from '../../routing/graphCache.js';
import { singleSourceDistances } from '../../routing/dijkstra.js';
import { computeScenarioImpact } from '../flood/floodService.js';
import { assertDataset, requireScenario, loadShelters, classifyShelters, shelterSummary, fail, SHELTER_DISCLAIMER } from '../shelters/shelterService.js';

/** Physical IDs are sets: overlapping zones and bidirectional arcs count once. */
export function closureOverlap(inputs: readonly { scenarioId: string; physicalIds: readonly string[] }[]) {
  const sets = inputs.map((input) => new Set(input.physicalIds));
  const union = new Set(sets.flatMap((set) => [...set]));
  const sorted = (values: Iterable<string>) => [...values].sort();
  const sharedByAllPhysicalSegmentIds = sorted([...union].filter((id) => sets.every((set) => set.has(id))));
  const perScenario = inputs.map((input, index) => ({
    scenarioId: input.scenarioId,
    uniqueBlockedPhysicalSegmentIds: sorted([...sets[index]!].filter((id) => sets.every((set, other) => other === index || !set.has(id)))),
    sharedBlockedPhysicalSegmentIds: sorted([...sets[index]!].filter((id) => sets.some((set, other) => other !== index && set.has(id)))),
  }));
  const pairwise: { scenarioIds: [string, string]; sharedPhysicalSegmentIds: string[] }[] = [];
  for (let i = 0; i < inputs.length; i++) for (let j = i + 1; j < inputs.length; j++) pairwise.push({ scenarioIds: [inputs[i]!.scenarioId, inputs[j]!.scenarioId], sharedPhysicalSegmentIds: sorted([...sets[i]!].filter((id) => sets[j]!.has(id))) });
  return { perScenario, closures: { unionPhysicalSegmentIds: sorted(union), sharedByAllPhysicalSegmentIds, pairwise } };
}
export function routeDelta(baseline: number | undefined, scenario: number | undefined) {
  if (baseline == null || scenario == null) return { distanceChangeMeters: null, distanceChangePercent: null };
  if (scenario < baseline - 0.01) throw new Error('Scenario distance invariant violated');
  return { distanceChangeMeters: Math.max(0, Math.round((scenario - baseline) * 10) / 10), distanceChangePercent: baseline > 0 ? Math.max(0, Math.round((scenario - baseline) / baseline * 10000) / 100) : null };
}
export async function compareScenarios(pool: pg.Pool, env: Env, input: AnalysisRequest) {
  const area = await assertDataset(pool, input.studyAreaId, input.expectedDatasetVersion);
  // Validate every requested scenario before computing any result.
  const scenarios = [];
  for (const id of input.scenarioIds) scenarios.push((await requireScenario(pool, area.id, id))!);
  const graph = await getOrLoadGraph(pool, area.id, area.datasetVersion);
  if (input.destinationNodeId && !graph.nodes.has(input.destinationNodeId)) fail('DESTINATION_NODE_NOT_FOUND', 404);
  const baseline = singleSourceDistances(graph, input.originNodeId, new Set());
  const loaded = await loadShelters(pool, env, area.id, graph);
  const baselineShelters = classifyShelters(loaded.shelters, baseline, baseline, new Map());
  const baseDistance = input.destinationNodeId ? baseline.get(input.destinationNodeId) : undefined;
  const impacts = [];
  const items = [];
  // Sequential spatial reads bound the hosted database's connection budget.
  for (const scenario of scenarios) {
    const impact = await computeScenarioImpact(pool, scenario.id, area.id, area.datasetVersion);
    impacts.push({ scenarioId: scenario.id, physicalIds: impact.affectedPhysicalSegmentIds });
    const distances = singleSourceDistances(graph, input.originNodeId, impact.blockedArcIds);
    const summary = shelterSummary(classifyShelters(loaded.shelters, baseline, distances, new Map()));
    const routeDistance = input.destinationNodeId ? distances.get(input.destinationNodeId) : undefined;
    if (baseDistance == null && routeDistance != null) throw new Error('Removing arcs cannot connect a disconnected baseline');
    items.push({ scenarioId: scenario.id, title: scenario.title, affectedPhysicalSegments: impact.affectedPhysicalSegments, blockedDirectedArcs: impact.blockedDirectedArcs, affectedRoadPercentage: impact.affectedRoadPercentage,
      reachableShelters: summary.reachable, unreachableShelters: summary.unreachable, unknownShelters: summary.unknown,
      routeStatus: !input.destinationNodeId ? 'not_requested' : baseDistance == null ? 'baseline_unreachable' : routeDistance == null ? 'unreachable' : 'reachable',
      routeDistanceMeters: routeDistance == null ? null : Math.round(routeDistance * 10) / 10, ...routeDelta(baseDistance, routeDistance) });
  }
  const overlap = closureOverlap(impacts);
  await assertDataset(pool, area.id, area.datasetVersion);
  return analysisComparisonSchema.parse({ studyAreaId: area.id, datasetVersion: area.datasetVersion, originNodeId: input.originNodeId, destinationNodeId: input.destinationNodeId ?? null,
    baselineRouteDistanceMeters: baseDistance == null ? null : Math.round(baseDistance * 10) / 10,
    baselineRouteStatus: !input.destinationNodeId ? 'not_requested' : baseDistance == null ? 'unreachable' : 'reachable',
    baselineShelterSummary: shelterSummary(baselineShelters), shelterCount: loaded.shelters.length, shelterDataMode: loaded.dataMode,
    items: items.map((item, index) => ({ ...item, ...overlap.perScenario[index] })), closures: overlap.closures, disclaimer: SHELTER_DISCLAIMER });
}
