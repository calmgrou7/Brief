import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { ReminderCard } from '@/components/reminder-card';
import { Body, Button, Card, H1, H2, Screen } from '@/components/ui';
import { S } from '@/constants/theme';
import { deleteMyAccount } from '@/lib/api';
import { config } from '@/lib/config';
import { manageSubscription, purchasesAvailable, restorePurchases, showPaywall } from '@/lib/purchases';
import { useSession } from '@/providers/session';

export default function Settings() {
  const { session, profile, isPremium, refreshPremium, signOut } = useSession();
  const [busy, setBusy] = useState(false);

  async function upgrade() {
    if (!purchasesAvailable) return Alert.alert('결제는 Android 앱(테스트 빌드)에서 사용할 수 있어요.');
    if (await showPaywall()) refreshPremium();
  }

  async function restore() {
    await restorePurchases();
    await refreshPremium();
    Alert.alert('구매 내역을 확인했어요.');
  }

  function confirmDelete() {
    Alert.alert(
      '정말 탈퇴할까요?',
      '목표·할 일·기록이 모두 즉시 삭제되고 되돌릴 수 없어요.\n\n⚠️ 이용 중인 구독은 탈퇴해도 자동으로 해지되지 않아요. 먼저 "구독 관리"에서 해지해 주세요.',
      [
        { text: '취소', style: 'cancel' },
        ...(isPremium && purchasesAvailable ? [{ text: '구독 관리 먼저', onPress: () => manageSubscription() }] : []),
        {
          text: '탈퇴하기',
          style: 'destructive' as const,
          onPress: async () => {
            setBusy(true);
            try {
              await deleteMyAccount();
            } catch (e) {
              Alert.alert((e as Error).message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  const open = (path: string) => WebBrowser.openBrowserAsync(`${config.siteUrl}/${path}`);

  return (
    <Screen>
      <H1>설정</H1>

      <Card>
        <H2>{profile?.display_name || '내 계정'}</H2>
        <Body muted>{session?.user.email}</Body>
      </Card>

      <Card>
        <H2>{isPremium ? '프리미엄 이용 중 ✨' : '무료 플랜'}</H2>
        {isPremium ? (
          <>
            <Body muted>목표·AI 쪼개기 무제한, 상세 리포트를 이용할 수 있어요.</Body>
            <Button title="구독 관리 (Google Play)" variant="ghost" onPress={() => manageSubscription()} />
          </>
        ) : (
          <>
            <Body muted>목표 {config.freeGoalLimit}개 · AI 쪼개기 월 {config.freeAiPerMonth}회. 프리미엄은 7일 무료 체험 후 월 4,900원 / 연 39,000원, 언제든 해지할 수 있어요.</Body>
            <Button title="프리미엄 7일 무료 체험" onPress={upgrade} />
            <Button title="구매 복원" variant="ghost" onPress={restore} />
          </>
        )}
      </Card>

      <ReminderCard />

      <Card>
        <H2>약관 및 정책</H2>
        <View style={{ gap: S.sm }}>
          <Button title="이용약관" variant="ghost" onPress={() => open('terms.html')} />
          <Button title="개인정보처리방침" variant="ghost" onPress={() => open('privacy.html')} />
        </View>
      </Card>

      <Button title="로그아웃" variant="dark" onPress={signOut} />
      <Button title="회원 탈퇴" variant="danger" onPress={confirmDelete} loading={busy} />
    </Screen>
  );
}
