import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Body, Button, H1, Input, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function EmailLogin() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Alert.alert('이메일 주소를 확인해 주세요.');
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return Alert.alert('코드 전송 실패', error.message);
    setSent(true);
  }

  async function verify() {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) return Alert.alert('인증 실패', '코드가 맞지 않거나 만료됐어요. 다시 받아 주세요.');
    // 세션이 생기면 루트 레이아웃이 자동으로 다음 화면으로 이동
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Button title="← 뒤로" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'flex-start', minHeight: 40 }} />
      <H1>이메일로 시작하기</H1>
      <Body muted>비밀번호 없이, 메일로 받은 6자리 코드로 로그인해요. 처음이면 자동으로 가입됩니다.</Body>
      <Input
        label="이메일"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        editable={!sent}
      />
      {sent ? (
        <>
          <Input label="인증 코드" value={code} onChangeText={setCode} placeholder="6자리 숫자" keyboardType="number-pad" maxLength={6} autoFocus />
          <Button title="로그인" onPress={verify} loading={busy} disabled={code.trim().length < 6} />
          <Button title="코드 다시 받기" variant="ghost" onPress={sendCode} disabled={busy} />
        </>
      ) : (
        <Button title="인증 코드 받기" onPress={sendCode} loading={busy} />
      )}
    </Screen>
  );
}
