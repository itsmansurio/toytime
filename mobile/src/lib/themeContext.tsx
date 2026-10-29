import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { applyTheme, themeMode, type ThemeMode } from './theme';
import { storage } from './storage';
import { applyLang, lang as currentLang, t, type Lang } from './i18n';
import { setErrorTranslator } from './api';

setErrorTranslator((m) => t(m));

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'themePref';
const LANG_KEY = 'lang';
type Prefs = { mode: ThemeMode; pref: ThemePref; setPref: (p: ThemePref) => void; toggle: () => void; lang: Lang; setLang: (l: Lang) => void };
const ThemeContext = createContext<Prefs>({
  mode: 'light', pref: 'system', setPref: () => {}, toggle: () => {}, lang: 'ru', setLang: () => {},
});

// Настройки оформления: светлая / тёмная тема (по умолчанию как в системе) и язык (русский / казахский).
// Выбор запоминается на устройстве.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [lang, setLangState] = useState<Lang>(currentLang);
  useEffect(() => {
    storage.get(KEY).then((v) => { if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v); }).catch(() => {});
    storage.get(LANG_KEY).then((v) => { if (v === 'ru' || v === 'kk' || v === 'en') setLangState(v); }).catch(() => {});
  }, []);
  if (currentLang !== lang) applyLang(lang); // до отрисовки, чтобы все тексты взяли новый язык
  const mode: ThemeMode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  if (themeMode !== mode) applyTheme(mode); // до отрисовки, чтобы все стили взяли новую палитру

  const setPref = useCallback((p: ThemePref) => { setPrefState(p); storage.set(KEY, p).catch(() => {}); }, []);
  const toggle = useCallback(() => setPref(mode === 'dark' ? 'light' : 'dark'), [mode, setPref]);
  const setLang = useCallback((l: Lang) => { setLangState(l); storage.set(LANG_KEY, l).catch(() => {}); }, []);
  return <ThemeContext.Provider value={{ mode, pref, setPref, toggle, lang, setLang }}>{children}</ThemeContext.Provider>;
}

// Компонент, вызвавший useTheme, перерисуется при смене темы или языка.
export const useTheme = () => useContext(ThemeContext);
