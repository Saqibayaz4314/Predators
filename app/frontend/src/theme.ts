import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';
export type ThemeSnapshot = Readonly<{ theme: Theme; preference: ThemePreference }>;

declare global {
  interface Window {
    atlasTheme: {
      getSnapshot: () => ThemeSnapshot;
      subscribe: (listener: () => void) => () => void;
      setPreference: (preference: ThemePreference) => void;
    };
  }
}

// Browser preference is already initialized by the blocking head script.
// Subscribe directly, so React and first paint cannot resolve different themes.
export function useTheme() {
  return useSyncExternalStore(window.atlasTheme.subscribe, window.atlasTheme.getSnapshot);
}

export function setThemePreference(preference: ThemePreference) {
  window.atlasTheme.setPreference(preference);
}
