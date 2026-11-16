# 인수인계: 숨결 (2026-11-16 기준)

## 1. 지금까지 만든 것

| 단계 | 결과 | 위치 |
|---|---|---|
| 1. 프로토타입 | 단일 HTML 호흡 앱 (6가지 호흡, 입자 그림, 한국어 음성, 화음 음악, 환영→질문→추천 흐름) | `breath/index.html` |
| 2. 유료 웹앱 MVP | 소개 사이트, 회원, 보관함, 무료/프리미엄, 테스트 결제, 관리자 | `soomgyeol/server`, `public/` |
| 3. 구글 플레이 | TWA 래퍼, 서명된 `.aab`, 스토어 그래픽·문구, 계정 삭제 페이지, assetlinks | `soomgyeol/android/` |

개발 요청서(「유료 앱과 웹사이트 공통 개발 요청서 1.0」)의 2장 입력값과 가정은 `soomgyeol/README.md` 에 표로 정리돼 있습니다.

## 2. 검증 상태
- `npm test`: 13개 통과 (가입·재설정, CSRF, 무료 한도·동시 요청, 타인 자료 차단, 결제 중복·위조·금액 불일치, 해지·만료·유예·순서 뒤바뀜, 환불, 탈퇴, 소개 페이지·SEO·assetlinks).
- 브라우저(Playwright) 점검: 휴대폰 360/400px, PC 1280px 에서 환영→추천→가입→호흡→결과 저장→테스트 결제→보관함→내 정보→관리자 흐름 확인. 화면: `docs/screens/`, `android/store/`.
- 안드로이드: `bundleRelease` 성공, jarsigner 서명 확인, 병합 매니페스트 확인.
- **안 된 것**: 실기기·에뮬레이터 설치 테스트, bundletool 검증, 실제 음성/음악 청취 확인(헤드리스 환경), 실서버 배포.

## 3. 운영자 결정 대기 (코드로 해결 불가)
1. **배포 도메인**: 앱은 `soomgyeol.onrender.com` 을 가정. 다르면 `android/twa.properties` 의 `host` 변경 후 재빌드.
2. **결제사**: 웹은 토스페이먼츠 등 PG 계약. 앱 안 판매는 구글 플레이 결제 필요.
3. **가격 확정**: 월 4,900원 / 연 39,000원은 가안 (`config.prices.draft = true`).
4. **사업자 정보·약관**: `server/config.js` 의 `operator` 모든 `[운영자 확인 필요]`, 환불 기준, 위탁 업체, 보관 기간.
5. **메일 발송 서비스**: 비밀번호 재설정·문의 답변 메일이 현재 관리자 "메일함"(outbox 테이블)에만 쌓임.
6. **업로드 키**: `upload.jks` 와 비밀번호는 저장소 밖에서 운영자가 보관(이전 세션에서 전달됨). 없으면 새로 만들고 플레이 콘솔에서 업로드 키 재설정.

## 4. 다음 작업 (우선순위)

### P0 출시 차단
- [ ] **배포**: Render 등 Node 호스팅. 환경 변수 `PUBLIC_URL`, `COOKIE_SECURE=1`, 긴 `WEBHOOK_SECRET`, `ADMIN_EMAIL`, `DB_PATH`(영구 디스크), `ANDROID_CERT_SHA256`. 실행: `node --disable-warning=ExperimentalWarning server/index.js`. 헬스체크는 `/` 로 가능(전용 `/healthz` 추가 권장).
- [ ] **DB 백업**: SQLite 파일 정기 백업(예: `VACUUM INTO` 크론) 또는 Postgres 이전.
- [ ] **메일 발송 어댑터**: `outbox` 에 쌓는 곳(api.js 의 forgot, admin inquiries)을 실제 발송으로 교체. outbox 는 발송 기록으로 유지.
- [ ] **실결제 어댑터**: `billing.js` 에 `createCheckout` live 분기(PG 결제창), 승인 API 호출, 빌링키 자동결제(갱신 크론), PG 웹훅 → 현재 `processEvent` 이벤트 형식으로 변환. `BILLING_MODE=live` 에서 테스트 경로(`/api/billing/test/complete`, 관리자 시뮬레이션) 비활성 확인.

### P1 플레이 출시
- [ ] 비공개 테스트 트랙 업로드 → 플레이 앱 서명 키 SHA-256 을 `ANDROID_CERT_SHA256` 에 추가 → 실기기에서 주소창 없이 열리는지 확인.
- [ ] 개인 개발자 계정이면 테스터 12명 × 14일 비공개 테스트 후 프로덕션 신청.
- [ ] 앱 안 프리미엄 판매가 필요하면 Play Billing(Digital Goods API + Payment Request) 연동, 서버에서 Google Play Developer API 로 구매 검증 → 기존 `subscriptions` 에 `provider='google_play'` 로 기록.

### P2 개선
- [ ] 카카오 간편 로그인
- [ ] 주간 리포트(언제 어떤 호흡을 했고 기분이 얼마나 바뀌었는지)
- [ ] 녹음 음성 파일로 음성 안내 교체 옵션(현재 기기 TTS)
- [ ] `/api/me` 비로그인 시 401 대신 `{ user: null }` 반환(콘솔 오류 정리)
- [ ] `breath/index.html` 프로토타입과 `public/app/breath.js` 엔진 중복 정리(프로토타입은 보관용으로 둘지 결정)

## 5. 알아둘 점
- 호흡 엔진(`public/app/breath.js`)은 프로토타입 스크립트를 옮긴 뒤 셸 연동 훅을 넣은 것입니다. 음악은 Web Audio 로 실시간 생성(화음 진행 + 부드러운 글라스 패드 멜로디, 사용자 피드백으로 아타크를 0.45초로 완화). 음성은 `speechSynthesis` ko-KR.
- 휴대폰은 사용자가 탭한 순간에 첫 음성을 내야 이후 음성이 허용되므로, `start()` 에서 서버 확인(`await`) **전에** `speak()` 를 먼저 호출합니다. 순서를 바꾸지 마세요.
- 30초 미만 중단은 이용 횟수 복원(`config.usage.restoreIfUnderSec`). 준비 단계 4초는 실제 시간에서 뺍니다.
- 무료 기록 7일 제한은 **보기 제한**이며 데이터는 지우지 않습니다.
- `node:sqlite` 는 Node 22 에서 실험 기능이라 경고가 나옵니다. `npm` 스크립트는 `--disable-warning=ExperimentalWarning` 으로 숨깁니다.
- 구글 플레이 TWA 는 크롬 저장소를 브라우저와 공유하므로 앱 모드 표시는 `sessionStorage` 에만 저장합니다.

## 6. 작업 이력 (커밋 순)
1. 호흡 미니앱 프로토타입 → 환영·질문 흐름과 화음 음악 → 음색 완화 → 좁은 화면 칩 찌그러짐 수정
2. 유료 웹앱 MVP (서버·사이트·웹앱·관리자·테스트)
3. 구글 플레이 TWA, `.aab`, 스토어 자료, 계정 삭제 페이지, assetlinks
4. 인수인계 문서(AGENTS.md, README, 이 문서)
