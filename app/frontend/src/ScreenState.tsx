import { AlertTriangle, LoaderCircle } from 'lucide-react';
import type { ScreenData } from './screen-data';
export function DataStatus({ data }: { data: ScreenData }) {
 if (data.areas.isError) return <div className="screen-state" role="alert"><AlertTriangle size={22} /><h2>Analysis service unavailable</h2><p>{data.areas.error.message}</p><button className="secondary-button" onClick={() => void data.areas.refetch()}>Retry connection</button></div>;
 if (data.areas.isPending) return <div className="screen-state" role="status"><LoaderCircle size={22} /><p>Loading the geographic workspace…</p></div>;
 if (!data.area) return <div className="screen-state"><h2>No active dataset</h2><p>A validated geographic dataset is required before results can be shown.</p><button className="secondary-button" onClick={() => void data.areas.refetch()}>Check again</button></div>;
 return null;
}
export function QueryNotice({ busy, error, retry }: { busy?: boolean; error?: string; retry: () => void }) { return error ? <div className="screen-query-error" role="alert"><AlertTriangle size={16} /><span>{error}</span><button onClick={retry}>Retry</button></div> : busy ? <p className="loading-row" role="status"><LoaderCircle size={15} />Loading verified API results…</p> : null; }
export const shortTitle = (title: string) => title.replace(/^Scenario \d+\s*[—–-]\s*/, '');
export const formatDistance = (value: number | null | undefined) => value == null ? 'Unavailable' : (value / 1000).toFixed(2) + ' km';
