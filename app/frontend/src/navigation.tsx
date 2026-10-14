import { useSyncExternalStore } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
export const mainRoutes = [{ path: '/overview', title: 'Overview' }, { path: '/workspace', title: 'Flood Workspace' }, { path: '/analysis', title: 'Impact & Analysis' }, { path: '/reports', title: 'Reports' }, { path: '/about-data', title: 'Data & Methodology' }] as const;
const publicRoute = { path: '/', title: 'ATLAS — Flood Digital Twin' } as const;
export function resolveRoute(path: string) { if ((path.replace(/\/+$/, '') || '/') === '/') return publicRoute; return mainRoutes.find((route) => route.path === (path.replace(/\/+$/, '') || '/')) ?? null; }
export function navigate(path: string) { if (window.location.pathname !== path) window.history.pushState(null, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }
export function usePath() { return useSyncExternalStore((listener) => { window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener); }, () => window.location.pathname, () => '/'); }
export function AppLink({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
 function click(event: MouseEvent<HTMLAnchorElement>) { onClick?.(event); if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target || !resolveRoute(href)) return; event.preventDefault(); navigate(href); }
 return <a href={href} {...props} onClick={click} />;
}
