# 암호화폐 선물 자동매매 봇 (Lighter / Bybit, 테스트넷 우선)

무기한 선물을 24시간 자동매매하는 봇입니다. 거래소는 `.env` 의 `EXCHANGE` 로 고릅니다.

- **lighter** (기본): 탈중앙 선물 거래소. 이용약관상 한국 제한 없음, 기본 계정 수수료 0.
  주문은 Lighter **API 키**로만 서명하며, 지갑 개인키·시드 문구는 봇에 넣지 않습니다.
- **bybit**: 한국 거주자는 규제로 이용 불가(오류 10024). 코드만 남겨둠.

**기본값은 테스트넷(가짜 돈)** 이며, 실거래로 바꾸려면 별도의 확인 문구를 넣어야만 동작합니다.

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

## 1단계: Lighter 테스트넷 API 키 발급

1. 봇 전용 **새 지갑**을 만듭니다 (MetaMask 등). 시드 문구는 종이에만 적고 누구에게도 보내지 마세요.
2. https://testnet.app.lighter.xyz 에 지갑을 연결하고 테스트 자금을 받습니다.
3. 계정 번호 확인: `python -m bot.lighter_account 0x지갑주소` → `LIGHTER_ACCOUNT_INDEX`
4. 사이트의 **API Keys** 메뉴에서 키를 만듭니다. 키 번호는 **4~254** 중 하나(예: 10)로 하고,
   번호 → `LIGHTER_API_KEY_INDEX`, 개인키(private key) → `LIGHTER_API_PRIVATE_KEY`
5. 서명 라이브러리는 첫 실행 때 PyPI 의 공식 `lighter-sdk` 에서 자동으로 받아 `vendor/` 에 저장합니다
   (해시 검증 포함).

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

1. 실계정 API 키를 새로 발급 (테스트넷 키와 별개). 탈중앙 거래소 이용의 국내 법적 지위는 불분명하니 먼저 확인
2. `.env`: `TESTNET=false`, `LIVE_TRADING_CONFIRM=I_UNDERSTAND_THE_RISK`
3. 레버리지 낮게(2~3x), 소액으로 시작

## 파일 구조

```
bot/config.py     설정 (.env)
bot/strategy.py   EMA/RSI/ATR 지표와 신호
bot/risk.py       수량 계산, 일일 손실 한도
bot/exchange.py   거래소 연결 (ccxt): Lighter / Bybit, 재시도
bot/lighter_signer.py   Lighter 서명 라이브러리 자동 다운로드
bot/lighter_account.py  지갑 주소로 Lighter 계정 번호 조회
bot/notifier.py   텔레그램
bot/main.py       24시간 메인 루프
bot/check.py      연결 점검
backtest.py       백테스트 (lighter 는 수수료 0 으로 계산)
research.py       앞 2/3 로 설정 고르고 뒤 1/3 로 검증
tests/            오프라인 테스트
```

## 알아둘 한계

- 백테스트는 캔들 종가 체결을 가정합니다. 실제는 슬리피지와 펀딩비가 추가로 붙습니다.
- 백테스트용 과거 시세는 Bybit 공개 데이터(USDT 선물)를 씁니다. 로그인이 필요 없어 한국에서도 받아집니다.
- 단방향(One-Way) 포지션을 전제로 합니다. Lighter 는 교차(cross) 마진으로 설정합니다.
- Lighter 시장가 주문은 최악 체결가를 함께 보냅니다 (진입 1%, 손절/익절 2% 범위).
- 봇이 관리하는 심볼에서 수동으로 거래하면 봇 판단이 꼬일 수 있습니다.
