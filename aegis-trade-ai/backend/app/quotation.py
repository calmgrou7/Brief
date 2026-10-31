"""Bounded public quotation reads. No credentials, arbitrary URLs, or redirects."""

import json
import re
import time
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import httpx

from .data import validate_candle

UTC = timezone.utc


class QuotationError(ValueError):
    pass


class PublicQuotation:
    def __init__(self, client: httpx.Client, sleep: Callable[[float], None] = time.sleep):
        self.client = client
        self.sleep = sleep
        self.delay = 1.0  # Conservative 1 req/sec, shared IP budget may be smaller.
        self.blocked = False

    def _get(self, endpoint: str, params: dict[str, str]) -> Any:
        if self.blocked:
            raise QuotationError("PUBLIC_API_BLOCKED_418")
        for attempt in range(3):
            self.sleep(self.delay)
            try:
                response = self.client.get(
                    "https://api.upbit.com/v1/" + endpoint, params=params,
                    timeout=10, follow_redirects=False,
                )
            except httpx.TransportError as exc:
                if attempt == 2:
                    raise QuotationError("PUBLIC_NETWORK_ERROR") from exc
                self.delay = 2 ** (attempt + 1)
                continue
            remaining = re.search(r"(?:^|;)\s*sec=(\d+)",
                                  response.headers.get("Remaining-Req", ""))
            self.delay = 1.0 if not remaining or int(remaining[1]) > 0 else 2.0
            if response.status_code == 418:
                self.blocked = True
                raise QuotationError("PUBLIC_API_BLOCKED_418")
            if response.status_code == 429 or response.status_code >= 500:
                retry = response.headers.get("Retry-After", "")
                # Never retry sooner than a long/unknown server cooldown. End this run.
                if retry and (not retry.isdigit() or int(retry) > 30):
                    raise QuotationError("PUBLIC_COOLDOWN_REQUIRES_LATER_RUN")
                self.delay = max(self.delay, 2 ** (attempt + 1), float(retry or 0))
                if attempt < 2:
                    continue
            if response.status_code != 200:
                raise QuotationError(f"PUBLIC_HTTP_{response.status_code}")
            try:
                # Preserve monetary precision before any float conversion.
                return json.loads(response.text, parse_float=Decimal)
            except ValueError as exc:
                raise QuotationError("PUBLIC_INVALID_JSON") from exc
        raise QuotationError("PUBLIC_RETRY_EXHAUSTED")

    def candles(self, *, now: datetime, pages: int = 1) -> dict[str, Any]:
        if now.utcoffset() != timedelta(0) or not 1 <= pages <= 100:
            raise ValueError("UTC_AND_BOUNDED_PAGES_REQUIRED")
        cutoff = now - timedelta(hours=4, seconds=15)
        before = now
        collected: list[dict[str, str]] = []
        for _ in range(pages):
            rows = self._get("candles/minutes/240", {
                "market": "KRW-BTC", "count": "200", "to": before.isoformat(),
            })
            if not isinstance(rows, list) or len(rows) > 200:
                raise QuotationError("PUBLIC_INVALID_CANDLES")
            if not rows:
                break
            prior = before
            try:
                for row in rows:
                    ts = datetime.fromisoformat(row["candle_date_time_utc"]).replace(tzinfo=UTC)
                    if row["market"] != "KRW-BTC" or row["unit"] != 240 or ts >= prior:
                        raise ValueError("ORDER_OR_MARKET")
                    prior = ts
                    if ts > cutoff:
                        continue  # Still forming or within close grace period.
                    c = {"time": ts.isoformat(), **{
                        k: str(row[v]) for k, v in {
                            "open": "opening_price", "high": "high_price",
                            "low": "low_price", "close": "trade_price",
                            "volume": "candle_acc_trade_volume",
                        }.items()
                    }}
                    validate_candle(c, None, now)
                    volume = Decimal(c["volume"])
                    if not volume.is_finite() or volume < 0:
                        raise ValueError("VOLUME")
                    collected.append(c)
                before = prior  # Exclusive cursor; no fabricated gap candles.
            except (KeyError, TypeError, ValueError, ArithmeticError) as exc:
                raise QuotationError("PUBLIC_INVALID_CANDLES") from exc
            if len(rows) < 200:
                break
        collected.reverse()
        gaps = [c["time"] for a, c in zip(collected, collected[1:])
                if datetime.fromisoformat(c["time"]) - datetime.fromisoformat(a["time"])
                != timedelta(hours=4)]
        return dict(schema=1, source="UPBIT_PUBLIC", market="KRW-BTC", unit=240,
                    fetched_at=now.isoformat(), candles=collected, gaps=gaps,
                    status="GAP" if gaps else "OK" if collected else "EMPTY")

    def ticker(self, *, now: datetime | None = None) -> dict[str, str]:
        if now is not None and now.utcoffset() != timedelta(0):
            raise ValueError("UTC_REQUIRED")
        rows = self._get("ticker", {"markets": "KRW-BTC"})
        # Use receipt time after network/backoff, not a pre-request timestamp.
        now = now if now is not None else datetime.now(UTC)
        try:
            if not isinstance(rows, list) or len(rows) != 1 or rows[0]["market"] != "KRW-BTC":
                raise ValueError("MARKET")
            price = Decimal(str(rows[0]["trade_price"]))
            # Trade time, not response generation time, determines price freshness.
            ts = datetime.fromtimestamp(int(rows[0]["trade_timestamp"]) / 1000, UTC)
            age = (now - ts).total_seconds()
            if not price.is_finite() or price <= 0:
                raise ValueError("PRICE")
        except (KeyError, TypeError, ValueError, ArithmeticError, OverflowError) as exc:
            raise QuotationError("PUBLIC_INVALID_TICKER") from exc
        return dict(source="UPBIT_PUBLIC", market="KRW-BTC", price=str(price),
                    time=ts.isoformat(), received_at=now.isoformat(),
                    status="OK" if 0 <= age <= 60 else "STALE")
