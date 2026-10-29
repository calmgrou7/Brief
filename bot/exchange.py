"""Thin ccxt wrapper for Bybit USDT perpetuals (one-way position mode)."""
import logging
import time
from dataclasses import dataclass

import ccxt

log = logging.getLogger(__name__)


@dataclass
class Position:
    side: str  # "long" / "short"
    contracts: float
    entry_price: float
    unrealized_pnl: float


def retry(fn, *args, attempts: int = 4, base_delay: float = 2.0, **kwargs):
    """Retry on network/rate-limit errors with exponential backoff; other errors raise immediately."""
    for i in range(attempts):
        try:
            return fn(*args, **kwargs)
        except (ccxt.NetworkError, ccxt.RateLimitExceeded) as e:
            if i == attempts - 1:
                raise
            delay = base_delay * (2 ** i)
            log.warning("네트워크 오류, %.0f초 후 재시도 (%d/%d): %s", delay, i + 1, attempts, e)
            time.sleep(delay)


class BybitFutures:
    def __init__(self, cfg, client=None):
        self.cfg = cfg
        self.symbol = cfg.symbol
        self.client = client or ccxt.bybit({
            "apiKey": cfg.api_key,
            "secret": cfg.api_secret,
            "enableRateLimit": True,
            "options": {"defaultType": "swap"},
        })
        if client is None and cfg.testnet:
            self.client.set_sandbox_mode(True)

    def setup(self) -> None:
        retry(self.client.load_markets)
        if self.symbol not in self.client.markets:
            raise ValueError(f"심볼을 찾을 수 없습니다: {self.symbol}")
        try:
            retry(self.client.set_leverage, self.cfg.leverage, self.symbol)
        except ccxt.ExchangeError as e:
            # Bybit returns an error when the leverage is already set to this value.
            if "not modified" not in str(e).lower() and "110043" not in str(e):
                raise
        log.info("레버리지 %dx 설정 완료 (%s)", self.cfg.leverage, self.symbol)

    def fetch_closed_candles(self, limit: int = 300) -> list:
        """OHLCV rows with the still-forming last candle removed."""
        ohlcv = retry(self.client.fetch_ohlcv, self.symbol, self.cfg.timeframe, limit=limit)
        return ohlcv[:-1] if ohlcv else []

    def equity_usdt(self) -> float:
        balance = retry(self.client.fetch_balance)
        usdt = balance.get("USDT") or {}
        return float(usdt.get("total") or 0.0)

    def position(self) -> Position | None:
        positions = retry(self.client.fetch_positions, [self.symbol])
        for p in positions:
            contracts = float(p.get("contracts") or 0)
            if p.get("symbol") == self.symbol and contracts > 0:
                return Position(
                    side=p.get("side"),
                    contracts=contracts,
                    entry_price=float(p.get("entryPrice") or 0),
                    unrealized_pnl=float(p.get("unrealizedPnl") or 0),
                )
        return None

    def min_amount(self) -> float:
        market = self.client.market(self.symbol)
        return float((market.get("limits", {}).get("amount", {}) or {}).get("min") or 0)

    def round_amount(self, amount: float) -> float:
        return float(self.client.amount_to_precision(self.symbol, amount))

    def open_position(self, side: str, amount: float, stop_loss: float, take_profit: float) -> dict:
        """Market entry with stop loss / take profit attached on the exchange side,
        so the position stays protected even if this bot goes offline."""
        order_side = "buy" if side == "long" else "sell"
        params = {
            "stopLoss": {"triggerPrice": float(self.client.price_to_precision(self.symbol, stop_loss))},
            "takeProfit": {"triggerPrice": float(self.client.price_to_precision(self.symbol, take_profit))},
        }
        # Not retried: a timed-out order may still have been filled.
        return self.client.create_order(self.symbol, "market", order_side, amount, None, params)

    def close_position(self, pos: Position) -> dict:
        order_side = "sell" if pos.side == "long" else "buy"
        return self.client.create_order(self.symbol, "market", order_side, pos.contracts, None,
                                        {"reduceOnly": True})

    def cancel_all(self) -> None:
        try:
            retry(self.client.cancel_all_orders, self.symbol)
        except ccxt.ExchangeError as e:
            log.warning("주문 취소 실패(무시): %s", e)
