'use strict';
const core = globalThis.PaperReport;
const $ = id => document.getElementById(id);
let loaded = null;
let requestVersion = 0;
function set(id, value) { $(id).textContent = value; }
function detail(id, entries) {
  $(id).replaceChildren(...entries.map(([label,value]) => {
    const group = document.createElement('div'), term = document.createElement('dt'), desc = document.createElement('dd');
    term.textContent = label; desc.textContent = value ?? '기록 없음'; group.append(term, desc); return group;
  }));
}
function paint(r, name) {
  loaded = r;
  $('error').hidden = true;
  set('source',core.provenance(r)); set('filename',name + ' · 가져온 파일의 기록이며 실시간 운영 상태가 아닙니다.');
  set('equity',core.money(r.marked_equity)); set('pnl',core.money(r.marked_net_pnl));
  set('fees',core.money(r.total_paid_fees)); set('fills-count',String(r.fill_count)+'건');
  set('closed-count','종료 거래 '+r.closed_trade_count+'건');
  detail('state-list', [['저장된 모드',r.mode],['최근 중단 사유',r.stop_reason],['피드 상태',r.feed_status],
    ['최근 오류',r.last_feed_error],['저장 시각',core.time(r.last_saved_at)],
    ['미청산 보유',r.open_position_not_liquidated === true ? '있음 · 종료 후 감시 중단' : '없음'],
    ['손익 대사',r.pnl_reconciles === true ? '일치 (파일 기록)' : r.pnl_reconciles === false ? '불일치 · 원본 확인 필요' : '확인 불가']]);
  price(r);
  const rows = r.fills.slice(-100).reverse().map(f => {
    const row = document.createElement('tr');
    for (const value of [core.time(f.time), f.side === 'BUY' ? '모의 매수' : '모의 매도',
      core.money(f.qty),core.money(f.price),core.money(f.fee)]) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    return row;
  });
  $('rows').replaceChildren(...rows); $('table-empty').hidden = rows.length > 0;
  if (!rows.length) set('table-empty','이 보고서에는 체결 내역이 없습니다.');
  $('state-empty').hidden = true; $('price-empty').hidden = true; $('clear').disabled = false;
}
function price(r) {
  detail('price-list', [['마지막 가격 (KRW)',core.money(r.price.value)],['시세 신선도',core.freshness(r)],
    ['거래 시각',core.time(r.price.trade_time)],['수신 시각',core.time(r.price.received_at)],
    ['실현 순손익 (KRW)',core.money(r.realized_net_pnl)],['미실현 순손익 (KRW)',core.money(r.unrealized_net_pnl)],
    ['현금 (KRW)',core.money(r.cash)]]);
}
function error(message) { set('error',message+' 기존 보고서가 있다면 그대로 유지됩니다.'); $('error').hidden = false; }
async function openFile(file) {
  const version = ++requestVersion;
  if (!file) return;
  if (file.size > core.MAX_BYTES) { error('최대 2MB 파일만 열 수 있습니다.'); return; }
  try { const r = core.parse(await file.text()); if (version === requestVersion) paint(r,file.name); }
  catch(e) { if (version === requestVersion) error(e.message || '파일을 읽을 수 없습니다.'); }
}
$('file').addEventListener('change', e => { openFile(e.target.files[0]); e.target.value = ''; });
$('sample').addEventListener('click', () => { ++requestVersion; paint(core.parse(JSON.stringify(globalThis.PAPER_SAMPLE)), 'MOCK 예시 · 결정론적 테스트 자료'); });
$('clear').addEventListener('click', () => {
  ++requestVersion; loaded = null;
  set('source','보고서를 기다리고 있습니다'); set('filename','불러온 기록을 비웠습니다. 파일은 저장되지 않습니다.');
  ['equity','pnl','fees','fills-count'].forEach(id => set(id,'—')); set('closed-count','종료 거래 기록 없음');
  ['rows','state-list','price-list'].forEach(id => $(id).replaceChildren());
  ['state-empty','price-empty','table-empty'].forEach(id => $(id).hidden = false);
  set('table-empty','불러온 거래 내역이 없습니다.'); $('error').hidden = true; $('clear').disabled = true;
});
for (const type of ['dragover','drop']) $('dropzone').addEventListener(type, event => event.preventDefault());
$('dropzone').addEventListener('dragover', () => $('dropzone').classList.add('drag'));
$('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('drag'));
$('dropzone').addEventListener('drop', event => { $('dropzone').classList.remove('drag'); openFile(event.dataTransfer.files[0]); });
setInterval(() => { if (loaded) price(loaded); }, 15000); // Local age display only; no requests.
