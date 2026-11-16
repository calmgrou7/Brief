# AGENTS.md — 숨결(Soomgyeol) 작업 안내

이 저장소에서 일하는 코딩 에이전트(Codex 등)를 위한 안내입니다. 사람용 설명은 `README.md`, 진행 상황과 남은 일은 `soomgyeol/docs/HANDOFF.md` 를 보세요.

## 프로젝트 한 줄
요가 호흡을 입자 그림·음성·음악으로 안내하는 유료(무료+프리미엄) 웹앱과, 그것을 감싼 구글 플레이 안드로이드 앱(TWA).

## 폴더
| 경로 | 내용 |
|---|---|
| `soomgyeol/` | **본 프로젝트.** Node 서버 + 소개 사이트 + 웹앱 + 관리자 + 안드로이드 래퍼 |
| `soomgyeol/server/` | 서버 (외부 패키지 0개, Node 내장 `node:sqlite`) |
| `soomgyeol/public/app/` | 웹앱. `breath.js`=호흡 엔진(캔버스·음성·음악), `app.js`=로그인·보관함·결제 셸 |
| `soomgyeol/public/admin/` | 관리자 화면 |
| `soomgyeol/android/` | TWA 안드로이드 프로젝트 (Gradle, AGP 8.12, targetSdk 36) |
| `soomgyeol/test/` | `node:test` 서버 테스트 |
| `breath/index.html` | **초기 단일 파일 프로토타입**(클로드 아티팩트로 공개된 버전). 본 앱 코드가 아님. 엔진을 고칠 때는 `soomgyeol/public/app/breath.js` 를 고치세요. 두 파일은 이미 갈라졌습니다. |

## 명령
```bash
cd soomgyeol
npm test                       # 서버 테스트 (모두 통과해야 함)
ADMIN_EMAIL=me@x.com npm start # http://localhost:3000  /app  /admin
npm run seed-demo              # 데모 회원(@demo.soomgyeol)
cd android && ./gradlew bundleRelease   # .aab (keystore.properties 필요, 아래 참고)
```
요구 사항: Node ≥ 22.13 (`node:sqlite`), 안드로이드 빌드는 JDK 17+ 와 Android SDK platform 36.

## 꼭 지킬 규칙
1. **외부 npm 패키지를 추가하지 않습니다.** 서버는 의도적으로 의존성 0개입니다. 필요하면 먼저 사람에게 묻습니다.
2. **비밀값을 커밋하지 않습니다.** `android/keystore/upload.jks`, `android/keystore.properties`, `.env`, `data/*.db` 는 `.gitignore` 대상이고 저장소에 없습니다. 업로드 키는 운영자가 따로 보관합니다.
3. **권한은 서버에서 판단합니다.** 이용권은 `billing.entitlement()` 로만 계산하고, 결제 완료 화면이나 클라이언트 값을 믿지 않습니다. 이용량 차감은 `usage.startSession()` 의 원자적 `UPDATE … WHERE used < limit` 를 유지합니다.
4. **결제 웹훅 처리 규칙 유지**: 서명 검증 → 이벤트 ID 중복 무시 → `occurredAt` 이 `last_event_at` 보다 이르면 무시 → 금액 대조. 관련 테스트를 깨지 마세요.
5. 모든 기록 조회·수정·삭제 SQL 에 `user_id = ?` 조건을 붙입니다. 관리자 API 는 `{ auth: "admin" }` 옵션으로만 엽니다. 관리자 화면·오류 로그에 사용자 메모를 노출하지 않습니다.
6. 상태를 바꾸는 API 요청은 `X-Requested-With: fetch` 헤더가 필요합니다(CSRF). 프런트에서 `fetch` 할 때 항상 붙입니다.
7. CSP 가 `script-src 'self'` 입니다. **인라인 `<script>` 와 `onclick=` 을 쓰지 마세요.** 스크립트는 파일로 둡니다.
8. 화면 문구는 **한국어, 쉬운 말**로 씁니다. 운영자가 정해야 하는 값은 `[운영자 확인 필요: …]` 형식으로 남깁니다. 가격·후기·이용자 수를 지어내지 않습니다.
9. 앱별 값(이름·요금제·가격·운영자 정보·안드로이드 패키지)은 `server/config.js` 한곳에서 관리합니다.
10. 코드를 바꾸면 `npm test` 를 돌리고, 새 서버 동작에는 `test/api.test.js` 에 테스트를 추가합니다.

## 구조 요점
- `server/index.js` 요청 흐름: `/api/*` → `http.js` 라우터(`api.js` 에 등록) → 그 외 소개 페이지(`site.js` 서버 렌더링) → `/app` `/admin` → `public/` 정적 파일.
- 핸들러는 `({ db, user, body, params, query, res, raw, ip })` 를 받고 객체를 반환하면 JSON 응답. 오류는 `throw new HttpError(status, code, 한국어메시지, extra)`.
- DB 는 `db.js` 의 `SCHEMA` 에서 `CREATE TABLE IF NOT EXISTS` 로 만듭니다. **마이그레이션 도구가 없으니** 컬럼을 추가할 땐 `ALTER TABLE` 을 안전하게(있는지 확인 후) 실행하는 코드를 `open()` 에 넣으세요.
- 호흡 엔진 ↔ 셸 계약: 엔진은 `window.SG`(`isLocked`, `maxMinutes`, `beforeStart`, `onFinish`)를 호출하고, 셸은 `window.SGBreath`(`refresh`, `select`, `setMinutes`, `start`, `pause`, `ask`, …)를 호출합니다. `app.js` 가 `breath.js` 보다 먼저 로드됩니다.
- 플레이 앱 모드: URL `?src=android` 로 열리면 `app.js` 의 `IN_PLAY_APP` 이 참이 되어 구매 화면·가격을 숨깁니다(플레이 결제 정책). 이 동작을 유지하세요.
- 테스트 결제: `BILLING_MODE=test` 에서 `billing.testProviderEmit()` 이 실제 웹훅과 같은 경로로 서명된 이벤트를 보냅니다. 실결제 어댑터는 아직 없습니다.

## 안드로이드
- 설정은 `android/twa.properties` (패키지명 `app.soomgyeol.breath` — 플레이에 올린 뒤 변경 불가, `host`, `versionCode`).
- 업로드할 때마다 `versionCode` +1.
- 서버 환경 변수 `ANDROID_CERT_SHA256` 에 업로드 키 + 플레이 앱 서명 키 지문을 넣으면 `/.well-known/assetlinks.json` 이 생성됩니다.
- 등록 절차·스토어 문구·데이터 보안 답변: `android/PLAY_STORE.md`.
