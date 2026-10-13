import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleHelp, Layers, SlidersHorizontal, Route, MapPin, Navigation, RotateCcw, ArrowRight, AlertTriangle, CheckCircle2, LoaderCircle, Columns3 } from 'lucide-react';
import type { Shelter } from '@flood/shared';
import { getShelters, getShelterReachability } from './accessibility-api';
import { ShelterInspector } from './ShelterInspector';
import { ScenarioComparison } from './ScenarioComparison';
import { ThemeToggle } from './ThemeToggle';
import { GeographicMap } from './GeographicMap';
import { useWorkspace, type PointRole } from './workspace-store';
import { getAreas, getArea, getRoads, getScenarios, getScenarioLayers, snapPoint, getRoutes } from './geospatial-api';
import type { MapData } from './map-layers';

const distance = (meters: number | null | undefined) => meters == null ? '—' : `${(meters / 1000).toFixed(2)} km`;
function ErrorNotice({ message, retry }: { message: string; retry: () => void }) {
  return <div className="error-notice" role="alert"><AlertTriangle size={16} /><div><p>{message}</p><button onClick={retry}><RotateCcw size={14} />Retry</button></div></div>;
}
export function App({ apiBaseUrl }: { apiBaseUrl: string }) {
  const client = useQueryClient();
  const state = useWorkspace();
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [snapError, setSnapError] = useState('');
  const [snapping, setSnapping] = useState(false);
  const [coordinates, setCoordinates] = useState({ longitude: '68.875', latitude: '27.708' });
  const pendingSnap = useRef<AbortController | null>(null);
  useEffect(() => () => pendingSnap.current?.abort(), []);
  const areas = useQuery({ queryKey: ['areas', apiBaseUrl], queryFn: ({ signal }) => getAreas(apiBaseUrl, signal), staleTime: 300_000 });
  const area = areas.data?.items.find((item) => item.slug === 'sukkur-rohri') ?? areas.data?.items[0];
  const scope = [apiBaseUrl, area?.id, area?.datasetVersion];
  const detail = useQuery({ queryKey: ['area', ...scope], enabled: Boolean(area), queryFn: ({ signal }) => getArea(apiBaseUrl, area!, signal), staleTime: 300_000 });
  const roads = useQuery({ queryKey: ['roads', ...scope], enabled: Boolean(area), queryFn: ({ signal }) => getRoads(apiBaseUrl, area!, signal), staleTime: 300_000 });
  const scenarios = useQuery({ queryKey: ['scenarios', ...scope], enabled: Boolean(area), queryFn: ({ signal }) => getScenarios(apiBaseUrl, area!, signal), staleTime: 300_000 });
  const scenarioId = state.scenarioId;
  const selectedScenario = scenarios.data?.scenarios.find((scenario) => scenario.id === scenarioId);
  const scenarioValid = scenarioId === 'baseline' || Boolean(selectedScenario);
  const originValid = Boolean(area && state.origin?.datasetVersion === area.datasetVersion);
  const shelters = useQuery({ queryKey: ['shelters', ...scope], enabled: Boolean(area), queryFn: ({ signal }) => getShelters(apiBaseUrl, area!, signal), staleTime: 300_000 });
  const shelterAccess = useQuery({ queryKey: ['shelter-access', ...scope, scenarioId, state.origin?.nodeId], enabled: originValid && scenarioValid, queryFn: ({ signal }) => getShelterReachability(apiBaseUrl, area!, scenarioId, state.origin!.nodeId, signal), staleTime: 300_000 });
  const shelterResult = originValid && scenarioValid ? shelterAccess.data : undefined;
  const layers = useQuery({ queryKey: ['scenario-layers', ...scope, scenarioId], enabled: Boolean(area && selectedScenario), queryFn: ({ signal }) => getScenarioLayers(apiBaseUrl, area!, scenarioId, signal), staleTime: 300_000 });
  const pointsValid = Boolean(area && state.origin && state.destination && state.origin.datasetVersion === area.datasetVersion && state.destination.datasetVersion === area.datasetVersion);
  const routes = useQuery({
    queryKey: ['routes', ...scope, scenarioId, state.origin?.nodeId, state.destination?.nodeId],
    enabled: pointsValid && state.requested && scenarioValid,
    queryFn: ({ signal }) => getRoutes(apiBaseUrl, area!, scenarioId, state.origin!, state.destination!, signal), staleTime: 300_000,
  });
  const result = state.requested && pointsValid && scenarioValid ? routes.data : undefined;
  const impact = selectedScenario ? layers.data?.impact : undefined;
  const mapData = useMemo<MapData>(() => ({
    roads: roads.data, zones: selectedScenario ? layers.data?.zones : undefined, affectedIds: impact?.affectedPhysicalSegmentIds, routes: result,
    origin: state.origin?.datasetVersion === area?.datasetVersion ? state.origin : null,
    destination: state.destination?.datasetVersion === area?.datasetVersion ? state.destination : null,
    shelters: shelters.data, shelterAccess: shelterResult, selectedShelterId,
  }), [roads.data, layers.data, impact, result, state.origin, state.destination, selectedScenario, area?.datasetVersion, shelters.data, shelterResult, selectedShelterId]);
  function routeToShelter(shelter: Shelter) {
    if (!area || !originValid || !shelter.nearestNodeId || !shelter.snappedPoint || shelter.snapDistanceMeters == null) return;
    pendingSnap.current?.abort(); setSnapping(false); setSnapError('');
    state.setPoint('destination', { nodeId: shelter.nearestNodeId, snappedPoint: shelter.snappedPoint, snapDistanceMeters: shelter.snapDistanceMeters, datasetVersion: area.datasetVersion });
    state.calculate();
  }
  const retryWorkspace = () => { void client.invalidateQueries({ predicate: (query) => query.queryKey.includes(apiBaseUrl) }); };
  async function selectMapPoint(point: { longitude: number; latitude: number }) {
    const role = useWorkspace.getState().selecting;
    if (!area || !role) return;
    pendingSnap.current?.abort();
    const controller = new AbortController(); pendingSnap.current = controller;
    setSnapError(''); setSnapping(true);
    try {
      const snapped = await snapPoint(apiBaseUrl, area, point, controller.signal);
      if (!controller.signal.aborted && useWorkspace.getState().selecting === role) state.setPoint(role, snapped);
    } catch (error) { if (!controller.signal.aborted) setSnapError(error instanceof Error ? error.message : 'Point selection failed. Try again.'); }
    finally { if (pendingSnap.current === controller) setSnapping(false); }
  }
  function choosePoint(role: PointRole) {
    pendingSnap.current?.abort(); setSnapping(false); setSnapError(''); state.selectPoint(role);
  }
  function clearRoute() { pendingSnap.current?.abort(); setSnapping(false); setSnapError(''); state.clear(); }
  async function loadDemo(kind: 'reroute' | 'unreachable') {
    if (!area) return;
    pendingSnap.current?.abort();
    const controller = new AbortController(); pendingSnap.current = controller;
    setSnapping(true); setSnapError(''); state.clear();
    try {
      // Verified graph coordinates; both points still go through backend snapping.
      const [origin, destination] = await Promise.all([
        snapPoint(apiBaseUrl, area, kind === 'reroute' ? { longitude: 68.850445, latitude: 27.6951622 } : { longitude: 68.8749339, latitude: 27.7147761 }, controller.signal),
        snapPoint(apiBaseUrl, area, kind === 'reroute' ? { longitude: 68.8635126, latitude: 27.7244016 } : { longitude: 68.8870153, latitude: 27.6849658 }, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      state.setPoint('origin', origin); state.setPoint('destination', destination);
      const demo = scenarios.data?.scenarios.find((scenario) => scenario.title.includes('Bridge Corridor'));
      if (demo) state.selectScenario(demo.id);
      state.calculate();
    } catch (error) { if (!controller.signal.aborted) setSnapError(error instanceof Error ? error.message : 'Demo selection failed. Retry.'); }
    finally { if (pendingSnap.current === controller) setSnapping(false); }
  }
  const routeBusy = state.requested && routes.isFetching;
  const pending = areas.isPending || Boolean(area && (roads.isPending || scenarios.isPending));
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Flood Digital Twin home"><Layers size={29} strokeWidth={1.6} /><span>FLOOD<span className="wordmark">DIGITAL TWIN</span></span></a>
      <div className="workspace-title"><span className="eyebrow">ATLAS WORKSPACE</span><span>Sukkur / Rohri · Network accessibility</span></div>
      <div className="header-actions"><span className="phase-label">SIMULATION CONSOLE</span><ThemeToggle /></div>
    </header>
    <div className="notice"><CircleHelp size={16} /><span>Simulation prototype. Hypothetical flood scenarios only. Not official evacuation guidance.</span></div>
    <main className="workspace">
      <aside className="side-panel" aria-labelledby="scenario-heading">
        <div className="panel-title"><SlidersHorizontal size={18} /><h2 id="scenario-heading">Scenario Lab</h2><span className="index">01</span></div>
        <section className="panel-body study-context"><span className="eyebrow">STUDY AREA</span><h3>{area?.name ?? 'Connecting to dataset…'}</h3><p>Real OpenStreetMap road network. Flood extents are hypothetical simulations.</p>{area && <span className="dataset-label">{area.datasetVersion}</span>}</section>
        {areas.isError && <ErrorNotice message={areas.error.message} retry={() => void areas.refetch()} />}
        {areas.isSuccess && !area && <div className="panel-body"><h3>No active dataset</h3><p>A validated study area is required for scenario analysis.</p><button className="secondary-button" onClick={() => void areas.refetch()}>Check again</button></div>}
        <section className="scenario-section" aria-label="Flood scenario selection">
          <span className="eyebrow">SIMULATED CONDITIONS</span>
          <button className="scenario-option" aria-pressed={scenarioId === 'baseline'} onClick={() => state.selectScenario('baseline')} disabled={!area}><Layers size={17} /><span><strong>Baseline</strong><small>No simulated road closures</small></span><span className="option-radio" /></button>
          {scenarios.isPending && area && <p role="status">Loading scenario presets…</p>}
          {scenarios.data?.scenarios.map((scenario, index) => <button className="scenario-option" key={scenario.id} aria-pressed={scenarioId === scenario.id} onClick={() => state.selectScenario(scenario.id)}><span className="scenario-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{scenario.title.replace(/^Scenario \d+\s*[—–-]\s*/, '')}</strong><small>Hypothetical flood · Simulated</small></span><span className="option-radio" /></button>)}
          {scenarios.isError && <ErrorNotice message={scenarios.error.message} retry={() => void scenarios.refetch()} />}
          {scenarios.isSuccess && scenarios.data.scenarios.length === 0 && <p>No active flood simulations are available.</p>}
          {selectedScenario?.description && <p className="scenario-description">{selectedScenario.description}</p>}
          <button className="secondary-button" disabled={!area || !scenarios.data?.scenarios.length} onClick={() => setComparisonOpen(true)}><Columns3 size={16} />Compare scenarios A/B/C</button>
        </section>
        <section className="route-controls" aria-labelledby="route-heading"><div className="section-heading"><Route size={17} /><h3 id="route-heading">Route analysis</h3><button className="icon-button" onClick={clearRoute} aria-label="Clear route selections"><RotateCcw size={16} /></button></div>
          {(['origin', 'destination'] as const).map((role) => <button key={role} className="point-button" aria-pressed={state.selecting === role} onClick={() => choosePoint(role)} disabled={!area || snapping}>{role === 'origin' ? <MapPin size={18} /> : <Navigation size={18} />}<span><strong>{role === 'origin' ? 'Origin' : 'Destination'}</strong><small>{state[role] ? `Node ${state[role].nodeId} · snapped ${Math.round(state[role].snapDistanceMeters)} m` : 'Choose on map'}</small></span><ArrowRight size={16} /></button>)}
          {state.selecting && <form className="coordinate-form" onSubmit={(event) => { event.preventDefault(); void selectMapPoint({ longitude: Number(coordinates.longitude), latitude: Number(coordinates.latitude) }); }}><p>Or enter coordinates for the {state.selecting}.</p><div><label>Longitude<input required type="number" min="-180" max="180" step="any" value={coordinates.longitude} onChange={(event) => setCoordinates({ ...coordinates, longitude: event.target.value })} /></label><label>Latitude<input required type="number" min="-90" max="90" step="any" value={coordinates.latitude} onChange={(event) => setCoordinates({ ...coordinates, latitude: event.target.value })} /></label></div><button className="secondary-button" disabled={snapping}>Snap {state.selecting}</button></form>}
          {snapping && <p className="loading-row" role="status"><LoaderCircle size={15} className="animate-spin" />Snapping to the road graph…</p>}
          {snapError && <p className="inline-error" role="alert">{snapError}</p>}
          <button className="primary-button" disabled={!pointsValid || snapping || routeBusy || !scenarioValid} onClick={state.calculate}><Route size={16} />{routeBusy ? 'Calculating…' : 'Calculate routes'}</button>
          <button className="demo-button" disabled={!area || !scenarios.isSuccess || snapping} onClick={() => void loadDemo('reroute')}>Load rerouting demo<ArrowRight size={14} /></button>
          <button className="demo-button" disabled={!area || !scenarios.isSuccess || snapping} onClick={() => void loadDemo('unreachable')}>Load unreachable demo<ArrowRight size={14} /></button>
          <p className="route-note">Shortest modeled network distance. A route result does not establish real-world safety.</p>
        </section>
      </aside>
      <GeographicMap area={detail.data} data={mapData} selecting={state.selecting} onSelect={(point) => void selectMapPoint(point)} onShelterSelect={setSelectedShelterId} />
      <aside className="side-panel inspector" aria-labelledby="inspector-heading">
        <div className="panel-title"><Layers size={18} /><h2 id="inspector-heading">Impact Inspector</h2><span className="index">02</span></div>
        <section className="impact-section"><span className="eyebrow">SELECTED CONDITIONS</span><h3>{selectedScenario?.title ?? 'Baseline'}</h3>
          {selectedScenario && layers.isFetching && <p className="loading-row" role="status"><LoaderCircle size={15} className="animate-spin" />Analyzing road intersections…</p>}
          {layers.isError && selectedScenario && <ErrorNotice message={layers.error.message} retry={() => void layers.refetch()} />}
          <dl className="metric-list"><div><dt>Affected physical segments</dt><dd>{scenarioId === 'baseline' && roads.isSuccess ? '0' : impact?.affectedPhysicalSegments.toLocaleString() ?? '—'}</dd></div><div><dt>Blocked directed arcs</dt><dd>{scenarioId === 'baseline' && roads.isSuccess ? '0' : impact?.blockedDirectedArcs.toLocaleString() ?? '—'}</dd></div><div><dt>Road network affected</dt><dd>{scenarioId === 'baseline' && roads.isSuccess ? '0%' : impact?.affectedRoadPercentage != null ? `${impact.affectedRoadPercentage}%` : '—'}</dd></div></dl>
          <p className="metric-note">Physical roads are counted once. Both travel directions are blocked where the simulation intersects a road.</p>
        </section>
        <section className="impact-section route-result" aria-label="Route results" aria-live="polite"><span className="eyebrow">NETWORK ACCESSIBILITY</span>
          {routeBusy ? <h3 className="loading-row"><LoaderCircle size={16} className="animate-spin" />Calculating routes…</h3> : result ? <h3 className={`result-status ${['unreachable', 'baseline_unreachable'].includes(result.outcome) ? 'unreachable' : ''}`}>{['unreachable', 'baseline_unreachable'].includes(result.outcome) ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}{result.outcome === 'unreachable' ? 'Unreachable under simulation' : result.outcome === 'baseline_unreachable' ? 'Baseline is disconnected' : result.outcome === 'rerouted' ? 'Alternative route available' : 'Route available'}</h3> : <h3>Not evaluated</h3>}
          {state.requested && routes.isError && <ErrorNotice message={routes.error.message} retry={() => void routes.refetch()} />}
          <dl className="metric-list"><div><dt><i className="legend-line baseline" />Baseline distance</dt><dd>{distance(result?.baseline.distanceMeters)}</dd></div><div><dt><i className="legend-line scenario" />Scenario distance</dt><dd>{scenarioId === 'baseline' ? 'Not applied' : result?.scenario?.status === 'unreachable' ? 'Unreachable' : distance(result?.scenario?.distanceMeters)}</dd></div><div><dt>Distance increase</dt><dd>{result?.distanceChangeMeters != null ? `${distance(result.distanceChangeMeters)}${result.distanceChangePercent != null ? ` (${result.distanceChangePercent}%)` : ''}` : '—'}</dd></div></dl>
          <p className="metric-note">{result?.outcome === 'unreachable' ? 'The baseline path exists, but no route remains after simulated road closures. No connecting route is drawn.' : result?.outcome === 'baseline_unreachable' ? 'These points are disconnected in the original directed network.' : !result ? 'Choose two points and calculate to compare the original network with the selected simulation.' : scenarioId === 'baseline' ? 'No flood simulation is applied to this route.' : result.outcome === 'unchanged' ? 'The baseline path remains available in this simulation.' : 'The scenario route follows the remaining modeled road connections.'}</p>
        </section>
        <ShelterInspector list={shelters.data} analysis={shelterResult} selectedId={selectedShelterId} onSelect={setSelectedShelterId} onRoute={routeToShelter} originSelected={originValid} busy={shelters.isFetching || (originValid && shelterAccess.isFetching)} error={shelters.error?.message ?? (originValid ? shelterAccess.error?.message : undefined)} retry={() => { void shelters.refetch(); if (originValid) void shelterAccess.refetch(); }} />
        <section className="impact-section data-status"><span className="eyebrow">DATA & METHODOLOGY</span><p>OpenStreetMap-derived roads. PostGIS intersections. Directed-graph Dijkstra routing.</p>{roads.isFetching && <p role="status">Loading road geometry…</p>}{roads.isError && <ErrorNotice message={roads.error.message} retry={() => void roads.refetch()} />}{detail.isError && <ErrorNotice message={detail.error.message} retry={() => void detail.refetch()} />}<button className="secondary-button" onClick={retryWorkspace}><RotateCcw size={14} />Refresh workspace</button></section>
      </aside>
    </main>
    <ScenarioComparison open={comparisonOpen} onClose={() => setComparisonOpen(false)} apiBaseUrl={apiBaseUrl} area={area} scenarios={scenarios.data?.scenarios ?? []} origin={state.origin} destination={state.destination} onScenario={state.selectScenario} />
    <footer className="statusbar"><span><span className={`status-dot ${roads.isSuccess ? 'connected' : ''}`} />{pending ? 'Loading geographic dataset…' : roads.isSuccess ? `${roads.data.features.length.toLocaleString()} physical road segments loaded` : 'Dataset unavailable'}</span><span>Scenario analysis · Simulated flood extents</span></footer>
  </div>;
}
