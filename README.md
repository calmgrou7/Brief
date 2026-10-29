# Bybit 선물 자동매매 봇 (테스트넷 우선)

Bybit USDT 무기한 선물을 24시간 자동매매하는 봇입니다. **기본값은 테스트넷(가짜 돈)** 이며,
실거래로 바꾸려면 별도의 확인 문구를 넣어야만 동작합니다.

> ⚠️ 이 봇은 수익을 보장하지 않습니다. 선물은 레버리지로 인해 원금 전액 손실이 가능합니다.
> 테스트넷에서 최소 1~2주 검증 후, 잃어도 되는 소액으로만 실거래하세요.

## 동작 방식

| 항목 | 내용 |
|---|---|
| 전략 | EMA20 / EMA50 교차 + RSI 과열 필터 (마감된 캔들 기준, 캔들당 1회 판단) |
| 진입 | 시장가, **손절·익절을 거래소에 같이 걸어둠** → 봇이 꺼져도 포지션 보호 |
| 청산 | 손절/익절 도달 또는 반대 신호 시 반대 포지션으로 전환 |
| 수량 | 손절 시 잔고의 1%만 잃도록 자동 계산 (증거금은 잔고의 90% 이내) |
| 일일 손실 한도 | 하루(KST) 잔고 -5% 도달 시 포지션 정리 후 그날 거래 중지 (재시작해도 유지) |
| 오류 처리 | 네트워크 오류 자동 재시도, 어떤 오류에도 루프 유지, 연속 오류 시 텔레그램 알림 |
| 알림 | 시작/진입/청산/오류/일일 손익을 텔레그램으로 |

모든 값은 `.env` 에서 바꿀 수 있습니다 (`.env.example` 참고).

## 1단계: 테스트넷 API 키 발급

1. https://testnet.bybit.com 가입 (실계정과 별개)
2. 우측 상단 계정 → **API** → **Create New Key** → *System-generated API Keys*
3. 권한: **Read-Write**, **Contract(Orders, Positions)** 체크. 출금 권한은 없음
4. 테스트넷 자산 페이지에서 테스트용 USDT 받기 (Faucet / Request Test Coins)

## 2단계: 내 PC에서 점검

**Python 3.13 을 사용하세요.** 3.14 이상은 일부 의존성(zlib-ng, cffi)의 Windows 설치 파일이 아직 없어
설치가 실패합니다. 다른 버전이 이미 깔려 있어도 3.13 을 추가로 설치하면 됩니다.

```bash
git clone <이 레포> && cd Brief
py -3.13 -m venv .venv && .venv\Scripts\activate     # Windows
# python3.13 -m venv .venv && source .venv/bin/activate   # Mac/Linux
pip install -r requirements-dev.txt
cp .env.example .env        # 그리고 .env 에 API 키 입력

pytest -q                   # 오프라인 테스트
python -m bot.check         # 거래소 연결 점검 (주문 안 넣음)
python backtest.py --days 90  # 과거 90일 백테스트 (API 키 불필요)
python -m bot.main          # 봇 실행 (Ctrl+C 로 종료)
```

## 3단계: 서버에서 24시간 운영

월 5~7달러 VPS (AWS Lightsail, Vultr 등) 또는 Oracle Cloud 무료 티어의 Ubuntu 기준:

```bash
curl -fsSL https://get.docker.com | sh
git clone <이 레포> && cd Brief
cp .env.example .env && nano .env     # 키 입력
docker compose up -d --build          # 백그라운드 실행, 서버 재부팅/오류 시 자동 재시작
docker compose logs -f                # 로그 보기
docker compose down                   # 중지 (거래소에 걸린 손절/익절은 유지됨)
```

## 텔레그램 알림 설정 (선택)

1. 텔레그램에서 `@BotFather` → `/newbot` → 토큰을 `TELEGRAM_BOT_TOKEN` 에
2. 만든 봇에게 아무 메시지나 보낸 뒤 `https://api.telegram.org/bot<토큰>/getUpdates` 를 열어
   `"chat":{"id": ...}` 값을 `TELEGRAM_CHAT_ID` 에

## 실거래 전환 (충분히 검증한 뒤에만)

1. 실계정 API 키: 출금 권한 OFF, **서버 IP만 허용(IP 화이트리스트)**
2. `.env`: `BYBIT_TESTNET=false`, `LIVE_TRADING_CONFIRM=I_UNDERSTAND_THE_RISK`
3. 레버리지 낮게(2~3x), 소액으로 시작

## 파일 구조

```
bot/config.py     설정 (.env)
bot/strategy.py   EMA/RSI/ATR 지표와 신호
bot/risk.py       수량 계산, 일일 손실 한도
bot/exchange.py   Bybit 연결 (ccxt), 재시도
bot/notifier.py   텔레그램
bot/main.py       24시간 메인 루프
bot/check.py      연결 점검
backtest.py       백테스트
tests/            오프라인 테스트
```

## 알아둘 한계

- 백테스트는 캔들 종가 체결을 가정합니다. 실제는 슬리피지와 펀딩비가 추가로 붙습니다.
- 계정은 단방향(One-Way) 포지션 모드를 전제로 합니다 (Bybit 기본값).
- 봇이 관리하는 심볼에서 수동으로 거래하면 봇 판단이 꼬일 수 있습니다.
