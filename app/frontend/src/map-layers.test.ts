import { afterEach, expect, it, vi } from 'vitest';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { mapCollections, installMapLayers, type MapData } from './map-layers';
const line = { type: 'LineString' as const, coordinates: [[68.8, 27.7], [68.9, 27.7]] as [number, number][] };
const roads = { type: 'FeatureCollection' as const, features: ['1', '2'].map((id) => ({ type: 'Feature' as const, geometry: line, properties: { physicalSegmentId: id, roadName: null, highwayType: null, isOneWay: false } })) };
const empty: MapData = { origin: null, destination: null };
afterEach(() => vi.unstubAllGlobals());
it('renders one closure per affected physical road from the API set', () => {
  const collections = mapCollections({ ...empty, roads, affectedIds: ['2'] });
  expect(collections.closures.features).toHaveLength(1);
  expect(collections.closures.features[0]?.properties?.physicalSegmentId).toBe('2');
});
it('does not fabricate route geometry for unreachable or unevaluated states', () => {
  expect(mapCollections(empty).baseline.features).toHaveLength(0);
  expect(mapCollections(empty).scenario.features).toHaveLength(0);
});
it('reinstalls every overlay after a basemap style clears sources and layers', () => {
  vi.stubGlobal('document', { documentElement: { dataset: { theme: 'light' } } });
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (key: string) => key.includes('opacity') ? '.18' : '#123456' }));
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
  const layers = new Map<string, Record<string, unknown>>();
  const map = { getStyle: () => ({}), getSource: (id: string) => sources.get(id), addSource: (id: string) => sources.set(id, { setData: vi.fn() }), getLayer: (id: string) => layers.get(id), addLayer: (layer: Record<string, unknown>) => layers.set(layer.id as string, layer) } as unknown as MapLibreMap;
  installMapLayers(map, { ...empty, roads, affectedIds: ['1'] });
  expect(sources.size).toBe(6);
  expect([...layers.keys()]).toEqual(expect.arrayContaining(['atlas-flood', 'atlas-roads', 'atlas-closures', 'atlas-baseline', 'atlas-scenario', 'atlas-endpoints']));
  sources.clear(); layers.clear();
  installMapLayers(map, { ...empty, roads, affectedIds: ['2'] });
  expect(sources.size).toBe(6);
  expect([...layers.keys()]).toEqual(expect.arrayContaining(['atlas-flood', 'atlas-roads', 'atlas-closures', 'atlas-baseline', 'atlas-scenario', 'atlas-endpoints']));
  expect(layers.get('atlas-baseline')?.paint).toMatchObject({ 'line-dasharray': [2, 2] });
});
