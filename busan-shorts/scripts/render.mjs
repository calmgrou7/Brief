#!/usr/bin/env node
// Deterministic render of the shorts to MP4 (1080x1920, 30 fps) + narration SRT.
//   node scripts/render.mjs                 -> out/busan_lineart_shorts.mp4
//   node scripts/render.mjs --ep gamcheon        -> out/gamcheon_lineart_shorts.mp4
//   node scripts/render.mjs --stills 1,5,9  -> out/still_<t>.png at those seconds (quick check)
// Starts its own Vite server, drives the page in ?debug mode (window.__step), pipes PNG frames to ffmpeg.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// the machine-wide Playwright (preinstalled Chromium) resolves through require()
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'out');
mkdirSync(outDir, { recursive: true });
const args = process.argv.slice(2);
const ep = args.includes('--ep') ? args[args.indexOf('--ep') + 1] : 'busan';
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const FPS = 30;

const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.config.server.port}/?debug&capture&ep=${ep}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => typeof window.__step === 'function');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const total = await page.evaluate(() => window.__total);
const starts = await page.evaluate(() => window.__starts);
const frame = page.locator('#frame');

if (stillsArg) {
  let now = 0;
  for (const s of stillsArg.split(',').map(Number).sort((a, b) => a - b)) {
    await page.evaluate((d) => window.__step(d), s - now); now = s;
    await frame.screenshot({ path: path.join(outDir, `still_${ep}_${s}.png`) });
  }
  console.log(`stills done (total ${total.toFixed(2)}s)`);
} else {
  const n = Math.round(total * FPS);
  const out = path.join(outDir, `${await page.evaluate(() => window.__ep)}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-f', 'lavfi', '-t', total.toFixed(3), '-i', 'anullsrc=r=44100:cl=stereo',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    if (i) await page.evaluate((d) => window.__step(d), 1 / FPS);
    const buf = await frame.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 90 === 0) process.stdout.write(`\rframe ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`\ndone: ${out} (${total.toFixed(1)}s)`);

  // narration SRT, one cue per caption, timed to when it appears on screen
  const caps = await page.evaluate(() => window.__caps);
  if (caps) {
    const ts = (t) => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
    writeFileSync(out.replace(/\.mp4$/, '.srt'), caps.map((c, i) => `${i + 1}\n${ts(c.a)} --> ${ts(c.b)}\n${c.text}\n`).join('\n'), 'utf8');
  }
}
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); }
await browser.close();
await server.close();
void starts;
