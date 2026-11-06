"""Deterministic synthetic fixtures, never represented as exchange market data."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal as D


def demo_candles() -> list[dict[str, str]]:
    result = []
    price = D("100000000")
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    for i in range(180):
        opening = price
        change = D(((i * 791919) % 2800000) - 1300000)
        if i in (43, 91, 137):
            opening *= D("0.88")  # Explicit gap scenarios in synthetic fixture.
        price = opening + change
        result.append(
            {
                "time": (start + timedelta(hours=4 * i)).isoformat(),
                "open": str(opening),
                "high": str(max(opening, price) + D("600000")),
                "low": str(min(opening, price) - D("600000")),
                "close": str(price),
            }
        )
    return result


def validate_candle(candle: dict[str, str], previous: dict[str, str] | None, now: datetime) -> None:
    ts = datetime.fromisoformat(candle["time"])
    if ts.tzinfo is None or now.tzinfo is None:
        raise ValueError("DATA_TIMEZONE")
    if ts.minute or ts.second or ts.microsecond or ts.hour % 4:
        raise ValueError("DATA_BOUNDARY")
    if ts + timedelta(hours=4, seconds=15) > now:
        raise ValueError("REJECT_CANDLE_NOT_CLOSED")
    if previous and ts - datetime.fromisoformat(previous["time"]) != timedelta(hours=4):
        raise ValueError("DATA_GAP_OR_DUPLICATE")
    o, h, low, c = (D(candle[k]) for k in ("open", "high", "low", "close"))
    if any(not v.is_finite() or v <= 0 for v in (o, h, low, c)):
        raise ValueError("DATA_INVALID_PRICE")
    if h < max(o, c) or low > min(o, c) or low > h:
        raise ValueError("DATA_OHLC")
