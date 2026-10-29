"""Backtest the strategy on historical candles.

    python backtest.py --days 90                 # downloads Bybit public candles (no API key needed)
    python backtest.py --csv data/btc_15m.csv    # or uses a CSV: timestamp,open,high,low,close,volume

Assumptions: entry at the signal candle's close, SL/TP checked against later candles'
high/low (stop loss first when both are touched in one candle), taker fee on both sides.
"""
import argparse
import os
import time

import pandas as pd

from bot.config import Config
from bot.risk import position_size
from bot.strategy import LONG, generate_signal, ohlcv_to_df

TAKER_FEE = 0.00055


def _fetch_with_retry(ex, cfg: Config, since: int, attempts: int = 6) -> list:
    """Bybit occasionally answers kline requests with transient server errors (e.g. retCode 10016)."""
    import ccxt

    for i in range(attempts):
        try:
            return ex.fetch_ohlcv(cfg.symbol, cfg.timeframe, since=since, limit=200)
        except (ccxt.NetworkError, ccxt.ExchangeError) as e:
            if i == attempts - 1:
                raise
            delay = 2 * (2 ** i)
            print(f"  거래소 응답 오류, {delay}초 후 재시도 ({i + 1}/{attempts - 1}): {e}")
            time.sleep(delay)


def download(cfg: Config, days: int, ex=None) -> pd.DataFrame:
    import ccxt

    ex = ex or ccxt.bybit({"enableRateLimit": True, "options": {"defaultType": "swap"}})
    tf_ms = ex.parse_timeframe(cfg.timeframe) * 1000
    since = ex.milliseconds() - days * 24 * 60 * 60 * 1000
    rows = []
    print(f"{cfg.symbol} {cfg.timeframe} {days}일치 캔들 다운로드 중...")
    while since < ex.milliseconds() - tf_ms:
        batch = _fetch_with_retry(ex, cfg, since)
        if not batch:
            break
        rows += batch
        since = batch[-1][0] + tf_ms
        time.sleep(ex.rateLimit / 1000)
    df = ohlcv_to_df(rows).drop_duplicates("timestamp")
    return df.iloc[:-1].reset_index(drop=True)  # drop the forming candle


def run_backtest(df: pd.DataFrame, cfg: Config, start_equity: float = 1000.0) -> dict:
    equity = start_equity
    peak = equity
    max_dd = 0.0
    trades = []
    pos = None
    warmup = cfg.ema_slow + 2

    for i in range(warmup, len(df)):
        bar = df.iloc[i]
        if pos:
            exit_price = None
            if pos["side"] == LONG:
                if bar["low"] <= pos["sl"]:
                    exit_price = pos["sl"]
                elif bar["high"] >= pos["tp"]:
                    exit_price = pos["tp"]
            else:
                if bar["high"] >= pos["sl"]:
                    exit_price = pos["sl"]
                elif bar["low"] <= pos["tp"]:
                    exit_price = pos["tp"]
            if exit_price is not None:
                equity += _close(pos, exit_price, trades)
                pos = None

        sig = generate_signal(df.iloc[max(0, i - 300): i + 1], cfg)
        if sig:
            if pos and pos["side"] == sig.side:
                pass
            else:
                if pos:
                    equity += _close(pos, sig.entry, trades)
                    pos = None
                qty = position_size(equity, sig.entry, sig.stop_loss, cfg.leverage,
                                    cfg.risk_per_trade, cfg.max_position_pct)
                if qty > 0:
                    entry_fee = qty * sig.entry * TAKER_FEE
                    equity -= entry_fee
                    pos = {"side": sig.side, "qty": qty, "entry": sig.entry,
                           "sl": sig.stop_loss, "tp": sig.take_profit, "entry_fee": entry_fee}

        peak = max(peak, equity)
        max_dd = max(max_dd, (peak - equity) / peak if peak > 0 else 0)

    if pos:
        equity += _close(pos, float(df.iloc[-1]["close"]), trades)

    fees = [t[1] for t in trades]
    trades = [t[0] for t in trades]
    wins = [t for t in trades if t > 0]
    return {
        "start_equity": start_equity,
        "end_equity": round(equity, 2),
        "return_pct": round((equity / start_equity - 1) * 100, 2),
        "trades": len(trades),
        "win_rate_pct": round(len(wins) / len(trades) * 100, 1) if trades else 0.0,
        "max_drawdown_pct": round(max_dd * 100, 2),
        "fees_paid": round(sum(fees), 2),
        "candles": len(df),
    }


def _close(pos: dict, price: float, trades: list) -> float:
    direction = 1 if pos["side"] == LONG else -1
    exit_fee = pos["qty"] * price * TAKER_FEE
    pnl = (price - pos["entry"]) * pos["qty"] * direction - exit_fee
    trades.append((pnl, pos["entry_fee"] + exit_fee))
    return pnl


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument("--csv")
    parser.add_argument("--equity", type=float, default=1000.0)
    args = parser.parse_args()

    cfg = Config.from_env()
    if args.csv:
        df = pd.read_csv(args.csv)
    else:
        df = download(cfg, args.days)
        os.makedirs("data", exist_ok=True)
        path = os.path.join("data", f"{cfg.symbol.split('/')[0]}_{cfg.timeframe}_{args.days}d.csv")
        df.to_csv(path, index=False)
        print(f"캔들 저장: {path}  (다음엔 --csv {path} 로 다운로드 없이 실행 가능)")
    result = run_backtest(df, cfg, args.equity)
    print(f"\n=== 백테스트 결과: {cfg.symbol} {cfg.timeframe}, {cfg.leverage}x ===")
    labels = {"start_equity": "시작 잔고", "end_equity": "최종 잔고", "return_pct": "수익률(%)",
              "trades": "거래 수", "win_rate_pct": "승률(%)", "max_drawdown_pct": "최대 낙폭(%)", "fees_paid": "낸 수수료",
              "candles": "캔들 수"}
    for k, v in result.items():
        print(f"{labels[k]:>10}: {v}")


if __name__ == "__main__":
    main()
