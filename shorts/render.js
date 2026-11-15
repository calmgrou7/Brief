// 사용법: node render.js projects/stay-b.json
// 프로젝트 JSON의 장면을 1080x1920 영상으로 렌더링하고, "ending"이 지정돼 있으면 엔딩을 붙여 최종 쇼츠를 만든다.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

async function renderProject(browser, cfgPath) {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, cfgPath), 'utf8'));
  const fps = cfg.fps || 30;
  const out = path.join(OUT, `${cfg.name}_video.mp4`);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'compose.html'));
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(c => window.setup(c), cfg);
  const frames = Math.round(total * fps);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let f = 0; f < frames; f++) {
    const t = f / fps;
    let ready = await page.evaluate(t => window.renderAt(t), t);
    // 장면이 바뀐 첫 프레임에서는 이미지 로딩을 기다린 뒤 다시 그린다
    for (let k = 0; !ready && k < 50; k++) { await page.waitForTimeout(40); ready = await page.evaluate(t => window.renderAt(t), t); }
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`  ${cfg.name}: ${f}/${frames}\r`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  await page.close();
  console.log(`  ${cfg.name}: ${frames} frames → ${path.relative(ROOT, out)}`);
  return { cfg, out, total };
}

(async () => {
  const cfgPath = process.argv[2] || 'projects/stay-b.json';
  const browser = await chromium.launch();
  const main = await renderProject(browser, cfgPath);
  let parts = [main];
  if (main.cfg.ending) {
    const endCfg = JSON.parse(fs.readFileSync(path.join(ROOT, main.cfg.ending), 'utf8'));
    const endOut = path.join(OUT, `${endCfg.name}_video.mp4`);
    // 엔딩은 한 번 렌더링해 두고 모든 쇼츠에서 재사용 (설정이 바뀌면 다시 렌더링)
    const stale = !fs.existsSync(endOut) || fs.statSync(endOut).mtimeMs < fs.statSync(path.join(ROOT, main.cfg.ending)).mtimeMs
      || fs.statSync(endOut).mtimeMs < fs.statSync(path.join(ROOT, 'compose.html')).mtimeMs;
    const end = stale ? await renderProject(browser, main.cfg.ending) : { cfg: endCfg, out: endOut, total: endCfg.scenes.reduce((a, s) => a + s.dur, 0) };
    parts.push(end);
  }
  await browser.close();

  // 장면 전환 타이밍을 넘겨 배경음(효과음 포함)을 만든다
  const cues = [];
  let acc = 0;
  for (const p of parts) { for (const s of p.cfg.scenes) { cues.push({ t: acc, type: s.type }); acc += s.dur; } }
  const wav = path.join(OUT, `${main.cfg.name}_audio.wav`);
  execFileSync('python3', ['-I', path.join(ROOT, 'music.py'), wav, String(acc), JSON.stringify(cues)], { stdio: 'inherit' });

  const final = path.join(OUT, `${main.cfg.name}_shorts.mp4`);
  const list = path.join(OUT, 'concat.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p.out}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final]);
  fs.unlinkSync(list);
  console.log(`완성: ${path.relative(ROOT, final)} (${acc.toFixed(1)}초)`);
})().catch(e => { console.error(e); process.exit(1); });
