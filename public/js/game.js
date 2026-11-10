/* 진로산사 메타버스 — 접속, 이동, 채팅, 구역 기능 */
(function () {
  const W = window.SANSA_WORLD;
  const R = window.SansaRender;
  const T = W.T;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  // ---------- 입장 화면 ----------
  const ADJ = ["고요한", "맑은", "느린", "따뜻한", "단단한", "푸른", "조용한", "환한", "깊은", "산뜻한", "포근한", "씩씩한"];
  const NOUN = ["소나무", "은행나무", "풍경", "연꽃", "돌탑", "산새", "구름", "개울", "대나무", "등불", "바람", "다람쥐"];
  const COLORS = ["#8b6a4e", "#5f7f6a", "#6a7896", "#a0604f", "#8d7a3e", "#7d6290"];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const makeNick = () => pick(ADJ) + " " + pick(NOUN);

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("jinro-sansa-mv") || "{}"); } catch (e) { /* 무시 */ }
  $("nickInput").value = saved.nick || makeNick();
  $("roomInput").value = params.get("room") || saved.room || "lobby";
  $("coachField").hidden = !params.has("coach");
  let color = saved.color || pick(COLORS);
  COLORS.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.style.background = c;
    b.setAttribute("aria-label", "옷 색깔 " + c);
    b.setAttribute("aria-pressed", String(c === color));
    b.addEventListener("click", () => {
      color = c;
      document.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-pressed", String(s === b)));
    });
    $("swatches").appendChild(b);
  });
  $("reroll").addEventListener("click", () => ($("nickInput").value = makeNick()));

  // ---------- 상태 ----------
  let ws = null;
  let myId = null;
  let isCoach = false;
  let question = "";
  const players = new Map(); // id -> {id,nick,color,x,y,dx,dy,dir,coach,bubble,moving}
  let lanterns = [];
  const ripples = [];
  let me = null;
  let path = null;
  const keys = new Set();
  let currentZone = null;

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function open(id) { $(id).hidden = false; }
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => (b.closest(".overlay").hidden = true)));

  // ---------- 접속 ----------
  $("enterBtn").addEventListener("click", () => {
    const nick = $("nickInput").value.trim() || makeNick();
    const room = $("roomInput").value.trim() || "lobby";
    try { localStorage.setItem("jinro-sansa-mv", JSON.stringify({ nick, room, color })); } catch (e) { /* 무시 */ }
    $("entryError").textContent = "";
    $("enterBtn").disabled = true;
    initAudio();
    connect({ nick, room, color, coachCode: $("coachInput").value.trim() || undefined });
  });

  function connect(join) {
    ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws");
    ws.onopen = () => ws.send(JSON.stringify(Object.assign({ t: "join" }, join)));
    ws.onmessage = (e) => handle(JSON.parse(e.data));
    ws.onclose = () => {
      if (myId) $("disconnected").hidden = false;
      else { $("entryError").textContent = "서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요."; $("enterBtn").disabled = false; }
    };
  }
  const sendMsg = (m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));

  function addPlayer(p) {
    players.set(p.id, Object.assign({}, p, { dx: p.x, dy: p.y, moving: false, bubble: null }));
    updateCount();
  }
  function updateCount() { $("hudCount").textContent = `👥 ${players.size}명`; }

  function handle(m) {
    switch (m.t) {
      case "error":
        $("entryError").textContent = m.text;
        $("enterBtn").disabled = false;
        break;
      case "welcome":
        myId = m.id; isCoach = m.coach; question = m.question; lanterns = m.lanterns;
        m.players.forEach(addPlayer);
        me = players.get(myId);
        $("entry").hidden = true;
        ["hud", "chat", "actions"].forEach((id) => ($(id).hidden = false));
        $("hudRoom").textContent = "방: " + m.room;
        $("actCoach").hidden = !isCoach;
        setNotice(m.notice);
        addLog({ system: true, text: `${me.nick} 님, 진로산사에 오신 걸 환영해요. 마당을 거닐며 친구들과 이야기해 보세요.` });
        updateZone(true);
        break;
      case "join":
        addPlayer(m.p);
        addLog({ system: true, text: `${m.p.coach ? "🧭 길잡이 " : ""}${m.p.nick} 님이 산문에 들어섰어요.` });
        break;
      case "leave":
        players.delete(m.id);
        updateCount();
        break;
      case "move": {
        const p = players.get(m.id);
        if (p) { p.x = m.x; p.y = m.y; p.dir = m.dir; }
        break;
      }
      case "chat": {
        const p = players.get(m.id);
        if (p) p.bubble = { text: m.text, until: Date.now() + 6000, zone: m.zone };
        addLog(m);
        break;
      }
      case "bell": {
        playBell();
        const bz = W.ZONES.find((z) => z.id === "bell");
        ripples.push({ x: 7 * T, y: 10 * T, at: Date.now() });
        toast(`🔔 ${m.nick} 님이 종을 쳤어요`);
        void bz;
        break;
      }
      case "lantern":
        lanterns.push(m.lantern);
        if (m.lantern.ownerId === myId) toast("돌탑 곁에 내 등불이 켜졌어요 🏮");
        else addLog({ system: true, text: `🏮 ${m.lantern.nick} 님이 생각의 돌탑에 등불을 밝혔어요.` });
        break;
      case "removeLantern":
        lanterns = lanterns.filter((l) => l.id !== m.id);
        break;
      case "notice": setNotice(m.text); break;
      case "question":
        question = m.text;
        if (m.reset) lanterns = [];
        addLog({ system: true, text: `📜 오늘의 질문이 바뀌었어요: ${m.text}` });
        break;
      case "gather":
        $("gatherText").textContent = `🧭 ${m.nick} 님이 법당으로 부르고 있어요`;
        $("gather").hidden = false;
        break;
      case "system": addLog({ system: true, text: m.text }); toast(m.text); break;
      case "care": open("careModal"); break;
    }
  }

  function setNotice(text) {
    $("notice").hidden = !text;
    $("notice").textContent = text ? "📢 " + text : "";
  }

  // ---------- 채팅 ----------
  function addLog(m) {
    const li = document.createElement("li");
    if (m.system) { li.className = "sys"; li.textContent = m.text; }
    else {
      if (m.coach) li.className = "coach";
      if (m.zone) li.classList.add("zone");
      const b = document.createElement("b");
      b.textContent = (m.coach ? "🧭 " : "") + m.nick;
      li.append(b, document.createTextNode(" " + m.text));
    }
    const log = $("chatLog");
    log.appendChild(li);
    while (log.children.length > 60) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  $("chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = $("chatInput").value.trim();
    if (!text) return;
    sendMsg({ t: "chat", text });
    $("chatInput").value = "";
  });
  $("chatToggle").addEventListener("click", () => {
    const opened = $("chat").classList.toggle("open");
    document.body.classList.toggle("chat-open", opened);
  });

  // ---------- 구역 ----------
  function updateZone(force) {
    if (!me) return;
    const z = W.zoneAt(me.x, me.y);
    if (z === currentZone && !force) return;
    currentZone = z;
    const zone = W.ZONES.find((x) => x.id === z);
    $("zoneBanner").hidden = !zone;
    if (zone) { $("zoneName").textContent = zone.name; $("zoneDesc").textContent = zone.desc; }
    $("actBell").hidden = z !== "bell";
    $("actQuestion").hidden = z !== "stupa";
    $("chatScope").textContent = zone && zone.chat === "zone"
      ? `🔒 ${zone.name} 안에 있는 사람들에게만 보여요` : "🌿 마당에 있는 모두에게 보여요";
    $("chat").classList.toggle("private", Boolean(zone && zone.chat === "zone"));
  }
  $("actBell").addEventListener("click", () => sendMsg({ t: "bell" }));
  $("actQuestion").addEventListener("click", () => {
    $("qText").textContent = question;
    $("qInput").value = "";
    open("questionModal");
    setTimeout(() => $("qInput").focus(), 50);
  });
  $("qSubmit").addEventListener("click", () => {
    const text = $("qInput").value.trim();
    if (!text) return toast("한 줄만 적어주세요");
    sendMsg({ t: "answer", text });
    $("questionModal").hidden = true;
  });

  // ---------- 코치 도구 ----------
  $("actCoach").addEventListener("click", () => open("coachModal"));
  $("noticeSend").addEventListener("click", () => { sendMsg({ t: "notice", text: $("noticeInput").value }); toast("공지를 올렸어요"); });
  $("questionSend").addEventListener("click", () => {
    if (!$("questionInput").value.trim()) return;
    sendMsg({ t: "question", text: $("questionInput").value });
    $("questionInput").value = "";
  });
  $("gatherSend").addEventListener("click", () => { sendMsg({ t: "gather" }); $("coachModal").hidden = true; });
  let selectedPlayer = null;
  $("muteBtn").addEventListener("click", () => { sendMsg({ t: "mute", id: selectedPlayer }); $("playerModal").hidden = true; });
  let selectedLantern = null;
  $("lanternRemove").addEventListener("click", () => { sendMsg({ t: "removeLantern", id: selectedLantern }); $("lanternModal").hidden = true; });

  $("gatherGo").addEventListener("click", () => {
    $("gather").hidden = true;
    walkToTile(20 + Math.floor(Math.random() * 5) - 2, 10 + Math.floor(Math.random() * 2));
  });

  // ---------- 소리 ----------
  let audioCtx = null;
  function initAudio() {
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { /* 무시 */ }
  }
  function playBell() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.value = 0.3;
    master.connect(audioCtx.destination);
    [[196, 1, 6], [392.5, 0.5, 4.5], [523, 0.32, 3.5], [784.6, 0.18, 2.5]].forEach(([f, v, d]) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(v, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + d);
      o.connect(g).connect(master);
      o.start(now);
      o.stop(now + d + 0.1);
    });
  }

  // ---------- 입력 ----------
  const KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); path = null; e.preventDefault(); }
    if (e.code === "Enter" && me) { $("chatInput").focus(); e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => keys.delete(KEYMAP[e.code]));
  window.addEventListener("blur", () => keys.clear());

  function walkToTile(tx, ty) {
    if (!me) return;
    const p = W.findPath(Math.floor(me.x / T), Math.floor(me.y / T), tx, ty);
    if (p) path = p.slice(1).map(([x, y]) => [x * T + T / 2, y * T + T / 2]);
  }

  const canvas = $("world");
  const ctx = canvas.getContext("2d");
  let cam = { x: 0, y: 0, z: 1 };
  canvas.addEventListener("pointerdown", (e) => {
    if (!me) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const wx = (e.clientX - innerWidth / 2) / cam.z + cam.x;
    const wy = (e.clientY - innerHeight / 2) / cam.z + cam.y;
    const l = lanterns.find((l) => Math.hypot(l.x - wx, l.y - 10 - wy) < 22);
    if (l) {
      selectedLantern = l.id;
      $("lanternNick").textContent = `${l.nick} 님의 등불`;
      $("lanternText").textContent = l.text;
      $("lanternRemove").hidden = !isCoach;
      return open("lanternModal");
    }
    if (isCoach) {
      const p = [...players.values()].find((p) => p.id !== myId && !p.coach && Math.hypot(p.dx - wx, p.dy - 12 - wy) < 22);
      if (p) { selectedPlayer = p.id; $("playerNick").textContent = p.nick; return open("playerModal"); }
    }
    let tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    if (W.blockedTile(tx, ty)) {
      // 막힌 곳을 누르면 가장 가까운 빈 타일로
      let best = null;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        if (!W.blockedTile(tx + dx, ty + dy) && (!best || Math.hypot(dx, dy) < best[2])) best = [tx + dx, ty + dy, Math.hypot(dx, dy)];
      }
      if (!best) return;
      [tx, ty] = best;
    }
    walkToTile(tx, ty);
  });

  // ---------- 게임 루프 ----------
  const SPEED = 150; // px/초
  let lastSent = 0;
  let lastSentPos = { x: 0, y: 0 };
  let staticMap = null;
  let last = performance.now();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    cam.z = innerWidth < 700
      ? clamp(innerWidth / (12 * T), 0.8, 1.2) // 휴대폰: 가로 약 12칸
      : clamp(Math.min(innerWidth / (30 * T), innerHeight / (20 * T)), 0.8, 1.1); // PC: 더 넓게
  }
  window.addEventListener("resize", resize);
  resize();

  function step(dt) {
    if (!me) return;
    let vx = 0, vy = 0;
    if (keys.has("up")) vy -= 1;
    if (keys.has("down")) vy += 1;
    if (keys.has("left")) vx -= 1;
    if (keys.has("right")) vx += 1;
    if (!vx && !vy && path && path.length) {
      const [px, py] = path[0];
      const dx = px - me.x, dy = py - me.y, d = Math.hypot(dx, dy);
      if (d < 4) path.shift();
      else { vx = dx / d; vy = dy / d; }
    }
    me.moving = Boolean(vx || vy);
    if (me.moving) {
      const len = Math.hypot(vx, vy);
      const sx = (vx / len) * SPEED * dt, sy = (vy / len) * SPEED * dt;
      if (!W.blockedAt(me.x + sx, me.y)) me.x += sx;
      if (!W.blockedAt(me.x, me.y + sy)) me.y += sy;
      me.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? "right" : "left") : (vy > 0 ? "down" : "up");
      me.dx = me.x; me.dy = me.y;
      updateZone();
    }
    const now = performance.now();
    if (now - lastSent > 60 && (Math.abs(me.x - lastSentPos.x) > 0.5 || Math.abs(me.y - lastSentPos.y) > 0.5)) {
      sendMsg({ t: "move", x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, dir: me.dir });
      lastSent = now;
      lastSentPos = { x: me.x, y: me.y };
    }
    // 다른 사람은 부드럽게 따라가기
    players.forEach((p) => {
      if (p.id === myId) return;
      const dx = p.x - p.dx, dy = p.y - p.dy;
      p.moving = Math.hypot(dx, dy) > 1;
      p.dx += dx * Math.min(1, dt * 10);
      p.dy += dy * Math.min(1, dt * 10);
    });
  }

  function draw(t) {
    ctx.fillStyle = "#2b2620";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    if (!staticMap) staticMap = R.drawStaticMap();

    const focus = me || { x: 20 * T, y: 18 * T };
    const halfW = innerWidth / 2 / cam.z, halfH = innerHeight / 2 / cam.z;
    cam.x = Math.max(halfW, Math.min(W.W - halfW, focus.x));
    cam.y = Math.max(halfH - 60, Math.min(W.H - halfH + 120, focus.y));
    if (halfW * 2 > W.W) cam.x = W.W / 2;

    ctx.save();
    ctx.translate(innerWidth / 2, innerHeight / 2);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
    ctx.drawImage(staticMap, 0, 0);

    const now = Date.now();
    for (let i = ripples.length - 1; i >= 0; i--) if (!R.drawRipple(ctx, ripples[i], now)) ripples.splice(i, 1);
    lanterns.forEach((l) => R.drawLantern(ctx, l, t));

    // y 순서로 아바타와 나무를 함께 그려 자연스럽게 겹치게
    const drawables = [];
    players.forEach((p) => drawables.push({ y: p.dy, f: () => R.drawAvatar(ctx, p, t, p.id === myId) }));
    W.BLOCKS.filter((b) => b.kind === "tree").forEach((b) => drawables.push({ y: b.y * T + T, f: () => R.drawTree(ctx, b, t) }));
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.f());
    players.forEach((p) => R.drawBubble(ctx, p, now));

    // 탭 이동 목적지 표시
    if (path && path.length) {
      const [gx, gy] = path[path.length - 1];
      ctx.strokeStyle = "rgba(242,180,90,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gx, gy, 8 + Math.sin(t / 150) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    step(dt);
    draw(t);
    requestAnimationFrame(loop);
  }
  window.SansaGame = { walkToTile }; // 테스트·확장용
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => (staticMap = null));
  requestAnimationFrame(loop);
})();
