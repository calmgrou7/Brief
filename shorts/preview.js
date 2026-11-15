// 사용법: node preview.js projects/stay-b.json out/preview.png  → 장면별 완성 시점 스틸을 한 장으로
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const cfgs = process.argv.slice(2, -1).map(p => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8')));
  const outPng = process.argv[process.argv.length - 1];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const shots = [];
  for (const cfg of cfgs) {
    await p.goto('file://' + path.join(__dirname, 'compose.html'));
    await p.evaluate(c => window.setup(c), cfg);
    let acc = 0;
    for (const s of cfg.scenes) {
      const t = acc + Math.min(s.dur - 0.25, 2.6);
      for (let k = 0; k < 3; k++) { await p.evaluate(t => window.renderAt(t), t); await p.waitForTimeout(150); }
      await p.evaluate(t => window.renderAt(t), t);
      shots.push(await p.screenshot({ type: 'png' }));
      acc += s.dur;
    }
  }
  await b.close();
  const tmp = shots.map((s, i) => { const f = `/tmp/_pv${i}.png`; fs.writeFileSync(f, s); return f; });
  require('child_process').execFileSync('python3', ['-c', `
import sys
from PIL import Image
fs=sys.argv[2:]; ims=[Image.open(f).resize((360,640)) for f in fs]
sh=Image.new('RGB',(370*len(ims),640),'white')
for i,im in enumerate(ims): sh.paste(im,(i*370,0))
sh.save(sys.argv[1])`, outPng, ...tmp]);
})();
