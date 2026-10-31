# AGENTS.md — Codex / AI 에이전트 작업 지침

이 저장소는 **브릿지노드(앱개발사) 총괄 관리 대시보드**입니다. 1인 사업자가 미니앱·웹앱·토스 인앱 프로젝트,
출시/검수 이력, 도메인·서버 갱신, 운영 계정을 한 곳에서 관리하는 관리자 웹앱입니다.
작업 전 반드시 [`docs/HANDOFF.md`](docs/HANDOFF.md)와 [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md)를 읽으세요.

## 스택 (브릿지노드 공통 구조 — nowro-korea와 동일)
- 화면: React 19 + TypeScript + Vite 8 (`src/`)
- 서버: Node 24 내장 `http` + `node:sqlite` (`server/*.mjs`), 프레임워크 없음
- 공용 로직: `shared/model.ts` (서버·화면·테스트가 함께 import, Node 타입 스트리핑으로 직접 실행)
- 테스트: `node --test tests/*.test.mjs`, 브라우저 검사 `scripts/ui-check.mjs`(Playwright)
- 배포: Render (`render.yaml`, 영구 디스크에 SQLite)
- 의존성은 **고정 버전** + `package-lock.json`

## 실행 / 검증
```bash
npm ci
npm run dev        # 웹 5173 + API 8787, 로컬 비밀번호 bridgenode-local
npm test           # 반드시 통과
npm run build      # 타입 검사 + 빌드, 반드시 통과
npm run ui:check   # 빌드 후 (Playwright 있는 환경에서)
```

## 반드시 지킬 규칙
1. **보안 최우선.** 계정 보관함 평문(아이디/비밀번호)은 브라우저 메모리에서만 존재. 서버 전송·저장·로그 금지. 서버는 `validVault()` 형식의 암호문만 받는다.
2. 모든 `/api/*`(health·session·login 제외)는 로그인 세션 필수. 변경 요청은 `X-BN-Request: 1` 헤더 필수. 새 API도 동일하게.
3. 서버 저장 전 입력은 `shared/model.ts`의 `sanitize()` 화이트리스트를 거친다. 새 필드는 여기에 추가.
4. 데이터 하위호환: 기존 필드 삭제·이름변경 금지. 변경 시 `sanitize()`에서 옛 형식 변환. 기존 백업 JSON 가져오기가 계속 동작해야 함.
5. 비밀값(`ADMIN_PASSWORD`, 토큰)은 환경변수로만. `.env`, `.data/`, 백업 JSON 커밋 금지. `VITE_` 변수에 비밀값 금지.
6. UI 문구는 **한국어**. 색은 `src/styles.css`의 `:root` CSS 변수만 사용(라이트/다크 모두).
7. 390px 모바일에서 페이지 가로 스크롤 금지(`ui:check`가 검사).
8. 순수 계산 로직은 `shared/model.ts`에 두고 `tests/model.test.mjs`에 테스트 추가. API는 `tests/server.test.mjs`에 추가.
9. 기능 변경 시 `README.md`, `CHANGELOG.md`, `docs/IMPLEMENTATION_REPORT.md`, `docs/NEXT_STEPS.md` 갱신.

## 커밋
- 메시지는 한국어, 한 줄 요약 + 필요시 본문. 기능 단위로 작게.
