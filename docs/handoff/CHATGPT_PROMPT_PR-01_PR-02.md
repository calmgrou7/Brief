# ChatGPT 구현 지시서 — PR-01, PR-02

> 사용법: 아래 "복사 영역" 전체를 ChatGPT(또는 Codex)에 붙여넣고, `docs/prd/AEGIS_TRADE_AI_PRD_v1.1.md` 파일을 함께 첨부한다.
> 결과물(코드/PR)이 나오면 Claude에게 "PR-01 리뷰해줘"라고 요청한다.

---

## 복사 영역

첨부한 `AEGIS_TRADE_AI_PRD_v1.1.md`가 유일한 기준 문서다. 이번 작업은 **PR-01과 PR-02만** 구현한다. 그 외 기능(전략, 백테스트, Risk Gate, 브로커, 텔레그램, 대시보드)은 만들지 않는다.

### 절대 규칙
- 업비트 API 키를 요청·저장·사용하지 않는다. 주문 API(`/v1/orders` 등) 호출 코드, LiveBroker 스텁, JWT 서명 코드를 만들지 않는다.
- 실행하지 않은 테스트 결과나 성과 수치를 만들어 쓰지 않는다.
- PRD에 없는 결정을 했다면 `docs/DECISIONS.md`에 한 줄로 남긴다.

### PR-01: 저장소 기반
1. PRD §14.2 폴더 구조 생성(이번 PR에 필요한 것만 실제 파일, 나머지는 빈 패키지).
2. `pyproject.toml`(Python 3.12, 의존성 버전 고정), `Makefile`(`make install / lint / test / run`), ruff·mypy·pytest 설정.
3. GitHub Actions CI: lint + test + **금지 패턴 검사 스크립트** `scripts/check_forbidden.py` (PRD §7.3: `backend/` 안에 `/v1/orders`, `UPBIT_ACCESS_KEY`, `UPBIT_SECRET_KEY`, `jwt.encode` 등장 시 실패). 이 스크립트 자체를 검증하는 테스트 포함.
4. `backend/app/core/`: 설정 로더(`config/app.yaml`, `config/risk.yaml` + 환경변수), `TRADING_MODE != PAPER`이면 기동 거부, 설정 파일 SHA-256 체크섬 계산 함수, 비밀값 마스킹 로깅 포매터, UTC/KST 시간 유틸, 단일 인스턴스 락(파일 락).
5. 모드 enum: `BACKTEST, PAPER, SAFE_PAUSED, EMERGENCY_STOP` 4개만.
6. SQLite(WAL) + SQLAlchemy 2.x + Alembic 초기 마이그레이션: `candles`, `system_state`, `audit_events` 테이블(PRD §10 컬럼·유일키 그대로).
7. `.env.example`(키 항목 없음), `README.md`(설치·실행·테스트 방법), `docker-compose.yml`(`restart: unless-stopped`).

### PR-02: 시세 수집과 4시간봉 정합성
1. `market_data/rest.py`: `GET /v1/candles/minutes/240` 클라이언트. 200개 페이지네이션(`to`), 타임아웃, 429/5xx 지수 백오프+재시도 상한, `Remaining-Req` 헤더 파싱 후 속도 조절.
2. `scripts/backfill.py`: KRW-BTC 4H 데이터를 가능한 최대 기간 백필 → DB 저장(유일키로 중복 무시) → 결측률·기간 리포트 출력.
3. `market_data/quality.py`: 결측/중복/역순/OHLC 모순(high < max(open,close) 등) 검사, `quality_flag` 기록.
4. `market_data/candle_close.py`: PRD §6.2 규칙 그대로(경계 + 15초 유예 → REST 재조회 → 확정 봉 저장 → 실패 시 30초×3회 재시도 → `DATA_GAP`). 재기동 시 백필 후 "놓친 봉 소급 신호 없음" 플래그 제공.
5. `market_data/ws.py`: `wss://api.upbit.com/websocket/v1` `ticker`+`orderbook` 구독, 주기적 PING, 지수 백오프 재연결(최대 60초, 지터), 마지막 수신 시각을 노출(최신성 판정용).
6. **[검증 필요] 항목을 실제 공개 API 호출로 확인**하고 결과를 PR 설명에 표로 적는다: 4H 봉 경계 시각(UTC), 1회 최대 개수, `Remaining-Req` 형식, WebSocket 무응답 타임아웃, 가장 오래된 KRW-BTC 4H 봉 시각.
7. 테스트: 네트워크 없이 도는 단위 테스트(응답 픽스처), 결측·중복·역순 캔들 케이스, 경계 시각 계산, 재시도/백오프(가짜 서버), 유일키 중복 저장 방지. 실제 API를 치는 테스트는 `@pytest.mark.live`로 분리해 CI 기본 실행에서 제외.

### PR 설명 양식 (반드시 포함)
- 변경 요약
- 실행한 명령과 결과 (`make lint`, `make test` 출력 요약)
- [검증 필요] 확인 결과 표
- 미검증/남은 제약
- 다음 PR(PR-03) 전제조건
