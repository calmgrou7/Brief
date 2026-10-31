"""Immutable shared costs; config uses the JSON subset of YAML, no YAML loader needed."""

import hashlib
import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path


@dataclass(frozen=True)
class Costs:
    fee: Decimal
    slippage: Decimal
    checksum: str


def load_costs(scenario: str = "base") -> Costs:
    raw = (Path(__file__).resolve().parents[2] / "config" / "costs.yaml").read_bytes()
    data = json.loads(raw)[scenario]
    fee, slip = Decimal(data["fee"]), Decimal(data["slippage"])
    if not fee.is_finite() or not slip.is_finite() or not (0 <= fee < 1 and 0 <= slip < 1):
        raise ValueError("Invalid cost configuration")
    return Costs(fee, slip, hashlib.sha256(raw).hexdigest())


DEFAULT_COSTS = load_costs()
