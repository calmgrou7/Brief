import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { mergeEvents, type OpsEvent } from './events';
import { addTask, fetchEvents, setStatus, supabase } from './sources/supabase';
import { addLocalTask, loadLocal, setLocalStatus } from './sources/local';
import { demoEvents } from './sources/demo';

export type Mode = 'demo' | 'signin' | 'live';

export function useBoard() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [events, setEvents] = useState<OpsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());

  const mode: Mode = !supabase ? 'demo' : session ? 'live' : 'signin';

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    const now = new Date();
    setError('');
    if (mode === 'demo') {
      setEvents(mergeEvents(demoEvents(now), loadLocal()));
      setUpdatedAt(now);
      return;
    }
    if (mode !== 'live') return;
    setLoading(true);
    try {
      setEvents(await fetchEvents());
      setUpdatedAt(now);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (authReady) reload();
  }, [authReady, reload]);

  // 켜 둔 채로 쓰는 화면이라, 탭으로 돌아오면 새로 읽는다.
  useEffect(() => {
    const onFocus = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [reload]);

  const add = useCallback(
    async (app: string, title: string) => {
      try {
        const e = mode === 'live' ? await addTask(app, title) : addLocalTask(app, title);
        setEvents((list) => [e, ...list]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [mode],
  );

  const toggle = useCallback(
    async (target: OpsEvent) => {
      const status = target.status === 'open' ? 'done' : 'open';
      setEvents((list) => list.map((e) => (e.id === target.id ? { ...e, status } : e)));
      try {
        if (mode === 'live') await setStatus(target.id, status);
        else setLocalStatus(target, status);
      } catch (err) {
        setEvents((list) => list.map((e) => (e.id === target.id ? target : e)));
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [mode],
  );

  return { mode, authReady, session, events, loading, error, updatedAt, reload, add, toggle };
}
