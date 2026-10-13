import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { Roads, Zones, SnapResult } from '@flood/shared';
import type { RouteResults } from './geospatial-api';
import { readMapTheme } from './map-theme';

export interface MapData { roads?: Roads; zones?: Zones; affectedIds?: string[]; routes?: RouteResults; origin: SnapResult | null; destination: SnapResult | null }
const collection = (features: Feature[] = []): FeatureCollection => ({ type: 'FeatureCollection', features });
const feature = (geometry: Geometry, properties = {}): Feature => ({ type: 'Feature', geometry, properties });
export function mapCollections(data: MapData) {
  const affected = new Set(data.affectedIds);
  return {
    roads: data.roads ?? collection(),
    flood: data.zones ?? collection(),
    closures: collection(data.roads?.features.filter((road) => affected.has(road.properties.physicalSegmentId))),
    baseline: collection(data.routes?.baseline.geometry ? [feature(data.routes.baseline.geometry)] : []),
    scenario: collection(data.routes?.scenario?.geometry ? [feature(data.routes.scenario.geometry)] : []),
    endpoints: collection((['origin', 'destination'] as const).flatMap((role) => {
      const point = data[role]?.snappedPoint;
      return point ? [feature({ type: 'Point', coordinates: [point.longitude, point.latitude] }, { role })] : [];
    })),
  };
}
export function installMapLayers(map: Map, data: MapData) {
  if (!map.getStyle()) return;
  const palette = readMapTheme();
  for (const [name, geojson] of Object.entries(mapCollections(data))) {
    const id = `atlas-${name}`;
    const source = map.getSource(id) as GeoJSONSource | undefined;
    if (source) source.setData(geojson);
    else map.addSource(id, { type: 'geojson', data: geojson });
  }
  // Expose actual installed source sizes as DOM diagnostics for browser QA.
  // This contains counts only; route details remain in the normal inspector.
  const canvas = map.getCanvas?.();
  if (canvas) {
    for (const [name, source] of Object.entries(map.getStyle()?.sources ?? {})) {
      if (!name.startsWith('atlas-') || source.type !== 'geojson' || typeof source.data !== 'object' || source.data.type !== 'FeatureCollection') continue;
      canvas.dataset[name.replace('atlas-', '')] = String(source.data.features.length);
    }
  }
  if (map.getLayer('atlas-roads')) return;
  const line = (id: string, source: string, color: string, width: number, extras = {}) => map.addLayer({ id, source, type: 'line', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': width, ...extras } });
  map.addLayer({ id: 'atlas-flood', source: 'atlas-flood', type: 'fill', paint: { 'fill-color': palette.colors.floodFill, 'fill-opacity': palette.floodOpacity } });
  line('atlas-flood-outline', 'atlas-flood', palette.colors.floodOutline, 1.5);
  line('atlas-roads', 'atlas-roads', palette.colors.unknownShelter, 1, { 'line-opacity': .35 });
  line('atlas-closures-halo', 'atlas-closures', palette.colors.halo, 5);
  line('atlas-closures', 'atlas-closures', palette.colors.affectedRoad, 2.5);
  line('atlas-baseline-halo', 'atlas-baseline', palette.colors.halo, 9);
  line('atlas-baseline', 'atlas-baseline', palette.colors.baseline, 7, { 'line-dasharray': palette.baselineDashArray });
  line('atlas-scenario-halo', 'atlas-scenario', palette.colors.halo, 4.5);
  line('atlas-scenario', 'atlas-scenario', palette.colors.scenario, 3.5);
  map.addLayer({ id: 'atlas-endpoints', source: 'atlas-endpoints', type: 'circle', paint: {
    'circle-radius': 8, 'circle-stroke-width': 3, 'circle-stroke-color': palette.colors.halo,
    'circle-color': ['match', ['get', 'role'], 'origin', palette.colors.origin, palette.colors.destination],
  } });
}
