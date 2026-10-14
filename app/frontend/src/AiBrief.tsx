import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Bot, Cog, LoaderCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import type { AIExplanationData, SnapResult, StudyArea } from '@flood/shared';
import { aiBriefErrorLabel, aiSourceLabels, buildAiBriefRequest, explainScenario, shouldRequestBrief } from './ai-api';

export type AiBriefView =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'success'; brief: AIExplanationData };

/** Presentational card for every AI brief state. Deterministic metrics are
 *  never derived from — or replaced by — the model narrative. */
export function AiBriefCard({ view, scenarioTitle, onGenerate, onRetry }: { view: AiBriefView; scenarioTitle: string; onGenerate: () => void; onRetry: () => void }) {
  if (view.state === 'loading') return <aside className="screen-panel ai-brief" aria-busy="true"><span className="eyebrow">AI DECISION BRIEF</span><h2>Generating the decision brief…</h2><p className="loading-row" role="status"><LoaderCircle size={15} className="animate-spin" />The backend recalculates the verified scenario first, then a hosted model writes the narrative. This can take several seconds.</p><p className="metric-note">No action is needed. The computed report stays available.</p></aside>;
  if (view.state === 'error') return <aside className="screen-panel ai-brief"><span className="eyebrow">AI DECISION BRIEF</span><h2>Brief unavailable</h2><div className="screen-query-error" role="alert"><AlertTriangle size={16} /><span>{view.message}</span><button onClick={onRetry}><RotateCcw size={14} />Retry</button></div><p className="metric-note">The computed report and its deterministic metrics are unaffected. AI is optional and never blocks the analysis.</p></aside>;
  if (view.state === 'success') return <aside className="screen-panel ai-brief"><span className="eyebrow">AI DECISION BRIEF</span><span className={'ai-source-badge' + (view.brief.source === 'ai' ? ' model' : '')}>{view.brief.source === 'ai' ? <Bot size={14} /> : <Cog size={14} />}{aiSourceLabels[view.brief.source]}</span><h2>{view.brief.title}</h2><p className="ai-summary">{view.brief.summary}</p><h3>Observations</h3><ul className="limitations-list">{view.brief.observations.map((item) => <li key={item}>{item}</li>)}</ul><h3>Limitations</h3><ul className="limitations-list">{view.brief.limitations.map((item) => <li key={item}>{item}</li>)}</ul><div className="method-limitation">Simulated-scenario narrative for {scenarioTitle}. The AI text explains the computed findings and never overrides the deterministic routing metrics, closure counts or shelter status in this report.</div><button className="secondary-button" onClick={onRetry}><RotateCcw size={15} />Regenerate brief</button></aside>;
  return <aside className="screen-panel ai-brief"><span className="eyebrow">AI DECISION BRIEF</span><h2>Explain the computed findings</h2><p>Generate a plain-language decision brief for <strong>{scenarioTitle}</strong>. The backend recalculates the verified scenario first; the narrative then summarizes the impact, routing and shelter findings.</p><div className="method-limitation">No AI request is sent automatically. Each brief is generated only when you choose to, and may use a paid hosted model with a deterministic fallback.</div><button className="primary-button" onClick={onGenerate}><Sparkles size={15} />Generate AI Decision Brief</button><p className="metric-note">The computed report remains available without AI. Model text never replaces deterministic metrics.</p></aside>;
}

/** Container: derives the request from live workspace state and gates the
 *  paid POST /ai/explain behind an explicit, still-current confirmation. The
 *  query is disabled on page load and whenever the context (study area,
 *  dataset, scenario or endpoints) changes, and it never auto-retries. */
export function AiBriefPanel({ apiBaseUrl, area, scenarioId, origin, destination, scenarioTitle }: { apiBaseUrl: string; area: StudyArea; scenarioId: string; origin: SnapResult | null; destination: SnapResult | null; scenarioTitle: string }) {
  const { request, contextKey } = buildAiBriefRequest(area, scenarioId, origin, destination);
  const [requestedKey, setRequestedKey] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['ai-brief', apiBaseUrl, contextKey],
    enabled: shouldRequestBrief(contextKey, requestedKey),
    retry: false,
    refetchOnMount: false,
    staleTime: 300000,
    queryFn: ({ signal }) => explainScenario(apiBaseUrl, request, signal),
  });
  const view: AiBriefView = query.data ? { state: 'success', brief: query.data } : query.isError ? { state: 'error', message: aiBriefErrorLabel(query.error) } : shouldRequestBrief(contextKey, requestedKey) ? { state: 'loading' } : { state: 'idle' };
  return <AiBriefCard view={view} scenarioTitle={scenarioTitle} onGenerate={() => setRequestedKey(contextKey)} onRetry={() => void query.refetch()} />;
}
