/* Intentionally synchronous and dependency-free: runs before body/React paint.
 * This is the single source of theme preference logic, including runtime changes. */
(() => {
  if (window.atlasTheme) return;
  const key = 'atlas-theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listeners = new Set();
  const normalize = (value) => value === 'light' || value === 'dark' ? value : 'system';
  let preference = 'system';
  try { preference = normalize(window.localStorage.getItem(key)); } catch { /* Storage may be disabled. */ }
  let snapshot;

  function apply() {
    const theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
    if (snapshot?.theme === theme && snapshot.preference === preference) return;
    snapshot = Object.freeze({ theme, preference });
    document.documentElement.dataset.theme = theme;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--atlas-canvas').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    listeners.forEach((listener) => listener());
  }

  window.atlasTheme = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPreference: (value) => {
      preference = normalize(value);
      try {
        if (preference === 'system') window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, preference);
      } catch { /* Keep the selected theme usable in memory. */ }
      apply();
    },
  };
  media.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', (event) => {
    // Ignore sessionStorage and unrelated keys; localStorage.clear() restores system.
    try { if (event.storageArea !== window.localStorage) return; } catch { return; }
    if (event.key === key || event.key === null) {
      preference = normalize(event.newValue);
      apply();
    }
  });
  apply();
})();
