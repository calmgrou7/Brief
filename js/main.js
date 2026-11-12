(function () {
  var S = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

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

  /* 1-1. 메인 배경: Vimeo > mp4 > 사진 켄번스 슬라이드 */
  (function () {
    var H = S.hero || {}, bg = $("#heroBg");
    if (!bg) return;
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mobile = matchMedia("(max-width: 760px)").matches;

    if (H.vimeo) {
      bg.innerHTML = '<iframe src="https://player.vimeo.com/video/' + encodeURIComponent(H.vimeo) +
        '?background=1&autoplay=1&loop=1&muted=1&playsinline=1" allow="autoplay; fullscreen" title="배경 영상"></iframe>';
      return;
    }

    var src = (mobile && H.videoMobile) || H.video;
    if (src && !reduce) {
      var v = document.createElement("video");
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      v.preload = "auto"; if (H.poster) v.poster = H.poster;
      v.src = src; bg.appendChild(v);
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      return;
    }

    var photos = (H.photos || []).filter(function (x) { return x && x.src; });
    if (!photos.length && H.poster) photos = [{ src: H.poster }];
    if (!photos.length) return;
    var sec = Math.max(3, +H.interval || 6);
    bg.style.setProperty("--kbdur", (sec + 2.5) + "s");
    bg.innerHTML = photos.map(function (ph, i) {
      return '<div class="kb"><img src="' + esc(ph.src) + '" alt="" ' + (i ? 'loading="lazy"' : 'fetchpriority="high"') + '></div>';
    }).join("");
    var slides = $$(".kb", bg), label = $("#heroLabel"), ctrl = $("#heroCtrl");
    var bar = $(".hero__bar i"), now = $("#heroNow"), cur = -1;
    $("#heroAll").textContent = ("0" + photos.length).slice(-2);
    if (photos.length > 1) ctrl.hidden = false;
    ctrl.style.setProperty("--dur", sec + "s");
    function go(n) {
      var prev = cur;
      if (prev >= 0) { slides[prev].classList.remove("on"); slides[prev].classList.add("out"); setTimeout(function () { slides[prev].classList.remove("out"); }, 1900); }
      cur = n % slides.length;
      slides[cur].classList.add("on");
      var lb = photos[cur].label; label.hidden = !lb; label.textContent = lb || "";
      now.textContent = ("0" + (cur + 1)).slice(-2);
      bar.classList.remove("run"); void bar.offsetWidth; bar.classList.add("run");
    }
    go(0);
    if (photos.length > 1 && !reduce) setInterval(function () { if (!document.hidden) go(cur + 1); }, sec * 1000);
  })();

  /* 2. 헤더 / 모바일 메뉴 */
  var hd = $(".hd"), burger = $(".burger"), gnb = $(".gnb");
  // 어두운 스택(히어로·쇼케이스) 위에서는 투명 헤더 유지, 벗어나면 밝은 헤더
  var stackEl = $(".stack");
  function hdState() {
    var past = stackEl ? stackEl.getBoundingClientRect().bottom < 70 : scrollY > 10;
    hd.classList.toggle("is-scrolled", past);
  }
  addEventListener("scroll", hdState, { passive: true });
  hdState();
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
  function render(f) {
    grid.innerHTML = (window.CASES || []).filter(function (c) { return f === "all" || c.type === f; }).map(function (c) {
      return '<article class="case"><div class="case__img" style="background:' + grad[c.type] + '">' +
        '<span class="case__tag">' + label[c.type] + '</span>' +
        (c.video ? '<video muted loop playsinline preload="none" data-src="' + esc(c.video) + '"' + (c.img ? ' poster="' + esc(c.img) + '"' : "") + '></video>'
          : c.img ? '<img loading="lazy" src="' + esc(c.img) + '" alt="' + esc(c.title) + '">' : "시공 사진") +
        '</div><div class="case__body"><h3>' + esc(c.title) + '</h3><p>' + esc(c.place) + '</p></div></article>';
    }).join("");
  }
  render("all");
  $$(".chip").forEach(function (c) {
    c.addEventListener("click", function () {
      $$(".chip").forEach(function (x) { x.classList.toggle("is-on", x === c); });
      render(c.getAttribute("data-f"));
      watchMedia();
    });
  });

  /* 4-1. 살아있는 이미지: 쇼케이스에 영상 지정 시 교체 + 화면에 보일 때만 재생 */
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  $$(".show__bg[data-video]").forEach(function (bgEl) {
    var src = bgEl.getAttribute("data-video");
    if (!src || reduceMotion) return;
    var img = $("img", bgEl);
    var v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.setAttribute("data-src", src);
    if (img) { v.poster = img.getAttribute("src"); img.remove(); }
    bgEl.appendChild(v);
  });
  var mediaIO = "IntersectionObserver" in window ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      var el = en.target, vid = $("video", el);
      el.classList.toggle("in-view", en.isIntersecting);
      if (!vid || reduceMotion) return;
      if (en.isIntersecting) {
        if (!vid.src && vid.dataset.src) vid.src = vid.dataset.src;   // 처음 보일 때 로딩
        var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {});
      } else vid.pause();
    });
  }, { rootMargin: "10% 0px" }) : null;
  function watchMedia() {
    $$(".show, .case").forEach(function (el) {
      if (mediaIO) mediaIO.observe(el); else el.classList.add("in-view");
    });
  }
  watchMedia();

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

  /* 5-1. 스티키 스택: 각 화면의 들어오는 정도(--in)와 덮이는 정도(--out) 계산 */
  (function () {
    var panes = $$(".stack > .hero, .stack > .show");
    if (!panes.length) return;
    var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var ticking = false;
    function update() {
      ticking = false;
      var vh = innerHeight;
      // 스티키라서 고정된 화면의 rect.top 은 항상 0 → 들어오는 정도는 '스택 안에서의 원래 위치'로 계산
      var stackTop = panes[0].parentNode.getBoundingClientRect().top;
      panes.forEach(function (el, i) {
        var natural = stackTop + i * vh;               // 스티키가 아니었다면 이 화면의 top
        el.style.setProperty("--in", clamp(1 - natural / vh).toFixed(3));
        el.style.setProperty("--out", clamp(-natural / vh).toFixed(3));
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
  })();

  /* 쇼케이스 '제품 보기' → 해당 제품 탭 열기 */
  $$("[data-tab-go]").forEach(function (a) {
    a.addEventListener("click", function () {
      var t = $('.tab[data-tab="' + a.getAttribute("data-tab-go") + '"]');
      if (t) t.click();
    });
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
