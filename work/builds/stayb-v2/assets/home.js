/* Stay B home page: guide hub (render + tabs + stage routing), expiry tool,
   offline/moment -> ask form preselect, demo ask form, sticky bar, page title per language.
   Demo principle: no network, no storage of what people type, no console output. */
(function(){
  "use strict";
  var S = window.StayB, D = window.STAYB_GUIDES;
  if(!S || !D) return;
  var bi = S.bi, biText = S.biText, pair = S.pair, esc = S.esc;
  var mqDesk = window.matchMedia("(min-width: 960px)");

  /* ---------- page title follows language (marketer doc 1-4) ---------- */
  var TITLES = {
    en: "Stay B · Guides & in-person help for students in Busan (Concept)",
    ko: "Stay B · 부산 유학생 정보와 직접 받는 도움 (컨셉 시안)"
  };
  function syncTitle(l){ document.title = TITLES[l] || TITLES.en; }
  syncTitle(S.getLang());
  S.onLang(syncTitle);

  /* ---------- render helpers ---------- */
  function rich(s){
    /* [[tbc]] -> chip, [[ph:...]] -> dashed placeholder chip */
    return esc(s)
      .replace(/\[\[tbc\]\]/g, function(){ return '<span class="chip chip-tbc"><svg class="ic-xs" aria-hidden="true" focusable="false"><use href="#i-clock"/></svg>'+bi("tbc")+'</span>'; })
      .replace(/\[\[ph:(.+?)\]\]\]?/g, function(m, t){ return '<span class="chip chip-ph">'+t+(m.slice(-3) === "]]]" ? "]" : "")+'</span>'; });
  }
  function both(o){ return biText(rich(o.en), rich(o.ko)); }
  function pts(card){
    var cls = card.list === "check" ? "check" : card.list === "num" ? "num" : "dot";
    var tag = card.list === "num" ? "ol" : "ul";
    function list(l){
      return '<'+tag+' class="points '+cls+'" data-l="'+l+'" lang="'+l+'">' + card.points[l].map(function(p){ return '<li>'+rich(p)+'</li>'; }).join("") + '</'+tag+'>';
    }
    return list("en") + list("ko");
  }
  var stageByKey = {};
  D.stages.forEach(function(s){ stageByKey[s.key] = s; });

  function cardHTML(c){
    var h = '<article class="card'+(c.wide ? ' wide' : '')+'" id="guide-'+c.id+'" aria-labelledby="guide-'+c.id+'-t">';
    h += '<div class="card-top"><span>'+c.id+'</span>';
    if(c.checklist) h += '<span class="chip badge-check"><svg class="ic-xs" aria-hidden="true" focusable="false"><use href="#i-check"/></svg>'+pair("Checklist","체크리스트","inline")+'</span>';
    h += '</div>';
    h += '<h3 id="guide-'+c.id+'-t">'+pair(esc(c.title.en), esc(c.title.ko))+'</h3>';
    h += '<p class="sum">'+both(c.sum)+'</p>';
    h += '<details><summary><span class="pair inline"><span lang="en">Key points</span><span lang="ko">핵심</span></span><svg class="ic chev" aria-hidden="true" focusable="false"><use href="#i-chev"/></svg></summary>';
    h += pts(c);
    if(c.tool === "expiry") h += toolHTML(c.id);
    if(c.note) h += '<p class="card-note'+(c.notePh ? ' ph' : '')+'">'+both(c.note)+'</p>';
    h += '<p class="src"><b>'+pair("Official source:","공식 출처:","inline")+'</b>'+both(c.source)+'</p>';
    h += '<div class="card-foot">';
    if(c.guideUrl) h += '<a class="link" href="'+esc(c.guideUrl)+'">'+pair("Read the full guide","자세히 보기","inline")+'</a>';
    else h += '<button class="btn-soon" type="button" data-toast="guide"><svg class="ic-s" aria-hidden="true" focusable="false"><use href="#i-clock"/></svg>'+pair("Full guide · coming soon","자세한 가이드 · 준비 중","inline")+'</button>';
    h += '</div></details></article>';
    return h;
  }
  function toolHTML(id){
    return '<div class="tool"><label for="tool-date">'+pair("How many days do I have?","며칠 남았을까?","inline")+'</label>'+
      '<input class="input" type="date" id="tool-date" aria-describedby="tool-out tool-hint">'+
      '<p class="tool-out" id="tool-out" aria-live="polite"></p>'+
      '<p class="small" id="tool-hint">'+biText("Reminders by WhatsApp or Viber are planned.","WhatsApp·Viber 알림은 준비 중이에요.")+' '+biText("Nothing you enter is saved.","입력한 날짜는 저장되지 않아요.")+'</p></div>';
  }

  /* ---------- build tabs + panels ---------- */
  var tablist = document.getElementById("stage-tabs"), panelsWrap = document.getElementById("stage-panels");
  var tabs = [], panels = [];
  D.stages.forEach(function(s, i){
    var count = D.cards.filter(function(c){ return c.stage === s.key; }).length;
    var tab = document.createElement("button");
    tab.type = "button"; tab.className = "tab"; tab.id = "tab-"+s.key;
    tab.setAttribute("role","tab"); tab.setAttribute("aria-controls","guides-"+s.key);
    tab.setAttribute("aria-selected","false"); tab.tabIndex = -1;
    tab.dataset.stage = s.key;
    tab.innerHTML = '<span class="stop" aria-hidden="true">'+s.n+'</span>'+biText(esc(s.name.en), esc(s.name.ko))+
      '<span class="n" aria-hidden="true">'+count+'</span><span class="sr-only">'+biText(", "+count+" guides", ", 정보 "+count+"개")+'</span>';
    tablist.appendChild(tab); tabs.push(tab);

    var panel = document.createElement("div");
    panel.className = "tabpanel"; panel.id = "guides-"+s.key;
    panel.setAttribute("role","tabpanel"); panel.setAttribute("aria-labelledby","tab-"+s.key);
    panel.tabIndex = 0; panel.hidden = true;
    var h = '<div class="cards">' + D.cards.filter(function(c){ return c.stage === s.key; }).map(cardHTML).join("") + '</div>';
    h += '<div class="help-row"><h3>'+pair("Help in person for this stage","이 단계에서 직접 받을 수 있는 도움")+'</h3><div class="help-chips">';
    s.help.forEach(function(x){
      var attrs = x.ask ? ' data-ask-stage="'+x.ask.stage+'" data-ask-topic="'+x.ask.topic+'"' : '';
      h += '<a class="help-chip" href="'+x.href+'"'+attrs+'><svg class="ic-s" aria-hidden="true" focusable="false"><use href="#'+(x.href === "#ask" ? "i-chat" : "i-pin")+'"/></svg>'+biText(esc(x.en), esc(x.ko))+'</a>';
    });
    h += '</div></div>';
    panel.innerHTML = h;
    panelsWrap.appendChild(panel); panels.push(panel);
  });

  /* ---------- details: collapsed on mobile, open on desktop ---------- */
  var allDetails = Array.prototype.slice.call(panelsWrap.querySelectorAll(".card details"));
  function layoutCards(){
    allDetails.forEach(function(d){
      var sum = d.querySelector("summary");
      if(mqDesk.matches){ d.open = true; sum.setAttribute("tabindex","-1"); sum.setAttribute("aria-disabled","true"); }
      else { d.open = false; sum.removeAttribute("tabindex"); sum.removeAttribute("aria-disabled"); }
    });
  }
  allDetails.forEach(function(d){
    d.querySelector("summary").addEventListener("click", function(e){ if(mqDesk.matches) e.preventDefault(); });
  });
  layoutCards();
  if(mqDesk.addEventListener) mqDesk.addEventListener("change", layoutCards); else mqDesk.addListener(layoutCards);

  /* ---------- tabs ---------- */
  var current = null;
  var savedStage = null;
  try{ savedStage = localStorage.getItem("stayb-stage"); }catch(e){}
  if(!stageByKey[savedStage]) savedStage = null;

  function selectStage(key, opts){
    opts = opts || {};
    if(!stageByKey[key]) key = "arrive";
    tabs.forEach(function(t, i){
      var on = t.dataset.stage === key;
      t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      var wasHidden = panels[i].hidden;
      panels[i].hidden = !on;
      if(on && wasHidden && !S.reduceMotion.matches){ panels[i].classList.remove("fade"); void panels[i].offsetWidth; panels[i].classList.add("fade"); }
      if(on){
        /* keep the selected chip visible in the horizontal strip (mobile) */
        var strip = tablist, tl = t.offsetLeft, tr = tl + t.offsetWidth;
        if(tl < strip.scrollLeft || tr > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = tl - 16;
      }
    });
    current = key;
    if(opts.remember){
      try{ localStorage.setItem("stayb-stage", key); }catch(e){}
      savedStage = key;
    }
    document.querySelectorAll(".stage-btn[data-stage]").forEach(function(b){ b.classList.toggle("is-picked", savedStage === b.dataset.stage); });
    syncSticky();
    return panels[D.stages.indexOf(stageByKey[key])];
  }
  tabs.forEach(function(t, i){
    t.addEventListener("click", function(){
      selectStage(t.dataset.stage, {remember:true});
      replaceHash("#guides-"+t.dataset.stage);
    });
    t.addEventListener("keydown", function(e){
      var k = e.key, n = null;
      if(k === "ArrowRight") n = (i + 1) % tabs.length;
      else if(k === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
      else if(k === "Home") n = 0;
      else if(k === "End") n = tabs.length - 1;
      if(n === null) return;
      e.preventDefault();
      tabs[n].focus();
      selectStage(tabs[n].dataset.stage, {remember:true});
      replaceHash("#guides-"+tabs[n].dataset.stage);
    });
  });
  selectStage(savedStage || "arrive");

  /* ---------- routing: #guides-<stage> and #guide-<n>-<m> ---------- */
  function replaceHash(h){ try{ history.replaceState(null, "", h); }catch(e){} }
  function flash(el){
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    setTimeout(function(){ el.classList.remove("flash"); }, 60);
  }
  function route(hash, fromClick){
    var m;
    if((m = /^#guides-(arrive|settle|life|visa)$/.exec(hash))){
      var p = selectStage(m[1], {remember:true});
      S.scrollToEl(p, true);
      return true;
    }
    if((m = /^#guide-(\d)-(\d)$/.exec(hash))){
      var card = document.getElementById("guide-"+m[1]+"-"+m[2]);
      if(!card) return false;
      var stageKey = D.stages[+m[1]-1].key;
      selectStage(stageKey, {remember:true});
      var d = card.querySelector("details"); if(d) d.open = true;
      S.scrollToEl(card, false);
      var sum = card.querySelector("summary");
      if(sum && !mqDesk.matches) sum.focus({preventScroll:true});
      else { card.setAttribute("tabindex","-1"); card.focus({preventScroll:true}); }
      flash(card);
      return true;
    }
    return false;
  }
  document.addEventListener("click", function(e){
    var a = e.target.closest('a[href^="#guide"]');
    if(!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var h = a.getAttribute("href");
    if(h === "#guides") return;
    if(route(h, true)){ e.preventDefault(); try{ history.pushState(null, "", h); }catch(err){} }
  });
  window.addEventListener("hashchange", function(){ route(location.hash); });
  window.addEventListener("popstate", function(){ route(location.hash); });
  if(location.hash) setTimeout(function(){ route(location.hash); }, 0);

  /* ---------- expiry tool (card 4-1) ---------- */
  var toolDate = document.getElementById("tool-date"), toolOut = document.getElementById("tool-out");
  function renderTool(){
    if(!toolDate) return;
    var d = S.parseDate(toolDate.value);
    if(!d){ toolOut.innerHTML = ""; return; }
    var n = S.daysUntil(d), h;
    if(n < 0) h = '<span class="warn">'+bi("past")+'</span>';
    else if(n === 0) h = '<span class="warn">'+bi("today")+'</span>';
    else {
      h = '<span class="days">'+(n === 1 ? bi("dayLeft") : bi("daysLeft", {n:n}))+'</span>';
      if(n <= 90) h += '<span class="warn">'+bi("prepare")+'</span>';
    }
    toolOut.innerHTML = h;
  }
  if(toolDate){ toolDate.addEventListener("change", renderTool); toolDate.addEventListener("input", renderTool); }

  /* ---------- preselect the ask form (offline cards, moments, help chips) ---------- */
  var form = document.getElementById("ask-form");
  document.addEventListener("click", function(e){
    var a = e.target.closest("[data-ask-stage]");
    if(!a || !form) return;
    var st = a.getAttribute("data-ask-stage"), tp = a.getAttribute("data-ask-topic");
    var r = form.querySelector('input[name="stage"][value="'+st+'"]'); if(r){ r.checked = true; clearGroup("stage"); }
    if(tp){ var sel = document.getElementById("f-topic"); sel.value = tp; }
    var result = document.getElementById("ask-result");
    if(result && !result.hidden){ result.hidden = true; result.innerHTML = ""; form.hidden = false; }
  });

  /* ---------- ask form (demo) ---------- */
  var setErr = S.setErr, checkText = S.checkText;
  var result = document.getElementById("ask-result");
  var fName = document.getElementById("f-name"), fQ = document.getElementById("f-question"),
      fContact = document.getElementById("f-contact"), fConsent = document.getElementById("f-consent"),
      fExpiry = document.getElementById("f-expiry"), fTopic = document.getElementById("f-topic"),
      lContact = document.getElementById("l-contact"), wQ = document.getElementById("w-question");
  var reqTag = '<span class="req"><span data-l="en" lang="en">required</span><span data-l="ko" lang="ko">필수</span></span>';
  var contactLabels = {
    "": ["Contact","연락처"],
    whatsapp: ["WhatsApp number","WhatsApp 번호"],
    viber: ["Viber number","Viber 번호"],
    email: ["Email address","이메일 주소"]
  };
  function updateContact(){
    var r = form.querySelector('input[name="reply"]:checked');
    var k = r ? r.value : "";
    var lab = contactLabels[k];
    lContact.innerHTML = pair(lab[0], lab[1]) + reqTag;
    if(k === "email"){ fContact.type = "email"; fContact.setAttribute("inputmode","email"); fContact.setAttribute("autocomplete","email"); }
    else if(k){ fContact.type = "tel"; fContact.setAttribute("inputmode","tel"); fContact.setAttribute("autocomplete","tel"); }
    else { fContact.type = "text"; fContact.removeAttribute("inputmode"); fContact.removeAttribute("autocomplete"); }
  }
  function clearGroup(name){
    var box = document.getElementById(name === "stage" ? "stage-choices" : "reply-choices");
    box.classList.remove("invalid");
    setErr(null, document.getElementById("e-"+name), null);
  }
  function checkGroup(name){
    var ok = !!form.querySelector('input[name="'+name+'"]:checked');
    var box = document.getElementById(name === "stage" ? "stage-choices" : "reply-choices");
    box.classList.toggle("invalid", !ok);
    setErr(null, document.getElementById("e-"+name), ok ? null : "choose");
    return ok;
  }
  form.querySelectorAll('input[name="reply"]').forEach(function(r){ r.addEventListener("change", function(){ updateContact(); clearGroup("reply"); }); });
  form.querySelectorAll('input[name="stage"]').forEach(function(r){ r.addEventListener("change", function(){ clearGroup("stage"); }); });
  function idCheck(){ wQ.innerHTML = /\d{9,}/.test(fQ.value.replace(/[\s-]/g,"")) ? bi("idWarn") : ""; }
  fQ.addEventListener("input", idCheck);
  [fName, fQ, fContact].forEach(function(el){
    el.addEventListener("blur", function(){ if(el.getAttribute("aria-invalid")) checkText(el, document.getElementById("e-"+el.id.slice(2))); });
  });
  fConsent.addEventListener("change", function(){ if(fConsent.checked) setErr(fConsent, document.getElementById("e-consent"), null); });

  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  form.addEventListener("submit", function(e){
    e.preventDefault();
    var firstBad = null;
    function mark(ok, el){ if(!ok && !firstBad) firstBad = el; }
    mark(checkText(fName, document.getElementById("e-name")), fName);
    mark(checkGroup("stage"), form.querySelector('input[name="stage"]'));
    mark(checkText(fQ, document.getElementById("e-question")), fQ);
    mark(checkGroup("reply"), form.querySelector('input[name="reply"]'));
    mark(checkText(fContact, document.getElementById("e-contact")), fContact);
    var cOk = fConsent.checked; setErr(fConsent, document.getElementById("e-consent"), cOk ? null : "consent"); mark(cOk, fConsent);
    if(firstBad){ firstBad.focus(); return; }

    var stage = form.querySelector('input[name="stage"]:checked').value;
    var topic = fTopic.value;
    /* planning 4-8: B = part-time work / visa / marriage-family topic, or the visa stage. Everything else = A. */
    var agent = (topic === "work" || topic === "visa" || topic === "family" || stage === "visa");
    var html = agent
      ? '<span class="res-badge agent">'+pair("Partner agent","협업 행정사 연결","inline")+'</span>'
      : '<span class="res-badge faq">'+pair("Guides first","정보로 먼저 안내","inline")+'</span>';
    html += '<h3 id="res-title">'+pair("Thank you. Here is where your question would go.","감사합니다. 질문은 이렇게 처리됩니다.")+'</h3>';
    html += '<p class="msg">' + (agent
      ? biText("This may need a professional opinion. In the live service, we would organise the basic facts and pass your question to a qualified partner administrative agent, who would contact you directly.","전문가 판단이 필요할 수 있는 질문이에요. 실제 서비스에서는 기본 사실을 정리해 자격을 갖춘 협업 행정사에게 전달하고, 행정사가 직접 연락드립니다.")
      : biText("This looks like an everyday question. In the live service, we would first send you the right guide, and a team member would follow up if you need more. For first-week or settling-in help, we would tell you how to join.","생활 질문으로 보여요. 실제 서비스에서는 맞는 정보를 먼저 보내 드리고, 더 필요하면 담당자가 이어서 도와요. 첫 주·정착 도움이라면 신청 방법을 안내해 드려요.")) + '</p>';
    var d = S.parseDate(fExpiry.value);
    if(d){
      var n = S.daysUntil(d);
      if(n < 0) html += '<p class="expiry">'+biText("This date has already passed. Please talk to a qualified administrative agent as soon as possible.","이미 지난 날짜예요. 가능한 한 빨리 자격을 갖춘 행정사와 상담하세요.")+'</p>';
      else if(n === 0) html += '<p class="expiry">'+biText("Your stay expiry date is today. Please talk to a qualified administrative agent as soon as possible.","만료일이 오늘이에요. 가능한 한 빨리 자격을 갖춘 행정사와 상담하세요.")+'</p>';
      else {
        var en = d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear();
        var ko = d.getFullYear()+"년 "+(d.getMonth()+1)+"월 "+d.getDate()+"일";
        html += '<p class="expiry">'+biText("Your stay expiry date: "+en+". That is "+n+(n === 1 ? " day" : " days")+" from today. In the live service, we would remind you before it.","입력하신 만료일: "+ko+". 오늘부터 "+n+"일 남았어요. 실제 서비스에서는 그 전에 미리 알려 드립니다.")+'</p>';
      }
    }
    html += '<p class="demo-end">'+biText("This was a demo. No information was sent or stored.","데모였습니다. 어떤 정보도 전송·저장되지 않았습니다.")+'</p>';
    html += '<div class="res-actions"><button type="button" class="btn btn-outline" id="res-again">'+pair("Ask another question","다른 질문하기")+'</button><a class="btn btn-primary" href="#community">'+pair("Join the community","커뮤니티 참여하기")+'</a></div>';
    result.innerHTML = html;
    form.reset();              /* the demo keeps nothing once the result is shown */
    wQ.innerHTML = ""; updateContact();
    form.hidden = true; result.hidden = false;
    result.focus();
    document.getElementById("res-again").addEventListener("click", function(){
      result.hidden = true; result.innerHTML = "";
      form.hidden = false; form.reset(); updateContact();
      fName.focus();
    });
  });

  /* ---------- sticky bar (< 960px) ---------- */
  var sticky = document.getElementById("sticky-cta"), stickyStage = document.getElementById("sticky-stage"),
      stickyName = document.getElementById("sticky-stage-name");
  var stickyLinks = sticky.querySelectorAll("a");
  var inView = {};
  function syncSticky(){
    if(!stickyStage) return;
    var key = savedStage || current || "arrive";
    stickyStage.setAttribute("href", "#guides-"+key);
    if(savedStage){ var s = stageByKey[savedStage]; stickyName.innerHTML = biText(esc(s.name.en), esc(s.name.ko)); stickyName.hidden = false; }
    else stickyName.hidden = true;
  }
  function updSticky(){
    var blocked = Object.keys(inView).some(function(k){ return inView[k]; });
    var show = window.scrollY > 300 && !blocked && !mqDesk.matches;
    sticky.classList.toggle("show", show);
    document.body.classList.toggle("has-sticky", show);
    sticky.setAttribute("aria-hidden", String(!show));
    stickyLinks.forEach(function(a){ if(show) a.removeAttribute("tabindex"); else a.setAttribute("tabindex","-1"); });
  }
  if("IntersectionObserver" in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ inView[en.target.id] = en.isIntersecting; });
      updSticky();
    }, {threshold: 0.01});
    ["hero-stages","ask","final-cta"].forEach(function(id){ var el = document.getElementById(id); if(el) io.observe(el); });
  }
  window.addEventListener("scroll", updSticky, {passive:true});
  if(mqDesk.addEventListener) mqDesk.addEventListener("change", updSticky);
  syncSticky(); updSticky();
})();
