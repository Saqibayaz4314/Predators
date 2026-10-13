import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { LocateFixed, Minus, Plus, RotateCcw } from 'lucide-react';
import type { StudyAreaDetail } from '@flood/shared';
import { useTheme } from './theme';
import { MAP_STYLES } from './map-theme';
import { installMapLayers, type MapData } from './map-layers';
import type { PointRole } from './workspace-store';
// MapLibre 6's ESM worker must be bundled separately by Vite in production.
maplibregl.setWorkerUrl(workerUrl);

export function GeographicMap({ area, data, selecting, onSelect, onShelterSelect }: { area?: StudyAreaDetail; data: MapData; selecting: PointRole | null; onSelect: (point: { longitude: number; latitude: number }) => void; onShelterSelect: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const styleReady = useRef(false);
  const latest = useRef({ data, selecting, onSelect, onShelterSelect });
  latest.current = { data, selecting, onSelect, onShelterSelect };
  const { theme } = useTheme();
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadedStyle, setLoadedStyle] = useState('');
  const [view, setView] = useState('Sukkur / Rohri');
  const [retry, setRetry] = useState(0);
  const [center, setCenter] = useState<{ longitude: number; latitude: number } | null>(null);
  const appliedStyle = useRef({ theme, retry });
  const fittedRoute = useRef('');
  useEffect(() => {
    if (!container.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({ container: container.current, style: MAP_STYLES[theme], center: [68.875, 27.708], zoom: 12, attributionControl: { compact: true } });
    } catch {
      setMapStatus('error');
      return;
    }
    map.current = instance;
    const updateCenter = () => { const point = instance.getCenter(); setCenter({ longitude: point.lng, latitude: point.lat }); setView(`${point.lng.toFixed(4)}° E · ${point.lat.toFixed(4)}° N · z${instance.getZoom().toFixed(1)}`); };
    instance.on('style.load', () => { styleReady.current = true; installMapLayers(instance, latest.current.data); updateCenter(); });
    instance.on('idle', () => {
      if (!styleReady.current) return;
      setLoadedStyle(MAP_STYLES[appliedStyle.current.theme]);
      setMapStatus((status) => status === 'error' ? status : 'ready');
    });
    instance.on('error', () => setMapStatus('error'));
    instance.on('moveend', updateCenter);
    instance.on('click', (event) => {
      if (latest.current.selecting) { latest.current.onSelect({ longitude: event.lngLat.lng, latitude: event.lngLat.lat }); return; }
      const shelter = instance.getLayer('atlas-shelters') ? instance.queryRenderedFeatures(event.point, { layers: ['atlas-shelters'] })[0] : undefined;
      if (typeof shelter?.properties?.shelterId === 'string') latest.current.onShelterSelect(shelter.properties.shelterId);
    });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => { observer.disconnect(); styleReady.current = false; instance.remove(); map.current = null; };
    // Map lifecycle is independent of theme and query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (appliedStyle.current.theme === theme && appliedStyle.current.retry === retry) return;
    appliedStyle.current = { theme, retry };
    styleReady.current = false;
    setLoadedStyle('');
    setMapStatus('loading');
    instance.setStyle(MAP_STYLES[theme], { diff: false });
  }, [theme, retry]);
  useEffect(() => {
    if (map.current && styleReady.current) {
      setMapStatus('loading');
      installMapLayers(map.current, data);
    }
  }, [data]);
  useEffect(() => {
    const route = data.routes?.baseline;
    if (!map.current || !route?.geometry) return;
    const key = `${route.originNodeId}:${route.destinationNodeId}`;
    if (fittedRoute.current === key) return;
    fittedRoute.current = key;
    const points = [...route.geometry.coordinates, ...(data.routes?.scenario?.geometry?.coordinates ?? [])];
    const longitudes = points.map((point) => point[0]);
    const latitudes = points.map((point) => point[1]);
    map.current.fitBounds([[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]], { padding: 65, maxZoom: 14, duration: 0 });
  }, [data.routes]);
  useEffect(() => {
    if (!map.current || !area) return;
    const points = area.boundary.coordinates.flat(2);
    const longitudes = points.map((point) => point[0]);
    const latitudes = points.map((point) => point[1]);
    map.current.fitBounds([[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]], { padding: 30, duration: 0 });
  }, [area]);
  useEffect(() => { if (map.current) map.current.getCanvas().style.cursor = selecting ? 'crosshair' : ''; }, [selecting]);
  function resetView() {
    if (area) map.current?.jumpTo({ center: [area.mapCenter.longitude, area.mapCenter.latitude], zoom: area.defaultZoom });
  }
  return <section className="map-space" aria-label="Interactive Sukkur and Rohri map" data-map-status={mapStatus} data-theme-style={MAP_STYLES[theme]} data-loaded-style={loadedStyle}>
    <div className="map-toolbar"><span>GEOGRAPHIC WORKSPACE</span><span>{mapStatus === 'loading' ? 'Loading basemap…' : mapStatus === 'error' ? 'Basemap needs attention' : `${theme === 'dark' ? 'Dark' : 'Light'} basemap`}</span></div>
    <div className="map-viewport">
      <div ref={container} className="map-canvas" />
      <div className="map-controls" aria-label="Map navigation">
        <button aria-label="Zoom in" onClick={() => map.current?.zoomIn({ duration: 0 })}><Plus size={18} /></button>
        <button aria-label="Zoom out" onClick={() => map.current?.zoomOut({ duration: 0 })}><Minus size={18} /></button>
        <button aria-label="Reset study area view" onClick={resetView}><LocateFixed size={18} /></button>
      </div>
      {selecting && <div className="map-instruction" role="status"><span>Choose {selecting}: click the map or pan to a road.</span><button disabled={!center} onClick={() => center && onSelect(center)}>Use map center</button></div>}
      {mapStatus === 'error' && <div className="map-warning" role="alert"><span>Some map tiles could not load. Your analysis remains available.</span><button onClick={() => setRetry((value) => value + 1)}><RotateCcw size={15} />Retry basemap</button></div>}
      <div className="map-legend" aria-label="Map legend"><span><i className="legend-line baseline" />Baseline</span><span><i className="legend-line scenario" />Scenario route</span><span><i className="legend-line closure" />Affected road</span><span><i className="legend-fill" />Simulated flood</span>{Boolean(data.shelters?.items.length) && <><span><i className="shelter-key reachable">+</i>Reachable</span><span><i className="shelter-key unreachable">−</i>Unreachable</span><span><i className="shelter-key unknown">?</i>Unknown</span></>}</div>
      <div className="map-center" aria-hidden="true" hidden={!selecting} />
    </div>
    <div className="map-footnote"><span>{view}</span><span>OSM road graph · EPSG:4326</span></div>
  </section>;
}
