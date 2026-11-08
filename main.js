(function () {
  var cfg = window.DOIT_CONFIG || {};

  // 연도 / 문의 이메일
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  if (cfg.CONTACT_EMAIL) {
    var link = document.getElementById("contact-link");
    link.href = "mailto:" + cfg.CONTACT_EMAIL;
    link.textContent = cfg.CONTACT_EMAIL;
    document.getElementById("contact").hidden = false;
  }

  // 스크롤 시 내비게이션 그림자
  var nav = document.querySelector(".nav");
  var onScroll = function () {
    nav.classList.toggle("nav--scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // 등장 애니메이션
  var targets = document.querySelectorAll(".card, .step, .waitlist__box, details");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach(function (el) {
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  // 사전등록 폼
  var form = document.getElementById("waitlist-form");
  var msg = document.getElementById("form-msg");
  var btn = form.querySelector("button[type=submit]");

  function show(text, ok) {
    msg.textContent = text;
    msg.className = "form__msg " + (ok ? "is-ok" : "is-err");
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      use: form.use.value,
      consent: form.consent.checked,
      source: location.href,
      createdAt: new Date().toISOString(),
    };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      show("이메일 주소를 확인해 주세요.", false);
      form.email.focus();
      return;
    }
    if (!data.consent) {
      show("개인정보 수집에 동의해 주세요.", false);
      return;
    }

    btn.disabled = true;
    btn.textContent = "등록 중…";

    var done = function () {
      form.reset();
      show("🎉 사전등록 완료! 출시 소식을 가장 먼저 보내 드릴게요.", true);
      btn.disabled = false;
      btn.textContent = "사전등록 하기";
    };
    var fail = function () {
      show("일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.", false);
      btn.disabled = false;
      btn.textContent = "사전등록 하기";
    };

    if (!cfg.FORM_ENDPOINT) {
      // 데모 모드: 브라우저에만 저장
      try {
        var list = JSON.parse(localStorage.getItem("doit_waitlist") || "[]");
        list.push(data);
        localStorage.setItem("doit_waitlist", JSON.stringify(list));
      } catch (e) {}
      setTimeout(done, 400);
      return;
    }

    var isAppsScript = /script\.google\.com/.test(cfg.FORM_ENDPOINT);
    fetch(cfg.FORM_ENDPOINT, isAppsScript
      ? {
          // Apps Script는 CORS 응답을 주지 않으므로 no-cors + text/plain으로 전송
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data),
        }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        })
      .then(function (res) {
        if (isAppsScript || res.ok) done();
        else fail();
      })
      .catch(fail);
  });
})();
