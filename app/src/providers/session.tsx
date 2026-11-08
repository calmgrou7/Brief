import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { connectPurchases, disconnectPurchases, getCustomerInfo, hasPremium, onCustomerInfo } from '@/lib/purchases';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type Ctx = {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** 약관·개인정보·만14세 동의를 모두 마쳤는지 */
  onboarded: boolean;
  isPremium: boolean;
  refreshProfile: () => Promise<void>;
  refreshPremium: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPremium, setPremium] = useState(false);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) return setProfile(null);
    const { data } = await supabase
      .from('profiles')
      .select('id,display_name,agreed_terms_at,agreed_privacy_at,confirmed_age_14_at,marketing_opt_in')
      .eq('id', uid)
      .maybeSingle();
    setProfile(data ?? null);
  }, []);

  /** 앱(RevenueCat)과 서버(웹훅으로 갱신되는 entitlements) 중 하나라도 활성이면 프리미엄 */
  const refreshPremium = useCallback(async () => {
    const info = await getCustomerInfo().catch(() => null);
    if (hasPremium(info)) return setPremium(true);
    const { data } = await supabase.rpc('is_premium');
    setPremium(!!data);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // 콜백 안에서 supabase 호출을 await 하면 교착될 수 있어 다음 틱으로 미룸
      setTimeout(() => loadProfile(next?.user.id), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // 로그인 사용자 ↔ RevenueCat 연결
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let off = () => {};
    (async () => {
      await connectPurchases(uid).catch(() => {});
      off = onCustomerInfo((info) => setPremium((prev) => hasPremium(info) || prev));
      await refreshPremium();
    })();
    return () => off();
  }, [uid, refreshPremium]);

  const signOut = useCallback(async () => {
    await disconnectPurchases();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      loading,
      session,
      profile,
      onboarded: !!(profile?.agreed_terms_at && profile?.agreed_privacy_at && profile?.confirmed_age_14_at),
      isPremium: !!uid && isPremium,
      refreshProfile: () => loadProfile(uid),
      refreshPremium,
      signOut,
    }),
    [loading, session, profile, isPremium, loadProfile, uid, refreshPremium, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
