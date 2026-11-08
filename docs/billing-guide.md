# DOIT 유료 구독 연동 가이드 (Google Play + RevenueCat)

> 목표: **무료 + 프리미엄 구독** (월 4,900원 / 연 39,000원, 신규 7일 무료체험)
> 앱 코드는 이미 준비돼 있습니다. 아래는 **계정·콘솔에서 할 설정**입니다.
> ⚠️ 표시는 순서를 틀리면 막히는 지점입니다. 화면 이름은 콘솔 업데이트로 조금 바뀔 수 있습니다.

## 전체 흐름

```
① Play Console 준비 ──▶ ② 테스트 빌드 업로드 ──▶ ③ 구독 상품 만들기
        │                                                │
        ▼                                                ▼
④ 서비스 계정(구글 클라우드) ──▶ ⑤ RevenueCat 연결 ──▶ ⑥ Supabase 연결
                                                         │
                                                         ▼
                                   ⑦ 결제 테스트 ──▶ ⑧ 출시 전 점검
```

| 무엇이 | 하는 일 |
| --- | --- |
| Google Play 결제 | 실제 결제·갱신·환불 (수수료: 자동갱신 구독 15%) |
| RevenueCat | 구매 검증, 구독 상태 관리, 페이월 화면 (월 매출 $2,500까지 무료) |
| Supabase | 구독 상태를 서버에 저장 → 무료 한도(목표 3개·AI 월 3회) 해제 판단 |

---

## ① Play Console 준비

1. 조직(사업자) 개발자 계정 승인 완료 (D-U-N-S 필요)
2. **설정 → 결제 프로필(판매자 계정)** 만들기: 사업자 정보, 정산 계좌
   ⚠️ 이게 없으면 유료 상품 메뉴가 열리지 않습니다.
3. **앱 만들기**: 이름 `DOIT`, 앱, **무료** 선택 (앱은 무료 + 인앱 구독)
   - "무료"로 출시한 앱은 나중에 유료 앱으로 바꿀 수 없지만, 인앱 구독은 자유롭게 추가할 수 있습니다.

## ② 테스트 빌드 업로드 ⚠️ 상품 만들기 전에 필수

Play는 **결제 기능이 들어간 빌드가 한 번 올라가야** 구독 상품을 만들 수 있게 해 줍니다.
(DOIT 앱에는 결제 라이브러리가 이미 들어 있어 권한이 자동으로 포함됩니다.)

```
cd app
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile production
```

1. 빌드가 끝나면 `.aab` 파일을 내려받습니다.
2. Play Console → **테스트 → 내부 테스트 → 새 버전 만들기** → `.aab` 업로드 → 출시
   ⚠️ **첫 업로드는 반드시 콘솔에서 직접** 해야 합니다. 두 번째부터는 `eas submit`으로 자동 업로드됩니다.
3. 앱 서명은 "Google Play 앱 서명" 기본값 사용

## ③ 구독 상품 만들기

Play Console → **수익 창출 → 제품 → 정기 결제 → 정기 결제 만들기**

| 항목 | 입력값 |
| --- | --- |
| 제품 ID | `doit_premium` ⚠️ 만든 뒤 변경·재사용 불가 |
| 이름 | DOIT 프리미엄 |
| 혜택(앱 내 표시) | 목표 무제한 · AI 쪼개기 무제한 · 상세 주간 리포트 · 알림 시간 설정 |

**기본 요금제 2개** (각각 만든 뒤 **활성화**)

| 기본 요금제 ID | 유형 | 결제 주기 | 한국 가격 |
| --- | --- | --- | --- |
| `monthly` | 자동 갱신 | 1개월 | ₩4,900 |
| `yearly` | 자동 갱신 | 1년 | ₩39,000 |

- 다른 나라 가격은 Play가 환율로 자동 설정합니다. 한국만 팔 거면 국가/지역에서 한국만 남겨도 됩니다.
- 유예 기간(결제 실패 시 계속 이용): 기본값(7일) 권장

**무료체험 오퍼** (각 기본 요금제에 하나씩)

| 항목 | 입력값 |
| --- | --- |
| 오퍼 ID | `trial7` |
| 자격 | 신규 고객 (이 구독을 한 번도 산 적 없는 사용자) |
| 단계 | 무료 체험 7일 |

## ④ 서비스 계정 만들기 (RevenueCat이 Play에 접속할 열쇠)

1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 선택(또는 새로 만들기)
2. **API 및 서비스 → 라이브러리**에서 사용 설정
   - Google Play Android Developer API
   - Google Play Developer Reporting API
   - Cloud Pub/Sub API
3. **IAM 및 관리자 → 서비스 계정 → 만들기** (이름: `revenuecat`)
   - 역할: Pub/Sub 관리자 (실시간 알림용)
   - **키 → 키 추가 → JSON** → 파일 다운로드 (⚠️ 비밀 파일, 저장소에 올리지 마세요)
4. Play Console → **사용자 및 권한 → 새 사용자 초대** → 서비스 계정 이메일 입력
   - 권한: 앱 정보 보기, 재무 데이터 보기, **주문 및 정기 결제 관리**
   - ⚠️ 권한이 실제로 적용되기까지 **최대 36시간** 걸릴 수 있습니다. RevenueCat에서 "자격증명 오류"가 나면 기다렸다가 다시 확인하세요.

## ⑤ RevenueCat 설정

[app.revenuecat.com](https://app.revenuecat.com) 가입 → 프로젝트 `DOIT` 생성

1. **앱 추가 → Google Play Store**
   - 패키지명: `com.chaeumpartners.doit`
   - 서비스 계정 JSON 업로드 (④-3)
2. **실시간 알림(RTDN) 연결**
   - RevenueCat 앱 설정에서 **Google 개발자 알림 → Pub/Sub 주제 연결** → 생성된 주제 이름 복사
   - Play Console → **수익 창출 설정 → 실시간 개발자 알림** → 주제 이름 붙여넣기 → "테스트 알림 보내기"로 확인
3. **제품 가져오기**: Products → Import → `doit_premium:monthly`, `doit_premium:yearly`
4. **Entitlement 만들기**: 식별자 **`premium`** (⚠️ 앱 코드가 이 이름을 씁니다) → 두 제품 연결
5. **Offering**: `default` 오퍼링에 패키지 추가
   - Monthly(`$rc_monthly`) → `doit_premium:monthly`
   - Annual(`$rc_annual`) → `doit_premium:yearly`
6. **Paywalls → 페이월 만들기** (앱이 이 화면을 그대로 띄웁니다)
   - 한국어 문구 예: "7일 무료로 시작하기", "목표·AI 쪼개기 무제한"
   - ⚠️ 정책상 반드시 보여야 할 것: 가격과 결제 주기, 체험 후 자동 결제된다는 안내, 언제든 해지 가능, 이용약관·개인정보처리방침 링크
7. **API 키**: Project settings → API keys → **Google Play 공개 키(`goog_...`)** 복사
   → `app/eas.json`의 세 빌드 프로필 `env`에 `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`로 추가 (공개용 키라 저장소에 있어도 됩니다)

## ⑥ Supabase 연결 (구독 상태 → 서버)

1. 임의의 긴 비밀 문자열 하나 만들기 (예: 비밀번호 생성기 40자)
2. Supabase 대시보드 → Edge Functions → Secrets → `REVENUECAT_WEBHOOK_SECRET` = 그 문자열
3. RevenueCat → Integrations → **Webhooks** → 추가
   - URL: `https://ibewzhlaoieuqiagqygf.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header: `Bearer <그 문자열>`
   - "Send test event" → 200 응답이면 성공

이후 구독 시작·갱신·해지·만료가 일어날 때마다 Supabase `entitlements` 표가 자동으로 바뀌고, 무료 한도가 서버에서 자동으로 풀리고 잠깁니다.

## ⑦ 결제 테스트 (실제 돈 안 나감)

1. Play Console → **설정 → 라이선스 테스트**에 테스트할 Gmail 계정 추가
2. 내부 테스트 → 테스터에 같은 계정 추가 → **참여 링크**로 휴대폰에 앱 설치 (Play에서 설치해야 결제가 동작)
3. 앱 → 설정 → "프리미엄 7일 무료 체험" → 테스트 카드로 결제
4. 확인할 것

| 시나리오 | 기대 결과 |
| --- | --- |
| 체험 시작 | 목표 4개째 추가 가능, AI 쪼개기 한도 사라짐, 리포트 상세 열림 |
| 앱 삭제 후 재설치 → "구매 복원" | 프리미엄 다시 적용 |
| Play에서 구독 해지 | 기간 끝날 때까지 프리미엄 유지 → 만료되면 무료로 돌아옴 |
| 결제 실패(테스트 카드 "거절") | 유예 기간 동안 유지 |

- 테스트 계정은 갱신 주기가 빨라집니다(1개월 → 약 5분). 몇 번 갱신 후 자동 해지됩니다.
- RevenueCat 대시보드 → Customers에서 사용자 ID(= Supabase 사용자 ID)로 상태를 바로 볼 수 있습니다.

## ⑧ 출시 전 점검

- [ ] 앱 콘텐츠 → **데이터 보안**: 구매 내역 수집 항목 체크
- [ ] 스토어 설명에 "무료 다운로드, 일부 기능은 구독(월 4,900원)" 명시
- [ ] 이용약관(`terms.html`)의 구독·환불 조항과 실제 상품이 일치하는지
- [ ] 정산: Play Console → 결제 프로필에서 매월 정산 확인 (부가세 처리 방식은 세무사 확인 권장)

---

## 사전등록자 "3개월 무료" 지급 방법

| 방법 | 장점 | 단점 |
| --- | --- | --- |
| **RevenueCat 프로모션 권한 부여** (추천) | 카드 등록 없이 즉시 지급, 사용자 ID로 한 명씩 또는 API로 일괄 | 3개월 후 자동 결제로 이어지지 않음 (재구독 유도 필요) |
| Play 프로모션 코드 | 3개월 뒤 자동으로 유료 전환 | 카드 등록 필요, 코드 발급 수량 제한 |

RevenueCat 방식: Customers → 사용자 검색 → **Grant promotional entitlement** → `premium`, 3개월.
웹훅으로 Supabase에도 자동 반영됩니다.
