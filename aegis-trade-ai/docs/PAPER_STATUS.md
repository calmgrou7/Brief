# 읽기 전용 PAPER 상태 보고 — 2026-11-02 로컬 검수본

기존 bounded 모의매매 DB를 조회하여 마지막 시세·체결·비용·순손익·중단 사유를
한국어 텍스트 또는 JSON으로 출력합니다. 조회 명령은 피드를 요청하거나 루프를
시작/재개하지 않습니다. 기존 합성 DEMO 화면/사이트는 변경하지 않았습니다.

```sh
cd aegis-trade-ai
uv run python -m backend.app.paper_status --db public-paper.sqlite3
uv run python -m backend.app.paper_status --db public-paper.sqlite3 --format json
```

## 표시 의미

- 자료 출처는 `MOCK`, `PUBLIC_LIVE`, `LEGACY_UNVERIFIED`를 구분합니다.
  아직 시세를 받지 않았으면 설정이 PUBLIC_LIVE여도 `NO_OBSERVATION`입니다.
  과거 출처가 저장되지 않은 DB는 실제 feed로 추정하지 않습니다.
- PAPER는 모의매매 상태이지 프로세스 실행 증명이 아닙니다. 읽기 전용 보고서는
  항상 `NOT_VERIFIED_FROM_SNAPSHOT`으로 표시합니다. 실제 run 종료 응답만
  `STOPPED`를 표시합니다. 종료 후 미청산 보유분의 가격/손절 감시는 중단됩니다.
- 마지막 체결시각과 수신시각을 별도로 표시하고 조회 시각에 신선도를 다시 계산합니다.
  두 시각 모두 0~60초 이내면 FRESH, 오래됐거나 미래이면 STALE, 수신시각 기록이
  없으면 UNKNOWN입니다. 피드의 과거 OK 표시를 현재 신선도로 오인하지 않습니다.
- 시세가 없는 경우 가격은 `null`/없음입니다. 현금만 있는 초기 계정의 실제 0 손익과
  구분합니다. 보유분이 있는데 평가 시세가 없으면 평가자산/평가손익/미실현손익도
  `null`로 표시합니다. NaN/Infinity 금액은 보고를 거절합니다.
- 평가 순손익 = 현금 + 보유분 평가액 − 초기 모의자금. 실현 순손익은 종료 거래
  합계, 미실현 순손익은 보유 평가액 − 진입 총비용입니다. `pnl_reconciles`로 대사합니다.
- 누적 수수료는 매수/매도 fill의 실제 모의 수수료 합계입니다. 이미 체결가격에
  포함된 슬리피지를 다시 차감하지 않습니다. 미청산 가상 최종청산 비용은 미차감입니다.
- 피드 상태와 종료 사유를 분리합니다. POLL_LIMIT/TIME_LIMIT/STOP_REQUESTED,
  PUBLIC_FEED_ERROR/FEED_INVALID/STALE_OR_ERROR 등과 구체적 오류를 표시합니다.
  실행 중단에 따른 요청 취소를 통신 장애로 잘못 기록하지 않습니다.
- JSON에는 체결/종료거래 내역, 포지션, 대기 진입, 비용설정, 저장시각, 마지막 처리봉이
  포함됩니다. 보고서 자체는 실제 투자수익이나 전략 수익성을 의미하지 않습니다.

## SQLite 원본 불변 조회

SQLite의 `mode=ro`만으로는 WAL DB의 `-shm`/`-wal` 부수파일이 생성될 수 있음을
신규 테스트에서 확인해 수정했습니다. 원본 DB/WAL을 읽어 **임시 사본**에서만
SQLite를 엽니다. 파일별 32 MiB 상한, 복사 전후 inode/size/mtime/ctime 일치 검사,
최대 3회 재시도로 동시 쓰기 중 불안정한 사본을 거절합니다. 원본 DB·WAL·SHM과
state/audit를 수정하지 않고, 잠금파일을 생성하지 않으며, 누락 DB도 만들지 않습니다.
심볼릭 링크는 실제 DB 경로를 해석하여 그 WAL까지 포함합니다.

`immutable=1`로 원본 WAL을 무시하는 방식은 사용하지 않습니다. 실행 중 writer가
커밋한 WAL 상태를 읽는 테스트와 원본 파일 바이트 불변 테스트를 모두 수행했습니다.
지속 쓰기 중 3회 모두 복사 안정성이 확보되지 않으면 BUSY 오류로 종료합니다.
크기 상한 초과도 명시적 오류입니다. 기존 데이터 마이그레이션/리셋은 없습니다.

## 검증 및 실제 feed 구분

`make -C aegis-trade-ai lint test build`: **83 passed** (기존 67 + 신규 16).
Ruff/mypy(12 source files)/금지패턴/JS 문법/compile 통과. 기존 Starlette 경고 1건.
신규 테스트는 보고 비용/손익 대사, WAL 포함/원본 불변, 누락/손상 DB, JSON/텍스트
CLI, null/0, 신선도/미래시각, MOCK/미수신/legacy 출처, 재시작 비용·출처 불일치,
중단·통신오류 구분, 복사 크기/재시도 상한, symlink WAL 처리를 포함합니다.

2026-11-02 환경을 재확인했으나 restricted/enforced 상태이며 api.upbit.com이
허용목록에 없습니다. **실제 공개시세 요청은 미시도**, 다른 경로로 우회하지 않았습니다.
이번 검증의 시장 자료는 fixture/mock이며 실제 feed·장기 운영 검증이 아닙니다.

실시세 소량 검증에 필요한 최소 조건은 해당 실행환경의 공식 네트워크 설정에서
`api.upbit.com:443` 공개 HTTPS 접근을 허용하는 것입니다. 기존 프록시/CA 검증은
유지합니다. 계좌·인증키·주문권한·상시 서버는 필요하지 않습니다. 접근 허용 후 별도
한정 검증에서 ticker 1회와 캔들 1페이지 정도의 응답 건수/UTC시각/출처/크기를 기록하고,
서비스 측 차단이나 오류가 있으면 그대로 보고해야 합니다. 이번에는 시행하지 않았습니다.
