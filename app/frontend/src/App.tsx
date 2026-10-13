import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CircleHelp, Layers, Map, RefreshCw, SlidersHorizontal, Unplug } from 'lucide-react';
import { fetchServiceStatus } from './api';
import { ThemeToggle } from './ThemeToggle';

export function App({ apiBaseUrl }: { apiBaseUrl: string }) {
  const status = useQuery({ queryKey: ['service-status', apiBaseUrl], queryFn: ({ signal }) => fetchServiceStatus(apiBaseUrl, signal) });
  const connected = status.isSuccess && !status.isFetching;
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Flood Digital Twin home"><Layers size={29} strokeWidth={1.6} /><span>FLOOD<span className="wordmark">DIGITAL TWIN</span></span></a>
      <div className="workspace-title"><span className="eyebrow">ATLAS WORKSPACE</span><span>Flood scenario analysis</span></div>
      <div className="header-actions"><span className="phase-label">Foundation preview</span><ThemeToggle /></div>
    </header>
    <div className="notice"><CircleHelp size={16} /><span>Simulation prototype. Hypothetical scenarios only. Not official evacuation guidance.</span></div>
    <main className="workspace">
      <aside className="side-panel" aria-labelledby="scenario-heading">
        <div className="panel-title"><SlidersHorizontal size={18} /><h2 id="scenario-heading">Scenario Lab</h2><span className="index">01</span></div>
        <div className="panel-body"><span className="eyebrow">STUDY AREA</span><h3>No dataset loaded</h3><p>Connect and validate the geographic dataset to begin exploring flood scenarios.</p>
          <div className="pending-row"><span className="status-dot" />Awaiting data setup</div>
        </div>
        <div className="panel-note"><Layers size={18} /><p>Scenario controls will become available after road and flood data are implemented.</p></div>
      </aside>
      <section className="map-space" aria-labelledby="workspace-heading">
        <div className="map-toolbar"><span>GEOGRAPHIC WORKSPACE</span><span>Not initialized</span></div>
        <div className="empty-map"><div className="map-symbol"><Map size={32} strokeWidth={1.4} /></div><span className="eyebrow">WORKSPACE FOUNDATION</span><h1 id="workspace-heading">Geographic workspace</h1><p>A workspace for hypothetical flood scenarios.<br />Geographic layers and analysis come next.</p><span className="empty-label">Map integration is not implemented yet</span></div>
        <div className="map-footnote"><span>No geographic data displayed</span><span>ATLAS / CL-01</span></div>
      </section>
      <aside className="side-panel inspector" aria-labelledby="inspector-heading">
        <div className="panel-title"><Layers size={18} /><h2 id="inspector-heading">Impact Inspector</h2><span className="index">02</span></div>
        <div className="panel-body"><span className="eyebrow">ANALYSIS STATUS</span><h3>Not evaluated</h3><p>Road impact, routes and shelter reachability require a validated dataset and analysis engine.</p></div>
        <section className="connection" aria-labelledby="connection-heading"><h3 id="connection-heading">Service connection</h3>
          <div role="status" aria-live="polite" className="connection-status"><span className={`status-dot ${connected ? 'connected' : ''}`} />{status.isFetching ? 'Checking API connection…' : status.isError ? 'API unavailable' : 'API connected'}</div>
          {status.isError ? <p className="error-message"><Unplug size={16} />Could not reach the API. Check the backend and retry.</p> : <p>{connected ? 'The backend is responding. Analysis dependencies are not initialized.' : 'Checking the backend status endpoint.'}</p>}
          <button type="button" className="retry-button" disabled={status.isFetching} onClick={() => void status.refetch()}><RefreshCw size={15} className={status.isFetching ? 'animate-spin' : ''} />{status.isFetching ? 'Checking' : 'Check connection'}<ArrowUpRight size={14} /></button>
        </section>
      </aside>
    </main>
    <footer className="statusbar"><span><span className="status-dot" />Foundation stage · No analysis results</span><span>Simulated planning prototype</span></footer>
  </div>;
}
