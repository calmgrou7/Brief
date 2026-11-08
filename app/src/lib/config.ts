// 환경 변수는 app/.env 에 넣습니다 (.env.example 참고). EXPO_PUBLIC_ 값은 앱에 포함되므로 공개 키만 넣으세요.
export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  /** RevenueCat 대시보드의 Entitlement 식별자 */
  entitlementId: 'premium',
  /** 홈페이지(약관·개인정보처리방침·계정삭제 안내) */
  siteUrl: process.env.EXPO_PUBLIC_SITE_URL ?? 'https://example.com',
  /** 무료 플랜 한도 — 서버(DB 트리거·Edge Function)의 값과 맞춰야 합니다 */
  freeGoalLimit: 3,
  freeAiPerMonth: 3,
};
