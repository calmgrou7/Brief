"""Connection check without trading: python -m bot.check"""
from datetime import datetime

from .config import Config
from .exchange import BybitFutures
from .notifier import Notifier
from .risk import KST
from .strategy import add_indicators, ohlcv_to_df


def main() -> None:
    cfg = Config.from_env()
    cfg.validate()
    print(f"모드: {'테스트넷' if cfg.testnet else '⚠️ 실거래'} / {cfg.symbol} {cfg.timeframe} {cfg.leverage}x")

    ex = BybitFutures(cfg)
    ex.setup()
    print("✅ 마켓 로드 + 레버리지 설정 OK")
    print(f"✅ USDT 잔고: {ex.equity_usdt():.2f}")
    pos = ex.position()
    print(f"✅ 현재 포지션: {pos if pos else '없음'}")
    print(f"✅ 최소 주문 수량: {ex.min_amount()}")

    df = add_indicators(ohlcv_to_df(ex.fetch_closed_candles()), cfg)
    last = df.iloc[-1]
    ts = datetime.fromtimestamp(last["timestamp"] / 1000, KST)
    print(f"✅ 마지막 캔들 {ts:%Y-%m-%d %H:%M} 종가 {last['close']:.2f} "
          f"EMA{cfg.ema_fast} {last['ema_fast']:.2f} / EMA{cfg.ema_slow} {last['ema_slow']:.2f} "
          f"RSI {last['rsi']:.1f}")

    notifier = Notifier(cfg.telegram_token, cfg.telegram_chat_id)
    if notifier.enabled:
        notifier.send("✅ 연결 테스트 메시지")
        print("✅ 텔레그램 테스트 메시지 전송 (휴대폰 확인)")
    else:
        print("ℹ️ 텔레그램 미설정 (선택 사항)")
    print("\n모든 점검 통과. 주문은 넣지 않았습니다.")


if __name__ == "__main__":
    main()
