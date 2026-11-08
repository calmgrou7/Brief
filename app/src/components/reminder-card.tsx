import { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { Chips } from '@/components/chips';
import { Body, Card, H2 } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { promptUpgrade } from '@/lib/paywall';
import { applyPrefs, DEFAULT_PREFS, EVENING_OPTIONS, loadPrefs, MORNING_OPTIONS, type ReminderPrefs } from '@/lib/reminders';
import { useSession } from '@/providers/session';

export function ReminderCard() {
  const { isPremium, refreshPremium } = useSession();
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  async function update(next: ReminderPrefs) {
    setPrefs(next);
    const ok = await applyPrefs(next, isPremium);
    if (!ok && next.enabled) {
      setPrefs({ ...next, enabled: false });
      Alert.alert('알림 권한이 필요해요', '휴대폰 설정 → 앱 → DOIT → 알림을 켜 주세요.');
    }
  }

  const locked = () => promptUpgrade('알림 시간 선택과 저녁 마무리 알림은 프리미엄 기능이에요.', refreshPremium);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <H2>리마인드 알림</H2>
        <Switch
          value={prefs.enabled}
          onValueChange={(enabled) => update({ ...prefs, enabled })}
          trackColor={{ true: C.ink, false: C.line }}
          thumbColor={prefs.enabled ? C.lime : C.white}
        />
      </View>
      {prefs.enabled ? (
        <View style={{ gap: S.sm }}>
          <Body muted>아침 알림 {isPremium ? '' : '· 무료 플랜은 09:00 고정'}</Body>
          <Chips
            options={MORNING_OPTIONS.map((t) => ({ value: t, label: t }))}
            value={isPremium ? prefs.morning : '09:00'}
            onChange={(morning) => (isPremium ? update({ ...prefs, morning }) : locked())}
          />
          <Body muted style={{ marginTop: S.xs }}>저녁 마무리 알림 ✨</Body>
          <Chips
            options={[{ value: 'off', label: '끔' }, ...EVENING_OPTIONS.map((t) => ({ value: t, label: t }))]}
            value={isPremium ? (prefs.evening ?? 'off') : 'off'}
            onChange={(v) => (isPremium ? update({ ...prefs, evening: v === 'off' ? null : v }) : locked())}
          />
        </View>
      ) : (
        <Body muted>매일 아침 오늘의 DO 3를 고르라고 알려 드려요.</Body>
      )}
    </Card>
  );
}
