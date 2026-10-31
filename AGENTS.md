# AGENTS.md — Codex / AI 에이전트 작업 지침

이 저장소는 **브릿지노드(앱개발사) 총괄 관리 대시보드**입니다. 1인 사업자가 미니앱·웹앱·토스 인앱 프로젝트,
출시/검수 이력, 도메인·서버 갱신, 운영 계정을 한 곳에서 관리하는 도구입니다.
작업 전 반드시 [`docs/HANDOFF.md`](docs/HANDOFF.md)를 먼저 읽으세요 (현재 상태·데이터 모델·작업 백로그).

## 구조
```
dashboard/index.html   # 앱 전체 (HTML+CSS+바닐라 JS, 외부 의존성 없음, 빌드 없음)
dashboard/README.md    # 사용자용 설명서
docs/HANDOFF.md        # 개발 인수인계 문서 (데이터 모델, 함수 지도, 백로그)
docs/examples/         # 가져오기(import)용 예시 JSON
tests/smoke.js         # Playwright 스모크 테스트
```

## 실행 / 테스트
```bash
npm install            # playwright 설치 (최초 1회)
npx playwright install chromium   # 브라우저가 없을 때만
npm test               # tests/smoke.js 실행 → "ALL PASS" 가 나와야 함
```
수동 확인: `dashboard/index.html`을 브라우저로 직접 열기 (file:// 로 동작해야 함).

## 반드시 지킬 규칙
1. **단일 파일·무빌드 유지.** 프레임워크/번들러/npm 런타임 의존성 추가 금지. (테스트용 devDependency만 허용)
2. **file:// 로 열어도 동작**해야 함. fetch로 로컬 파일 읽기, ES module import 금지.
3. **localStorage 키 `bridgenode-dashboard-v1` 의 데이터 형식 하위호환 유지.** 필드 추가는 가능, 기존 필드 삭제/이름변경 시 `normalize()`에 마이그레이션 추가.
4. **보안:** 계정 보관함 평문(아이디/비밀번호)을 localStorage·백업·콘솔·네트워크로 내보내지 말 것. 암호화는 `sealVault()` 경유만. 실제 비밀번호·토큰·백업 JSON을 커밋 금지.
5. 사용자 입력을 HTML에 넣을 때는 항상 `h()`로 이스케이프. URL은 `safeLink()` 사용.
6. UI 문구는 **한국어**. 라이트/다크 모드 모두 CSS 변수(`:root` 토큰)로 색 지정, 하드코딩 색 금지.
7. 390px 모바일 폭에서 가로 스크롤이 생기면 안 됨 (스모크 테스트가 검사).
8. 변경 후 `npm test` 통과 확인, `dashboard/README.md`·`docs/HANDOFF.md`의 관련 내용 갱신.

## 커밋
- 메시지는 한국어, 한 줄 요약 + 필요시 본문. 기능 단위로 작게.
