/* 숨결 웹앱 셸: 로그인, 이용권·이용량, 보관함, 내 정보, 결제(테스트), 결과 저장.
   호흡 화면(breath.js)과는 window.SG / window.SGBreath 로만 주고받습니다. */
(() => {
"use strict";

const PATTERN_NAMES = { lava: "용암 호흡", box: "박스 호흡", "478": "달빛 4-7-8", coherent: "공명 호흡", sigh: "한숨 호흡", nadi: "교호 호흡" };
const FREE_ALT = { lava: "coherent", "478": "coherent", nadi: "box" };
const FEELINGS = ["", "많이 무거움", "무거움", "보통", "가벼움", "아주 편안"];

const state = {
  me: null,          // /api/me 응답 (로그아웃이면 null)
  config: null,      // /api/config
  loaded: false,
};

/* ───────── 공통 ───────── */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const won = n => Number(n).toLocaleString("ko-KR") + "원";
const date = ts => new Date(ts).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
const dateTime = ts => new Date(ts).toLocaleString("ko-KR", { month: "numeric", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" });
const mmss = s => `${Math.floor(s / 60)}분 ${String(Math.round(s % 60)).padStart(2, "0")}초`;

class ApiError extends Error { constructor(status, err) { super(err.message); this.status = status; this.code = err.code; this.info = err; } }
async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(0, { code: "network", message: "인터넷 연결을 확인하고 다시 시도해 주세요." });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.error || { code: "unknown", message: "요청을 처리하지 못했어요." });
  return json;
}

let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

window.addEventListener("error", e => {
  // 오류 메시지만 보냅니다(사용자 입력 내용은 보내지 않음)
  try { navigator.sendBeacon && fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" }, body: JSON.stringify({ message: String(e.message).slice(0, 200), path: location.pathname }) }); } catch (_) {}
});

/* ───────── 이용권 정보 → 호흡 화면 ───────── */
function plan() { return state.me ? state.me.entitlement.plan : "free"; }
function limits() {
  if (state.me) return state.me.limits;
  const p = state.config && state.config.plans.free;
  return p || { patterns: ["coherent", "box", "sigh"], dailySessions: 3, maxMinutes: 3, historyDays: 7 };
}

window.SG = {
  isLocked: id => !limits().patterns.includes(id),
  maxMinutes: () => limits().maxMinutes,

  async beforeStart(req) {
    if (!state.me) {
      openAuth("signup", "호흡 기록을 저장하려면 1분 만에 가입해 주세요.", () => window.SGBreath.start());
      return { ok: false };
    }
    if (window.SG.isLocked(req.pattern) || req.minutes > window.SG.maxMinutes()) {
      openUpgrade(req);
      return { ok: false };
    }
    try {
      const r = await api("POST", "/api/sessions/start", req);
      state.me.usage = r.usage; renderPill();
      return { ok: true, id: r.id };
    } catch (e) {
      if (e.code === "daily_limit") openLimit();
      else if (e.code === "pattern_locked" || e.code === "minutes_locked") { await refreshMe(); openUpgrade(req); }
      else if (e.status === 401) { state.me = null; openAuth("login", "다시 로그인해 주세요.", () => window.SGBreath.start()); }
      else toast(e.message);
      return { ok: false };
    }
  },

  async onFinish(info) {
    if (!info.id) return;
    try {
      const r = await api("POST", `/api/sessions/${info.id}/finish`, info);
      if (state.me) { state.me.usage = r.usage; renderPill(); }
      if (info.completed) openResult(r.session);
      else if (r.restored) toast("30초 안에 멈춰서 오늘 이용 횟수를 되돌려 드렸어요.");
      else if (info.actualSec >= 30) openResult(r.session);
    } catch (e) {
      toast("기록을 저장하지 못했어요. " + e.message);
    }
  },
};

/* ───────── 상단 표시 ───────── */
function renderPill() {
  const pill = $("today");
  if (!pill) return;
  if (!state.loaded) { pill.hidden = true; return; }
  pill.hidden = false;
  if (!state.me) { pill.textContent = "로그인"; pill.dataset.kind = "login"; return; }
  if (plan() === "premium") { pill.textContent = "프리미엄"; pill.dataset.kind = "premium"; return; }
  const u = state.me.usage;
  pill.textContent = `오늘 ${u.remaining}/${u.limit}회`;
  pill.dataset.kind = u.remaining ? "free" : "empty";
}

async function refreshMe() {
  try { state.me = await api("GET", "/api/me"); }
  catch (e) { if (e.status === 401) state.me = null; else throw e; }
  state.loaded = true;
  renderPill();
  if (window.SGBreath) window.SGBreath.refresh();
  return state.me;
}

/* ───────── 전체 화면 페이지(시트) ───────── */
let onPageClose = null;
function openPage(title, html, opts = {}) {
  if (window.SGBreath && window.SGBreath.isRunning()) window.SGBreath.pause();
  $("pageTitle").textContent = title;
  $("pageBody").innerHTML = html;
  $("page").hidden = false;
  $("page").dataset.size = opts.size || "";
  onPageClose = opts.onClose || null;
  $("pageBody").scrollTop = 0;
  const f = $("pageBody").querySelector("[autofocus]") || $("pageClose");
  setTimeout(() => f.focus({ preventScroll: true }), 30);
}
function closePage() {
  if ($("page").hidden) return;
  $("page").hidden = true;
  $("pageBody").innerHTML = "";
  const cb = onPageClose; onPageClose = null;
  if (location.hash) history.replaceState(null, "", location.pathname);
  if (cb) cb();
}
$("pageClose").addEventListener("click", closePage);
$("page").addEventListener("click", e => { if (e.target.id === "page") closePage(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("page").hidden) closePage(); });

function formError(form, msg) {
  let el = form.querySelector(".form-error");
  if (!el) { el = document.createElement("p"); el.className = "form-error"; el.setAttribute("role", "alert"); form.prepend(el); }
  el.textContent = msg || ""; el.hidden = !msg;
}
async function submitting(btn, fn) {
  const label = btn.textContent; btn.disabled = true; btn.textContent = "처리 중…";
  try { return await fn(); } finally { btn.disabled = false; btn.textContent = label; }
}

/* ───────── 로그인·가입·비밀번호 재설정 ───────── */
function openAuth(mode = "login", note = "", after = null) {
  const titles = { login: "로그인", signup: "무료로 시작하기", forgot: "비밀번호 찾기", reset: "새 비밀번호 정하기" };
  const forms = {
    login: `
      <form class="form" id="authForm" novalidate>
        <label for="aEmail">이메일</label><input id="aEmail" name="email" type="email" autocomplete="email" required autofocus>
        <label for="aPw">비밀번호</label><input id="aPw" name="password" type="password" autocomplete="current-password" required>
        <button class="primary" type="submit">로그인</button>
      </form>
      <div class="links"><button class="link" data-mode="signup">처음이신가요? 가입하기</button><button class="link" data-mode="forgot">비밀번호를 잊었어요</button></div>`,
    signup: `
      <form class="form" id="authForm" novalidate>
        <label for="aEmail">이메일</label><input id="aEmail" name="email" type="email" autocomplete="email" required autofocus>
        <label for="aPw">비밀번호 <small>8자 이상</small></label><input id="aPw" name="password" type="password" autocomplete="new-password" minlength="8" required>
        <label class="check"><input type="checkbox" name="agree" id="aAgree"> <span><a href="/terms" target="_blank" rel="noopener">이용약관</a>과 <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a>에 동의합니다 (필수)</span></label>
        <button class="primary" type="submit">가입하고 시작하기</button>
      </form>
      <div class="links"><button class="link" data-mode="login">이미 계정이 있어요. 로그인</button></div>`,
    forgot: `
      <form class="form" id="authForm" novalidate>
        <p class="muted">가입한 이메일로 6자리 재설정 코드를 보내 드려요.</p>
        <label for="aEmail">이메일</label><input id="aEmail" name="email" type="email" autocomplete="email" required autofocus>
        <button class="primary" type="submit">코드 받기</button>
      </form>
      <div class="links"><button class="link" data-mode="login">로그인으로 돌아가기</button></div>`,
    reset: `
      <form class="form" id="authForm" novalidate>
        <p class="muted">메일로 받은 6자리 코드와 새 비밀번호를 입력해 주세요.</p>
        <label for="aEmail">이메일</label><input id="aEmail" name="email" type="email" autocomplete="email" required>
        <label for="aCode">재설정 코드</label><input id="aCode" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required autofocus>
        <label for="aPw">새 비밀번호 <small>8자 이상</small></label><input id="aPw" name="password" type="password" autocomplete="new-password" minlength="8" required>
        <button class="primary" type="submit">비밀번호 바꾸고 로그인</button>
      </form>`,
  };
  openPage(titles[mode], `${note ? `<p class="note-box">${esc(note)}</p>` : ""}${forms[mode]}`, { size: "small" });
  const form = $("authForm");
  if (openAuth.lastEmail && form.email) form.email.value = openAuth.lastEmail;
  $("pageBody").querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => openAuth(b.dataset.mode, note, after)));
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    const v = { email: form.email.value.trim() };
    openAuth.lastEmail = v.email;
    if (form.password) v.password = form.password.value;
    if (form.code) v.code = form.code.value.trim();
    if (form.agree) v.agree = form.agree.checked;
    if (!v.email) return formError(form, "이메일을 입력해 주세요.");
    if (mode === "signup" && !v.agree) return formError(form, "약관에 동의해 주세요.");
    try {
      await submitting(btn, async () => {
        if (mode === "forgot") {
          await api("POST", "/api/auth/forgot", v);
          openAuth("reset", "메일함을 확인해 주세요. 메일이 오지 않으면 스팸함도 확인해 주세요.", after);
          return;
        }
        const path = { login: "/api/auth/login", signup: "/api/auth/signup", reset: "/api/auth/reset" }[mode];
        state.me = await api("POST", path, v);
        state.loaded = true;
        renderPill(); window.SGBreath && window.SGBreath.refresh();
        closePage();
        toast(mode === "signup" ? "가입했어요. 오늘 무료로 3회 호흡할 수 있어요." : "로그인했어요.");
        if (after) after();
      });
    } catch (err) { formError(form, err.message); }
  });
}

/* ───────── 오늘 한도 초과 ───────── */
function openLimit() {
  const u = state.me.usage;
  openPage("오늘 호흡을 모두 했어요", `
    <div class="state">
      <div class="big">${u.used} / ${u.limit}회</div>
      <p>무료 요금제는 하루 ${u.limit}회까지 이용할 수 있어요. 오늘 자정(한국 시간)에 다시 채워집니다.</p>
      <p class="muted">프리미엄은 횟수 걱정 없이 여섯 가지 호흡을 모두 쓸 수 있어요.</p>
      <div class="actions"><button class="primary" id="limUp">프리미엄 보기</button><button class="ghost-btn" id="limRec">오늘 기록 보기</button></div>
    </div>`, { size: "small" });
  $("limUp").addEventListener("click", () => openUpgrade());
  $("limRec").addEventListener("click", () => openRecords());
}

/* ───────── 프리미엄 안내·결제 ───────── */
function openUpgrade(req) {
  if (!state.me) { openAuth("signup", "프리미엄은 가입 후 이용할 수 있어요.", () => openUpgrade(req)); return; }
  if (plan() === "premium" && !req) { openAccount(); return; }
  const c = state.config, P = c.prices, F = c.plans.free, PR = c.plans.premium;
  const yearlyMonthly = Math.round(P.yearly.amount / 12);
  const save = Math.round((1 - P.yearly.amount / (P.monthly.amount * 12)) * 100);
  const reason = req && window.SG.isLocked(req.pattern)
    ? `${PATTERN_NAMES[req.pattern]}은 프리미엄 호흡이에요.`
    : req && req.minutes > window.SG.maxMinutes() ? `무료 요금제는 한 번에 ${F.maxMinutes}분까지예요.` : "";
  const alt = req && (window.SG.isLocked(req.pattern) ? FREE_ALT[req.pattern] : null);
  openPage("프리미엄", `
    ${c.billingMode === "test" ? `<p class="test-banner">테스트 결제 모드 · 실제로 청구되지 않습니다${P.draft ? " · 가격은 가안" : ""}</p>` : ""}
    ${reason ? `<p class="note-box">${esc(reason)}</p>` : ""}
    <ul class="compare">
      <li><span>호흡법</span><b>${F.patterns.length}가지 → 6가지 모두</b></li>
      <li><span>하루 이용</span><b>${F.dailySessions}회 → 제한 없음</b></li>
      <li><span>한 번에</span><b>${F.maxMinutes}분 → ${PR.maxMinutes}분까지</b></li>
      <li><span>기록 보기</span><b>최근 ${F.historyDays}일 → 전체</b></li>
    </ul>
    <fieldset class="cycles"><legend>결제 주기</legend>
      <label class="cycle"><input type="radio" name="cycle" value="yearly" checked>
        <span><b>연간</b> ${won(P.yearly.amount)} / 년<small>월 ${won(yearlyMonthly)} 상당 · ${save}% 할인 · 1년치 일괄 결제</small></span></label>
      <label class="cycle"><input type="radio" name="cycle" value="monthly">
        <span><b>월간</b> ${won(P.monthly.amount)} / 월<small>매월 자동 결제</small></span></label>
    </fieldset>
    <button class="primary" id="goCheckout">${c.billingMode === "test" ? "테스트 결제로 계속" : "결제하기"}</button>
    <p class="muted small">언제든 해지할 수 있고, 해지해도 결제한 기간 끝까지 이용할 수 있어요. <a href="/refund" target="_blank" rel="noopener">결제·해지·환불 안내</a></p>
    ${alt ? `<button class="ghost-btn wide" id="useAlt">무료 대안: ${PATTERN_NAMES[alt]}으로 시작</button>` : ""}
    ${req && !window.SG.isLocked(req.pattern) && req.minutes > window.SG.maxMinutes() ? `<button class="ghost-btn wide" id="useShort">${F.maxMinutes}분으로 시작</button>` : ""}
  `, { size: "small" });
  $("goCheckout").addEventListener("click", async e => {
    const cycle = $("pageBody").querySelector("input[name=cycle]:checked").value;
    try {
      await submitting(e.currentTarget, async () => {
        const order = await api("POST", "/api/billing/checkout", { cycle });
        openCheckout(order);
      });
    } catch (err) { toast(err.message); if (err.code === "already_subscribed") refreshMe(); }
  });
  const useAlt = $("useAlt");
  if (useAlt) useAlt.addEventListener("click", () => { closePage(); window.SGBreath.select(alt); window.SGBreath.start(); });
  const useShort = $("useShort");
  if (useShort) useShort.addEventListener("click", () => { closePage(); window.SGBreath.setMinutes(window.SG.maxMinutes()); window.SGBreath.start(); });
}

/* 테스트 결제사 화면. 실결제 연결 시 결제사 결제창으로 바뀝니다. */
function openCheckout(order) {
  const P = state.config.prices[order.cycle];
  openPage("테스트 결제", `
    <p class="test-banner">이 화면은 결제사 연결 전 테스트용입니다. 실제로 청구되지 않습니다.</p>
    <div class="receipt">
      <div><span>상품</span><b>숨결 프리미엄 ${esc(P.label)}</b></div>
      <div><span>결제 금액</span><b>${won(order.amount)}</b></div>
      <div><span>주문번호</span><code>${esc(order.orderId)}</code></div>
    </div>
    <label class="check"><input type="checkbox" id="dupe"> <span>결제 알림을 두 번 보내기 (중복 처리 검증용)</span></label>
    <div class="actions">
      <button class="primary" id="paySuccess">결제 성공으로 처리</button>
      <button class="ghost-btn" id="payFail">결제 실패로 처리</button>
    </div>
    <div id="payState" class="pay-state" aria-live="polite"></div>`, { size: "small" });
  const go = async outcome => {
    $("paySuccess").disabled = $("payFail").disabled = true;
    $("payState").innerHTML = `<div class="spinner" aria-hidden="true"></div><p>결제 결과를 서버에서 확인하고 있어요…</p>`;
    try {
      await api("POST", "/api/billing/test/complete", { orderId: order.orderId, outcome, duplicate: $("dupe").checked });
      // 결제 완료 화면이 아니라 서버의 이용권 상태를 확인합니다.
      let st;
      for (let i = 0; i < 6; i++) {
        st = await api("GET", `/api/billing/order/${encodeURIComponent(order.orderId)}`);
        if (st.order.status !== "pending") break;
        await new Promise(r => setTimeout(r, 800));
      }
      if (st.order.status === "paid" && st.entitlement.plan === "premium") {
        await refreshMe();
        $("payState").innerHTML = `<p class="ok">프리미엄이 시작됐어요. ${date(st.entitlement.until)}까지 이용할 수 있어요.</p><button class="primary" id="payDone">호흡하러 가기</button>`;
        $("payDone").addEventListener("click", closePage);
      } else if (st.order.status === "failed") {
        $("payState").innerHTML = `<p class="err">결제가 완료되지 않았어요. 결제 수단을 확인하고 다시 시도해 주세요. 청구된 금액은 없습니다.</p><button class="ghost-btn" id="payRetry">다시 시도</button>`;
        $("payRetry").addEventListener("click", () => openUpgrade());
      } else {
        $("payState").innerHTML = `<p>결제 확인이 늦어지고 있어요. 잠시 뒤 내 정보에서 "구매 상태 새로고침"을 눌러 주세요.</p>`;
      }
    } catch (err) {
      $("payState").innerHTML = `<p class="err">${esc(err.message)}</p>`;
      $("paySuccess").disabled = $("payFail").disabled = false;
    }
  };
  $("paySuccess").addEventListener("click", () => go("success"));
  $("payFail").addEventListener("click", () => go("fail"));
}

/* ───────── 결과 화면: 기분·메모 저장, 다시 하기 ───────── */
function feelingPicker(name, value) {
  return `<div class="feel" role="radiogroup" aria-label="${name === "feelingBefore" ? "시작 전 기분" : "지금 기분"}">${[1, 2, 3, 4, 5].map(n =>
    `<label><input type="radio" name="${name}" value="${n}"${value === n ? " checked" : ""}><span>${n}<small>${FEELINGS[n]}</small></span></label>`).join("")}</div>`;
}
function openResult(s) {
  const done = s.status === "completed";
  openPage(done ? "수고하셨어요" : "호흡을 멈췄어요", `
    <div class="result-head">
      <div class="big">${PATTERN_NAMES[s.pattern]}</div>
      <p class="muted">${mmss(s.actualSec)} · ${s.cycles}회 호흡${done ? "" : " · 중간에 멈춤"}</p>
    </div>
    <form class="form" id="resForm">
      <p class="label">시작 전 기분</p>${feelingPicker("feelingBefore", s.feelingBefore)}
      <p class="label">지금 기분</p>${feelingPicker("feelingAfter", s.feelingAfter)}
      <label for="resNote">한 줄 메모 <small>선택 · 나만 볼 수 있어요</small></label>
      <textarea id="resNote" name="note" maxlength="500" rows="2" placeholder="예: 회의 전에 했더니 목소리가 덜 떨렸다">${esc(s.note)}</textarea>
      <button class="primary" type="submit">기록 저장</button>
    </form>
    <div class="actions"><button class="ghost-btn" id="resAgain">한 번 더 하기</button><button class="ghost-btn" id="resRecords">보관함 보기</button></div>`,
  { size: "small" });
  const form = $("resForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const val = n => { const c = form.querySelector(`input[name=${n}]:checked`); return c ? Number(c.value) : undefined; };
    try {
      await submitting(form.querySelector("button[type=submit]"), () => api("PATCH", `/api/sessions/${s.id}`, { feelingBefore: val("feelingBefore"), feelingAfter: val("feelingAfter"), note: form.note.value }));
      closePage(); toast("기록을 저장했어요.");
    } catch (err) { formError(form, err.message); }
  });
  $("resAgain").addEventListener("click", () => { closePage(); window.SGBreath.start(); });
  $("resRecords").addEventListener("click", () => openRecords());
}

/* ───────── 보관함 ───────── */
async function openRecords(filters = {}) {
  if (!state.me) { openAuth("login", "보관함은 로그인 후 볼 수 있어요.", () => openRecords()); return; }
  history.replaceState(null, "", "#records");
  openPage("호흡 보관함", `<div class="loading"><div class="spinner" aria-hidden="true"></div><p>기록을 불러오는 중…</p></div>`, { size: "wide" });
  const body = $("pageBody");
  try {
    const qs = new URLSearchParams();
    if (filters.q) qs.set("q", filters.q);
    if (filters.pattern) qs.set("pattern", filters.pattern);
    const [stats, list] = await Promise.all([api("GET", "/api/stats"), api("GET", "/api/sessions?" + qs)]);
    const options = Object.entries(PATTERN_NAMES).map(([k, v]) => `<option value="${k}"${filters.pattern === k ? " selected" : ""}>${v}</option>`).join("");
    body.innerHTML = `
      <div class="stats">
        <div><b>${stats.week.sessions}</b><span>이번 주 호흡</span></div>
        <div><b>${stats.week.minutes}<small>분</small></b><span>이번 주 시간</span></div>
        <div><b>${stats.streakDays}<small>일</small></b><span>연속 기록</span></div>
      </div>
      <form class="search" id="recSearch" role="search">
        <label class="sr" for="recQ">메모나 호흡법 검색</label>
        <input id="recQ" type="search" placeholder="메모나 호흡법 검색" value="${esc(filters.q || "")}">
        <label class="sr" for="recP">호흡법</label>
        <select id="recP"><option value="">모든 호흡</option>${options}</select>
        <button class="ghost-btn" type="submit">검색</button>
      </form>
      <div id="recList"></div>
      <div class="rec-foot">
        ${list.hiddenOlder ? `<p class="note-box">${list.historyDays}일보다 오래된 기록 ${list.hiddenOlder}개는 프리미엄에서 볼 수 있어요. 기록은 지워지지 않고 보관돼요. <button class="link" id="recUp">프리미엄 보기</button></p>` : ""}
        <a class="ghost-btn" href="/api/sessions/export.csv">CSV로 내보내기</a>
      </div>`;
    renderRecordList(list.items, list.more, filters);
    $("recSearch").addEventListener("submit", e => { e.preventDefault(); openRecords({ q: $("recQ").value.trim(), pattern: $("recP").value }); });
    $("recP").addEventListener("change", () => openRecords({ q: $("recQ").value.trim(), pattern: $("recP").value }));
    const up = $("recUp"); if (up) up.addEventListener("click", () => openUpgrade());
  } catch (err) {
    body.innerHTML = `<div class="state"><p class="err">${esc(err.message)}</p><button class="ghost-btn" id="recRetry">다시 불러오기</button></div>`;
    $("recRetry").addEventListener("click", () => openRecords(filters));
  }
}

function recordRow(s) {
  const feel = s.feelingBefore || s.feelingAfter
    ? `<span class="feel-chip">${s.feelingBefore || "–"} → ${s.feelingAfter || "–"}</span>` : "";
  return `<li><button class="rec" data-id="${s.id}">
    <span class="rec-main"><b>${PATTERN_NAMES[s.pattern]}</b><span class="muted">${dateTime(s.startedAt)} · ${mmss(s.actualSec)}${s.status === "stopped" ? " · 중간에 멈춤" : ""}</span>
    ${s.note ? `<span class="rec-note">${esc(s.note)}</span>` : ""}</span>${feel}</button></li>`;
}

function renderRecordList(items, more, filters, append) {
  const box = $("recList");
  if (!box) return;
  if (!items.length && !append) {
    box.innerHTML = filters.q || filters.pattern
      ? `<div class="state"><p>조건에 맞는 기록이 없어요.</p><button class="ghost-btn" id="recClear">검색 지우기</button></div>`
      : `<div class="state"><p>아직 기록이 없어요.</p><p class="muted">첫 호흡을 마치면 여기에 쌓여요.</p><button class="primary" id="recFirst">첫 호흡 시작하기</button></div>`;
    const c = $("recClear"); if (c) c.addEventListener("click", () => openRecords());
    const f = $("recFirst"); if (f) f.addEventListener("click", () => { closePage(); window.SGBreath.ask(); });
    return;
  }
  let ul = box.querySelector("ul.recs");
  if (!ul) { box.innerHTML = `<ul class="recs"></ul>`; ul = box.querySelector("ul.recs"); }
  ul.insertAdjacentHTML("beforeend", items.map(recordRow).join(""));
  box.querySelector(".more")?.remove();
  if (more) {
    box.insertAdjacentHTML("beforeend", `<button class="ghost-btn more">더 보기</button>`);
    box.querySelector(".more").addEventListener("click", async e => {
      const last = items[items.length - 1];
      const qs = new URLSearchParams({ before: last.startedAt });
      if (filters.q) qs.set("q", filters.q);
      if (filters.pattern) qs.set("pattern", filters.pattern);
      try { const next = await submitting(e.currentTarget, () => api("GET", "/api/sessions?" + qs)); renderRecordList(next.items, next.more, filters, true); }
      catch (err) { toast(err.message); }
    });
  }
  ul.querySelectorAll(".rec:not([data-bound])").forEach(b => { b.dataset.bound = "1"; b.addEventListener("click", () => openRecord(Number(b.dataset.id), filters)); });
}

async function openRecord(id, filters) {
  let s;
  try { s = (await api("GET", `/api/sessions/${id}`)).session; } catch (err) { toast(err.message); return; }
  openPage("기록 상세", `
    <button class="link back-link" id="recBack">← 보관함</button>
    <div class="result-head">
      <div class="big">${PATTERN_NAMES[s.pattern]}</div>
      <p class="muted">${dateTime(s.startedAt)} · ${mmss(s.actualSec)} · ${s.cycles}회 호흡 · ${s.status === "completed" ? "완료" : "중간에 멈춤"}</p>
    </div>
    <form class="form" id="detForm">
      <p class="label">시작 전 기분</p>${feelingPicker("feelingBefore", s.feelingBefore)}
      <p class="label">끝난 뒤 기분</p>${feelingPicker("feelingAfter", s.feelingAfter)}
      <label for="detNote">메모</label>
      <textarea id="detNote" name="note" maxlength="500" rows="3">${esc(s.note)}</textarea>
      <button class="primary" type="submit">수정 저장</button>
    </form>
    <div class="actions"><button class="ghost-btn" id="detAgain">이 호흡 다시 하기</button><button class="danger-btn" id="detDel">기록 삭제</button></div>
    <div id="detConfirm"></div>`, { size: "wide" });
  $("recBack").addEventListener("click", () => openRecords(filters));
  const form = $("detForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const val = n => { const c = form.querySelector(`input[name=${n}]:checked`); return c ? Number(c.value) : undefined; };
    try { await submitting(form.querySelector("button[type=submit]"), () => api("PATCH", `/api/sessions/${id}`, { feelingBefore: val("feelingBefore"), feelingAfter: val("feelingAfter"), note: form.note.value })); toast("수정했어요."); }
    catch (err) { formError(form, err.message); }
  });
  $("detAgain").addEventListener("click", () => { closePage(); window.SGBreath.select(s.pattern); window.SGBreath.start(); });
  $("detDel").addEventListener("click", () => {
    $("detConfirm").innerHTML = `<div class="confirm"><p>이 기록을 삭제할까요? 되돌릴 수 없어요.</p><button class="danger-btn" id="detDelYes">삭제</button><button class="ghost-btn" id="detDelNo">취소</button></div>`;
    $("detDelNo").addEventListener("click", () => { $("detConfirm").innerHTML = ""; });
    $("detDelYes").addEventListener("click", async () => {
      try { await api("DELETE", `/api/sessions/${id}`); toast("기록을 삭제했어요."); openRecords(filters); } catch (err) { toast(err.message); }
    });
  });
}

/* ───────── 내 정보 ───────── */
const SUB_STATUS = {
  active: "이용 중 · 자동 갱신", canceled: "해지 예약됨", past_due: "결제 실패 · 유예 기간", expired: "만료", refunded: "환불됨",
};
const PAY_STATUS = { pending: "결제 대기", paid: "결제 완료", failed: "결제 실패", refunded: "환불" };

async function openAccount() {
  if (!state.me) { openAuth("login", "", () => openAccount()); return; }
  history.replaceState(null, "", "#account");
  openPage("내 정보", `<div class="loading"><div class="spinner" aria-hidden="true"></div><p>불러오는 중…</p></div>`, { size: "wide" });
  try {
    const [me, bill, inq, notices] = await Promise.all([
      refreshMe(), api("GET", "/api/billing"), api("GET", "/api/inquiries"), api("GET", "/api/content?kind=notice"),
    ]);
    renderAccount(me, bill, inq.items, notices.items);
  } catch (err) {
    $("pageBody").innerHTML = `<div class="state"><p class="err">${esc(err.message)}</p><button class="ghost-btn" id="accRetry">다시 불러오기</button></div>`;
    $("accRetry").addEventListener("click", openAccount);
  }
}

function renderAccount(me, bill, inquiries, notices) {
  const ent = me.entitlement, sub = ent.subscription, L = me.limits, u = me.usage;
  const prem = ent.plan === "premium";
  let planLine;
  if (!prem) planLine = `무료 · 오늘 ${u.used}/${u.limit}회 사용 · 한 번에 ${L.maxMinutes}분 · 최근 ${L.historyDays}일 기록`;
  else if (ent.source === "grant") planLine = `프리미엄 (운영자 지급 이용권) · ${date(ent.until)}까지`;
  else planLine = `프리미엄 · ${SUB_STATUS[sub.status]} · ${sub.cancelAtPeriodEnd ? `${date(sub.periodEnd)}까지 이용 후 종료` : `다음 결제일 ${date(sub.periodEnd)}`}`;

  let subActions = "";
  if (sub && ["active", "past_due"].includes(sub.status) && ent.source === "subscription") subActions = `<button class="ghost-btn" id="subCancel">구독 해지</button>`;
  else if (sub && sub.status === "canceled" && sub.periodEnd > Date.now()) subActions = `<button class="primary" id="subResume">해지 취소하고 계속 이용</button>`;
  if (!prem || ent.source === "grant") subActions += `<button class="primary" id="subUp">프리미엄 시작</button>`;

  $("pageBody").innerHTML = `
    ${notices.length ? `<section class="block notices"><h3>공지</h3>${notices.slice(0, 3).map(n => `<details><summary>${esc(n.title)} <small class="muted">${date(n.created_at)}</small></summary><p>${esc(n.body)}</p></details>`).join("")}</section>` : ""}

    <section class="block">
      <h3>요금제와 이용량</h3>
      <div class="plan-card ${prem ? "is-premium" : ""}">
        <div class="plan-name">${prem ? "프리미엄" : "무료"}</div>
        <p>${esc(planLine)}</p>
        ${sub && sub.isTest ? `<p class="test-banner inline">테스트 결제로 만든 구독입니다</p>` : ""}
      </div>
      ${sub && sub.status === "past_due" ? `<p class="note-box">자동 결제에 실패했어요. 결제 수단을 확인해 주세요. ${date(ent.until)}까지는 프리미엄이 유지됩니다.</p>` : ""}
      <div class="actions">${subActions}<button class="ghost-btn" id="subSync">구매 상태 새로고침</button></div>
      <div id="subConfirm"></div>
    </section>

    <section class="block">
      <h3>결제 내역</h3>
      ${bill.payments.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>날짜</th><th>내용</th><th>금액</th><th>상태</th></tr></thead><tbody>
        ${bill.payments.map(p => `<tr><td>${date(p.created_at)}</td><td>프리미엄 ${p.cycle === "yearly" ? "연간" : "월간"}${p.kind === "renewal" ? " 갱신" : ""}${p.is_test ? ' <span class="tag-test">테스트</span>' : ""}</td><td>${won(p.amount)}</td><td>${PAY_STATUS[p.status] || p.status}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted">결제 내역이 없어요.</p>`}
    </section>

    <section class="block">
      <h3>계정</h3>
      <form class="form row-form" id="nameForm">
        <label for="accEmail">이메일</label><input id="accEmail" value="${esc(me.user.email)}" disabled>
        <label for="accName">이름 <small>선택</small></label><input id="accName" name="name" maxlength="40" value="${esc(me.user.name)}" autocomplete="name">
        <button class="ghost-btn" type="submit">이름 저장</button>
      </form>
      <details class="sub-block"><summary>비밀번호 바꾸기</summary>
        <form class="form" id="pwForm">
          <label for="pwCur">현재 비밀번호</label><input id="pwCur" name="current" type="password" autocomplete="current-password" required>
          <label for="pwNew">새 비밀번호 <small>8자 이상</small></label><input id="pwNew" name="next" type="password" autocomplete="new-password" minlength="8" required>
          <button class="ghost-btn" type="submit">비밀번호 바꾸기</button>
        </form>
      </details>
    </section>

    <section class="block">
      <h3>문의하기</h3>
      <form class="form" id="inqForm">
        <label for="inqSubject">제목</label><input id="inqSubject" name="subject" maxlength="100" required>
        <label for="inqBody">내용</label><textarea id="inqBody" name="body" rows="3" maxlength="2000" required></textarea>
        <button class="ghost-btn" type="submit">문의 보내기</button>
      </form>
      ${inquiries.length ? `<ul class="inq">${inquiries.map(q => `<li><b>${esc(q.subject)}</b> <span class="status s-${q.status}">${{ open: "답변 대기", answered: "답변 완료", closed: "종료" }[q.status]}</span>
        <small class="muted">${date(q.created_at)}</small>${q.answer ? `<p class="answer">${esc(q.answer)}</p>` : ""}</li>`).join("")}</ul>` : ""}
      <p class="muted small"><a href="/support" target="_blank" rel="noopener">자주 묻는 질문</a> · <a href="/terms" target="_blank" rel="noopener">이용약관</a> · <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a> · <a href="/refund" target="_blank" rel="noopener">결제·해지·환불</a></p>
    </section>

    <section class="block">
      ${me.user.role === "admin" ? `<a class="ghost-btn" href="/admin">관리자 화면</a>` : ""}
      <button class="ghost-btn" id="logout">로그아웃</button>
      <details class="sub-block danger"><summary>탈퇴하기</summary>
        <form class="form" id="byeForm">
          <p>탈퇴하면 계정과 호흡 기록이 바로 삭제되고 되돌릴 수 없어요. 이용 중인 구독은 해지되며, 결제 기록은 법령에 따라 보관됩니다.</p>
          <label for="byePw">비밀번호 확인</label><input id="byePw" name="password" type="password" autocomplete="current-password" required>
          <button class="danger-btn" type="submit">계정 삭제</button>
        </form>
      </details>
    </section>`;

  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
  on("subUp", () => openUpgrade());
  on("subCancel", () => {
    $("subConfirm").innerHTML = `<div class="confirm"><p>${date(sub.periodEnd)}까지 프리미엄을 쓰고, 그 뒤로는 결제되지 않아요. 해지할까요?</p>
      <button class="danger-btn" id="subCancelYes">해지</button><button class="ghost-btn" id="subCancelNo">유지</button></div>`;
    on("subCancelNo", () => { $("subConfirm").innerHTML = ""; });
    on("subCancelYes", async () => { try { await api("POST", "/api/billing/cancel"); toast("해지를 예약했어요."); openAccount(); } catch (err) { toast(err.message); } });
  });
  on("subResume", async () => { try { await api("POST", "/api/billing/resume"); toast("구독을 계속 이어가요."); openAccount(); } catch (err) { toast(err.message); } });
  on("subSync", async e => { try { await submitting(e.currentTarget, () => api("POST", "/api/billing/sync")); toast("구매 상태를 새로 확인했어요."); openAccount(); } catch (err) { toast(err.message); } });
  on("logout", async () => { await api("POST", "/api/auth/logout").catch(() => {}); state.me = null; renderPill(); window.SGBreath.refresh(); closePage(); toast("로그아웃했어요."); });

  $("nameForm").addEventListener("submit", async e => {
    e.preventDefault();
    try { state.me = await api("PATCH", "/api/me", { name: e.target.name.value }); toast("저장했어요."); } catch (err) { formError(e.target, err.message); }
  });
  $("pwForm").addEventListener("submit", async e => {
    e.preventDefault();
    try { await api("POST", "/api/me/password", { current: e.target.current.value, next: e.target.next.value }); e.target.reset(); toast("비밀번호를 바꿨어요. 다른 기기에서는 로그아웃됐어요."); }
    catch (err) { formError(e.target, err.message); }
  });
  $("inqForm").addEventListener("submit", async e => {
    e.preventDefault();
    try { await submitting(e.target.querySelector("button"), () => api("POST", "/api/inquiries", { subject: e.target.subject.value, body: e.target.body.value })); toast("문의를 보냈어요. 답변은 이 화면과 이메일로 알려 드려요."); openAccount(); }
    catch (err) { formError(e.target, err.message); }
  });
  $("byeForm").addEventListener("submit", async e => {
    e.preventDefault();
    try { await api("DELETE", "/api/me", { password: e.target.password.value }); state.me = null; renderPill(); window.SGBreath.refresh(); closePage(); toast("탈퇴가 완료됐어요. 그동안 함께해 주셔서 고마워요."); }
    catch (err) { formError(e.target, err.message); }
  });
}

/* ───────── 상단 버튼·해시 경로 ───────── */
function wire() {
  $("today").addEventListener("click", () => {
    if (!state.me) openAuth("login");
    else if (plan() === "premium") openAccount();
    else if (!state.me.usage.remaining) openLimit();
    else openUpgrade();
  });
  $("navRecords").addEventListener("click", () => openRecords());
  $("navAccount").addEventListener("click", () => openAccount());
}
function route() {
  const h = location.hash.slice(1);
  if (h === "records") openRecords();
  else if (h === "account") openAccount();
  else if (h === "upgrade") openUpgrade();
  else if (h === "login") openAuth("login");
  else if (h === "signup") openAuth("signup");
}
window.addEventListener("hashchange", route);

async function boot() {
  wire();
  try { state.config = await api("GET", "/api/config"); } catch (e) { toast(e.message); }
  try { await refreshMe(); } catch (e) { state.loaded = true; renderPill(); toast(e.message); }
  route();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
})();
