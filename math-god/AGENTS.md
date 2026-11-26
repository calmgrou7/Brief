# AGENTS.md — 수학의 신 (Math God)

이 파일은 코딩 에이전트(Codex 등)가 가장 먼저 읽는 작업 지침이다.
제품·기능 결정은 `docs/` 문서가 기준이며, 문서와 코드가 충돌하면 문서를 따른다.
문서에 없는 결정이 필요하면 가장 단순한 선택을 하고 `docs/DECISIONS.md`에 한 줄로 기록한다.

## 프로젝트 한 줄 요약
직장인·성인을 위한 "생각하는 수학" 두뇌 게임 웹앱(PWA).
계산 속도가 아니라 논리·패턴·공간·확률·어림 추정 문제로 경쟁한다.
회원은 문제를 풀어 XP를 쌓아 레벨(칭호)을 올리고, 두뇌지수(레이팅)와 랭킹이 실시간으로 갱신된다.
수익은 광고. 운영자는 1인이므로 **문제 생성·검증·시즌 정산은 전부 자동**이어야 한다.

## 문서 읽는 순서
1. `docs/01-PRD.md` — 제품 정의, 타깃, 화면, 기능 범위(MVP / 이후)
2. `docs/02-game-system.md` — XP, 레벨표, 두뇌지수(Elo), 오늘의 문제, 랭킹, 연속일
3. `docs/03-problem-engine.md` — 문제 템플릿 구조, AI 생성 + 자동 검증 파이프라인
4. `docs/04-problem-templates.md` — MVP 템플릿 20종 명세(정답 공식 포함)
5. `docs/05-tech-spec.md` — 스택, DB 스키마(SQL), RLS, API, 실시간, 광고, 보안
6. `docs/06-roadmap-tasks.md` — 마일스톤별 작업 목록과 완료 기준(이 순서대로 구현)

## 기술 스택 (변경 금지, 바꿔야 하면 DECISIONS.md에 사유 기록)
- Next.js (App Router) + TypeScript(strict) + Tailwind CSS, PWA
- Supabase: Auth(카카오/구글/익명), Postgres, Realtime, Edge Functions, pg_cron
- 테스트: Vitest(단위), Playwright(E2E)
- 패키지 매니저: pnpm
- AI 생성: Claude API (모델은 환경변수 `AI_MODEL`, 서버/배치에서만 호출)

## 절대 규칙
1. **정답은 절대 클라이언트로 보내지 않는다.** 정답 판정·XP·레이팅 계산은 서버에서만 한다.
2. 문제 풀이 시간은 **서버 타임스탬프**로 잰다(클라이언트 시간 불신).
3. 게임 규칙(XP, 레벨, Elo, 채점)은 `src/lib/game/`의 **순수 함수**로 작성하고 단위 테스트를 반드시 붙인다.
4. 문제 템플릿은 `src/lib/problems/templates/`에 하나당 파일 하나. 각 템플릿에는 `generate()`와 독립적인 `verify()`가 있어야 하며, 시드 1,000개로 돌리는 속성 테스트(property test)를 통과해야 한다.
5. AI가 만든 문제는 자동 검증(03 문서의 3중 검증)을 통과하기 전에는 절대 사용자에게 노출하지 않는다.
6. 광고는 **문제를 푸는 화면에는 절대 넣지 않는다.** 결과 화면, 목록 화면에만 넣는다.
7. UI 문구는 한국어. 코드, 주석, 커밋 메시지는 영어로 써도 된다.
8. 비밀값(Supabase service role, AI API key)은 서버 환경변수로만 사용하고 커밋하지 않는다. `.env.example`만 커밋한다.

## 작업 방식
- `docs/06-roadmap-tasks.md`의 마일스톤 순서대로 진행한다. 각 작업의 "완료 기준"을 만족해야 다음으로 넘어간다.
- 작업마다 `pnpm lint && pnpm typecheck && pnpm test`가 통과해야 한다.
- DB 변경은 `supabase/migrations/`에 SQL 마이그레이션 파일로만 한다.
- 작은 단위로 커밋한다(작업 1개 = 커밋 1개 이상).

## 디렉터리 구조 (목표)
```
src/
  app/                 # Next.js 라우트 (화면은 01-PRD 참고)
  components/          # UI 컴포넌트
  lib/
    game/              # xp.ts, level.ts, rating.ts, scoring.ts, streak.ts (+ *.test.ts)
    problems/
      templates/       # 템플릿 1개 = 파일 1개 (04 문서)
      registry.ts      # 템플릿 등록
      rng.ts           # 시드 고정 난수(mulberry32)
      answer.ts        # 정답 정규화/판정
    supabase/          # client.ts(브라우저), server.ts(서버), admin.ts(service role)
    ads/               # 광고 슬롯 컴포넌트, 빈도 제한
supabase/
  migrations/          # SQL
  functions/           # Edge Functions (generate-problems, season-rollover 등)
scripts/               # 로컬 배치(문제 생성, 시드 데이터)
docs/
```
