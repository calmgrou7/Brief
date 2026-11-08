import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, H1, Input, Screen } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { createGoal, FreeLimitError, listGoals } from '@/lib/api';
import { config } from '@/lib/config';
import { promptUpgrade } from '@/lib/paywall';
import type { Goal } from '@/lib/types';
import { useSession } from '@/providers/session';

export default function Goals() {
  const { isPremium, refreshPremium } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listGoals().then(setGoals).catch((e) => Alert.alert('불러오기 실패', e.message));
  }, []);
  useFocusEffect(load);

  const active = goals.filter((g) => g.status === 'active');

  async function add() {
    const t = title.trim();
    if (!t) return;
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return Alert.alert('마감일은 2026-12-31 형식으로 입력해 주세요.');
    setBusy(true);
    try {
      const g = await createGoal(t, due || null);
      setTitle('');
      setDue('');
      router.push({ pathname: '/(app)/goal/[id]', params: { id: g.id, fresh: '1' } });
    } catch (e) {
      if (e instanceof FreeLimitError) promptUpgrade(e.message, refreshPremium);
      else Alert.alert('저장 실패', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <H1>목표</H1>
      <Card>
        <Input label="이루고 싶은 것" value={title} onChangeText={setTitle} placeholder="예) 12월까지 홈페이지 오픈하기" returnKeyType="next" />
        <Input label="마감일 (선택)" value={due} onChangeText={setDue} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" maxLength={10} />
        <Button title="목표 추가하고 쪼개기" onPress={add} loading={busy} disabled={!title.trim()} style={{ marginTop: S.xs }} />
        {!isPremium ? (
          <Body muted style={{ fontSize: 13, textAlign: 'center' }}>
            무료 플랜 · 진행 중 목표 {active.length}/{config.freeGoalLimit}
          </Body>
        ) : null}
      </Card>

      <View style={{ gap: 10 }}>
        {goals.map((g) => (
          <Pressable key={g.id} onPress={() => router.push({ pathname: '/(app)/goal/[id]', params: { id: g.id } })} style={styles.goal}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalTitle, g.status === 'done' && { color: C.muted, textDecorationLine: 'line-through' }]}>{g.title}</Text>
              {g.due_date ? <Body muted style={{ fontSize: 13 }}>마감 {g.due_date}</Body> : null}
            </View>
            <Text style={{ fontSize: 20, color: C.muted }}>›</Text>
          </Pressable>
        ))}
        {goals.length === 0 ? <Body muted style={{ textAlign: 'center', marginTop: S.lg }}>첫 목표를 적어 보세요. 작게 쪼개는 건 DOIT이 도와드릴게요.</Body> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  goal: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: S.md, gap: S.sm },
  goalTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
});
