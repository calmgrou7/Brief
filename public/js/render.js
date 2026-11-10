/* 진로산사 메타버스 — 그리기 (맵, 아바타, 등불, 말풍선)
 * 이미지 파일 없이 캔버스 도형으로만 그립니다. */
window.SansaRender = (function () {
  const W = window.SANSA_WORLD;
  const T = W.T;
  const SANS = '"Noto Sans KR", system-ui, sans-serif';
  const SERIF = '"Noto Serif KR", serif';

  // 결정적 난수 (맵 질감이 매번 같도록)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 한옥 지붕 (처마가 살짝 들린 모양)
  function roof(ctx, x, y, w, h, color) {
    const lift = Math.min(14, w * 0.06);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + h - lift);
    ctx.quadraticCurveTo(x + w * 0.15, y + h + 2, x + w * 0.3, y + h);
    ctx.lineTo(x + w * 0.7, y + h);
    ctx.quadraticCurveTo(x + w * 0.85, y + h + 2, x + w + 10, y + h - lift);
    ctx.lineTo(x + w - w * 0.12, y);
    ctx.lineTo(x + w * 0.12, y);
    ctx.closePath();
    ctx.fill();
    // 기와 줄
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    for (let i = x + 8; i < x + w; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i, y + 4);
      ctx.lineTo(i + (i - (x + w / 2)) * 0.06, y + h - 4);
      ctx.stroke();
    }
    // 용마루
    ctx.fillStyle = "#2a2a2c";
    ctx.fillRect(x + w * 0.12, y - 3, w * 0.76, 6);
  }

  function pillars(ctx, x, y, w, h, n) {
    ctx.fillStyle = "#9c3b2a";
    for (let i = 0; i < n; i++) {
      const px = x + 6 + (i * (w - 18)) / (n - 1);
      ctx.fillRect(px, y, 6, h);
    }
  }

  function drawStaticMap() {
    const c = document.createElement("canvas");
    c.width = W.W;
    c.height = W.H;
    const ctx = c.getContext("2d");
    seed = 7;

    // 바닥: 마사토 마당 + 가장자리 잔디
    ctx.fillStyle = "#e4d5b5";
    ctx.fillRect(0, 0, W.W, W.H);
    for (let y = 0; y < W.ROWS; y++) {
      for (let x = 0; x < W.COLS; x++) {
        const edge = Math.min(x, y, W.COLS - 1 - x, W.ROWS - 1 - y);
        if (edge <= 2 && !(y > 24 && x >= 16 && x <= 23)) {
          ctx.fillStyle = (x + y) % 2 ? "#a9b57c" : "#a3b076";
          ctx.fillRect(x * T, y * T, T, T);
        }
      }
    }
    // 모래 질감
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = rnd() > 0.5 ? "rgba(120,90,50,0.08)" : "rgba(255,255,255,0.18)";
      ctx.fillRect(rnd() * W.W, rnd() * W.H, 2, 2);
    }
    // 돌길: 산문 → 돌탑 → 법당
    ctx.fillStyle = "#cdbf9f";
    ctx.fillRect(18 * T, 13 * T, 4 * T, 17 * T);
    ctx.fillRect(9 * T, 12 * T, 22 * T, 1 * T);
    for (let y = 13; y < 30; y++) {
      for (let x = 18; x < 22; x++) {
        ctx.strokeStyle = "rgba(90,70,40,0.15)";
        ctx.strokeRect(x * T + 1, y * T + 1, T - 2, T - 2);
      }
    }

    // 정자 바닥
    W.ZONES.filter((z) => z.chat === "zone").forEach((z) => {
      ctx.fillStyle = "#c79e6b";
      ctx.fillRect(z.x * T, z.y * T, z.w * T, z.h * T);
      ctx.strokeStyle = "rgba(80,50,20,0.25)";
      ctx.lineWidth = 1;
      for (let x = z.x * T; x < (z.x + z.w) * T; x += 12) {
        ctx.beginPath(); ctx.moveTo(x, z.y * T); ctx.lineTo(x, (z.y + z.h) * T); ctx.stroke();
      }
      ctx.strokeStyle = "#7a5230";
      ctx.lineWidth = 4;
      ctx.strokeRect(z.x * T + 2, z.y * T + 2, z.w * T - 4, z.h * T - 4);
    });
    // 법당 앞 마당 (넓은 돌판)
    const hz = W.ZONES.find((z) => z.id === "hall");
    ctx.fillStyle = "#d6c8a8";
    ctx.fillRect(hz.x * T, hz.y * T, hz.w * T, hz.h * T);
    ctx.strokeStyle = "rgba(90,70,40,0.18)";
    for (let x = hz.x; x < hz.x + hz.w; x++) for (let y = hz.y; y < hz.y + hz.h; y++) ctx.strokeRect(x * T, y * T, T, T);

    W.BLOCKS.forEach((b) => {
      const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T;
      switch (b.kind) {
        case "wall":
          ctx.fillStyle = "#efe8da";
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = "#4b4b4d";
          ctx.fillRect(x, y, w, Math.min(h, 12));
          if (h > w) ctx.fillRect(x, y, Math.min(w, 12), h);
          break;
        case "hall":
          ctx.fillStyle = "#b9ad95"; // 기단
          ctx.fillRect(x - 6, y + h - 26, w + 12, 26);
          ctx.fillStyle = "#e9dcc0";
          ctx.fillRect(x + 8, y + h * 0.45, w - 16, h * 0.45);
          pillars(ctx, x + 8, y + h * 0.45, w - 16, h * 0.45, 6);
          ctx.fillStyle = "#3d6b5a"; // 단청 띠
          ctx.fillRect(x + 8, y + h * 0.45, w - 16, 8);
          roof(ctx, x, y, w, h * 0.5, "#3f4447");
          // 현판
          ctx.fillStyle = "#2c3a33";
          roundRect(ctx, x + w / 2 - 54, y + h * 0.5 + 6, 108, 26, 3);
          ctx.fill();
          ctx.fillStyle = "#e8c66a";
          ctx.font = `700 15px ${SERIF}`;
          ctx.textAlign = "center";
          ctx.fillText("길잡이 법당", x + w / 2, y + h * 0.5 + 24);
          break;
        case "bellhouse":
          ctx.fillStyle = "#b9ad95";
          ctx.fillRect(x, y + h - 14, w, 14);
          pillars(ctx, x + 4, y + h * 0.4, w - 8, h * 0.6 - 14, 2);
          // 범종
          ctx.fillStyle = "#7c5a32";
          ctx.beginPath();
          ctx.moveTo(x + w / 2 - 20, y + h - 18);
          ctx.quadraticCurveTo(x + w / 2 - 22, y + h * 0.45, x + w / 2, y + h * 0.42);
          ctx.quadraticCurveTo(x + w / 2 + 22, y + h * 0.45, x + w / 2 + 20, y + h - 18);
          ctx.closePath();
          ctx.fill();
          roof(ctx, x, y, w, h * 0.42, "#45494c");
          break;
        case "stupa":
          ctx.fillStyle = "#9b978e";
          ctx.fillRect(x - 10, y + h - 14, w + 20, 14);
          [[0, 0.62, 1], [0.12, 0.4, 0.78], [0.22, 0.2, 0.56], [0.3, 0.02, 0.4]].forEach(([inset, top, scale]) => {
            ctx.fillStyle = "#b8b4aa";
            ctx.fillRect(x + w * inset - 4, y + h * top, w * scale + 8, h * 0.16);
            ctx.fillStyle = "#8d897f";
            ctx.fillRect(x + w * inset - 8, y + h * top + h * 0.16, w * scale + 16, 5);
          });
          break;
        case "pond":
          ctx.fillStyle = "#6f9a9f";
          roundRect(ctx, x, y, w, h, 40);
          ctx.fill();
          ctx.strokeStyle = "#a9a28f";
          ctx.lineWidth = 6;
          ctx.stroke();
          for (let i = 0; i < 9; i++) {
            const lx = x + 30 + rnd() * (w - 60), ly = y + 25 + rnd() * (h - 50);
            ctx.fillStyle = "#5f8a4f";
            ctx.beginPath(); ctx.arc(lx, ly, 9 + rnd() * 5, 0.3, Math.PI * 2); ctx.lineTo(lx, ly); ctx.fill();
            if (i % 3 === 0) { ctx.fillStyle = "#f2a9b8"; ctx.beginPath(); ctx.arc(lx + 4, ly - 3, 4, 0, Math.PI * 2); ctx.fill(); }
          }
          break;
        case "pillar":
          ctx.fillStyle = "#9c3b2a";
          ctx.fillRect(x + 10, y + 4, 12, 26);
          ctx.fillStyle = "#6d6a63";
          ctx.fillRect(x + 6, y + 26, 20, 6);
          break;
        case "tree":
          break; // 나무는 아바타 위에 겹치도록 동적으로 그림
      }
    });

    // 산문 기둥
    [17, 22].forEach((tx) => {
      ctx.fillStyle = "#9c3b2a";
      ctx.fillRect(tx * T + 8, 28 * T, 16, 2 * T);
    });

    // 구역 이름
    ctx.textAlign = "center";
    W.ZONES.forEach((z) => {
      if (z.id === "hall") return;
      ctx.font = `600 13px ${SERIF}`;
      const lx = (z.x + z.w / 2) * T, ly = z.id === "stupa" ? (z.y + z.h) * T - 8 : (z.y + z.h) * T - 8;
      ctx.fillStyle = "rgba(43,38,32,0.55)";
      ctx.fillText(z.name, lx, ly);
    });
    return c;
  }

  function drawTree(ctx, b, t) {
    const x = b.x * T + T / 2, y = b.y * T + T / 2;
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath(); ctx.ellipse(x, y + 12, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6b4b2e";
    ctx.fillRect(x - 4, y - 6, 8, 20);
    const sway = Math.sin(t / 1200 + b.x) * 1.5;
    ctx.fillStyle = "#4f7044";
    ctx.beginPath(); ctx.arc(x + sway, y - 22, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5f8352";
    ctx.beginPath(); ctx.arc(x - 8 + sway, y - 28, 14, 0, Math.PI * 2); ctx.fill();
  }

  function drawAvatar(ctx, p, t, isMe) {
    const x = p.dx, y = p.dy;
    const bob = p.moving ? Math.abs(Math.sin(t / 90)) * 3 : 0;
    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(x, y + 10, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (isMe) {
      ctx.strokeStyle = "rgba(242,180,90,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y + 10, 17, 7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (p.coach) {
      ctx.fillStyle = "rgba(242,190,90,0.35)";
      ctx.beginPath(); ctx.arc(x, y - 14, 26, 0, Math.PI * 2); ctx.fill();
    }
    // 몸 (승복 느낌의 도포)
    ctx.fillStyle = p.color;
    roundRect(ctx, x - 11, y - 14 - bob, 22, 24, 9);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x - 1, y - 12 - bob, 2, 18);
    // 머리
    const hy = y - 24 - bob;
    ctx.fillStyle = "#f1d3b3";
    ctx.beginPath(); ctx.arc(x, hy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2f2a26";
    ctx.beginPath();
    if (p.dir === "up") ctx.arc(x, hy, 11.5, 0, Math.PI * 2);
    else ctx.arc(x, hy - 2, 11.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    // 눈
    ctx.fillStyle = "#2f2a26";
    if (p.dir === "down") { ctx.fillRect(x - 5, hy + 1, 2.5, 3); ctx.fillRect(x + 3, hy + 1, 2.5, 3); }
    else if (p.dir === "left") ctx.fillRect(x - 6, hy + 1, 2.5, 3);
    else if (p.dir === "right") ctx.fillRect(x + 4, hy + 1, 2.5, 3);
    // 이름표
    ctx.font = `500 11px ${SANS}`;
    ctx.textAlign = "center";
    const label = p.coach ? "🧭 " + p.nick : p.nick;
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = p.coach ? "rgba(122,79,34,0.9)" : "rgba(43,38,32,0.72)";
    roundRect(ctx, x - tw / 2, y + 15, tw, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#fff8ec";
    ctx.fillText(label, x, y + 27);
  }

  function wrapText(ctx, text, maxW) {
    const lines = [];
    let line = "";
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines.slice(0, 4);
  }

  function drawBubble(ctx, p, now) {
    if (!p.bubble || p.bubble.until < now) return;
    const x = p.dx, y = p.dy - 44;
    ctx.font = `400 12px ${SANS}`;
    const lines = wrapText(ctx, p.bubble.text, 150);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
    const h = lines.length * 16 + 12;
    const fade = Math.min(1, (p.bubble.until - now) / 400);
    ctx.globalAlpha = fade;
    ctx.fillStyle = p.bubble.zone ? "#fff4dc" : "#fffdf8";
    ctx.strokeStyle = p.coach ? "#b9894f" : "rgba(43,38,32,0.25)";
    ctx.lineWidth = p.coach ? 2 : 1;
    roundRect(ctx, x - w / 2, y - h, w, h, 10);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y - 1); ctx.lineTo(x, y + 7); ctx.lineTo(x + 6, y - 1); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2b2620";
    ctx.textAlign = "center";
    lines.forEach((l, i) => ctx.fillText(l, x, y - h + 19 + i * 16));
    ctx.globalAlpha = 1;
  }

  function drawLantern(ctx, l, t) {
    const bob = Math.sin(t / 700 + l.x) * 2;
    const g = ctx.createRadialGradient(l.x, l.y - 8 + bob, 2, l.x, l.y - 8 + bob, 26);
    g.addColorStop(0, "rgba(255,200,110,0.75)");
    g.addColorStop(1, "rgba(255,200,110,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(l.x, l.y - 8 + bob, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e8783c";
    roundRect(ctx, l.x - 7, l.y - 17 + bob, 14, 17, 6);
    ctx.fill();
    ctx.fillStyle = "#ffd28a";
    ctx.fillRect(l.x - 3, l.y - 13 + bob, 6, 9);
    ctx.fillStyle = "#6b4b2e";
    ctx.fillRect(l.x - 1, l.y + bob, 2, 6);
  }

  function drawRipple(ctx, r, now) {
    const k = (now - r.at) / 1800;
    if (k > 1) return false;
    ctx.strokeStyle = `rgba(242,180,90,${1 - k})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, 20 + k * 160, 0, Math.PI * 2); ctx.stroke();
    return true;
  }

  return { drawStaticMap, drawTree, drawAvatar, drawBubble, drawLantern, drawRipple };
})();
