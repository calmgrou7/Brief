"""Position sizing and the daily loss kill switch."""
import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")


def position_size(equity: float, entry: float, stop_loss: float, leverage: int,
                  risk_per_trade: float, max_position_pct: float) -> float:
    """Contracts (in base currency) so that hitting the stop loses risk_per_trade of equity.

    The size is capped so the margin used never exceeds max_position_pct of equity.
    """
    if equity <= 0 or entry <= 0:
        return 0.0
    stop_distance = abs(entry - stop_loss)
    if stop_distance <= 0:
        return 0.0
    qty_by_risk = (equity * risk_per_trade) / stop_distance
    qty_by_margin = (equity * max_position_pct * leverage) / entry
    return max(0.0, min(qty_by_risk, qty_by_margin))


def today_kst(now: datetime | None = None) -> str:
    return (now or datetime.now(KST)).astimezone(KST).strftime("%Y-%m-%d")


class DailyGuard:
    """Halts trading for the rest of the KST day once equity drops max_daily_loss below the day's start.

    State is persisted so a restart cannot reset the kill switch mid-day.
    """

    def __init__(self, state_file: str, max_daily_loss: float):
        self.state_file = state_file
        self.max_daily_loss = max_daily_loss
        self.state = self._load()

    def _load(self) -> dict:
        try:
            with open(self.state_file, encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save(self) -> None:
        os.makedirs(os.path.dirname(self.state_file) or ".", exist_ok=True)
        tmp = self.state_file + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.state, f, ensure_ascii=False, indent=2)
        os.replace(tmp, self.state_file)

    def update(self, equity: float, now: datetime | None = None) -> tuple[bool, str | None]:
        """Record equity. Returns (halted, event) where event is 'new_day', 'tripped' or None."""
        day = today_kst(now)
        event = None
        if self.state.get("day") != day:
            prev = dict(self.state)
            self.state = {"day": day, "start_equity": equity, "halted": False}
            if prev:
                self.state["prev_day"] = {"day": prev.get("day"),
                                          "start_equity": prev.get("start_equity"),
                                          "end_equity": equity}
            event = "new_day"
        elif not self.state.get("halted"):
            start = self.state["start_equity"]
            if start > 0 and equity <= start * (1 - self.max_daily_loss):
                self.state["halted"] = True
                event = "tripped"
        self._save()
        return self.state["halted"], event

    @property
    def start_equity(self) -> float:
        return self.state.get("start_equity", 0.0)

    def get(self, key: str, default=None):
        return self.state.get(key, default)

    def set(self, key: str, value) -> None:
        self.state[key] = value
        self._save()
