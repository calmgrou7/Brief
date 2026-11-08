import { NativeTabs } from 'expo-router/native-tabs';

import { C } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs backgroundColor={C.white} indicatorColor={C.lime} labelStyle={{ selected: { color: C.ink } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>오늘</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/home.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="goals">
        <NativeTabs.Trigger.Label>목표</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/explore.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>설정</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/explore.png')} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
