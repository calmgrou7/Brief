#!/usr/bin/env node
// HTML 애니메이션 장면을 프레임 단위로 찍어 mp4로 만든다.
// 사용법: node record.js scene.html out.mp4 [초=10] [fps=30]
// 장면 HTML은 window.seek(t)를 제공해야 한다 (t초 시점의 화면으로 맞추기).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [html, out, secs = '10', fpsArg = '30'] = process.argv.slice(2);
  const fps = Number(fpsArg), total = Math.round(Number(secs) * fps);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(html));
  await page.evaluate(() => document.fonts.ready);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.seek(t), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log(`done: ${out} (${secs}s)`);
})();
