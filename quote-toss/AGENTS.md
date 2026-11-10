# AGENTS.md

이 저장소는 앱인토스(Apps in Toss) 비게임 WebView 미니앱 "1분 견적"이다. **작업 전에 반드시 `PLAN.md`를 읽고 그 명세를 따른다.**

## 규칙
- 스택은 Vite + React + TypeScript + `@apps-in-toss/web-framework` + TDS WebView + Supabase다. 패키지 매니저는 pnpm을 쓴다.
- UI는 TDS 컴포넌트로 만든다. TDS 사용은 앱인토스 검수 기준이다.
- 앱인토스 SDK 호출은 `src/lib/toss/` 래퍼에만 둔다. 다른 곳에서 SDK를 직접 import하지 않는다.
- SDK 함수 이름은 버전마다 다르다(v2/v3). 추측하지 말고 `docs/sdk-notes.md`(M0 산출물)와 개발자센터 최신 문서를 따른다.
- 금액 계산, 한글 금액, 사업자번호, 문서 번호 로직은 `src/lib/calc/`의 순수 함수에만 둔다.
- 요금제 한도와 가격은 `src/lib/plan.ts`에만 둔다. 다른 곳에 하드코딩하지 않는다.
- 구독 권한과 광고 보상은 서버(Supabase Edge Function)가 검증한 결과만 신뢰한다. 클라이언트에서 Pro 상태나 보너스를 직접 바꾸지 않는다.
- 웹훅 처리는 멱등으로 만든다(`order_id` 유니크).
- 개발 중에는 테스트 광고 ID만 쓴다. 실제 광고 ID는 출시 빌드 설정에서만 주입한다.
- 비밀값(토스 인증서와 키, service role 키)은 Edge Function 환경변수에만 둔다. 클라이언트 번들에 넣지 않는다.
- 커밋 전 `pnpm lint && pnpm test`가 통과해야 한다. PLAN §10.3의 테스트 벡터는 수정하지 않는다.
- UI 문구는 한국어로 쓰고, 지금 작업 중인 마일스톤(PLAN §13) 범위 밖의 기능은 만들지 않는다.
