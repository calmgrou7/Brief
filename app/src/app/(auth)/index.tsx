import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Screen } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const SLIDES = [
  { k: '01', t: '목표를 한 줄로', d: '“12월까지 홈페이지 오픈”처럼 이루고 싶은 걸 그대로 적어요.' },
  { k: '02', t: 'DOIT이 잘게 쪼개요', d: '10~30분이면 끝나는 할 일로 나누고 순서를 제안해요.' },
  { k: '03', t: '오늘은 딱 3개만', d: '매일 DO 3만 체크하면 연속 기록이 쌓여요.' },
];

export default function Welcome() {
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    try {
      setBusy(true);
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error('로그인 주소를 만들지 못했어요.');

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success') return; // 사용자가 닫음
      const { queryParams } = Linking.parse(res.url);
      const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
      if (!code) throw new Error(String(queryParams?.error_description ?? '로그인이 취소됐어요.'));
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exErr) throw exErr;
    } catch (e) {
      Alert.alert('구글 로그인 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.logoRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoCheck}>✓</Text>
        </View>
        <Text style={styles.logoText}>DOIT</Text>
      </View>

      <Text style={styles.hero}>
        생각은 그만,{'\n'}
        <Text style={styles.hl}>오늘 할 일</Text>부터.
      </Text>

      <View style={{ gap: S.sm, marginTop: S.sm }}>
        {SLIDES.map((s) => (
          <View key={s.k} style={styles.step}>
            <Text style={styles.stepNum}>{s.k}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.stepTitle}>{s.t}</Text>
              <Body muted>{s.d}</Body>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: S.sm, marginTop: S.lg }}>
        <Button title="Google로 계속하기" variant="dark" onPress={signInWithGoogle} loading={busy} />
        <Button title="이메일로 계속하기" variant="ghost" onPress={() => router.push('/(auth)/email')} disabled={busy} />
        <Body muted style={{ textAlign: 'center', fontSize: 13, marginTop: S.xs }}>
          계속하면 다음 화면에서 이용약관·개인정보처리방침 동의를 진행합니다.
        </Body>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: S.md },
  logoMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  logoCheck: { color: C.lime, fontSize: 20, fontWeight: '900' },
  logoText: { fontSize: 24, fontWeight: '900', color: C.ink, letterSpacing: -1 },
  hero: { fontSize: 40, lineHeight: 50, fontWeight: '900', color: C.ink, letterSpacing: -1.5, marginTop: S.lg },
  hl: { backgroundColor: C.lime },
  step: { flexDirection: 'row', gap: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: S.md },
  stepNum: { fontWeight: '900', color: C.ink, backgroundColor: C.lime, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', overflow: 'hidden' },
  stepTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
});
