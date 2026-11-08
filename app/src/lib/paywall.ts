import { Alert } from 'react-native';

import { purchasesAvailable, showPaywall } from '@/lib/purchases';

/** 무료 한도에 걸렸을 때 공통 안내 → 페이월 */
export function promptUpgrade(message: string, onUpgraded: () => void) {
  Alert.alert('프리미엄 기능이에요', message, [
    { text: '닫기', style: 'cancel' },
    {
      text: '7일 무료로 써보기',
      onPress: async () => {
        if (!purchasesAvailable) return Alert.alert('결제는 Android 앱(테스트 빌드)에서 사용할 수 있어요.');
        if (await showPaywall()) onUpgraded();
      },
    },
  ]);
}
