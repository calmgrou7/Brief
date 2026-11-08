import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { TaskRow } from '@/components/task-row';
import { Body, Button, Card, H1, Input, Screen } from '@/components/ui';
import { C } from '@/constants/theme';
import { addTask, archiveGoal, breakdownGoal, deleteTask, FreeLimitError, getGoal, listTasks, setTaskDone, setTaskFocus, today } from '@/lib/api';
import { promptUpgrade } from '@/lib/paywall';
import type { Goal, Task } from '@/lib/types';
import { useSession } from '@/providers/session';

export default function GoalDetail() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { isPremium, refreshPremium } = useSession();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const autoRan = useRef(false);

  const load = useCallback(async () => {
    const [g, t] = await Promise.all([getGoal(id), listTasks(id)]);
    setGoal(g);
    setTasks(t);
    return t;
  }, [id]);

  const runAi = useCallback(async () => {
    setAiBusy(true);
    try {
      const r = await breakdownGoal(id);
      await load();
      if (r.remaining !== null) Alert.alert('쪼개기 완료', `할 일 ${r.created}개를 만들었어요.\n이번 달 무료 AI 쪼개기 ${r.remaining}회 남음`);
    } catch (e) {
      if (e instanceof FreeLimitError) promptUpgrade(e.message, refreshPremium);
      else Alert.alert('AI 쪼개기 실패', (e as Error).message);
    } finally {
      setAiBusy(false);
    }
  }, [id, load, refreshPremium]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = await load();
      // 새로 만든 목표면 바로 AI 쪼개기 실행 (첫 가치 경험)
      if (alive && fresh === '1' && t.length === 0 && !autoRan.current) {
        autoRan.current = true;
        await runAi();
      }
    })();
    return () => {
      alive = false;
    };
  }, [load, fresh, runAi]);

  const todayStr = today();
  const focusCount = tasks.filter((t) => t.focus_date === todayStr).length;

  async function toggleFocus(t: Task) {
    const on = t.focus_date === todayStr;
    if (!on && focusCount >= 3) {
      return Alert.alert('오늘은 3개면 충분해요', '다른 할 일을 먼저 빼고 추가해 주세요. (다른 목표의 할 일도 포함해서 3개를 권장해요)');
    }
    await setTaskFocus(t.id, on ? null : todayStr);
    load();
  }

  async function toggleDone(t: Task) {
    await setTaskDone(t.id, !t.done_at);
    load();
  }

  async function add() {
    if (!newTask.trim()) return;
    await addTask(id, newTask.trim(), (tasks.at(-1)?.position ?? 0) + 1);
    setNewTask('');
    load();
  }

  function onLongPress(t: Task) {
    Alert.alert(t.title, undefined, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteTask(t.id).then(load) },
    ]);
  }

  function archive() {
    Alert.alert('목표 보관', '보관하면 목록과 오늘의 DO에서 사라져요.', [
      { text: '취소', style: 'cancel' },
      { text: '보관', style: 'destructive', onPress: () => archiveGoal(id).then(() => router.back()) },
    ]);
  }

  const done = tasks.filter((t) => t.done_at).length;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ headerRight: () => <Text onPress={archive} style={{ color: C.muted, fontWeight: '700' }}>보관</Text> }} />
      <H1>{goal?.title ?? ''}</H1>
      <Body muted>
        {goal?.due_date ? `마감 ${goal.due_date} · ` : ''}할 일 {done}/{tasks.length} 완료
      </Body>

      <Button
        title={aiBusy ? 'DOIT이 쪼개는 중…' : tasks.length ? '✨ AI로 다시 쪼개기 (추가)' : '✨ AI로 목표 쪼개기'}
        onPress={runAi}
        loading={aiBusy}
        variant={tasks.length ? 'ghost' : 'primary'}
      />
      {!isPremium ? <Body muted style={{ fontSize: 13, textAlign: 'center', marginTop: -6 }}>무료 플랜은 AI 쪼개기 월 3회</Body> : null}

      <Body muted style={{ fontSize: 13 }}>☆를 누르면 오늘의 DO에 추가돼요 · 길게 누르면 삭제</Body>
      <View style={{ gap: 10 }}>
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onToggle={() => toggleDone(t)}
            onLongPress={() => onLongPress(t)}
            right={
              t.done_at ? null : (
                <Pressable hitSlop={12} onPress={() => toggleFocus(t)} accessibilityLabel="오늘의 DO에 추가">
                  <Text style={{ fontSize: 22, color: t.focus_date === todayStr ? '#E8A600' : '#C9C7BF' }}>{t.focus_date === todayStr ? '★' : '☆'}</Text>
                </Pressable>
              )
            }
          />
        ))}
      </View>

      <Card>
        <Input value={newTask} onChangeText={setNewTask} placeholder="할 일 직접 추가" onSubmitEditing={add} returnKeyType="done" />
        <Button title="추가" variant="dark" onPress={add} disabled={!newTask.trim()} />
      </Card>
    </Screen>
  );
}
