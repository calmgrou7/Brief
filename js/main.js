(function () {
  var S = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1. 설정값 바인딩 */
  $$("[data-bind]").forEach(function (el) {
    var k = el.getAttribute("data-bind"), v = S[k];
    if (k === "tel") {
      el.href = "tel:" + String(S.tel || "").replace(/[^0-9+]/g, "");
      if (!el.classList.contains("dock__btn")) el.textContent = S.tel;
      return;
    }
    if (k === "kakao") {
      if (S.kakao) el.href = S.kakao; else el.href = "#contact";
      return;
    }
    if (v) el.textContent = v;
  });

  /* 2. 헤더 / 모바일 메뉴 */
  var hd = $(".hd"), burger = $(".burger"), gnb = $(".gnb");
  addEventListener("scroll", function () { hd.classList.toggle("is-scrolled", scrollY > 10); }, { passive: true });
  burger.addEventListener("click", function () {
    var open = gnb.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
  });
  $$(".gnb a").forEach(function (a) { a.addEventListener("click", function () { gnb.classList.remove("is-open"); burger.setAttribute("aria-expanded", false); }); });

  /* 3. 제품 탭 */
  $$(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      $$(".tab").forEach(function (x) { x.classList.toggle("is-on", x === t); });
      $$("[data-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t.getAttribute("data-tab"); });
    });
  });

  /* 4. 시공사례 */
  var grad = { home: "linear-gradient(135deg,#8a7a63,#c2ab88)", shop: "linear-gradient(135deg,#5f8090,#a9c3cc)", sun: "linear-gradient(135deg,#4d5a4b,#8d9c88)" };
  var label = { home: "주택 · 아파트", shop: "카페 · 상가", sun: "썬룸" };
  var grid = $("#caseGrid");
  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function render(f) {
    grid.innerHTML = (window.CASES || []).filter(function (c) { return f === "all" || c.type === f; }).map(function (c) {
      return '<article class="case"><div class="case__img" style="background:' + grad[c.type] + '">' +
        '<span class="case__tag">' + label[c.type] + '</span>' +
        (c.img ? '<img loading="lazy" src="' + esc(c.img) + '" alt="' + esc(c.title) + '">' : "시공 사진") +
        '</div><div class="case__body"><h3>' + esc(c.title) + '</h3><p>' + esc(c.place) + '</p></div></article>';
    }).join("");
  }
  render("all");
  $$(".chip").forEach(function (c) {
    c.addEventListener("click", function () {
      $$(".chip").forEach(function (x) { x.classList.toggle("is-on", x === c); });
      render(c.getAttribute("data-f"));
    });
  });

  /* 5. 견적 문의 폼 → Supabase 자동 접수 */
  var form = $("#leadForm"), msg = $(".form__msg", form);
  function say(t, cls) { msg.textContent = t; msg.className = "form__msg " + (cls || ""); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    $$(".is-invalid", form).forEach(function (x) { x.classList.remove("is-invalid"); });
    var fd = new FormData(form);
    var phone = String(fd.get("phone") || "").replace(/[^0-9]/g, "");
    var bad = [];
    if (!String(fd.get("name") || "").trim()) bad.push(form.name);
    if (phone.length < 9) bad.push(form.phone);
    if (bad.length) { bad.forEach(function (x) { x.classList.add("is-invalid"); }); bad[0].focus(); return say("이름과 연락처를 확인해주세요.", "err"); }
    if (!form.agree.checked) return say("개인정보 수집 · 이용에 동의해주세요.", "err");

    var lead = {
      name: String(fd.get("name")).trim(),
      phone: phone,
      region: fd.get("region") || null,
      products: fd.getAll("product"),
      space: fd.get("space") || null,
      timing: fd.get("timing") || null,
      message: fd.get("message") || null,
      source: location.hostname || "local",
      utm: location.search || null
    };

    if (!S.supabaseUrl || !S.supabaseKey) {
      console.info("[데모 모드] 접수 데이터:", lead);
      form.reset();
      return say("데모 모드: 신청 화면 테스트가 완료되었습니다. (실제 전송은 연동 후)", "ok");
    }

    var btn = $("button[type=submit]", form);
    btn.disabled = true; say("접수 중입니다…");
    fetch(S.supabaseUrl.replace(/\/$/, "") + "/rest/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: S.supabaseKey, Authorization: "Bearer " + S.supabaseKey, Prefer: "return=minimal" },
      body: JSON.stringify(lead)
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      form.reset(); say("신청이 접수되었습니다. 곧 연락드리겠습니다.", "ok");
    }).catch(function () {
      say("전송에 실패했습니다. 전화(" + S.tel + ")로 문의해주세요.", "err");
    }).then(function () { btn.disabled = false; });
  });

  /* 6. 스크롤 등장 효과 */
  var els = $$(".sec__head, .pcard, .why__item, .steps li, .contact__info, .form");
  els.forEach(function (el) { el.classList.add("rv"); });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("in"); });
})();
