# 동네전문가 — Supabase 백엔드

| 항목 | 값 |
|---|---|
| 조직 | bridgenode (Free) |
| 프로젝트 | `dongne-expert` · ref `ltnwbinctflmczqnhuii` · 서울(ap-northeast-2) |
| API URL | https://ltnwbinctflmczqnhuii.supabase.co |
| 앱용 공개키 | `.env.example` 참고 (publishable key) |
| DB 상태 | 마이그레이션 5개 적용 완료 (2026-11-08), 보안·성능 점검 반영 |

```
supabase/
├── migrations/
│   ├── 20261108000000_init_schema.sql            # 테이블·RLS·매칭/정산/페널티/레벨 함수
│   ├── 20261108010000_payment_status_processing.sql
│   └── 20261108010100_edge_function_support.sql  # 푸시토큰·환불큐·발송기록·cron 설정
├── functions/
│   ├── _shared/              # 공통 로직 (DB·PortOne·FCM·웹훅서명·발송·환불·알림문구)
│   ├── payment-confirm/      # 앱 결제 직후 검증 → 매칭 시작 + 1차 콜 푸시
│   ├── portone-webhook/      # 앱이 꺼져도 결제→매칭 보장 (안전망)
│   ├── matching-tick/        # 1분마다: 반경 확대·미매칭 만료·추가 콜 푸시
│   ├── process-refunds/      # 1분마다: 환불 대기건 PortOne 실제 취소
│   └── request-notify/       # 상태 변경 시 고객·전문가 푸시
├── tests/edge_functions_test.ts
└── config.toml
```

## 전체 흐름 (사람 손 안 가는 구조)

```
[앱] 요청 생성(requests insert) ─ 서버가 출장비 계산
  → PortOne 결제창 (paymentId = "req_{요청ID}_{랜덤}")
  → payment-confirm ──┬─ PortOne 조회: PAID? 금액 일치? ── 아니면 자동 결제취소
                      └─ confirm_payment → 상태 '매칭대기' → 주변 전문가 FCM 콜 푸시
     (앱이 꺼져도 portone-webhook 이 같은 처리, 중복 실행돼도 1번만)
  → matching-tick (1분) : 3→5→10km 반경 확대하며 추가 푸시 / 10분 미매칭 → 환불 대기
  → 전문가 수락·출발·도착·완료 (앱 RPC)
  → request_events 기록 → request-notify → 고객/전문가 푸시
  → 취소·노쇼·미매칭 → payments 'refund_requested'
  → process-refunds (1분) : PortOne 취소 → 'refunded' → 고객 "환불 완료" 푸시
```

## 설정 순서

### 1. 외부 서비스 준비
| 서비스 | 할 일 | 얻는 값 |
|---|---|---|
| PortOne (V2) | 가입 → PG사 연동(토스페이먼츠 등) → 콘솔 `결제연동 > 연동 관리` | **API Secret**, Store ID, Channel Key |
| PortOne 웹훅 | `결제연동 > 웹훅` URL: `https://ltnwbinctflmczqnhuii.supabase.co/functions/v1/portone-webhook`, 버전 V2 | **Webhook Secret** (`whsec_...`) |
| Firebase | 프로젝트 생성 → Android/iOS 앱 등록 → `프로젝트 설정 > 서비스 계정 > 새 비공개 키` | **서비스계정 JSON** |
| iOS 푸시 | Apple Developer 에서 APNs 키 발급 → Firebase `Cloud Messaging` 에 업로드 | — |

### 2. DB 마이그레이션
```bash
supabase link --project-ref ltnwbinctflmczqnhuii
```
```bash
supabase db push
```

### 3. Edge Function 비밀값
`CRON_SECRET`, `WEBHOOK_SECRET` 은 아무 긴 랜덤 문자열(예: `openssl rand -hex 32`).
```bash
supabase secrets set PORTONE_API_SECRET=... PORTONE_WEBHOOK_SECRET=whsec_... CRON_SECRET=... WEBHOOK_SECRET=...
```
```bash
supabase secrets set FCM_SERVICE_ACCOUNT="$(cat firebase-service-account.json)"
```
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 는 Supabase 가 자동 주입)

### 4. 배포
```bash
supabase functions deploy
```

### 5. 자동 실행 연결
1. 대시보드 → Database → Extensions: **pg_cron**, **pg_net** 활성화
2. SQL Editor 에서 `20261108010100_edge_function_support.sql` 하단 주석의 `vault.create_secret` 2줄과 `cron.schedule` 3개 실행
3. 대시보드 → Database → Webhooks → 새 웹훅: 테이블 `request_events`, 이벤트 `INSERT`,
   URL `.../functions/v1/request-notify`, 헤더 `x-webhook-secret: <WEBHOOK_SECRET>`

## 앱에서 할 일 (요약)
| 시점 | 호출 |
|---|---|
| 로그인 직후 / FCM 토큰 갱신 | `rpc('register_device_token', { p_token, p_platform })` |
| 요청 생성 | `from('requests').insert({...})` → 응답의 `id`, `total_fee` 사용 |
| 결제 | PortOne SDK `requestPayment({ paymentId: 'req_'+id+'_'+uuid, totalAmount: total_fee, ... })` |
| 결제 완료 | `functions.invoke('payment-confirm', { body: { paymentId } })` |
| 전문가 콜 수신 | FCM `data.type === 'new_call'` → 콜 팝업 → `rpc('accept_request', { p_request })` |
| 진행 상태 | `rpc('advance_request', ...)`, 실시간 화면은 Realtime 으로 `requests` 구독 |
| 안드로이드 알림 채널 | `calls`(콜, 소리 크게), `status`(진행 알림) 2개 생성 |

## 테스트
```bash
deno test supabase/tests/
```
가짜 DB와 가짜 PortOne·FCM 서버로 결제확인·중복방지·금액불일치 자동취소·콜발송·환불·웹훅서명·FCM 서명을 검증 (15개).

## 운영 체크포인트
- 환불 5회 실패 → `payments.status = 'failed'` : 관리자 화면에서 확인 후 PortOne 콘솔에서 수동 처리
- `last_error` 컬럼에 PG 오류 메시지 기록
- 함수 로그: 대시보드 → Edge Functions → 각 함수 Logs
