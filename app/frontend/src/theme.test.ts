import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAP_STYLES, readMapTheme } from './map-theme';

const bootstrap = readFileSync(new URL('../public/theme.js', import.meta.url), 'utf8');
const palette = readFileSync(new URL('../public/theme.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function setup({ stored = null as string | null, dark = false, denied = false } = {}) {
  const values = new Map(stored === null ? [] : [['atlas-theme', stored]]);
  const localStorage = {
    getItem: (key: string) => { if (denied) throw new Error('Storage denied'); return values.get(key) ?? null; },
    setItem: (key: string, value: string) => { if (denied) throw new Error('Storage denied'); values.set(key, value); },
    removeItem: (key: string) => { if (denied) throw new Error('Storage denied'); values.delete(key); },
  };
  const events: Record<string, (event: unknown) => void> = {};
  const media = { matches: dark, addEventListener: (name: string, fn: () => void) => { events[name] = fn; } };
  const root = { dataset: {} as Record<string, string> };
  const meta = { setAttribute: vi.fn() };
  const window = {
    localStorage, matchMedia: () => media,
    addEventListener: (name: string, fn: (event: unknown) => void) => { events[name] = fn; },
    atlasTheme: undefined as unknown as Window['atlasTheme'],
  };
  runInNewContext(bootstrap, {
    window, document: { documentElement: root, querySelector: () => meta },
    getComputedStyle: () => ({ getPropertyValue: () => root.dataset.theme === 'dark' ? '#0C1624' : '#F4F6F5' }),
  });
  return {
    controller: window.atlasTheme, root, values, meta,
    changeSystem: (dark: boolean) => { media.matches = dark; events.change?.({ matches: dark }); },
    storage: (key: string | null, newValue: string | null, ownArea = true) =>
      events.storage?.({ key, newValue, storageArea: ownArea ? localStorage : {} }),
  };
}

describe('pre-paint theme bootstrap and browser preferences', () => {
  it('runs a blocking local script and stylesheet before the body and React entry', () => {
    expect(html.indexOf('theme.css')).toBeLessThan(html.indexOf('theme.js'));
    expect(html.indexOf('theme.js')).toBeLessThan(html.indexOf('<body>'));
    expect(html).toContain('<script src="%BASE_URL%theme.js"></script>');
  });
  it.each([false, true])('follows the system without a stored override (dark=%s)', (dark) => {
    const { root, controller, meta, values } = setup({ dark });
    expect(controller.getSnapshot()).toEqual({ theme: dark ? 'dark' : 'light', preference: 'system' });
    expect(root.dataset.theme).toBe(dark ? 'dark' : 'light');
    expect(meta.setAttribute).toHaveBeenCalledWith('content', dark ? '#0C1624' : '#F4F6F5');
    expect(values.size).toBe(0);
  });
  it.each(['light', 'dark'] as const)('honors the stored %s preference on first paint', (stored) => {
    expect(setup({ stored, dark: stored !== 'dark' }).root.dataset.theme).toBe(stored);
  });
  it('follows system changes only in automatic mode and supports returning to system', () => {
    const app = setup();
    app.changeSystem(true);
    expect(app.root.dataset.theme).toBe('dark');
    app.controller.setPreference('light');
    app.changeSystem(false);
    app.changeSystem(true);
    expect(app.root.dataset.theme).toBe('light');
    expect(app.values.get('atlas-theme')).toBe('light');
    app.controller.setPreference('system');
    expect(app.root.dataset.theme).toBe('dark');
    expect(app.values.has('atlas-theme')).toBe(false);
  });
  it('persists toggles across reloads', () => {
    const app = setup();
    app.controller.setPreference('dark');
    expect(setup({ stored: app.values.get('atlas-theme') }).root.dataset.theme).toBe('dark');
  });
  it('recovers from invalid stored values and blocked storage', () => {
    expect(setup({ stored: 'invalid', dark: true }).root.dataset.theme).toBe('dark');
    const app = setup({ denied: true });
    expect(() => app.controller.setPreference('dark')).not.toThrow();
    expect(app.controller.getSnapshot().theme).toBe('dark');
    app.controller.setPreference('system');
    app.changeSystem(true);
    expect(app.controller.getSnapshot().theme).toBe('dark');
  });
  it('synchronizes localStorage changes across tabs, including removal and clear', () => {
    const app = setup();
    app.storage('other-key', 'dark');
    app.storage('atlas-theme', 'dark', false);
    expect(app.root.dataset.theme).toBe('light');
    app.storage('atlas-theme', 'dark');
    expect(app.root.dataset.theme).toBe('dark');
    app.storage('atlas-theme', null);
    expect(app.controller.getSnapshot().preference).toBe('system');
    app.controller.setPreference('dark');
    app.storage(null, null);
    expect(app.root.dataset.theme).toBe('light');
  });
  it('provides stable snapshots and unsubscribes React listeners', () => {
    const { controller } = setup();
    const first = controller.getSnapshot();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.setPreference('system');
    expect(controller.getSnapshot()).toBe(first);
    expect(listener).not.toHaveBeenCalled();
    controller.setPreference('dark');
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    controller.setPreference('light');
    expect(listener).toHaveBeenCalledOnce();
  });
});

function tokens(dark: boolean) {
  const blocks = [...palette.matchAll(/:root(?:\[data-theme="dark"\])?\s*\{([^}]+)\}/g)];
  return Object.fromEntries([...blocks[dark ? 1 : 0]![1]!.matchAll(/--atlas-([\w-]+):\s*([^;]+);/g)].map((match) => [match[1]!, match[2]!]));
}
function rgb(hex: string) { return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); }
function luminance(color: number[]) {
  return color.map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
}
function contrast(a: number[], b: number[]) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

describe.each([false, true])('semantic contrast and future map configuration (dark=%s)', (dark) => {
  const colors = tokens(dark);
  const ratio = (fg: string, bg: string) => contrast(rgb(colors[fg]!), rgb(colors[bg]!));
  it('defines the same complete palette in both themes', () => {
    expect(Object.keys(tokens(false)).sort()).toEqual(Object.keys(tokens(true)).sort());
  });
  it('meets 4.5:1 for normal text and status foregrounds on every surface', () => {
    for (const bg of ['canvas', 'surface', 'surface-alt', 'surface-elevated']) {
      for (const fg of ['text', 'text-secondary', 'text-muted', 'accent', 'success', 'warning', 'error', 'neutral', 'chart-axis']) {
        expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(ratio('accent', 'accent-subtle')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('on-accent', 'accent')).toBeGreaterThanOrEqual(4.5);
  });
  it('meets 3:1 for focus indicators, control borders and chart series', () => {
    for (const bg of ['canvas', 'surface', 'surface-alt']) {
      for (const fg of ['focus', 'border-control', 'chart-baseline', 'chart-scenario', 'chart-affected', 'chart-warning']) {
        expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it('keeps critical overlays legible over the map backdrop and translucent flood fill', () => {
    const background = rgb(colors['map-background']!);
    const opacity = Number(colors['flood-opacity']);
    const flooded = rgb(colors['flood-fill']!).map((v, i) => opacity * v + (1 - opacity) * background[i]!);
    for (const fg of ['route-baseline', 'route-scenario', 'road-affected', 'flood-outline', 'origin', 'destination', 'shelter-reachable', 'shelter-unreachable', 'shelter-unknown', 'road-selected']) {
      expect(contrast(rgb(colors[fg]!), background), fg).toBeGreaterThanOrEqual(3);
      expect(contrast(rgb(colors[fg]!), flooded), `${fg} over flood`).toBeGreaterThanOrEqual(3);
    }
  });
  it('resolves CSS colors into concrete MapLibre values and selects the matching style', () => {
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (key: string) => colors[key.replace('--atlas-', '')] }));
    const root = { dataset: { theme: dark ? 'dark' : 'light' } } as unknown as HTMLElement;
    const map = readMapTheme(root);
    expect(map.style).toBe(MAP_STYLES[dark ? 'dark' : 'light']);
    expect(Object.values(map.colors).every((value) => /^#[0-9A-F]{6}$/i.test(value))).toBe(true);
    expect(map.colors.baseline).toBe(colors['route-baseline']);
    expect(map.floodOpacity).toBeGreaterThan(0);
    expect(map.floodOpacity).toBeLessThan(0.3);
    expect(map.baselineDashArray).toEqual([2, 2]);
  });
});

afterEach(() => vi.unstubAllGlobals());
