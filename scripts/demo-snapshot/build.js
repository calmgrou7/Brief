const fs = require('fs');
const { pages, chrome, css, urls, coKey, today } = JSON.parse(fs.readFileSync(__dirname + '/raw.json', 'utf8'));
const byUrl = new Map(urls);
const B = 'http://x';

function target(raw) {
  const href = raw.replace(/&amp;/g, '&');
  let u; try { u = new URL(B + decodeURI(href)); } catch { u = new URL(B + href); }
  const key = byUrl.get(href) ?? byUrl.get(u.pathname + u.search);
  if (key) return { key };
  const q = u.searchParams;
  const co = u.pathname.match(/^\/companies\/([^/]+)$/);
  if (co && coKey[co[1]]) return { key: coKey[co[1]], tab: q.get('tab'), open: q.get('log') ? 'log' : q.get('next') ? 'next' : null };
  if (u.pathname === '/companies') return { key: 'companies', status: q.get('status'), q: q.get('q') };
  if (u.pathname === '/schedule') { const m = q.get('m'); return { key: m && byUrl.get(`/schedule?m=${m}`) ? `sched-${m}` : 'schedule' }; }
  if (u.pathname === '/check') return { key: 'more', toast: '연결 점검은 배포된 앱에서 노션 연결 후 사용할 수 있습니다' };
  return { key: 'home' };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const rewrite = (html) => html
  .replace(/href="(\/[^"]*)"/g, (_, h) => {
    const t = target(h);
    let a = `href="#${t.key}"`;
    if (t.tab) a += ` data-tab="${esc(t.tab)}"`;
    if (t.open) a += ` data-open="${t.open}"`;
    if (t.status) a += ` data-status="${esc(t.status)}"`;
    if (t.toast) a += ` data-toast="${esc(t.toast)}"`;
    return a;
  })
  .replace(/<p class="notice demo">[\s\S]*?<\/p>/, `<p class="notice demo">둘러보기 전용 화면입니다 · 예시 데이터(${today} 기준) · 저장되지 않습니다. 실제 사용은 배포된 앱에서 노션과 연결해 주세요.</p>`)
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/ action="[^"]*"/g, '');

const PAGES = Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, rewrite(v)]));
const shell = rewrite(chrome);
const cleanCss = css.replace(/@font-face\s*\{[^}]*\}/g, '').replace(/\/\*# sourceMappingURL=[^*]*\*\//g, '');

const runtime = `
(() => {
  const PAGES = ${JSON.stringify(PAGES).replace(/<\//g, '<\\/')};
  const main = document.getElementById('main');
  const GROUP = (k) => k === 'home' ? '/' : k.startsWith('tasks') ? '/tasks' : (k.startsWith('co-') || k === 'companies') ? '/companies'
    : (k.startsWith('sched') || k.startsWith('day-') || k === 'schedule') ? '/schedule' : '/more';
  const NAV_KEY = { '#home': '/', '#tasks': '/tasks', '#companies': '/companies', '#schedule': '/schedule', '#more': '/more' };
  let pending = null;
  const state = { q: '', status: '', stale: false };

  function toast(msg) {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('p');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  const READONLY = '둘러보기 전용 링크라 저장되지 않습니다. 배포된 앱에서는 노션에 바로 저장됩니다';

  function closeDialogs() { document.querySelectorAll('dialog[open]').forEach((d) => d.close()); }

  function render() {
    const key = location.hash.slice(1) || 'home';
    const k = PAGES[key] ? key : 'home';
    closeDialogs();
    main.innerHTML = PAGES[k];
    const g = GROUP(k);
    document.querySelectorAll('.side .nav-link, .bottomnav .tab').forEach((a) => {
      const href = a.getAttribute('href');
      const on = href && (NAV_KEY[href] === g || (href === '#home' && g === '/tasks' && a.classList.contains('tab')));
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (k === 'companies') { state.q = ''; state.stale = false; state.status = pending?.status || ''; applyCompanyFilter(); }
    if (pending?.tab) main.querySelector('#tab-' + pending.tab)?.click();
    if (pending?.open === 'log') main.querySelector('dialog[aria-labelledby="qc-title"]')?.showModal();
    if (pending?.open === 'next') toast('다음 액션 변경은 배포된 앱에서 저장됩니다');
    if (pending?.toast) toast(pending.toast);
    pending = null;
    window.scrollTo(0, 0);
  }

  function applyCompanyFilter() {
    const rows = [...main.querySelectorAll('.co-row')];
    if (!rows.length) return;
    let n = 0;
    for (const r of rows) {
      const text = r.textContent.toLowerCase();
      const st = r.querySelector('.badge')?.textContent || '';
      const show = (!state.q || text.includes(state.q.toLowerCase())) && (!state.status || st === state.status) && (!state.stale || r.querySelector('.co-touch.stale'));
      r.hidden = !show; if (show) n++;
    }
    main.querySelectorAll('[aria-label="진행 단계"] .chip').forEach((c) => c.setAttribute('aria-pressed', String((c.firstChild.textContent.trim() === '전체' && !state.status) || c.firstChild.textContent.trim() === state.status)));
    main.querySelectorAll('.filters .chip').forEach((c) => c.setAttribute('aria-pressed', String(state.stale)));
    const count = [...main.querySelectorAll('p.small.muted')].find((p) => /곳$/.test(p.textContent));
    if (count) count.textContent = n + '곳';
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      pending = { tab: a.dataset.tab, open: a.dataset.open, status: a.dataset.status, toast: a.dataset.toast };
      if (a.getAttribute('href') === location.hash || (a.getAttribute('href') === '#home' && !location.hash)) { e.preventDefault(); render(); }
      return;
    }
    const b = e.target.closest('button');
    if (!b) { const d = e.target.closest('dialog'); if (d && e.target === d) d.close(); return; }
    const label = b.getAttribute('aria-label') || '';
    const text = b.textContent.trim();
    if (b.closest('form') && (b.type === 'submit' || !b.getAttribute('type'))) return; // submit 처리로
    if (b.classList.contains('side-search') || label === '업체 검색') { e.preventDefault(); const d = document.querySelector('dialog[aria-labelledby="search-title"]'); d.showModal(); d.querySelector('input').focus(); return; }
    if (b.classList.contains('side-register') || b.classList.contains('tab-plus')) { document.querySelector('dialog[aria-labelledby="reg-title"]').showModal(); return; }
    if (label === '닫기') { b.closest('dialog')?.close(); return; }
    if (b.classList.contains('dtab')) {
      const key = b.id.replace('tab-', '');
      main.querySelectorAll('.dtab').forEach((t) => t.setAttribute('aria-selected', String(t === b)));
      main.querySelectorAll('[role=tabpanel]').forEach((p) => { p.hidden = p.id !== 'panel-' + key; });
      return;
    }
    if (b.closest('.hero-actions') && b.classList.contains('primary')) { main.querySelector('dialog[aria-labelledby="qc-title"]')?.showModal(); return; }
    if (b.closest('[aria-label="진행 단계"]')) { const s = b.firstChild.textContent.trim(); state.status = s === '전체' || s === state.status ? '' : s; applyCompanyFilter(); return; }
    if (b.closest('.filters') && b.classList.contains('chip')) { state.stale = !state.stale; applyCompanyFilter(); return; }
    if (b.classList.contains('pick')) { closeDialogs(); toast('업체를 고르면 그 업체의 입력 창이 열립니다 · ' + READONLY); return; }
    if (text.includes('노션 새로고침')) { toast('배포된 앱에서는 노션 최신 내용을 다시 불러옵니다'); return; }
    if (b.closest('.view-toggle') || b.closest('.date-quick') || text.includes('변경') || text.includes('정하기')) { toast(READONLY); return; }
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.closest('dialog[aria-labelledby="search-title"]')) {
      const first = [...e.target.querySelectorAll('.pick')].find((x) => !x.hidden);
      if (first) location.hash = first.getAttribute('href');
      return;
    }
    e.target.closest('dialog')?.close();
    toast(READONLY);
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.closest('dialog[aria-labelledby="search-title"]')) {
      const q = t.value.trim().toLowerCase();
      t.closest('dialog').querySelectorAll('.pick').forEach((p) => { p.hidden = q && !p.textContent.toLowerCase().includes(q); });
    }
    if (t.matches('#main input[type=search]')) { state.q = t.value.trim(); applyCompanyFilter(); }
  });
  document.addEventListener('change', (e) => { if (e.target.matches('#main .filters select')) toast('정렬·업무·우선순위 거르기는 배포된 앱에서 동작합니다'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) { e.preventDefault(); const d = document.querySelector('dialog[aria-labelledby="search-title"]'); d.showModal(); d.querySelector('input').focus(); }
  });
  window.addEventListener('hashchange', render);
  render();
})();
`;

const out = `<title>채움 컨설팅 대시보드 시안</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap">
<style>
${cleanCss}
/* 둘러보기 전용: 글꼴은 Noto Sans KR로 대체 */
:root { --font: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif; }
body { background: var(--bg); }
[hidden] { display: none !important; }
</style>
${shell}
<script>${runtime}</script>
`;
const dest = process.argv[2];
fs.writeFileSync(dest, out);
console.log('wrote', dest, (out.length / 1024).toFixed(0) + 'KB');
