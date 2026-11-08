import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Lang, User } from './types';
import { DICTS, fmt, type Dict } from './i18n';
import { loadLang, saveLang, sessionUser, getUser } from './lib/store';

interface Ctx {
  user: User | null;
  setUser: (u: User | null) => void;
  refresh: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  f: typeof fmt;
}

const AppContext = createContext<Ctx | null>(null);

function initialLang(): Lang {
  const saved = loadLang();
  if (saved) return saved;
  return typeof navigator !== 'undefined' && navigator.language?.startsWith('ko') ? 'ko' : 'en';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => sessionUser());
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveLang(l);
    document.documentElement.lang = l;
  }, []);
  const refresh = useCallback(() => setUser((u) => (u ? getUser(u.id) : null)), []);

  const value = useMemo(() => ({ user, setUser, refresh, lang, setLang, t: DICTS[lang], f: fmt }), [user, refresh, lang, setLang]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
