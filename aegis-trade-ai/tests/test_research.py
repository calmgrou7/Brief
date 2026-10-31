import copy
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal as D

import httpx
import pytest

from backend.app.data import demo_candles
from backend.app.engine import Engine
from backend.app.quotation import PublicQuotation, QuotationError
from backend.app.research import Replay, digest, exclusive, stop_on_unhealthy_quote
from backend.app.strategy import Baseline

UTC = timezone.utc
NOW = datetime(2026, 2, 1, tzinfo=UTC)


def dataset():
    return dict(source="SYNTHETIC", market="KRW-BTC", unit=240,
                fetched_at=NOW.isoformat(), candles=demo_candles())


def row(ts, price="100000000.12345678"):
    return dict(market="KRW-BTC", unit=240, candle_date_time_utc=ts.isoformat()[:19],
                opening_price=price, high_price=price, low_price=price,
                trade_price=price, candle_acc_trade_volume="1.12345678")


def api(handler):
    delays = []
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return PublicQuotation(client, delays.append), delays


def test_closed_grace_and_decimal_and_public_request():
    now = datetime(2026, 1, 2, 4, 0, 14, tzinfo=UTC)
    def handler(request):
        assert request.method == "GET"
        assert str(request.url).startswith("https://api.upbit.com/v1/candles/minutes/240?")
        assert "authorization" not in request.headers and "origin" not in request.headers
        assert request.extensions["timeout"]["read"] == 10
        rows = [row(now.replace(hour=h, second=0)) for h in (4, 0)]
        rows += [row(now.replace(day=1, hour=20, second=0))]
        # Actual JSON numeric precision must survive parsing.
        return httpx.Response(200, text=json.dumps(rows).replace('"100000000.12345678"',
                                                                 '100000000.12345678'))
    service, _ = api(handler)
    data = service.candles(now=now)
    assert len(data["candles"]) == 1
    assert data["candles"][0]["close"] == "100000000.12345678"
    data = service.candles(now=now + timedelta(seconds=1))
    assert len(data["candles"]) == 2


def test_pagination_exclusive_sorted_and_gap():
    calls = []
    def handler(request):
        before = datetime.fromisoformat(request.url.params["to"])
        calls.append(before)
        return httpx.Response(200, json=[row(before - timedelta(hours=4 * i))
                                         for i in range(1, 201)])
    service, delays = api(handler)
    result = service.candles(now=NOW, pages=2)
    assert len(result["candles"]) == 399
    assert calls[1] == NOW - timedelta(hours=800)
    assert result["gaps"] == [] and delays == [1, 1]
    service, _ = api(lambda r: httpx.Response(200, json=[
        row(NOW - timedelta(hours=8)), row(NOW - timedelta(hours=16))]))
    assert service.candles(now=NOW)["status"] == "GAP"


@pytest.mark.parametrize("status", [429, 500, 503])
def test_retry_bounded(status):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(status)
    service, delays = api(handler)
    with pytest.raises(QuotationError, match=str(status)):
        service.candles(now=NOW)
    assert len(calls) == 3 and delays == [1, 2, 4]


def test_budget_cooldown_block_redirect_timeout():
    responses = iter([httpx.Response(200, json=[], headers={"Remaining-Req": "group=candle; sec=0"}),
                      httpx.Response(200, json=[])])
    service, delays = api(lambda r: next(responses))
    service.candles(now=NOW)
    service.candles(now=NOW)
    assert delays == [1, 2]
    for status, headers, expected in [(418, {}, "418"), (302, {"Location": "https://example.org"},
                                                       "302"),
                                      (429, {"Retry-After": "300"}, "COOLDOWN")]:
        calls = []
        def handler(request):
            calls.append(request)
            return httpx.Response(status, headers=headers)
        service, _ = api(handler)
        with pytest.raises(QuotationError, match=expected):
            service.candles(now=NOW)
        if status == 418:
            with pytest.raises(QuotationError, match="418"):
                service.candles(now=NOW)
        assert len(calls) == 1
    def timeout(request):
        raise httpx.ReadTimeout("timeout")
    service, delays = api(timeout)
    with pytest.raises(QuotationError, match="NETWORK"):
        service.candles(now=NOW)
    assert delays == [1, 2, 4]


@pytest.mark.parametrize("body", [None, {}, [{"market": "KRW-OTHER"}],
                                  [row(NOW-timedelta(hours=4))] * 2])
def test_invalid_responses(body):
    service, _ = api(lambda r: httpx.Response(200, json=body))
    with pytest.raises(QuotationError):
        service.candles(now=NOW)


def test_ticker_fresh_stale_future_and_admission_persists(tmp_path):
    for age, expected in [(0, "OK"), (60, "OK"), (61, "STALE"), (-1, "STALE")]:
        service, _ = api(lambda r: httpx.Response(200, json=[dict(
            market="KRW-BTC", trade_price="123.45",
            trade_timestamp=int((NOW-timedelta(seconds=age)).timestamp()*1000))]))
        quote = service.ticker(now=NOW)
        assert quote["status"] == expected
    engine = Engine(tmp_path / "stale.db")
    engine.buy(str(engine.price() * D(".97")))
    quote.update(status="OK", time=NOW.isoformat(), received_at=NOW.isoformat())
    assert not stop_on_unhealthy_quote(engine, quote, NOW)
    assert stop_on_unhealthy_quote(engine, quote, NOW + timedelta(seconds=61))
    assert engine.s["pending"] is None and engine.s["mode"] == "SAFE_PAUSED"
    engine.db.close()
    engine = Engine(tmp_path / "stale.db")
    assert not stop_on_unhealthy_quote(engine, quote, NOW)
    assert engine.s["mode"] == "SAFE_PAUSED"  # Explicit resume required.
    engine.mode("stop", "STOP")
    stop_on_unhealthy_quote(engine, {}, NOW)
    assert engine.s["mode"] == "EMERGENCY_STOP"
    engine.db.close()


def test_baseline_reference_and_prefix():
    strategy = Baseline(3, "0.1")
    bars = [{"close": str(v)} for v in [100, 101, 102]]
    assert strategy.proposal(bars[:2], False) is None
    assert strategy.proposal(bars, False) == "91.8"
    assert strategy.proposal(bars, True) is None
    assert strategy.proposal(list(reversed(bars)), False) is None


def test_replay_resume_matches_uninterrupted_and_costs(tmp_path):
    reports = []
    for name, chunks in [("full", [20000]), ("restart", [5, 17, 20000])]:
        for steps in chunks:
            engine = Replay(tmp_path / name, dataset(), Baseline())
            engine.advance(steps)
            report = engine.report()
            engine.db.close()
        reports.append(report)
    assert digest(reports[0]) == digest(reports[1])
    assert reports[0]["actual_returns"] is False
    assert reports[0]["completed"]
    conservative = Replay(tmp_path / "conservative", dataset(), Baseline(), scenario="conservative")
    conservative.advance(20000)
    assert conservative.costs.slippage == D("0.002")
    assert conservative.report()["marked_equity"] != reports[0]["marked_equity"]
    conservative.db.close()


def test_restart_identity_and_demo_isolation(tmp_path):
    p = tmp_path / "session"
    engine = Replay(p, dataset(), Baseline())
    engine.advance(5)
    engine.db.close()
    with pytest.raises(ValueError, match="IDENTITY"):
        Replay(p, dataset(), Baseline(10))
    with pytest.raises(ValueError, match="IDENTITY"):
        Engine(p)
    p = tmp_path / "demo"
    Engine(p).db.close()
    with pytest.raises(ValueError, match="IDENTITY"):
        Replay(p, dataset(), Baseline())


def test_no_lookahead_and_holdout_cash_separation(tmp_path):
    changed = copy.deepcopy(dataset())
    for c in changed["candles"][60:]:
        for key in ("open", "high", "low", "close"):
            c[key] = str(D(c[key])*2)
    states = []
    for i, data in enumerate([dataset(), changed]):
        engine = Replay(tmp_path / str(i), data, Baseline())
        engine.advance(20)
        state = dict(engine.s)
        state.pop("identity")
        states.append(state)
        engine.db.close()
    assert states[0] == states[1]
    engine = Replay(tmp_path / "holdout", dataset(), Baseline(), partition="holdout")
    assert engine.s["cursor"] == 144 and engine.s["trades"] == []
    assert engine.s["cash"] == "1000000" and engine.s["position"] is None
    engine.db.close()


def test_gaps_and_forming_rejected_and_lock(tmp_path):
    data = dataset()
    del data["candles"][40]
    with pytest.raises(ValueError, match="GAP"):
        Replay(tmp_path / "gap", data, Baseline())
    data = dataset()
    data["fetched_at"] = data["candles"][-1]["time"]
    with pytest.raises(ValueError, match="NOT_CLOSED"):
        Replay(tmp_path / "forming", data, Baseline())
    with exclusive(tmp_path / "lock"):
        with pytest.raises(BlockingIOError):
            with exclusive(tmp_path / "lock"):
                pass


def test_interrupted_uncommitted_step_replays_once(tmp_path, monkeypatch):
    path = tmp_path / "interrupted"
    engine = Replay(path, dataset(), Baseline())
    original = copy.deepcopy(engine.s)
    def interruption(event):
        raise KeyboardInterrupt()
    monkeypatch.setattr(engine, "save", interruption)
    with pytest.raises(KeyboardInterrupt):
        engine.advance(1)
    engine.db.close()
    resumed = Replay(path, dataset(), Baseline())
    assert resumed.s == original
    resumed.advance(1)
    control = Replay(tmp_path / "control", dataset(), Baseline())
    control.advance(1)
    assert resumed.s == control.s
    resumed.db.close()
    control.db.close()


@pytest.mark.parametrize("kwargs", [{"pages": 0}, {"pages": 101}])
def test_fetch_bounds_before_network(kwargs):
    service, delays = api(lambda r: pytest.fail("Must not make request"))
    with pytest.raises(ValueError):
        service.candles(now=NOW, **kwargs)
    assert delays == []


def test_cli_holdout_requires_explicit_unlock(tmp_path):
    import subprocess
    import sys
    result = subprocess.run([sys.executable, "-m", "backend.app.research", "replay",
                             "--synthetic", "--db", str(tmp_path / "holdout"),
                             "--partition", "holdout"], capture_output=True, text=True)
    assert result.returncode == 2 and "Freeze parameters" in result.stderr
    assert not (tmp_path / "holdout").exists()


def test_ticker_uses_post_request_receipt_clock():
    observed = []
    def handler(request):
        timestamp = datetime.now(UTC)
        observed.append(timestamp)
        return httpx.Response(200, json=[dict(market="KRW-BTC", trade_price=100,
                                              trade_timestamp=int(timestamp.timestamp()*1000))])
    service, _ = api(handler)
    quote = service.ticker()
    assert datetime.fromisoformat(quote["received_at"]) >= observed[0]
    assert quote["status"] == "OK"
