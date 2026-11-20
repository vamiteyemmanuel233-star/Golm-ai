import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Settings, Theme } from '../types/finance';
import { getBrowserStore, loadSettings, saveSettings } from '../lib/storage';

interface SettingsContextValue extends Settings {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAiConsent: (consent: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [{ store }] = useState(getBrowserStore);
  const [settings, setSettings] = useState<Settings>(() => loadSettings(store, systemTheme()));

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.colorScheme = settings.theme;
    saveSettings(store, settings);
  }, [settings, store]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
      toggleTheme: () => setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setAiConsent: (aiConsent) => setSettings((s) => ({ ...s, aiConsent })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}
