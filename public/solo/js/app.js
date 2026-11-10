/* 진로산사 v0.1 — 화면 흐름과 상태 관리
 * 모든 답변은 이 기기의 localStorage에만 저장됩니다. */
(function () {
  const C = window.SANSA_CONTENT;
  const STORE_KEY = "jinro-sansa-v1";
  const TEST_MODE = new URLSearchParams(location.search).has("test");
  const $ = (id) => document.getElementById(id);

  // ---------- 상태 ----------
  const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (로컬)
  function makeNick() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    return pick(C.NICK_ADJ) + " " + pick(C.NICK_NOUN);
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.nick && s.answers) return s;
    } catch (e) { /* 저장소 사용 불가 시 새로 시작 */ }
    return { nick: makeNick(), answers: {}, lastDate: null, createdAt: Date.now() };
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }
  save();

  const doneCount = () => Object.keys(state.answers).length;
  const allDone = () => doneCount() >= C.DAYS.length;
  const nextDay = () => C.DAYS[Math.min(doneCount(), C.DAYS.length - 1)];
  const canAnswerNow = () => !allDone() && (TEST_MODE || state.lastDate !== today());

  // ---------- 화면 전환 ----------
  function go(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === name));
    window.scrollTo({ top: 0, behavior: "smooth" });
    const fn = renderers[name];
    if (fn) fn();
  }
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- 종소리 (Web Audio 합성) ----------
  let audioCtx = null;
  function playBell() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const master = audioCtx.createGain();
      master.gain.value = 0.35;
      master.connect(audioCtx.destination);
      // 범종 느낌의 비정수배 배음
      [[196, 1, 6], [392.5, 0.5, 4.5], [523, 0.32, 3.5], [784.6, 0.18, 2.5], [1046, 0.08, 1.8]].forEach(([f, v, d]) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(v, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + d);
        o.connect(g).connect(master);
        o.start(now);
        o.stop(now + d + 0.1);
      });
    } catch (e) { /* 소리 없이 진행 */ }
  }

  // ---------- 다른 사람의 등불 ----------
  const sky = document.createElement("div");
  sky.className = "sky";
  document.body.appendChild(sky);
  function floatLantern(label) {
    const l = document.createElement("div");
    l.className = "float-lantern";
    l.style.left = 8 + Math.random() * 78 + "%";
    l.innerHTML = '<span class="dot"></span><span class="lbl"></span>';
    l.querySelector(".lbl").textContent = label;
    sky.appendChild(l);
    setTimeout(() => l.remove(), 7000);
  }

  // ---------- 0. 산문 ----------
  function renderGate() {
    $("nick").textContent = state.nick;
    const info = $("gateDayInfo");
    const enter = $("enterBtn");
    $("cardShortcut").hidden = !allDone();
    if (allDone()) {
      info.textContent = "7일의 길을 모두 걸었어요. 🪷";
      enter.textContent = "나의 염주 보기";
    } else if (canAnswerNow()) {
      const d = nextDay();
      info.textContent = `오늘은 ${d.day}일차 · ‘${d.theme}’ 질문이 기다리고 있어요`;
      enter.textContent = "산문 들어서기";
    } else {
      info.textContent = `오늘의 질문은 마쳤어요. 내일 ${nextDay().day}일차 질문이 열려요.`;
      enter.textContent = "나의 염주 보기";
    }
  }
  $("enterBtn").addEventListener("click", () => {
    if (canAnswerNow()) go("breath");
    else go("beads");
  });
  $("cardShortcut").addEventListener("click", () => go("card"));

  // ---------- 1. 숨 고르기 ----------
  let breathTimer = null;
  function renderBreath() {
    const circle = $("breathCircle");
    const text = $("breathText");
    const count = $("breathCount");
    let i = 0;
    clearInterval(breathTimer);
    const phase = () => {
      const cycle = Math.floor(i / 2);
      if (cycle >= 3) {
        clearInterval(breathTimer);
        go("question");
        return;
      }
      const inhale = i % 2 === 0;
      circle.classList.toggle("in", inhale);
      text.textContent = inhale ? "숨을 들이쉬어요" : "천천히 내쉬어요";
      count.textContent = `${cycle + 1} / 3`;
      i++;
    };
    phase();
    breathTimer = setInterval(phase, 3500);
  }
  $("skipBreath").addEventListener("click", () => {
    clearInterval(breathTimer);
    go("question");
  });

  // ---------- 2. 오늘의 질문 ----------
  let picked = [];
  let pending = null;
  function renderQuestion() {
    const d = nextDay();
    picked = [];
    $("qLabel").textContent = `${d.day}일차 · ${d.theme}`;
    $("qText").textContent = d.question;
    $("qHint").textContent = d.hint;
    $("qWrite").value = "";
    $("qWrite").placeholder = d.placeholder;
    const box = $("chips");
    box.innerHTML = "";
    d.chips.forEach(([label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = label;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        const idx = picked.indexOf(label);
        if (idx >= 0) picked.splice(idx, 1);
        else if (picked.length < 3) picked.push(label);
        else return toast("세 개까지만 골라주세요");
        b.setAttribute("aria-pressed", String(picked.includes(label)));
        updateAnswerBtn();
      });
      box.appendChild(b);
    });
    updateAnswerBtn();
  }
  function updateAnswerBtn() {
    $("answerBtn").disabled = picked.length === 0 && $("qWrite").value.trim().length < 2;
  }
  $("qWrite").addEventListener("input", updateAnswerBtn);
  $("answerBtn").addEventListener("click", () => {
    const d = nextDay();
    pending = { day: d.day, chips: picked.slice(), text: $("qWrite").value.trim(), at: Date.now() };
    go("bell");
  });

  // ---------- 3. 종 치기 ----------
  let rung = false;
  function renderBell() {
    rung = false;
    $("bellHint").textContent = "종을 눌러주세요";
    $("lanterns").innerHTML = "";
    $("bellBtn").classList.remove("ring");
  }
  $("bellBtn").addEventListener("click", () => {
    if (rung || !pending) return;
    rung = true;
    playBell();
    const btn = $("bellBtn");
    btn.classList.remove("ring");
    void btn.offsetWidth;
    btn.classList.add("ring");
    if (navigator.vibrate) navigator.vibrate(40);

    state.answers[pending.day] = pending;
    state.lastDate = today();
    save();
    window.SansaRealtime.ringBell(state.nick);

    const lit = document.createElement("div");
    lit.className = "lantern lit";
    $("lanterns").appendChild(lit);
    $("bellHint").textContent = "등불 하나가 켜졌어요";
    setTimeout(() => go("feedback"), 1800);
  });

  // ---------- 4. 길잡이의 한마디 ----------
  function renderFeedback() {
    const a = pending || state.answers[doneCount()];
    if (!a) return go("gate");
    const d = C.DAYS[a.day - 1];
    let chipsText = a.chips.join(", ");
    if (!chipsText) chipsText = a.text.length > 18 ? a.text.slice(0, 18) + "…" : a.text;
    $("fbText").textContent = d.feedback.replace("{chips}", chipsText);
    $("fbAction").textContent = d.action;
    $("crisis").hidden = !C.CRISIS_WORDS.some((w) => a.text.includes(w));
    pending = null;
  }
  $("toBeads").addEventListener("click", () => go("beads"));

  // ---------- 5. 염주 ----------
  function renderBeads() {
    const box = $("beads");
    box.innerHTML = "";
    C.DAYS.forEach((d) => {
      const b = document.createElement("div");
      b.className = "bead" + (state.answers[d.day] ? " on" : "");
      b.innerHTML = `<span class="num">${d.day}</span><span class="th">${d.theme}</span>`;
      box.appendChild(b);
    });
    const n = doneCount();
    const next = $("beadsNext");
    if (allDone()) {
      $("beadsMsg").textContent = "일곱 알의 염주를 모두 꿰었어요. 이제 당신만의 길 카드를 받아보세요.";
      next.textContent = "나의 길 카드 받기";
      next.onclick = () => go("card");
    } else if (canAnswerNow()) {
      $("beadsMsg").textContent = `${n}알을 꿰었어요. ${TEST_MODE ? "테스트 모드라 바로 다음 질문을 볼 수 있어요." : ""}`;
      next.textContent = "다음 질문으로";
      next.onclick = () => go("question");
    } else {
      $("beadsMsg").textContent = `${n}알을 꿰었어요. 생각은 하룻밤 묵혀야 깊어져요. 내일 ${nextDay().day}일차 질문에서 만나요.`;
      next.textContent = "오늘은 여기까지";
      next.onclick = () => go("gate");
    }
    $("reviewBtn").hidden = n === 0;
  }

  // ---------- 6. 지난 생각 ----------
  function renderReview() {
    const ol = $("reviewList");
    ol.innerHTML = "";
    C.DAYS.forEach((d) => {
      const a = state.answers[d.day];
      if (!a) return;
      const li = document.createElement("li");
      const h = document.createElement("strong");
      h.textContent = `${d.day}일차 · ${d.theme}`;
      const p = document.createElement("p");
      p.textContent = [a.chips.join(", "), a.text].filter(Boolean).join(" — ");
      li.append(h, p);
      ol.appendChild(li);
    });
  }

  // ---------- 7. 나의 길 카드 ----------
  function riasecTop() {
    const score = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    C.DAYS.forEach((d) => {
      const a = state.answers[d.day];
      if (!a) return;
      const weight = d.key === "interest" ? 2 : 1; // 흥미 질문에 가중치
      a.chips.forEach((label) => {
        const chip = d.chips.find((c) => c[0] === label);
        if (chip && chip[1]) score[chip[1]] += weight;
      });
    });
    return Object.entries(score).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).slice(0, 2).map(([k]) => k);
  }
  function cardData() {
    const get = (key) => {
      const d = C.DAYS.find((x) => x.key === key);
      const a = state.answers[d.day] || { chips: [], text: "" };
      return { chips: a.chips.join(", "), text: a.text };
    };
    const top = riasecTop();
    return {
      nick: state.nick,
      rows: [
        ["좋아하는 것", get("interest")],
        ["잘하는 것", get("strength")],
        ["소중한 것", get("value")],
        ["힘이 나는 순간", get("energy")],
        ["닮고 싶은 모습", get("rolemodel")],
        ["10년 뒤의 나", get("future")],
        ["나의 첫 걸음", get("step")]
      ],
      types: top.map((k) => C.RIASEC[k])
    };
  }
  function renderCard() {
    const data = cardData();
    const el = $("pathCard");
    el.innerHTML = "";
    const head = document.createElement("div");
    head.className = "pc-head";
    head.innerHTML = '<span class="pc-brand">진로산사 · 나의 길 카드</span><strong class="pc-nick"></strong>';
    head.querySelector(".pc-nick").textContent = data.nick;
    el.appendChild(head);
    const dl = document.createElement("dl");
    data.rows.forEach(([k, v]) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = [v.chips, v.text].filter(Boolean).join(" — ") || "—";
      dl.append(dt, dd);
    });
    el.appendChild(dl);
    if (data.types.length) {
      const t = document.createElement("div");
      t.className = "pc-types";
      data.types.forEach((ty) => {
        const box = document.createElement("div");
        box.className = "pc-type";
        const h = document.createElement("strong");
        h.textContent = ty.name;
        const p = document.createElement("p");
        p.textContent = ty.desc;
        const f = document.createElement("p");
        f.className = "pc-fields";
        f.textContent = "어울리는 분야: " + ty.fields.slice(0, 3).join(" · ");
        const m = document.createElement("p");
        m.className = "pc-fields";
        m.textContent = "살펴볼 학과: " + ty.majors.slice(0, 3).join(" · ");
        box.append(h, p, f, m);
        t.appendChild(box);
      });
      el.appendChild(t);
    }
  }
  function cardText() {
    const d = cardData();
    const lines = [`[진로산사 · 나의 길 카드] ${d.nick}`, ""];
    d.rows.forEach(([k, v]) => lines.push(`${k}: ${[v.chips, v.text].filter(Boolean).join(" — ") || "-"}`));
    if (d.types.length) {
      lines.push("");
      d.types.forEach((t) => lines.push(`${t.name}: ${t.desc} (분야: ${t.fields.slice(0, 3).join(", ")})`));
    }
    return lines.join("\n");
  }
  $("copyCard").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cardText());
      toast("복사했어요. 선생님이나 코치에게 보여주세요.");
    } catch (e) {
      toast("복사에 실패했어요");
    }
  });

  function wrap(ctx, text, maxW) {
    // 어절(띄어쓰기) 단위로 줄바꿈, 한 어절이 너무 길면 글자 단위로 자름
    const out = [];
    let line = "";
    text.split(" ").forEach((word) => {
      const next = line ? line + " " + word : word;
      if (ctx.measureText(next).width <= maxW) { line = next; return; }
      if (line) out.push(line);
      line = "";
      for (const ch of word) {
        if (ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; }
        else line += ch;
      }
    });
    if (line) out.push(line);
    return out;
  }
  $("saveCard").addEventListener("click", async () => {
    const data = cardData();
    try { await document.fonts.ready; } catch (e) { /* 무시 */ }
    const W = 1080, P = 90, maxW = W - P * 2;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const serif = '"Noto Serif KR", serif', sans = '"Noto Sans KR", sans-serif';

    // 높이 계산을 위해 먼저 줄 수를 구함
    const blocks = [];
    ctx.font = `400 34px ${sans}`;
    data.rows.forEach(([k, v]) => {
      blocks.push({ k, lines: wrap(ctx, [v.chips, v.text].filter(Boolean).join(" — ") || "—", maxW) });
    });
    const typeLines = data.types.map((t) => ({ name: t.name, lines: wrap(ctx, `${t.desc}. 분야: ${t.fields.slice(0, 3).join(" · ")}`, maxW - 40) }));
    let H = 330;
    blocks.forEach((b) => (H += 56 + b.lines.length * 48 + 24));
    typeLines.forEach((t) => (H += 70 + t.lines.length * 46 + 30));
    H += 120;
    c.width = W;
    c.height = H;

    ctx.fillStyle = "#f4ede1";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#b9894f";
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, W - 72, H - 72);

    ctx.fillStyle = "#8a6a45";
    ctx.font = `600 32px ${sans}`;
    ctx.fillText("진로산사 · 나의 길 카드", P, 150);
    ctx.fillStyle = "#2d2620";
    ctx.font = `700 64px ${serif}`;
    ctx.fillText(data.nick, P, 240);

    let y = 330;
    blocks.forEach((b) => {
      ctx.fillStyle = "#a0703c";
      ctx.font = `700 30px ${sans}`;
      ctx.fillText(b.k, P, y);
      y += 56;
      ctx.fillStyle = "#2d2620";
      ctx.font = `400 34px ${sans}`;
      b.lines.forEach((ln) => { ctx.fillText(ln, P, y); y += 48; });
      y += 24;
    });
    typeLines.forEach((t) => {
      ctx.fillStyle = "#ead9bf";
      const boxH = 40 + t.lines.length * 46 + 20;
      ctx.fillRect(P - 20, y - 10, maxW + 40, boxH + 20);
      ctx.fillStyle = "#7a4f22";
      ctx.font = `700 36px ${serif}`;
      ctx.fillText(t.name, P, y + 38);
      ctx.fillStyle = "#2d2620";
      ctx.font = `400 30px ${sans}`;
      let yy = y + 88;
      t.lines.forEach((ln) => { ctx.fillText(ln, P + 0, yy); yy += 46; });
      y += boxH + 50;
    });
    ctx.fillStyle = "#8a7a68";
    ctx.font = `400 26px ${sans}`;
    ctx.fillText("참고용 제안이에요 · 커리어넷 진로검사로 더 알아보기", P, H - 80);

    c.toBlob((blob) => {
      if (!blob) return toast("저장에 실패했어요");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "나의길카드.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast("카드를 저장했어요");
    }, "image/png");
  });

  // ---------- 기타 ----------
  $("resetBtn").addEventListener("click", () => {
    if (!confirm("지금까지의 답변이 모두 지워져요. 처음부터 다시 할까요?")) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* 무시 */ }
    state = load();
    save();
    go("gate");
  });

  const renderers = {
    gate: renderGate, breath: renderBreath, question: renderQuestion, bell: renderBell,
    feedback: renderFeedback, beads: renderBeads, review: renderReview, card: renderCard
  };

  // 실시간 연결
  const presence = $("presence");
  presence.textContent = "혼자 조용히 걷는 중";
  $("modeNote").textContent = TEST_MODE ? "테스트 모드 · 하루 제한 없음" : "답변은 이 기기에만 저장돼요";
  window.SansaRealtime.connect(state.nick, {
    count: (n) => { presence.textContent = `지금 ${n}명이 함께 생각하는 중`; },
    bell: (p) => floatLantern((p.nick || "누군가") + " 님이 종을 쳤어요")
  });

  renderGate();
})();
