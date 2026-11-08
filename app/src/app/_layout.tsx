import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { C } from '@/constants/theme';
import { SessionProvider, useSession } from '@/providers/session';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading, session, onboarded, profile } = useSession();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;
  // 로그인 직후 프로필을 불러오는 중에는 동의 화면이 깜빡이지 않도록 대기
  const profileReady = !session || profile !== null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && profileReady && !onboarded}>
        <Stack.Screen name="consent" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && onboarded}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="auth-callback" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}
