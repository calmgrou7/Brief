import math
from datetime import datetime

import numpy as np
import pandas as pd
import pytest

from backtest import run_backtest
from bot.config import Config
from bot.exchange import FuturesExchange
from bot.main import TradingBot
from bot.notifier import Notifier
from bot.risk import KST, DailyGuard, position_size
from bot.strategy import LONG, SHORT, generate_signal, ohlcv_to_df, rsi


def make_cfg(tmp_path, **overrides) -> Config:
    cfg = Config.from_env()
    cfg.api_key, cfg.api_secret, cfg.testnet = "k", "s", True
    cfg.ema_fast, cfg.ema_slow = 5, 20
    cfg.state_file = str(tmp_path / "state.json")
    cfg.telegram_token = cfg.telegram_chat_id = ""
    for k, v in overrides.items():
        setattr(cfg, k, v)
    return cfg


def candles(closes, start_ts=1_700_000_000_000, step=900_000):
    return [[start_ts + i * step, c, c * 1.002, c * 0.998, c, 1.0] for i, c in enumerate(closes)]


def down_then_up(n_down=60, n_up=3):
    closes = list(np.linspace(110, 100, n_down)) + [100 + 2 * (i + 1) for i in range(n_up)]
    return closes


# ---------- strategy ----------

def test_long_signal_on_upward_cross(tmp_path):
    cfg = make_cfg(tmp_path)
    df = ohlcv_to_df(candles(down_then_up()))
    # find the first candle where a signal appears
    sig = None
    for end in range(cfg.ema_slow + 2, len(df) + 1):
        sig = generate_signal(df.iloc[:end], cfg)
        if sig:
            break
    assert sig is not None and sig.side == LONG
    assert sig.stop_loss < sig.entry < sig.take_profit


def test_short_signal_on_downward_cross(tmp_path):
    cfg = make_cfg(tmp_path)
    closes = [200 - c for c in down_then_up()]
    df = ohlcv_to_df(candles(closes))
    sig = None
    for end in range(cfg.ema_slow + 2, len(df) + 1):
        sig = generate_signal(df.iloc[:end], cfg)
        if sig:
            break
    assert sig is not None and sig.side == SHORT
    assert sig.take_profit < sig.entry < sig.stop_loss


def test_no_signal_without_enough_data(tmp_path):
    cfg = make_cfg(tmp_path)
    assert generate_signal(ohlcv_to_df(candles([100] * 10)), cfg) is None


def test_rsi_bounds():
    s = pd.Series(np.random.default_rng(0).normal(100, 5, 500))
    r = rsi(s, 14)
    assert r.between(0, 100).all()


# ---------- risk ----------

def test_position_size_risk_based():
    # 1% of 1000 = 10 USDT risk, stop 500 away -> 0.02 BTC (1000 USDT notional, under the 2700 cap)
    assert math.isclose(position_size(1000, 50000, 49500, 3, 0.01, 0.9), 0.02)


def test_position_size_capped_by_margin():
    # tiny stop distance would want a huge size; cap = 1000*0.9*3/50000 = 0.054
    assert math.isclose(position_size(1000, 50000, 49999, 3, 0.01, 0.9), 0.054)


def test_position_size_invalid_inputs():
    assert position_size(0, 100, 99, 3, 0.01, 0.9) == 0
    assert position_size(1000, 100, 100, 3, 0.01, 0.9) == 0


def test_daily_guard_trips_and_persists(tmp_path):
    f = str(tmp_path / "s.json")
    day = datetime(2026, 1, 1, 12, tzinfo=KST)
    g = DailyGuard(f, 0.05)
    assert g.update(1000, day) == (False, "new_day")
    assert g.update(960, day) == (False, None)
    assert g.update(949, day) == (True, "tripped")
    # restart keeps the halt for the same day
    assert DailyGuard(f, 0.05).update(1000, day) == (True, None)
    # next day resets
    assert DailyGuard(f, 0.05).update(949, datetime(2026, 1, 2, 1, tzinfo=KST)) == (False, "new_day")


def test_live_mode_requires_confirmation(tmp_path):
    cfg = make_cfg(tmp_path, testnet=False)
    with pytest.raises(ValueError):
        cfg.validate()
    cfg.live_trading_confirm = "I_UNDERSTAND_THE_RISK"
    cfg.validate()


# ---------- bot loop with a fake exchange client ----------

class FakeClient:
    def __init__(self, ohlcv, equity=1000.0):
        self.ohlcv = ohlcv
        self.equity = equity
        self.positions = []
        self.orders = []
        self.prices = []
        self.markets = {"BTC/USDT:USDT": {}, "BTC/USDC:USDC": {}}

    def market(self, symbol):
        return {"limits": {"amount": {"min": 0.001}}}

    def fetch_ohlcv(self, symbol, timeframe, limit=300):
        return self.ohlcv + [[self.ohlcv[-1][0] + 900_000, 1, 1, 1, 1, 1]]  # forming candle

    def fetch_balance(self):
        return {"USDT": {"total": self.equity}}

    def fetch_positions(self, symbols):
        return self.positions

    def amount_to_precision(self, symbol, amount):
        return f"{math.floor(amount * 1000) / 1000:.3f}"

    def price_to_precision(self, symbol, price):
        return f"{price:.2f}"

    def create_order(self, symbol, type, side, amount, price, params):
        self.orders.append((side, amount, params))
        self.prices.append(price)
        return {"id": str(len(self.orders))}

    def cancel_all_orders(self, symbol):
        pass


def make_bot(tmp_path, client):
    cfg = make_cfg(tmp_path)
    return TradingBot(cfg, FuturesExchange(cfg, client=client), Notifier("", ""),
                      DailyGuard(cfg.state_file, cfg.max_daily_loss))


def first_signal_window(cfg):
    rows = candles(down_then_up())
    for end in range(cfg.ema_slow + 2, len(rows) + 1):
        if generate_signal(ohlcv_to_df(rows[:end]), cfg):
            return rows[:end]
    raise AssertionError("no signal")


def test_bot_opens_long_once_per_candle(tmp_path):
    cfg = make_cfg(tmp_path)
    client = FakeClient(first_signal_window(cfg))
    bot = make_bot(tmp_path, client)
    bot.step()
    bot.step()  # same candle -> no duplicate order
    assert len(client.orders) == 1
    side, amount, params = client.orders[0]
    assert side == "buy" and amount > 0
    assert params["stopLoss"]["triggerPrice"] < params["takeProfit"]["triggerPrice"]


def test_bot_reverses_existing_short(tmp_path):
    cfg = make_cfg(tmp_path)
    client = FakeClient(first_signal_window(cfg))
    client.positions = [{"symbol": "BTC/USDT:USDT", "side": "short", "contracts": 0.05,
                         "entryPrice": 100, "unrealizedPnl": -1}]
    make_bot(tmp_path, client).step()
    assert client.orders[0][0] == "buy" and client.orders[0][2] == {"reduceOnly": True}
    assert client.orders[1][0] == "buy" and "stopLoss" in client.orders[1][2]


def test_bot_halts_and_closes_on_daily_loss(tmp_path):
    cfg = make_cfg(tmp_path)
    client = FakeClient(first_signal_window(cfg), equity=1000)
    bot = make_bot(tmp_path, client)
    client.ohlcv = candles([100] * 30)  # no signal on first step
    bot.step()
    client.equity = 900
    client.positions = [{"symbol": "BTC/USDT:USDT", "side": "long", "contracts": 0.05,
                         "entryPrice": 100, "unrealizedPnl": -100}]
    client.ohlcv = first_signal_window(cfg)
    bot.step()
    assert client.orders == [("sell", 0.05, {"reduceOnly": True})]


def test_bot_skips_when_balance_too_small(tmp_path):
    cfg = make_cfg(tmp_path)
    client = FakeClient(first_signal_window(cfg), equity=0.01)
    make_bot(tmp_path, client).step()
    assert client.orders == []


# ---------- backtest ----------

def test_backtest_runs(tmp_path):
    cfg = make_cfg(tmp_path)
    rng = np.random.default_rng(1)
    closes = 100 * np.exp(np.cumsum(rng.normal(0, 0.004, 1500)))
    rows = [[i * 900_000, c, c * 1.003, c * 0.997, c, 1] for i, c in enumerate(closes)]
    result = run_backtest(ohlcv_to_df(rows), cfg)
    assert result["trades"] > 0
    assert result["end_equity"] > 0


def test_download_retries_transient_exchange_error(tmp_path, monkeypatch):
    import ccxt

    import backtest

    monkeypatch.setattr(backtest.time, "sleep", lambda s: None)
    cfg = make_cfg(tmp_path, timeframe="1h")
    now = 10 * 3_600_000

    class FlakyExchange:
        rateLimit = 0
        calls = 0

        def parse_timeframe(self, tf):
            return 3600

        def milliseconds(self):
            return now

        def fetch_ohlcv(self, symbol, timeframe, since, limit):
            FlakyExchange.calls += 1
            if FlakyExchange.calls <= 2:
                raise ccxt.ExchangeError('bybit {"retCode":10016,"retMsg":"svc error: Get kline failed"}')
            return [[t, 1, 1, 1, 1, 1] for t in range(since, now, 3_600_000)][:limit]

    df = backtest.download(cfg, 1, ex=FlakyExchange())
    assert FlakyExchange.calls >= 3
    assert len(df) > 0


def test_trend_filter_blocks_counter_trend_long(tmp_path):
    from bot.strategy import signal_from_rows

    cfg = make_cfg(tmp_path)
    prev = {"ema_fast": 99.0, "ema_slow": 100.0}
    last = {"ema_fast": 101.0, "ema_slow": 100.0, "close": 102.0, "atr": 1.0, "rsi": 55.0,
            "ema_trend": 110.0, "adx": 30.0}
    assert signal_from_rows(prev, last, cfg).side == LONG  # filter off
    cfg.trend_ema = 200
    assert signal_from_rows(prev, last, cfg) is None  # price below long-term trend
    last["ema_trend"] = 90.0
    assert signal_from_rows(prev, last, cfg).side == LONG
    cfg.adx_min = 35
    assert signal_from_rows(prev, last, cfg) is None  # trend too weak


def test_adx_filter_blocks_flat_market(tmp_path):
    cfg = make_cfg(tmp_path, adx_min=25)
    window = first_signal_window(make_cfg(tmp_path))
    # a long flat stretch before the cross keeps ADX low
    flat = candles([100 + (0.05 if i % 2 else -0.05) for i in range(200)])
    shifted = [[r[0] + 200 * 900_000] + r[1:] for r in window[-25:]]
    assert generate_signal(ohlcv_to_df(flat + shifted), cfg) is None


# ---------- Lighter ----------

def lighter_cfg(tmp_path, **overrides):
    values = dict(exchange="lighter", symbol="BTC/USDC:USDC", lighter_account_index=123,
                  lighter_api_key_index=10, lighter_api_private_key="0xabc")
    return make_cfg(tmp_path, **{**values, **overrides})


def test_lighter_config_validation(tmp_path):
    lighter_cfg(tmp_path).validate()
    with pytest.raises(ValueError):
        lighter_cfg(tmp_path, lighter_api_key_index=2).validate()  # slots 0-3 are Lighter's own
    with pytest.raises(ValueError):
        lighter_cfg(tmp_path, lighter_api_private_key="").validate()


def test_lighter_client_uses_api_key_only_and_no_builder_fee(tmp_path, monkeypatch):
    import bot.lighter_signer
    from bot.exchange import LighterFutures

    monkeypatch.setattr(bot.lighter_signer, "ensure_signer", lambda path="": "/fake/signer.so")
    ex = LighterFutures(lighter_cfg(tmp_path))
    c = ex.client
    assert c.options["chainId"] == 300  # testnet
    assert c.options["builderFee"] is False
    assert c.options["libraryPath"] == "/fake/signer.so"
    assert c.options["auths"]["123"]["10"]["lighterPrivateKey"] == "0xabc"
    assert not c.privateKey  # the wallet (L1) key is never given to the bot
    assert ex.settle == "USDC"


class FakeLighterClient(FakeClient):
    def fetch_ticker(self, symbol):
        return {"last": 100.0}

    def price_to_precision(self, symbol, price):
        return f"{price:.1f}"


def test_lighter_open_position_bounds_market_prices(tmp_path):
    from bot.exchange import LighterFutures

    client = FakeLighterClient(candles([100] * 5))
    ex = LighterFutures(lighter_cfg(tmp_path), client=client)
    ex.open_position("long", 0.5, stop_loss=95.0, take_profit=110.0, ref_price=100.0)
    side, amount, params = client.orders[0]
    assert side == "buy" and amount == 0.5
    assert params["stopLoss"] == {"triggerPrice": 95.0, "type": "market", "price": 93.1}
    assert params["takeProfit"] == {"triggerPrice": 110.0, "type": "market", "price": 107.8}
    assert client.prices[0] == 101.0  # 1% worst-case entry price for a buy


def test_lighter_close_position_is_reduce_only(tmp_path):
    from bot.exchange import LighterFutures, Position

    client = FakeLighterClient(candles([100] * 5))
    LighterFutures(lighter_cfg(tmp_path), client=client).close_position(Position("short", 0.3, 100, 0))
    assert client.orders == [("buy", 0.3, {"reduceOnly": True})]
    assert client.prices[0] == 102.0


def test_signer_download_verifies_hash(tmp_path, monkeypatch):
    import hashlib
    import io
    import zipfile

    import bot.lighter_signer as ls

    name = ls.library_name()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(f"lighter/signers/{name}", b"signer-bytes")
    wheel = buf.getvalue()

    class Resp:
        def __init__(self, content=None, payload=None):
            self.content, self.payload = content, payload

        def raise_for_status(self):
            pass

        def json(self):
            return self.payload

    def fake_get(url, timeout):
        if url.endswith("/json"):
            return Resp(payload={"urls": [{"filename": "x.whl", "url": "https://files/x.whl",
                                           "digests": {"sha256": digest}}]})
        return Resp(content=wheel)

    monkeypatch.setattr(ls.requests, "get", fake_get)
    digest = "0" * 64
    with pytest.raises(RuntimeError):
        ls.ensure_signer(vendor_dir=str(tmp_path))
    digest = hashlib.sha256(wheel).hexdigest()
    path = ls.ensure_signer(vendor_dir=str(tmp_path))
    assert open(path, "rb").read() == b"signer-bytes"
