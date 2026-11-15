(() => {
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const won = n => Number(n || 0).toLocaleString("ko-KR") + "원";
const dt = ts => ts ? new Date(ts).toLocaleString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }) : "–";
const chip = (v, label) => `<span class="chip ${esc(String(v).split(":")[0])}">${esc(label || v)}</span>`;
const PN = { lava: "용암", box: "박스", "478": "4-7-8", coherent: "공명", sigh: "한숨", nadi: "교호" };
const L = {
  pending: "결제 대기", paid: "결제 완료", failed: "결제 실패", refunded: "환불",
  active: "이용 중", canceled: "해지 예약", past_due: "갱신 실패", expired: "만료",
  open: "답변 대기", answered: "답변 완료", closed: "종료", premium: "프리미엄", free: "무료", suspended: "정지",
};

async function api(method, path, body) {
  const res = await fetch(path, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error((j.error && j.error.message) || "요청 실패"); e.status = res.status; throw e; }
  return j;
}
function toast(m) { const t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3000); }
const table = (head, rows) => rows.length
  ? `<div class="table-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
  : `<p class="empty">아직 데이터가 없어요.</p>`;

/* 사유 입력 대화상자: 이용권·환불 등 변경은 사유가 필요합니다 */
function ask(title, fields = "", needReason = true) {
  return new Promise(resolve => {
    const d = document.createElement("dialog");
    d.innerHTML = `<form method="dialog" class="form"><h2>${esc(title)}</h2>${fields}
      ${needReason ? `<label for="dlgReason">변경 사유 (운영 기록에 남습니다)</label><textarea id="dlgReason" name="reason" rows="2" required minlength="2"></textarea>` : ""}
      <div class="row-actions"><button class="btn" value="ok">확인</button><button class="sec" value="cancel" formnovalidate>취소</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener("close", () => {
      const ok = d.returnValue === "ok";
      const data = Object.fromEntries(new FormData(d.querySelector("form")));
      d.remove(); resolve(ok ? data : null);
    });
    d.showModal();
  });
}

/* ───────── 화면 ───────── */
const views = {
  async overview() {
    const o = await api("GET", "/api/admin/overview");
    $("mode").textContent = o.billingMode === "test" ? "테스트 결제 모드" : "";
    const max = Math.max(1, ...o.series.map(s => Math.max(s.signups, s.sessions)));
    const W = 560, H = 150, pad = 24, bw = (W - pad) / o.series.length;
    const bars = o.series.map((s, i) => {
      const x = pad + i * bw, hs = (s.sessions / max) * (H - 30), hu = (s.signups / max) * (H - 30);
      return `<rect x="${x + 2}" y="${H - 16 - hs}" width="${bw / 2 - 3}" height="${hs}" fill="#ff6a3d" rx="2"><title>${s.day} 완료 세션 ${s.sessions}</title></rect>
        <rect x="${x + bw / 2}" y="${H - 16 - hu}" width="${bw / 2 - 3}" height="${hu}" fill="#6fc7b4" rx="2"><title>${s.day} 가입 ${s.signups}</title></rect>
        ${i % 2 === 0 ? `<text x="${x + bw / 2}" y="${H - 3}" text-anchor="middle">${s.day.slice(5)}</text>` : ""}`;
    }).join("");
    return `
      <h2>운영 현황</h2>
      <div class="kpis">
        <div class="kpi"><b>${o.users}</b><span>전체 회원 · 7일 가입 ${o.signups7}</span></div>
        <div class="kpi"><b>${o.activeUsers7}</b><span>7일 활성 회원</span></div>
        <div class="kpi"><b>${o.sessions7}</b><span>7일 완료 세션</span></div>
        <div class="kpi"><b>${o.premiumUsers}</b><span>프리미엄 · 전환율 ${(o.conversion * 100).toFixed(1)}%</span></div>
        <div class="kpi"><b>${won(o.revenue30)}</b><span>30일 순매출${o.testPayments30 ? ` · 테스트 ${o.testPayments30}건 포함` : ""}</span></div>
        <div class="kpi"><b>${won(o.refunds30)}</b><span>30일 환불 ${o.refundCount30}건</span></div>
        <div class="kpi"><b>${o.checkouts30}</b><span>30일 결제 시도</span></div>
        <div class="kpi ${o.errors7 ? "alert" : ""}"><b>${o.errors7}</b><span>7일 오류</span></div>
        <div class="kpi ${o.openInquiries ? "alert" : ""}"><b>${o.openInquiries}</b><span>답변 대기 문의</span></div>
      </div>
      <section class="panel"><h3>최근 14일</h3>
        <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 14일 완료 세션과 가입 수">${bars}</svg>
        <div class="legend"><span><i style="background:#ff6a3d"></i>완료 세션</span><span><i style="background:#6fc7b4"></i>가입</span><span>최대 ${max}</span></div>
      </section>`;
  },

  async users() {
    const q = views.users.q || "";
    const r = await api("GET", "/api/admin/users?q=" + encodeURIComponent(q));
    return `
      <h2>회원</h2>
      <form class="toolbar" id="userSearch"><input id="uq" type="search" placeholder="이메일·이름 검색" value="${esc(q)}" aria-label="회원 검색"><button class="sec">검색</button></form>
      ${table(["ID", "이메일", "요금제", "오늘 사용", "상태", "가입"], r.items.map(u => `<tr class="click" data-user="${u.id}">
        <td>${u.id}</td><td>${esc(u.email)}${u.role === "admin" ? " " + chip("test", "관리자") : ""}${u.email.endsWith("@demo.soomgyeol") ? " " + chip("test", "데모") : ""}</td>
        <td>${chip(u.plan, L[u.plan])}${u.planSource === "grant" ? " (수동)" : ""}</td><td>${u.usedToday}</td><td>${chip(u.status, u.status === "active" ? "정상" : L[u.status])}</td><td>${dt(u.created_at)}</td></tr>`))}`;
  },

  async user(id) {
    const r = await api("GET", "/api/admin/users/" + id);
    const u = r.user, e = r.entitlement;
    return `
      <div class="toolbar"><button class="sec" data-go="users">← 회원 목록</button></div>
      <h2>${esc(u.email)}</h2>
      <div class="kpis">
        <div class="kpi"><b>${L[e.plan]}</b><span>${e.source === "grant" ? "수동 이용권" : e.source === "subscription" ? "구독" : "결제 없음"}${e.until ? ` · ${dt(e.until)}까지` : ""}</span></div>
        <div class="kpi"><b>${r.usage.used}/${r.usage.limit}</b><span>오늘 사용 (${r.usage.day})</span></div>
        <div class="kpi"><b>${chip(u.status, u.status === "active" ? "정상" : "정지")}</b><span>가입 ${dt(u.created_at)}</span></div>
      </div>
      <div class="row-actions">
        <button class="btn" data-act="grant" data-id="${u.id}">프리미엄 지급</button>
        <button class="sec" data-act="reset" data-id="${u.id}">오늘 사용량 초기화</button>
        <button class="sec bad" data-act="status" data-id="${u.id}" data-status="${u.status === "active" ? "suspended" : "active"}">${u.status === "active" ? "이용 정지" : "정지 해제"}</button>
      </div>
      <div class="grid2">
        <section class="panel"><h3>수동 이용권</h3>${table(["기간", "사유", "상태", ""], r.grants.map(g => `<tr><td>${dt(g.starts_at)} ~ ${dt(g.ends_at)}</td><td>${esc(g.reason)}</td>
          <td>${g.revoked_at ? chip("expired", "회수") : g.ends_at > Date.now() ? chip("active", "유효") : chip("expired", "만료")}</td>
          <td>${!g.revoked_at && g.ends_at > Date.now() ? `<button class="sec bad" data-act="revoke" data-id="${g.id}">회수</button>` : ""}</td></tr>`))}</section>
        <section class="panel"><h3>구독</h3>${table(["주기", "상태", "기간 끝", ""], r.subscriptions.map(s => `<tr><td>${s.cycle === "yearly" ? "연간" : "월간"}${s.is_test ? " " + chip("test", "테스트") : ""}</td><td>${chip(s.status, L[s.status])}</td><td>${dt(s.current_period_end)}</td><td>${simButtons(s)}</td></tr>`))}</section>
        <section class="panel"><h3>결제</h3>${table(["일시", "금액", "상태", ""], r.payments.map(p => `<tr><td>${dt(p.created_at)}</td><td>${won(p.amount)}</td><td>${chip(p.status, L[p.status])}</td><td>${p.status === "paid" ? `<button class="sec bad" data-act="refund" data-id="${p.id}">환불</button>` : ""}</td></tr>`))}</section>
        <section class="panel"><h3>최근 호흡 <small class="muted">(메모는 개인정보 보호로 표시하지 않음)</small></h3>${table(["일시", "호흡", "상태", "초"], r.sessions.map(s => `<tr><td>${dt(s.started_at)}</td><td>${PN[s.pattern]}</td><td>${s.status}</td><td>${s.actual_sec}</td></tr>`))}</section>
      </div>`;
  },

  async payments() {
    const r = await api("GET", "/api/admin/payments");
    return `
      <h2>결제·구독</h2>
      <section class="panel"><h3>구독</h3>${table(["ID", "회원", "주기", "상태", "기간", "해지 예약", "테스트 도구"], r.subscriptions.map(s => `<tr>
        <td>${s.id}</td><td>${esc(s.email || "(탈퇴)")}</td><td>${s.cycle === "yearly" ? "연간" : "월간"}${s.is_test ? " " + chip("test", "테스트") : ""}</td><td>${chip(s.status, L[s.status])}</td>
        <td>${dt(s.current_period_start)} ~ ${dt(s.current_period_end)}</td><td>${s.cancel_at_period_end ? "예" : ""}</td><td>${simButtons(s)}</td></tr>`))}</section>
      <section class="panel"><h3>결제 내역</h3>${table(["ID", "회원", "주문번호", "종류", "금액", "상태", "일시", ""], r.payments.map(p => `<tr>
        <td>${p.id}</td><td>${esc(p.email || "(탈퇴)")}</td><td><code>${esc(p.order_id)}</code></td><td>${p.kind === "renewal" ? "갱신" : "첫 결제"}${p.is_test ? " " + chip("test", "테스트") : ""}</td>
        <td>${won(p.amount)}</td><td>${chip(p.status, L[p.status])}</td><td>${dt(p.created_at)}</td><td>${p.status === "paid" ? `<button class="sec bad" data-act="refund" data-id="${p.id}">환불</button>` : ""}</td></tr>`))}</section>
      <section class="panel"><h3>결제 알림(웹훅) 처리 기록</h3>${table(["수신", "종류", "결과", "이벤트 ID"], r.webhooks.map(w => `<tr><td>${dt(w.received_at)}</td><td>${esc(w.type)}</td><td>${chip(w.result || "", w.result)}</td><td><code>${esc(w.event_id)}</code></td></tr>`))}</section>`;
  },

  async usage() {
    const r = await api("GET", "/api/admin/usage");
    return `
      <h2>사용량·원가</h2>
      <section class="panel"><h3>처리 원가</h3><p>세션당 외부 처리 비용 ${won(r.cost.perSession)}. ${esc(r.cost.note)}</p></section>
      <div class="grid2">
        <section class="panel"><h3>최근 30일 호흡법별</h3>${table(["호흡법", "시작", "완료", "총 시간"], r.byPattern.map(p => `<tr><td>${PN[p.pattern]}</td><td>${p.sessions}</td><td>${p.completed}</td><td>${Math.round(p.sec / 60)}분</td></tr>`))}</section>
        <section class="panel"><h3>무료 한도 도달 (3회 이상)</h3>${table(["회원", "날짜", "횟수"], r.limitHits.map(x => `<tr><td>${esc(x.email)}</td><td>${x.day}</td><td>${x.used}</td></tr>`))}</section>
        <section class="panel"><h3>남용 의심 (상한의 80% 이상)</h3>${table(["회원", "날짜", "횟수"], r.heavy.map(x => `<tr><td>${esc(x.email)}</td><td>${x.day}</td><td>${x.used}</td></tr>`))}</section>
      </div>`;
  },

  async content() {
    const r = await api("GET", "/api/admin/content");
    return `
      <h2>공지·FAQ</h2>
      <section class="panel"><h3>새로 쓰기 / 수정</h3>
        <form class="form" id="contentForm">
          <input type="hidden" name="id">
          <label for="cKind">종류</label><select id="cKind" name="kind"><option value="faq">FAQ (고객지원 페이지)</option><option value="notice">공지 (앱 내 정보)</option></select>
          <label for="cTitle">제목</label><input id="cTitle" name="title" required>
          <label for="cBody">내용</label><textarea id="cBody" name="body" rows="4" required></textarea>
          <label for="cSort">정렬 순서 (작을수록 위)</label><input id="cSort" name="sort" type="number" value="0">
          <label><input type="checkbox" name="published" checked> 공개</label>
          <div class="row-actions"><button class="btn">저장</button><button class="sec" type="reset">새로 쓰기</button></div>
        </form></section>
      <section class="panel">${table(["종류", "제목", "공개", "순서", ""], r.items.map(c => `<tr><td>${c.kind === "faq" ? "FAQ" : "공지"}</td><td>${esc(c.title)}</td><td>${c.published ? "공개" : "비공개"}</td><td>${c.sort}</td>
        <td class="row-actions"><button class="sec" data-edit='${esc(JSON.stringify(c))}'>수정</button><button class="sec bad" data-act="delcontent" data-id="${c.id}">삭제</button></td></tr>`))}</section>`;
  },

  async inquiries() {
    const r = await api("GET", "/api/admin/inquiries");
    return `<h2>문의</h2>${table(["접수", "회원", "제목·내용", "상태", ""], r.items.map(q => `<tr>
      <td>${dt(q.created_at)}</td><td>${esc(q.email)}</td><td class="wrap"><b>${esc(q.subject)}</b>\n${esc(q.body)}${q.answer ? `\n\n<span class="muted">답변: ${esc(q.answer)}</span>` : ""}</td>
      <td>${chip(q.status, L[q.status])}</td><td><button class="sec" data-act="answer" data-id="${q.id}" data-answer="${esc(q.answer || "")}">답변·상태</button></td></tr>`))}`;
  },

  async audit() {
    const r = await api("GET", "/api/admin/audit");
    return `<h2>운영 기록</h2><p class="muted">관리자가 바꾼 이용권·사용량·환불·콘텐츠와 그 사유</p>${table(["일시", "관리자", "작업", "대상", "사유", "내용"], r.items.map(a => `<tr>
      <td>${dt(a.created_at)}</td><td>${esc(a.admin_email || a.admin_id)}</td><td>${esc(a.action)}</td><td>${esc(a.target_type)} ${esc(a.target_id)}</td><td>${esc(a.reason || "")}</td><td><code>${esc(a.detail || "")}</code></td></tr>`))}`;
  },

  async errors() {
    const r = await api("GET", "/api/admin/errors");
    return `<h2>오류</h2><p class="muted">사용자 메모 등 민감한 내용은 기록하지 않습니다.</p>${table(["일시", "출처", "메시지", "경로"], r.items.map(e => `<tr><td>${dt(e.created_at)}</td><td>${esc(e.source)}</td><td class="wrap">${esc(e.message)}</td><td>${esc(e.path || "")}</td></tr>`))}`;
  },

  async outbox() {
    const r = await api("GET", "/api/admin/outbox");
    return `<h2>메일함</h2><p class="muted">메일 발송 서비스가 아직 연결되지 않아, 보내야 할 메일(비밀번호 재설정, 문의 답변)을 여기에 모아 둡니다.</p>
      ${table(["일시", "받는 사람", "제목", "내용"], r.items.map(m => `<tr><td>${dt(m.created_at)}</td><td>${esc(m.to_email)}</td><td>${esc(m.subject)}</td><td class="wrap">${esc(m.body)}</td></tr>`))}`;
  },
};

function simButtons(s) {
  if (!s.is_test || ["refunded", "expired"].includes(s.status)) return "";
  return `<span class="row-actions"><button class="sec" data-act="sim" data-sim="renew" data-id="${s.id}">갱신 성공</button>
    <button class="sec" data-act="sim" data-sim="renew_fail" data-id="${s.id}">갱신 실패</button>
    <button class="sec bad" data-act="sim" data-sim="expire" data-id="${s.id}">만료</button></span>`;
}

/* ───────── 동작 ───────── */
let current = "overview", currentUser = null;
async function show(tab, userId) {
  current = tab; currentUser = userId || null;
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === (tab === "user" ? "users" : tab) ? "page" : "false"));
  $("main").innerHTML = `<p class="muted">불러오는 중…</p>`;
  try {
    $("main").innerHTML = await (tab === "user" ? views.user(userId) : views[tab]());
    if (tab !== "user") history.replaceState(null, "", "#" + tab);
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      $("tabs").hidden = true;
      $("main").innerHTML = `<div class="denied"><h2>${e.status === 401 ? "로그인이 필요합니다" : "관리자 권한이 없습니다"}</h2><p class="muted">${esc(e.message)}</p><a href="/app#login">앱에서 로그인</a></div>`;
    } else $("main").innerHTML = `<p class="err">${esc(e.message)}</p><button class="sec" data-go="${tab}">다시 불러오기</button>`;
  }
}
const reload = () => show(current, currentUser);

document.addEventListener("click", async e => {
  const t = e.target.closest("button, tr[data-user]");
  if (!t) return;
  if (t.matches("#tabs button")) return show(t.dataset.tab);
  if (t.dataset.go) return show(t.dataset.go);
  if (t.dataset.user) return show("user", t.dataset.user);
  if (t.dataset.edit) {
    const c = JSON.parse(t.dataset.edit), f = $("contentForm");
    f.id.value = c.id; f.kind.value = c.kind; f.title.value = c.title; f.body.value = c.body; f.sort.value = c.sort; f.published.checked = !!c.published;
    f.scrollIntoView({ behavior: "smooth" }); return;
  }
  const act = t.dataset.act, id = t.dataset.id;
  if (!act) return;
  try {
    let v;
    if (act === "grant") {
      v = await ask("프리미엄 수동 지급", `<label for="dlgDays">기간(일)</label><input id="dlgDays" name="days" type="number" min="1" max="3650" value="30" required>`);
      if (v) { await api("POST", `/api/admin/users/${id}/grant`, v); toast("지급했어요."); }
    } else if (act === "revoke") {
      v = await ask("수동 이용권 회수"); if (v) { await api("POST", `/api/admin/grants/${id}/revoke`, v); toast("회수했어요."); }
    } else if (act === "reset") {
      v = await ask("오늘 사용량 초기화"); if (v) { await api("POST", `/api/admin/users/${id}/usage-reset`, v); toast("초기화했어요."); }
    } else if (act === "status") {
      v = await ask(t.dataset.status === "suspended" ? "이용 정지" : "정지 해제"); if (v) { await api("POST", `/api/admin/users/${id}/status`, { ...v, status: t.dataset.status }); toast("변경했어요."); }
    } else if (act === "refund") {
      v = await ask("환불 (테스트 결제)", `<p class="muted">환불하면 해당 결제로 받은 프리미엄이 즉시 종료됩니다.</p>`);
      if (v) { const r = await api("POST", `/api/admin/payments/${id}/refund`, v); toast("환불 처리: " + r.result); }
    } else if (act === "sim") {
      v = await ask({ renew: "갱신 성공 시뮬레이션", renew_fail: "갱신 실패 시뮬레이션", expire: "만료 시뮬레이션" }[t.dataset.sim]);
      if (v) { const r = await api("POST", `/api/admin/subscriptions/${id}/simulate`, { ...v, action: t.dataset.sim }); toast("처리 결과: " + r.result); }
    } else if (act === "delcontent") {
      v = await ask("이 글을 삭제할까요?", "", false); if (v) { await api("DELETE", `/api/admin/content/${id}`); toast("삭제했어요."); }
    } else if (act === "answer") {
      v = await ask("문의 답변", `<label for="dlgAns">답변 (저장하면 회원 메일함으로 보냅니다)</label><textarea id="dlgAns" name="answer" rows="4">${esc(t.dataset.answer)}</textarea>
        <label for="dlgSt">상태</label><select id="dlgSt" name="status"><option value="answered">답변 완료</option><option value="open">답변 대기</option><option value="closed">종료</option></select>`, false);
      if (v) { await api("POST", `/api/admin/inquiries/${id}`, v); toast("저장했어요."); }
    }
    if (v) reload();
  } catch (err) { toast(err.message); }
});

document.addEventListener("submit", async e => {
  if (e.target.id === "userSearch") { e.preventDefault(); views.users.q = $("uq").value.trim(); show("users"); }
  if (e.target.id === "contentForm") {
    e.preventDefault();
    const f = e.target;
    try {
      await api("POST", "/api/admin/content", { id: f.id.value || undefined, kind: f.kind.value, title: f.title.value, body: f.body.value, sort: f.sort.value, published: f.published.checked });
      toast("저장했어요."); reload();
    } catch (err) { toast(err.message); }
  }
});

show((location.hash.slice(1) && views[location.hash.slice(1)]) ? location.hash.slice(1) : "overview");
})();
