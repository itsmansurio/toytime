import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { applyTheme, themeMode, type ThemeMode } from './theme';
import { storage } from './storage';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'themePref';
const ThemeContext = createContext<{ mode: ThemeMode; pref: ThemePref; setPref: (p: ThemePref) => void; toggle: () => void }>({
  mode: 'light', pref: 'system', setPref: () => {}, toggle: () => {},
});

// Светлая / тёмная тема: по умолчанию как в системе, выбор запоминается.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');
  useEffect(() => { storage.get(KEY).then((v) => { if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v); }).catch(() => {}); }, []);
  const mode: ThemeMode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  if (themeMode !== mode) applyTheme(mode); // до отрисовки, чтобы все стили взяли новую палитру

  const setPref = useCallback((p: ThemePref) => { setPrefState(p); storage.set(KEY, p).catch(() => {}); }, []);
  const toggle = useCallback(() => setPref(mode === 'dark' ? 'light' : 'dark'), [mode, setPref]);
  return <ThemeContext.Provider value={{ mode, pref, setPref, toggle }}>{children}</ThemeContext.Provider>;
}

// Компонент, вызвавший useTheme, перерисуется при смене темы.
export const useTheme = () => useContext(ThemeContext);
