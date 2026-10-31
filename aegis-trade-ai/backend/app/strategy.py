"""Research baseline only: completed-bar SMA entry with fixed protective stop.

Pure function; no broker, network, persistence or risk imports. This is NOT PRD
strategy A/B/C or an approved strategy. Position exits use the simulator's stop.
"""
from dataclasses import dataclass
from decimal import Decimal as D


@dataclass(frozen=True)
class Baseline:
    lookback: int = 20
    stop_fraction: str = "0.03"

    def __post_init__(self) -> None:
        stop = D(self.stop_fraction)
        if not 2 <= self.lookback <= 200 or not stop.is_finite() or not D(0) < stop < D(1):
            raise ValueError("INVALID_STRATEGY_CONFIG")

    def proposal(self, completed: list[dict[str, str]], has_position: bool) -> str | None:
        if has_position or len(completed) < self.lookback:
            return None
        closes = [D(c["close"]) for c in completed[-self.lookback:]]
        if closes[-1] <= sum(closes) / self.lookback:
            return None
        return str(closes[-1] * (1 - D(self.stop_fraction)))
