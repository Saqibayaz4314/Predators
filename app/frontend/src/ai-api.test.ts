import { afterEach, expect, it, vi } from 'vitest';
import type { SnapResult, StudyArea } from '@flood/shared';
import { aiExplanationDataSchema } from '@flood/shared';
import { readApi } from './geospatial-api';
import { aiBriefErrorLabel, aiSourceLabels, buildAiBriefRequest, explainScenario, shouldRequestBrief } from './ai-api';

afterEach(() => vi.unstubAllGlobals());

const area: StudyArea = { id: '020ce29e-ec4f-4514-b14f-58c1252191cc', slug: 'sukkur-rohri', name: 'Sukkur / Rohri', datasetVersion: 'sukkur-osm-2026-10-v1', isActive: true, mapCenter: { longitude: 68.885, latitude: 27.71 }, defaultZoom: 12 };
const origin: SnapResult = { nodeId: '529', snappedPoint: { longitude: 68.86, latitude: 27.7 }, snapDistanceMeters: 12.5, datasetVersion: area.datasetVersion };
const destination: SnapResult = { nodeId: '806', snappedPoint: { longitude: 68.87, latitude: 27.71 }, snapDistanceMeters: 8.5, datasetVersion: area.datasetVersion };
const scenarioId = '9b65b1e2-0a5d-4f5f-8d5e-2b7f6f9c1a44';

it('builds the AI request from the live study area and the selected scenario', () => {
  const { request, contextKey } = buildAiBriefRequest(area, scenarioId, origin, destination);
  expect(request).toEqual({ studyAreaId: area.id, scenarioId, language: 'en', originNodeId: '529', destinationNodeId: '806' });
  expect(contextKey).toBe([area.id, area.datasetVersion, scenarioId, '529', '806'].join('|'));
});

it('omits stale endpoints instead of failing the whole brief', () => {
  const stale: SnapResult = { ...origin, datasetVersion: 'older-dataset' };
  const { request, contextKey } = buildAiBriefRequest(area, 'baseline', stale, null);
  expect(request).toEqual({ studyAreaId: area.id, scenarioId: 'baseline', language: 'en' });
  expect(request.originNodeId).toBeUndefined();
  expect(request.destinationNodeId).toBeUndefined();
  expect(contextKey.endsWith('|baseline|none|none')).toBe(true);
});

it('never auto-enables the paid request; only an exact, still-current confirmation runs', () => {
  const key = buildAiBriefRequest(area, scenarioId, origin, destination).contextKey;
  expect(shouldRequestBrief(key, null)).toBe(false);
  expect(shouldRequestBrief(key, 'stale-confirmed-context')).toBe(false);
  expect(shouldRequestBrief(key, key)).toBe(true);
});

it('posts the exact request payload and parses the version-free AI envelope', async () => {
  const request = buildAiBriefRequest(area, 'baseline', origin, destination).request;
  const brief = { title: 'Bridge corridor disruption', summary: 'The simulated closures reshape the modeled network around the corridor.', observations: ['Baseline connectivity remains.'], limitations: ['Not a safety assessment.'], language: 'en', source: 'ai', classification: 'simulated' };
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: brief, meta: { requestId: 'test' } })));
  vi.stubGlobal('fetch', fetcher);
  await expect(explainScenario('/api/v1', request)).resolves.toEqual(brief);
  expect(fetcher).toHaveBeenCalledWith('/api/v1/ai/explain', expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }));
});

it('surfaces HTTP 429 rate limiting with the retry-after seconds', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'RATE_LIMITED', message: 'private diagnostics' }, meta: { requestId: 'test' } }), { status: 429, headers: { 'retry-after': '42' } })));
  const request = buildAiBriefRequest(area, 'baseline', null, null).request;
  const failure = (await explainScenario('/api/v1', request).catch((error: unknown) => error)) as Error & { code?: string; retryAfterSeconds?: number | null };
  expect(failure).toBeInstanceOf(Error);
  expect(failure.code).toBe('RATE_LIMITED');
  expect(failure.retryAfterSeconds).toBe(42);
  expect(aiBriefErrorLabel(failure)).toBe('Too many AI brief requests. Wait 42 seconds before generating another brief.');
});

it('distinguishes request timeouts from an unreachable service', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('signal timed out', 'TimeoutError')));
  const request = buildAiBriefRequest(area, 'baseline', null, null).request;
  await expect(readApi('/api/v1', '/ai/explain', aiExplanationDataSchema, undefined, request)).rejects.toThrow('The analysis request timed out. Retry in a moment.');
});

it('labels hosted model output separately from the deterministic fallback', () => {
  expect(aiSourceLabels.ai).toBe('Hosted model output (DigitalOcean inference)');
  expect(aiSourceLabels.deterministic_fallback).toBe('Deterministic fallback — not model output');
});

it('keeps curated error messages for non-rate-limited failures', () => {
  expect(aiBriefErrorLabel(new Error('Could not reach the analysis service. Check the connection and retry.'))).toBe('Could not reach the analysis service. Check the connection and retry.');
  expect(aiBriefErrorLabel(undefined)).toBe('The AI brief could not be generated. Retry in a moment.');
});
