import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { C } from '@/constants/theme';
import { applyPrefs, loadPrefs } from '@/lib/reminders';
import { useSession } from '@/providers/session';

export default function AppLayout() {
  const { isPremium } = useSession();

  // 구독 상태가 바뀌면(체험 시작·만료) 알림 예약을 플랜에 맞게 다시 맞춘다
  useEffect(() => {
    loadPrefs().then((p) => {
      if (p.enabled) applyPrefs(p, isPremium).catch(() => {});
    });
  }, [isPremium]);

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: C.paper },
        headerTintColor: C.ink,
        contentStyle: { backgroundColor: C.paper },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="goal/[id]" options={{ title: '' }} />
      <Stack.Screen name="report" options={{ title: '' }} />
    </Stack>
  );
}
