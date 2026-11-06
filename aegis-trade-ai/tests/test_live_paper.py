from datetime import datetime, timedelta, timezone
from decimal import Decimal as D

import httpx
import pytest

from backend.app.engine import Engine
from backend.app.live_paper import PaperSession, run
from backend.app.quotation import PublicQuotation, QuotationError

UTC = timezone.utc
START = datetime(2026, 2, 1, 3, 59, 50, tzinfo=UTC)


class Clock:
    def __init__(self):
        self.now = START

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += timedelta(seconds=seconds)


def feed(clock):
    effective = clock() - timedelta(seconds=15)
    last = effective.replace(hour=effective.hour // 4 * 4, minute=0, second=0,
                             microsecond=0) - timedelta(hours=4)
    bars = []
    for i in range(25):
        p = str(100000000 + i * 100000)
        bars.append(dict(time=(last - timedelta(hours=4*(24-i))).isoformat(),
                         open=p, high=p, low=p, close=p))
    return dict(source="UPBIT_PUBLIC", market="KRW-BTC", unit=240, status="OK", candles=bars)


def quote(clock, price="102400000"):
    return dict(source="UPBIT_PUBLIC", market="KRW-BTC", status="OK", price=price,
                time=clock().isoformat(), received_at=clock().isoformat())


def bootstrap(tmp_path):
    clock = Clock()
    session = PaperSession(tmp_path / "session", clock)
    session.observe(feed(clock), quote(clock))
    assert session.s["pending"] is None  # no historical startup entries
    clock.advance(30)
    session.observe(feed(clock), quote(clock))
    assert session.s["pending"] and session.s["position"] is None
    return session, clock


def test_next_observed_fill_duplicate_stop_and_net_costs(tmp_path):
    session, clock = bootstrap(tmp_path)
    session.observe(feed(clock), quote(clock))  # same trade time cannot fill
    assert session.s["position"] is None
    clock.advance(10)
    session.observe(feed(clock), quote(clock, "102500000"))
    p = session.s["position"]
    assert D(p["entry"]) == D("102500000") * D("1.001")
    assert D(p["cost"]) <= D("100000") and D(p["planned_risk"]) <= D("5000")
    assert len(session.s["fills"]) == 1
    session.observe(feed(clock), quote(clock, "102500000"))
    assert len(session.s["fills"]) == 1
    clock.advance(10)
    session.observe(feed(clock), quote(clock, "98000000"))
    assert session.s["position"] is None
    assert len(session.s["trades"]) == 1 and len(session.s["fills"]) == 2
    expected = D(p["qty"]) * D("98000000") * D(".999") * D(".9995") - D(p["cost"])
    assert D(session.report()["realized_net_pnl"]) == expected
    session.db.close()


def test_restart_pending_cancel_no_backfill_entry_and_position_restored(tmp_path):
    session, clock = bootstrap(tmp_path)
    session.db.close()
    clock.advance(4 * 3600)
    restored = PaperSession(tmp_path / "session", clock)
    assert restored.s["pending"] is None
    restored.observe(feed(clock), quote(clock))
    assert restored.s["position"] is None and restored.s["pending"] is None
    clock.advance(4 * 3600)
    restored.observe(feed(clock), quote(clock))
    clock.advance(10)
    restored.observe(feed(clock), quote(clock))
    position = restored.s["position"]
    restored.db.close()
    restored = PaperSession(tmp_path / "session", clock)
    assert restored.s["position"] == position and len(restored.s["fills"]) == 1
    clock.advance(10)
    restored.observe(feed(clock), quote(clock, "97000000"))
    assert restored.s["position"] is None and len(restored.s["trades"]) == 1
    restored.db.close()


@pytest.mark.parametrize("bad", ["stale", "gap", "forming", "reverse", "missing", "market"])
def test_bad_feed_pauses_and_cancels(tmp_path, bad):
    session, clock = bootstrap(tmp_path)
    data, tick = feed(clock), quote(clock)
    if bad == "stale":
        tick["time"] = (clock()-timedelta(seconds=61)).isoformat()
    elif bad == "gap":
        del data["candles"][10]
    elif bad == "forming":
        data["candles"][-1]["time"] = clock().replace(minute=0, second=0).isoformat()
    elif bad == "reverse":
        tick["time"] = (clock()-timedelta(seconds=1)).isoformat()
    elif bad == "missing":
        data["candles"].pop()
    else:
        tick["market"] = "KRW-OTHER"
    session.observe(data, tick)
    assert session.s["mode"] == "SAFE_PAUSED" and session.s["pending"] is None
    session.db.close()
    restored = PaperSession(tmp_path / "session", clock)
    assert restored.s["mode"] == "SAFE_PAUSED"
    restored.db.close()


def test_pending_expiration_and_risk_recheck(tmp_path):
    session, clock = bootstrap(tmp_path)
    clock.advance(61)
    session.observe(feed(clock), quote(clock))
    assert session.s["pending"] is None and session.s["position"] is None
    clock.advance(4 * 3600)
    session.observe(feed(clock), quote(clock))
    assert session.s["pending"]
    session.s["daily_blocked"] = True
    clock.advance(1)
    session.observe(feed(clock), quote(clock))
    assert session.s["position"] is None and session.s["last_decision"] == 'REJECT_DAILY_LOSS_LIMIT'
    session.db.close()


def test_emergency_blocks_stop_and_entries(tmp_path):
    session, clock = bootstrap(tmp_path)
    clock.advance(1)
    session.observe(feed(clock), quote(clock))
    session.mode("stop", "STOP")
    session.save("OPERATOR_STOP")
    clock.advance(1)
    session.observe(feed(clock), quote(clock, "90000000"))
    assert session.s["position"] and session.s["mode"] == "EMERGENCY_STOP"
    session.db.close()
    restored = PaperSession(tmp_path / "session", clock, resume=True)
    assert restored.s["mode"] == "EMERGENCY_STOP"
    restored.db.close()


class FixtureAPI:
    def __init__(self, clock, failure=False):
        self.clock, self.failure, self.calls = clock, failure, 0

    def candles(self, **kwargs):
        self.calls += 1
        if self.failure:
            raise QuotationError("PUBLIC_HTTP_429")
        return feed(self.clock)

    def ticker(self):
        self.calls += 1
        return quote(self.clock)


def test_bounded_fixture_loop_and_deadline(tmp_path):
    clock = Clock()
    session = PaperSession(tmp_path / "loop", clock)
    api = FixtureAPI(clock)
    result = run(session, api, polls=5, seconds=45, interval=15,
                 monotonic=lambda: clock().timestamp(), sleep=clock.advance)
    assert api.calls == 6  # at 0,15,30 seconds; no requests at deadline
    assert result["state"]["mode"] == "SAFE_PAUSED"
    assert result["state"]["pending"] is None
    assert result["actual_returns"] is False
    session.db.close()


def test_feed_failure_and_stop_requested(tmp_path):
    for failed in (False, True):
        clock = Clock()
        session = PaperSession(tmp_path / str(failed), clock)
        api = FixtureAPI(clock, failure=failed)
        result = run(session, api, polls=3, seconds=30, stopped=lambda: not failed,
                     monotonic=lambda: clock().timestamp(), sleep=clock.advance)
        assert result["state"]["mode"] == "SAFE_PAUSED"
        assert api.calls == (1 if failed else 0)
        session.db.close()


def test_cancel_between_adapter_retries():
    calls, delays = [], []
    def handler(request):
        calls.append(request)
        return httpx.Response(429)
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        api = PublicQuotation(client, delays.append)
        api.can_request = lambda: len(calls) < 1
        with pytest.raises(QuotationError, match="CANCELLED"):
            api.ticker()
    assert len(calls) == 1


def test_no_demo_database_mix_and_no_automatic_resume(tmp_path):
    clock = Clock()
    Engine(tmp_path / "demo").db.close()
    with pytest.raises(ValueError, match="IDENTITY"):
        PaperSession(tmp_path / "demo", clock)
    session = PaperSession(tmp_path / "session", clock)
    session.pause("BOUNDED_RUN_STOPPED")
    session.db.close()
    session = PaperSession(tmp_path / "session", clock)
    assert session.s["mode"] == "SAFE_PAUSED"
    session.db.close()
    session = PaperSession(tmp_path / "session", clock, resume=True)
    assert session.s["mode"] == "PAPER"
    session.db.close()


def test_interrupt_before_fill_commit_restores_durable_state(tmp_path, monkeypatch):
    session, clock = bootstrap(tmp_path)
    clock.advance(1)
    save = session.save
    def interrupted(event):
        if event == "PUBLIC_PAPER_OBSERVATION":
            raise KeyboardInterrupt()
        save(event)
    monkeypatch.setattr(session, "save", interrupted)
    with pytest.raises(KeyboardInterrupt):
        session.observe(feed(clock), quote(clock))
    assert session.s["position"] is None and session.s["cash"] == "1000000"
    session.pause("INTERRUPTED")
    session.db.close()
    restored = PaperSession(tmp_path / "session", clock)
    assert restored.s["fills"] == [] and restored.s["pending"] is None
    restored.db.close()


def test_cli_stop_file_and_competing_lock_without_network(tmp_path):
    import json
    import subprocess
    import sys
    from backend.app.research import exclusive
    stop = tmp_path / "STOP"
    stop.touch()
    command = [sys.executable, "-m", "backend.app.live_paper", "--start-paper", "--db",
               str(tmp_path / "cli"), "--stop-file", str(stop), "--polls", "1"]
    result = subprocess.run(command, capture_output=True, text=True, timeout=5)
    assert result.returncode == 0
    assert json.loads(result.stdout)["state"]["mode"] == "SAFE_PAUSED"
    with exclusive(tmp_path / "cli"):
        result = subprocess.run(command, capture_output=True, text=True, timeout=5)
    assert result.returncode == 1 and json.loads(result.stdout)["status"] == "ERROR"


def test_bounded_loop_with_actual_adapter_and_mock_http(tmp_path):
    clock = Clock()
    clock.advance(5)
    calls = []
    def handler(request):
        calls.append(request.url.path)
        if request.url.path == "/v1/candles/minutes/240":
            cutoff = datetime.fromisoformat(request.url.params['to'])
            data = feed(lambda: cutoff)
            rows = [dict(market='KRW-BTC', unit=240, candle_date_time_utc=c['time'][:19],
                         opening_price=c['open'], high_price=c['high'], low_price=c['low'],
                         trade_price=c['close'], candle_acc_trade_volume='1')
                    for c in reversed(data['candles'])]
        else:
            assert request.url.path == "/v1/ticker"
            rows = [dict(market='KRW-BTC', trade_price='102400000',
                         trade_timestamp=int(clock().timestamp()*1000))]
        return httpx.Response(200, json=rows, headers={'Remaining-Req': 'group=candle; sec=9'})
    class ClockedQuotation(PublicQuotation):
        def ticker(self, **kwargs):
            return super().ticker(now=clock() + timedelta(seconds=self.delay))
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        api = ClockedQuotation(client, clock.advance)
        session = PaperSession(tmp_path / 'integrated', clock)
        report = run(session, api, polls=3, seconds=90, interval=20,
                     monotonic=lambda: clock().timestamp(), sleep=clock.advance)
    assert len(calls) == 6
    assert len(report['state']['fills']) == 1
    assert report['state']['mode'] == 'SAFE_PAUSED'
    assert report['state']['pending'] is None
    session.db.close()
