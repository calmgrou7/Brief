/* Pure display validation. Monetary values remain decimal strings, never float arithmetic. */
(function (root) {
  'use strict';
  const MAX_BYTES = 2 * 1024 * 1024;
  const amounts = ['cash', 'holdings_marked_value', 'marked_equity', 'marked_net_pnl',
    'realized_net_pnl', 'unrealized_net_pnl', 'total_paid_fees'];
  function decimal(value, nullable = true) {
    if (value === null && nullable) return;
    if (typeof value !== 'string' || value.length > 100 || !/^-?\d+(\.\d+)?$/.test(value))
      throw new Error('금액·가격·수량은 정확한 십진 문자열이어야 합니다.');
  }
  function date(value) {
    return typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      && Number.isFinite(Date.parse(value));
  }
  function parse(text) {
    if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('최대 2MB 보고서만 열 수 있습니다.');
    let r;
    try { r = JSON.parse(text); } catch { throw new Error('올바른 JSON 파일이 아닙니다.'); }
    if (!r || r.execution !== 'BOUNDED_PUBLIC_PAPER' || r.simulated !== true || r.actual_returns !== false)
      throw new Error('PAPER 상태보고 CLI에서 생성한 모의매매 보고서가 필요합니다.');
    if (!['PAPER','SAFE_PAUSED','EMERGENCY_STOP'].includes(r.mode)) throw new Error('알 수 없는 PAPER 모드입니다.');
    if (!r.price || typeof r.price !== 'object') throw new Error('시세 상태 정보가 없습니다.');
    amounts.forEach(k => decimal(r[k]));
    decimal(r.price.value);
    for (const [field, count] of [['fills','fill_count'],['trades','closed_trade_count']]) {
      if (!Array.isArray(r[field]) || r[field].length > 5000 || r[count] !== r[field].length)
        throw new Error('거래 목록과 건수가 일치하지 않거나 5,000건 한도를 넘었습니다.');
      for (const row of r[field]) {
        if (!row || typeof row !== 'object') throw new Error('거래 행이 올바르지 않습니다.');
        for (const key of (field === 'fills' ? ['qty','price','fee'] : ['qty','entry','exit','fee','net_pnl']))
          decimal(row[key], false);
        if (field === 'fills' && !['BUY','SELL'].includes(row.side)) throw new Error('알 수 없는 체결 방향입니다.');
      }
    }
    if (![true,false,null].includes(r.pnl_reconciles)) throw new Error('손익 대사 상태가 없습니다.');
    return r;
  }
  function money(value) {
    if (value === null || value === undefined) return '데이터 없음';
    decimal(value, false);
    const [whole, fraction] = value.split('.');
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? '.' + fraction : '');
  }
  function time(value) {
    if (!date(value)) return '시각 기록 없음';
    return new Intl.DateTimeFormat('ko-KR', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',
      day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value)) + ' KST';
  }
  function freshness(r, now = Date.now()) {
    if (!date(r.price.trade_time) || !date(r.price.received_at)) return '시각 정보 부족';
    const ages = [r.price.trade_time,r.price.received_at].map(t => (now-Date.parse(t))/1000);
    if (ages.some(a => a < 0)) return '미래 시각 · 시계 확인';
    return ages.every(a => a <= 60) ? '파일 시각 기준 60초 이내' : '오래된 시세 · 실시간 아님';
  }
  function provenance(r) {
    const labels = {MOCK:'MOCK · 검증용 가상자료', PUBLIC_LIVE:'공개시세 기록 · 파일 표기 기준',
      LEGACY_UNVERIFIED:'출처 미확인 · 이전 형식', NO_OBSERVATION:'시세 수신 기록 없음'};
    return labels[r.market_data_provenance] || '출처 미확인';
  }
  const api = {MAX_BYTES, parse, money, time, freshness, provenance};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PaperReport = api;
})(globalThis);
