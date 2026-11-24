/* Deterministic MOCK fixture; not exchange returns. */
globalThis.PAPER_SAMPLE = {
  "execution": "BOUNDED_PUBLIC_PAPER",
  "simulated": true,
  "actual_returns": false,
  "source": "UPBIT_PUBLIC_PAPER",
  "market_data_provenance": "MOCK",
  "configured_provenance": "MOCK",
  "generated_at": "2026-02-01T04:00:40+00:00",
  "monitoring_status": "NOT_VERIFIED_FROM_SNAPSHOT",
  "mode": "SAFE_PAUSED",
  "last_saved_at": "2026-02-01T04:00:40+00:00",
  "last_decision": "POLL_LIMIT",
  "stop_reason": "POLL_LIMIT",
  "feed_status": "OK",
  "last_feed_error": null,
  "price": {
    "value": "98000000",
    "trade_time": "2026-02-01T04:00:40+00:00",
    "received_at": "2026-02-01T04:00:40+00:00",
    "freshness": "FRESH",
    "trade_age_seconds": 0.0,
    "receipt_age_seconds": 0.0
  },
  "last_processed_candle": "2026-02-01T00:00:00+00:00",
  "cash": "995416.489800802000000",
  "holdings_marked_value": "0",
  "marked_equity": "995416.489800802000000",
  "marked_net_pnl": "-4583.510199198000000",
  "realized_net_pnl": "-4583.510199198000000",
  "unrealized_net_pnl": "0",
  "total_paid_fees": "97.706163198000000",
  "pnl_reconciles": true,
  "cost_model": {
    "fee_rate": "0.0005",
    "slippage_rate": "0.001",
    "checksum": "b8ca9f15ae51efd9dc75869e5a24e71ebf7746326f77fdb45e05033144898b97"
  },
  "slippage_included_in_fill_prices": true,
  "hypothetical_exit_costs_included": false,
  "fill_count": 2,
  "closed_trade_count": 1,
  "fills": [
    {
      "side": "BUY",
      "time": "2026-02-01T04:00:30+00:00",
      "price": "102502400.000",
      "qty": "0.00097509",
      "fee": "49.974532608000000",
      "signal_time": "2026-02-01T04:00:20+00:00"
    },
    {
      "side": "SELL",
      "time": "2026-02-01T04:00:40+00:00",
      "price": "97902000.000",
      "qty": "0.00097509",
      "fee": "47.731630590000000",
      "reason": "OBSERVED_PAPER_STOP"
    }
  ],
  "trades": [
    {
      "time": "2026-02-01T04:00:40+00:00",
      "qty": "0.00097509",
      "entry": "102502400.000",
      "exit": "97902000.000",
      "fee": "97.706163198000000",
      "net_pnl": "-4583.510199198000000",
      "reason": "OBSERVED_PAPER_STOP"
    }
  ],
  "pending": null,
  "position": null,
  "open_position_not_liquidated": false,
  "monitoring_warning": "저장 상태는 실행 중임을 보장하지 않습니다. 종료 후 보유분의 가격·손절 감시는 중단됩니다."
};
