# AEGIS TRADE AI — 업비트 현물 자동매매 PRD v1.1 (보완판)

- 버전: 1.1 (v1.0 ChatGPT 초안 → Claude 보완)
- 작성 기준일: 2026-10-31 (Asia/Seoul)
- 상태: **설계 확정 전 / 구현 전 / 실제 계정 미연동**
- 대상: 1인 운영자, 개인 자기자금, 업비트 KRW 현물
- 기본 운영 모드: `PAPER` (실거래 코드 자체가 저장소에 없음)
- 지향점: 수익 보장형 AI가 아니라 **손실을 통제하며 전략을 검증하고, 사람이 매일 들여다보지 않아도 굴러가는 자동 운영 시스템**

> 이 문서는 개발 명세이며 투자 수익을 보장하지 않는다. `[검증 필요]` 표시는 업비트 공식 문서 또는 실제 API 호출 테스트로 확인한 뒤 확정해야 하는 항목이다.
> 원본: `docs/prd/AEGIS_TRADE_AI_PRD_v1.0.md`. 이 문서만 읽어도 구현 가능하도록 v1.0 내용을 통합했다.

---

## 0. v1.0 대비 변경 요약 (리뷰 결과)

| # | 구분 | v1.0 문제 | v1.1 조치 |
|---|---|---|---|
| 1 | 리스크 | 1회 매수 10% 상한 + 단일 종목 + 추가매수 규정 없음 → **총 노출 20%는 도달 불가능한 숫자** | MVP는 **포지션 1개, 추가매수(피라미딩) 금지**로 명시. 총 노출 20%는 향후 다종목용 상한으로 보존 (§5) |
| 2 | 리스크 | 포지션 크기 공식에 수수료·슬리피지 미반영 → 손절 시 실제 손실이 0.5% 초과 | 진입·청산 양쪽 슬리피지와 수수료를 반영한 공식, 사후 검증, **골든 테스트 G1~G11** (§5.2). r2에서 Codex 리뷰 지적(청산 슬리피지 누락)을 반영 |
| 2b | 비용 | 수량 계산·백테스트·모의매매의 슬리피지 기본값이 서로 달랐음 (0.1% / 0.05%) | **공통 비용 설정 하나**(`config/costs.yaml`)를 세 모듈이 공유, PaperBroker는 허용 슬리피지 초과 시 주문 안 함 (§5.4) |
| 3 | 리스크 | 연속 3회 손실 후 "일시 중지"의 해제 조건 없음, "당일" 기준 시각 없음, 낙폭 계산 기준 없음 | 해제 조건·KST 00:00 기준·평가손익 포함 여부 확정 (§5.1) |
| 4 | 백테스트 | 신호 시점 vs 체결 시점, 봉 안에서 손절·익절 동시 도달 시 처리 미정의 → 백테스트가 낙관적으로 왜곡될 위험 | **다음 봉 시가 체결, 갭 반영, 동일 봉 충돌 시 손절 우선** 규칙 확정 (§11.2) |
| 5 | 백테스트 | Buy & Hold(100% 투자)와 10% 노출 전략을 비교 → 의미 없는 비교 | **노출 동일화 벤치마크**(10% BTC 보유) 추가 (§11.3) |
| 6 | 검증 | 4시간봉 추세전략은 30일에 거래 0~5회 → 30일 모의매매로 전략 평가 불가 | 모의매매 목적을 **운영 안정성 + 백테스트-모의 일치도(Parity)** 검증으로 재정의 (§11.4) |
| 7 | 데이터 | 4시간봉 마감 판정 방법, 거래 없는 구간 캔들 누락, REST 200개 페이지네이션 미정의 | 마감 판정 = 경계 + 유예시간 후 REST 재조회로 확정 (§6.2) |
| 8 | 운영 | 봇이 죽으면 알림도 같이 죽음 (자기 자신이 경보 주체) | **외부 하트비트(Dead man's switch)** 추가 (§8.3) |
| 9 | 운영 | 모바일 관리 = Next.js 웹 → 1인 운영 대비 구현·보안 부담 과다 | **텔레그램 봇을 1차 모바일 콘솔**로, 웹은 읽기 위주 경량 대시보드로 축소 (§8) |
| 10 | 보안 | "실거래 3중 차단"이 추상적 | MVP 저장소에 **실주문 코드 자체를 두지 않고 CI가 금지 패턴을 검사** (§7.3) |
| 11 | 협업 | 역할표가 Claude=개발 / Codex=QA로 되어 있어 실제 흐름과 다름 | **ChatGPT=구현, Claude=리뷰·보완** 흐름과 PR 단위 인수인계 규칙 반영 (§9, §14) |
| 12 | 전략 | 전략 A/B/C 파라미터가 서술형 → 구현자가 임의 해석 | **초기 연구 파라미터 기본값과 탐색 범위** 표로 고정 (§4) |

---

## 1. 제품 목표 및 범위

### 1.1 목표
1. 업비트 KRW-BTC의 시세·거래량·캔들 데이터를 지속 수집한다.
2. 세 가지 연구용 전략을 동일한 가정에서 백테스트하고 우수 후보 1개를 선정한다.
3. 선정된 전략의 **확정(버전 고정) 버전만** 24시간 모의주문 엔진으로 실행한다.
4. 위험관리 엔진(Risk Gate)을 주문 실행과 별도로 구현하여 전략·AI 모두 우회할 수 없게 한다.
5. 모든 신호, 거절 사유, 가상 체결, PnL, API 오류를 기록한다.
6. 스마트폰(텔레그램)에서 상태 확인·일일 요약·긴급 정지를 할 수 있게 한다.
7. 향후 별도 승인과 검수 후 실거래 모드를 **별도 PR/별도 배포**로 추가할 수 있는 구조를 만든다.

### 1.2 MVP 범위
- **포함**: KRW-BTC 1종, 4시간봉 신호, 실시간 가격 수신, 기술지표, 전략 3종 백테스트 + 워크포워드, 페이퍼 트레이딩, 독립 Risk Gate, 텔레그램 알림/명령, 경량 웹 대시보드, 일간·주간 요약, 비상정지, 감사로그, 외부 하트비트.
- **제외**: 선물·레버리지·공매도, 다종목 동시매매, 추가매수(피라미딩), 타인 자금 운용, 리딩 판매, 고빈도 거래, AI 임의 전략 변경, 출금 자동화, 실거래, 손실 만회용 배팅 증가, Next.js 풀 프론트엔드(v2로 이연).
- **원칙**: 실거래 주문 코드는 MVP 저장소에 존재하지 않는다(§7.3).

### 1.3 1인 운영자 기준 성공 지표 (MVP 종료 시)
| 지표 | 목표 |
|---|---|
| 운영자 일일 개입 시간 | 평균 5분 이하 (텔레그램 요약 확인만) |
| 무인 연속 가동 | 30일 이상, 프로세스 재시작은 자동 복구 |
| 장애 인지 시간 | 봇 정지/데이터 단절 시 10분 이내 휴대폰 알림 |
| 기록 누락 | 신호·리스크 판정·주문·체결 간 고아 레코드 0건 |
| 백테스트-모의 일치도 | 동일 기간 재생 시 체결가 오차 평균 0.3% 이내, 신호 불일치 0건 |

---

## 2. 시스템 설계

```
업비트 공개 API (REST / WebSocket)
       |
       v
[Market Data Ingest] --> [데이터 품질/저장] --> [지표 계산]
       |                                          |
       | (실시간 가격: 손절 감시)        +--------+---------+
       |                                v                  v
       |                          [전략 연구/백테스트]   [고정 전략 엔진]
       |                                |                  | BUY/SELL/HOLD 제안만
       |                          [승인된 전략 버전] -------+
       |                                                   v
       +-----------------------------------------------> [Risk Gate]  ← 리스크 설정(YAML, 체크섬)
                                                           |
                                                           v
                                                    [PaperBroker]   (LiveBroker 없음)
                                                           |
                                                           v
                                              [주문/체결/포지션/자산 스냅샷/감사로그]
                                                           |
                                    +----------------------+----------------------+
                                    v                      v                      v
                             [텔레그램 봇]           [경량 웹 대시보드]     [외부 하트비트]
                          알림·/status·/stop         읽기 위주 화면        봇 사망 감지
```

- **단일 프로세스, 단일 인스턴스**로 시작한다. 실행 시 DB 잠금(또는 파일 락)을 획득하지 못하면 즉시 종료한다.
- Strategy Engine은 순수 함수에 가깝게 구현한다: `(확정 캔들 DataFrame, 파라미터, 현재 포지션) -> Signal`. 네트워크·DB·브로커 접근 금지.
- Risk Gate는 전략과 독립된 모듈이며, 전략 코드에서 import할 수 없다(import 방향을 CI에서 검사 권장).
- 진입(BUY)은 **확정 4시간봉에서만**, 청산(손절·추적손절)은 **실시간 가격으로 상시 감시**한다. 추세 이탈·시간 제한 청산은 4시간봉 마감 시점에 판단한다.
- AI(LLM)는 주간 리포트·설명·이상 탐지 보조에만 쓰며, 매매 루프 안에서 호출하지 않는다.
- 전략 변경 경로: **연구 → 백테스트 → 워크포워드 → 모의매매 → 운영자 승인 → 버전 고정(체크섬)**.

---

## 3. 핵심 기술 스택 (1인 운영 기준으로 경량화)

| 영역 | MVP 선택 | 비고 |
|---|---|---|
| 언어 | Python 3.12 | |
| 패키지/환경 | `uv` 또는 `pip-tools` + `pyproject.toml` | 버전 고정(lock) 필수 |
| API 서버 | FastAPI + Pydantic v2 | 대시보드 API + 헬스체크 |
| 대시보드 | FastAPI + Jinja2 템플릿(+HTMX 선택) | Next.js는 v2 |
| 모바일 콘솔 | **Telegram Bot API** | 알림, `/status`, `/pnl`, `/pause`, `/resume`, `/stop` |
| 지표 | pandas, numpy (지표는 직접 구현 + 참조값 테스트) | 외부 TA 라이브러리 사용 시 결과를 테스트로 고정 |
| 실시간 | `websockets` 또는 `aiohttp` | 자동 재연결 |
| HTTP | `httpx` | 타임아웃·재시도 명시 |
| 스케줄 | asyncio 루프 + APScheduler | 4H 마감 처리, 일일 리포트 |
| DB | SQLite (WAL 모드) → 필요 시 PostgreSQL | MVP는 SQLite로 충분 |
| 마이그레이션 | Alembic | |
| 테스트/품질 | pytest, ruff, mypy(strict는 핵심 모듈만) | |
| 배포 | Docker Compose, `restart: unless-stopped` | 고정 IP는 실거래 단계에서만 필요 |
| 원격 접속 | Tailscale 또는 Cloudflare Tunnel+Access | **대시보드를 공용 인터넷에 직접 노출하지 않음** |
| 하트비트 | healthchecks.io 등 무료 외부 모니터 | §8.3 |

---

## 4. 매매 전략 후보

공통 조건: `KRW-BTC`, 확정된 4시간봉만 신호 사용, 현물 롱 전용, 포지션 최대 1개, 추가매수 금지, 수수료·슬리피지 반영, 모든 지표는 **신호 봉 종가까지의 데이터만** 사용.

아래 값은 **연구 시작점**이며 수익성이 확인된 값이 아니다. 탐색 범위 밖의 값은 사용하지 않는다(과적합 방지). 그리드 조합 수는 전략당 최대 200개로 제한하고, 시도 내역 전부를 `research_trials`에 저장한다.

### 전략 A — 추세 추종 (1순위 후보)
| 항목 | 기본값 | 탐색 범위 |
|---|---|---|
| 장기 추세 필터 | 종가 > EMA(200) | EMA 150/200 |
| 정배열 | EMA(20) > EMA(50) | 단기 10~30, 중기 40~60 |
| 모멘텀 | RSI(14)가 45~70 구간이며 직전 봉 대비 상승 | 하한 40~50 |
| 거래량 필터 | 거래량 > 거래량 SMA(20) × 1.0 | 0.8~1.5 |
| 초기 손절 | 진입가 − ATR(14) × 2.0 | 1.5~3.0 |
| 추적 손절 | 보유 중 최고가 − ATR × 3.0 (끌어올리기만, 내리지 않음) | 2.0~4.0 |
| 추세 이탈 청산 | 4H 종가 < EMA(50) | 고정 |

### 전략 B — 횡보 평균회귀
| 항목 | 기본값 | 탐색 범위 |
|---|---|---|
| 횡보 판정 | ADX(14) < 20 | 15~25 |
| 진입 | 직전 봉 종가 < 볼린저(20, 2.0) 하단 이고 현재 봉 종가가 하단 위로 회복, RSI(14) < 35에서 반등 | RSI 25~40 |
| 익절 | 볼린저 중심선 도달 | 고정 |
| 손절 | 진입가 − ATR × 1.5 | 1.0~2.5 |
| 시간 제한 | 12봉(48시간) 내 미청산 시 4H 종가로 청산 | 6~18봉 |

### 전략 C — 변동성 돌파
| 항목 | 기본값 | 탐색 범위 |
|---|---|---|
| 돌파 | 4H 종가 > 직전 20봉 최고가 | 10~40봉 |
| 거래량 확인 | 거래량 > SMA(20) × 1.5 | 1.2~2.0 |
| 과열 필터 | RSI(14) < 80 이고 (종가−시가)/ATR < 2.5 | |
| 손절/추적 | 초기 ATR × 2.0, 추적 ATR × 2.5 | |
| 시간 제한 | 18봉 | 12~30봉 |

**평가 기준**: 비용 차감 순손익, MDD, Profit Factor, 평균 손익비, 거래 수, 노출 시간 비율, 연도·시장국면별 손익, 노출 동일화 벤치마크 대비 초과성과(§11.3). 단순 승률로 순위를 매기지 않는다.

---

## 5. 위험관리 설정 (검증용 기본값)

### 5.1 한도표

| 설정 | 값 | 판정 기준 / 해제 조건 |
|---|---:|---|
| 시작 자산 | 모의잔고 1,000,000 KRW | |
| 주문 대상 | KRW-BTC만 | 그 외 → `REJECT_MARKET_NOT_ALLOWED` |
| 레버리지 | 없음 | |
| 동시 포지션 | 1개, 추가매수 금지 | 보유 중 BUY → `REJECT_POSITION_EXISTS` |
| 1회 거래 허용 손실 | 평가자산의 0.5% | 수수료·슬리피지 포함(§5.2) |
| 1회 최대 매수금액 | 평가자산의 10% | 0.5% 위험 수량과 비교해 작은 값 |
| 총 코인 노출 | 평가자산의 20% | MVP에선 위 규칙상 10% 초과 불가. 다종목 확장 대비 상한으로 유지 |
| 일일 손실 한도 | 당일 시작 순자산 대비 −2% | "당일" = **KST 00:00 기준**. 순자산 = 현금 + 평가액(미실현 포함). 도달 시 다음 KST 00:00까지 신규 매수 중단, 자동 해제 |
| 전략 전체 낙폭 | 최고 순자산 대비 −8% | 평가액 기준 실시간 계산. 도달 시 `SAFE_PAUSED`, **운영자 수동 재개만** 가능 |
| 연속 손실 | 3회 | 비용 차감 실현손익 < 0인 청산이 3회 연속 → 신규 매수 **24시간** 중지 후 자동 해제. 해제 후 다시 2연속 손실 시 수동 재개 필요 |
| 물타기/마틴게일 | 불허 | 수량 계산식에 직전 손실을 입력으로 쓰지 않음 |
| 데이터 최신성 | 실시간 가격 수신 공백 60초 초과 | 신규 매수 금지(`REJECT_STALE_DATA`), 복구 후 자동 해제 |
| 최소 주문금액 | 5,000 KRW `[검증 필요]` | 미만 → `REJECT_MIN_ORDER` |

> 참고: 10% 포지션에서 BTC가 10% 움직이면 계좌는 약 1% 움직인다. 이 설정은 **수익 극대화가 아닌 시스템 검증용**이며, 일일 −2% 한도는 정상 상황에서 거의 발동되지 않는 안전망이다. 운영자는 이 점을 기대 수익률 판단에 반영한다.

### 5.2 포지션 크기 계산 (확정 공식, v1.1 r2)

비용 모델은 §5.4의 **공통 비용 설정 하나**를 Risk Gate·백테스터·PaperBroker가 같이 쓴다. 진입·청산 양쪽에 같은 슬리피지 `s`, 체결대금 기준 수수료 `f`를 적용한다.

```
# 입력: equity, cash, entry(슬리피지 적용 전 기준가), stop(손절 트리거가), f, s   — 전부 Decimal
reject if equity <= 0 or cash <= 0 or entry <= 0 or stop <= 0   -> REJECT_INVALID_INPUT   (나눗셈 전에 검사)
reject if stop >= entry                                         -> REJECT_INVALID_STOP

entry_fill      = entry * (1 + s)          # 슬리피지는 여기서 한 번만 적용 (중복 적용 금지)
stop_fill       = stop  * (1 - s)
cost_per_unit   = entry_fill * (1 + f)     # 1 BTC 매수에 실제로 나가는 현금
per_unit_risk   = cost_per_unit - stop_fill * (1 - f)

risk_budget     = equity * 0.005
qty_by_risk     = risk_budget / per_unit_risk
qty_by_cap      = (equity * 0.10) / cost_per_unit     # 10% 상한 = 수수료 포함 실제 지출 기준
qty_by_cash     = cash / cost_per_unit
qty             = floor_to_8_decimals( min(qty_by_risk, qty_by_cap, qty_by_cash) )   # 내림

reject if qty * entry_fill < 5000                               -> REJECT_MIN_ORDER
# 사후 검증 (내림 후 최종 수량으로 다시 확인, 실패 시 REJECT_SIZING_INVARIANT + 경보)
assert qty * cost_per_unit <= cash
assert qty * cost_per_unit <= equity * 0.10
assert qty * per_unit_risk <= risk_budget
```

- `entry` 기준가: 백테스트 = 봉 t+1 시가, PaperBroker = 판단 시점 최우선 매도호가(best ask).
- 이 공식은 **가정한 비용 + 갭 없는 손절**에서 위험예산을 지키는 공식이다. 갭 하락·급락 시 실제 손실은 예산을 넘을 수 있다(G7).
- `s=0`이면 v1.1 초판 공식과 같아진다. 단, 10% 상한 기준을 "수수료 포함 실지출"로 확정하면서 G1·G3 기대값이 0.00100000 → 0.00099950으로 바뀌었다.

**골든 테스트 케이스** — 아래 값은 Decimal로 산술 검산한 값이다(구현 테스트 실행 결과 아님). 구현은 이 값을 그대로 내야 한다. f = 0.0005 공통.

| # | 목적 | equity / cash | entry | stop | s | 기대 결과 |
|---|---|---:|---:|---:|---:|---|
| G1 | 상한(cap)이 제한 | 1,000,000 / 1,000,000 | 100,000,000 | 97,000,000 | 0 | **qty 0.00099950**, 지출 99,999.975원 |
| G2 | 위험예산이 제한 (s=0 회귀) | 1,000,000 / 1,000,000 | 100,000,000 | 90,000,000 | 0 | **qty 0.00049529**, 손절 손실 4,999.95255원 |
| G3 | 손절 촘촘 → cap 제한 | 1,000,000 / 1,000,000 | 100,000,000 | 99,000,000 | 0 | **qty 0.00099950** |
| G4 | 최소주문 미달 | 40,000 / 40,000 | 100,000,000 | 97,000,000 | 0 | 0.00003998 × 1억 = 3,998원 → **REJECT_MIN_ORDER** |
| G5 | 손절 ≥ 진입 | 1,000,000 / 1,000,000 | 100,000,000 | 100,000,000 | 0 | **REJECT_INVALID_STOP** |
| G6 | **슬리피지 ≠ 0, 위험예산 제한** | 1,000,000 / 1,000,000 | 100,000,000 | 90,000,000 | 0.001 | per_unit_risk 10,285,005 → **qty 0.00048614**, 손절 손실 **4,999.95233070원** (초판 공식은 0.00049043 / 5,044.07500215원으로 예산 초과) |
| G7 | 갭 손절 (예산 초과 가능 확인) | G6 포지션 | 100,000,000 | 90,000,000 | 0.001 | 봉 시가 85,000,000 → 손절 체결가 `min(90,000,000, 85,000,000)×0.999` = 84,915,000, 손실 **7,427.00749605원** (> 5,000, 정상 동작으로 기록) |
| G8 | 현금이 제한 (함수 단위 테스트, MVP 실운영에선 발생 안 함) | 1,000,000 / 60,000 | 100,000,000 | 97,000,000 | 0.001 | **qty 0.00059910**, 지출 59,999.894955원 |
| G9 | 최소주문 경계 (미달) | 50,000 / 50,000 | 100,000,000 | 97,000,000 | 0.001 | qty 0.00004992, 4,996.992원 → **REJECT_MIN_ORDER** |
| G10 | 최소주문 경계 (통과) | 50,100 / 50,100 | 100,000,000 | 97,000,000 | 0.001 | **qty 0.00005002**, 체결대금 5,007.002원 |
| G11 | 잘못된 입력 | 1,000,000 / 1,000,000 | 0 | 97,000,000 | 0.001 | **REJECT_INVALID_INPUT** (나눗셈 전 거절) |

### 5.3 Risk Gate 거절 코드 (enum 고정)

`ACCEPT`, `REJECT_INVALID_INPUT`, `REJECT_SIZING_INVARIANT`, `REJECT_SLIPPAGE_EXCEEDED`, `REJECT_MODE_NOT_ALLOWED`, `REJECT_MARKET_NOT_ALLOWED`, `REJECT_POSITION_EXISTS`, `REJECT_NO_POSITION`(보유 없이 SELL), `REJECT_INVALID_STOP`, `REJECT_MIN_ORDER`, `REJECT_INSUFFICIENT_CASH`, `REJECT_DAILY_LOSS_LIMIT`, `REJECT_DRAWDOWN_LIMIT`, `REJECT_LOSS_STREAK`, `REJECT_STALE_DATA`, `REJECT_CANDLE_NOT_CLOSED`, `REJECT_DUPLICATE_SIGNAL`, `REJECT_RECONCILE_MISMATCH`, `REJECT_STRATEGY_NOT_APPROVED`, `REJECT_ORDERBOOK_STALE`.

- **SELL(청산)은 일일손실·낙폭·연속손실·SAFE_PAUSED 상태에서도 허용**한다(위험을 줄이는 방향). `EMERGENCY_STOP`에서는 자동 청산도 멈추고 운영자 명령만 받는다.
- 리스크 설정은 `config/risk.yaml`에 두고 기동 시 체크섬을 `audit_events`에 기록한다. **런타임 변경은 한도를 조이는 방향만 허용**, 완화는 재기동 + 감사로그 필수.

### 5.4 공통 비용 설정 (`config/costs.yaml`)

| 시나리오 | 수수료 f | 슬리피지 s | 사용처 |
|---|---:|---:|---|
| `base` | 0.0005 `[검증 필요]` | 0.001 | **Risk Gate 수량 계산, PaperBroker 허용 한도, 백테스트 기본** |
| `conservative` | 0.0005 | 0.002 | 백테스트 스트레스 (이 시나리오에서도 순손익 > 0이어야 선정) |

- 세 모듈은 같은 설정 객체를 주입받는다. 모듈 안에 비용 상수를 하드코딩하지 않는다.
- PaperBroker는 실제 호가창을 걸어 내려간 VWAP로 체결가를 계산한다. 기준가 대비 체결가 차이가 `s`를 넘으면 주문하지 않는다(`REJECT_SLIPPAGE_EXCEEDED`). 그래서 실제 체결 비용이 수량 계산 때 가정한 비용을 넘지 않는다.
- 실측 슬리피지(VWAP vs 기준가)를 매 체결 기록하고 주간 리포트에 가정치와 비교한다. 7일 평균이 `s`의 80%를 넘으면 경보를 보내고 `s` 상향을 검토한다.

---

## 6. 업비트 API 연동 요구사항

### 6.1 공식 문서 기준 사실 (실구현 전 재확인)
- 공개 WebSocket: `wss://api.upbit.com/websocket/v1` (`ticker`, `trade`, `orderbook` 등). 무응답 연결은 서버가 끊을 수 있으므로 주기적 PING 필요 `[검증 필요: 타임아웃 초]`.
- REST 캔들: 분봉 `GET /v1/candles/minutes/240`, 1회 최대 200개, `to` 파라미터로 과거 페이지네이션 `[검증 필요]`.
- 응답 헤더 `Remaining-Req`로 그룹별 남은 요청 수를 확인하고 내부 요청 속도를 그보다 낮게 유지 `[검증 필요]`.
- 4시간봉 경계 시각(UTC 기준 00/04/08/12/16/20시 여부) `[검증 필요: 실제 응답의 candle_date_time_utc로 테스트 확정]`.
- 거래가 없던 시간대는 캔들이 생성되지 않을 수 있다 → 결측으로 처리.
- KRW 마켓 호가 단위는 가격대별로 다르며 정책이 바뀐 적이 있다 → 하드코딩 금지, 설정 테이블 + 문서 링크.
- 주문 관련 API(`POST /v1/orders`, `/v1/orders/test`), JWT 인증, IP 허용목록은 **P6(실거래) 단계 참고사항**이며 MVP에서 구현하지 않는다.

### 6.2 4시간봉 마감 판정 (확정 규칙)
1. 경계 시각 T(예: UTC 04:00) 도달.
2. **유예 15초** 후 REST로 최근 3개 4H 캔들 조회.
3. `candle_date_time_utc == T - 4h`인 캔들을 "확정 봉"으로 저장. 없으면 30초 간격 3회 재시도 → 그래도 없으면 `DATA_GAP` 경보, 해당 봉 신호 생략.
4. 저장된 확정 봉과 직전 봉이 연속(4시간 간격)인지 검사. 결측·중복·역순이면 `quality_flag` 기록 후 신호 생략.
5. 이미 처리한 `(strategy_version, candle_ts)`면 재처리하지 않음(유일키).
6. 재기동 시: 마지막 저장 봉 이후를 REST 백필 → 품질 검사 → **백필 중 놓친 봉으로는 신규 진입하지 않음**(지나간 신호 소급 체결 금지). 손절은 현재가 기준 즉시 재평가.

### 6.3 실시간 데이터
- WebSocket `ticker`(또는 `trade`)로 현재가 수신 → 손절/추적손절 감시, 데이터 최신성 판정.
- `orderbook`은 PaperBroker 체결 시뮬레이션에 사용(호가창 VWAP, §5.4). 마지막 호가 수신 5초 초과 시 `REJECT_ORDERBOOK_STALE`.
- 재연결: 지수 백오프(1, 2, 4, … 최대 60초) + 지터. 재연결 성공 시 경보 해제 알림.

---

## 7. 상태 머신과 모드

### 7.1 모드
| 모드 | 신규 매수 | 자동 청산 | 비고 |
|---|---|---|---|
| `BACKTEST` | 과거 데이터 | 과거 데이터 | 별도 CLI 실행 |
| `PAPER` | 허용 | 허용 | 기본 |
| `SAFE_PAUSED` | 금지 | 허용 | 낙폭 한도, 대사 불일치, 반복 오류 |
| `EMERGENCY_STOP` | 금지 | **금지** | 운영자 `/stop`. 기록·감시는 계속 |
| `SHADOW`, `LIVE_ARMED` | — | — | **MVP 범위 외**, enum에도 넣지 않음 |

### 7.2 전이 규칙
| 전이 | 트리거 | 주체 |
|---|---|---|
| PAPER → SAFE_PAUSED | 낙폭 −8%, 대사 불일치, 동일 오류 5분 내 5회 | 시스템 자동 |
| SAFE_PAUSED → PAPER | 대사 통과 + 운영자 `/resume` + 확인 코드 | 운영자 |
| 어떤 모드 → EMERGENCY_STOP | `/stop` 또는 대시보드 버튼 또는 `STOP` 파일 생성 | 운영자 |
| EMERGENCY_STOP → SAFE_PAUSED | `/resume` + 확인 코드 (곧장 PAPER로 가지 않음) | 운영자 |

- 현재 모드는 DB에 영속화하고, 재기동 시 **이전 모드를 복원**한다(재기동했다고 PAPER로 돌아가지 않음).
- 비상정지는 웹이 죽어도 동작해야 하므로 **텔레그램 명령 + 로컬 `STOP` 파일** 두 경로를 둔다.

### 7.3 실거래 차단 (구체화)
1. MVP 저장소에 `LiveBroker` 구현·스텁·HTTP 주문 호출이 **존재하지 않는다**.
2. CI에서 금지 패턴 검사: `/v1/orders`, `UPBIT_ACCESS_KEY`, `UPBIT_SECRET_KEY`, `jwt.encode` 등이 `backend/`에 등장하면 실패.
3. `TRADING_MODE` 환경변수는 `PAPER`만 허용, 다른 값이면 기동 거부.

---

## 8. 운영 인터페이스 (1인 운영 최적화)

### 8.1 텔레그램 봇 (1차 콘솔)
- 허용 `chat_id` 화이트리스트 1개. 그 외 메시지는 무시 + 감사로그.
- 명령: `/status`(모드·포지션·순자산·데이터 상태), `/pnl`(오늘·누적), `/risk`(한도 사용률), `/pause`, `/resume`, `/stop`, `/report`.
- `/resume`, `/stop`은 2단계 확인(봇이 4자리 코드를 보내고 그대로 회신해야 실행).
- 자동 알림(심각도별):
  - **즉시**: 모드 전환, 체결, 손절, 데이터 단절 60초+, 대사 불일치, 예외 반복.
  - **일일 09:00 KST 요약**: 순자산, 오늘 손익, 거래, 거절 사유 Top3, 가동률, 경보 수.
  - **주간 월요일 09:00**: 주간 성과, 노출 동일화 벤치마크 대비, 백테스트-모의 일치도.
- 알림 폭주 방지: 동일 경보는 10분 내 1회로 묶음.

### 8.2 경량 웹 대시보드 (읽기 위주)
1. **홈**: 모드 배지(가장 크게), 데이터 연결 상태, 순자산, 오늘/누적 실현·미실현 PnL, 현재 낙폭, 비상정지 버튼(상단 고정).
2. **거래 내역**: 신호 시각·사유·가격·수량·수수료·체결·손익, CSV 내보내기.
3. **리스크 센터**: 한도별 사용률, 연속 손실 카운트, 중지 사유와 해제 예정 시각.
4. **전략/리포트**: 승인된 전략 버전·체크섬, 백테스트·워크포워드 리포트(HTML 정적 파일 링크).
5. **감사 로그**: 최근 이벤트 검색.
- 인증: Tailscale/Cloudflare Access 뒤에 두고, 앱 자체 로그인(비밀번호 해시 + 세션)도 유지. 상태 변경 API는 CSRF 토큰 필수.
- 측정되지 않은 수익률·샘플 차트를 실제 값처럼 표시하지 않는다(값이 없으면 "데이터 없음").

### 8.3 외부 하트비트 (Dead man's switch)
- 메인 루프가 1분마다 외부 모니터 URL에 ping. 5분 이상 ping이 없으면 외부 서비스가 운영자에게 알림(이메일/텔레그램).
- ping은 "프로세스가 살아 있음"이 아니라 **"최근 60초 내 시세를 받았고 DB 쓰기가 성공함"**일 때만 보낸다.
- `/health` 엔드포인트: DB, WebSocket, 마지막 확정 봉 시각, 모드를 JSON으로 반환.

---

## 9. AI 역할과 협업 체계 (실제 운영 흐름 반영)

| 역할 | 담당 | 권한/제약 |
|---|---|---|
| 기획 초안·구현 | **ChatGPT (Codex 포함)** | PR 단위 구현. 실거래·키 관련 코드 작성 금지 |
| 리뷰·보완·테스트 강화 | **Claude (Claude Code)** | `docs/review/REVIEW_CHECKLIST.md` 기준 리뷰, 결함 수정 커밋, 다음 PR 지시서 작성 |
| 전략 연구 보조 | 두 모델 모두 | 리포트 작성만. 파라미터 변경은 운영자 승인 후 버전 고정 |
| 운영 관리자 | **사용자** | 전략 승인, 모드 재개, 비상정지, PR 병합 |

- 저장소 루트 `AGENTS.md`에 양쪽 AI가 지켜야 할 규칙을 둔다(Codex·Claude Code 모두 읽음).
- 결정 사항은 `docs/DECISIONS.md`에 한 줄 ADR로 누적한다(누가 무엇을 왜 바꿨는지 AI 교대 시 맥락 유실 방지).
- 모델이 새 전략을 제시해도 자동 배포하지 않는다.

---

## 10. 데이터 모델

| 테이블 | 주요 컬럼 | 제약 |
|---|---|---|
| `candles` | market, timeframe, open_ts_utc, open, high, low, close, volume, source, ingested_at, quality_flag | UNIQUE(market, timeframe, open_ts_utc) |
| `strategies` | strategy_id, version, parameters_json, checksum, status(draft/approved/retired), approved_by, approved_at | UNIQUE(strategy_id, version) |
| `research_trials` | trial_id, strategy_id, parameters_json, data_range, metrics_json, created_at | 과적합 추적용, 삭제 금지 |
| `signals` | signal_id, strategy_version, candle_ts, side, reason_json, created_at | UNIQUE(strategy_version, candle_ts, side) |
| `risk_decisions` | signal_id, decision(enum §5.3), equity, risk_budget, computed_qty, limits_json, checked_at | signal_id FK |
| `order_intents` | order_intent_id, signal_id, mode, market, side, planned_qty, planned_price, state | UNIQUE(signal_id) |
| `orders` | order_id, order_intent_id, identifier, status(NEW/PARTIAL/FILLED/CANCELLED/REJECTED/UNKNOWN), submitted_at, updated_at | |
| `fills` | fill_id, order_id, qty, price, fee, filled_at | |
| `positions` | market, qty, avg_entry, stop_price, trail_high, opened_at, updated_at | |
| `trades` | trade_id, entry_fill_ids, exit_fill_ids, gross_pnl, fees, net_pnl, exit_reason | 연속 손실 계산 근거 |
| `equity_snapshots` | ts, cash, holdings_value, total_equity, peak_equity, drawdown | 1분 + 매 체결 |
| `system_state` | key, value, updated_at | 현재 모드, 일일 시작 자산, 연속 손실 카운트 등 |
| `audit_events` | ts, actor(system/operator/strategy), event, object_id, before_json, after_json, trace_id | append-only |
| `alerts` | ts, type, severity, message, dedupe_key, sent_at, acknowledged_at | |

- 금액·가격·수량: 주문/정산 경로는 `Decimal`(DB는 TEXT 또는 NUMERIC). 지표 계산은 float 허용, **Risk Gate 진입 시 Decimal 변환**.
- 시간: DB는 UTC, 표시는 KST.

---

## 11. 백테스트/모의매매 검증 기준

### 11.1 데이터
- 업비트 KRW-BTC 4H 데이터를 가능한 최대 기간 수집(최소 3년 목표, 상승·하락·횡보 포함). 수집 후 결측률 리포트.
- 데이터 분할: 시간순 **학습 60% / 검증 20% / 최종 평가 20%**. 최종 평가 구간은 파라미터 확정 전까지 한 번도 실행하지 않는다.

### 11.2 체결 시뮬레이션 규칙 (확정)
- 비용은 §5.4 공통 설정을 쓴다. 수수료는 매수·매도 체결대금 각각에 `f`를 부과한다.
- 신호는 봉 t 종가 확정 후 발생 → **봉 t+1 시가 × (1 + s)**로 체결. 수량은 §5.2 공식에 `entry = 봉 t+1 시가`를 넣어 계산.
- 손절: 보유 중 봉의 저가 ≤ 손절가면 체결가 = `min(손절가, 해당 봉 시가) × (1 − s)` (갭 하락 반영).
- 그 외 청산(추세 이탈·시간 제한·익절)은 해당 신호 봉 다음 봉 시가 × (1 − s).
- 동일 봉에서 손절과 익절이 모두 가능하면 **손절이 먼저 발생한 것으로 처리**(보수적).
- 추적손절 갱신은 봉 마감 후에만 반영(같은 봉 고가로 끌어올린 뒤 같은 봉 저가로 청산하는 낙관적 처리 금지).
- 비용 시나리오 2종은 §5.4의 `base`(s 0.1%)와 `conservative`(s 0.2%). 보수 시나리오에서도 순손익이 음수면 탈락.

### 11.3 벤치마크
- 100% BTC 보유(참고용)
- **노출 동일화 BTC 보유**: 전략의 평균 노출 비율만큼 BTC를 상시 보유했을 때 성과 → 이것을 이겨야 "전략이 의미 있다"고 판단.
- 현금 보유(0%).

### 11.4 워크포워드 & 선정 게이트
- 워크포워드: 학습 12개월 / 검증 3개월 / 3개월씩 이동. 각 창에서 학습 구간 최적 파라미터로 다음 검증 구간 실행, 검증 구간 결과만 이어 붙여 평가.
- **선정 게이트(전부 충족)**: 워크포워드 OOS 순손익 > 0(보수 비용), Profit Factor ≥ 1.2, 노출 동일화 벤치마크 대비 MDD 개선 또는 수익 우위, 총 거래 ≥ 30회, 파라미터 ±20% 변경 시 순손익 부호 유지(견고성). 미충족 시 "선정 전략 없음"도 정상 결과로 보고한다.

### 11.5 모의매매 목적 재정의
- 30일 모의매매는 **전략 수익성 증명이 아니다**(4H 전략은 30일에 거래가 몇 건에 불과).
- 모의매매 단계의 합격 기준:
  1. 30일 연속 가동, 고위험 미해결 오류 0건, 주문 중복 0건.
  2. **Parity 검사**: 모의 기간 데이터를 백테스터로 재생했을 때 신호가 100% 일치, 체결가 차이 평균 0.3% 이내.
  3. 로그 완전성: 모든 signal → risk_decision → (order_intent → order → fill) 연결 확인.

---

## 12. 필수 장애/보안 테스트

| 시나리오 | 기대 동작 | 테스트 위치 |
|---|---|---|
| WebSocket 60초+ 단절 | 신규 매수 금지, 경보, 복구 후 자동 해제 알림 | failure |
| 4H 확정 봉 미수신 | 재시도 3회 후 DATA_GAP, 신호 생략 | failure |
| 결측·중복·역순 캔들 | 신호 생략, quality_flag 기록 | unit |
| REST 429/5xx | 지수 백오프, 재시도 상한, `Remaining-Req` 반영 | integration(모의 서버) |
| 프로세스 2개 동시 기동 | 두 번째 즉시 종료 | integration |
| 같은 봉 신호 2회 처리 | 유일키로 주문 1회만 | unit |
| 재기동 | 모드·포지션·손절가 복원, 백필 봉 소급 진입 없음 | integration |
| 갭 하락으로 손절가 이탈 | 손절가보다 낮게 체결, 손실 > 0.5% 가능함을 기록 | unit |
| 일일 −2% / 낙폭 −8% / 연속 3패 | 각각 정해진 차단·해제 동작 | unit |
| 호가 데이터 5초+ 지연 | `REJECT_ORDERBOOK_STALE` | unit |
| 호가창 VWAP 슬리피지 > s | `REJECT_SLIPPAGE_EXCEEDED`, 실측 슬리피지 기록 | unit |
| 수량 계산 사후 검증 실패 | `REJECT_SIZING_INVARIANT` + 경보 | unit |
| `/stop` | 신규 주문·자동 청산 차단, 감시·기록 유지 | integration |
| 비인가 chat_id 명령 | 무시 + 감사로그 | unit |
| 비밀값 로그 출력 | 로그 포매터가 토큰류 마스킹 | unit |
| CI 금지 패턴 | 실주문 코드 존재 시 CI 실패 | CI |
| 시계 오차 | 기동 시 NTP 오차 2초 초과면 경고 | integration |

---

## 13. 개발 단계와 통과 기준

| 단계 | 내용 | 통과 기준 |
|---|---|---|
| P0 | 저장소, `pyproject`, ruff/mypy/pytest, CI, `.env.example`, 금지 패턴 검사, `AGENTS.md` | `make lint test` 통과, 금지 패턴 검사 동작 |
| P1 | REST 백필, WebSocket 수신, 4H 마감 판정, 품질 검사, SQLite 저장 | 실제 API로 3년 백필 성공, 결측 리포트, §6.2 테스트 통과 |
| P2 | 지표(참조값 테스트), 전략 A/B/C, 백테스터(§11.2), 비용 모델, 벤치마크, 워크포워드, HTML/CSV 리포트 | 동일 입력 → 동일 결과(해시 비교), 미래 데이터 참조 테스트 통과 |
| P3 | Risk Gate(§5), PaperBroker, 주문 상태 머신, 손익, 모드 전환 | §5.2 골든 케이스·§12 해당 테스트 전부 통과 |
| P4 | 텔레그램 봇, 하트비트, 일일·주간 리포트 | 실제 휴대폰으로 알림·명령 확인 |
| P5 | 경량 웹 대시보드 + 인증 | 모바일 브라우저에서 홈·비상정지 확인 |
| P6 | 30일 모의 운영 + Parity 검사 | §11.5 기준 충족 |
| P7 | 실거래 검토 (범위 외) | **이 문서로 착수·승인 불가.** 별도 PRD 필요 |

---

## 14. 개발 작업 지시 및 인수인계

### 14.1 구현 담당(ChatGPT)에게 주는 공통 지시
> 프로젝트 `aegis-trade-ai`. 업비트 KRW-BTC 현물 **PAPER 전용** 자동매매 시스템을 이 PRD(v1.1)대로 구현한다. API 키를 요청·저장·사용하지 않고, 실주문 코드·스텁을 만들지 않는다. 확정 4H 봉만 진입 신호에 사용한다. §5의 한도와 §5.2 공식·골든 케이스, §5.3 거절 코드, §6.2 마감 판정, §11.2 체결 규칙을 그대로 구현하고 테스트한다. `[검증 필요]` 항목은 실제 API 호출 결과로 확인하고 결과를 PR 설명에 적는다. 성과 수치를 실제 실행 없이 만들어내지 않는다. 각 PR 설명에 **변경 요약 / 실행한 테스트와 결과 / 미검증 항목 / 다음 PR 전제조건**을 적는다.

### 14.2 폴더 구조
```
aegis-trade-ai/
  AGENTS.md
  pyproject.toml
  Makefile
  docker-compose.yml
  .env.example
  config/{risk.yaml, strategies/, app.yaml}
  backend/app/
    core/        # 설정, 로깅(마스킹), 시간, Decimal 유틸, 락
    market_data/ # rest.py, ws.py, candle_close.py, quality.py
    indicators/
    strategies/  # base.py, trend_a.py, meanrev_b.py, breakout_c.py
    backtest/    # engine.py, costs.py, walkforward.py, benchmark.py, report.py
    risk/        # gate.py, sizing.py, limits.py, codes.py
    brokers/     # paper.py  (live 없음)
    execution/   # order_state.py, reconcile.py
    ops/         # telegram.py, heartbeat.py, reports.py, modes.py
    api/         # FastAPI 라우터, 대시보드 템플릿
    db/          # models.py, migrations/
  tests/{unit,integration,failure,golden}/
  docs/{prd,handoff,review,DECISIONS.md,RUNBOOK.md}
  scripts/       # backfill.py, run_backtest.py, parity_check.py
```

### 14.3 PR 분해 (구현 → 리뷰 순환)
| PR | 내용 | 구현 | 리뷰 포인트 |
|---|---|---|---|
| PR-01 | 저장소·품질도구·CI·금지패턴·모드 enum·설정 로딩 | ChatGPT | 실거래 차단, 설정 체크섬 |
| PR-02 | REST 백필·WebSocket·4H 마감·품질검사 | ChatGPT | 경계 시각 실측, 유일키, 재기동 |
| PR-03 | 지표 + 전략 A/B/C | ChatGPT | 미래 참조, 참조값 테스트 |
| PR-04 | 백테스터·비용·벤치마크·워크포워드·리포트 | ChatGPT | §11.2 규칙, 재현성 |
| PR-05 | Risk Gate + 골든 테스트 | ChatGPT | §5 전 항목, Decimal |
| PR-06 | PaperBroker·주문 상태·포지션·모드 전환 | ChatGPT | 중복·재기동·대사 |
| PR-07 | 텔레그램·하트비트·리포트 | ChatGPT | 인증, 알림 폭주 방지 |
| PR-08 | 경량 대시보드·인증 | ChatGPT | CSRF, 노출 범위 |
| PR-09 | 장애 시나리오 통합 테스트·RUNBOOK·Parity 스크립트 | ChatGPT | §12 전체 |

각 PR은 Claude 리뷰 → 보완 커밋 → 운영자 병합 후 다음 PR 착수.

---

## 15. 비용 관리
- 외부 자동매매 유료 구독: 0원 목표.
- 공개 시세 API: 별도 이용료 없음(정책 변경 확인).
- 로컬/집 PC 운영: 서버비 0원(전기·네트워크 별도, PC 절전 해제 필요).
- 24시간 상시 운영: 소형 VPS(월 수천~1만 원대) 권장. 고정 IP는 실거래 단계에서만 필요.
- 텔레그램·외부 하트비트: 무료 플랜으로 충분.
- AI 비용: 매매 루프에서 LLM 호출 없음. 개발 단계 구독 비용만.
- 실거래 시 수수료·슬리피지·세금은 별도이며 최신 정책 확인.

## 16. 공식 참고 자료 (2026-10-31 검토, 구현 시 재확인)
- Upbit WebSocket 가이드: https://docs.upbit.com/kr/reference/websocket-guide
- Upbit KRW 최소 주문 및 호가: https://docs.upbit.com/kr/docs/krw-market-info
- Upbit API 요청 제한: https://docs.upbit.com/kr/v1.6.4/reference/rate-limits
- Upbit AI Agent 개요: https://docs.upbit.com/kr/docs/upbit-ai-agent-overview
- Upbit Strategy Toolkit: https://docs.upbit.com/kr/v1.6.4/docs/upbit-strategy-toolkit
- (P7 참고) 주문 생성: https://docs.upbit.com/kr/reference/new-order · 주문 테스트: https://docs.upbit.com/kr/kr/reference/order-test · 인증: https://docs.upbit.com/kr/reference/auth

**현재 상태**: 기획서 v1.1 확정 대기. 저장소 코드 구현, 업비트 계정 연결, 실거래, 모의거래 가동은 아직 수행하지 않음.
