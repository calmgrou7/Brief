"""Read-only, offline PAPER account/status reporting. Never starts a trading loop."""

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from decimal import Decimal as D
from pathlib import Path
from typing import Any


def report_state(state: dict[str, Any], now: datetime) -> dict[str, Any]:
    if state.get("execution") != "BOUNDED_PUBLIC_PAPER":
        raise ValueError("NOT_A_BOUNDED_PAPER_SESSION")
    if now.utcoffset() is None:
        raise ValueError("AWARE_REPORT_TIME_REQUIRED")
    p = state["position"]
    cash, mark = D(state["cash"]), D(state["mark_price"])
    holding = D(p["qty"]) * mark if p else D(0)
    equity = cash + holding
    realized = sum((D(t["net_pnl"]) for t in state["trades"]), D(0))
    unrealized = holding - D(p["cost"]) if p else D(0)
    fees = sum((D(f["fee"]) for f in state["fills"]), D(0))
    ages: dict[str, float | None] = {}
    for key in ("last_quote_time", "last_received_at"):
        value = state.get(key)
        ages[key] = (now - datetime.fromisoformat(value)).total_seconds() if value else None
    valid_ages = [age for age in ages.values() if age is not None]
    freshness = ("UNKNOWN" if len(valid_ages) != 2 else
                 "FRESH" if all(0 <= age <= 60 for age in valid_ages) else "STALE")
    return dict(
        execution="BOUNDED_PUBLIC_PAPER", simulated=True, actual_returns=False,
        source="UPBIT_PUBLIC_PAPER", market_data_provenance=state.get("provenance",
                                                                      "LEGACY_UNVERIFIED"),
        generated_at=now.astimezone(timezone.utc).isoformat(),
        # A saved PAPER mode is NOT proof that a process is alive or monitoring.
        monitoring_status="NOT_VERIFIED_FROM_SNAPSHOT",
        mode=state["mode"], last_saved_at=state.get("saved_at"),
        last_decision=state["last_decision"], stop_reason=state.get("stop_reason"),
        feed_status=state["feed_status"], last_feed_error=state.get("last_feed_error"),
        price=dict(value=str(mark) if state.get("last_quote_time") else None,
                   trade_time=state.get("last_quote_time"),
                   received_at=state.get("last_received_at"), freshness=freshness,
                   trade_age_seconds=ages["last_quote_time"],
                   receipt_age_seconds=ages["last_received_at"]),
        last_processed_candle=state["watermark"],
        cash=str(cash), holdings_marked_value=str(holding), marked_equity=str(equity),
        marked_net_pnl=str(equity - D("1000000")), realized_net_pnl=str(realized),
        unrealized_net_pnl=str(unrealized), total_paid_fees=str(fees),
        pnl_reconciles=(equity-D("1000000") == realized+unrealized),
        cost_model=state.get("cost_model"),
        slippage_included_in_fill_prices=True, hypothetical_exit_costs_included=False,
        fill_count=len(state["fills"]), closed_trade_count=len(state["trades"]),
        fills=state["fills"], trades=state["trades"], pending=state["pending"],
        position=p, open_position_not_liquidated=bool(p),
        monitoring_warning="저장 상태는 실행 중임을 보장하지 않습니다. 종료 후 보유분의 가격·손절 감시는 중단됩니다.",
    )


def read_report(path: Path, now: datetime) -> dict[str, Any]:
    # URI-encode paths and demand an existing read-only DB; never create state/lock files.
    uri = path.resolve().as_uri() + "?mode=ro"
    with sqlite3.connect(uri, uri=True, timeout=2) as db:
        row = db.execute("SELECT body FROM state WHERE id=1").fetchone()
        if row is None:
            raise ValueError("PAPER_STATE_MISSING")
        state = json.loads(row[0])
    return report_state(state, now)


def text_report(report: dict[str, Any]) -> str:
    price = report["price"]
    return "\n".join([
        f"PAPER 모의매매 | 자료 출처: {report['market_data_provenance']}",
        f"모드: {report['mode']} | 중단 사유: {report['stop_reason'] or '기록 없음'}",
        f"피드: {report['feed_status']} | 오류: {report['last_feed_error'] or '없음'}",
        f"마지막 시세: {price['value'] or '없음'} KRW / {price['freshness']}",
        f"체결시각: {price['trade_time']} | 수신시각: {price['received_at']}",
        f"현금: {report['cash']} | 평가자산: {report['marked_equity']} KRW",
        f"실현 순손익: {report['realized_net_pnl']} | 미실현: {report['unrealized_net_pnl']}",
        f"평가 순손익: {report['marked_net_pnl']} | 누적 수수료: {report['total_paid_fees']}",
        f"모의 체결: {report['fill_count']} | 종료 거래: {report['closed_trade_count']}",
        f"미청산 보유: {report['open_position_not_liquidated']} | 손익 대사: {report['pnl_reconciles']}",
        "슬리피지는 체결가에 포함. 가상 최종청산 비용은 미차감. 실제 투자수익이 아닙니다.",
        report["monitoring_warning"],
    ])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--format", choices=["json", "text"], default="text")
    args = parser.parse_args()
    try:
        report = read_report(args.db, datetime.now(timezone.utc))
        print(json.dumps(report, ensure_ascii=False, indent=2) if args.format == "json"
              else text_report(report))
    except (OSError, sqlite3.Error, ValueError, KeyError, TypeError, ArithmeticError):
        print("PAPER_STATUS_ERROR: 읽을 수 있는 bounded PAPER 상태 DB가 필요합니다.")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
