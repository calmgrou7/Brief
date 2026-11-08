import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Body, Button, Card, Check, H1, Input, Screen } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { config } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

export default function Consent() {
  const { session, refreshProfile, signOut } = useSession();
  const [name, setName] = useState(session?.user.user_metadata?.full_name ?? '');
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);

  const all = age && terms && privacy && marketing;
  const toggleAll = () => {
    const v = !all;
    setAge(v);
    setTerms(v);
    setPrivacy(v);
    setMarketing(v);
  };

  async function submit() {
    if (!session) return;
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: name.trim() || null,
        confirmed_age_14_at: now,
        agreed_terms_at: now,
        agreed_privacy_at: now,
        marketing_opt_in: marketing,
        marketing_opt_in_at: marketing ? now : null,
      })
      .eq('id', session.user.id);
    setBusy(false);
    if (error) return Alert.alert('저장 실패', error.message);
    await refreshProfile();
  }

  const link = (label: string, path: string) => (
    <Body>
      <Text style={{ textDecorationLine: 'underline' }} onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/${path}`)}>
        {label}
      </Text>{' '}
      동의 <Text style={{ color: C.danger }}>(필수)</Text>
    </Body>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <H1>반가워요! 👋</H1>
      <Body muted>시작하기 전에 몇 가지만 확인할게요.</Body>
      <Input label="닉네임 (선택)" value={name} onChangeText={setName} placeholder="앱에서 부를 이름" maxLength={20} />

      <Card style={{ marginTop: S.sm }}>
        <Check checked={all} onPress={toggleAll} label={<Body style={{ fontWeight: '800' }}>전체 동의</Body>} />
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 4 }} />
        <Check checked={age} onPress={() => setAge(!age)} label={<Body>만 14세 이상입니다 <Text style={{ color: C.danger }}>(필수)</Text></Body>} />
        <Check checked={terms} onPress={() => setTerms(!terms)} label={link('이용약관', 'terms.html')} />
        <Check checked={privacy} onPress={() => setPrivacy(!privacy)} label={link('개인정보 수집·이용', 'privacy.html')} />
        <Check checked={marketing} onPress={() => setMarketing(!marketing)} label="혜택·이벤트 알림 수신 (선택)" />
      </Card>

      <Button title="DOIT 시작하기" onPress={submit} loading={busy} disabled={!(age && terms && privacy)} />
      <Button title="다른 계정으로 로그인" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
