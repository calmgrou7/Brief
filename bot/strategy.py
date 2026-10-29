"""EMA crossover + RSI filter strategy with ATR-based stop loss / take profit.

Signals are computed only on closed candles, so the last (still forming)
candle must be dropped before calling generate_signal.
"""
from dataclasses import dataclass
from typing import Optional

import pandas as pd

LONG = "long"
SHORT = "short"


@dataclass
class Signal:
    side: str  # LONG or SHORT
    entry: float
    stop_loss: float
    take_profit: float
    reason: str


def ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def rsi(series: pd.Series, period: int) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    rs = gain / loss.replace(0, float("nan"))
    return (100 - 100 / (1 + rs)).fillna(100)


def atr(df: pd.DataFrame, period: int) -> pd.Series:
    prev_close = df["close"].shift(1)
    tr = pd.concat(
        [
            df["high"] - df["low"],
            (df["high"] - prev_close).abs(),
            (df["low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    return tr.ewm(alpha=1 / period, adjust=False).mean()


def adx(df: pd.DataFrame, period: int) -> pd.Series:
    """Wilder's ADX: trend strength (0-100) regardless of direction."""
    up = df["high"].diff()
    down = -df["low"].diff()
    plus_dm = up.where((up > down) & (up > 0), 0.0)
    minus_dm = down.where((down > up) & (down > 0), 0.0)
    atr_w = atr(df, period)
    plus_di = 100 * plus_dm.ewm(alpha=1 / period, adjust=False).mean() / atr_w
    minus_di = 100 * minus_dm.ewm(alpha=1 / period, adjust=False).mean() / atr_w
    dx = (100 * (plus_di - minus_di).abs() / (plus_di + minus_di)).fillna(0)
    return dx.ewm(alpha=1 / period, adjust=False).mean()


def add_indicators(df: pd.DataFrame, cfg) -> pd.DataFrame:
    df = df.copy()
    df["ema_fast"] = ema(df["close"], cfg.ema_fast)
    df["ema_slow"] = ema(df["close"], cfg.ema_slow)
    df["rsi"] = rsi(df["close"], cfg.rsi_period)
    df["atr"] = atr(df, cfg.atr_period)
    if cfg.trend_ema > 0:
        df["ema_trend"] = ema(df["close"], cfg.trend_ema)
    if cfg.adx_min > 0:
        df["adx"] = adx(df, cfg.adx_period)
    return df


def warmup_bars(cfg) -> int:
    return max(cfg.ema_slow, cfg.trend_ema) + 2


def generate_signal(df: pd.DataFrame, cfg) -> Optional[Signal]:
    """Return a Signal if the last closed candle produced an EMA cross."""
    if len(df) < warmup_bars(cfg):
        return None
    df = add_indicators(df, cfg)
    return signal_from_rows(df.iloc[-2], df.iloc[-1], cfg)


def signal_from_rows(prev, last, cfg) -> Optional[Signal]:
    """Evaluate two consecutive rows that already carry indicator columns."""
    entry = float(last["close"])
    dist_sl = float(last["atr"]) * cfg.sl_atr_mult
    dist_tp = float(last["atr"]) * cfg.tp_atr_mult
    if dist_sl <= 0:
        return None

    crossed_up = prev["ema_fast"] <= prev["ema_slow"] and last["ema_fast"] > last["ema_slow"]
    crossed_down = prev["ema_fast"] >= prev["ema_slow"] and last["ema_fast"] < last["ema_slow"]

    # Optional filters: trade only with the long-term trend, and only when a trend exists at all.
    if cfg.trend_ema > 0:
        crossed_up = crossed_up and last["close"] > last["ema_trend"]
        crossed_down = crossed_down and last["close"] < last["ema_trend"]
    if cfg.adx_min > 0 and last["adx"] < cfg.adx_min:
        return None

    if crossed_up and last["rsi"] < cfg.rsi_overbought:
        return Signal(LONG, entry, entry - dist_sl, entry + dist_tp,
                      f"EMA{cfg.ema_fast} 상향돌파, RSI {last['rsi']:.1f}")
    if crossed_down and last["rsi"] > cfg.rsi_oversold:
        return Signal(SHORT, entry, entry + dist_sl, entry - dist_tp,
                      f"EMA{cfg.ema_fast} 하향돌파, RSI {last['rsi']:.1f}")
    return None


def ohlcv_to_df(ohlcv: list) -> pd.DataFrame:
    df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df["timestamp"] = df["timestamp"].astype("int64")
    return df
