import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { shelterListSchema, type StudyArea } from '@flood/shared';
import { ShelterInspector } from './ShelterInspector';
import { getShelters, getShelterReachability, getAnalysisComparison } from './accessibility-api';
import { mapCollections } from './map-layers';

const area: StudyArea = { id: '020ce29e-ec4f-4514-b14f-58c1252191cc', slug: 'sukkur-rohri', name: 'Sukkur', datasetVersion: 'v1', isActive: true, mapCenter: { longitude: 68.85, latitude: 27.7 }, defaultZoom: 12 };
const id = 'de000000-0000-4000-8000-000000000001';
const list = shelterListSchema.parse({ items: [{ id, name: 'Hypothetical unit destination', location: { longitude: 68.85, latitude: 27.7 }, snappedPoint: { longitude: 68.85, latitude: 27.7 }, capacity: null, dataStatus: 'demonstration', sourceName: 'Unit fixture', hasValidatedNetworkConnection: true, nearestNodeId: '1', snapDistanceMeters: 0, connectionReason: 'connected' }], datasetVersion: 'v1', dataMode: 'hypothetical_demo', maxSnapDistanceMeters: 500, disclaimer: 'Not operational shelter data' });
afterEach(() => vi.unstubAllGlobals());
const render = (input = list) => renderToStaticMarkup(createElement(ShelterInspector, { list: input, selectedId: id, onSelect: () => {}, onRoute: () => {}, originSelected: false, busy: false, retry: () => {} }));
it('shows honest empty live data without invented available counts', () => {
  const markup = render({ ...list, items: [], dataMode: 'live' });
  expect(markup).toContain('No verified shelter data available');
  expect(markup).not.toContain('Accessible shelters');
  expect(markup).toContain('does not confirm shelter safety');
  // A successful empty result is data, never a failure notice.
  expect(markup).not.toContain('analysis request failed');
  expect(markup).not.toContain('Retry shelters');
});
it('renders an actionable shelter error with retry when the request failed', () => {
  const markup = renderToStaticMarkup(createElement(ShelterInspector, { list: undefined, analysis: undefined, selectedId: null, onSelect: () => {}, onRoute: () => {}, originSelected: false, busy: false, error: 'This analysis endpoint is not available on the connected service. Reload the workspace or restart the analysis service.', retry: () => {} }));
  expect(markup).toContain('This analysis endpoint is not available on the connected service.');
  expect(markup).toContain('Retry shelters');
  expect(markup).not.toContain('No verified shelter data available');
});
it('labels hypothetical fixtures, unknown capacity and unevaluated access', () => {
  const markup = render();
  expect(markup).toContain('These are not real shelters');
  expect(markup).toContain('Capacity: Unknown');
  expect(markup).toContain('Not evaluated');
  expect(markup).toContain('disabled');
});
it('does not render markers for missing shelter locations', () => {
  const missing = { ...list.items[0]!, id: 'de000000-0000-4000-8000-000000000002', location: null, snappedPoint: null, nearestNodeId: null, hasValidatedNetworkConnection: false, snapDistanceMeters: null, connectionReason: 'invalid_coordinates' as const };
  const data = mapCollections({ origin: null, destination: null, shelters: { ...list, items: [...list.items, missing] } });
  expect(data.shelters.features).toHaveLength(1);
  expect(data.shelters.features[0]?.properties).toMatchObject({ status: 'unknown', shelterId: id });
});
it('rejects stale shelter results for a different origin or scenario', async () => {
  const data = { studyAreaId: area.id, scenarioId: 'baseline', originNodeId: '2', datasetVersion: 'v1', dataMode: 'live', items: [], summary: { reachable: 0, unreachable: 0, unknown: 0 }, baselineSummary: { reachable: 0, unreachable: 0, unknown: 0 }, disclaimer: 'Prototype' };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data, meta: { requestId: '1', datasetVersion: 'v1' } }))));
  await expect(getShelterReachability('/api/v1', area, 'baseline', '1')).rejects.toThrow('context changed');
});
it('sends cancellable versioned scenario comparisons with no invented destination', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'DATASET_VERSION_MISMATCH', message: 'Stale' }, meta: { requestId: '1' } }), { status: 409 }));
  vi.stubGlobal('fetch', fetch);
  await expect(getAnalysisComparison('/api/v1', area, [id], '1')).rejects.toThrow('dataset changed');
  expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({ studyAreaId: area.id, scenarioIds: [id], originNodeId: '1', expectedDatasetVersion: 'v1' });
  expect(fetch.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
});
it('resolves an empty shelter directory as data, not as a failed request', async () => {
  const data = { items: [], datasetVersion: 'v1', dataMode: 'live', maxSnapDistanceMeters: 500, disclaimer: 'Prototype' };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data, meta: { requestId: '1', datasetVersion: 'v1' } }))));
  await expect(getShelters('/api/v1', area)).resolves.toEqual(data);
});
