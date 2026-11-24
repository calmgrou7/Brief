import copy
import json
import subprocess
import sys
from dataclasses import replace
from datetime import timedelta

import pytest

from backend.app.live_paper import PaperSession, run
from backend.app.paper_status import read_report, report_state, text_report
from backend.app.quotation import QuotationError
from test_live_paper import Clock, FixtureAPI, feed, quote


def session_with_fill(tmp_path):
    clock = Clock()
    path = tmp_path / 'mock session?#.sqlite3'
    session = PaperSession(path, clock, provenance='MOCK')
    session.observe(feed(clock), quote(clock))
    clock.advance(30)
    session.observe(feed(clock), quote(clock))
    clock.advance(10)
    session.observe(feed(clock), quote(clock))
    assert session.s['position']
    return session, clock, path


def test_report_fees_realized_unrealized_and_no_side_effects(tmp_path):
    session, clock, path = session_with_fill(tmp_path)
    state_before = copy.deepcopy(session.s)
    rows_before = session.db.execute('SELECT * FROM audit').fetchall()
    original_files = {p.name: p.read_bytes() for p in tmp_path.iterdir()}
    report = read_report(path, clock())  # WAL is still open in writer; sees latest commit.
    assert {p.name: p.read_bytes() for p in tmp_path.iterdir()} == original_files
    assert report['fill_count'] == 1 and report['pnl_reconciles']
    assert report['realized_net_pnl'] == '0'
    assert report['total_paid_fees'] == session.s['position']['entry_fee']
    assert report['marked_net_pnl'] == report['unrealized_net_pnl']
    assert report['market_data_provenance'] == 'MOCK'
    assert report['price']['freshness'] == 'FRESH'
    assert report['monitoring_status'] == 'NOT_VERIFIED_FROM_SNAPSHOT'
    assert session.s == state_before
    assert session.db.execute('SELECT * FROM audit').fetchall() == rows_before
    assert json.loads(session.db.execute('SELECT body FROM state').fetchone()[0]) == state_before
    clock.advance(10)
    session.observe(feed(clock), quote(clock, '98000000'))
    report = read_report(path, clock())
    assert report['fill_count'] == 2 and report['closed_trade_count'] == 1
    assert report['unrealized_net_pnl'] == '0'
    assert report['realized_net_pnl'] == report['marked_net_pnl']
    assert report['total_paid_fees'] == session.s['trades'][0]['fee']
    assert report['pnl_reconciles']
    session.db.close()
    before = path.read_bytes()
    files = set(tmp_path.iterdir())
    for _ in range(3):
        assert read_report(path, clock())['pnl_reconciles']
    assert path.read_bytes() == before
    assert set(tmp_path.iterdir()) == files


def test_missing_price_is_not_zero_and_legacy_provenance(tmp_path):
    clock = Clock()
    session = PaperSession(tmp_path/'empty', clock, provenance='MOCK')
    report = session.report()
    assert report['price']['value'] is None and report['price']['freshness'] == 'UNKNOWN'
    assert report['market_data_provenance'] == 'NO_OBSERVATION'
    assert report['marked_net_pnl'] == '0'  # Real zero: cash-only starting account.
    assert '마지막 시세: 없음' in text_report(report)
    session.observe(feed(clock), quote(clock))
    old = copy.deepcopy(session.s)
    old.pop('provenance')
    old.pop('last_received_at')
    old.pop('cost_model')
    report = report_state(old, clock())
    assert report['market_data_provenance'] == 'LEGACY_UNVERIFIED'
    assert report['price']['freshness'] == 'UNKNOWN' and report['cost_model'] is None
    old['last_quote_time'] = None
    old['position'] = {'qty': '1', 'cost': '100'}
    report = report_state(old, clock())
    assert report['marked_net_pnl'] is None and report['marked_equity'] is None
    assert report['unrealized_net_pnl'] is None and report['pnl_reconciles'] is None
    assert '평가 순손익: 없음' in text_report(report)
    session.db.close()


@pytest.mark.parametrize('seconds,expected', [(60,'FRESH'),(61,'STALE'),(-1,'STALE')])
def test_freshness_recomputed_without_feed_access(tmp_path, seconds, expected):
    session, clock, path = session_with_fill(tmp_path)
    report = read_report(path, clock()+timedelta(seconds=seconds))
    assert report['price']['freshness'] == expected
    assert report['price']['trade_age_seconds'] == seconds
    session.db.close()


def test_readonly_cli_missing_invalid_and_corrupt_db(tmp_path):
    missing = tmp_path/'missing'
    for path in (missing, tmp_path/'corrupt'):
        if path.name == 'corrupt':
            path.write_text('not sqlite')
        result = subprocess.run([sys.executable,'-m','backend.app.paper_status','--db',str(path)],
                                capture_output=True, text=True, timeout=5)
        assert result.returncode == 1 and 'PAPER_STATUS_ERROR' in result.stdout
    assert not missing.exists()
    assert not list(tmp_path.glob('*.lock'))


def test_cli_text_json_matches_saved_account(tmp_path):
    session, clock, path = session_with_fill(tmp_path)
    session.pause('POLL_LIMIT')
    session.db.close()
    before = path.read_bytes()
    for fmt in ('json','text'):
        result = subprocess.run([sys.executable,'-m','backend.app.paper_status','--db',str(path),
                                 '--format',fmt],capture_output=True,text=True,timeout=5)
        assert result.returncode == 0
        if fmt == 'json':
            report = json.loads(result.stdout)
            assert report['stop_reason'] == 'POLL_LIMIT'
            assert report['market_data_provenance'] == 'MOCK'
            assert report['open_position_not_liquidated']
        else:
            assert '자료 출처: MOCK' in result.stdout and '감시는 중단' in result.stdout
    assert path.read_bytes() == before


def test_restart_cost_and_provenance_mismatch_rejected_without_mutation(tmp_path, monkeypatch):
    session, clock, path = session_with_fill(tmp_path)
    session.db.close()
    original = read_report(path, clock())
    with pytest.raises(ValueError, match='IDENTITY'):
        PaperSession(path, clock)  # Mock history cannot become public history.
    from backend.app import live_paper
    costs = live_paper.load_costs()
    monkeypatch.setattr(live_paper,'load_costs',lambda: replace(costs, checksum='different'))
    with pytest.raises(ValueError, match='IDENTITY'):
        PaperSession(path, clock, provenance='MOCK')
    assert read_report(path, clock()) == original


def test_stop_reasons_and_feed_health_separate(tmp_path):
    clock = Clock()
    session = PaperSession(tmp_path/'stop',clock,provenance='MOCK')
    result = run(session,FixtureAPI(clock),polls=1,seconds=30,
                 monotonic=lambda: clock().timestamp(),sleep=clock.advance)
    assert result['stop_reason'] == 'POLL_LIMIT' and result['feed_status'] == 'OK'
    assert result['monitoring_status'] == 'STOPPED'
    session.db.close()
    restored = PaperSession(tmp_path/'stop',clock,provenance='MOCK')
    assert restored.s['mode'] == 'SAFE_PAUSED'
    assert restored.s['stop_reason'] == 'POLL_LIMIT'
    restored.db.close()


def test_cancelled_retry_is_not_reported_as_network_failure(tmp_path):
    clock = Clock()
    class Cancelled(FixtureAPI):
        def candles(self, **kwargs):
            clock.advance(31)
            raise QuotationError('PUBLIC_REQUEST_CANCELLED')
    session = PaperSession(tmp_path/'deadline',clock,provenance='MOCK')
    result = run(session,Cancelled(clock),polls=3,seconds=30,
                 monotonic=lambda: clock().timestamp(),sleep=clock.advance)
    assert result['stop_reason'] == 'TIME_LIMIT'
    assert result['last_feed_error'] is None
    assert result['market_data_provenance'] == 'NO_OBSERVATION'
    session.db.close()


def test_invalid_account_values_fail_closed(tmp_path):
    session = PaperSession(tmp_path/'invalid',Clock(),provenance='MOCK')
    bad = copy.deepcopy(session.s)
    bad['cash'] = 'NaN'
    with pytest.raises(ValueError, match='NONFINITE'):
        report_state(bad,Clock()())
    session.db.close()


def test_snapshot_busy_and_size_limits(tmp_path, monkeypatch):
    from backend.app import paper_status
    session, clock, path = session_with_fill(tmp_path)
    real_signature = paper_status.signature
    calls = []
    def unstable(p):
        calls.append(p)
        stamp = real_signature(p)
        return (*stamp[:3], len(calls)) if stamp else None
    monkeypatch.setattr(paper_status, 'signature', unstable)
    with pytest.raises(ValueError, match='BUSY'):
        read_report(path, clock())
    assert len(calls) == 12  # 2 files, before/after, 3 bounded attempts.
    monkeypatch.setattr(paper_status, 'signature', real_signature)
    monkeypatch.setattr(paper_status, 'MAX_SNAPSHOT_BYTES', 1)
    with pytest.raises(ValueError, match='TOO_LARGE'):
        read_report(path, clock())
    session.db.close()


def test_symlink_reader_includes_real_wal(tmp_path):
    session, clock, path = session_with_fill(tmp_path)
    link = tmp_path/'alias.sqlite3'
    link.symlink_to(path)
    report = read_report(link, clock())
    assert report['fill_count'] == 1 and report['market_data_provenance'] == 'MOCK'
    assert not (tmp_path/'alias.sqlite3-wal').exists()
    session.db.close()


def test_real_feed_configuration_without_observation_never_claims_received_data(tmp_path):
    clock = Clock()
    session = PaperSession(tmp_path/'public-config-only',clock)
    report = session.report()
    assert report['configured_provenance'] == 'PUBLIC_LIVE'
    assert report['market_data_provenance'] == 'NO_OBSERVATION'
    assert report['price']['value'] is None
    session.db.close()


def test_specific_feed_error_and_stale_receipt(tmp_path):
    session, clock, path = session_with_fill(tmp_path)
    bad = feed(clock)
    bad['candles'].pop()
    session.observe(bad,quote(clock))
    report = read_report(path,clock())
    assert report['feed_status'] == 'FEED_INVALID'
    assert report['last_feed_error'] == 'MISSING_LATEST_CLOSED_BAR'
    assert report['stop_reason'] == 'FEED_INVALID'
    session.db.close()


def test_risk_pause_does_not_reuse_previous_run_reason(tmp_path):
    clock = Clock()
    session = PaperSession(tmp_path/'risk',clock,provenance='MOCK')
    session.s.update(stop_reason='POLL_LIMIT', cash='920000')
    result = run(session,FixtureAPI(clock),polls=1,seconds=30,
                 monotonic=lambda: clock().timestamp(),sleep=clock.advance)
    assert result['mode'] == 'SAFE_PAUSED'
    assert result['stop_reason'] == 'RISK_PAUSED'
    assert result['monitoring_status'] == 'STOPPED'
    session.db.close()
