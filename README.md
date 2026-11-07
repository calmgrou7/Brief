# 상권첫걸음 (가칭)

부산 카페 예비창업자가 후보 입지 두 곳을 같은 기준으로 비교하고 답사 체크리스트를 만드는 **앱인토스 웹 미니앱**.
기획서: [docs/mvp-spec.md](docs/mvp-spec.md)

## 구성

| 경로 | 내용 |
|---|---|
| `src/` | 미니앱 화면 (Vite + React). S1 검색 → S2 위치 확인 → S3 결과 → S4 비교 → S5 답사 보관함 |
| `src/platform/host.ts` | 토스 앱 ↔ 일반 웹 어댑터 (저장소·분석 이벤트) |
| `server/` | API 서버 (카카오 주소 검색, 상가정보 반경 집계, 정적 파일 제공) |
| `contracts/analysis.ts` | 화면·서버가 공유하는 응답 계약 |
| `src/metrics.ts`, `src/ai-guard.ts` | 지표 계산, AI 출력 검증·규칙형 요약 |
| `apps-in-toss.config.ts` | 앱인토스 설정 (appName, 권한, 내비게이션 바) |
| `fixtures/` | 가상 데이터 (`VITE_DATA_MODE=fixture`) |

## 실행

Node 22.18 이상(권장 24). 처음 한 번 `.env.example` → `.env` 복사 후 키 입력.

```bash
npm ci
npm run dev:api      # 터미널 1: API 서버 (127.0.0.1:8787)
npm run dev          # 터미널 2: 화면 (localhost:5173, /api는 서버로 전달)
```

서버 없이 화면만 볼 때: `VITE_DATA_MODE=fixture npm run dev`

| 명령 | 용도 |
|---|---|
| `npm test` | 계약·지표·AI 검증·서버(가짜 외부 응답) 테스트 |
| `npm run check:live` | `.env` 키로 부산 주소 2곳 실조회, 500m 집계 출력 (키 비출력) |
| `npm run build:web` | 웹 빌드만 (`dist/`) |
| `npm start` | 같은 출처 서비스 (API + `dist/`) |
| `npm run build` | 웹 빌드 + **앱인토스 번들 `sangkwon-first-step.ait` 생성** |
| `npm run deploy` | `.ait` 업로드 (`ait token add`로 콘솔 API 키 등록 필요) |

## 앱인토스 등록 순서

1. 콘솔에서 앱 등록 → 등록한 앱 이름을 `apps-in-toss.config.ts`의 `appName`과 일치시킨다.
2. API 서버를 HTTPS로 배포하고 `ALLOWED_ORIGINS`에 실제 origin만 넣는다.
3. `VITE_API_BASE_URL=https://<서버주소> npm run build` → `.ait` 생성.
4. `npm run deploy` → 출력된 테스트 스킴/QR로 토스 앱 실기기 확인 (뒤로가기·저장소·safe area).
5. 검수 제출.

자세한 데이터 연결 조건: [docs/API_SETUP.md](docs/API_SETUP.md)

## 현재 상태

- 실제 키로 외부 API를 호출해 본 적 없음. 응답 형식은 공개 명세 기준 추정이며 다르면 실패로 처리하고 수치를 만들지 않는다. 첫 `npm run check:live`로 확인.
- 행정동 인구(SGIS)는 미연결 → 화면에 "자료 없음".
- 지도는 미표시 (목록으로 위치 확인).
- AI 요약 대신 규칙형 요약 사용 (LLM 미연결).
