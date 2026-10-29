"""Train/test parameter comparison to avoid fooling ourselves with an overfit backtest.

    python research.py data/BTC_1h_365d.csv data/BTC_4h_365d.csv

Each CSV is split into the first 2/3 (train) and last 1/3 (test). Settings are ranked on
train only; a setting is worth considering only if it also makes money on test.
"""
import itertools
import sys

import pandas as pd

from backtest import TAKER_FEE, run_backtest
from bot.config import Config

MAKER_FEE = 0.0002
GRID = {
    "ema": [(20, 50), (10, 30), (50, 100)],
    "trend_ema": [0, 200],
    "adx_min": [0, 20, 25],
    "sl_tp": [(1.5, 3.0), (2.0, 4.0)],
    "fee": [("taker", TAKER_FEE), ("maker", MAKER_FEE)],
}


def main(paths: list[str]) -> None:
    rows = []
    for path in paths:
        df = pd.read_csv(path)
        split = int(len(df) * 2 / 3)
        for (fast, slow), trend, adx_min, (sl, tp), (fee_name, fee) in itertools.product(*GRID.values()):
            cfg = Config.from_env()
            cfg.ema_fast, cfg.ema_slow, cfg.trend_ema, cfg.adx_min = fast, slow, trend, adx_min
            cfg.sl_atr_mult, cfg.tp_atr_mult = sl, tp
            train = run_backtest(df, cfg, end=split, entry_fee_rate=fee)
            test = run_backtest(df, cfg, start=split, entry_fee_rate=fee)
            rows.append({"data": path, "ema": f"{fast}/{slow}", "trend": trend, "adx": adx_min,
                         "sl/tp": f"{sl}/{tp}", "fee": fee_name,
                         "train%": train["return_pct"], "train_n": train["trades"],
                         "test%": test["return_pct"], "test_n": test["trades"],
                         "test_dd%": test["max_drawdown_pct"]})
    r = pd.DataFrame(rows)
    pd.set_option("display.width", 200)
    both = ((r["train%"] > 0) & (r["test%"] > 0)).mean()
    print(f"설정 {len(r)}개 중 앞/뒤 구간 모두 수익: {both:.0%}")
    print("\n앞 구간(train) 수익률 상위 10개와 그 설정의 뒤 구간(test) 성적:")
    print(r.sort_values("train%", ascending=False).head(10).to_string(index=False))


if __name__ == "__main__":
    main(sys.argv[1:] or ["data/BTC_1h_365d.csv", "data/BTC_4h_365d.csv"])
