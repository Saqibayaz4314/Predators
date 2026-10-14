import { Moon, Sun } from 'lucide-react';
import { setThemePreference, useTheme } from './theme';

export function ThemeToggle() {
  const { theme } = useTheme();
  const target = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;
  return <div className="theme-controls" role="group" aria-label="Appearance">
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${target} theme`}
      title={`Switch to ${target} theme`}
      onClick={() => setThemePreference(target)}
    >
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
    <span className="sr-only" role="status">{theme === 'dark' ? 'Dark' : 'Light'} theme</span>
  </div>;
}
