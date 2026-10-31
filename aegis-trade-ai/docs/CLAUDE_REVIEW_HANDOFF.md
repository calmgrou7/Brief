# Claude 검수 인계 — 공개시세 어댑터 / 오프라인 PAPER 재생

구현 커밋: `0aeea377bee993da1cd7d3146079482d0161032d`.
기준 커밋: `4d6cd56abaccb362e011b3f5b3e6f5916ab1de7d`.
대상: `calmgrou7/Brief`, `codex/aegis-paper-mvp`, 초안 PR #4.
이 문서는 검수를 위한 인계이며 Claude가 이미 검수했다는 의미가 아닙니다.

## 구현 범위

- 기존 FastAPI/SQLite 합성 DEMO 및 리스크 게이트를 유지합니다.
- 업비트 공개 KRW-BTC 240분 캔들/현재가 조회 어댑터를 추가했습니다.
  Decimal 파싱, 완료봉+15초 유예, 페이지 상한/배타적 커서, 결측 표시,
  타임아웃, 최대 3회 요청, 지수 백오프, Remaining-Req, 418 중단,
  리다이렉트 거절 및 현재가 신선도 표시를 포함합니다.
- 순수 SMA 진입 + 고정 보호손절 기준전략과 별도 오프라인 PAPER 재생 CLI입니다.
  PRD A/B/C 구현이나 승인된 수익 전략은 아닙니다.
- 기존 다음 봉 시가 체결, 비용·일일손실·낙폭·연패 가드를 재사용합니다.
  합성/공개 과거자료 출처를 구분하고 실제 수익이 아닌 모의 결과임을 표시합니다.
- 시간순 60/20/20 구간, 별도 현금계정, 최종 holdout 명시적 해제,
  보수 비용 시나리오, DB 식별정보/단일 인스턴스 잠금, 재시작 재현성을 지원합니다.
- stale/error 시 대기 진입 취소·SAFE_PAUSED 영속화를 하는 admission interlock은
  테스트된 구성요소입니다. **실시간 PAPER 매매 루프에는 연결하지 않았습니다.**
- 계정·API 키·실주문·운영 배포는 없습니다. 기존 웹사이트도 변경하지 않았습니다.

## 실제 실행 검증

```sh
make -C aegis-trade-ai lint test build
cd aegis-trade-ai
UV_CACHE_DIR=/tmp/aegis-uv uv run python -m backend.app.research replay --synthetic --db /tmp/upbit-baseline-smoke.sqlite3 --steps 20000
```

- pytest **50 passed**, 기존 Starlette/httpx deprecation warning 1건.
- Ruff, mypy(10 source files), PAPER 금지패턴 검사, JS 문법, Python compile 통과.
- 합성 train CLI 재생 완료(cursor 107). 실제 수익률 검증이 아닙니다.
- HTTP 검증은 **httpx.MockTransport만 사용**했습니다.
- 현재 실행환경의 강제 outbound 허용목록에 `api.upbit.com`이 없어
  **실제 Upbit 요청은 시도하지 않았습니다**. 우회도 하지 않았습니다.
- 공식 한국어 캔들/요청 제한 문서는 웹 도구로 확인했습니다.

## 집중 검수 체크리스트

- [ ] 허용된 공개 endpoint만 호출하며 키/주문/인증 경로가 없는가?
- [ ] 429/5xx/timeout 재시도 상한, 418 latch, Retry-After 및 Remaining-Req가 안전한가?
- [ ] 원시 가격 Decimal 정확도, UTC/4H 경계, 15초 유예, 중복·역순·결측 처리가 맞는가?
- [ ] 전략 입력이 현재 완료봉까지만 전달되고 미래 suffix 변경이 과거 상태에 영향을 주지 않는가?
- [ ] 다음 봉 시가에서 기존 Risk Gate를 다시 거치며 비용·갭 손절·손실 제한이 유지되는가?
- [ ] 재생 중단/재시작, 미커밋 step 중단, 데이터/설정 변경 및 DEMO DB 혼용을 안전하게 다루는가?
- [ ] 오래된 cached OK 시세도 차단하고 EMERGENCY_STOP을 낮추지 않는가?
- [ ] 학습/검증/holdout 계정 분리, 과거 지표 warmup, 명시적 holdout 해제 의미가 정확한가?
- [ ] 종료 미청산 포지션은 평가손익이며 가상 최종청산 비용이 빠져 있음을 명확히 표시하는가?
- [ ] 합성 DEMO, 공개 가격 관찰, 과거 재생, 아직 미구현인 실시간 PAPER가 혼동되지 않는가?

## 남은 작업 / 다음 단계 전제

공개 호스트 접근 허용 후 소량 실제 응답·4H 경계 실측, 버전 고정 과거 데이터
수집, 장기 데이터 품질 및 지표/전략/벤치마크·워크포워드 검증이 필요합니다.
실시간 PAPER 루프, 재시작 백필 소급진입 방지, 실시간 손절/호가 신선도,
시계 오차·알림·30일 운영은 아직 검증하지 않았습니다. 최종 holdout도 실행하지
않았습니다. 현재 KST 일자 기준의 4H 근사 방식은 그대로입니다.

상세 실행 및 한계: [PUBLIC_REPLAY.md](PUBLIC_REPLAY.md).
공식 문서: [분 캔들](https://docs.upbit.com/kr/reference/list-candles-minutes),
[요청 제한](https://docs.upbit.com/kr/reference/rate-limits).

검수 후에도 이 PR은 운영자 병합 전 초안 상태를 유지합니다. 실거래 및 운영
배포는 이번 공유 범위에 포함되지 않습니다.
