/* Stay B shared script: language switch, notice bar, mobile menu, toast, demo-form helpers.
   Demo principle: nothing typed into a form is sent, stored or logged. */
(function(){
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  /* Strings created by script. Body copy in the HTML uses data-l="en|ko" spans.
     To add Nepali later: add an "ne" key here and data-l="ne" spans in the HTML. */
  var i18n = {
    en: {
      required: "Please fill this in.",
      choose: "Please choose one.",
      email: "Please enter a valid email address.",
      consent: "Please check this box to continue.",
      idWarn: "This looks like an ID number. Please remove it.",
      toast: "Demo: the community link will be added when the service launches."
    },
    ko: {
      required: "입력해 주세요.",
      choose: "하나를 선택해 주세요.",
      email: "올바른 이메일 주소를 입력해 주세요.",
      consent: "동의 항목에 체크해 주세요.",
      idWarn: "신분증 번호처럼 보여요. 지워 주세요.",
      toast: "데모입니다. 커뮤니티 링크는 서비스 시작 때 연결됩니다."
    }
  };
  function bi(key){ return '<span data-l="en" lang="en">'+i18n.en[key]+'</span><span data-l="ko" lang="ko">'+i18n.ko[key]+'</span>'; }
  function biText(en, ko){ return '<span data-l="en" lang="en">'+en+'</span><span data-l="ko" lang="ko">'+ko+'</span>'; }
  function pair(en, ko){ return '<span class="pair"><span lang="en">'+en+'</span><span lang="ko">'+ko+'</span></span>'; }

  /* ---------- language ---------- */
  var langBtns = document.querySelectorAll("[data-set-lang]");
  function setLang(l){
    if(!i18n[l]) l = "en";
    doc.lang = l;
    langBtns.forEach(function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === l)); });
    try{ localStorage.setItem("stayb-lang", l); }catch(e){}
  }
  var saved = null;
  try{ saved = localStorage.getItem("stayb-lang"); }catch(e){}
  setLang(saved === "ko" ? "ko" : "en");
  langBtns.forEach(function(b){ b.addEventListener("click", function(){ setLang(b.getAttribute("data-set-lang")); }); });

  /* ---------- notice bar ---------- */
  var bar = document.getElementById("concept-bar");
  if(bar){
    try{ if(sessionStorage.getItem("stayb-bar") === "closed") bar.hidden = true; }catch(e){}
    document.getElementById("cb-close").addEventListener("click", function(){
      bar.hidden = true;
      try{ sessionStorage.setItem("stayb-bar", "closed"); }catch(e){}
      document.querySelector(".logo").focus();
    });
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = document.getElementById("menu-btn"), mnav = document.getElementById("mobile-nav");
  if(menuBtn && mnav){
    var closeMenu = function(focusBtn){ mnav.hidden = true; menuBtn.setAttribute("aria-expanded","false"); if(focusBtn) menuBtn.focus(); };
    menuBtn.addEventListener("click", function(){
      var open = mnav.hidden; mnav.hidden = !open; menuBtn.setAttribute("aria-expanded", String(open));
      if(open){ var a = mnav.querySelector("a"); if(a) a.focus(); }
    });
    mnav.addEventListener("click", function(e){ if(e.target.closest("a")) closeMenu(false); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape" && !mnav.hidden) closeMenu(true); });
  }

  /* ---------- toast ---------- */
  var toast = document.getElementById("toast"), toastTimer;
  function showToast(key){
    if(!toast) return;
    toast.innerHTML = bi(key);
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove("show"); toast.innerHTML = ""; }, 3000);
  }
  document.querySelectorAll(".demo-link").forEach(function(b){ b.addEventListener("click", function(){ showToast("toast"); }); });

  /* ---------- form helpers (no network, no storage, no console) ---------- */
  function setErr(input, errEl, key){
    if(key){ errEl.innerHTML = bi(key); errEl.hidden = false; if(input) input.setAttribute("aria-invalid","true"); }
    else { errEl.innerHTML = ""; errEl.hidden = true; if(input) input.removeAttribute("aria-invalid"); }
  }
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function checkText(input, errEl){
    var v = input.value.trim();
    if(input.required && !v){ setErr(input, errEl, "required"); return false; }
    if(input.type === "email" && v && (!emailRe.test(v) || !input.checkValidity())){ setErr(input, errEl, "email"); return false; }
    setErr(input, errEl, null); return true;
  }

  window.StayB = { i18n:i18n, bi:bi, biText:biText, pair:pair, setErr:setErr, checkText:checkText, showToast:showToast };
})();
