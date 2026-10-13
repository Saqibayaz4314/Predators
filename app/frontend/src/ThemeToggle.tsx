import { Moon, Sun } from 'lucide-react';
import { setThemePreference, useTheme } from './theme';

export function ThemeToggle() {
  const { theme, preference } = useTheme();
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
    <button
      type="button"
      className="theme-system"
      aria-pressed={preference === 'system'}
      title="Follow your device's color scheme"
      onClick={() => setThemePreference('system')}
    >System</button>
    <span className="sr-only" role="status">{theme === 'dark' ? 'Dark' : 'Light'} theme{preference === 'system' ? ', following system' : ''}</span>
  </div>;
}
