// 기업지원사업 — 프론트엔드 (빌드 없는 바닐라 JS PWA)
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const store = {
  get(k, d = null) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 무시 */ } },
};
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let deviceId = store.get('deviceId');
if (!deviceId) { deviceId = crypto.randomUUID(); store.set('deviceId', deviceId); }

let CONFIG;
let lastResult = store.get('lastResult');
const utm = new URLSearchParams(location.search).get('utm_source') || document.referrer.split('/')[2] || 'direct';

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || (data.errors || []).join('\n') || '오류가 발생했습니다.'), { data });
  return data;
}

// ── 라우팅 ────────────────────────────────────────────
const VIEWS = ['home', 'diagnosis', 'result', 'apply', 'done', 'alerts', 'programs'];
function route() {
  let v = location.hash.slice(1) || 'home';
  if (!VIEWS.includes(v)) v = 'home';
  if (v === 'result' && !lastResult) v = 'diagnosis';
  VIEWS.forEach((x) => { $(`#view-${x}`).hidden = x !== v; });
  $$('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === v));
  if (v === 'result') renderResult();
  if (v === 'apply') prepareApply();
  if (v === 'programs') loadPrograms();
  if (v === 'alerts') refreshAlertState();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// ── 공고 렌더 ─────────────────────────────────────────
function programItem(p) {
  const dday = p.apply_end ? Math.ceil((new Date(p.apply_end) - new Date()) / 86400000) : null;
  const badge = dday == null ? '<span class="badge">상시</span>' : `<span class="badge ${dday <= 7 ? 'hot' : ''}">D-${Math.max(dday, 0)}</span>`;
  return `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">
    <div class="row-between">${badge}<small>${esc(p.agency)}</small></div>
    <b>${esc(p.title)}</b><small class="muted">${esc(p.apply_period || '')}</small></a></li>`;
}
async function loadPrograms() {
  const sel = $('#programRegion');
  const list = await api(`/api/programs?categories=금융${sel.value ? `&regions=${encodeURIComponent(sel.value)}` : ''}`);
  $('#allPrograms').innerHTML = list.map(programItem).join('') || '<li class="empty">진행 중인 공고가 없습니다.</li>';
}

// ── 진단 위저드 ───────────────────────────────────────
let step = 0;
const steps = () => $$('#diagForm .step');
function showStep(n) {
  step = n;
  steps().forEach((s, i) => { s.hidden = i !== n; });
  $('#prevBtn').style.visibility = n === 0 ? 'hidden' : 'visible';
  $('#nextBtn').textContent = n === steps().length - 1 ? '결과 보기' : '다음';
  $('#progressBar').style.width = `${((n + 1) / steps().length) * 100}%`;
  $('#diagError').textContent = '';
}
$$('.seg').forEach((seg) => seg.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', seg).forEach((x) => x.classList.toggle('on', x === b));
  seg.dataset.value = b.value;
}));

function collectAnswers() {
  const f = $('#diagForm');
  const seg = (n) => $(`.seg[data-name="${n}"]`).dataset.value;
  const chk = (n) => f.elements[n].checked;
  return {
    bizType: seg('bizType'), industry: f.industry.value, region: f.region.value,
    years: Number(f.years.value), employees: Number(f.employees.value || 0), sales: f.sales.value,
    ceoAge: seg('ceoAge'), womenCeo: chk('womenCeo'), exporting: chk('exporting'), salesDrop: chk('salesDrop'), closedBefore: chk('closedBefore'),
    certs: $$('[data-multi="certs"] input:checked').map((i) => i.value),
    fundUse: seg('fundUse'), amount: Number(f.amount.value || 0), credit: seg('credit'),
    taxArrears: chk('taxArrears'), loanOverdue: chk('loanOverdue'), usingPolicyFund: chk('usingPolicyFund'),
  };
}
const REQUIRED = [['bizType', 'industry', 'region'], [], ['ceoAge'], ['fundUse', 'credit']];
const LABEL = { bizType: '사업자 유형', industry: '업종', region: '지역', ceoAge: '대표자 연령', fundUse: '자금 용도', credit: '신용 상태' };

$('#prevBtn').addEventListener('click', () => showStep(Math.max(0, step - 1)));
$('#nextBtn').addEventListener('click', async () => {
  const a = collectAnswers();
  const miss = REQUIRED[step].filter((k) => !a[k]);
  if (miss.length) { $('#diagError').textContent = `${miss.map((k) => LABEL[k]).join(', ')}을(를) 선택해 주세요.`; return; }
  if (step < steps().length - 1) return showStep(step + 1);
  $('#nextBtn').disabled = true;
  try {
    lastResult = { ...(await api('/api/diagnosis', { method: 'POST', body: { deviceId, answers: a } })), answers: a };
    store.set('lastResult', lastResult);
    location.hash = 'result';
  } catch (e) { $('#diagError').textContent = e.message; } finally { $('#nextBtn').disabled = false; }
});

// ── 결과 ──────────────────────────────────────────────
function renderResult() {
  const r = lastResult;
  $('#resultTitle').textContent = r.funds.length
    ? `신청 검토 가능한 정책자금 ${r.funds.length}개를 찾았어요`
    : '현재 조건으로는 바로 맞는 자금이 적어요';
  $('#resultFlags').innerHTML = (r.smallBiz ? '<span class="badge ok">소상공인 해당</span> ' : '<span class="badge">중소기업</span> ')
    + r.flags.map((f) => `<p class="warn">⚠️ ${esc(f.msg)}</p>`).join('');
  $('#resultFunds').innerHTML = r.funds.map((f, i) => `
    <article class="card fund ${i < 3 ? 'top' : ''}">
      <div class="row-between"><span class="badge">${esc(f.type)}</span><span class="score">적합도 ${f.score}</span></div>
      <h3>${esc(f.name)}</h3>
      <small class="muted">${esc(f.agency)} · ${esc(f.limit)}</small>
      <p>${esc(f.desc)}</p>
      <div class="reasons">${f.reasons.map((x) => `<span>✔ ${esc(x)}</span>`).join('')}</div>
      <div class="row-between">
        <a href="${esc(f.url)}" target="_blank" rel="noopener" class="link">기관 바로가기 ↗</a>
        <a href="#apply" class="link strong" data-fund="${esc(f.code)}">이 자금 상담받기 →</a>
      </div>
    </article>`).join('') || '<div class="card"><p>체납·연체 해소나 재도전 자금 등 대안이 있을 수 있습니다. 전문가 상담을 권해드립니다.</p></div>';
  $('#resultPrograms').innerHTML = (r.programs || []).map(programItem).join('') || '<li class="empty">현재 지역 공고가 없습니다. 알림을 켜두시면 새 공고를 알려드려요.</li>';
  $$('[data-fund]').forEach((a) => a.addEventListener('click', () => store.set('preFund', a.dataset.fund)));
}

// ── 상담 신청 ─────────────────────────────────────────
function prepareApply() {
  const f = $('#applyForm');
  const funds = lastResult?.funds || [];
  $('#fundPick').hidden = !funds.length;
  const pre = store.get('preFund');
  $('#desiredFunds').innerHTML = funds.slice(0, 6).map((x) =>
    `<label><input type="checkbox" value="${esc(x.name)}" ${x.code === pre ? 'checked' : ''}> ${esc(x.name)}</label>`).join('');
  if (lastResult?.answers) {
    if (!f.region.value) f.region.value = lastResult.answers.region;
    if (!f.desiredAmount.value && lastResult.answers.amount) f.desiredAmount.value = lastResult.answers.amount;
  }
}
$('#agreeAll').addEventListener('change', (e) => $$('.agree').forEach((c) => { c.checked = e.target.checked; }));
$$('.agree').forEach((c) => c.addEventListener('change', () => { $('#agreeAll').checked = $$('.agree').every((x) => x.checked); }));
$$('[data-toggle]').forEach((b) => b.addEventListener('click', () => { const d = $(`#${b.dataset.toggle}`); d.hidden = !d.hidden; }));
$('#phone').addEventListener('input', (e) => {
  const d = e.target.value.replace(/\D/g, '').slice(0, 11);
  e.target.value = d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
});

$('#applyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = {
    deviceId, diagnosisId: lastResult?.id ?? null, source: utm, website: f.website.value,
    name: f.name.value, phone: f.phone.value, email: f.email.value, companyName: f.companyName.value,
    bizNo: f.bizNo.value, region: f.region.value, desiredAmount: f.desiredAmount.value, contactTime: f.contactTime.value, message: f.message.value,
    helpTypes: $$('#helpTypes input:checked').map((i) => i.value),
    desiredFunds: $$('#desiredFunds input:checked').map((i) => i.value),
    consents: { privacy_required: f.privacy_required.checked, third_party: f.third_party.checked, marketing: f.marketing.checked },
  };
  $('#applyError').textContent = '';
  $('#applyBtn').disabled = true;
  try {
    await api('/api/leads', { method: 'POST', body });
    f.reset();
    store.set('preFund', null);
    location.hash = 'done';
  } catch (err) {
    $('#applyError').textContent = err.message;
  } finally { $('#applyBtn').disabled = false; }
});

// ── 주간 알림 (웹푸시) ─────────────────────────────────
const urlB64 = (s) => Uint8Array.from(atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

async function currentSub() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}
async function refreshAlertState() {
  const sub = await currentSub().catch(() => null);
  $('#subBtn').textContent = sub ? '관심사 저장' : '알림 받기';
  $('#unsubBtn').hidden = !sub;
  $('#iosHint').hidden = !(isIOS && !standalone);
  const pref = store.get('alertPref', { regions: lastResult?.answers ? [lastResult.answers.region] : [], categories: ['금융'] });
  $$('#alertRegions button').forEach((b) => b.classList.toggle('on', pref.regions.includes(b.value)));
  $$('#alertCats button').forEach((b) => b.classList.toggle('on', pref.categories.includes(b.value)));
  $('#alertStatus').textContent = sub ? '✅ 알림이 켜져 있습니다.' : '';
}
$('#subBtn').addEventListener('click', async () => {
  const status = $('#alertStatus');
  const regions = $$('#alertRegions button.on').map((b) => b.value);
  const categories = $$('#alertCats button.on').map((b) => b.value);
  store.set('alertPref', { regions, categories });
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error(isIOS ? '홈 화면에 추가한 앱에서 알림을 켤 수 있어요.' : '이 브라우저는 푸시 알림을 지원하지 않습니다.');
    if (!CONFIG.vapidPublicKey) throw new Error('알림 서버가 아직 설정되지 않았습니다. (관리자: VAPID 키 설정 필요)');
    if ((await Notification.requestPermission()) !== 'granted') throw new Error('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.');
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(CONFIG.vapidPublicKey) }));
    await api('/api/push/subscribe', { method: 'POST', body: { deviceId, subscription: sub.toJSON(), regions, categories } });
    await api('/api/push/test', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
    await refreshAlertState();
  } catch (e) { status.textContent = e.message; }
});
$('#unsubBtn').addEventListener('click', async () => {
  const sub = await currentSub();
  if (sub) { await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }); await sub.unsubscribe(); }
  refreshAlertState();
});

// ── 앱 설치 (PWA) ─────────────────────────────────────
let deferredInstall;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('#installBtn').hidden = false; });
$('#installBtn').addEventListener('click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); deferredInstall = null; $('#installBtn').hidden = true; });

// ── 초기화 ────────────────────────────────────────────
async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  CONFIG = await api('/api/config');
  const opts = (arr, ph) => `<option value="">${ph}</option>` + arr.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
  $('#industry').innerHTML = opts(Object.entries(CONFIG.industries), '업종 선택');
  $('#region').innerHTML = opts(CONFIG.regions.map((r) => [r, r]), '시·도 선택');
  $('#applyRegion').innerHTML = opts(CONFIG.regions.map((r) => [r, r]), '선택');
  $('#programRegion').innerHTML = opts(CONFIG.regions.map((r) => [r, r]), '전체 지역');
  $('#programRegion').addEventListener('change', loadPrograms);
  $('#helpTypes').innerHTML = Object.entries(CONFIG.helpTypes).map(([v, t]) => `<label><input type="checkbox" value="${v}"> ${esc(t)}</label>`).join('');
  const chip = (v) => `<button type="button" value="${esc(v)}">${esc(v)}</button>`;
  $('#alertRegions').innerHTML = CONFIG.regions.map(chip).join('');
  $('#alertCats').innerHTML = CONFIG.categories.map(chip).join('');
  $$('.chips').forEach((c) => c.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) b.classList.toggle('on'); }));
  if (CONFIG.operator.phone) $('#doneMsg').textContent += ` 급하신 경우 ${CONFIG.operator.phone} 로 연락 주세요.`;
  showStep(0);
  route();
  api('/api/programs?categories=금융').then((l) => { $('#homePrograms').innerHTML = l.slice(0, 4).map(programItem).join('') || '<li class="empty">공고를 불러오는 중입니다.</li>'; });
}
init();
