"""Bot entry point: python -m bot.main"""
import logging
import os
import signal
import sys
import time
from logging.handlers import RotatingFileHandler

import ccxt

from .config import Config
from .exchange import BybitFutures
from .notifier import Notifier
from .risk import DailyGuard, position_size
from .strategy import generate_signal, ohlcv_to_df

log = logging.getLogger("bot")

MAX_CONSECUTIVE_ERRORS = 5


def setup_logging(log_file: str) -> None:
    os.makedirs(os.path.dirname(log_file) or ".", exist_ok=True)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(fmt)
    file = RotatingFileHandler(log_file, maxBytes=5_000_000, backupCount=5, encoding="utf-8")
    file.setFormatter(fmt)
    root.handlers = [stream, file]


class TradingBot:
    def __init__(self, cfg: Config, exchange: BybitFutures, notifier: Notifier, guard: DailyGuard):
        self.cfg = cfg
        self.ex = exchange
        self.notify = notifier
        self.guard = guard
        self.running = True
        self.errors = 0

    def step(self) -> None:
        """One iteration: check equity/kill switch, then act at most once per closed candle."""
        equity = self.ex.equity_usdt()
        halted, event = self.guard.update(equity)
        pos = self.ex.position()

        if event == "new_day":
            prev = self.guard.get("prev_day")
            if prev and prev.get("start_equity"):
                pnl = prev["end_equity"] - prev["start_equity"]
                self.notify.send(f"📊 {prev['day']} 마감: {pnl:+.2f} USDT "
                                 f"({pnl / prev['start_equity'] * 100:+.2f}%), 잔고 {equity:.2f}")
        if event == "tripped":
            self.notify.send(f"🛑 일일 손실 한도 {self.cfg.max_daily_loss * 100:.0f}% 도달. "
                             f"포지션 정리 후 오늘(KST) 거래 중지. 잔고 {equity:.2f}")
        if halted:
            if pos:  # retried every loop until the position is really gone
                self.ex.cancel_all()
                self.ex.close_position(pos)
            return

        candles = self.ex.fetch_closed_candles()
        if not candles:
            return
        last_ts = candles[-1][0]
        if self.guard.get("last_candle_ts") == last_ts:
            return  # already evaluated this candle
        self.guard.set("last_candle_ts", last_ts)

        sig = generate_signal(ohlcv_to_df(candles), self.cfg)
        if sig is None:
            return
        log.info("신호: %s @ %.2f (%s)", sig.side, sig.entry, sig.reason)

        if pos and pos.side == sig.side:
            log.info("이미 같은 방향 포지션 보유 중, 무시")
            return
        if pos:
            self.ex.cancel_all()
            self.ex.close_position(pos)
            self.notify.send(f"🔄 반대 신호로 {pos.side} 청산 (미실현 {pos.unrealized_pnl:+.2f} USDT)")
            equity = self.ex.equity_usdt()

        qty = self.ex.round_amount(position_size(
            equity, sig.entry, sig.stop_loss, self.cfg.leverage,
            self.cfg.risk_per_trade, self.cfg.max_position_pct))
        if qty <= 0 or qty < self.ex.min_amount():
            self.notify.send(f"⚠️ 주문 수량 부족({qty}). 잔고 {equity:.2f} USDT로는 최소 주문 불가")
            return

        order = self.ex.open_position(sig.side, qty, sig.stop_loss, sig.take_profit)
        self.notify.send(
            f"{'🟢 롱' if sig.side == 'long' else '🔴 숏'} 진입 {self.cfg.symbol}\n"
            f"수량 {qty} @ ~{sig.entry:.2f}\n손절 {sig.stop_loss:.2f} / 익절 {sig.take_profit:.2f}\n"
            f"사유: {sig.reason}\n주문ID: {order.get('id')}")

    def run(self) -> None:
        mode = "테스트넷" if self.cfg.testnet else "⚠️실거래"
        self.notify.send(f"🚀 봇 시작 [{mode}] {self.cfg.symbol} {self.cfg.timeframe} {self.cfg.leverage}x")
        while self.running:
            try:
                self.step()
                self.errors = 0
            except ccxt.AuthenticationError as e:
                self.notify.send(f"❌ API 키 인증 실패, 봇 종료: {e}")
                raise
            except Exception as e:  # keep the 24/7 loop alive on any other error
                self.errors += 1
                log.exception("루프 오류 (%d연속)", self.errors)
                if self.errors in (1, MAX_CONSECUTIVE_ERRORS) or self.errors % 50 == 0:
                    self.notify.send(f"⚠️ 오류 {self.errors}회 연속: {type(e).__name__}: {e}")
            self._sleep(self.cfg.poll_seconds * (1 if self.errors < MAX_CONSECUTIVE_ERRORS else 3))
        self.notify.send("⏹ 봇 정상 종료 (거래소에 걸린 손절/익절 주문은 유지됩니다)")

    def _sleep(self, seconds: float) -> None:
        end = time.time() + seconds
        while self.running and time.time() < end:
            time.sleep(min(1.0, end - time.time()))

    def stop(self, *_):
        log.info("종료 신호 수신")
        self.running = False


def main() -> None:
    cfg = Config.from_env()
    setup_logging(cfg.log_file)
    cfg.validate()
    notifier = Notifier(cfg.telegram_token, cfg.telegram_chat_id,
                        prefix="[TEST] " if cfg.testnet else "[LIVE] ")
    exchange = BybitFutures(cfg)
    exchange.setup()
    bot = TradingBot(cfg, exchange, notifier, DailyGuard(cfg.state_file, cfg.max_daily_loss))
    signal.signal(signal.SIGTERM, bot.stop)
    signal.signal(signal.SIGINT, bot.stop)
    bot.run()


if __name__ == "__main__":
    main()
