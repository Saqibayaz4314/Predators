import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Columns3, X, AlertTriangle, ArrowRight } from 'lucide-react';
import type { StudyArea, ScenarioSummary, SnapResult } from '@flood/shared';
import { getAnalysisComparison } from './accessibility-api';

const formatDistance = (value: number | null) => value == null ? '—' : `${(value / 1000).toFixed(2)} km`;
export function ScenarioComparison({ open, onClose, apiBaseUrl, area, scenarios, origin, destination, onScenario }: { open: boolean; onClose: () => void; apiBaseUrl: string; area?: StudyArea; scenarios: ScenarioSummary[]; origin: SnapResult | null; destination: SnapResult | null; onScenario: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const validOrigin = origin?.datasetVersion === area?.datasetVersion ? origin : null;
  const validDestination = destination?.datasetVersion === area?.datasetVersion ? destination : null;
  const ids = scenarios.slice(0, 3).map((scenario) => scenario.id);
  const query = useQuery({ queryKey: ['scenario-comparison', apiBaseUrl, area?.id, area?.datasetVersion, ids, validOrigin?.nodeId, validDestination?.nodeId], enabled: Boolean(open && area && validOrigin && ids.length), queryFn: ({ signal }) => getAnalysisComparison(apiBaseUrl, area!, ids, validOrigin!.nodeId, validDestination?.nodeId, signal), staleTime: 300_000 });
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); if (!open && dialog.current?.open) dialog.current.close(); }, [open]);
  const data = query.data;
  return <dialog ref={dialog} className="comparison-dialog" onCancel={onClose} aria-labelledby="comparison-heading">
    <div className="comparison-header"><div><span className="eyebrow">DETERMINISTIC SCENARIO ANALYSIS</span><h2 id="comparison-heading"><Columns3 size={21} />Scenario A/B/C comparison</h2></div><button className="icon-button" autoFocus onClick={onClose} aria-label="Close scenario comparison"><X size={21} /></button></div>
    <div className="comparison-body">
      <p className="comparison-context">Same origin, destination and dataset across all conditions. Hypothetical flood polygons remove directed arcs from the original OSM graph.</p>
      {!validOrigin && <div className="comparison-empty"><h3>Select an origin first</h3><p>Choose a real road-network point in Scenario Lab to compare shelter access and closures.</p><button className="secondary-button" onClick={onClose}>Return to map</button></div>}
      {validOrigin && !ids.length && <p>No active scenarios are available.</p>}
      {query.isFetching && validOrigin && <p role="status" className="loading-row">Computing A/B/C impact and road accessibility…</p>}
      {query.isError && <div className="error-notice" role="alert"><AlertTriangle size={18} /><div><p>{query.error.message}</p><button onClick={() => void query.refetch()}>Retry comparison</button></div></div>}
      {data && validOrigin && <>
        <div className="comparison-baseline"><strong>BASELINE</strong><span>Origin node {data.originNodeId}{data.destinationNodeId ? ` → ${data.destinationNodeId}` : ' · destination not selected'}</span><span>Route: {data.baselineRouteStatus === 'not_requested' ? 'Not requested' : data.baselineRouteStatus === 'unreachable' ? 'Unreachable' : formatDistance(data.baselineRouteDistanceMeters)}</span><span>Shelters: {data.shelterCount === 0 ? 'No verified shelter data' : `${data.baselineShelterSummary.reachable} reachable · ${data.baselineShelterSummary.unreachable} unreachable · ${data.baselineShelterSummary.unknown} unknown`}</span></div>
        {data.shelterDataMode === 'hypothetical_demo' && <p className="demo-disclaimer">Shelter counts refer to hypothetical development fixtures, not verified facilities.</p>}
        <div className="comparison-grid">{data.items.map((item, index) => <article className="comparison-card" key={item.scenarioId} aria-label={`Scenario ${String.fromCharCode(65 + index)}`}><div className="comparison-card-heading"><span className="comparison-letter">{String.fromCharCode(65 + index)}</span><h3>{item.title.replace(/^Scenario \d+\s*[—–-]\s*/, '')}</h3></div>
          <dl className="metric-list"><div><dt>Affected physical segments</dt><dd>{item.affectedPhysicalSegments.toLocaleString()}</dd></div><div><dt>Blocked directed arcs</dt><dd>{item.blockedDirectedArcs.toLocaleString()}</dd></div><div><dt>Network affected</dt><dd>{item.affectedRoadPercentage == null ? '—' : `${item.affectedRoadPercentage}%`}</dd></div><div><dt>Unique closures</dt><dd>{item.uniqueBlockedPhysicalSegmentIds.length.toLocaleString()}</dd></div><div><dt>Shared with another scenario</dt><dd>{item.sharedBlockedPhysicalSegmentIds.length.toLocaleString()}</dd></div><div><dt>Scenario route</dt><dd className={item.routeStatus.includes('unreachable') ? 'comparison-unreachable' : ''}>{item.routeStatus === 'not_requested' ? 'Not requested' : item.routeStatus === 'baseline_unreachable' ? 'Baseline disconnected' : item.routeStatus === 'unreachable' ? 'Unreachable' : formatDistance(item.routeDistanceMeters)}</dd></div><div><dt>Distance increase</dt><dd>{item.distanceChangeMeters == null ? '—' : `${formatDistance(item.distanceChangeMeters)}${item.distanceChangePercent == null ? '' : ` (+${item.distanceChangePercent}%)`}`}</dd></div><div><dt>Accessible / inaccessible / unknown shelters</dt><dd>{data.shelterCount === 0 ? 'No data' : `${item.reachableShelters} / ${item.unreachableShelters} / ${item.unknownShelters}`}</dd></div></dl>
          <button className="secondary-button" onClick={() => { onScenario(item.scenarioId); onClose(); }}>Inspect on map<ArrowRight size={14} /></button>
        </article>)}</div>
        <section className="comparison-overlap"><h3>Physical closure overlap</h3><p>{data.closures.unionPhysicalSegmentIds.length.toLocaleString()} distinct physical segments blocked across these scenarios; {data.closures.sharedByAllPhysicalSegmentIds.length.toLocaleString()} shared by all {data.items.length}.</p><div>{data.closures.pairwise.map((pair) => <p key={pair.scenarioIds.join(':')}><strong>{pair.scenarioIds.map((id) => String.fromCharCode(65 + data.items.findIndex((item) => item.scenarioId === id))).join(' / ')}</strong><span>{pair.sharedPhysicalSegmentIds.length.toLocaleString()} shared segments</span></p>)}</div><p className="metric-note">Unique = blocked only in one compared scenario. Shared = blocked in at least one other compared scenario. Each physical road counts once, regardless of direction.</p></section>
        <p className="metric-note">{data.disclaimer}</p><span className="dataset-label">{data.datasetVersion}</span>
      </>}
    </div>
  </dialog>;
}
