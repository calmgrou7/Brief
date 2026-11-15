
(() => {
"use strict";

/* ───────────── Breathing patterns (reviewed) ───────────── */
const PATTERNS = [
  {
    id: "lava", ko: "용암 호흡", en: "Lava Breath", rhythm: "8 · 8", accent: "#ff6a3d", shape: "volcano", mins: 3,
    origin: "사마 브리티 · 동일 호흡",
    phases: [{ t: "in", d: 8 }, { t: "out", d: 8 }],
    effect: "들숨과 날숨을 같은 길이로 맞춰 들끓는 감정을 고르게 가라앉힙니다. 분당 3.75회의 아주 느린 호흡이에요.",
    how: "코로 8초 들이쉬어 용암을 끌어올리고, 코로 8초 내쉬며 식힙니다. 8초가 길면 공명 호흡부터 시작하세요.",
    evidence: "요가의 사마 브리티(Sama Vritti) 프라나야마. 분당 6회 이하의 느린 호흡은 부교감 신경 활성, 심박변이도 증가와 연관됩니다.",
    caution: "8초 호흡은 초보자에게 길 수 있어요. 숨이 모자라면 억지로 채우지 말고 편한 만큼만 쉬세요.",
    captions: [
      ["끓어오르던 마음이 천천히 식어 가요", "The heat inside begins to cool"],
      ["숨마다 열기가 땅으로 내려가요", "Each breath sends the heat into the ground"],
      ["어깨와 턱의 힘을 풀어요", "Let your jaw and shoulders soften"],
      ["식은 바위처럼 단단하고 고요하게", "Steady and still, like cooled stone"]
    ]
  },
  {
    id: "box", ko: "박스 호흡", en: "Box Breathing", rhythm: "4 · 4 · 4 · 4", accent: "#f2c46b", shape: "box", mins: 3,
    origin: "쿰바카를 더한 사각 호흡",
    phases: [{ t: "in", d: 4 }, { t: "hold", d: 4 }, { t: "out", d: 4 }, { t: "holdOut", d: 4 }],
    effect: "네 단계를 같은 길이로 반복해 긴장된 몸을 진정시키고 집중을 되찾아 줍니다. 발표나 중요한 통화 직전에 좋아요.",
    how: "빛이 사각형의 한 변을 지날 때마다 들이쉬기 → 멈추기 → 내쉬기 → 멈추기를 4초씩 이어갑니다.",
    evidence: "미 해군 특수부대 등에서 압박 상황의 긴장 조절에 가르치는 방법. 요가의 숨 멈춤(쿰바카)을 포함한 사마 브리티 변형입니다.",
    caution: "고혈압이 있거나 임신 중이라면 멈춤을 2초로 줄이거나 생략하세요.",
    captions: [
      ["네 변을 따라 숨을 옮겨요", "Carry your breath around four sides"],
      ["멈춤 속에서 생각도 잠시 멈춰요", "In the pause, thoughts pause too"],
      ["일정한 박자가 집중을 되찾아줘요", "A steady beat brings focus back"]
    ]
  },
  {
    id: "478", ko: "달빛 4-7-8", en: "4-7-8 Moon Breath", rhythm: "4 · 7 · 8", accent: "#f1dca0", shape: "moon", mode: "minor", mins: 1, minCycles: 4, maxCycles: 8,
    origin: "잠들기 전 이완 호흡",
    phases: [
      { t: "in", d: 4 },
      { t: "hold", d: 7 },
      { t: "out", d: 8, ko: "입으로 내쉬기", en: "Out through the mouth", voice: "입으로 후, 내쉬세요" }
    ],
    effect: "날숨을 들숨의 두 배로 길게 내쉬어 몸을 이완 모드로 바꿉니다. 잠자리에 누워서 하기 좋아요.",
    how: "혀끝을 윗니 뒤 잇몸에 대고, 코로 4초 들이쉬고 7초 멈춘 뒤, 입으로 '후—' 소리를 내며 8초 내쉽니다.",
    evidence: "앤드루 와일 박사가 프라나야마를 바탕으로 정리한 방법. 처음에는 한 번에 4회, 익숙해지면 8회까지 권장합니다.",
    caution: "처음 한 달은 4회(약 1분)까지만 하세요. 숨 멈춤 때문에 어지러울 수 있으니 앉거나 누워서 합니다.",
    captions: [
      ["차오르는 달처럼 천천히 채워요", "Fill slowly, like the rising moon"],
      ["오늘의 생각은 오늘에 두고 가요", "Leave today's thoughts with today"],
      ["몸이 이불 속으로 가라앉아요", "Let your body sink into the bed"]
    ]
  },
  {
    id: "coherent", ko: "공명 호흡", en: "Resonance Breath", rhythm: "5.5 · 5.5", accent: "#6aaeff", shape: "wave", mins: 5,
    origin: "심박변이도 · 분당 5.5회",
    phases: [{ t: "in", d: 5.5 }, { t: "out", d: 5.5 }],
    effect: "분당 약 5.5회의 리듬으로 심장 박동과 호흡이 같은 파도를 타게 합니다. 매일 5분 습관용으로 가장 무난해요.",
    how: "파도가 차오르면 코로 5.5초 들이쉬고, 빠져나가면 코로 5.5초 내쉽니다. 멈춤 없이 부드럽게 이어갑니다.",
    evidence: "분당 약 6회 호흡이 심박변이도(HRV)를 최대로 끌어올리는 공명 주파수라는 연구(Lehrer 등)에 기반합니다.",
    caution: "숨을 크게 쉬려 애쓰지 마세요. 과호흡 느낌이 들면 호흡량을 줄이고 길이만 유지합니다.",
    captions: [
      ["밀물처럼 들어오고 썰물처럼 나가요", "In with the tide, out with the tide"],
      ["심장과 호흡이 같은 박자를 찾아요", "Heart and breath find one rhythm"],
      ["애쓰지 말고 흐름에 맡겨요", "No effort, just follow the wave"]
    ]
  },
  {
    id: "sigh", ko: "한숨 호흡", en: "Cyclic Sighing", rhythm: "3 + 1 · 6", accent: "#ff8fa3", shape: "lungs", mins: 5,
    origin: "주기적 생리적 한숨",
    phases: [
      { t: "in", d: 3, to: 0.78, ko: "코로 깊게", en: "Deep in through the nose", voice: "코로 깊게 들이쉬세요" },
      { t: "in", d: 1, from: 0.78, to: 1, ko: "한 번 더", en: "One more sip", voice: "한 번 더" },
      { t: "out", d: 6, ko: "입으로 길게", en: "Long sigh out", voice: "입으로 길게 내쉬세요" }
    ],
    effect: "두 번 나눠 들이쉬고 길게 내쉬어 폐 속 공기를 시원하게 비웁니다. 긴장될 때 1~3회만 해도 빠르게 진정돼요.",
    how: "코로 깊게 들이쉬고, 가득 찬 상태에서 코로 짧게 한 번 더 들이쉰 뒤, 입으로 길게 내쉽니다.",
    evidence: "스탠퍼드 연구(Balban 외, 2023, Cell Reports Medicine)에서 하루 5분 주기적 한숨이 마음챙김 명상보다 기분 개선 효과가 컸습니다.",
    caution: "두 번째 들숨은 짧고 가볍게. 억지로 밀어 넣지 마세요.",
    captions: [
      ["가득 채우고, 시원하게 비워요", "Fill all the way, then let it go"],
      ["한숨과 함께 긴장이 빠져나가요", "Tension leaves with every sigh"],
      ["가슴이 넓어지고 가벼워져요", "Your chest feels wide and light"]
    ]
  },
  {
    id: "nadi", ko: "교호 호흡", en: "Nadi Shodhana", rhythm: "좌 4 · 우 6", accent: "#b9a6ff", shape: "nadi", mins: 3,
    origin: "하타 요가 · 좌우 콧구멍 교대",
    phases: [
      { t: "in", d: 4, side: "L", ko: "왼쪽으로 들이쉬기", en: "In through the left", voice: "왼쪽으로 들이쉬세요" },
      { t: "out", d: 6, side: "R", ko: "오른쪽으로 내쉬기", en: "Out through the right", voice: "오른쪽으로 내쉬세요" },
      { t: "in", d: 4, side: "R", ko: "오른쪽으로 들이쉬기", en: "In through the right", voice: "오른쪽으로 들이쉬세요" },
      { t: "out", d: 6, side: "L", ko: "왼쪽으로 내쉬기", en: "Out through the left", voice: "왼쪽으로 내쉬세요" }
    ],
    effect: "좌우 콧구멍을 번갈아 쓰며 호흡의 균형을 맞춥니다. 머리가 복잡할 때, 명상 전에 마음을 정돈하기 좋아요.",
    how: "오른손 엄지로 오른쪽, 약지로 왼쪽 콧구멍을 번갈아 막습니다. 화면에서 빛나는 쪽으로 숨을 쉬세요.",
    evidence: "하타 요가의 전통 프라나야마. 소규모 연구들에서 혈압과 불안 감소, 주의력 향상과의 연관이 보고됐습니다.",
    caution: "코가 막혀 있다면 무리하지 말고 공명 호흡으로 바꾸세요.",
    captions: [
      ["왼쪽은 달, 오른쪽은 해", "Left is the moon, right is the sun"],
      ["두 숨이 가운데서 만나요", "Two breaths meet in the middle"],
      ["복잡한 생각이 한 줄로 정리돼요", "Scattered thoughts fall into line"]
    ]
  }
];

const LABEL = {
  in: ["들이쉬기", "Breathe in", "들이쉬세요"],
  hold: ["멈추기", "Hold", "멈추세요"],
  out: ["내쉬기", "Breathe out", "내쉬세요"],
  holdOut: ["비우고 멈추기", "Hold empty", "비우고 멈추세요"]
};
const NATIVE = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

/* ───────────── Settings & storage ───────────── */
const store = {
  get(k, d) { try { const v = localStorage.getItem("breath." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("breath." + k, JSON.stringify(v)); } catch (e) {} }
};
const settings = Object.assign({ voice: true, count: true, sound: true, vibe: false }, store.get("settings", {}));
let current = PATTERNS.find(p => p.id === store.get("pattern", "lava")) || PATTERNS[0];
const minsBy = store.get("mins", {});

/* ───────────── DOM ───────────── */
const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");
const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────────── Particles ───────────── */
let W = 0, H = 0, DPR = 1;
const N = Math.min(2600, Math.round((innerWidth * innerHeight) / 230) + 900);
const px = new Float32Array(N), py = new Float32Array(N);
const ax = new Float32Array(N), ay = new Float32Array(N);
const kk = new Float32Array(N), seed = new Float32Array(N);
const band = new Uint8Array(N), side = new Uint8Array(N);
const DUST = 170;
const dx = new Float32Array(DUST), dy = new Float32Array(DUST), dv = new Float32Array(DUST), dp = new Float32Array(DUST);
const SPARK = 140;
const sx = new Float32Array(SPARK), sy = new Float32Array(SPARK), svx = new Float32Array(SPARK), svy = new Float32Array(SPARK), sl = new Float32Array(SPARK);
let sparkHead = 0;

const R = Math.random;
const gauss = () => (R() + R() + R() - 1.5) / 1.5;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const fill = (k, L) => L <= 0.002 ? 0 : clamp01((L * 1.06 - k) / 0.06);

const SHAPES = {
  volcano: {
    lit: [[214, 52, 24], [255, 92, 36], [255, 145, 52], [255, 208, 112]],
    dim: [[120, 30, 14], [132, 36, 16], [140, 42, 18], [150, 52, 20]],
    glow: [255, 90, 40], emit: true,
    init(i) {
      const hw = h => 0.11 + 0.89 * Math.pow(1 - h, 2.6);
      let x, h; do { x = R() * 2 - 1; h = R(); } while (Math.abs(x) > hw(h));
      ax[i] = x; ay[i] = 0.75 - h * 1.5; kk[i] = h; band[i] = Math.min(3, (h * 4) | 0);
    },
    b(i, s) { return fill(kk[i], s.L); }
  },
  box: {
    lit: [[255, 214, 140], [255, 226, 166], [255, 238, 200], [200, 170, 110]],
    dim: [[60, 46, 22], [66, 52, 26], [72, 58, 30], [26, 22, 14]],
    glow: [242, 196, 107],
    init(i) {
      if (i % 10 < 7) {
        const u = R(), e = 0.7, q = (u % 0.25) / 0.25;
        let x, y;
        if (u < 0.25) { x = -e; y = e - q * 2 * e; }
        else if (u < 0.5) { x = -e + q * 2 * e; y = -e; }
        else if (u < 0.75) { x = e; y = -e + q * 2 * e; }
        else { x = e - q * 2 * e; y = e; }
        ax[i] = x + gauss() * 0.028; ay[i] = y + gauss() * 0.028; kk[i] = u; band[i] = Math.min(2, (u * 3) | 0);
      } else {
        ax[i] = (R() * 2 - 1) * 0.62; ay[i] = (R() * 2 - 1) * 0.62; kk[i] = -1; band[i] = 3;
      }
    },
    b(i, s) {
      if (kk[i] < 0) return 0.08 + 0.35 * s.L;
      const d = ((s.cyc - kk[i]) % 1 + 1) % 1;
      return d < 0.015 ? 1 : Math.pow(Math.max(0, 1 - d / 0.85), 1.6);
    }
  },
  moon: {
    lit: [[255, 240, 200], [250, 228, 176], [238, 214, 150], [176, 168, 232]],
    dim: [[44, 44, 72], [40, 40, 68], [36, 36, 62], [24, 22, 50]],
    glow: [235, 220, 170],
    init(i) {
      if (i % 9 === 0) {
        const r = 0.84 + R() * 0.22, a = R() * Math.PI * 2;
        ax[i] = Math.cos(a) * r; ay[i] = Math.sin(a) * r; kk[i] = -1; band[i] = 3;
      } else {
        const r = 0.78 * Math.sqrt(R()), a = R() * Math.PI * 2;
        ax[i] = Math.cos(a) * r; ay[i] = Math.sin(a) * r; kk[i] = r / 0.78; band[i] = Math.min(2, (kk[i] * 3) | 0);
      }
    },
    b(i, s) {
      if (kk[i] < 0) return 0.25 * s.L;
      const xn = ax[i] / 0.78, yn = ay[i] / 0.78;
      const edge = (1 - 2 * s.L) * Math.sqrt(Math.max(0, 1 - yn * yn));
      return s.L <= 0.002 ? 0 : clamp01((xn - edge) / 0.07 + 0.5);
    }
  },
  wave: {
    lit: [[80, 170, 255], [110, 200, 255], [160, 228, 255], [90, 140, 240]],
    dim: [[16, 36, 72], [18, 42, 80], [22, 50, 88], [16, 30, 66]],
    glow: [90, 160, 255], dynamic: true,
    init(i) {
      const j = i % 5; side[i] = j; ax[i] = R() * 2.2 - 1.1; ay[i] = gauss() * 0.022; kk[i] = Math.abs(ax[i]) / 1.1;
      band[i] = j === 2 ? 2 : j % 2 ? 1 : (j === 0 ? 3 : 0);
    },
    pos(i, s) {
      const j = side[i], x = ax[i];
      const A = 0.06 + 0.3 * s.L;
      return (j - 2) * 0.14 + ay[i] - 0.18 * s.L + A * Math.sin(x * 2.6 + s.t * 0.8 + j * 0.6) * (1 - 0.35 * kk[i]);
    },
    b(i, s) { return 0.12 + 0.88 * s.L * (1 - 0.45 * kk[i]); }
  },
  lungs: {
    lit: [[255, 132, 152], [255, 168, 180], [255, 206, 202], [255, 232, 224]],
    dim: [[72, 24, 38], [78, 30, 44], [84, 36, 48], [90, 44, 52]],
    glow: [255, 130, 160],
    init(i) {
      if (i % 9 === 0) {
        const u = R();
        if (u < 0.5) { ax[i] = gauss() * 0.025; ay[i] = -0.88 + R() * 0.56; }
        else { const q = R(), sgn = u < 0.75 ? -1 : 1; ax[i] = sgn * q * 0.3 + gauss() * 0.02; ay[i] = -0.32 + q * 0.22 + gauss() * 0.02; }
        kk[i] = 0; band[i] = 3;
      } else {
        let x, y, ok;
        do {
          x = R() * 1.7 - 0.85; y = R() * 1.3 - 0.55;
          const cx = x < 0 ? -0.43 : 0.43;
          ok = ((x - cx) / 0.38) ** 2 + ((y - 0.15) / 0.6) ** 2 < 1 && Math.abs(x) > 0.08;
        } while (!ok);
        ax[i] = x; ay[i] = y; kk[i] = clamp01((0.75 - y) / 1.3); band[i] = Math.min(2, (kk[i] * 3) | 0);
      }
    },
    b(i, s) { return fill(kk[i], s.L); }
  },
  nadi: {
    lit: [[170, 196, 255], [214, 226, 255], [255, 190, 96], [255, 222, 146]],
    dim: [[30, 38, 80], [34, 42, 86], [80, 50, 22], [86, 56, 26]],
    glow: [185, 166, 255],
    init(i) {
      const t = R() * Math.PI * 2, den = 1 + Math.sin(t) ** 2;
      const x = Math.cos(t) / den * 0.98, y = Math.sin(t) * Math.cos(t) / den * 0.98;
      ax[i] = x + gauss() * 0.05; ay[i] = y + gauss() * 0.05;
      side[i] = ax[i] < 0 ? 0 : 1;
      kk[i] = clamp01((0.38 - ay[i]) / 0.76);
      band[i] = side[i] * 2 + (kk[i] > 0.5 ? 1 : 0);
    },
    b(i, s) {
      const ph = s.ph, mine = side[i] === 0 ? "L" : "R";
      if (!ph || !ph.side) return 0.12;
      if (ph.t === "in") return mine === ph.side ? fill(kk[i], s.L) : 0;
      if (mine === ph.inSide) return fill(kk[i], s.L);
      if (mine === ph.side) return Math.max(0, 1 - Math.abs(kk[i] - s.L) / 0.14);
      return 0;
    }
  }
};

let shape = SHAPES[current.shape];
let palette = [];
function buildPalette(sh) {
  palette = [];
  for (let bnd = 0; bnd < 4; bnd++) for (let l = 0; l < 12; l++) {
    const f = l / 11, a = sh.lit[bnd], d = sh.dim[bnd];
    const c = [0, 1, 2].map(j => Math.round(d[j] + (a[j] - d[j]) * f));
    palette.push(`rgba(${c[0]},${c[1]},${c[2]},${(0.42 + 0.58 * f).toFixed(3)})`);
  }
}
function setShape(name) {
  shape = SHAPES[name];
  for (let i = 0; i < N; i++) { seed[i] = R(); shape.init(i); }
  buildPalette(shape);
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  layoutTarget();
}

/* where the shape sits: between the phase text and whatever is docked at the bottom */
let view = { cx: 0, cy: 0, S: 1 }, viewT = { cx: 0, cy: 0, S: 1 }, viewInit = false;
function layoutTarget() {
  const top = $("phase").getBoundingClientRect().bottom + 8;
  const dockEl = running() ? $("caption") : ([$("welcomeCard"), $("askCard"), $("resultCard"), $("panel")].find(el => !el.hidden) || $("panel"));
  let bottom = dockEl.hidden ? H - 120 : dockEl.getBoundingClientRect().top - 10;
  if (bottom - top < 120) bottom = top + 120;
  viewT.cx = W / 2;
  viewT.cy = (top + bottom) / 2;
  viewT.S = Math.max(40, Math.min(W * 0.42, (bottom - top) * 0.5));
  if (!viewInit) { view = { ...viewT }; viewInit = true; for (let i = 0; i < N; i++) { px[i] = view.cx + (R() - 0.5) * W; py[i] = view.cy + (R() - 0.5) * H; } }
}

for (let i = 0; i < DUST; i++) { dx[i] = R(); dy[i] = R(); dv[i] = 0.00005 + R() * 0.00018; dp[i] = R() * 6.28; }

/* ───────────── Sequence & timing ───────────── */
function decorate(phases) {
  let level = 0, inSide = null;
  return phases.map((p, ci) => {
    const q = Object.assign({}, p, { ci, n: phases.length });
    if (q.t === "in") { q.from = p.from ?? 0; q.to = p.to ?? 1; inSide = p.side || inSide; }
    else if (q.t === "out") { q.from = p.from ?? 1; q.to = 0; q.inSide = inSide; }
    else { q.from = q.to = level; q.inSide = inSide; }
    level = q.to;
    return q;
  });
}
const cycleDur = p => p.phases.reduce((a, b) => a + b.d, 0);
const cyclesFor = (p, m) => Math.min(p.maxCycles || 999, Math.max(p.minCycles || 1, Math.round((m * 60) / cycleDur(p))));

let run = null;          // active session
let idleClock = 0;       // preview animation clock
let lastT = performance.now();
const running = () => !!run;

function buildRun(p, m) {
  const ph = decorate(p.phases), cycles = cyclesFor(p, m);
  const seq = [{ t: "ready", d: 4, from: 0.15, to: 0.15 }];
  for (let c = 0; c < cycles; c++) for (const q of ph) seq.push(Object.assign({ cycle: c }, q));
  let acc = 0; for (const q of seq) { q.at = acc; acc += q.d; }
  return { p, seq, total: acc, cycles, elapsed: 0, idx: -1, lastCount: 0, paused: false, breathTotal: acc - 4 };
}

function phaseAt(seq, e) {
  for (let i = seq.length - 1; i >= 0; i--) if (e >= seq[i].at) return i;
  return 0;
}
const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * x);

/* idle preview: loop the pattern silently so the shape shows how it moves */
let idleSeq = decorate(current.phases);
function idleState(dt) {
  idleClock += dt;
  const cd = cycleDur(current), e = idleClock % cd;
  let acc = 0;
  for (const q of idleSeq) { if (e < acc + q.d) { const p = (e - acc) / q.d; return { ph: q, p, L: q.from + (q.to - q.from) * ease(p), cyc: (q.ci + p) / q.n }; } acc += q.d; }
  return { ph: idleSeq[0], p: 0, L: 0, cyc: 0 };
}

/* ───────────── Audio: voice, chime, breath noise ───────────── */
let voices = [], koVoice = null;
function loadVoices() {
  if (!("speechSynthesis" in window)) { $("voiceNote").textContent = "이 브라우저는 음성 안내를 지원하지 않아 종소리로 안내합니다."; return; }
  voices = speechSynthesis.getVoices();
  koVoice = voices.find(v => /^ko/i.test(v.lang) && /google|yuna|heami|sun-hi|natural/i.test(v.name)) || voices.find(v => /^ko/i.test(v.lang)) || null;
  $("voiceNote").textContent = koVoice ? `음성: ${koVoice.name}` : (voices.length ? "이 기기에서 한국어 음성을 찾지 못했어요. 기기 설정 > 텍스트 음성 변환에서 한국어를 추가하면 더 자연스럽습니다." : "");
}
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

function speak(text, rate) {
  if (!settings.voice || !("speechSynthesis" in window) || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR"; if (koVoice) u.voice = koVoice;
    u.rate = rate || 0.92; u.pitch = 0.95; u.volume = 1;
    speechSynthesis.speak(u);
  } catch (e) {}
}

/* Music: a slow chord progression that changes with each breath cycle,
   a soft pentatonic bell melody that rises on the inhale and falls on the exhale,
   all through a long reverb and a gentle echo. Plus a quiet breath-like noise. */
const MIDI = m => 440 * Math.pow(2, (m - 69) / 12);
const KEY = { lava: 50, box: 53, "478": 45, coherent: 48, sigh: 52, nadi: 55 };
const PROG = {
  major: [[0, 4, 7, 11, 14], [-3, 0, 4, 7, 12], [-7, -3, 0, 4, 9], [-5, -1, 2, 7, 9]],   // Imaj9 · vi7 · IVmaj7 · V6sus
  minor: [[0, 3, 7, 10, 14], [-4, 0, 3, 7, 12], [-7, -4, 0, 3, 10], [-2, 2, 5, 9, 12]]   // im9 · VImaj7 · iv7 · VII
};
const SCALE = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10] };

let ac = null, noiseGain = null, noiseFilter = null;
const music = {
  ready: false, root: 50, mode: "major", chordIdx: 0, voices: [], nextBell: 0, lastChordAt: 0, lastNote: 2,
  build() {
    this.out = ac.createGain(); this.out.gain.value = 0;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
    this.out.connect(comp).connect(ac.destination);
    // generated reverb impulse
    const sec = 4, len = ac.sampleRate * sec, imp = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.rev = ac.createConvolver(); this.rev.buffer = imp;
    const wet = ac.createGain(); wet.gain.value = 0.7; this.rev.connect(wet).connect(this.out);
    this.dry = ac.createGain(); this.dry.gain.value = 0.8; this.dry.connect(this.out);
    this.delay = ac.createDelay(2); this.delay.delayTime.value = 0.62;
    const fb = ac.createGain(); fb.gain.value = 0.2; const dg = ac.createGain(); dg.gain.value = 0.18;
    this.delay.connect(fb).connect(this.delay); this.delay.connect(dg); dg.connect(this.rev); dg.connect(this.dry);
    this.padFilter = ac.createBiquadFilter(); this.padFilter.type = "lowpass"; this.padFilter.frequency.value = 600; this.padFilter.Q.value = 0.5;
    this.padFilter.connect(this.dry); this.padFilter.connect(this.rev);
    this.ready = true;
  },
  setKey(p) {
    this.root = KEY[p.id] || 50; this.mode = p.mode || "major";
    if (this.ready) this.chord(0);
  },
  tones() { return PROG[this.mode][this.chordIdx % 4]; },
  chord(i) {
    if (!this.ready) return;
    const t = ac.currentTime;
    this.voices.forEach(v => { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.setTargetAtTime(0, t, 1.6); v.o.forEach(o => o.stop(t + 12)); });
    this.voices = [];
    this.chordIdx = i % 4; this.lastChordAt = t;
    const tones = this.tones();
    tones.forEach((off, j) => {
      const f = MIDI(this.root + 12 + off), g = ac.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(j === 0 ? 0.03 : 0.022, t + 3);
      const o = [-6, 6].map(c => { const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f; o.detune.value = c; o.connect(g); o.start(t); return o; });
      g.connect(this.padFilter); this.voices.push({ g, o });
    });
    const bg = ac.createGain(), bo = ac.createOscillator();
    bo.type = "sine"; bo.frequency.value = MIDI(this.root + tones[0] - (tones[0] < -4 ? 0 : 12));
    bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.05, t + 3);
    bo.connect(bg).connect(this.dry); bo.start(t); this.voices.push({ g: bg, o: [bo] });
  },
  bell(midi, vel) {
    if (!this.ready || !settings.sound) return;
    const t = ac.currentTime, f = MIDI(midi), g = ac.createGain(), peak = 0.032 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.45);          // slow swell, no attack click
    g.gain.setTargetAtTime(0, t + 0.6, 1.3);                  // long smooth fade
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = Math.min(1600, f * 2.2); lp.Q.value = 0.3;
    const o1 = ac.createOscillator(); o1.type = "sine"; o1.frequency.value = f;
    const o2 = ac.createOscillator(); o2.type = "sine"; o2.frequency.value = f; o2.detune.value = 7;   // gentle chorus, no bright overtone
    const g2 = ac.createGain(); g2.gain.value = 0.5;
    o1.connect(lp); o2.connect(g2).connect(lp); lp.connect(g);
    g.connect(this.dry); g.connect(this.delay); g.connect(this.rev);
    o1.start(t); o2.start(t); o1.stop(t + 9); o2.stop(t + 9);
  },
  // melody notes: pentatonic, two octaves above root, stepping up on inhale and down on exhale
  melodyNote(dir) {
    const sc = SCALE[this.mode], span = sc.length * 2;
    let n = this.lastNote + dir * (1 + (R() < 0.3 ? 1 : 0));
    if (R() < 0.15) n -= dir;
    n = Math.max(0, Math.min(span - 1, n)); this.lastNote = n;
    return this.root + 12 + sc[n % sc.length] + 12 * Math.floor(n / sc.length);
  },
  phaseBell(type) {
    const tones = this.tones();
    const off = type === "in" ? tones[2] : type === "out" ? tones[0] : tones[1];
    this.bell(this.root + 12 + off, 1.1);
  },
  tick(s) {
    if (!this.ready) return;
    const t = ac.currentTime;
    const active = settings.sound && !(run && run.paused);
    this.out.gain.setTargetAtTime(active ? (run ? 0.9 : 0.6) : 0, t, 0.8);
    this.padFilter.frequency.setTargetAtTime(420 + 1500 * s.L, t, 0.4);
    if (!run && t - this.lastChordAt > 9) this.chord(this.chordIdx + 1);
    if (active && t > this.nextBell) {
      const dir = s.ph && s.ph.t === "in" ? 1 : s.ph && s.ph.t === "out" ? -1 : (R() < 0.5 ? 1 : -1);
      this.bell(this.melodyNote(dir), 0.45 + R() * 0.3);
      this.nextBell = t + (run ? 1.8 + R() * 2.2 : 2.6 + R() * 2.8) * (R() < 0.2 ? 1.6 : 1);
    }
  }
};

function ensureAudio() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (R() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    noiseFilter = ac.createBiquadFilter(); noiseFilter.type = "lowpass"; noiseFilter.frequency.value = 400; noiseFilter.Q.value = 0.6;
    noiseGain = ac.createGain(); noiseGain.gain.value = 0;
    src.connect(noiseFilter).connect(noiseGain).connect(ac.destination); src.start();
    music.build(); music.setKey(current);
  } catch (e) { ac = null; }
}
function chime(type) { if (ac && settings.sound) music.phaseBell(type); }
function audioFrame(s) {
  if (!ac) return;
  const on = settings.sound && run && !run.paused;
  const t = ac.currentTime;
  let ng = 0;
  if (on && s.ph && (s.ph.t === "in" || s.ph.t === "out")) ng = 0.025 + 0.05 * Math.sin(Math.PI * s.p);
  noiseGain.gain.setTargetAtTime(ng, t, 0.15);
  noiseFilter.frequency.setTargetAtTime(260 + 900 * s.L, t, 0.2);
  music.tick(s);
}
function vibrate(ms) { if (settings.vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

let wake = null;
async function keepAwake(on) {
  try {
    if (on && "wakeLock" in navigator) wake = await navigator.wakeLock.request("screen");
    else if (wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}

/* ───────────── UI rendering ───────────── */
function fmtSec(d) { return (Number.isInteger(d) ? d : d.toFixed(1)) + "초"; }
function fmtClock(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

/* 앱 셸(app.js)이 window.SG 로 로그인·이용권·이용량을 알려 줍니다. */
const isLocked = id => !!(window.SG && window.SG.isLocked(id));
const maxMinutes = () => (window.SG ? window.SG.maxMinutes() : 99);
function renderChips() {
  $("chips").innerHTML = PATTERNS.map(p => `<button class="chip${isLocked(p.id) ? " is-locked" : ""}" data-id="${p.id}" aria-pressed="${p.id === current.id}"><b>${p.ko}${isLocked(p.id) ? '<i class="lock" aria-label="프리미엄">PRO</i>' : ""}</b><span>${p.rhythm}</span></button>`).join("");
}
function renderInfo() {
  document.documentElement.style.setProperty("--accent", current.accent);
  $("origin").textContent = current.origin;
  $("effect").textContent = current.effect;
  $("how").textContent = current.how;
  $("evidence").textContent = current.evidence;
  $("caution").textContent = current.caution;
  const m = minsBy[current.id] || current.mins;
  document.querySelectorAll("#mins button").forEach(b => {
    b.setAttribute("aria-pressed", String(+b.dataset.m === m));
    b.classList.toggle("locked", +b.dataset.m > maxMinutes());
  });
  const needPro = isLocked(current.id) || m > maxMinutes();
  $("start").textContent = needPro ? "프리미엄으로 열기" : "시작하기";
  $("recoStart").textContent = needPro ? "프리미엄으로 열기" : "이 호흡 시작하기";
  const c = cyclesFor(current, m);
  $("cycles").textContent = `${c}회 호흡 · ${fmtClock(c * cycleDur(current))}` + (current.maxCycles && c === current.maxCycles ? " (최대 권장)" : "");
  if (!run && screen === "home") setPhaseText(current.ko, current.en, current.rhythm, null, true);
}
function setPhaseText(ko, en, count, color, small) {
  $("phKo").textContent = ko; $("phEn").textContent = en;
  const c = $("phCount"); c.textContent = count; c.classList.toggle("small", !!small);
  $("phase").style.setProperty("--phase-color", color || "var(--accent)");
}
function phaseColor(t) { return t === "out" ? "var(--exhale)" : t === "hold" || t === "holdOut" ? "var(--hold)" : t === "ready" ? "var(--ink)" : "var(--accent)"; }

function selectPattern(id) {
  const p = PATTERNS.find(x => x.id === id); if (!p || run) return;
  current = p; store.set("pattern", id);
  idleSeq = decorate(p.phases); idleClock = 0;
  setShape(p.shape); renderChips(); renderInfo(); music.setKey(p);
}

// 오늘 이용량은 서버 기준으로 앱 셸이 표시합니다.
function renderToday() {}

/* ───────────── Session control ───────────── */
let starting = false;
async function start() {
  if (run || starting) return;
  ensureAudio();
  const m = minsBy[current.id] || current.mins;
  const planned = buildRun(current, m);
  speak("편안하게 앉아, 어깨 힘을 빼세요");   // 휴대폰은 탭한 순간에 첫 음성을 내야 이후 음성이 허용됩니다
  let gate = { ok: true, id: null };
  if (window.SG) {
    starting = true;
    $("start").disabled = $("recoStart").disabled = true;
    try { gate = await window.SG.beforeStart({ pattern: current.id, minutes: m, mood: pickedMood, plannedSec: Math.round(planned.breathTotal) }); }
    finally { starting = false; $("start").disabled = $("recoStart").disabled = false; }
  }
  if (!gate || !gate.ok) { try { speechSynthesis.cancel(); } catch (e) {} return; }
  run = planned;
  run.serverId = gate.id;
  hideCards(); $("run").hidden = false; $("caption").hidden = false;
  $("runName").textContent = `${current.ko} · ${current.rhythm}`;
  setPause(false);
  keepAwake(true);
  layoutTarget();
}
function finish(completed) {
  const r = run; run = null;
  try { speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
  keepAwake(false);
  $("run").hidden = true; $("caption").hidden = true; show("home");
  const doneCycles = completed ? r.cycles : (r.idx > 0 && r.seq[r.idx] ? r.seq[r.idx].cycle : 0);
  const actualSec = Math.max(0, Math.round(r.elapsed - 4));
  if (window.SG) window.SG.onFinish({ id: r.serverId, pattern: r.p.id, completed: !!completed, actualSec, cycles: doneCycles, plannedSec: Math.round(r.breathTotal) });
  if (completed) {
    setPhaseText("수고하셨어요", "Well done", `${r.cycles}회 · ${fmtClock(r.breathTotal)}`, "var(--exhale)", true);
    speak("수고하셨어요. 천천히 평소 호흡으로 돌아오세요.");
    chime("out");
    setTimeout(() => { if (!run && screen === "home") renderInfo(); }, 6000);
  } else renderInfo();
  idleClock = 0;
  requestAnimationFrame(layoutTarget);
}
function setPause(p) {
  if (!run) return;
  run.paused = p;
  $("pauseIcon").innerHTML = p ? '<path d="M8 5.5v13l10.5-6.5z"/>' : '<rect x="7" y="5" width="3.2" height="14" rx="1"/><rect x="13.8" y="5" width="3.2" height="14" rx="1"/>';
  $("pause").setAttribute("aria-label", p ? "다시 시작" : "일시정지");
  if (p) { try { speechSynthesis.cancel(); } catch (e) {} setPhaseText("잠시 멈춤", "Paused", "탭하여 이어가기", "var(--ink)", true); }
  else if (run.idx >= 0) { run.idx = -1; }
}

function runState(dt) {
  if (!run.paused) run.elapsed += dt;
  if (run.elapsed >= run.total) { finish(true); return null; }
  const i = phaseAt(run.seq, run.elapsed), ph = run.seq[i];
  const e = run.elapsed - ph.at, p = clamp01(e / ph.d);
  if (i !== run.idx && !run.paused) {
    run.idx = i; run.lastCount = 0;
    const lab = LABEL[ph.t];
    if (ph.t !== "ready") {
      if (ph.ci === 0) music.chord(ph.cycle);
      chime(ph.t); vibrate(ph.t === "in" ? 40 : 25);
      speak(ph.voice || lab[2]);
      const cap = run.p.captions[ph.cycle % run.p.captions.length];
      if (ph.ci === 0) { $("capKo").textContent = cap[0]; $("capEn").textContent = cap[1]; }
    }
  }
  if (!run.paused) {
    if (ph.t === "ready") {
      setPhaseText("준비", "Get ready", String(Math.ceil(ph.d - e)), "var(--ink)");
    } else {
      const lab = LABEL[ph.t];
      const n = Math.min(Math.ceil(ph.d), Math.floor(e) + 1);
      if (n !== run.lastCount) {
        if (n >= 2 && settings.count) speak(NATIVE[n] || String(n), 1);
        run.lastCount = n;
        setPhaseText(`${ph.ko || lab[0]} ${fmtSec(ph.d)}`, `${ph.en || lab[1]} · ${ph.d} sec`, String(n), phaseColor(ph.t));
      }
    }
    const left = run.total - run.elapsed;
    $("runTime").textContent = `${ph.t === "ready" ? "곧 시작" : (ph.cycle + 1) + " / " + run.cycles + "회"} · 남은 시간 ${fmtClock(left)}`;
    $("runBar").style.width = (100 * run.elapsed / run.total).toFixed(2) + "%";
  }
  return { ph, p, L: ph.from + (ph.to - ph.from) * ease(p), cyc: ph.t === "ready" ? 0 : (ph.ci + p) / ph.n };
}

/* ───────────── Render loop ───────────── */
const buckets = Array.from({ length: 48 }, () => []);
function frame(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  let s = run ? runState(dt) : null;
  if (!s) s = idleState(dt);
  s.t = now / 1000;
  audioFrame(s);

  const k = 1 - Math.pow(0.02, dt);
  view.cx += (viewT.cx - view.cx) * k; view.cy += (viewT.cy - view.cy) * k; view.S += (viewT.S - view.S) * k;
  const { cx, cy, S } = view;
  const scale = S * (1 + 0.05 * s.L);
  const jit = reduceMotion ? 0 : 0.006;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#07060a"; ctx.fillRect(0, 0, W, H);

  // ambient glow follows the breath
  const g = shape.glow, gr = ctx.createRadialGradient(cx, cy + S * 0.2, 0, cx, cy + S * 0.2, S * 1.5);
  gr.addColorStop(0, `rgba(${g[0]},${g[1]},${g[2]},${(0.05 + 0.16 * s.L).toFixed(3)})`);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = "lighter";

  // drifting dust
  for (let i = 0; i < DUST; i++) {
    dy[i] -= dv[i] * (1 + s.L); if (dy[i] < -0.02) { dy[i] = 1.02; dx[i] = R(); }
    const a = 0.12 + 0.28 * (0.5 + 0.5 * Math.sin(s.t * 1.3 + dp[i]));
    ctx.fillStyle = `rgba(230,224,240,${a.toFixed(2)})`;
    ctx.fillRect(dx[i] * W + Math.sin(s.t * 0.3 + dp[i]) * 6, dy[i] * H, 1.3, 1.3);
  }

  // shape particles, batched by colour
  for (let b = 0; b < 48; b++) buckets[b].length = 0;
  const follow = 1 - Math.pow(0.0008, dt);
  for (let i = 0; i < N; i++) {
    const yy = shape.dynamic ? shape.pos(i, s) : ay[i];
    const tx = cx + (ax[i] + Math.sin(s.t * 1.3 + seed[i] * 31) * jit) * scale;
    const ty = cy + (yy + Math.cos(s.t * 1.1 + seed[i] * 17) * jit) * scale;
    px[i] += (tx - px[i]) * follow; py[i] += (ty - py[i]) * follow;
    const br = shape.b(i, s);
    buckets[band[i] * 12 + Math.min(11, (br * 12) | 0)].push(i);
  }
  for (let b = 0; b < 48; b++) {
    const list = buckets[b]; if (!list.length) continue;
    const lv = b % 12, sz = 1.4 + lv * 0.1;
    ctx.fillStyle = palette[b];
    for (let j = 0; j < list.length; j++) { const i = list[j]; ctx.fillRect(px[i], py[i], sz, sz); }
  }

  // sparks rising from the crater
  if (shape.emit && !reduceMotion) {
    const emitting = s.ph && (s.ph.t === "in" || s.ph.t === "hold") ? s.L : 0;
    const spawn = emitting * 3 * (dt * 60);
    for (let n = 0; n < spawn; n++) {
      const i = sparkHead = (sparkHead + 1) % SPARK;
      sx[i] = (R() - 0.5) * 0.18; sy[i] = -0.76; svx[i] = (R() - 0.5) * 0.12; svy[i] = -(0.15 + R() * 0.35); sl[i] = 1;
    }
    for (let i = 0; i < SPARK; i++) {
      if (sl[i] <= 0) continue;
      sx[i] += svx[i] * dt; sy[i] += svy[i] * dt; sl[i] -= dt * 0.7;
      ctx.fillStyle = `rgba(255,${170 + (sl[i] * 60) | 0},90,${Math.max(0, sl[i]).toFixed(2)})`;
      ctx.fillRect(cx + sx[i] * scale, cy + sy[i] * scale, 1.6, 1.6);
    }
  }
  requestAnimationFrame(frame);
}

/* ───────────── Welcome → question → recommendation ───────────── */
const MOODS = [
  { id: "anger", ko: "화가 나요", sub: "열이 오르고 욱해요", p: "lava",
    why: "들끓는 감정에는 들숨과 날숨을 똑같이, 아주 느리게 쉬는 호흡이 좋아요. 8초씩 오르내리는 리듬이 열기를 천천히 식혀 줍니다." },
  { id: "tense", ko: "긴장돼요", sub: "발표·면접·중요한 통화 전", p: "box",
    why: "긴장하면 숨이 얕고 빨라져요. 4초씩 네 박자를 지키는 박스 호흡이 몸을 안정시키고 집중을 되찾게 해 줍니다." },
  { id: "anxious", ko: "불안하고 답답해요", sub: "가슴이 꽉 막힌 느낌", p: "sigh",
    why: "답답할 때는 두 번 나눠 들이쉬고 길게 내쉬는 한숨 호흡이 가장 빨리 효과를 봐요. 한두 번만 해도 가슴이 풀립니다." },
  { id: "busy", ko: "머리가 복잡해요", sub: "생각이 꼬리를 물어요", p: "nadi",
    why: "좌우 콧구멍을 번갈아 쓰는 교호 호흡은 손과 숨에 주의를 붙잡아 두어, 흩어진 생각을 한 줄로 정리해 줍니다." },
  { id: "sleep", ko: "잠이 안 와요", sub: "누웠는데 정신이 또렷해요", p: "478",
    why: "날숨을 들숨의 두 배로 길게 쉬는 4-7-8 호흡은 몸을 잠들 준비 상태로 바꿔 줘요. 누운 채로 따라 해 보세요." },
  { id: "calm", ko: "그냥 숨 고르고 싶어요", sub: "매일의 작은 습관으로", p: "coherent",
    why: "특별한 일이 없다면 분당 5.5회의 공명 호흡이 가장 무난해요. 매일 5분이면 심장과 호흡의 리듬이 고르게 맞춰집니다." }
];
const TIMES = [
  { m: 1, ko: "1분", sub: "잠깐 숨 돌리기" },
  { m: 3, ko: "3분", sub: "차분히 정리하기" },
  { m: 5, ko: "5분", sub: "충분히 깊게" }
];
let screen = "welcome", pickedMood = null;
const CARDS = { welcome: "welcomeCard", ask: "askCard", result: "resultCard", home: "panel" };
function hideCards() { Object.values(CARDS).forEach(id => { $(id).hidden = true; }); }
function show(name) {
  screen = name; hideCards(); $(CARDS[name]).hidden = false;
  if (name === "home") renderInfo();
  requestAnimationFrame(layoutTarget);
}
function renderAsk(step) {
  const card = $("askCard");
  if (step === 1) {
    setPhaseText("지금 마음이 어떤가요?", "How are you feeling right now?", "1 / 2", "var(--ink)", true);
    card.innerHTML = `<div class="opts">${MOODS.map(m => `<button class="opt" data-mood="${m.id}">${m.ko}<small>${m.sub}</small></button>`).join("")}</div>
      <button class="ghost" data-act="home">건너뛰고 직접 고르기</button>`;
  } else {
    setPhaseText("시간은 얼마나 있나요?", "How much time do you have?", "2 / 2", "var(--ink)", true);
    card.innerHTML = `<div class="opts one">${TIMES.map(t => `<button class="opt" data-min="${t.m}">${t.ko}<small>${t.sub}</small></button>`).join("")}</div>
      <button class="ghost" data-act="back">이전으로</button>`;
  }
  show("ask");
  const first = card.querySelector(".opt"); if (first) first.focus({ preventScroll: true });
}
function renderResult(mins) {
  const mood = MOODS.find(m => m.id === pickedMood) || MOODS[5];
  const p = PATTERNS.find(x => x.id === mood.p);
  minsBy[p.id] = mins; store.set("mins", minsBy);
  screen = "result"; selectPattern(p.id);
  const c = cyclesFor(p, mins);
  setPhaseText("지금 당신에게 필요한 호흡", "Your breath for right now", p.rhythm, "var(--accent)", true);
  $("recoName").textContent = p.ko;
  $("recoEn").textContent = p.en;
  $("recoWhy").textContent = mood.why;
  $("recoMeta").textContent = `${p.rhythm}  ·  ${c}회 호흡  ·  약 ${fmtClock(c * cycleDur(p))}`;
  $("recoHow").textContent = p.how;
  show("result");
  speak(`지금 당신에게는 ${p.ko}이 좋겠어요.`);
}
function welcome() {
  setPhaseText("어서 오세요", "Welcome to Soomgyeol", "", "var(--ink)", true);
  show("welcome");
}
$("enter").addEventListener("click", () => {
  ensureAudio();
  speak("숨결에 오신 걸 환영해요. 잠시 숨을 고르며 마음을 편안하게 내려놓아 볼게요. 지금 마음이 어떤지 골라 주세요.");
  renderAsk(1);
});
$("skipFlow").addEventListener("click", () => { ensureAudio(); show("home"); });
$("askCard").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.mood) {
    pickedMood = b.dataset.mood;
    const m = MOODS.find(x => x.id === pickedMood);
    screen = "ask"; selectPattern(m.p);           // preview the matching shape while choosing time
    renderAsk(2);
  } else if (b.dataset.min) renderResult(+b.dataset.min);
  else if (b.dataset.act === "back") renderAsk(1);
  else if (b.dataset.act === "home") show("home");
});
$("recoStart").addEventListener("click", start);
$("recoBrowse").addEventListener("click", () => show("home"));
$("reask").addEventListener("click", () => { ensureAudio(); renderAsk(1); });

/* ───────────── Events ───────────── */
$("chips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (b) selectPattern(b.dataset.id); });
$("mins").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  minsBy[current.id] = +b.dataset.m; store.set("mins", minsBy); renderInfo();
});
$("start").addEventListener("click", start);
$("pause").addEventListener("click", () => setPause(!run.paused));
$("stop").addEventListener("click", () => finish(false));
cv.addEventListener("click", () => { if (run) setPause(!run.paused); });
$("more").addEventListener("toggle", () => requestAnimationFrame(layoutTarget));

const toggles = { sVoice: "voice", sCount: "count", sSound: "sound", sVibe: "vibe" };
for (const [id, key] of Object.entries(toggles)) {
  const el = $(id); el.checked = !!settings[key];
  el.addEventListener("change", () => {
    settings[key] = el.checked; store.set("settings", settings);
    if (key === "voice" && !el.checked) try { speechSynthesis.cancel(); } catch (e) {}
    if (key === "sound" && el.checked) ensureAudio();
  });
}
$("openSettings").addEventListener("click", () => { $("sheet").hidden = false; loadVoices(); $("closeSettings").focus(); });
$("closeSettings").addEventListener("click", () => { $("sheet").hidden = true; });
$("sheet").addEventListener("click", e => { if (e.target.id === "sheet") $("sheet").hidden = true; });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") $("sheet").hidden = true;
  if (e.key === " " && run && e.target === document.body) { e.preventDefault(); setPause(!run.paused); }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && run && !run.paused) setPause(true);
  if (!document.hidden && run) keepAwake(true);
});
addEventListener("resize", resize);

/* 앱 셸에서 쓰는 조작 */
window.SGBreath = {
  refresh() { renderChips(); renderInfo(); requestAnimationFrame(layoutTarget); },
  select(id) { selectPattern(id); },
  setMinutes(m) { minsBy[current.id] = m; store.set("mins", minsBy); renderInfo(); },
  start() { start(); },
  isRunning: () => !!run,
  pause() { if (run && !run.paused) setPause(true); },
  current: () => ({ id: current.id, ko: current.ko, minutes: minsBy[current.id] || current.mins }),
  patterns: () => PATTERNS.map(p => ({ id: p.id, ko: p.ko, rhythm: p.rhythm })),
  home() { if (!run) show("home"); },
  ask() { if (!run) { ensureAudio(); renderAsk(1); } },
  relayout() { requestAnimationFrame(layoutTarget); },
};

/* ───────────── Boot ───────────── */
setShape(current.shape);
renderChips(); renderInfo(); welcome();
resize();
requestAnimationFrame(t => { lastT = t; layoutTarget(); requestAnimationFrame(frame); });
})();
