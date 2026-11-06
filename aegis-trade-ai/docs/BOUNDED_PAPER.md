# 한정 실행 공개피드 PAPER 루프 — 2026-11-01 로컬 검수본

기존 합성 DEMO 및 오프라인 재생과 별도의 명시적 실행 CLI입니다.
실제 업비트 계정/주문/키는 사용하지 않으며 모든 체결·손익은 모의입니다.
이번 버전은 **mock HTTP/fixture로만 검증**했습니다. 실제 공개피드 운영 성공이나
전략 수익성을 입증하지 않습니다. 2026-11-01 사용자 승인으로 기존 초안 PR #4에 코드·검수자료를 공유합니다. 병합·배포는 범위 밖입니다.

## 실행 및 종료

공개 호스트 접근과 코드 검수 후에만 아래 명령으로 소량 확인하세요.
이번 작업에서는 이 네트워크 실행 명령을 실행하지 않았습니다.

```sh
cd aegis-trade-ai
uv run python -m backend.app.live_paper --start-paper \
  --db public-paper.sqlite3 --stop-file PAPER_STOP --polls 3 --seconds 60
# 동일 DB의 SAFE_PAUSED 재개는 별도 --resume 필요
```

- 기본 최대 3회 관찰/60초, 10초 간격. 최대 허용 360회/3600초.
  관찰마다 공개 캔들·현재가 각 1회(각 요청은 최대 3회 시도).
- 시간 예산은 새 요청·재시도·관찰·체결 전에 확인합니다. 진행 중 HTTP 요청은
  즉시 취소하지 못하며 기존 10초 네트워크 단계별 timeout까지 종료가 늦어질 수
  있습니다. OS 수준의 엄격한 wall-clock 강제 종료기가 아닙니다.
- STOP 파일, SIGINT/SIGTERM, 실행 상한, stale/오류/리스크 중단에서 종료합니다.
  대기 진입은 취소하고 SAFE_PAUSED를 저장합니다. EMERGENCY_STOP을 낮추지 않습니다.
- 종료는 **포지션 청산이 아닙니다**. 보유분은 저장되며 종료 이후 가격 감시도
  중단됩니다. 보호손절은 루프가 정상 관찰 중인 동안에만 모의 처리됩니다.
- 같은 DB는 nonblocking 파일 잠금으로 동시 실행을 거절합니다. 별도 DB/다른
  프로세스 사이의 IP 요청예산 통합은 구현하지 않았습니다.
- DEMO/REPLAY DB를 지정하면 식별정보 불일치로 거절합니다. 비용/전략 버전이
  달라져도 같은 세션에 덮어 적용하지 않습니다.

## 신호·체결·영속성

- 완료 4H 봉 및 15초 유예, 연속성/최신 경계 검증 후 SMA 기준전략을 평가합니다.
  시작/재시작 자료는 warmup 및 watermark 갱신에만 사용합니다. 누락 기간 신호를
  소급 진입하지 않습니다. 기존 대기 진입도 재시작 때 취소합니다.
- 신규 완료봉 한 번당 제안 최대 1회. 동일 봉/동일 quote 재관찰로 중복 체결하지
  않습니다. 데이터가 4시간 넘게 건너뛰면 자동 재생하지 않고 중단합니다.
- 봉 확정 후 신호를 내고 **그 이후 시각의 새로운 공개 ticker 관찰 가격**에서
  모의 체결합니다. 대기는 60초 후 만료합니다. 이미 지나간 다음 봉의 시가를
  실시간 체결가처럼 사용하지 않습니다. 오프라인 replay의 다음 시가 모델과
  다르며 Parity 검증 완료를 주장하지 않습니다.
- 기존 0.5% 위험예산, 비용 포함 10% 지출 상한, 최소금액/현금, 일일손실·낙폭·연패
  가드를 진입 시 재검증합니다. 가격·수량·수수료·슬리피지는 Decimal입니다.
- 현재 관찰가가 손절 아래면 관찰가에서 슬리피지/수수료를 적용합니다. 폴링 사이
  잠깐 손절을 통과했다가 회복한 움직임은 검출하지 못합니다. 호가/VWAP 검증은 없습니다.
- state의 현금·포지션·체결목록·완료거래·watermark와 audit는 같은 SQLite transaction에
  저장합니다. 중간 메모리 변경 도중 interrupt가 나면 마지막 저장 상태로 복원합니다.
  복구된 포지션은 첫 정상 관찰부터 현재가 손절을 재평가합니다.
- 결과는 source, BOUNDED_PUBLIC_PAPER, simulated=true, actual_returns=false와
  실현 순손익/평가 순손익을 구분합니다. 미청산 평가손익에 가상 최종청산 비용은 없습니다.
  stale/error 원인도 상태에 표시하며 feed 오류 종료의 CLI exit code는 1입니다.

## 실제 수행과 미검증

2026-11-01 강제 네트워크 정책 재확인: restricted/enforced,
`api.upbit.com` 허용목록 미포함. **실제 요청 미시도**, 우회/다른 경로의 시세 수집 없음.
공식 [분 캔들](https://docs.upbit.com/kr/reference/list-candles-minutes),
[현재가](https://docs.upbit.com/kr/reference/list-tickers),
[요청 제한](https://docs.upbit.com/kr/reference/rate-limits) 문서는 웹 도구로 재확인했습니다.

검증 명령: `make -C aegis-trade-ai lint test build`.
기존 50개에 신규 17개를 더해 **67 passed**. Ruff/mypy(11 source files)/PAPER 금지패턴/
JS 문법/compile 통과. 기존 Starlette/httpx deprecation warning 1건.

신규 검증: 다음 관찰 체결·중복 방지·비용 순손익·risk cap, 시작/재시작 소급진입
방지·대기취소·포지션 복구·손절, stale/역순/결측/진행봉/다른마켓 차단, 대기만료,
일일손실 재검증, 비상정지 보존, 실행 횟수/시간예산, feed오류/중단요청,
429 재시도 사이 중단, DEMO 격리·명시적 재개, 미커밋 체결 interrupt,
실제 CLI STOP 파일/동시 프로세스 잠금, 실제 어댑터+mock HTTP 3회 bounded loop.
네트워크를 사용하지 않는 테스트만 실행했으며 장시간 프로세스는 시작하지 않았습니다.

다음 단계: Claude 검수 및 체결 모델 차이 검토 → 공개호스트
접근 허용 후 소량 실제 응답 smoke → 호가/시계/폴링 공백/장애 알림 검증.
실제 feed, 장시간 운영, 30일 안정성, 최종 holdout, 수익성은 모두 미검증입니다.
