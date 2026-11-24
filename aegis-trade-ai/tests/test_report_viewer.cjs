const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../report-viewer/report-core.js');
const ctx = {}; vm.runInNewContext(fs.readFileSync('report-viewer/sample.js','utf8'),ctx);
const sample = JSON.parse(JSON.stringify(ctx.PAPER_SAMPLE));
const load = r => core.parse(JSON.stringify(r));
test('Generated Python report accepted and explicitly MOCK', () => {
  const r = load(sample); assert.equal(r.fill_count,2); assert.match(core.provenance(r),/MOCK/);
  assert.equal(r.pnl_reconciles,true); assert.equal(r.actual_returns,false);
});
test('No binary floating point rounding in decimal display', () => {
  assert.equal(core.money('900719925474099312345.12345678'),'900,719,925,474,099,312,345.12345678');
  assert.equal(core.money('-1234.00000001'),'-1,234.00000001');
  assert.equal(core.money('0'),'0'); assert.equal(core.money(null),'데이터 없음');
});
test('Reject wrong execution, real returns, malformed and oversized files', () => {
  assert.throws(()=>load({...sample,execution:'LIVE'}));
  assert.throws(()=>load({...sample,actual_returns:true}));
  assert.throws(()=>core.parse('{bad')); assert.throws(()=>core.parse(' '.repeat(core.MAX_BYTES+1)));
});
test('Reject invalid decimal, float values, missing metrics and wrong row counts', () => {
  for (const value of ['NaN','Infinity','1e5',123,undefined]) assert.throws(()=>load({...sample,cash:value}));
  assert.throws(()=>load({...sample,fill_count:4}));
  assert.throws(()=>load({...sample,fills:[{...sample.fills[0],fee:'NaN'},sample.fills[1]]}));
});
test('Freshness uses local inspection time, not stale server flag', () => {
  const r=load(sample), timestamp=Date.parse(r.price.received_at);
  assert.match(core.freshness(r,timestamp+60000),/60초/);
  assert.match(core.freshness(r,timestamp+61000),/오래된/);
  assert.match(core.freshness(r,timestamp-1000),/미래/);
  assert.match(core.freshness({...r,price:{...r.price,received_at:null}}),/부족/);
});
test('Unknown provenance and missing dates never become live/fresh', () => {
  assert.equal(core.provenance({...sample,market_data_provenance:'untrusted'}),'출처 미확인');
  assert.match(core.provenance({...sample,market_data_provenance:'PUBLIC_LIVE'}),/파일 표기/);
  assert.equal(core.time('2026-01-01T00:00:00'),'시각 기록 없음');
  assert.match(core.time('2026-01-01T00:00:00Z'),/09:00:00 KST/);
});
// Lightweight DOM unit harness, not a browser/rendering QA substitute.
function harness() {
  const elements = new Map();
  class Element {
    constructor(){this.textContent='';this.children=[];this.handlers={};this.hidden=false;this.disabled=false;this.classList={add(){},remove(){}};}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    addEventListener(type,fn){this.handlers[type]=fn;}
    set innerHTML(_){throw new Error('Unsafe HTML insertion');}
  }
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const sandbox={PaperReport:core,PAPER_SAMPLE:sample,document:{getElementById:get,createElement:()=>new Element()},
    setInterval:()=>{},fetch:()=>{throw new Error('Network forbidden');}};
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('report-viewer/viewer.js','utf8'),sandbox);
  return {get,sandbox};
}
test('Sample selection renders records; clear removes all displayed data', () => {
  const {get}=harness(); get('sample').handlers.click();
  assert.match(get('source').textContent,/MOCK/); assert.equal(get('rows').children.length,2);
  assert.equal(get('clear').disabled,false); get('clear').handlers.click();
  assert.equal(get('rows').children.length,0); assert.equal(get('equity').textContent,'—');
});
test('Untrusted HTML remains literal text; bad file retains previous report', async () => {
  const {get,sandbox}=harness(); get('sample').handlers.click();
  const badName='<img src=x onerror=alert(1)>';
  await sandbox.openFile({name:badName,size:100,text:async()=>JSON.stringify(sample)});
  assert.match(get('filename').textContent,/<img/);
  await sandbox.openFile({name:'invalid',size:10,text:async()=>'not json'});
  assert.equal(get('error').hidden,false); assert.match(get('source').textContent,/MOCK/);
});
test('Clear while file loads cancels pending display', async () => {
  const {get,sandbox}=harness(); let resolve;
  const pending=sandbox.openFile({name:'pending',size:100,text:()=>new Promise(r=>resolve=r)});
  get('clear').handlers.click(); resolve(JSON.stringify(sample)); await pending;
  assert.equal(get('rows').children.length,0); assert.equal(get('equity').textContent,'—');
});
test('No runtime upload, persistence or external script dependencies', () => {
  const js=fs.readFileSync('report-viewer/viewer.js','utf8');
  assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|WebSocket/);
  const html=fs.readFileSync('report-viewer/index.html','utf8');
  assert.match(html,/connect-src 'none'/); assert.doesNotMatch(html,/<script[^>]+https?:/);
});
