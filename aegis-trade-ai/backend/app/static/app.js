'use strict';
const $ = (id) => document.getElementById(id);
let state = null;
let pending = false;
const money = (value) => Number.isFinite(Number(value)) && value !== null && value !== undefined ? new Intl.NumberFormat('ko-KR', {maximumFractionDigits: 2}).format(Number(value)) : '—';
const time = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('ko-KR', {timeZone:'Asia/Seoul', month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date) + ' KST';
};
function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
  $('message').hidden = !text;
}
function setPending(value) {
  pending = value;
  document.querySelectorAll('button').forEach((button) => {button.disabled = value || !state;});
  if (!value && state) {
    $('buy').disabled = state.mode !== 'PAPER' || !!state.position || !!state.pending;
    $('sell').disabled = !state.position || state.mode === 'EMERGENCY_STOP';
    $('pause').disabled = state.mode !== 'PAPER';
    $('resume').disabled = state.mode === 'PAPER';
    $('emergency').disabled = state.mode === 'EMERGENCY_STOP';
  }
}
async function request(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, {method:body === undefined ? 'GET':'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:body === undefined ? {}:{'Content-Type':'application/json','X-CSRF-Token':state?.csrf_token || ''},body:body === undefined ? undefined:JSON.stringify(body)});
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail || data));
    return data;
  } finally {clearTimeout(timer);}
}
async function refresh() {
  state = await request('/api/state');
  render();
  $('connection').textContent = '로컬 서버 연결됨';
}
async function act(path, body, success) {
  if (pending) return;
  setPending(true);
  message('');
  try {
    await request(path, body);
    await refresh();
    message(success);
  } catch (error) {
    message(error.name === 'AbortError' ? '응답 대기 시간이 지났습니다. 작업이 처리되었을 수 있으니 상태를 확인한 뒤 다시 시도하세요.' : '요청을 완료하지 못했습니다: ' + error.message, true);
    try {await refresh();} catch (_) {$('connection').textContent='서버 연결 끊김';}
  } finally {setPending(false);}
}
function render() {
  $('equity').textContent = money(state.equity);
  $('cash').textContent = money(state.cash);
  $('daily-pnl').textContent = money(state.daily_pnl);
  $('daily-pnl').className = Number(state.daily_pnl) < 0 ? 'negative' : Number(state.daily_pnl) > 0 ? 'positive' : '';
  $('drawdown').textContent = state.drawdown === undefined ? '—' : money(-Math.abs(Number(state.drawdown)) * 100) + '%';
  $('price').textContent = money(state.price);
  $('mode').textContent = state.mode || '알 수 없는 상태';
  $('mode').className = 'mode' + (state.mode === 'SAFE_PAUSED' ? ' paused' : state.mode === 'EMERGENCY_STOP' ? ' stopped' : '');
  $('timestamp').textContent = '재생 시각 · ' + time(state.timestamp);
  $('cursor').textContent = 'STEP ' + (state.cursor ?? '—');
  const position = state.position;
  $('position').querySelector('strong').textContent = position ? String(position.qty) + ' BTC · 손절 ' + money(position.stop) : state.pending ? '다음 봉 시가 체결 대기' : '포지션 없음';
  $('pending-order').hidden = !state.pending;
  $('pending-stop').textContent = state.pending ? money(state.pending.stop) : '—';
  $('cost-settings').textContent = '편도 수수료 ' + money(Number(state.fee_rate) * 100) + '% · 편도 슬리피지 ' + money(Number(state.slippage_rate) * 100) + '%';
  $('risk-status').textContent = '연속 손실 ' + (state.loss_streak ?? 0) + '회' + (state.cooldown ? ' · 재개 가능 ' + time(state.cooldown) : '') + (state.daily_blocked ? ' · 일일 손실 한도 도달' : '') + (state.manual_loss_lock ? ' · 수동 재개 필요' : '');
  if (!$('stop-price').value && Number(state.price) > 0) $('stop-price').value = String(Math.floor(Number(state.price) * .9));
  $('decision').textContent = typeof state.last_decision === 'object' ? JSON.stringify(state.last_decision) : (state.last_decision || '아직 주문 없음');
  drawChart(state.candles || []);
  renderTrades(state.trades || []);
  renderAudit(state.audit || []);
}
function svgElement(name, attributes) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key,value]) => el.setAttribute(key, value));
  return el;
}
function drawChart(candles) {
  const container = $('chart');
  container.replaceChildren();
  const data = candles.slice(-36).filter(c => ['open','high','low','close'].every(k => Number.isFinite(Number(c[k]))));
  if (!data.length) {container.textContent='표시할 확정 봉이 없습니다.';return;}
  const width=680,height=230,left=5,right=85,top=12,bottom=20;
  const prices=data.flatMap(c=>[Number(c.low),Number(c.high)]);
  const min=Math.min(...prices),max=Math.max(...prices),pad=(max-min || max*.01 || 1)*.15;
  const low=min-pad,high=max+pad;
  const y = value => top+(high-Number(value))/(high-low)*(height-top-bottom);
  const svg=svgElement('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'결정론적 예시 BTC 캔들. 실시간 시장 데이터가 아닙니다.'});
  for(let i=0;i<4;i++) {
    const v=low+(high-low)*i/3,py=y(v);
    svg.append(svgElement('line',{x1:left,x2:width-right,y1:py,y2:py,stroke:'#263243','stroke-dasharray':'3 5'}));
    const label=svgElement('text',{x:width-right+12,y:py+3,fill:'#8192a8','font-size':'10','font-family':'sans-serif'});label.textContent=money(v);svg.append(label);
  }
  const slot=(width-left-right)/Math.max(data.length,10),bar=Math.min(slot*.55,15);
  data.forEach((c,i)=>{
    const x=left+slot*(i+.5),color=Number(c.close)>=Number(c.open)?'#80dec2':'#ed8a96';
    svg.append(svgElement('line',{x1:x,x2:x,y1:y(c.high),y2:y(c.low),stroke:color,'stroke-width':1.3}));
    svg.append(svgElement('rect',{x:x-bar/2,y:Math.min(y(c.open),y(c.close)),width:bar,height:Math.max(2,Math.abs(y(c.open)-y(c.close))),fill:color,rx:1}));
  });
  container.append(svg);
}
function empty(container,title,description) {
  const div=document.createElement('div');div.className='empty';const strong=document.createElement('strong');strong.textContent=title;div.append(strong,document.createTextNode(description));container.replaceChildren(div);
}
function renderTrades(trades) {
  const container=$('trades-content');
  if(!trades.length){empty(container,'아직 체결된 모의 거래가 없습니다','손절 기준을 입력하고 위험 검사를 통과하면 첫 기록이 남습니다.');return;}
  const wrapper=document.createElement('div');wrapper.className='table-wrap';
  const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
  ['시각','구분 / 사유','수량 (BTC)','체결가 (KRW)','수수료 (KRW)','순손익 (KRW)'].forEach(t=>{const th=document.createElement('th');th.textContent=t;tr.append(th);});head.append(tr);table.append(head);
  const tbody=document.createElement('tbody');
  trades.slice().reverse().slice(0,100).forEach(t=>{
    const row=document.createElement('tr');
    [time(t.timestamp || t.time || t.closed_at),t.side || t.reason || t.exit_reason || '청산',t.qty ?? '—',money(t.price ?? t.exit_price ?? t.exit),money(t.fee ?? t.fees),money(t.net_pnl ?? t.pnl)].forEach(value=>{const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);});tbody.append(row);
  });table.append(tbody);wrapper.append(table);container.replaceChildren(wrapper);
}
function renderAudit(events) {
  const container=$('audit-content');
  if(!events.length){empty(container,'기록된 이벤트가 없습니다','모드 변경과 위험 검사 결과가 이곳에 표시됩니다.');return;}
  container.replaceChildren();
  events.slice(0,100).forEach(e=>{
    const row=document.createElement('div');row.className='audit-row';const timestamp=document.createElement('time');timestamp.textContent=time(e.timestamp || e.time || e.ts);const text=document.createElement('code');text.textContent=[e.event || e.action || 'EVENT',typeof e.detail==='object'?JSON.stringify(e.detail):e.detail || e.reason || [e.decision,e.mode].filter(Boolean).join(' / ')].filter(Boolean).join(' · ');row.append(timestamp,text);container.append(row);
  });
}
function confirmAction(title,description,word,callback) {
  if(pending)return;
  const dialog=$('confirm-dialog');$('confirm-title').textContent=title;$('confirm-description').textContent=description;$('confirmation-word').textContent=word;$('confirmation-input').value='';$('confirm-submit').disabled=true;
  $('confirmation-input').oninput=()=>{$('confirm-submit').disabled=$('confirmation-input').value===word?false:true;};
  dialog.onclose=()=>{if(dialog.returnValue==='confirm'&&$('confirmation-input').value===word)callback();};dialog.showModal();$('confirmation-input').focus();
}
$('step').addEventListener('click',()=>act('/api/step',{},'다음 확정 봉을 반영했습니다.'));
$('buy-form').addEventListener('submit',event=>{event.preventDefault();const stop=$('stop-price').value.replace(/,/g,'').trim();if(!/^\d+(\.\d+)?$/.test(stop)||Number(stop)<=0){message('손절 기준가격에 0보다 큰 숫자를 입력해 주세요.',true);return;}act('/api/buy',{stop},'모의 매수 제안을 접수했습니다. 다음 4시간봉 시가에서 위험 검사를 다시 통과하면 체결됩니다.');});
$('sell').addEventListener('click',()=>confirmAction('모의 포지션 청산','보유 중인 모의 수량을 현재 재생 가격과 비용 모델로 청산합니다.','SELL',()=>act('/api/sell',{},'모의 청산을 처리했습니다.')));
$('pause').addEventListener('click',()=>act('/api/mode',{action:'pause',confirmation:''},'신규 매수를 일시중지했습니다.'));
$('emergency').addEventListener('click',()=>confirmAction('비상정지','신규 매수와 자동 청산을 모두 중지합니다. 기록과 데이터 재생은 유지됩니다.','STOP',()=>act('/api/mode',{action:'stop',confirmation:'STOP'},'비상정지를 적용했습니다.')));
$('resume').addEventListener('click',()=>confirmAction('운영 재개 확인','비상정지 상태에서는 먼저 일시중지 상태로 전환됩니다. 재개 후에도 서버의 위험 한도는 유지됩니다.','RESUME',()=>act('/api/mode',{action:'resume',confirmation:'RESUME'},'재개 요청을 처리했습니다. 현재 모드를 확인하세요.')));
$('reset').addEventListener('click',()=>confirmAction('데모 데이터 초기화','이 로컬 데모의 모의 잔고와 거래 상태를 초기 상태로 되돌립니다. 감사 기록은 보존됩니다. 실계정과는 관계없습니다.','RESET',()=>act('/api/reset',{confirmation:'RESET'},'데모를 초기화했습니다.')));
['trades','audit'].forEach(name=>$(name+'-tab').addEventListener('click',()=>{['trades','audit'].forEach(n=>{const active=n===name;$(n+'-tab').classList.toggle('active',active);$(n+'-tab').setAttribute('aria-selected',String(active));$(n+'-content').hidden=!active;});}));
setPending(true);
refresh().catch(error=>{message('서버 상태를 불러오지 못했습니다. 서버 실행을 확인하고 새로고침하세요. '+error.message,true);$('connection').textContent='서버 연결 실패';}).finally(()=>setPending(false));
