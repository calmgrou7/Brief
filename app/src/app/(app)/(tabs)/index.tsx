import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TaskRow } from '@/components/task-row';
import { Body, Button, Card } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { getStreak, listFocus, setTaskDone, today } from '@/lib/api';
import type { Task } from '@/lib/types';
import { useSession } from '@/providers/session';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export default function Today() {
  const { profile } = useSession();
  const [items, setItems] = useState<(Task & { goal_title: string })[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([listFocus(), getStreak().catch(() => 0)]);
      setItems(f);
      setStreak(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggle(t: Task) {
    setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, done_at: t.done_at ? null : new Date().toISOString() } : x)));
    await setTaskDone(t.id, !t.done_at);
    getStreak().then(setStreak).catch(() => {});
  }

  const d = new Date();
  const doneCount = items.filter((t) => t.done_at).length;
  const carried = items.filter((t) => t.focus_date && t.focus_date < today()).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <View style={styles.top}>
          <Body muted>
            {d.getMonth() + 1}월 {d.getDate()}일 {WEEKDAY[d.getDay()]}요일
          </Body>
          <Text style={styles.streak}>🔥 {streak}일 연속</Text>
        </View>
        <Text style={styles.title}>{profile?.display_name ? `${profile.display_name}님의\n` : ''}오늘의 DO 3</Text>

        {items.length === 0 ? (
          <Card style={{ alignItems: 'flex-start', gap: S.sm, padding: S.lg }}>
            <Text style={{ fontSize: 17, fontWeight: '800' }}>오늘 할 일을 골라 볼까요?</Text>
            <Body muted>목표 탭에서 할 일 옆 ☆를 누르면 오늘의 DO에 추가돼요. 하루 3개면 충분해요.</Body>
            <Button title="목표로 가기" onPress={() => router.push('/(app)/(tabs)/goals')} style={{ alignSelf: 'stretch', marginTop: S.sm }} />
          </Card>
        ) : (
          <>
            {carried > 0 ? <Body muted>어제 못 끝낸 {carried}개를 이어서 보여 드려요.</Body> : null}
            <View style={{ gap: 10 }}>
              {items.map((t) => (
                <TaskRow key={t.id} task={t} subtitle={t.goal_title} onToggle={() => toggle(t)} />
              ))}
            </View>
            <View style={styles.progress}>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${(doneCount / items.length) * 100}%` }]} />
              </View>
              <Body muted style={{ fontSize: 13 }}>
                {doneCount} / {items.length} 완료
              </Body>
            </View>
            {doneCount === items.length ? <Text style={styles.cheer}>🎉 오늘 할 일 끝! 내일도 이어가요.</Text> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streak: { fontWeight: '800', fontSize: 13, color: '#C25400', backgroundColor: '#FFF3E6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  title: { fontSize: 32, fontWeight: '900', color: C.ink, letterSpacing: -1 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: S.sm },
  bar: { flex: 1, height: 8, borderRadius: 99, backgroundColor: '#EEEDE7', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.ink, borderRadius: 99 },
  cheer: { fontSize: 16, fontWeight: '800', color: C.ok, textAlign: 'center', marginTop: S.sm },
});
