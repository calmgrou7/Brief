import { Stack } from 'expo-router';

import { C } from '@/constants/theme';

export default function AppLayout() {
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
    </Stack>
  );
}
