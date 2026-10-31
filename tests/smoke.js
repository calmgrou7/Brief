// 스모크 테스트: node tests/smoke.js  (playwright 필요)
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '../dashboard/index.html');
const results = [];
const check = (name, ok) => { results.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);

  check('개요 렌더링', await page.isVisible('#tab-overview .ring'));
  check('트랙 카드 3개', (await page.locator('#tab-overview .g3 .card').count()) === 3);

  // 단계 토글 → 진행률 변화
  await page.click('[data-tab=projects]');
  await page.click('.stage:not(.on) >> nth=0');
  check('단계 토글 저장', await page.evaluate(() => JSON.parse(localStorage.getItem('bridgenode-dashboard-v1')).projects.length > 0));

  // 릴리스 상태 변경
  await page.click('[data-tab=releases]');
  await page.selectOption('.rel-status >> nth=0', 'released');
  check('릴리스 상태 변경', await page.evaluate(() => state.releases.some(r => r.status === 'released')));

  // 이력 병합 import
  const n0 = await page.evaluate(() => state.releases.length);
  await page.evaluate(() => importData(JSON.stringify({ releases: [{ projectName: '동네가게 예약', version: '9.9.9', status: 'requested' }] })));
  check('출시 이력 병합', (await page.evaluate(() => state.releases.length)) === n0 + 1);

  // 보관함: 생성 → 추가 → 평문 미노출 → 잠금 → 오답 거부 → 해제
  await page.click('[data-tab=vault]');
  await page.fill('#vpw1', 'smoke-test-pw-123'); await page.fill('#vpw2', 'smoke-test-pw-123');
  await page.click('#vaultCreate button');
  await page.waitForSelector('[data-action=add-acc]');
  await page.click('[data-action=add-acc]');
  await page.fill('#f_service', '테스트 콘솔'); await page.fill('#f_username', 'plain-user@test');
  await page.fill('#f_password', 'PlainSecret!42'); await page.click('#dlgOk');
  await page.waitForTimeout(600);
  const raw = await page.evaluate(() => localStorage.getItem('bridgenode-dashboard-v1'));
  check('보관함 평문 미노출', !raw.includes('plain-user@test') && !raw.includes('PlainSecret!42'));
  await page.click('[data-action=lock]');
  await page.fill('#vpw', 'wrong-password'); await page.click('#vaultUnlock button'); await page.waitForTimeout(1000);
  check('틀린 비밀번호 거부', await page.isVisible('#vpw'));
  await page.fill('#vpw', 'smoke-test-pw-123'); await page.click('#vaultUnlock button');
  await page.waitForSelector('[data-action=lock]');
  check('보관함 해제·복호화', (await page.locator('#tab-vault tbody tr').count()) === 1);

  // 모바일 가로 스크롤 없음
  const m = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await m.goto(URL);
  for (const tab of ['overview', 'projects', 'releases', 'infra', 'vault', 'settings']) {
    await m.click(`[data-tab=${tab}]`);
    check(`모바일 가로스크롤 없음: ${tab}`, !(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  }

  check('콘솔 에러 없음', errors.length === 0);
  if (errors.length) console.log(errors);
  await browser.close();
  const failed = results.filter(r => !r[1]).length;
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
  process.exit(failed ? 1 : 0);
})();
