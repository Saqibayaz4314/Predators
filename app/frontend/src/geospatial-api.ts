import { z } from 'zod';
import { apiSuccessSchema, apiErrorSchema, studyAreasSchema, studyAreaDetailSchema, roadsSchema, scenariosSchema, zonesSchema, impactSchema, snapResultSchema, routeSchema, comparisonSchema, type StudyArea, type SnapResult } from '@flood/shared';

const errorMessages: Record<string, string> = {
  NO_NEARBY_ROAD_NODE: 'No modeled road node within 500 m. Choose a point closer to a road.',
  DATASET_VERSION_MISMATCH: 'The road dataset changed. Reload the workspace and select your points again.',
  SCENARIO_NOT_FOUND: 'This simulation is no longer available. Choose another scenario.',
  GRAPH_UNAVAILABLE: 'The road graph is warming up or unavailable. Retry shortly.',
};
export async function readApi<T extends z.ZodTypeAny>(base: string, path: string, schema: T, signal?: AbortSignal, payload?: unknown, expectedVersion?: string): Promise<z.infer<T>> {
  const timeout = AbortSignal.timeout(45_000);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, ...(payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}) });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Could not reach the analysis service. Check the connection and retry.');
  }
  const json: unknown = await response.json();
  if (!response.ok) {
    const error = apiErrorSchema.safeParse(json);
    throw new Error(error.success ? errorMessages[error.data.error.code] || 'The analysis request failed. Retry or choose another point.' : 'The analysis service is unavailable. Retry shortly.');
  }
  const result = apiSuccessSchema(z.unknown()).safeParse(json);
  if (!result.success) throw new Error('The analysis service returned an unexpected response. Reload and retry.');
  const value = result.data;
  if (expectedVersion && value.meta.datasetVersion !== expectedVersion) throw new Error(errorMessages.DATASET_VERSION_MISMATCH);
  const data = schema.safeParse(value.data);
  if (!data.success) throw new Error('The analysis service returned an unexpected response. Reload and retry.');
  return data.data;
}
export const getAreas = (base: string, signal?: AbortSignal) => readApi(base, '/study-areas', studyAreasSchema, signal);
export const getArea = (base: string, area: StudyArea, signal?: AbortSignal) => readApi(base, `/study-areas/${area.id}`, studyAreaDetailSchema, signal, undefined, area.datasetVersion);
export const getRoads = (base: string, area: StudyArea, signal?: AbortSignal) => readApi(base, `/study-areas/${area.id}/roads`, roadsSchema, signal, undefined, area.datasetVersion);
export const getScenarios = (base: string, area: StudyArea, signal?: AbortSignal) => readApi(base, `/study-areas/${area.id}/scenarios`, scenariosSchema, signal, undefined, area.datasetVersion);
export async function getScenarioLayers(base: string, area: StudyArea, scenarioId: string, signal?: AbortSignal) {
  const [zones, impact] = await Promise.all([
    readApi(base, `/scenarios/${scenarioId}/zones`, zonesSchema, signal, undefined, area.datasetVersion),
    readApi(base, `/scenarios/${scenarioId}/impact`, impactSchema, signal, undefined, area.datasetVersion),
  ]);
  if (impact.studyAreaId !== area.id || impact.scenarioId !== scenarioId || impact.datasetVersion !== area.datasetVersion) throw new Error('The response does not match the selected scenario. Reload and retry.');
  return { zones, impact };
}
export const snapPoint = (base: string, area: StudyArea, point: { longitude: number; latitude: number }, signal?: AbortSignal) => readApi(base, '/routing/snap', snapResultSchema, signal, { studyAreaId: area.id, point }, area.datasetVersion);
export async function getRoutes(base: string, area: StudyArea, scenarioId: string, origin: SnapResult, destination: SnapResult, signal?: AbortSignal) {
  const payload = { studyAreaId: area.id, scenarioId, originNodeId: origin.nodeId, destinationNodeId: destination.nodeId, expectedDatasetVersion: area.datasetVersion };
  if (scenarioId === 'baseline') {
    const baseline = await readApi(base, '/routing/route', routeSchema, signal, payload, area.datasetVersion);
    return { baseline, scenario: null, distanceChangeMeters: null, distanceChangePercent: null, outcome: baseline.status === 'reachable' ? 'unchanged' as const : 'baseline_unreachable' as const };
  }
  const comparison = await readApi(base, '/routing/compare', comparisonSchema, signal, payload, area.datasetVersion);
  if (comparison.scenarioId !== scenarioId || comparison.studyAreaId !== area.id) throw new Error('Route context changed. Calculate again.');
  return comparison;
}
export type RouteResults = Awaited<ReturnType<typeof getRoutes>>;
