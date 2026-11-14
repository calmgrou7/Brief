/* Stay B shared script (index.html + partners.html):
   language switch, notice bar, header, mobile menu, smooth anchors, toast, demo-form helpers.
   Demo principle: nothing typed into a form is sent, stored or logged.
   Storage: only the chosen language (localStorage), the closed notice bar (sessionStorage)
   and, on the home page, the last stage tab. All wrapped in try/catch. */
(function(){
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  /* All strings created by script live here. Static copy in the HTML uses data-l="en|ko" spans.
     To add Nepali: add an "ne" block with the same keys, data-l="ne" spans in the HTML,
     one CSS line in site.css (language section), and enable the नेपाली button. */
  var LANGS = ["en", "ko"];
  var i18n = {
    en: {
      required: "Please fill this in.",
      choose: "Please choose one.",
      email: "Please enter a valid email address.",
      consent: "Please check this box to continue.",
      idWarn: "This looks like an ID number. Please remove it.",
      toastGuide: "This full guide is being checked by a qualified administrative agent. Need help now? Ask us.",
      toastGuideLink: "Ask us",
      toastDates: "Demo: dates will be shared when the service starts.",
      toastCommunity: "Demo: community links will be added when the service starts.",
      tbc: "to be confirmed",
      daysLeft: "{n} days left",
      dayLeft: "1 day left",
      prepare: "Start preparing now",
      past: "This date has already passed. Please talk to a qualified administrative agent as soon as possible.",
      today: "Your stay expiry date is today. Please talk to a qualified administrative agent as soon as possible."
    },
    ko: {
      required: "입력해 주세요.",
      choose: "하나를 선택해 주세요.",
      email: "올바른 이메일 주소를 입력해 주세요.",
      consent: "동의 항목에 체크해 주세요.",
      idWarn: "신분증 번호처럼 보여요. 지워 주세요.",
      toastGuide: "자세한 가이드는 자격 있는 행정사가 감수 중이에요. 지금 도움이 필요하면 질문을 남겨 주세요.",
      toastGuideLink: "질문하기",
      toastDates: "데모입니다. 일정은 서비스 시작 때 안내해요.",
      toastCommunity: "데모입니다. 커뮤니티 링크는 서비스 시작 때 연결돼요.",
      tbc: "확인 예정",
      daysLeft: "{n}일 남았어요",
      dayLeft: "1일 남았어요",
      prepare: "지금 준비를 시작하세요",
      past: "이미 지난 날짜예요. 가능한 한 빨리 자격을 갖춘 행정사와 상담하세요.",
      today: "만료일이 오늘이에요. 가능한 한 빨리 자격을 갖춘 행정사와 상담하세요."
    }
  };
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function fill(s, vars){ return vars ? s.replace(/\{(\w+)\}/g, function(m,k){ return vars[k] != null ? vars[k] : m; }) : s; }
  /* body-copy span pair that follows the switch */
  function bi(key, vars){ return LANGS.map(function(l){ return '<span data-l="'+l+'" lang="'+l+'">'+fill(i18n[l][key], vars)+'</span>'; }).join(""); }
  function biText(en, ko){ return '<span data-l="en" lang="en">'+en+'</span><span data-l="ko" lang="ko">'+ko+'</span>'; }
  /* title/button pair: both always visible, current language big */
  function pair(en, ko, cls){ return '<span class="pair'+(cls?' '+cls:'')+'"><span lang="en">'+en+'</span><span lang="ko">'+ko+'</span></span>'; }

  /* ---------- language ---------- */
  var langBtns = document.querySelectorAll("[data-set-lang]");
  var langListeners = [];
  function setLang(l){
    if(LANGS.indexOf(l) < 0) l = "en";
    doc.lang = l;
    langBtns.forEach(function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === l)); });
    document.querySelectorAll("[data-label-en]").forEach(function(el){
      var v = el.getAttribute("data-label-"+l) || el.getAttribute("data-label-en");
      el.setAttribute("aria-label", v);
    });
    try{ localStorage.setItem("stayb-lang", l); }catch(e){}
    langListeners.forEach(function(fn){ fn(l); });
  }
  function getLang(){ return doc.lang === "ko" ? "ko" : "en"; }
  var saved = null;
  try{ saved = localStorage.getItem("stayb-lang"); }catch(e){}
  setLang(saved === "ko" ? "ko" : "en");
  langBtns.forEach(function(b){ b.addEventListener("click", function(){ setLang(b.getAttribute("data-set-lang")); }); });

  /* ---------- notice bar ---------- */
  var bar = document.getElementById("concept-bar");
  if(bar){
    try{ if(sessionStorage.getItem("stayb-bar") === "closed") bar.hidden = true; }catch(e){}
    var cbClose = document.getElementById("cb-close");
    if(cbClose) cbClose.addEventListener("click", function(){
      bar.hidden = true;
      try{ sessionStorage.setItem("stayb-bar", "closed"); }catch(e){}
      var b = document.querySelector(".site-header .brand"); if(b) b.focus();
    });
  }

  /* ---------- header line on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScrollHeader(){ if(header) header.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScrollHeader, {passive:true});
  onScrollHeader();

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

  /* ---------- smooth scroll helper ---------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  function scrollToEl(el, focus){
    if(!el) return;
    el.scrollIntoView({behavior: reduce.matches ? "auto" : "smooth", block:"start"});
    if(focus){
      if(!el.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName)) el.setAttribute("tabindex","-1");
      el.focus({preventScroll:true});
    }
  }

  /* ---------- toast ---------- */
  var toast = document.getElementById("toast"), toastTimer;
  function showToast(key, linkKey, href){
    if(!toast) return;
    var html = bi(key);
    if(linkKey && href) html += ' <a href="'+href+'" data-toast-link>'+bi(linkKey)+'</a>';
    toast.innerHTML = html;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4000);
  }
  function hideToast(){ if(!toast) return; toast.classList.remove("show"); toastTimer = setTimeout(function(){ toast.innerHTML = ""; }, 200); }
  if(toast){
    /* keep the toast while the pointer or keyboard is on its link */
    toast.addEventListener("focusin", function(){ clearTimeout(toastTimer); });
    toast.addEventListener("focusout", function(){ toastTimer = setTimeout(hideToast, 1500); });
    toast.addEventListener("click", function(e){ if(e.target.closest("[data-toast-link]")) hideToast(); });
  }
  document.addEventListener("click", function(e){
    var t = e.target.closest("[data-toast]");
    if(!t) return;
    e.preventDefault();
    var k = t.getAttribute("data-toast");
    if(k === "guide") showToast("toastGuide", "toastGuideLink", "#ask");
    else if(k === "dates") showToast("toastDates");
    else showToast("toastCommunity");
  });

  /* ---------- form helpers (no network, no storage, no console) ---------- */
  function setErr(input, errEl, key){
    if(!errEl) return;
    if(key){ errEl.innerHTML = bi(key); errEl.hidden = false; if(input) input.setAttribute("aria-invalid","true"); }
    else { errEl.innerHTML = ""; errEl.hidden = true; if(input) input.removeAttribute("aria-invalid"); }
  }
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function checkText(input, errEl){
    var v = input.value.trim();
    if(input.required && !v){ setErr(input, errEl, "required"); return false; }
    if(input.type === "email" && v && !emailRe.test(v)){ setErr(input, errEl, "email"); return false; }
    setErr(input, errEl, null); return true;
  }
  function parseDate(v){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); if(!m) return null; var d = new Date(+m[1], +m[2]-1, +m[3]); return isNaN(d) ? null : d; }
  function daysUntil(d){ var t = new Date(); t = new Date(t.getFullYear(), t.getMonth(), t.getDate()); return Math.round((d - t) / 86400000); }

  window.StayB = {
    i18n:i18n, LANGS:LANGS, esc:esc, bi:bi, biText:biText, pair:pair,
    setLang:setLang, getLang:getLang, onLang:function(fn){ langListeners.push(fn); },
    setErr:setErr, checkText:checkText, showToast:showToast, scrollToEl:scrollToEl,
    parseDate:parseDate, daysUntil:daysUntil, reduceMotion:reduce
  };
})();
