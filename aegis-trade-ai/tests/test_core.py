from datetime import datetime, timedelta
from decimal import Decimal as D

import pytest
from fastapi.testclient import TestClient

from backend.app.data import demo_candles, validate_candle
from backend.app.engine import Engine
from backend.app.main import create_app
from backend.app.risk import size
from scripts.check_forbidden import violations


@pytest.mark.parametrize(
    "stop,qty", [("97000000", "0.00099950"), ("90000000", "0.00049529"), ("99000000", "0.00099950")]
)
def test_zero_slip_golden(stop, qty):
    assert size(D("1000000"), D("1000000"), D("100000000"), D(stop), slip=D(0)).qty == D(qty)


def test_exit_slippage_regression():
    s = size(D("1000000"), D("1000000"), D("100000000"), D("90000000"))
    assert s.unit_risk == D("10285005")
    assert s.qty == D("0.00048614")
    assert s.qty * s.unit_risk == D("4999.95233070")
    assert D("0.00049043") * s.unit_risk == D("5044.07500215")


@pytest.mark.parametrize(
    "equity,stop",
    [
        ("40000", "97000000"),
        ("1000000", "100000000"),
        ("1000000", "NaN"),
        ("1000000", "-1"),
        ("Infinity", "90000000"),
    ],
)
def test_invalid(equity, stop):
    with pytest.raises(ValueError):
        size(D(equity), D("1000000"), D("100000000"), D(stop))


def test_cash_cap():
    s = size(D("1000000"), D("10000"), D("100000000"), D("97000000"))
    assert s.qty * s.entry_fill * D("1.0005") <= D("10000")
    assert s.qty * s.unit_risk <= s.risk_budget


def test_data_validation():
    a, b = demo_candles()[:2]
    now = datetime.fromisoformat(b["time"]) + timedelta(hours=4, seconds=15)
    validate_candle(b, a, now)
    for bad in [dict(b, high="1"), dict(b, time=a["time"]), dict(b, low="NaN")]:
        with pytest.raises(ValueError):
            validate_candle(bad, a, now)
    with pytest.raises(ValueError):
        validate_candle(b, a, now - timedelta(seconds=1))


def test_next_open_persistence_and_pause(tmp_path):
    p = tmp_path / "demo.db"
    e = Engine(p)
    e.buy("80000000")
    assert e.s["position"] is None
    with pytest.raises(ValueError):
        e.buy("80000000")
    expected = D(e.candles[e.s["cursor"] + 1]["open"]) * D("1.001")
    e.step()
    assert D(e.s["position"]["entry"]) == expected
    e.mode("stop", "STOP")
    with pytest.raises(ValueError):
        e.sell()
    e.save("test")
    e.db.close()
    e = Engine(p)
    assert e.s["mode"] == "EMERGENCY_STOP"
    e.mode("resume", "RESUME")
    assert e.s["mode"] == "SAFE_PAUSED"
    e.sell()
    assert e.s["position"] is None
    e.db.close()


def test_api(tmp_path):
    with TestClient(create_app(tmp_path / "api.db")) as client:
        state = client.get("/api/state").json()
        assert state["source"] == "DEMO"
        assert client.post("/api/step").status_code == 403
        headers = {"X-CSRF-Token": state["csrf_token"]}
        assert client.post("/api/buy", json={"stop": "NaN"}, headers=headers).status_code == 400
        assert (
            client.post("/api/buy", json={"stop": "80000000"}, headers=headers).status_code == 200
        )
        assert client.post("/api/step", headers=headers).status_code == 200
        assert (
            client.post(
                "/api/mode", json={"action": "stop", "confirmation": "STOP"}, headers=headers
            ).json()["mode"]
            == "EMERGENCY_STOP"
        )
        assert (
            client.post("/api/reset", json={"confirmation": "bad"}, headers=headers).status_code
            == 400
        )
        assert (
            client.post("/api/step", headers={**headers, "Origin": "https://evil.test"}).status_code
            == 403
        )


def test_guard(tmp_path):
    (tmp_path / "bad.py").write_text('"/v1/orders"')
    assert violations(tmp_path)


def test_all_demo_candles_valid():
    previous = None
    for c in demo_candles():
        validate_candle(
            c, previous, datetime.fromisoformat(c["time"]) + timedelta(hours=4, seconds=15)
        )
        previous = c


def test_daily_loss_latched_and_pause_preserves_streak(tmp_path):
    e = Engine(tmp_path / "risk.db")
    e.s["cash"] = "980000"
    e.refresh()
    assert e.s["daily_blocked"]
    e.s["cash"] = "1000000"
    with pytest.raises(ValueError, match="DAILY_LOSS"):
        e.gate()
    e.s["loss_streak"] = 2
    e.mode("pause", "")
    e.mode("resume", "RESUME")
    assert e.s["loss_streak"] == 2
    e.db.close()


def test_midnight_baseline_uses_prior_mark(tmp_path):
    e = Engine(tmp_path / "day.db")
    while e.now().hour != 12:
        e.step()
    old_equity = e.equity()
    old_day = e.s["day"]
    e.step()  # 16 UTC = 01 KST, midnight crossed using preceding completed mark
    assert e.s["day"] != old_day
    assert D(e.s["day_equity"]) == old_equity
    e.db.close()


def test_gap_stop_can_exceed_budget(tmp_path):
    e = Engine(tmp_path / "gap.db")
    e.buy(str(e.price() * D(".90")))
    e.step()
    budget = D(e.s["position"]["risk_budget"])
    nxt = e.candles[e.s["cursor"] + 1]
    gap = D(e.s["position"]["stop"]) * D(".80")
    nxt.update(open=str(gap), high=str(gap + D("100")), low=str(gap - D("100")), close=str(gap))
    e.step()
    assert e.s["position"] is None
    assert -D(e.s["trades"][-1]["net_pnl"]) > budget
    e.db.close()


def test_stop_cancels_pending_and_blocks_auto_exit(tmp_path):
    e = Engine(tmp_path / "stop.db")
    e.buy(str(e.price() * D(".90")))
    e.mode("stop", "STOP")
    e.step()
    assert e.s["position"] is None
    e.mode("resume", "RESUME")
    e.mode("resume", "RESUME")
    e.buy(str(e.price() * D(".90")))
    e.step()
    e.mode("stop", "STOP")
    nxt = e.candles[e.s["cursor"] + 1]
    gap = D(e.s["position"]["stop"]) * D(".90")
    nxt.update(open=str(gap), high=str(gap), low=str(gap), close=str(gap))
    e.step()
    assert e.s["position"] is not None
    e.db.close()


def test_cooldown_and_second_strike(tmp_path):
    e = Engine(tmp_path / "cool.db")
    for _ in range(3):
        e.s["position"] = dict(
            qty="0.001", entry="100000000", stop="90000000", cost="100000", entry_fee="0"
        )
        e.exit_position(D("99000000"), "TEST_LOSS")
    assert e.s["cooldown"]
    with pytest.raises(ValueError, match="LOSS_STREAK"):
        e.gate()
    for _ in range(6):
        e.step()
    assert e.s["cooldown"] is None and e.s["second_strike"]
    for _ in range(2):
        e.s["position"] = dict(
            qty="0.001", entry="100000000", stop="90000000", cost="100000", entry_fee="0"
        )
        e.exit_position(D("99000000"), "TEST_LOSS")
    assert e.s["manual_loss_lock"]
    e.db.close()


def test_single_instance_and_nonpaper_startup(tmp_path, monkeypatch):
    path = tmp_path / "one.db"
    with TestClient(create_app(path)):
        with pytest.raises(BlockingIOError):
            with TestClient(create_app(path)):
                pass
    monkeypatch.setenv("TRADING_MODE", "OTHER")
    with pytest.raises(RuntimeError, match="PAPER"):
        with TestClient(create_app(tmp_path / "other.db")):
            pass


def test_ui_assets(tmp_path):
    with TestClient(create_app(tmp_path / "ui.db")) as client:
        for path in ["/", "/static/app.js", "/static/styles.css"]:
            r = client.get(path)
            assert r.status_code == 200
            assert "frame-ancestors 'none'" in r.headers["Content-Security-Policy"]


def test_r2_g7_exact_gap_loss():
    sized = size(D("1000000"), D("1000000"), D("100000000"), D("90000000"))
    fill = D("85000000") * D(".999")
    loss = sized.qty * (sized.entry_fill * D("1.0005") - fill * D(".9995"))
    assert fill == D("84915000")
    assert loss == D("7427.00749605")


def test_r2_g8_cash_limit():
    sized = size(D("1000000"), D("60000"), D("100000000"), D("97000000"))
    assert sized.qty == D("0.00059910")
    assert sized.qty * sized.entry_fill * D("1.0005") == D("59999.894955")


@pytest.mark.parametrize("equity,qty", [("50000", None), ("50100", "0.00005002")])
def test_r2_g9_g10_boundary(equity, qty):
    if qty is None:
        with pytest.raises(ValueError, match="REJECT_MIN_ORDER"):
            size(D(equity), D(equity), D("100000000"), D("97000000"))
    else:
        sized = size(D(equity), D(equity), D("100000000"), D("97000000"))
        assert sized.qty == D(qty)
        assert sized.qty * sized.entry_fill == D("5007.002")


def test_r2_g11_zero_entry():
    with pytest.raises(ValueError, match="REJECT_INVALID_INPUT"):
        size(D("1000000"), D("1000000"), D(0), D("97000000"))


def test_cost_scenarios_and_spend_invariants():
    from backend.app.costs import load_costs

    for scenario in ["base", "conservative"]:
        costs = load_costs(scenario)
        assert len(costs.checksum) == 64
        for cash in ["10000", "60000", "1000000"]:
            for stop in ["50000000", "90000000", "97000000", "99999999"]:
                sized = size(
                    D("1000000"), D(cash), D("100000000"), D(stop), costs.fee, costs.slippage
                )
                spend = sized.qty * sized.entry_fill * (1 + costs.fee)
                assert spend <= min(D(cash), D("100000"))
                assert sized.qty * sized.unit_risk <= D("5000")


def test_named_ui_and_failed_action_rollback(tmp_path):
    with TestClient(create_app(tmp_path / "name.db")) as client:
        assert "upbit 프로젝트" in client.get("/").text
        state = client.get("/api/state").json()
        headers = {"X-CSRF-Token": state["csrf_token"]}
        bad = client.post("/api/buy", headers=headers, json={"stop": "Infinity"})
        assert bad.status_code == 400
        after = client.get("/api/state").json()
        assert after["cash"] == state["cash"] and after["position"] is None
        assert after["pending"] is None
