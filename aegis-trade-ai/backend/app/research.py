"""Deterministic, resumable offline PAPER replay; never a live execution loop."""

import argparse
import fcntl
import hashlib
import json
from contextlib import contextmanager
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal as D
from pathlib import Path
from typing import Any

import httpx

from .costs import load_costs
from .data import demo_candles, validate_candle
from .engine import Engine
from .quotation import PublicQuotation
from .strategy import Baseline


def digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


@contextmanager
def exclusive(path: Path):
    with Path(str(path) + ".lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


class Replay(Engine):
    def __init__(self, path: Path, dataset: dict[str, Any], strategy: Baseline,
                 partition: str = "train", scenario: str = "base"):
        if dataset.get("source") not in {"SYNTHETIC", "UPBIT_PUBLIC"}:
            raise ValueError("SOURCE_REQUIRED")
        if dataset.get("market") != "KRW-BTC" or dataset.get("unit") != 240:
            raise ValueError("MARKET_OR_UNIT")
        candles = dataset["candles"]
        observed = datetime.fromisoformat(dataset["fetched_at"])
        previous = None
        for c in candles:
            validate_candle(c, previous, observed)
            if datetime.fromisoformat(c["time"]).utcoffset() != timedelta(0):
                raise ValueError("UTC_REQUIRED")
            previous = c
        n = len(candles)
        partitions = {"train": (0, n * 60 // 100),
                      "validation": (n * 60 // 100, n * 80 // 100),
                      "holdout": (n * 80 // 100, n)}
        if partition not in partitions:
            raise ValueError("PARTITION_REQUIRED")
        begin, end = partitions[partition]
        start = max(begin, strategy.lookback - 1)
        if start >= end - 1:
            raise ValueError("INSUFFICIENT_PARTITION_DATA")
        costs = load_costs(scenario)
        self.manifest = dict(dataset_hash=digest(dataset), strategy=asdict(strategy),
                             partition=partition, scenario=scenario,
                             costs_checksum=costs.checksum, source=dataset["source"],
                             execution="OFFLINE_PAPER_REPLAY", begin=begin, end=end)
        self.strategy = strategy
        super().__init__(path, candles=candles[:end], identity=digest(self.manifest),
                         start=start, costs=costs)
        self.source = dataset["source"]

    def advance(self, steps: int) -> None:
        if not 1 <= steps <= 20000:
            raise ValueError("BOUNDED_STEPS_REQUIRED")
        for _ in range(steps):
            if self.s["cursor"] + 1 >= len(self.candles) or self.s["mode"] != "PAPER":
                break
            proposal = self.strategy.proposal(
                self.candles[:self.s["cursor"] + 1], bool(self.s["position"]),
            )
            if proposal and not self.s["pending"]:
                try:
                    self.buy(proposal)
                except ValueError as exc:
                    self.s["last_decision"] = str(exc)
            self.step()
            self.save("REPLAY_STEP")

    def report(self) -> dict[str, Any]:
        return dict(**self.manifest, simulated=True, actual_returns=False,
                    state=self.s, marked_equity=str(self.equity()),
                    marked_net_pnl=str(self.equity() - D("1000000")),
                    open_position_not_liquidated=bool(self.s["position"]),
                    completed=self.s["cursor"] == len(self.candles) - 1)


def stop_on_unhealthy_quote(engine: Engine, quote: dict[str, str], now: datetime) -> bool:
    """Admission interlock for future live-paper integration; never places a trade.

    Fresh data does not silently resume a previously paused session. Quote receipt
    and trade timestamps are both checked, so a cached OK response cannot pass.
    """
    try:
        price = D(quote["price"])
        ages = [(now - datetime.fromisoformat(quote[k])).total_seconds()
                for k in ("time", "received_at")]
        healthy = (quote["source"] == "UPBIT_PUBLIC" and quote["market"] == "KRW-BTC"
                   and quote["status"] == "OK" and price.is_finite() and price > 0
                   and all(0 <= age <= 60 for age in ages))
    except (KeyError, ValueError, TypeError, ArithmeticError):
        healthy = False
    if not healthy:
        if engine.s["mode"] == "PAPER":
            engine.mode("pause", "")
        engine.s["pending"] = None
        engine.s["last_decision"] = "REJECT_STALE_OR_ERROR_DATA"
        engine.save("PUBLIC_DATA_UNHEALTHY")
    return not healthy


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    fetch = sub.add_parser("fetch", help="Bounded public historical candles; no simulation")
    fetch.add_argument("output", type=Path)
    fetch.add_argument("--pages", type=int, default=1)
    sub.add_parser("quote", help="One public price observation; no live-paper execution")
    replay = sub.add_parser("replay", help="Explicit offline replay or synthetic fixture")
    replay.add_argument("--input", type=Path)
    replay.add_argument("--synthetic", action="store_true")
    replay.add_argument("--db", type=Path, required=True)
    replay.add_argument("--partition", choices=["train", "validation", "holdout"], default="train")
    replay.add_argument("--unlock-holdout", action="store_true")
    replay.add_argument("--lookback", type=int, default=20)
    replay.add_argument("--stop-fraction", default="0.03")
    replay.add_argument("--scenario", choices=["base", "conservative"], default="base")
    replay.add_argument("--steps", type=int, default=20000)
    args = parser.parse_args()
    try:
        if args.command in {"fetch", "quote"}:
            # Public endpoints only, server-side: no Origin or auth headers.
            with httpx.Client() as client:
                api = PublicQuotation(client)
                now = datetime.now(timezone.utc)
                result = (api.candles(now=now, pages=args.pages) if args.command == "fetch"
                          else api.ticker())
            if args.command == "fetch":
                with args.output.open("x") as output:  # Never overwrite an existing dataset.
                    json.dump(result, output, indent=2)
            else:
                print(json.dumps(result, indent=2))
            return
        if bool(args.input) == args.synthetic:
            parser.error("Select exactly one of --input or --synthetic")
        if args.partition == "holdout" and not args.unlock_holdout:
            parser.error("Freeze parameters first; final holdout requires --unlock-holdout")
        dataset = (json.loads(args.input.read_text()) if args.input else
                   dict(source="SYNTHETIC", market="KRW-BTC", unit=240,
                        fetched_at="2026-02-01T00:00:00+00:00", candles=demo_candles()))
        with exclusive(args.db):
            engine = Replay(args.db, dataset, Baseline(args.lookback, args.stop_fraction),
                            args.partition, args.scenario)
            try:
                engine.advance(args.steps)
                print(json.dumps(engine.report(), indent=2))
            finally:
                engine.db.close()
    except (ValueError, OSError) as exc:
        print(json.dumps(dict(status="ERROR", source="UPBIT_PUBLIC" if args.command in {"fetch", "quote"}
                              else "OFFLINE_PAPER_REPLAY", error=str(exc), simulated=True)))
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
