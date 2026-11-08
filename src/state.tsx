import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, Problem, User } from './types';
import { DICTS, fmt, type Dict } from './i18n';
import { loadLang, saveLang } from './lib/store';
import { api } from './lib/api';

interface Ctx {
  user: User | null;
  ready: boolean;
  setUser: (u: User | null) => void;
  /** 서버(또는 로컬)에서 내 정보를 다시 불러옴 */
  refresh: () => Promise<void>;
  problems: Problem[];
  reloadProblems: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [lang, setLangState] = useState<Lang>(initialLang);

  const refresh = useCallback(async () => {
    try { setUser(await api.me()); } catch (e) { console.error(e); }
  }, []);
  const reloadProblems = useCallback(async () => {
    try { setProblems(await api.problems()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    Promise.all([refresh(), reloadProblems()]).finally(() => setReady(true));
    return api.onAuthChange(() => { refresh(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveLang(l);
    document.documentElement.lang = l;
  }, []);

  const value = useMemo(
    () => ({ user, ready, setUser, refresh, problems, reloadProblems, lang, setLang, t: DICTS[lang], f: fmt }),
    [user, ready, refresh, problems, reloadProblems, lang, setLang],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}

/** 비동기 데이터 로딩용 작은 훅 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(null);
    fn().then((d) => alive && setData(d)).catch((e: Error) => alive && setError(e.message));
    return () => { alive = false; };
  }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, reload: () => setTick((x) => x + 1) };
}
