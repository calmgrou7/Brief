// 실제 앱(데모 모드)을 돌며 화면 HTML을 모아 둘러보기 전용 단일 페이지로 만든다
const { chromium } = require('playwright');
const fs = require('fs');
const B = 'http://localhost:3100';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const p = await ctx.newPage();
  await p.goto(B + '/login');
  await p.fill('input[name=password]', 'test1234');
  await p.click('button:has-text("로그인")');
  await p.waitForURL(B + '/');

  // 업체 id → 짧은 키
  await p.goto(B + '/companies'); await p.locator('.co-link').first().waitFor();
  const ids = await p.$$eval('.co-link', (as) => as.map((a) => a.getAttribute('href').split('/').pop()));
  const coKey = Object.fromEntries(ids.map((id, i) => [id, `co-${i + 1}`]));

  const urls = new Map(); // url -> key
  const add = (u, k) => { if (!urls.has(u)) urls.set(u, k); };
  add('/', 'home'); add('/tasks', 'tasks');
  for (const f of ['now', 'stale', 'ins', 'soon']) add(`/tasks?f=${f}`, `tasks-${f}`);
  add('/companies', 'companies'); add('/more', 'more'); add('/admin', 'admin'); add('/admin/new', 'admin-new'); add('/links', 'links');
  for (const id of ids) { add(`/companies/${id}`, coKey[id]); add(`/admin/${id}`, `edit-${coKey[id].slice(3)}`); }

  // 일정: 이번 달·다음 달·지난달 기본 화면 + 이번 달·다음 달의 모든 날짜
  await p.goto(B + '/schedule'); await p.locator('.cal-day').first().waitFor();
  const month = await p.$$eval('a[aria-label="다음 달"]', (a) => a[0].getAttribute('href'));
  const cur = new URL(B + (await p.$$eval('a[aria-label="이전 달"]', (a) => a[0].getAttribute('href')))).searchParams.get('m');
  add('/schedule', 'schedule');
  const nextM = new URL(B + month).searchParams.get('m');
  add(`/schedule?m=${cur}`, `sched-${cur}`);
  add(`/schedule?m=${nextM}`, `sched-${nextM}`);
  for (const m of [null, nextM]) {
    await p.goto(B + (m ? `/schedule?m=${m}` : '/schedule')); await p.locator('.cal-day').first().waitFor();
    const days = await p.$$eval('.cal-day', (as) => as.map((a) => a.getAttribute('href')));
    for (const h of days) { const q = new URL(B + h).searchParams; add(h, `day-${q.get('d')}`); }
  }

  // 페이지별 본문
  const pages = {};
  for (const [u, k] of urls) {
    await p.goto(B + u);
    await p.locator('#main > *').first().waitFor();
    pages[k] = await p.$eval('#main', (m) => m.innerHTML);
  }
  // 틀(사이드바·상단바·하단 탭·등록/검색 창)
  await p.goto(B + '/'); await p.locator('#main > *').first().waitFor();
  const chrome = await p.$eval('.shell', (s) => { const c = s.cloneNode(true); c.querySelector('#main').innerHTML = ''; return c.outerHTML; });
  const css = await p.evaluate(async () => {
    const out = [];
    for (const l of document.querySelectorAll('link[rel=stylesheet]')) out.push(await (await fetch(l.href)).text());
    return out.join('\n');
  });
  const today = await p.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()));
  fs.writeFileSync(__dirname + '/raw.json', JSON.stringify({ pages, chrome, css, urls: [...urls], coKey, today }));
  console.log('captured', Object.keys(pages).length, 'pages, css', css.length, 'bytes');
  await browser.close();
})();
