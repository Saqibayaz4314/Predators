import { aiExplanationDataSchema, type AIExplanationData, type AIExplanationRequest, type SnapResult, type StudyArea } from '@flood/shared';
import { readApi } from './geospatial-api';

/** POST /ai/explain. The success envelope meta carries only requestId — no
 *  datasetVersion — so expectedVersion must never be passed here (it would
 *  always fail). Staleness is prevented by the versioned query key that the
 *  AI brief panel builds from the context key instead. */
export async function explainScenario(base: string, request: AIExplanationRequest, signal?: AbortSignal) {
  return readApi(base, '/ai/explain', aiExplanationDataSchema, signal, request);
}

/** Builds the explain request from live workspace state — never hardcoded
 *  IDs. Endpoints are forwarded only when their snap matches the active
 *  dataset version; stale points are omitted (not guessed) so the brief still
 *  generates from verified impact data instead of failing the whole request. */
export function buildAiBriefRequest(area: StudyArea, scenarioId: string, origin: SnapResult | null, destination: SnapResult | null): { request: AIExplanationRequest; contextKey: string } {
  const originPoint = origin && origin.datasetVersion === area.datasetVersion ? origin : null;
  const destinationPoint = destination && destination.datasetVersion === area.datasetVersion ? destination : null;
  const request: AIExplanationRequest = {
    studyAreaId: area.id,
    scenarioId,
    language: 'en',
    ...(originPoint ? { originNodeId: originPoint.nodeId } : {}),
    ...(destinationPoint ? { destinationNodeId: destinationPoint.nodeId } : {}),
  };
  const contextKey = [area.id, area.datasetVersion, scenarioId, originPoint?.nodeId ?? 'none', destinationPoint?.nodeId ?? 'none'].join('|');
  return { request, contextKey };
}

/** The paid endpoint runs only while the user-confirmed context is still the
 *  current one — page loads and scenario/endpoint switches never fire it. */
export const shouldRequestBrief = (contextKey: string, requestedKey: string | null): boolean => requestedKey !== null && requestedKey === contextKey;

export const aiSourceLabels: Record<AIExplanationData['source'], string> = {
  ai: 'Hosted model output (DigitalOcean inference)',
  deterministic_fallback: 'Deterministic fallback — not model output',
};

/** Rate-limited briefs surface the exact retry-after period; every other
 *  failure keeps the curated readApi message unchanged. */
export function aiBriefErrorLabel(error: unknown): string {
  if (error instanceof Error) {
    const { code, retryAfterSeconds } = error as { code?: unknown; retryAfterSeconds?: unknown };
    if (code === 'RATE_LIMITED' && typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
      return `Too many AI brief requests. Wait ${retryAfterSeconds} seconds before generating another brief.`;
    }
    if (error.message) return error.message;
  }
  return 'The AI brief could not be generated. Retry in a moment.';
}
