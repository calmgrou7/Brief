// 인포그래픽 + 일러스트 진행자 템플릿 (slides.json "template": "infographic")
// 위: 진행 타이머 pill · 강조 박스 헤드라인 · 인포그래픽 카드 / 아래: 진행자 일러스트(포즈 전환·숨쉬기·흔들림)
const path = require("path");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
// "텍스트 [강조] 텍스트" → 강조 박스
const hl = (s) => esc(s).replace(/\[([^\]]+)\]/g, '<span class="hl"><span class="hlt">$1</span><i class="bx"></i><b class="h1"></b><b class="h2"></b><b class="h3"></b><b class="h4"></b></span>');
const anim = (d, cls = "in") => `class="${cls}" style="--d:${d}s"`;

function block(b, i) {
  const d = 0.55 + i * 0.22;
  switch (b.type) {
    case "question":
      return `<div ${anim(d)}><div class="card qcard"><div class="qmark">?</div><div><div class="ct">${esc(b.t)}</div>${b.d ? `<div class="cd">${esc(b.d)}</div>` : ""}</div></div></div>`;
    case "wrong":
      return `<div ${anim(d)}><div class="card row"><span class="badge no">✕</span><div class="ct strike">${esc(b.t)}</div></div></div>`;
    case "compare":
      return `<div ${anim(d)}><div class="card row cmp"><div class="cl">${esc(b.label)}</div><div class="cv" style="color:${b.color || "#1B2140"}">${esc(b.mark)}</div><div class="cr">${esc(b.t)}</div></div></div>`;
    case "step":
      return `<div ${anim(d)}><div class="card row"><span class="num">${i + 1}</span><div><div class="ct">${esc(b.t)}</div>${b.d ? `<div class="cd">${esc(b.d)}</div>` : ""}</div><span class="check">✓</span></div></div>`;
    case "stat":
      return `<div ${anim(d)}><div class="card stat"><div class="sl">${esc(b.label)}</div><div class="sv">${esc(b.value)}<small>${esc(b.unit || "")}</small></div></div></div>`;
    case "cta":
      return `<div ${anim(d, "in pop")}><div class="card cta"><div class="sl">${esc(b.label)}</div><div class="sv">${esc(b.value)}</div><div class="cd">${esc(b.d)}</div></div></div>`;
    case "note":
      return `<div ${anim(d)}><p class="note">${esc(b.t)}</p></div>`;
  }
  return "";
}

function buildHTML(ep, { fontDir, hostDir, W, H }) {
  const slides = ep.slides
    .map(
      (s, i) => `<section class="slide" data-i="${i}">
        ${s.kicker ? `<div ${anim(0)}><div class="kicker">${esc(s.kicker)}</div></div>` : ""}
        <div ${anim(0.08)}><h1>${hl(s.title)}</h1></div>
        <div class="panel ${(s.blocks || []).filter((b) => b.type !== "note").length >= 3 ? "dense" : ""}">${(s.blocks || []).map(block).join("")}</div>
      </section>`
    )
    .join("");
  const poses = ep.slides.map((s) => s.pose || "stand");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url("file://${fontDir}/Pretendard-Medium.otf");font-weight:500}
@font-face{font-family:P;src:url("file://${fontDir}/Pretendard-Bold.otf");font-weight:700}
@font-face{font-family:P;src:url("file://${fontDir}/Pretendard-ExtraBold.otf");font-weight:800}
:root{--bg:#FBF1E3;--ink:#1B2140;--sub:#6A6F85;--blue:#2747C9;--accent:#F26B3A;--card:#FFFFFF;--line:#EADFCF}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bg);font-family:P,sans-serif;color:var(--ink);word-break:keep-all}
/* 진행 pill */
.pill{position:absolute;top:150px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:18px;background:#fff;border-radius:999px;padding:16px 34px 16px 20px;box-shadow:0 6px 24px rgba(27,33,64,.08);z-index:5}
.ring{width:44px;height:44px;border-radius:50%;background:conic-gradient(var(--accent) var(--p,0%),#F3E6D6 0);display:grid;place-items:center}
.ring:after{content:"";width:28px;height:28px;border-radius:50%;background:#fff}
.pill b{font-size:40px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.5px}
.pill span{font-size:30px;font-weight:700;color:var(--sub)}
/* 장면 */
.slide{position:absolute;left:0;right:0;top:0;height:1160px;padding:270px 80px 0;opacity:0;display:flex;flex-direction:column;align-items:center;text-align:center}
.slide.on{opacity:1}
.kicker{font-size:36px;font-weight:700;color:var(--blue);margin-bottom:18px;letter-spacing:-.5px}
h1{font-size:76px;font-weight:800;line-height:1.3;letter-spacing:-2.5px}
.hl{position:relative;display:inline-block;padding:0 12px;margin:0 2px}
.hl .hlt{position:relative;z-index:1;color:var(--accent)}
.hl .bx{position:absolute;inset:4px 0 0;border:4px solid var(--accent);background:rgba(242,107,58,.09);border-radius:6px;transform-origin:left;animation:draw .45s ease-out both;animation-delay:.55s}
.hl b{position:absolute;width:16px;height:16px;background:#fff;border:4px solid var(--accent);border-radius:3px;animation:fade .2s both;animation-delay:.95s}
.hl .h1{left:-8px;top:-4px}.hl .h2{right:-8px;top:-4px}.hl .h3{left:-8px;bottom:-8px}.hl .h4{right:-8px;bottom:-8px}
@keyframes draw{from{transform:scaleX(0);opacity:0}to{transform:none;opacity:1}}
@keyframes fade{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
.slide{z-index:2}
.panel.dense{gap:16px;margin-top:40px}.panel.dense .card{padding:22px 34px}.panel.dense .ct{font-size:42px}.panel.dense .cd{font-size:29px;margin-top:4px}.panel.dense .num{width:62px;height:62px;font-size:34px}
.panel{width:100%;margin-top:52px;display:flex;flex-direction:column;gap:22px;text-align:left}
.in{animation:rise .55s cubic-bezier(.2,.9,.3,1.15) both;animation-delay:var(--d)}
.in.pop{animation-name:popin}
@keyframes rise{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes popin{0%{opacity:0;transform:scale(.85)}70%{opacity:1;transform:scale(1.03)}100%{transform:none}}
.card{background:var(--card);border-radius:28px;padding:30px 38px;box-shadow:0 8px 28px rgba(27,33,64,.07)}
.row{display:flex;align-items:center;gap:26px}
.ct{font-size:46px;font-weight:800;letter-spacing:-1.2px;line-height:1.3}
.cd{font-size:32px;font-weight:500;color:var(--sub);margin-top:8px;line-height:1.4}
.qcard{display:flex;align-items:center;gap:30px;border:4px dashed #D9CBB6;box-shadow:none;background:#FFFDF9}
.qmark{flex:none;width:96px;height:96px;border-radius:50%;background:var(--blue);color:#fff;font-size:64px;font-weight:800;display:grid;place-items:center}
.badge{flex:none;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-size:36px;font-weight:800;color:#fff}
.badge.no{background:#E5484D}
.strike{position:relative;color:#3D4258}
.strike:after{content:"";position:absolute;left:0;right:0;top:52%;height:5px;background:#E5484D;border-radius:3px;transform-origin:left;animation:draw .4s ease-out both;animation-delay:calc(var(--d) + .55s)}
.cmp .cl{flex:none;width:170px;font-size:34px;font-weight:700;color:var(--sub)}
.cmp .cv{flex:none;width:70px;font-size:56px;font-weight:800;text-align:center}
.cmp .cr{font-size:42px;font-weight:800;letter-spacing:-1px}
.num{flex:none;width:72px;height:72px;border-radius:20px;background:var(--ink);color:#fff;font-size:40px;font-weight:800;display:grid;place-items:center}
.check{margin-left:auto;flex:none;width:58px;height:58px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:32px;font-weight:800}
.stat{padding:28px 40px}
.sl{font-size:32px;font-weight:700;color:var(--sub)}
.sv{font-size:84px;font-weight:800;letter-spacing:-3px;line-height:1.15;margin-top:4px}
.sv small{font-size:44px;margin-left:8px;letter-spacing:-1px}
.cta{text-align:center;border:4px solid var(--blue)}
.cta .sv{color:var(--blue)}
.note{font-size:30px;color:var(--sub);text-align:center;margin-top:6px}
/* 진행자 */
.host{z-index:1;position:absolute;left:0;right:0;bottom:0;height:${H}px;pointer-events:none}
.host img{position:absolute;left:50%;bottom:0;transform-origin:50% 100%;}
#stand{height:860px;margin-left:-322px;bottom:-30px}
#talk{height:840px;margin-left:-384px;bottom:-44px}
.brand{position:absolute;right:56px;top:66px;font-size:28px;font-weight:700;color:var(--sub);opacity:.9}
</style></head><body>
<div class="pill"><div class="ring" id="ring"></div><b id="clock">0:00</b><span>${esc(ep.pill || "")}</span></div>
${slides}
<div class="host"><img id="stand" src="file://${hostDir}/stand.png"><img id="talk" src="file://${hostDir}/talk.png"></div>
<script>
const DUR=${JSON.stringify(ep.slides.map((s) => s.dur))};
const POSE=${JSON.stringify(poses)};
const START=DUR.reduce((a,d,i)=>(a.push(i?a[i-1]+DUR[i-1]:0),a),[]);
window.TOTAL=DUR.reduce((a,b)=>a+b,0);
document.getAnimations().forEach(a=>a.pause());
const slides=[...document.querySelectorAll('.slide')];
const img={stand:document.getElementById('stand'),talk:document.getElementById('talk')};
const ease=x=>x<0?0:x>1?1:1-Math.pow(1-x,3);
window.seek=(t)=>{
  let i=START.findLastIndex(s=>s<=t); if(i<0)i=0;
  const lt=t-START[i];
  slides.forEach((s,k)=>s.classList.toggle('on',k===i));
  slides[i].getAnimations({subtree:true}).forEach(a=>{a.currentTime=lt*1000});
  // 진행 pill
  const sec=Math.floor(t); document.getElementById('clock').textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
  document.getElementById('ring').style.setProperty('--p',(t/TOTAL*100).toFixed(2)+'%');
  // 진행자: 포즈 전환(교차 페이드) + 등장 팝 + 숨쉬기 + 살짝 흔들림
  const cur=POSE[i], prev=i>0?POSE[i-1]:cur, changed=cur!==prev||i===0;
  const f=changed?ease(lt/0.2):1;
  for(const k of ['stand','talk']){
    const on=k===cur, wasOn=k===prev&&changed&&i>0;
    let op=on?f:(wasOn?1-f:0);
    const breath=1+0.010*Math.sin(t*2*Math.PI/3.2);
    const sway=(k==='talk'?1.1:0.6)*Math.sin(t*2*Math.PI/(k==='talk'?2.4:4.0));
    const pop=on&&changed?(1-f)*40:0;
    const nod=k==='talk'?2.5*Math.max(0,Math.sin(lt*2*Math.PI/1.6)):0;
    img[k].style.opacity=op;
    img[k].style.transform='translateY('+(pop-nod)+'px) rotate('+sway.toFixed(3)+'deg) scale('+breath.toFixed(4)+','+(breath*1.004).toFixed(4)+')';
  }
};
</script></body></html>`;
}

module.exports = { buildHTML };
