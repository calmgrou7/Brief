# AGENTS.md — AI 코딩 에이전트 공통 규칙 (ChatGPT/Codex, Claude Code)

기준 문서: `docs/prd/AEGIS_TRADE_AI_PRD_v1.1.md` (최신 버전이 우선)

## 절대 금지
- 업비트 API 키 요청·저장·사용, 주문 API(`/v1/orders` 등) 호출 코드, LiveBroker 구현/스텁, JWT 서명 코드
- 미완성(진행 중) 캔들로 진입 신호 생성
- 실행하지 않은 테스트 결과·백테스트 성과 수치 기재
- Risk Gate 우회 경로, 런타임 리스크 한도 완화

## 작업 방식
- 흐름: ChatGPT 구현 → Claude 리뷰·보완(`docs/review/REVIEW_CHECKLIST.md`) → 운영자 병합
- PR은 PRD §14.3 단위로 작게. PR 설명에 변경 요약 / 실행한 테스트와 결과 / 미검증 항목 / 다음 PR 전제조건
- PRD와 다른 결정은 `docs/DECISIONS.md`에 한 줄 추가
- 커밋 전 `make lint test` 실행

## 코드 규칙
- 금액·가격·수량: `Decimal` (지표 계산만 float 허용)
- 시간: UTC 저장(timezone-aware), 표시만 KST
- 외부 호출: 타임아웃 필수, 재시도는 상한 + 지수 백오프
- 로그에 비밀값 출력 금지 (마스킹 포매터 사용)
