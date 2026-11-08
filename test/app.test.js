import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.ADMIN_TOKEN = 'secret';
process.env.BIZINFO_API_KEY = '';
const { createApp } = await import('../server/index.js');
const { matchFunds, riskFlags, isSmallBiz } = await import('../server/matcher.js');
const { collectPrograms } = await import('../server/bizinfo.js');

let server, base;
before(async () => {
  await collectPrograms();
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const base0 = { bizType: 'individual', industry: 'it', region: '서울', years: 1, employees: 2, ceoAge: 'u39', fundUse: 'operating', credit: 'good', certs: [] };

test('소상공인 기준: 제조업은 10인 미만, 그 외 5인 미만', () => {
  assert.equal(isSmallBiz({ industry: 'manufacturing', employees: 9 }), true);
  assert.equal(isSmallBiz({ industry: 'service', employees: 5 }), false);
});

test('청년 창업 3년 미만이면 청년전용창업자금 추천', () => {
  const codes = matchFunds(base0).map((f) => f.code);
  assert.ok(codes.includes('KOSME_YOUTH'));
  assert.ok(!matchFunds({ ...base0, ceoAge: '40to59' }).some((f) => f.code === 'KOSME_YOUTH'));
});

test('기술인증 없으면 기보 제외, 있으면 포함', () => {
  assert.ok(!matchFunds(base0).some((f) => f.code === 'KIBO'));
  assert.ok(matchFunds({ ...base0, certs: ['patent'] }).some((f) => f.code === 'KIBO'));
});

test('체납/연체는 경고 플래그', () => {
  const codes = riskFlags({ taxArrears: true, loanOverdue: true }).map((f) => f.code);
  assert.deepEqual(codes, ['TAX_ARREARS', 'LOAN_OVERDUE']);
});

test('진단 API → 결과 + 지역 공고', async () => {
  const r = await post('/api/diagnosis', { deviceId: 't', answers: base0 });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.ok(j.id > 0 && j.funds.length > 0);
  assert.ok(j.programs.every((p) => p.regions.includes('서울') || p.regions.includes('전국')));
});

test('상담신청: 필수 동의 없으면 거부, 있으면 저장 + 동의 이력', async () => {
  const lead = { name: '홍길동', phone: '010-1111-2222', companyName: '테스트', helpTypes: ['documents'] };
  let r = await post('/api/leads', { ...lead, consents: { privacy_required: false } });
  assert.equal(r.status, 400);
  r = await post('/api/leads', { ...lead, consents: { privacy_required: true, marketing: true } });
  assert.equal(r.status, 201);
  const { id } = await r.json();
  const d = await (await fetch(`${base}/api/admin/leads/${id}`, { headers: { authorization: 'Bearer secret' } })).json();
  assert.equal(d.phone, '01011112222');
  assert.equal(d.consents.find((c) => c.consent_type === 'privacy_required').agreed, 1);
  assert.equal(d.consents.find((c) => c.consent_type === 'third_party').agreed, 0);
});

test('관리자 API는 토큰 필요, CSV는 BOM 포함', async () => {
  assert.equal((await fetch(`${base}/api/admin/leads`)).status, 401);
  const buf = Buffer.from(await (await fetch(`${base}/api/admin/leads.csv`, { headers: { authorization: 'Bearer secret' } })).arrayBuffer());
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf]); // UTF-8 BOM → 엑셀 한글 깨짐 방지
  assert.ok(buf.toString('utf8').includes('홍길동'));
});
