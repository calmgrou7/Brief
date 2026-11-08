# DOIT 연결·배포 가이드 (대표님이 직접 하실 일 위주)

코드는 준비돼 있고, 아래 계정·키만 연결하면 실제로 동작합니다. **① → ⑥ 순서**로 진행하세요.
⏱ 표시는 승인 대기 시간이 있는 작업이라 **가장 먼저** 신청하는 게 좋습니다.

---

## ① Google Play 개발자 계정 (조직) ⏱
1. **D-U-N-S 번호** 신청 (무료, 한국은 나이스디앤비 대행) — 사업자등록증 영문 정보 필요. 수일~수주 소요
2. [Play Console](https://play.google.com/console) → 조직 계정으로 가입, 등록비 $25
3. **결제 프로필(판매자 계정)** 등록 — 사업자 정보, 정산 계좌. 이게 있어야 구독 상품을 만들 수 있음
4. 앱 만들기 → 이름 `DOIT`, 앱/무료(인앱 구독 포함)
   - ⚠️ 패키지명은 `app/app.json` 의 `com.chaeumpartners.doit` — **한 번 올리면 영원히 못 바꿉니다.** 바꾸려면 지금 바꾸세요.

## ② Supabase (로그인 · DB · 서버 함수)
1. 새 프로젝트 생성 — 리전은 **Northeast Asia (Seoul)** 권장
2. **DB 스키마 적용**: SQL Editor에 `supabase/migrations/20261108000000_init.sql` 붙여넣고 실행
   (또는 Supabase CLI: `supabase link` → `supabase db push`)
3. **이메일 로그인 6자리 코드 설정**: Authentication → Emails → Templates → *Magic Link* 본문에 `{{ .Token }}` 이 들어가게 수정
   (예: `DOIT 인증 코드: {{ .Token }}`)
4. **구글 로그인**: Google Cloud Console에서 OAuth 클라이언트(웹 애플리케이션) 생성 → 승인된 리디렉션 URI에
   `https://<프로젝트ID>.supabase.co/auth/v1/callback` 추가 → 받은 Client ID/Secret을 Supabase Authentication → Providers → Google에 입력
5. Authentication → URL Configuration → Redirect URLs 에 `doit://auth-callback` 추가
6. **서버 함수 배포** (Supabase CLI):
   ```
   supabase secrets set ANTHROPIC_API_KEY=... REVENUECAT_WEBHOOK_SECRET=<임의의 긴 문자열>
   supabase functions deploy ai-breakdown
   supabase functions deploy delete-account
   supabase functions deploy revenuecat-webhook --no-verify-jwt
   ```
   - AI 모델 기본값은 Claude Opus 5.5. 비용을 낮추려면 `supabase secrets set DOIT_AI_MODEL=claude-haiku-5-5`

## ③ Claude API 키
[console.anthropic.com](https://console.anthropic.com) → API Keys 발급 → ②-6 의 `ANTHROPIC_API_KEY` 로 등록.
월 사용 한도(Limits)를 걸어 두면 비용 폭주를 막을 수 있습니다.

## ④ RevenueCat (구독)
1. 프로젝트 생성 → Google Play 앱 추가 (패키지명 동일), Play Console 서비스 계정 JSON 연결
2. Play Console → 수익 창출 → 구독: 상품 `doit_premium`, 기본 요금제 `monthly`(4,900원) · `yearly`(39,000원), 신규 7일 무료체험 오퍼
3. RevenueCat: Entitlement **`premium`** 생성 → 두 상품 연결 → Offering(default)에 패키지 2개
4. Paywalls 메뉴에서 페이월 디자인 (앱은 이 페이월을 그대로 띄움)
5. Integrations → Webhooks: URL `https://<프로젝트ID>.supabase.co/functions/v1/revenuecat-webhook`,
   Authorization 헤더 `Bearer <REVENUECAT_WEBHOOK_SECRET 값>`
6. API keys → **Google Play public key** (`goog_...`) 복사

## ⑤ 앱 환경변수
`app/.env.example` 을 `app/.env` 로 복사 후 값 입력 (Supabase URL·publishable key, RevenueCat 키, 홈페이지 주소).

## ⑥ 빌드 → 테스트 → 출시 (EAS, 맥·안드로이드 스튜디오 불필요)
```
cd app
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile development   # 내 폰에 설치해서 개발용 테스트
npx eas-cli@latest build --platform android --profile production    # 스토어 업로드용 .aab
npx eas-cli@latest submit --platform android                        # Play 내부 테스트 트랙에 업로드
```
- 첫 업로드는 Play Console에서 수동으로 한 번 올려야 할 수 있습니다.
- 결제 테스트: Play Console → 설정 → 라이선스 테스트에 본인 구글 계정 추가 (실제 결제 안 됨)
- 비공개 테스트: 사전등록자 중 테스터 모집 → 피드백 반영 → 프로덕션 출시 신청

## 출시 전 빈칸 채우기 체크리스트
- [ ] `privacy.html` · `terms.html` · `delete-account.html` 의 노란색 `[사업자명]` 등 빈칸
- [ ] `privacy.html` 의 Supabase 서버 리전
- [ ] 통신판매업 신고번호 (필요 여부 세무사 확인)
- [ ] 앱 아이콘·스플래시 이미지 교체 (`app/assets/images/`) — 현재 Expo 기본 이미지
- [ ] Play 스토어 등록정보: 스크린샷, 설명, 데이터 보안 설문, 콘텐츠 등급, 심사용 테스트 계정
