import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataProvenance, StudyArea } from '@flood/shared';
import type { ScreenData } from './screen-data';
import { DataScreen, ProvenanceSection } from './DataScreen';
import { formatCount, formatProvenanceTimestamp, getAreaSummary, getProvenance, provenanceRows } from './data-api';

afterEach(() => vi.unstubAllGlobals());

const area: StudyArea = { id: '020ce29e-ec4f-4514-b14f-58c1252191cc', slug: 'sukkur-rohri', name: 'Sukkur / Rohri', datasetVersion: 'sukkur-osm-2026-10-v1', isActive: true, mapCenter: { longitude: 68.885, latitude: 27.71 }, defaultZoom: 12 };
const provenance: DataProvenance = {
  studyAreaId: area.id, datasetVersion: area.datasetVersion,
  osmSource: 'OpenStreetMap extract (pakistan-261012.osm.pbf)', osmLicense: 'ODbL — © OpenStreetMap contributors',
  retrievedAt: null, importedAt: '2026-10-13T09:41:00.000Z',
  floodScenarioClassification: 'simulated',
  roadRoutingLimitations: ['Shortest-path routing over an OSM-derived directed graph.'],
  shelterDataLimitations: ['Shelter candidates are demonstration destinations, not verified facilities.'],
  attribution: ['Road data © OpenStreetMap contributors, licensed under ODbL.'],
};

it('fetches provenance through the versioned envelope and context check', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: provenance, meta: { requestId: 'test', datasetVersion: area.datasetVersion } })));
  vi.stubGlobal('fetch', fetcher);
  await expect(getProvenance('/api/v1', area)).resolves.toEqual(provenance);
  expect(fetcher).toHaveBeenCalledWith('/api/v1/data/provenance', expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

it('rejects provenance that does not match the selected study area', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { ...provenance, studyAreaId: '11111111-1111-4111-8111-111111111111' }, meta: { requestId: 'test', datasetVersion: area.datasetVersion } }))));
  await expect(getProvenance('/api/v1', area)).rejects.toThrow('Provenance context changed');
});

it('maps provenance display rows without fabricating missing values', () => {
  const rows = provenanceRows(provenance);
  const values = Object.fromEntries(rows.map((row) => [row.label, row.value]));
  expect(values['Dataset version']).toBe(area.datasetVersion);
  expect(values['OSM source']).toContain('OpenStreetMap');
  expect(values['License']).toContain('ODbL');
  expect(values['Source retrieved']).toBe('Not recorded');
  expect(values['Imported into PostGIS']).toBe('2026-10-13 09:41:00 UTC');
  expect(values['Flood scenario classification']).toContain('Simulated');
});

it('never invents timestamps or counts', () => {
  expect(formatProvenanceTimestamp(null)).toBe('Not recorded');
  expect(formatProvenanceTimestamp('2026-10-13T09:41:00.000Z')).toBe('2026-10-13 09:41:00 UTC');
  expect(formatCount(undefined)).toBe('Unavailable');
  expect(formatCount(15152)).toMatch(/15[.,]152/);
});

it('fetches the study-area summary and rejects stale context', async () => {
  const summary = { studyAreaId: area.id, datasetVersion: area.datasetVersion, totalPhysicalRoadSegments: 15152, totalDirectedArcs: 29448, totalGraphNodes: 11940, totalShelterCandidates: 0, totalSimulatedScenarios: 3, dataStatus: 'ready' };
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: summary, meta: { requestId: 'test', datasetVersion: area.datasetVersion } })));
  vi.stubGlobal('fetch', fetcher);
  await expect(getAreaSummary('/api/v1', area)).resolves.toEqual(summary);
  expect(fetcher).toHaveBeenCalledWith(`/api/v1/study-areas/${area.id}/summary`, expect.anything());
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { ...summary, datasetVersion: 'older' }, meta: { requestId: 'test', datasetVersion: 'older' } }))));
  await expect(getAreaSummary('/api/v1', area)).rejects.toThrow('dataset changed');
});

it('renders the verified provenance fields and limitations on About Data', () => {
  const markup = renderToStaticMarkup(createElement(ProvenanceSection, { provenance, busy: false, error: undefined, retry: () => {} }));
  expect(markup).toContain('DATASET PROVENANCE');
  expect(markup).toContain('Not recorded');
  expect(markup).toContain('2026-10-13 09:41:00 UTC');
  expect(markup).toContain('Shortest-path routing over an OSM-derived directed graph.');
  expect(markup).toContain('not verified facilities');
  expect(markup).toContain('© OpenStreetMap contributors');
});

it('renders a loading provenance state and honest unavailable counts', () => {
  const data = {
    area,
    areas: { isError: false, isPending: false, isFetching: false, data: { items: [area] }, error: undefined, refetch: () => Promise.resolve() },
    detail: { isError: false, isPending: false, isFetching: false, data: undefined, error: undefined, refetch: () => Promise.resolve() },
    roads: { isError: false, isPending: false, isFetching: false, data: undefined, error: undefined, refetch: () => Promise.resolve() },
    scenarios: { isError: false, isPending: false, isFetching: false, data: undefined, error: undefined, refetch: () => Promise.resolve() },
    shelters: { isError: false, isPending: false, isFetching: false, data: undefined, error: undefined, refetch: () => Promise.resolve() },
    impacts: [],
  } as unknown as ScreenData;
  const markup = renderToStaticMarkup(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(DataScreen, { data, apiBaseUrl: '/api/v1' })));
  expect(markup).toContain('Graph nodes');
  expect(markup).toContain('Unavailable');
  expect(markup).toContain('DATASET PROVENANCE');
  expect(markup).toContain('Loading verified API results');
  expect(markup).toContain('WGS84 / EPSG:4326');
  expect(markup).not.toContain('Not exposed by current API');
});
