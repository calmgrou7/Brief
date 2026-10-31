"""Single-owner local PAPER replay; each action atomically persists state and audit."""

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from decimal import Decimal as D
from pathlib import Path
from typing import Any

from .costs import DEFAULT_COSTS, Costs
from .data import demo_candles, validate_candle
from .risk import size


def initial() -> dict[str, Any]:
    return dict(
        mode="PAPER",
        cash="1000000",
        peak_equity="1000000",
        day_equity="1000000",
        day="",
        daily_blocked=False,
        position=None,
        cursor=24,
        pending=None,
        trades=[],
        loss_streak=0,
        cooldown=None,
        second_strike=False,
        manual_loss_lock=False,
        last_buy_cursor=-1,
        last_decision="READY",
        used_keys=[],
    )


class Engine:
    def __init__(
        self, path: Path, *, candles: list[dict[str, str]] | None = None,
        identity: str = "DEMO", start: int = 24, costs: Costs = DEFAULT_COSTS,
    ):
        self.candles = demo_candles() if candles is None else candles
        self.source = "DEMO" if candles is None else "REPLAY"
        self.costs = costs
        if not 0 <= start < len(self.candles):
            raise ValueError("INVALID_START")
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, body TEXT)")
        self.db.execute("CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, body TEXT)")
        row = self.db.execute("SELECT body FROM state WHERE id=1").fetchone()
        self.s: dict[str, Any] = json.loads(row[0]) if row else initial()
        if row and self.s.get("identity", "DEMO") != identity:
            self.db.close()
            raise ValueError("SESSION_IDENTITY_MISMATCH")
        if not row:
            self.s.update(identity=identity, cursor=start)
            self.s["day"] = self.now().astimezone(timezone(timedelta(hours=9))).date().isoformat()
            self.save("INITIALIZED_" + self.source)

    def now(self) -> datetime:
        return datetime.fromisoformat(self.candles[self.s["cursor"]]["time"]) + timedelta(
            hours=4, seconds=15
        )

    def price(self) -> D:
        return D(self.candles[self.s["cursor"]]["close"])

    def equity(self) -> D:
        p = self.s["position"]
        return D(self.s["cash"]) + (D(p["qty"]) * self.price() if p else D(0))

    def refresh(self) -> None:
        equity = self.equity()
        day = self.now().astimezone(timezone(timedelta(hours=9))).date().isoformat()
        if not self.s["day"]:
            self.s["day"], self.s["day_equity"] = day, str(equity)
        if equity <= D(self.s["day_equity"]) * D(".98"):
            self.s["daily_blocked"] = True
        self.s["peak_equity"] = str(max(equity, D(self.s["peak_equity"])))
        if equity <= D(self.s["peak_equity"]) * D(".92") and self.s["mode"] == "PAPER":
            self.s["mode"] = "SAFE_PAUSED"
        if self.s["cooldown"] and self.now() >= datetime.fromisoformat(self.s["cooldown"]):
            self.s.update(cooldown=None, loss_streak=0, second_strike=True)

    def gate(self) -> None:
        self.refresh()
        if self.s["mode"] != "PAPER":
            raise ValueError("REJECT_MODE_NOT_ALLOWED")
        if self.s["position"]:
            raise ValueError("REJECT_POSITION_EXISTS")
        if self.s["daily_blocked"]:
            raise ValueError("REJECT_DAILY_LOSS_LIMIT")
        if self.equity() <= D(self.s["peak_equity"]) * D(".92"):
            raise ValueError("REJECT_DRAWDOWN_LIMIT")
        if self.s["cooldown"] or self.s["manual_loss_lock"]:
            raise ValueError("REJECT_LOSS_STREAK")

    def buy(self, stop: str) -> None:
        self.gate()
        if self.s["pending"] or self.s["last_buy_cursor"] == self.s["cursor"]:
            raise ValueError("REJECT_DUPLICATE_SIGNAL")
        size(self.equity(), D(self.s["cash"]), self.price(), D(stop),
             self.costs.fee, self.costs.slippage)
        self.s["pending"] = {"stop": stop, "signal_time": self.now().isoformat()}
        self.s["last_buy_cursor"] = self.s["cursor"]
        self.s["last_decision"] = "QUEUED_NEXT_OPEN"

    def exit_position(self, reference: D, reason: str) -> None:
        p = self.s["position"]
        if not p:
            raise ValueError("REJECT_NO_POSITION")
        fill = reference * (1 - self.costs.slippage)
        gross = D(p["qty"]) * fill
        fee = gross * self.costs.fee
        net_pnl = gross - fee - D(p["cost"])
        self.s["cash"] = str(D(self.s["cash"]) + gross - fee)
        self.s["trades"].append(
            dict(
                time=self.now().isoformat(),
                qty=p["qty"],
                entry=p["entry"],
                exit=str(fill),
                fee=str(fee + D(p["entry_fee"])),
                net_pnl=str(net_pnl),
                reason=reason,
            )
        )
        self.s["position"] = None
        self.s["loss_streak"] = self.s["loss_streak"] + 1 if net_pnl < 0 else 0
        if self.s["second_strike"] and self.s["loss_streak"] >= 2:
            self.s["manual_loss_lock"] = True
        elif self.s["loss_streak"] >= 3:
            self.s["cooldown"] = (self.now() + timedelta(hours=24)).isoformat()
        self.s["last_decision"] = reason

    def sell(self) -> None:
        if self.s["mode"] == "EMERGENCY_STOP":
            raise ValueError("REJECT_MODE_NOT_ALLOWED")
        self.exit_position(self.price(), "MANUAL_PAPER_EXIT")

    def step(self) -> None:
        cursor = self.s["cursor"] + 1
        if cursor >= len(self.candles):
            raise ValueError("DEMO_END_RESET_REQUIRED")
        candle = self.candles[cursor]
        validate_candle(
            candle,
            self.candles[cursor - 1],
            datetime.fromisoformat(candle["time"]) + timedelta(hours=4, seconds=15),
        )
        # Day rollover uses prior mark, not the future close of this candle.
        newday = (
            (datetime.fromisoformat(candle["time"]) + timedelta(hours=4, seconds=15))
            .astimezone(timezone(timedelta(hours=9)))
            .date()
            .isoformat()
        )
        if newday != self.s["day"]:
            self.s["day"], self.s["day_equity"] = newday, str(self.equity())
            self.s["daily_blocked"] = False
        pending = self.s["pending"]
        self.s["pending"] = None
        if pending:
            try:
                self.gate()
                sized = size(
                    self.equity(), D(self.s["cash"]), D(candle["open"]), D(pending["stop"]),
                    self.costs.fee, self.costs.slippage
                )
                gross = sized.qty * sized.entry_fill
                fee = gross * self.costs.fee
                self.s["cash"] = str(D(self.s["cash"]) - gross - fee)
                self.s["position"] = dict(
                    qty=str(sized.qty),
                    entry=str(sized.entry_fill),
                    stop=pending["stop"],
                    cost=str(gross + fee),
                    entry_fee=str(fee),
                    risk_budget=str(sized.risk_budget),
                    planned_risk=str(sized.qty * sized.unit_risk),
                )
                self.s["last_decision"] = "PAPER_FILLED"
            except ValueError as exc:
                self.s["last_decision"] = str(exc)
        self.s["cursor"] = cursor
        p = self.s["position"]
        if p and D(candle["low"]) <= D(p["stop"]) and self.s["mode"] != "EMERGENCY_STOP":
            self.exit_position(min(D(p["stop"]), D(candle["open"])), "STOP_LOSS")
        self.refresh()

    def mode(self, action: str, confirmation: str) -> None:
        if action == "pause":
            if self.s["mode"] != "PAPER":
                raise ValueError("INVALID_TRANSITION")
            self.s["mode"] = "SAFE_PAUSED"
        elif action == "stop" and confirmation == "STOP":
            self.s["mode"] = "EMERGENCY_STOP"
        elif action == "resume" and confirmation == "RESUME":
            if self.s["mode"] == "EMERGENCY_STOP":
                self.s["mode"] = "SAFE_PAUSED"
            elif self.s["mode"] == "SAFE_PAUSED":
                if self.equity() <= D(self.s["peak_equity"]) * D(".92"):
                    raise ValueError("REJECT_DRAWDOWN_LIMIT")
                self.s["mode"] = "PAPER"
                if self.s["manual_loss_lock"]:
                    self.s.update(manual_loss_lock=False, loss_streak=0)
            else:
                raise ValueError("INVALID_TRANSITION")
        else:
            raise ValueError("CONFIRMATION_REQUIRED")
        self.s["pending"] = None
        self.s["last_decision"] = self.s["mode"]

    def save(self, event: str) -> None:
        self.refresh()
        with self.db:
            self.db.execute("INSERT OR REPLACE INTO state VALUES (1,?)", (json.dumps(self.s),))
            self.db.execute(
                "INSERT INTO audit(body) VALUES (?)",
                (
                    json.dumps(
                        dict(
                            time=self.now().isoformat(),
                            event=event,
                            decision=self.s["last_decision"],
                            mode=self.s["mode"],
                        )
                    ),
                ),
            )

    def view(self) -> dict[str, Any]:
        result = dict(self.s)
        equity = self.equity()
        result.update(
            equity=str(equity),
            drawdown=str(1 - equity / D(self.s["peak_equity"])),
            daily_pnl=str(equity - D(self.s["day_equity"])),
            price=str(self.price()),
            timestamp=self.now().isoformat(),
            source=self.source,
            costs_checksum=self.costs.checksum,
            fee_rate=str(self.costs.fee),
            slippage_rate=str(self.costs.slippage),
            candles=self.candles[: self.s["cursor"] + 1],
            audit=[
                json.loads(r[0])
                for r in self.db.execute("SELECT body FROM audit ORDER BY id DESC LIMIT 100")
            ],
        )
        return result
