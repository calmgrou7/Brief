"""Pure, Decimal-only cost and position sizing model; no network or account access."""

from dataclasses import dataclass
from decimal import Decimal, ROUND_DOWN

from .costs import DEFAULT_COSTS

D = Decimal

FEE = DEFAULT_COSTS.fee
SLIPPAGE = DEFAULT_COSTS.slippage
STEP = D("0.00000001")


@dataclass(frozen=True)
class Size:
    qty: Decimal
    entry_fill: Decimal
    stop_fill: Decimal
    unit_risk: Decimal
    risk_budget: Decimal


def size(
    equity: Decimal,
    cash: Decimal,
    entry: Decimal,
    stop: Decimal,
    fee: Decimal = FEE,
    slip: Decimal = SLIPPAGE,
) -> Size:
    values = (equity, cash, entry, stop, fee, slip)
    if any(not v.is_finite() for v in values):
        raise ValueError("REJECT_INVALID_INPUT")
    if min(equity, entry, stop) <= 0 or cash <= 0 or not (0 <= fee < 1 and 0 <= slip < 1):
        raise ValueError("REJECT_INVALID_INPUT")
    if stop >= entry:
        raise ValueError("REJECT_INVALID_STOP")
    buy, sell = entry * (1 + slip), stop * (1 - slip)
    risk = buy * (1 + fee) - sell * (1 - fee)
    budget = equity * D("0.005")
    # PRD r2: the 10% cap includes slippage and entry fee.
    qty = min(
        budget / risk, equity * D("0.10") / (buy * (1 + fee)), cash / (buy * (1 + fee))
    ).quantize(STEP, rounding=ROUND_DOWN)
    if qty * buy < D("5000"):
        raise ValueError("REJECT_MIN_ORDER")
    if (
        qty * buy * (1 + fee) > cash
        or qty * risk > budget
        or qty * buy * (1 + fee) > equity * D("0.10")
    ):
        raise ValueError("REJECT_SIZING_INVARIANT")
    return Size(qty, buy, sell, risk, budget)
