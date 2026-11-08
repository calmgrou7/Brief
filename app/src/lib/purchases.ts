import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { config } from '@/lib/config';

export const purchasesAvailable = Platform.OS === 'android' && !!config.revenueCatAndroidKey;

let configured = false;

/** 로그인한 Supabase 사용자 ID로 RevenueCat을 연결 → 웹훅에서 같은 ID로 구독 상태를 저장 */
export async function connectPurchases(userId: string) {
  if (!purchasesAvailable) return;
  if (!configured) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: config.revenueCatAndroidKey, appUserID: userId });
    configured = true;
  } else {
    await Purchases.logIn(userId);
  }
}

export async function disconnectPurchases() {
  if (!purchasesAvailable || !configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // 익명 사용자 상태에서 logOut 하면 오류 — 무시
  }
}

export function hasPremium(info: CustomerInfo | null) {
  return !!info?.entitlements.active[config.entitlementId];
}

export async function getCustomerInfo() {
  if (!purchasesAvailable || !configured) return null;
  return Purchases.getCustomerInfo();
}

export function onCustomerInfo(cb: (info: CustomerInfo) => void) {
  if (!purchasesAvailable) return () => {};
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}

/** RevenueCat 대시보드에서 디자인한 페이월 표시. 구매/복원 성공 시 true */
export async function showPaywall(): Promise<boolean> {
  if (!purchasesAvailable) return false;
  const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function restorePurchases() {
  if (!purchasesAvailable) return null;
  return Purchases.restorePurchases();
}

/** Play 스토어 구독 관리 화면 */
export async function manageSubscription() {
  if (!purchasesAvailable) return;
  await Purchases.showManageSubscriptions();
}
