import { shelterListSchema, shelterReachabilitySchema, analysisComparisonSchema, type StudyArea } from '@flood/shared';
import { readApi } from './geospatial-api';

export const getShelters = (base: string, area: StudyArea, signal?: AbortSignal) => readApi(base, `/study-areas/${area.id}/shelters`, shelterListSchema, signal, undefined, area.datasetVersion);
export async function getShelterReachability(base: string, area: StudyArea, scenarioId: string, originNodeId: string, signal?: AbortSignal) {
  const data = await readApi(base, '/shelters/reachability', shelterReachabilitySchema, signal, { studyAreaId: area.id, scenarioId, originNodeId, expectedDatasetVersion: area.datasetVersion }, area.datasetVersion);
  if (data.studyAreaId !== area.id || data.scenarioId !== scenarioId || data.originNodeId !== originNodeId || data.datasetVersion !== area.datasetVersion) throw new Error('Shelter analysis context changed. Reload and retry.');
  return data;
}
export async function getAnalysisComparison(base: string, area: StudyArea, scenarioIds: string[], originNodeId: string, destinationNodeId?: string, signal?: AbortSignal) {
  const data = await readApi(base, '/analysis/compare', analysisComparisonSchema, signal, { studyAreaId: area.id, scenarioIds, originNodeId, destinationNodeId, expectedDatasetVersion: area.datasetVersion }, area.datasetVersion);
  if (data.studyAreaId !== area.id || data.datasetVersion !== area.datasetVersion || data.originNodeId !== originNodeId || data.destinationNodeId !== (destinationNodeId ?? null) || data.items.map((item) => item.scenarioId).join() !== scenarioIds.join()) throw new Error('Scenario comparison context changed. Reload and retry.');
  return data;
}
