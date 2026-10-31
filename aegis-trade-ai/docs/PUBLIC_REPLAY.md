# Public data and offline PAPER research increment

This increment adds a public quotation adapter and deterministic offline replay.
It does **not** enable live-paper execution or update the hosted static demo.
There are no account credentials, account calls, real orders, or provisioned services.

## Modes and reproducible commands

Run inside `aegis-trade-ai` (Python 3.12+, uv). Use distinct new database filenames.

```sh
make install
make lint test build
# Existing synthetic dashboard remains unchanged:
make run
# Explicit synthetic research fixture, not historical exchange performance:
uv run python -m backend.app.research replay --synthetic --db synthetic-train.sqlite3
# One real price observation; source, market, trade time, receipt time, OK/STALE:
uv run python -m backend.app.research quote
# Up to 3 public historical pages (<=200 candles each), exclusive backwards cursor:
uv run python -m backend.app.research fetch btc-4h.json --pages 3
# Offline historical replay, fixed SMA-entry/protective-stop research baseline:
uv run python -m backend.app.research replay --input btc-4h.json --db historical-train.sqlite3
uv run python -m backend.app.research replay --input btc-4h.json --db validation.sqlite3 --partition validation
# Only after parameters are frozen (not executed as part of this delivery):
uv run python -m backend.app.research replay --input btc-4h.json --db holdout.sqlite3 --partition holdout --unlock-holdout
# Cost sensitivity, separate session:
uv run python -m backend.app.research replay --input btc-4h.json --db conservative.sqlite3 --scenario conservative
```

`fetch` never overwrites its output. It has a 1–100 page limit and no scheduler.
`quote` makes one bounded observation; it does not feed a broker or keep running.
`replay --steps N` advances at most N bars (1–20,000). Rerun the identical command
and DB to resume. Do not share that DB with the dashboard. Identity checks reject
demo/research mixing and changes to dataset, partition, strategy or cost scenario.
The CLI takes a nonblocking single-process file lock. State and audit save in one
SQLite transaction per step. An interrupted uncommitted step is replayed once.
A safe pause stops the CLI; no automatic risk-limit relaxation occurs.

## Research semantics

- `SYNTHETIC` fixtures and `UPBIT_PUBLIC` datasets are explicitly distinguished.
  All reports say `OFFLINE_PAPER_REPLAY`, `simulated=true`, `actual_returns=false`.
- Baseline: close above SMA(20) proposes entry; initial stop = signal close × 0.97.
  `--lookback` and `--stop-fraction` configure this research-only baseline. It is
  **not** PRD strategy A/B/C and has no approval for unattended operation.
- Only completed bars through the signal bar enter the pure strategy. The existing
  Risk Gate sizes again at the next bar's open. Both sides pay configured fees and
  slippage; gap stops and existing drawdown/day-loss/streak limits are preserved.
- Baseline exits are protective stops only. No trailing stop or SMA exit is implied.
  Open holdings remain marked at final close, with `open_position_not_liquidated`;
  marked PnL includes unrealized value and does not deduct a hypothetical final exit.
- Chronological 60/20/20 train/validation/holdout partitions start separate cash
  accounts. Prior closes supply indicator warmup only, never carried positions.
  The default never runs validation/holdout; holdout requires explicit CLI unlock.
  This is split evaluation support, not a completed walk-forward study or enforcement
  against a researcher repeatedly inspecting holdout outside the CLI.
- Gaps are reported on fetch and rejected by replay. Missing intervals are never
  filled with invented candles. Prices/quantities/costs use Decimal; raw JSON numeric
  prices parse to Decimal before normalization.
- A reusable `stop_on_unhealthy_quote` admission interlock cancels pending entries,
  persists SAFE_PAUSED on stale/error data and preserves EMERGENCY_STOP. Both receipt
  and trade age must be 0–60 seconds. Fresh data does not automatically resume.
  It is tested infrastructure for a future live-paper runner, **not** a connected
  market-data/trading loop. Existing demo/replay do not consume live ticks.

## Official API references checked 2026-10-31

- [Korean minute candles API](https://docs.upbit.com/kr/reference/list-candles-minutes):
  fixed public `https://api.upbit.com/v1/candles/minutes/240`, `KRW-BTC`, up to 200
  records per call and exclusive `to`. No-trade intervals can be absent. The
  adapter expects reverse chronological API data, checks duplicate/order/market/OHLC,
  normalizes to ascending UTC and excludes forming bars plus the PRD's 15s grace.
- [Korean rate limits](https://docs.upbit.com/kr/reference/rate-limits): candle/ticker
  groups share their IP budgets; `Remaining-Req` supplies current seconds budget.
  Requests with Origin have a different limit. This server-side client sets no
  Origin, uses conservative >=1s pacing, timeout 10s, max 3 attempts, exponential
  backoff for 429/5xx/transport failure, and additional delay at zero budget.
  418 latches a stop for that client. Redirects are refused. Long/unknown Retry-After
  stops the run rather than retrying early. Multiple processes sharing one IP still
  require centralized budget coordination before unattended operation.

## Verified and unverified

Verified offline: original demo regression suite, public request shape and timeout,
raw numeric precision, grace boundary, pagination, gaps, malformed responses,
Remaining-Req, 429/5xx/timeout retry bounds, 418 latch, redirect refusal, stale/future
trade times, stale-pause persistence, emergency-stop preservation, strategy reference
values, future-suffix independence, deterministic replay/restart, interrupted
uncommitted step recovery, DB identity isolation, cost scenarios, partition separation,
and explicit holdout unlock. CLI synthetic replay smoke test executed.

**Actual Upbit HTTP access was not attempted:** the selected cloud environment's
currently enforced outbound allowlist excludes `api.upbit.com`. No bypass was used.
Documentation was verified through the web tool. The adapter's HTTP behavior was
verified with `httpx.MockTransport`; this is not evidence of live API connectivity.
Real response compatibility/4H boundaries, 3-year collection, real historical returns,
final holdout, websocket/orderbook freshness, live-paper restart/backfill handling,
intrabar stop monitoring, clock skew, alerts, 30-day operation and profitability are
not verified. Current demo KST day-boundary approximation remains unchanged.

Next: enable authorized public-host access, validate a small fetch and actual candle
boundaries, collect versioned history, review baseline/metrics and PRD strategy scope,
then implement and review a separate bounded live-paper runner with current-price
risk monitoring and no retrospective entries after downtime.
