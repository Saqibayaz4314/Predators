import type { Theme } from './theme';

// UI-03 integration point: use on map construction AND on resolved theme changes.
// Verified provider styles: https://github.com/hyperknot/openfreemap-styles
export const MAP_STYLES: Record<Theme, string> = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

const mapTokens = {
  background: 'map-background', baseline: 'route-baseline', scenario: 'route-scenario',
  affectedRoad: 'road-affected', floodFill: 'flood-fill', floodOutline: 'flood-outline',
  origin: 'origin', destination: 'destination', reachableShelter: 'shelter-reachable',
  unreachableShelter: 'shelter-unreachable', unknownShelter: 'shelter-unknown',
  selectedRoad: 'road-selected', halo: 'map-halo',
} as const;

// MapLibre paint values cannot reference CSS variables: resolve them after the
// bootstrap updates data-theme. No map instance, tiles, or analysis are loaded here.
export function readMapTheme(root = document.documentElement) {
  const theme: Theme = root.dataset.theme === 'dark' ? 'dark' : 'light';
  const css = getComputedStyle(root);
  const colors = Object.fromEntries(Object.entries(mapTokens).map(([name, token]) =>
    [name, css.getPropertyValue(`--atlas-${token}`).trim()],
  )) as Record<keyof typeof mapTokens, string>;
  return {
    style: MAP_STYLES[theme], colors,
    floodOpacity: Number(css.getPropertyValue('--atlas-flood-opacity')),
    baselineDashArray: [2, 2], // Keep baseline and scenario distinguishable without color.
  };
}
