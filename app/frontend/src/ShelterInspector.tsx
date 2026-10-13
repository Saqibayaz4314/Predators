import { Building2, CheckCircle2, CircleHelp, AlertTriangle, Route } from 'lucide-react';
import type { Shelter, ShelterList, ShelterReachability } from '@flood/shared';

export const shelterReasons = { invalid_coordinates: 'Location missing or invalid', outside_snap_radius: 'No graph node within 500 m', baseline_disconnected: 'Disconnected in the baseline network', scenario_blocked: 'No path remains under this simulation', network_path_exists: 'Modeled road path exists' };
export function ShelterInspector({ list, analysis, selectedId, onSelect, onRoute, originSelected, busy, error, retry }: { list?: ShelterList; analysis?: ShelterReachability; selectedId: string | null; onSelect: (id: string) => void; onRoute: (shelter: Shelter) => void; originSelected: boolean; busy: boolean; error?: string; retry: () => void }) {
  const selected = list?.items.find((shelter) => shelter.id === selectedId);
  return <section className="impact-section shelter-inspector" aria-labelledby="shelter-heading">
    <div className="section-heading"><Building2 size={17} /><h3 id="shelter-heading">Shelter accessibility</h3></div>
    {list?.dataMode === 'hypothetical_demo' && <p className="demo-disclaimer">HYPOTHETICAL DEMO DESTINATIONS<br />Development fixtures only. These are not real shelters.</p>}
    {busy && <p className="loading-row" role="status">Evaluating shelter road access…</p>}
    {error && <div className="error-notice" role="alert"><p>{error}</p><button onClick={retry}>Retry shelters</button></div>}
    {!busy && list?.items.length === 0 && <div className="shelter-empty"><CircleHelp size={18} /><h4>No verified shelter data available</h4><p>The live shelter directory is empty. Shelter safety, capacity and operational status are unknown.</p></div>}
    {list && list.items.length > 0 && <>
      {!originSelected && <p className="metric-note">Choose an origin to evaluate baseline and scenario access.</p>}
      <dl className="metric-list shelter-summary"><div><dt>Accessible shelters</dt><dd>{analysis?.summary.reachable ?? '—'}</dd></div><div><dt>Inaccessible shelters</dt><dd>{analysis?.summary.unreachable ?? '—'}</dd></div><div><dt>Unknown access</dt><dd>{analysis?.summary.unknown ?? '—'}</dd></div></dl>
      {analysis && <p className="metric-note">Baseline: {analysis.baselineSummary.reachable} reachable · {analysis.baselineSummary.unreachable} unreachable · {analysis.baselineSummary.unknown} unknown.</p>}
      <div className="shelter-list" aria-label="Shelter candidates">{list.items.map((shelter) => {
        const result = analysis?.items.find((item) => item.shelterId === shelter.id);
        const status = result?.status ?? 'unknown';
        const Icon = status === 'reachable' ? CheckCircle2 : status === 'unreachable' ? AlertTriangle : CircleHelp;
        return <button className="shelter-row" key={shelter.id} aria-pressed={selectedId === shelter.id} onClick={() => onSelect(shelter.id)}><Icon size={17} className={`shelter-status ${status}`} /><span><strong>{shelter.name}</strong><small>{shelter.dataStatus === 'demonstration' ? 'Hypothetical fixture' : shelter.dataStatus} · {result ? status : 'Not evaluated'}{result?.networkDistanceMeters != null ? ` · ${(result.networkDistanceMeters / 1000).toFixed(2)} km` : ''}</small></span></button>;
      })}</div>
      {selected && <div className="shelter-detail" aria-label="Shelter details"><h4>{selected.name}</h4><p>{selected.sourceName ?? 'Provenance unavailable'}</p><p>Capacity: {selected.capacity == null ? 'Unknown' : selected.capacity.toLocaleString()} · Operational status: Unknown</p><p>Network connection: {selected.hasValidatedNetworkConnection ? `Node ${selected.nearestNodeId} · ${Math.round(selected.snapDistanceMeters!)} m snap` : shelterReasons[selected.connectionReason === 'invalid_coordinates' ? 'invalid_coordinates' : 'outside_snap_radius']}</p>{analysis?.items.filter((item) => item.shelterId === selected.id).map((item) => <div key={item.shelterId}><p>{shelterReasons[item.reason]}</p><p>Baseline distance: {item.baselineDistanceMeters == null ? 'Unknown / unreachable' : `${(item.baselineDistanceMeters / 1000).toFixed(2)} km`}</p><p>Inside hypothetical flood polygon: {item.withinSimulatedFloodZone == null ? 'Unknown' : item.withinSimulatedFloodZone ? 'Yes — separate spatial flag' : 'No'}</p></div>)}<button className="secondary-button" disabled={!originSelected || !selected.hasValidatedNetworkConnection} onClick={() => onRoute(selected)}><Route size={15} />Route to network connection</button></div>}
    </>}
    <p className="metric-note">Road reachability does not confirm shelter safety, capacity, occupancy or operational status. Maximum snap distance: {list?.maxSnapDistanceMeters ?? 500} m.</p>
  </section>;
}
