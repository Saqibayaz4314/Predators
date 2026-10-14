import type { AnalysisComparison } from '@flood/shared';
export function ClosureChart({ items }: { items: Pick<AnalysisComparison['items'][number], 'scenarioId' | 'title' | 'affectedPhysicalSegments'>[] }) {
 const maximum = Math.max(1, ...items.map((item) => item.affectedPhysicalSegments));
 return <figure className="closure-chart"><figcaption>Affected physical road segments</figcaption><p>One count per physical segment. Bars use the same scale.</p><ul>{items.map((item, index) => <li key={item.scenarioId}><span>{String.fromCharCode(65 + index)} · {item.title.replace(/^Scenario \d+\s*[—–-]\s*/, '')}</span><div className="chart-track" aria-hidden="true"><span style={{ width: String(item.affectedPhysicalSegments / maximum * 100) + '%' }} /></div><strong>{item.affectedPhysicalSegments.toLocaleString()}</strong></li>)}</ul></figure>;
}
