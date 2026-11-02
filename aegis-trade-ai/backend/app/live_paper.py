"""Explicit bounded public-feed PAPER experiment. No exchange execution capability."""

import argparse
import copy
import json
import signal
import sqlite3
import time
from collections.abc import Callable
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal as D
from pathlib import Path
from typing import Any

import httpx

from .costs import load_costs
from .data import validate_candle
from .engine import Engine, initial
from .quotation import PublicQuotation
from .paper_status import report_state
from .research import digest, exclusive, stop_on_unhealthy_quote
from .risk import size
from .strategy import Baseline

UTC = timezone.utc


class PaperSession(Engine):
    """Single writer required. Durable state/fills/audit share one transaction.

    Unlike offline next-open replay, fills use a *later observed* fresh quote in
    the next bar interval. Never pretend an already elapsed opening price is available.
    """

    def __init__(self, path: Path, clock: Callable[[], datetime], resume: bool = False,
                 *, provenance: str = "PUBLIC_LIVE"):
        if provenance not in {"PUBLIC_LIVE", "MOCK"}:
            raise ValueError("INVALID_PROVENANCE")
        self.clock = clock
        self.costs = load_costs()
        self.strategy = Baseline()
        self.source = "UPBIT_PUBLIC_PAPER"
        self.candles: list[dict[str, str]] = []
        identity = digest(dict(execution="BOUNDED_PUBLIC_PAPER_V1",
                               strategy=asdict(self.strategy), costs=self.costs.checksum))
        self.db = sqlite3.connect(path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, body TEXT)")
        self.db.execute("CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, body TEXT)")
        row = self.db.execute("SELECT body FROM state WHERE id=1").fetchone()
        self.s = json.loads(row[0]) if row else initial()
        if row and (self.s.get("identity") != identity or
                    self.s.get("provenance", provenance) not in {provenance, "LEGACY_UNVERIFIED"}):
            self.db.close()
            raise ValueError("SESSION_IDENTITY_MISMATCH")
        if not row:
            self.s.update(identity=identity, cursor=0, watermark=None, mark_price="0",
                          fills=[], feed_status="UNKNOWN", last_quote_time=None,
                          execution="BOUNDED_PUBLIC_PAPER", simulated=True, provenance=provenance)
        self.s.setdefault("provenance", "LEGACY_UNVERIFIED")
        self.s.setdefault("cost_model", dict(fee_rate=str(self.costs.fee),
                                            slippage_rate=str(self.costs.slippage),
                                            checksum=self.costs.checksum))
        self.bootstrapped = False
        self.s["pending"] = None  # Never execute an intent left across downtime.
        if resume and self.s["mode"] == "SAFE_PAUSED":
            self.mode("resume", "RESUME")  # Existing drawdown/streak guards apply.
        self.save("SESSION_RESTART" if row else "SESSION_CREATED")

    def now(self) -> datetime:
        now = self.clock()
        if now.utcoffset() != timedelta(0):
            raise ValueError("UTC_REQUIRED")
        return now

    def price(self) -> D:
        return D(self.s["mark_price"])

    def save(self, event: str) -> None:
        self.s["saved_at"] = self.now().isoformat()
        super().save(event)

    def pause(self, reason: str) -> None:
        if self.s["mode"] == "PAPER":
            self.mode("pause", "")
        self.s.update(pending=None, stop_reason=reason, last_decision=reason)
        if reason in {"FEED_INVALID", "PUBLIC_FEED_ERROR"}:
            self.s["feed_status"] = reason
        self.save(reason)

    def exit_position(self, reference: D, reason: str) -> None:
        position = dict(self.s["position"])
        super().exit_position(reference, reason)
        trade = self.s["trades"][-1]
        self.s["fills"].append(dict(side="SELL", time=self.now().isoformat(),
                                    price=trade["exit"], qty=position["qty"],
                                    fee=str(D(trade["exit"]) * D(position["qty"]) *
                                            self.costs.fee), reason=reason))

    def observe(self, dataset: dict[str, Any], quote: dict[str, str]) -> None:
        before = copy.deepcopy(self.s)
        try:
            self._observe(dataset, quote)
        except (ValueError, KeyError, TypeError, ArithmeticError) as exc:
            self.s = before
            self.s["last_feed_error"] = (str(exc) if isinstance(exc, ValueError)
                                          else type(exc).__name__)[:160]
            self.pause("FEED_INVALID")
        except BaseException:
            # A signal/crash between in-memory debit and position assignment must
            # never be persisted by the outer shutdown handler as a partial fill.
            row = self.db.execute("SELECT body FROM state WHERE id=1").fetchone()
            self.s = json.loads(row[0])
            raise

    def _observe(self, dataset: dict[str, Any], quote: dict[str, str]) -> None:
        now = self.now()
        if stop_on_unhealthy_quote(self, quote, now):
            self.s.update(stop_reason="STALE_OR_ERROR", last_feed_error="QUOTE_NOT_FRESH")
            self.save("QUOTE_NOT_FRESH")
            return
        bars = dataset["candles"]
        if (dataset["source"] != "UPBIT_PUBLIC" or dataset["market"] != "KRW-BTC"
                or dataset["unit"] != 240 or dataset["status"] != "OK"
                or len(bars) < self.strategy.lookback):
            raise ValueError("FEED_INVALID")
        previous = None
        for bar in bars:
            validate_candle(bar, previous, now)
            if datetime.fromisoformat(bar["time"]).utcoffset() != timedelta(0):
                raise ValueError("UTC_REQUIRED")
            previous = bar
        latest = datetime.fromisoformat(bars[-1]["time"])
        # Expected completed interval, accounting for the 15-second close grace.
        effective = now - timedelta(seconds=15)
        boundary = effective.replace(hour=effective.hour // 4 * 4, minute=0,
                                     second=0, microsecond=0)
        if latest != boundary - timedelta(hours=4):
            raise ValueError("MISSING_LATEST_CLOSED_BAR")
        quote_time = datetime.fromisoformat(quote["time"])
        prior_quote = self.s["last_quote_time"]
        if prior_quote and quote_time < datetime.fromisoformat(prior_quote):
            raise ValueError("QUOTE_REVERSED")
        newday = now.astimezone(timezone(timedelta(hours=9))).date().isoformat()
        if newday != self.s["day"]:
            self.s.update(day=newday, day_equity=str(self.equity()), daily_blocked=False)
        self.s.update(mark_price=quote["price"], last_quote_time=quote["time"],
                      last_received_at=quote["received_at"], feed_status="OK", last_feed_error=None)
        self.refresh()
        # Current observed price protects restored positions before any new proposal.
        if (self.s["position"] and self.price() <= D(self.s["position"]["stop"])
                and self.s["mode"] != "EMERGENCY_STOP"):
            self.exit_position(self.price(), "OBSERVED_PAPER_STOP")
        if not self.bootstrapped:
            self.s.update(watermark=bars[-1]["time"], pending=None)
            self.bootstrapped = True
            self.save("BOOTSTRAP_NO_RETROSPECTIVE_ENTRY")
            return
        watermark = datetime.fromisoformat(self.s["watermark"])
        if latest < watermark or latest - watermark > timedelta(hours=4):
            raise ValueError("CANDLE_GAP_OR_REVERSED")
        pending = self.s["pending"]
        if pending:
            signal_time = datetime.fromisoformat(pending["signal_time"])
            # Expire pending intent rather than execute on a much later observation.
            if (now - signal_time).total_seconds() > 60:
                self.s["pending"] = None
                self.s["last_decision"] = "PENDING_EXPIRED"
            elif quote_time > signal_time:
                self.s["pending"] = None
                try:
                    self.gate()
                    sized = size(self.equity(), D(self.s["cash"]), self.price(),
                                 D(pending["stop"]), self.costs.fee, self.costs.slippage)
                    gross = sized.qty * sized.entry_fill
                    fee = gross * self.costs.fee
                    self.s["cash"] = str(D(self.s["cash"]) - gross - fee)
                    self.s["position"] = dict(qty=str(sized.qty), entry=str(sized.entry_fill),
                                              stop=pending["stop"], cost=str(gross + fee),
                                              entry_fee=str(fee),
                                              risk_budget=str(sized.risk_budget),
                                              planned_risk=str(sized.qty * sized.unit_risk))
                    self.s["fills"].append(dict(side="BUY", time=quote["time"],
                                                price=str(sized.entry_fill), qty=str(sized.qty),
                                                fee=str(fee), signal_time=pending["signal_time"]))
                    self.s["last_decision"] = "OBSERVED_PAPER_FILLED"
                except ValueError as exc:
                    self.s["last_decision"] = str(exc)
        if latest > watermark:
            self.s["watermark"] = bars[-1]["time"]
            self.s["cursor"] += 1
            proposal = self.strategy.proposal(bars, bool(self.s["position"]))
            if proposal:
                try:
                    self.buy(proposal)
                    self.s["last_decision"] = "QUEUED_NEXT_FRESH_OBSERVATION"
                except ValueError as exc:
                    self.s["last_decision"] = str(exc)
        self.save("PUBLIC_PAPER_OBSERVATION")

    def report(self) -> dict[str, Any]:
        report = report_state(self.s, self.now())
        report["state"] = self.s  # Compatibility with the bounded run JSON response.
        return report


def run(session: PaperSession, api: PublicQuotation, *, polls: int, seconds: float,
        interval: float = 10, stopped: Callable[[], bool] = lambda: False,
        monotonic: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep) -> dict[str, Any]:
    if not 1 <= polls <= 360 or not 1 <= seconds <= 3600 or not 1 <= interval <= 60:
        raise ValueError("BOUNDED_RUN_REQUIRED")
    deadline = monotonic() + seconds
    reason = "POLL_LIMIT"
    api.can_request = lambda: not stopped() and monotonic() < deadline
    try:
        for poll in range(polls):
            if stopped() or monotonic() >= deadline or session.s["mode"] != "PAPER":
                break
            data = api.candles(now=session.now(), pages=1)
            if stopped() or monotonic() >= deadline:
                break
            quote = api.ticker()
            if stopped() or monotonic() >= deadline:
                break
            session.observe(data, quote)
            if session.s["mode"] != "PAPER":
                break
            if poll + 1 < polls:
                sleep(max(0, min(interval, deadline - monotonic())))
    except (ValueError, httpx.HTTPError) as exc:
        session.s["last_feed_error"] = str(exc)[:160]
        session.pause("PUBLIC_FEED_ERROR")
    except KeyboardInterrupt:
        session.pause("INTERRUPTED")
    finally:
        if session.s["mode"] == "PAPER":
            reason = ("STOP_REQUESTED" if stopped() else
                      "TIME_LIMIT" if monotonic() >= deadline else reason)
            session.pause(reason)
    result = session.report()
    result["monitoring_status"] = "STOPPED"
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-paper", action="store_true", required=True)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--polls", type=int, default=3)
    parser.add_argument("--seconds", type=float, default=60)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--stop-file", type=Path, required=True)
    args = parser.parse_args()
    if not 1 <= args.polls <= 360 or not 1 <= args.seconds <= 3600:
        parser.error("polls 1..360 and seconds 1..3600 required")
    stop_requested = False
    def stop(signum, frame):
        nonlocal stop_requested
        stop_requested = True
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, stop)
    try:
        with exclusive(args.db):
            session = PaperSession(args.db, lambda: datetime.now(UTC), args.resume)
            try:
                with httpx.Client() as client:
                    result = run(session, PublicQuotation(client), polls=args.polls,
                                 seconds=args.seconds,
                                 stopped=lambda: stop_requested or args.stop_file.exists())
                print(json.dumps(result, indent=2))
                if session.s["feed_status"] in {"PUBLIC_FEED_ERROR", "FEED_INVALID",
                                                 "STALE_OR_ERROR"}:
                    raise SystemExit(1)
            finally:
                session.db.close()
    except (ValueError, OSError) as exc:
        print(json.dumps(dict(status="ERROR", error=str(exc), simulated=True)))
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
