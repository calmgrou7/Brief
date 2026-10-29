"""Thin ccxt wrappers for USDT/USDC perpetuals in one-way position mode.

FuturesExchange holds the exchange-neutral logic (Bybit by default); LighterFutures
overrides the parts where Lighter's API differs.
"""
import logging
import time
from dataclasses import dataclass

import ccxt

log = logging.getLogger(__name__)

# Lighter market orders carry a worst acceptable price instead of being unbounded.
LIGHTER_ENTRY_SLIPPAGE = 0.01
LIGHTER_STOP_SLIPPAGE = 0.02


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


def create_exchange(cfg) -> "FuturesExchange":
    if cfg.exchange == "lighter":
        return LighterFutures(cfg)
    return FuturesExchange(cfg)


class FuturesExchange:
    candle_limit = 1000

    def __init__(self, cfg, client=None):
        self.cfg = cfg
        self.symbol = cfg.symbol
        self.client = client or self._make_client()

    def _make_client(self):
        client = ccxt.bybit({
            "apiKey": self.cfg.api_key,
            "secret": self.cfg.api_secret,
            "enableRateLimit": True,
            "options": {"defaultType": "swap"},
        })
        if self.cfg.testnet:
            client.set_sandbox_mode(True)
        return client

    @property
    def settle(self) -> str:
        return self.symbol.split(":")[-1]

    def setup(self) -> None:
        retry(self.client.load_markets)
        if self.symbol not in self.client.markets:
            raise ValueError(f"심볼을 찾을 수 없습니다: {self.symbol}")
        self._set_leverage()
        log.info("레버리지 %dx 설정 완료 (%s)", self.cfg.leverage, self.symbol)

    def _set_leverage(self) -> None:
        try:
            retry(self.client.set_leverage, self.cfg.leverage, self.symbol)
        except ccxt.ExchangeError as e:
            # Bybit returns an error when the leverage is already set to this value.
            if "not modified" not in str(e).lower() and "110043" not in str(e):
                raise

    def fetch_closed_candles(self, limit: int | None = None) -> list:
        """OHLCV rows with the still-forming last candle removed."""
        ohlcv = retry(self.client.fetch_ohlcv, self.symbol, self.cfg.timeframe,
                      limit=limit or self.candle_limit)
        return ohlcv[:-1] if ohlcv else []

    def _fetch_balance(self) -> dict:
        return retry(self.client.fetch_balance)

    def equity(self) -> float:
        """Total account value in the settlement currency (USDT on Bybit, USDC on Lighter)."""
        bal = self._fetch_balance().get(self.settle) or {}
        return float(bal.get("total") or 0.0)

    def position(self) -> Position | None:
        positions = retry(self.client.fetch_positions, [self.symbol])
        for p in positions:
            contracts = abs(float(p.get("contracts") or 0))
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

    def _price(self, price: float) -> float:
        return float(self.client.price_to_precision(self.symbol, price))

    def open_position(self, side: str, amount: float, stop_loss: float, take_profit: float,
                      ref_price: float) -> dict:
        """Market entry with stop loss / take profit attached on the exchange side,
        so the position stays protected even if this bot goes offline."""
        order_side = "buy" if side == "long" else "sell"
        params = {
            "stopLoss": {"triggerPrice": self._price(stop_loss)},
            "takeProfit": {"triggerPrice": self._price(take_profit)},
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


class LighterFutures(FuturesExchange):
    """Lighter perp DEX. Orders are signed locally with an API key; the wallet key is never used."""

    candle_limit = 500

    def _make_client(self):
        from .lighter_signer import ensure_signer

        acc, key = self.cfg.lighter_account_index, self.cfg.lighter_api_key_index
        client = ccxt.lighter({
            "enableRateLimit": True,
            "options": {
                "defaultType": "swap",
                "accountIndex": acc,
                "apiKeyIndex": key,
                "libraryPath": ensure_signer(self.cfg.lighter_signer_path),
                # ccxt otherwise attaches its own integrator fee on non-standard accounts.
                "builderFee": False,
            },
        })
        if self.cfg.testnet:
            client.set_sandbox_mode(True)  # before the signer loads: it picks the chain id
        client.init_auth_object(str(acc), str(key))
        client.options["auths"][str(acc)][str(key)]["lighterPrivateKey"] = self.cfg.lighter_api_private_key
        return client

    def _set_leverage(self) -> None:
        retry(self.client.set_leverage, self.cfg.leverage, self.symbol, {"marginMode": "cross"})

    def _fetch_balance(self) -> dict:
        return retry(self.client.fetch_balance, {"type": "swap"})

    def _worst(self, order_side: str, price: float, slippage: float) -> float:
        return self._price(price * (1 + slippage if order_side == "buy" else 1 - slippage))

    def open_position(self, side: str, amount: float, stop_loss: float, take_profit: float,
                      ref_price: float) -> dict:
        order_side = "buy" if side == "long" else "sell"
        exit_side = "sell" if side == "long" else "buy"
        params = {
            "stopLoss": {"triggerPrice": self._price(stop_loss), "type": "market",
                         "price": self._worst(exit_side, stop_loss, LIGHTER_STOP_SLIPPAGE)},
            "takeProfit": {"triggerPrice": self._price(take_profit), "type": "market",
                           "price": self._worst(exit_side, take_profit, LIGHTER_STOP_SLIPPAGE)},
        }
        worst = self._worst(order_side, ref_price, LIGHTER_ENTRY_SLIPPAGE)
        return self.client.create_order(self.symbol, "market", order_side, amount, worst, params)

    def close_position(self, pos: Position) -> dict:
        order_side = "sell" if pos.side == "long" else "buy"
        last = float(retry(self.client.fetch_ticker, self.symbol)["last"])
        worst = self._worst(order_side, last, LIGHTER_STOP_SLIPPAGE)
        return self.client.create_order(self.symbol, "market", order_side, pos.contracts, worst,
                                        {"reduceOnly": True})
