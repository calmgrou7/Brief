# AGENTS.md

이 저장소는 견적서·영수증 생성 구독 앱 "1분 견적"이다. **작업 전에 반드시 `PLAN.md`를 읽고 그 명세를 따른다.**

## 규칙
- 스택은 Next.js(App Router) + TypeScript + Tailwind + Supabase + 토스페이먼츠다. 패키지 매니저는 pnpm을 쓴다.
- 금액 계산, 한글 금액, 사업자번호, 문서 번호 로직은 `lib/calc/`의 순수 함수에만 둔다. UI, PDF, 서버는 이 함수를 import해서 쓴다.
- 요금제 한도와 가격은 `lib/plan.ts`에만 둔다. 다른 곳에 하드코딩하지 않는다.
- 금액은 항상 원 단위 정수다. 세액은 문서 합계 기준으로 한 번만 계산한다(PLAN §7.1).
- 모든 Supabase 테이블에 RLS를 켜고, 마이그레이션은 `supabase/migrations/`에 SQL로 둔다.
- 비밀값(토스 시크릿 키, service role 키)은 서버 코드와 환경변수에서만 쓴다. 클라이언트 번들에 넣지 않는다.
- 커밋 전 `pnpm lint && pnpm test`가 통과해야 한다. PLAN §8의 테스트 벡터는 수정하지 않는다.
- UI 문구는 한국어로 쓰고, 모바일 360px 기준으로 확인한다.
- 지금 작업 중인 마일스톤(PLAN §12) 범위 밖의 기능은 만들지 않는다.
