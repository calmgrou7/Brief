// 사용법: node shorts/render.js shorts/ep01 [--preview]
// episode 폴더의 slides.json → frames → MP4(무음) 렌더링. 음악은 bgm.py, 합성은 make.sh가 담당.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const { charSVG } = require("./characters.js");

const W = 1080, H = 1920;
const epDir = path.resolve(process.argv[2] || path.join(__dirname, "ep01"));
const ep = JSON.parse(fs.readFileSync(path.join(epDir, "slides.json"), "utf8"));
// voice.py가 만든 timing.json이 있으면 내레이션 길이에 맞춘 슬라이드 길이 사용
const timingPath = path.join(epDir, "timing.json");
if (fs.existsSync(timingPath)) JSON.parse(fs.readFileSync(timingPath, "utf8")).durs.forEach((d, i) => (ep.slides[i].dur = d));
const FPS = ep.fps || 24;
const fontDir = path.join(__dirname, "assets", "fonts");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");

// 깜빡임 가능한 캐릭터 (열린 눈 / 감은 눈 SVG 두 장)
let charCount = 0;
function ch(key, px, extraClass = "") {
  const i = charCount++;
  return `<div class="ch ${extraClass}" style="--bobd:${(i % 3) * 0.17}s" data-blink="${(i * 0.73) % 3}">
    <div class="eyes-open">${charSVG(key, px)}</div><div class="eyes-shut">${charSVG(key, px, true)}</div>
    <div class="floor" style="width:${14 * px * 0.86}px;height:${Math.max(6, px * 0.9)}px"></div></div>`;
}

const anim = (d) => `class="in" style="--d:${d}s"`;

function slideHTML(s, idx, total) {
  let body = "";
  const label = s.label ? `<div ${anim(0.0)}><div class="label">${esc(s.label)}</div></div>` : "";
  const title = `<div ${anim(0.12)}><h1>${esc(s.title)}</h1></div>`;
  const sub = s.sub ? `<div ${anim(0.3)}><p class="sub">${esc(s.sub)}</p></div>` : "";

  if (s.type === "lineup") {
    const rows = [s.chars.slice(0, 4), s.chars.slice(4)];
    body = `${label}${title}${sub}<div class="lineup">${rows
      .map((r, ri) => `<div class="lrow">${r.map((k, ci) => `<div ${anim(0.45 + (ri * 4 + ci) * 0.07)}>${ch(k, 15, s.wave ? "wave" : "")}</div>`).join("")}</div>`)
      .join("")}</div>`;
  } else if (s.type === "speech") {
    body = `<div class="speech-wrap">
      <div ${anim(0)}>${ch(s.char, 24)}</div>
      <div ${anim(0.25)}><div class="bubble">${esc(s.bubble)}</div></div></div>
      <div class="push">${label}${title}${sub}</div>`;
  } else if (s.type === "cards") {
    const host = s.host ? `<div class="host" ><div ${anim(0.1)}>${ch(s.host, 15)}</div></div>` : "";
    body = `<div class="head">${host}${label}${title}</div>${sub}<div class="cards ${s.cards.length >= 4 ? "compact" : ""}">${s.cards
      .map(
        (c, i) => `<div ${anim(0.45 + i * 0.18)}><div class="card" style="--c:${c.color}">
          <div class="ctext"><div class="ct">${esc(c.t)}</div><div class="cd">${esc(c.d)}</div></div>
          ${c.char ? `<div class="cchar">${ch(c.char, 8)}</div>` : c.icon ? `<div class="cicon" style="color:${c.color}">${c.icon}</div>` : ""}
        </div></div>`
      )
      .join("")}</div>`;
  } else if (s.type === "focus") {
    body = `${label}${title}
      <div class="focus-row"><div ${anim(0.35)}>${ch(s.char, 22)}</div>
      <div class="focus-text"><div ${anim(0.55)}><div class="hl">${esc(s.highlight)}</div></div>
      <div class="chips">${s.chips.map((c, i) => `<div ${anim(0.8 + i * 0.15)}><span class="chip">${esc(c)}</span></div>`).join("")}</div></div></div>
      ${sub}`;
  }
  return `<section class="slide" data-i="${idx}"><div class="inner">${body}</div>
    <footer><span>${esc(ep.footer)}</span><b>${idx + 1}</b></footer></section>`;
}

const total = ep.slides.length;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url("file://${fontDir}/Pretendard-Medium.otf");font-weight:500}
@font-face{font-family:P;src:url("file://${fontDir}/Pretendard-Bold.otf");font-weight:700}
@font-face{font-family:P;src:url("file://${fontDir}/Pretendard-ExtraBold.otf");font-weight:800}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#F7F6F2;font-family:P,sans-serif;color:#1C1C1E;word-break:keep-all}
.slide{position:absolute;inset:0;opacity:0;background:#F7F6F2}
.slide.on{opacity:1}
.inner{position:absolute;left:96px;right:96px;top:250px;bottom:330px;display:flex;flex-direction:column}
.label{font-size:46px;font-weight:700;color:#8A8A8E;letter-spacing:-.5px;margin-bottom:22px}
h1{font-size:104px;font-weight:800;line-height:1.2;letter-spacing:-3px}
.sub{font-size:46px;font-weight:500;color:#55555B;margin-top:34px;line-height:1.45;letter-spacing:-1px}
.in{animation:rise .5s cubic-bezier(.2,.9,.3,1.25) both;animation-delay:var(--d)}
@keyframes rise{from{opacity:0;transform:translateY(46px)}to{opacity:1;transform:none}}
.ch{position:relative;display:inline-flex;flex-direction:column;align-items:center}
.ch svg{display:block}
.ch .eyes-open,.ch .eyes-shut{animation:bob .9s steps(1) infinite;animation-delay:var(--bobd)}
.ch.wave .eyes-open,.ch.wave .eyes-shut{animation-duration:.45s}
.ch .eyes-shut{position:absolute;top:0;left:0;visibility:hidden}
.ch.blink .eyes-shut{visibility:visible}
@keyframes bob{0%{transform:translateY(0)}50%{transform:translateY(-6%)}}
.floor{background:#1C1C1E;margin-top:4px}
.lineup{margin-top:auto;display:flex;flex-direction:column;gap:56px}
.lrow{display:flex;justify-content:space-between;padding:0 10px}
.lrow:nth-child(2){justify-content:flex-start;gap:72px;padding-left:10px}
.speech-wrap{display:flex;align-items:flex-start;gap:34px;margin-bottom:70px}
.bubble{position:relative;background:#fff;border:5px solid #1C1C1E;border-radius:36px;padding:34px 42px;font-size:54px;font-weight:800;line-height:1.3;margin-top:30px;box-shadow:8px 8px 0 #1C1C1E}
.bubble:before{content:"";position:absolute;left:-30px;top:60px;border:16px solid transparent;border-right:20px solid #1C1C1E;border-left:0}
.push{display:flex;flex-direction:column}
.head{position:relative}
.host{position:absolute;right:0;top:-10px}
.cards{display:flex;flex-direction:column;gap:30px;margin-top:56px}
.card{position:relative;display:flex;align-items:center;justify-content:space-between;background:#fff;border:3px solid #E6E4DE;border-radius:32px;padding:40px 44px 40px 64px;min-height:190px;overflow:hidden}
.card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:22px;background:var(--c)}
.ct{font-size:56px;font-weight:800;letter-spacing:-1.5px;line-height:1.25}
.cd{font-size:38px;font-weight:500;color:#6B6B70;margin-top:12px;letter-spacing:-.5px;line-height:1.35}
.cchar{flex:none;margin-left:20px}
.cards.compact{gap:22px;margin-top:44px}.cards.compact .card{min-height:0;padding:28px 36px 28px 60px}
.cards.compact .ct{font-size:52px}.cards.compact .cd{font-size:36px;margin-top:6px}
.cicon{flex:none;font-size:80px;font-weight:800;margin-left:20px}
.focus-row{display:flex;align-items:flex-end;gap:50px;margin-top:80px}
.focus-text{flex:1;padding-bottom:30px}
.hl{display:inline;font-size:66px;font-weight:800;line-height:1.5;letter-spacing:-2px;background:linear-gradient(transparent 55%,#FFE066 55%)}
.chips{display:flex;flex-wrap:wrap;gap:18px;margin-top:40px}
.chip{display:inline-block;font-size:40px;font-weight:700;padding:16px 30px;border-radius:999px;background:#2E9E6A;color:#fff}
footer{position:absolute;left:96px;right:96px;bottom:250px;display:flex;justify-content:space-between;font-size:32px;color:#8A8A8E;font-weight:500;border-top:2px solid #E6E4DE;padding-top:26px}
footer b{color:#1C1C1E}
</style></head><body>${ep.slides.map((s, i) => slideHTML(s, i, total)).join("")}
<script>
const DUR=${JSON.stringify(ep.slides.map((s) => s.dur))};
const START=DUR.reduce((a,d,i)=>(a.push(i?a[i-1]+DUR[i-1]:0),a),[]);
window.TOTAL=DUR.reduce((a,b)=>a+b,0);
document.getAnimations().forEach(a=>a.pause());
const slides=[...document.querySelectorAll('.slide')];
window.seek=(t)=>{
  let i=START.findLastIndex(s=>s<=t); if(i<0)i=0;
  slides.forEach((s,k)=>s.classList.toggle('on',k===i));
  const lt=t-START[i];
  slides[i].getAnimations({subtree:true}).forEach(a=>{a.currentTime=lt*1000});
  slides[i].querySelectorAll('.ch').forEach(c=>{const o=+c.dataset.blink;const p=(lt+o)%3.1;c.classList.toggle('blink',p>2.95)});
};
</script></body></html>`;

(async () => {
  const htmlPath = path.join(epDir, "slides.html");
  fs.writeFileSync(htmlPath, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto("file://" + htmlPath);
  await page.evaluate(() => document.fonts.ready);
  const TOTAL = await page.evaluate(() => window.TOTAL);
  if (process.argv.includes("--preview")) {
    // 슬라이드마다 끝나기 직전 장면을 PNG로 저장 (빠른 검수용)
    const durs = ep.slides.map((s) => s.dur);
    let acc = 0;
    for (let i = 0; i < durs.length; i++) {
      acc += durs[i];
      await page.evaluate((t) => window.seek(t), acc - 0.6);
      await page.screenshot({ path: path.join(epDir, `preview_${i + 1}.png`) });
    }
    await browser.close();
    return console.log("preview saved");
  }
  const frames = Math.round(TOTAL * FPS);
  const out = path.join(epDir, "video_silent.mp4");
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18", "-r", "30", out], { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.seek(t), f / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 120 === 0) process.stdout.write(`frame ${f}/${frames}\n`);
  }
  // 썸네일: 1번 슬라이드 완성 상태
  await page.evaluate(() => window.seek(3.5));
  await page.screenshot({ path: path.join(epDir, "thumbnail.png") });
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await browser.close();
  console.log("done", out, `${TOTAL}s`);
})();
