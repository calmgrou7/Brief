# 지시서: 수학의 신 앱인토스 미니앱 업그레이드

> 대상: 이 작업을 맡을 개발자 또는 AI 에이전트
> 작성일: 2026-11-08 · 기준 브랜치: `claude/adoring-curie-iyjlxe`
> 목표: 앱인토스에 이미 등록된 **수학의 신 미니앱**을, 이 저장소의 최신 웹앱(Supabase 서버 모드)으로 교체한다. 새 앱 등록이 아니라 **같은 앱의 버전 업데이트**로 진행한다.

---

## 0. 먼저 읽을 것

| 문서 | 내용 |
|---|---|
| `README.md` | 앱 구조, 실행 방법 |
| `docs/SUPABASE_SETUP.md` | 서버 연결 현황(프로젝트 `bridgenode`, ref `bzebdwvpmsaejkmnsoef`), 보안 구조 |
| `supabase/migrations/*.sql` | DB 스키마와 서버 함수 (점수·정답은 서버에서만 처리) |
| 앱인토스 개발자 문서 (developers-apps-in-toss.toss.im) | SDK·로그인·검수 기준. **아래 SDK 이름과 API 경로는 작업 시점에 공식 문서로 다시 확인할 것** |

참고할 사내 선례(같은 저장소의 다른 브랜치):
- `claude/new-session-u8lb3x` — `apps-in-toss.config.ts`, `src/platform/host.ts`(토스 WebView ↔ 일반 웹 어댑터), `ait build`/`ait deploy` 스크립트
- `claude/focused-hypatia-9nj7dm` — 원본 소스 없이 기존 `.ait` 빌드본을 다시 패키징한 사례, Supabase Edge Function 연동

---

## 1. 지켜야 할 원칙

1. **appName 유지**: 기존 미니앱의 `appName`(콘솔에 등록된 kebab-case 이름)을 그대로 쓴다. 바꾸면 새 앱이 된다.
2. **코드베이스는 하나**: 일반 웹(Vercel 등)과 토스 미니앱을 같은 소스에서 빌드한다. 화면 코드는 SDK를 직접 부르지 않고 `src/platform/host.ts` 어댑터만 쓴다.
3. **서버 보안 구조는 건드리지 않는다**: 정답·XP·레이팅·대결 점수는 지금처럼 Supabase 함수(`submit_answer`, `duel_answer` 등)만 바꾼다. 클라이언트에 `service_role` 키를 넣지 않는다.
4. **기존 사용자 데이터 보존**: 기존 미니앱에 사용자 기록이 있다면 버리지 않고 옮기는 방안을 먼저 확인한다(3단계).
5. **검수 대상 변경은 목록으로 남긴다**: 권한·앱 이름·로그인 방식처럼 토스 검수에 걸릴 수 있는 변경은 PR 설명에 따로 적는다.

---

## 2. 단계별 작업

### 1단계 — 기존 미니앱 파악 (작업 전 필수)

기존 수학의 신 미니앱의 소스는 이 저장소에 없다. 아래를 먼저 확보하고 결과를 `docs/APPS_IN_TOSS_INVENTORY.md`에 정리한다.

- [ ] 소스 위치: 다른 저장소·브랜치인지, `.ait` 빌드본만 있는지
  - 빌드본만 있으면 `.ait` 안의 `bundle.json`에서 설정을 읽는다(`focused-hypatia` 브랜치 방식 참고)
- [ ] `appName`, 브랜드 색, 아이콘, 권한(`permissions`), `navigationBar`·`webView` 설정
- [ ] 사용 중인 SDK 버전(`@apps-in-toss/web-framework`)
- [ ] 로그인 방식: 토스 로그인 사용 여부, 사용자 식별값(userKey 등)과 저장 위치
- [ ] 저장 데이터: 기기 저장소(Storage)뿐인지, 별도 서버가 있는지 → 옮길 데이터 목록
- [ ] 콘솔 설정: 앱 카테고리(게임/비게임), mTLS 인증서 발급 여부, 연결 끊기 콜백 URL
- [ ] 현재 버전에만 있고 새 웹앱에 없는 기능 → 유지할지 결정 필요 항목으로 표시

**완료 기준**: 인벤토리 문서가 있고, "새 웹앱에 없는 기능" 목록을 대표님이 확인했다.

### 2단계 — 미니앱 빌드 환경 추가

- [ ] 의존성 추가 (버전은 기존 미니앱 또는 선례 브랜치와 맞춘다. 선례 기준 `3.9.0`)
  - `@apps-in-toss/web-framework`, 개발용 `@apps-in-toss/devtools`
- [ ] 루트에 `apps-in-toss.config.ts` 작성 — 1단계에서 확인한 값을 그대로 옮긴다
  ```ts
  import { defineConfig } from "@apps-in-toss/web-framework/config";
  export default defineConfig({
    appName: "<기존 appName>",          // 절대 변경 금지
    brand: { primaryColor: "<기존 색>" },
    permissions: [],                     // 수학의 신은 권한 불필요. 기존에 있던 권한만 유지
    navigationBar: { withBackButton: true, withHomeButton: true },
    webBundleDir: "dist",
  });
  ```
- [ ] `package.json` 스크립트 추가: `build:toss`(`tsc -b && vite build --mode toss && ait build`), `deploy:toss`(`ait deploy`)
- [ ] `.env.toss` 예시 파일: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TARGET=toss` (실제 값은 커밋하지 않음)
- [ ] 라우터는 지금처럼 `HashRouter` 유지(WebView에서 새로고침·뒤로가기 안전)

**완료 기준**: `npm run build`(웹)와 `npm run build:toss`(미니앱)가 둘 다 성공하고 `.ait` 파일이 생성된다.

### 3단계 — 토스 로그인 ↔ Supabase 계정 연결 (핵심)

토스 안에서는 이메일 가입 화면 대신 **토스 로그인**을 쓴다. 웹 버전은 지금의 이메일 가입을 그대로 둔다.

흐름:
```
[미니앱] appLogin() → authorizationCode, referrer
   ↓ POST
[Supabase Edge Function: toss-auth]
   1. 토스 파트너 API로 code → accessToken 교환 (mTLS 인증서 필요)
   2. 토큰으로 사용자 정보 조회 → userKey
   3. toss_accounts 표에서 userKey로 Supabase 사용자 찾기, 없으면 생성
      (auth.admin.createUser: 가짜 이메일 toss_<userKey>@users.invalid, email_confirm=true,
       user_metadata.username = 기본 닉네임)
   4. auth.admin.generateLink({ type: 'magiclink' }) → hashed_token 반환
   ↓
[미니앱] supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }) → 세션 확보
```

작업 목록:
- [ ] 마이그레이션 `0004_toss_accounts.sql`
  - `toss_accounts(user_key text primary key, user_id uuid unique references auth.users on delete cascade, created_at)`
  - RLS 켜고 정책 없음(클라이언트 접근 불가), Edge Function(service role)만 사용
- [ ] Edge Function `supabase/functions/toss-auth/`
  - mTLS 인증서·키는 **Edge Function 시크릿**으로 등록(대표님이 대시보드에서 직접 입력). 저장소·채팅에 넣지 않는다
  - Deno는 `Deno.createHttpClient({ cert, key })`로 mTLS 요청
  - 토스 API 엔드포인트·응답 필드는 공식 문서로 확인 후 구현하고, 확인한 문서 링크를 코드 주석에 남긴다
  - 실패 응답은 원인 구분(코드 만료 / 토스 API 오류 / 서버 오류)
- [ ] Edge Function `toss-unlink` — 토스 "연결 끊기" 콜백 수신 시 해당 사용자 삭제(또는 비식별화). 콘솔에 콜백 URL 등록
- [ ] `src/lib/api/supabase.ts`에 `signInWithToss()` 추가, `src/pages/Auth.tsx`는 `VITE_TARGET === 'toss'`일 때 이메일 폼 대신 "토스로 시작하기" 버튼 한 개만 표시
- [ ] 닉네임: 첫 로그인 후 프로필에서 바꿀 수 있게 `update_username(text)` 서버 함수 추가(2~24자, 중복 검사)
- [ ] 기존 미니앱 사용자 이전: 1단계에서 userKey 기반 기록이 확인되면, 같은 userKey로 첫 로그인할 때 기록을 옮기는 일회성 함수 작성. 이전할 데이터가 없으면 이 항목은 생략하고 인벤토리에 사유를 적는다

**완료 기준**: devtools 환경과 실제 토스 앱(테스트 배포) 모두에서 토스 로그인 → 풀이 → 대결이 되고, 같은 토스 계정으로 다시 들어오면 기록이 유지된다.

### 4단계 — 토스 환경 맞춤 (`src/platform/host.ts`)

- [ ] `isTossHost()` 어댑터 추가(선례 브랜치 코드 재사용)
- [ ] 저장소: 언어 설정 등 기기 설정은 토스 `Storage`, 실패 시 `localStorage`. 학습 기록은 서버에만 저장
- [ ] 외부 링크 차단: 토스 안에서는 외부 사이트로 나가는 링크를 숨긴다
- [ ] 뒤로가기: 대결 진행 중 뒤로가기 → "대결을 그만두면 남은 라운드는 0점" 확인창
- [ ] 화면: 안전 영역(노치·하단 바) 여백, 폰트 크기, 다크 모드 확인
- [ ] 분석 이벤트(선택): `Analytics`로 가입·첫 풀이·대결 시작/완료만 기록. 정답 입력값은 보내지 않음
- [ ] 카테고리별 디자인 기준 확인: 비게임으로 등록돼 있으면 TDS(토스 디자인 시스템) 적용 요구가 있는지 검수 가이드에서 확인하고, 필요하면 버튼·입력창·탭부터 교체

**완료 기준**: 토스 앱 안에서 모든 화면을 한 번씩 거쳐도 깨짐·외부 이탈·막힌 뒤로가기가 없다.

### 5단계 — 테스트

- [ ] 기존 테스트: `npm run typecheck`, `npm test`
- [ ] DB 시나리오: `supabase/tests/10_scenario.sql`에 토스 계정 생성·재로그인·연결 끊기 시나리오 추가 후 로컬 Postgres로 실행
- [ ] 보안 점검: 마이그레이션 적용 후 Supabase advisors(security) 확인. 새 경고가 의도된 것인지 문서에 기록
- [ ] 실제 기기: 앱인토스 테스트 배포로 iOS·Android 각 1대 이상
  - 첫 로그인 → 닉네임 변경 → 문제 3개(오답 포함) → 대결 1판 → 랭킹 확인 → 앱 종료 후 재진입
  - 네트워크 끊김 상태에서 제출 시 안내 문구
- [ ] 웹 버전 회귀: 이메일 가입·로그인이 그대로 동작하는지

**완료 기준**: 위 항목 결과를 PR 설명에 표로 남긴다(통과 / 실패 / 미실시+사유).

### 6단계 — 배포

1. 마이그레이션을 Supabase `bridgenode`에 적용(테스트 데이터는 출시 전 정리)
2. Edge Function 배포, 시크릿 등록 확인
3. `npm run build:toss` → `.ait` 생성
4. 앱인토스 콘솔에 업로드 → 테스트 배포로 최종 확인 → 검수 요청
5. 검수 통과 후 출시. 문제 생기면 콘솔에서 이전 버전으로 되돌린다

---

## 3. 대표님이 직접 해야 하는 일

| 시점 | 할 일 |
|---|---|
| 1단계 전 | 기존 미니앱 소스(저장소/브랜치) 또는 `.ait` 파일 전달 |
| 3단계 전 | 앱인토스 콘솔에서 **mTLS 인증서 발급**, 토스 로그인 사용 설정 |
| 3단계 중 | Supabase 대시보드에서 Edge Function 시크릿(인증서·키) 입력 |
| 3단계 중 | 콘솔에 연결 끊기 콜백 URL 등록 |
| 6단계 | 콘솔 업로드·검수 요청 버튼 (계정 권한 필요) |

---

## 4. 이번 범위에서 제외

- 인앱 결제·광고(수익화)는 다음 단계에서 별도 지시서로 진행
- 실시간 사람 대 사람 대결(현재는 서버가 만든 AI 상대)
- 문제은행 확장(40문제 → N문제)

---

## 5. 결과물 체크리스트

- [ ] `docs/APPS_IN_TOSS_INVENTORY.md` (기존 미니앱 파악 결과)
- [ ] `apps-in-toss.config.ts`, `src/platform/host.ts`, `.env.toss.example`
- [ ] `supabase/migrations/0004_toss_accounts.sql` (+ 필요 시 `0005_update_username.sql`)
- [ ] `supabase/functions/toss-auth/`, `supabase/functions/toss-unlink/`
- [ ] 토스 로그인 화면 분기 (`Auth.tsx`), `signInWithToss()`
- [ ] 테스트 결과표, 검수 영향 변경 목록이 담긴 PR
- [ ] `docs/SUPABASE_SETUP.md`에 토스 로그인 항목 추가
