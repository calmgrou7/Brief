# BridgeNode Dashboard

**브릿지노드 앱개발 총괄 관리 대시보드** — 미니앱 · 웹앱 · 토스 인앱 프로젝트를 기획부터 출시·운영까지 한 화면에서 관리합니다.

React + TypeScript 화면과 Node HTTP + SQLite 서버로 구성된 1인 운영용 관리자 웹앱입니다. 현재 상태는 **실행 가능한 로컬 개발판**이며, Render 배포 설정(`render.yaml`)을 갖췄습니다. 공개 배포는 아직 하지 않았습니다.

## 실행

Node.js 24 이상이 필요합니다. 프로젝트 폴더에서 실행합니다.

```powershell
npm ci
npm run dev
```

- 웹앱: http://127.0.0.1:5173
- 로컬 API: http://127.0.0.1:8787
- `npm run dev`는 `ADMIN_PASSWORD`가 없으면 로컬 전용 비밀번호 `bridgenode-local`을 사용합니다.
- 데이터는 `.data/bridgenode.sqlite`에 저장됩니다. 처음 실행 시 예시 데이터가 들어갑니다.

빌드한 앱 확인:

```powershell
npm run build
$env:ADMIN_PASSWORD="12자-이상-비밀번호"; npm start
```

## 구현한 기능

- **개요**: 전체 진행률, 미니앱/웹앱/토스 인앱 트랙별 진행률·상태 수, KPI(검수 중, 갱신 임박 도메인, 서버 월 고정비).
- **다음 절차 자동 집계**: 프로젝트 다음 할 일, 검수 확인·반려 대응·승인 후 출시, 도메인 60일·SSL 30일·서버 30일 갱신.
- **프로젝트**: 트랙별 단계 템플릿, 단계 클릭으로 진행률·상태 자동 계산(기획중/진행중/검수중/반려 대응/출시·운영중/보류).
- **출시·업데이트**: 버전별 기록, 검수 상태(준비중→검수요청→검수중→반려/승인→출시완료), 배포 서버, n차 업데이트 자동 계산.
- **도메인·서버**: 만료 D-day, SSL, 자동갱신 여부, 서버 비용·결제일.
- **계정 보관함**: 브라우저에서 AES-GCM 암호화(PBKDF2-SHA256 310,000회). 서버에는 암호문만 저장. 10분 미사용 자동 잠금.
- **백업·가져오기**: JSON 백업/전체 복원, 배포 자동화용 출시 이력 병합, 최근 활동 기록(감사 로그).
- **보안**: 관리자 비밀번호 로그인, HttpOnly·SameSite=Strict 세션 쿠키, 로그인 5회 실패 시 10분 잠금, 변경 요청 CSRF 헤더 검사, 입력 화이트리스트 정규화, CSP·noindex.

## 샘플과 실제 연결

| 영역 | 현재 상태 |
|---|---|
| 프로젝트·도메인·서버 데이터 | 첫 실행 시 예시 데이터. [백업·설정 → 예시 데이터 비우고 시작]으로 교체 |
| 토스 콘솔(앱인토스) 상태 | 공개 API 미확인 → 수동 입력 + JSON 병합 가져오기 |
| 저장소 | 로컬 Node HTTP + SQLite. Render 디스크로 운영 가능 |
| 알림(메일·캘린더) | 미구현 → [다음 작업](docs/NEXT_STEPS.md) |
| 공개 배포 | 미수행. `render.yaml` 준비 완료 |

비밀번호·토큰을 프런트엔드 코드, 저장소, 채팅에 넣지 마세요. 운영 설정은 [운영 문서](docs/OPERATIONS.md)를 참고하세요.

## 검증

```powershell
npm test          # 모델·서버·보안 단위 테스트
npm run build     # 타입 검사 + 빌드
npm run ui:check  # (빌드 후, Playwright 필요) 브라우저 흐름 검사 → test-output/
```

`PLAYWRIGHT_MODULE`에 기존 Playwright 패키지 경로, `PLAYWRIGHT_CHANNEL`에 브라우저 채널을 지정할 수 있습니다.

## 구조

```text
src/                 React 화면 (views/ 탭별 화면, vault.ts 보관함 암호화)
shared/model.ts      타입·상수·진행률/상태/다음 절차 계산·입력 정규화·예시 데이터
server/              API·SQLite 저장소·로그인 세션
scripts/             개발 실행·DB 백업·브라우저 검사
tests/               모델·HTTP·보안 검증
docs/                기획·운영·완료 보고·다음 작업·인수인계
```

AI 에이전트(Codex 등)는 [`AGENTS.md`](AGENTS.md)와 [`docs/HANDOFF.md`](docs/HANDOFF.md)를 먼저 읽습니다.
