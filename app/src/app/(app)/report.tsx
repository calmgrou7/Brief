import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, H1, H2, Screen } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { getWeeklyReport, type WeeklyReport } from '@/lib/api';
import { promptUpgrade } from '@/lib/paywall';
import { useSession } from '@/providers/session';

const WD = ['일', '월', '화', '수', '목', '금', '토'];

function hourLabel(h: number) {
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${hh}시`;
}

export default function Report() {
  const { isPremium, refreshPremium } = useSession();
  const [r, setR] = useState<WeeklyReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getWeeklyReport().then(setR).catch((e) => setErr(e.message));
    }, []),
  );

  if (err) return <Screen edges={[]}><Body>{err}</Body></Screen>;
  if (!r) return <Screen edges={[]}><ActivityIndicator color={C.ink} /></Screen>;

  const max = Math.max(1, ...r.days.map((d) => d.done));
  const diff = r.done_total - r.prev_done_total;
  const rate = r.focus_planned ? Math.round((r.focus_done / r.focus_planned) * 100) : null;
  const activeDays = r.days.filter((d) => d.done > 0).length;

  return (
    <Screen edges={[]}>
      <H1>이번 주 실행 리포트</H1>
      <Body muted>최근 7일 기준</Body>

      {/* 무료: 요약 */}
      <Card style={styles.hero}>
        <Text style={styles.big}>{r.done_total}개</Text>
        <Body style={{ color: C.white }}>완료한 할 일</Body>
        <Text style={styles.diff}>
          {diff === 0 ? '지난주와 같아요' : diff > 0 ? `지난주보다 ${diff}개 더 해냈어요 📈` : `지난주보다 ${-diff}개 적어요. 이번 주 다시 가볼까요?`}
        </Text>
      </Card>

      <Card>
        <H2>요일별 완료</H2>
        <View style={styles.chart}>
          {r.days.map((d) => {
            const wd = WD[new Date(`${d.date}T00:00:00`).getDay()];
            return (
              <View key={d.date} style={styles.col}>
                <Text style={styles.colNum}>{d.done || ''}</Text>
                <View style={[styles.bar, { height: 8 + (d.done / max) * 92, backgroundColor: d.done ? C.ink : C.line }]} />
                <Text style={styles.colLabel}>{wd}</Text>
              </View>
            );
          })}
        </View>
        <Body muted>7일 중 {activeDays}일 실행했어요.</Body>
      </Card>

      {/* 프리미엄: 상세 */}
      <View>
        <View style={[{ gap: S.md }, !isPremium && { opacity: 0.25 }]} pointerEvents={isPremium ? 'auto' : 'none'}>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Card style={{ flex: 1 }}>
              <Body muted>DO 3 실행률</Body>
              <Text style={styles.stat}>{rate === null ? '-' : `${rate}%`}</Text>
              <Body muted style={{ fontSize: 12 }}>{r.focus_done}/{r.focus_planned}개</Body>
            </Card>
            <Card style={{ flex: 1 }}>
              <Body muted>집중한 시간</Body>
              <Text style={styles.stat}>{Math.floor(r.minutes_done / 60)}h {r.minutes_done % 60}m</Text>
              <Body muted style={{ fontSize: 12 }}>예상 소요시간 합계</Body>
            </Card>
          </View>
          <Card>
            <H2>가장 잘 되는 시간</H2>
            <Body>{r.best_hour === null ? '아직 데이터가 부족해요.' : `${hourLabel(r.best_hour)}에 가장 많이 끝냈어요. 중요한 일은 이 시간에 배치해 보세요.`}</Body>
          </Card>
          <Card>
            <H2>많이 진행한 목표</H2>
            {r.top_goals.length === 0 ? <Body muted>이번 주 완료한 할 일이 없어요.</Body> : null}
            {r.top_goals.map((g, i) => (
              <View key={g.title} style={styles.goalRow}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Body style={{ flex: 1 }}>{g.title}</Body>
                <Body muted>{g.done}개</Body>
              </View>
            ))}
          </Card>
        </View>
        {!isPremium ? (
          <View style={styles.lock}>
            <Text style={{ fontSize: 28 }}>🔒</Text>
            <H2 style={{ textAlign: 'center' }}>실행률 · 집중 시간 · 골든타임</H2>
            <Body muted style={{ textAlign: 'center' }}>프리미엄에서 상세 리포트를 볼 수 있어요.</Body>
            <Button title="7일 무료로 보기" onPress={() => promptUpgrade('상세 주간 리포트는 프리미엄 기능이에요.', refreshPremium)} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: C.ink, borderColor: C.ink, padding: S.lg },
  big: { fontSize: 44, fontWeight: '900', color: C.lime, letterSpacing: -1.5 },
  diff: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, marginTop: S.sm },
  col: { alignItems: 'center', flex: 1, gap: 4 },
  colNum: { fontSize: 12, fontWeight: '700', color: C.ink, height: 16 },
  bar: { width: 22, borderRadius: R.sm },
  colLabel: { fontSize: 12, color: C.muted },
  stat: { fontSize: 26, fontWeight: '900', color: C.ink, marginVertical: 2 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  rank: { width: 24, height: 24, borderRadius: 7, backgroundColor: C.lime, textAlign: 'center', lineHeight: 24, fontWeight: '900', overflow: 'hidden' },
  lock: { position: 'absolute', left: 0, right: 0, top: 24, alignItems: 'center', gap: S.sm, backgroundColor: 'rgba(246,245,240,0.92)', padding: S.lg, borderRadius: R.lg, borderWidth: 1, borderColor: C.line },
});
