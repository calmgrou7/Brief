import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count, ("count", s.count(old), old[:90]); s=s.replace(old,new)
def cut(start,end,new):
    global s
    i=s.index(start); j=s.index(end,i)
    s=s[:i]+new+s[j:]

# ---------- CSS ----------
rep('''@media (max-width:900px){
  .strip{''','''/* 새 레이아웃: 할 일 타일 · 상태 탭 · 목록+상세 두 칸 */
.todo{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
.tile{all:unset;box-sizing:border-box;cursor:pointer;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}
.tile:hover{border-color:var(--accent)}
.tile:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.tile .l{font-size:12px;color:var(--muted)}
.tile .v{font-size:22px;font-weight:600;line-height:1.25}
.tile .s{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent)}
.tile.bad .v{color:var(--bad)} .tile.warn .v{color:var(--warn)}
.stabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
.stab{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:5px 12px;font-size:13px;cursor:pointer;white-space:nowrap;color:var(--muted)}
.stab:hover{border-color:var(--accent)}
.stab[aria-pressed="true"]{background:var(--ink);color:var(--surface);border-color:var(--ink);font-weight:600}
.stab .c{font-family:var(--f-data);margin-left:5px;opacity:.75}
.split{display:grid;grid-template-columns:minmax(300px,400px) minmax(0,1fr);gap:14px;align-items:start}
.list{display:flex;flex-direction:column;gap:6px;max-height:calc(100vh - 32px);overflow-y:auto;position:sticky;top:16px;padding:2px 4px 2px 2px}
.row{all:unset;box-sizing:border-box;cursor:pointer;background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--sig);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0}
.row:hover{border-color:var(--accent);border-left-color:var(--sig)}
.row:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.row[aria-current="true"]{background:var(--accent-soft);border-color:var(--accent);border-left-color:var(--sig)}
.row .r1{display:flex;gap:8px;align-items:center;min-width:0}
.row .nm{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .sc{font-family:var(--f-data);font-weight:600;font-size:13px;color:var(--muted)}
.row .r2{font-size:12px;color:var(--muted)}
.row .r3{font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .r3.none{color:var(--muted)}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;position:sticky;top:16px;max-height:calc(100vh - 32px);overflow-y:auto;min-width:0}
.panel .db{overflow:visible}
.pane-empty{padding:48px 24px;text-align:center;color:var(--muted)}
.hchips{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.qa{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap}
.dtabs{display:flex;gap:2px;border-bottom:1px solid var(--line);padding:0 16px;background:var(--surface);position:sticky;top:0;z-index:2;overflow-x:auto}
.dtab{border:0;background:none;padding:11px 12px;font-size:13.5px;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.dtab:hover{color:var(--ink)}
.dtab[aria-selected="true"]{color:var(--ink);font-weight:600;border-bottom-color:var(--accent)}
.dtab .c{font-family:var(--f-data);font-size:11.5px;margin-left:4px;color:var(--muted)}
.drawer .dtabs{position:static}

@media (max-width:900px){
  .todo{grid-template-columns:repeat(3,minmax(0,1fr))}
  .split{grid-template-columns:1fr}
  .panel{display:none}
  .list{max-height:none;position:static;overflow:visible}
  .strip{''')
rep('''@media (max-width:480px){
  .judge{''','''@media (max-width:480px){
  .todo{grid-template-columns:repeat(2,minmax(0,1fr))}
  .judge{''')

# ---------- header / controls ----------


rep('<section class="strip" id="strip" aria-label="요약"></section>','<section class="todo" id="strip" aria-label="오늘 확인할 일"></section>')
rep('''      <button type="button" data-v="board" aria-pressed="true">보드</button>
      <button type="button" data-v="table" aria-pressed="false">비교표</button>''','''      <button type="button" data-v="list" aria-pressed="true">목록</button>
      <button type="button" data-v="board" aria-pressed="false">칸 보기</button>
      <button type="button" data-v="table" aria-pressed="false">비교표</button>''')
rep('''      <option value="score">참고점수 높은 순</option>''','''      <option value="score">참고점수 높은 순</option>
      <option value="recent">최근 상담 순</option>
      <option value="name">업체명 순</option>''')
rep('''  <main id="main"></main>''','''  <nav class="stabs" id="stabs" aria-label="판단 상태"></nav>

  <main id="main"></main>''')
rep('view:"board", group:"judge"','view:"list", group:"judge", stab:"all", focus:null, tab:"log", draft:null, drawerOpen:false')

# ---------- views ----------
cut('function filtered(){','function sigPill(s)','''function lastLog(c){ return c.log[c.log.length-1]||null; }
function isRecent(c){ const l=lastLog(c); return !!(l&&l.date)&&daysUntil(l.date)>=-7; }
const FOCUS={
  pending:c=>c.judge==="미판단"&&c.stage!==ENDED,
  due:c=>c.overdueUnk||(c.a.dday!=null&&c.a.dday<=60),
  fund:c=>c.judge==="자금신청중",
  recent:isRecent,
  data:c=>c.a.signal==="nodata"
};
function inTab(c,t){
  if(t==="all") return true;
  if(t==="ended") return c.stage===ENDED;
  return c.stage!==ENDED&&(JUDGES.includes(c.judge)?c.judge:"미판단")===t;
}
function filtered(ignoreTab){
  const q=state.q.trim().toLowerCase();
  let r=state.rows.filter(c=>!q||[c.name,c.ceo,c.industry,c.region,c.bizno,c.mobile,c.tel,c.email].join(" ").toLowerCase().includes(q));
  if(state.focus&&FOCUS[state.focus]) r=r.filter(FOCUS[state.focus]);
  if(!ignoreTab&&state.view!=="board") r=r.filter(c=>inTab(c,state.stab));
  if(state.sort==="name") return r.sort((x,y)=>x.name.localeCompare(y.name,"ko"));
  const key={score:c=>-c.a.score,dday:c=>(c.overdueUnk?-1e6:0)+(c.a.dday==null?1e9:c.a.dday),rev:c=>-(c.rev25??-1),lev:c=>-(c.a.lev??-1),comp:c=>c.a.comp,
    recent:c=>-(Date.parse((lastLog(c)||{}).date||"")||0)}[state.sort];
  return r.sort((x,y)=>key(x)-key(y));
}
function isInline(){ return state.view==="list"&&window.matchMedia("(min-width:901px)").matches; }
function judgeCls(j){ return {"가능":"good","조건부":"warn","불가":"bad","자금신청중":"acc","자금신청완료":"fund"}[j]||""; }
function ddayInfo(c){
  const d=c.a.dday;
  if(c.overdueUnk) return ["만기경과 미확인","bad"];
  if(d==null) return null;
  if(d<0) return ["만기 경과","bad"];
  return ["만기 D-"+d,d<=60?"warn":""];
}
function rowHTML(c){
  const l=lastLog(c), dd=ddayInfo(c), ended=c.stage===ENDED;
  const last=l?[(l.round&&l.round!=="이전 기록")?l.round:"",l.date?l.date.slice(5).replace("-","/"):""].filter(Boolean).join(" · "):"";
  return `<button class="row sig-${c.a.signal}" type="button" data-row="${esc(c.id)}" aria-current="${state.openId===c.id}">
    <span class="r1"><span class="nm">${esc(c.name)}</span><span class="chip ${ended?"":judgeCls(c.judge)}">${esc(ended?"상담종료":c.judge)}</span><span class="sc" title="참고점수">${c.a.score}</span></span>
    <span class="r2">${esc([c.type,c.region,c.stage].filter(Boolean).join(" · "))}${dd?` · <span class="v ${dd[1]}">${dd[0]}</span>`:""}${c.pending?` · <span class="v warn">노션 미반영</span>`:""}</span>
    <span class="r3${l?"":" none"}">${l?(last?`<b>${esc(last)}</b> — `:"")+esc(l.memo||l.judge||""):"상담 기록 없음"}</span>
  </button>`;
}
function renderList(rows){
  const main=$("#main");
  if(!$("#list")) main.innerHTML=`<div class="split"><div class="list" id="list"></div><div class="panel" id="panel"></div></div>`;
  const list=$("#list"), st=list.scrollTop;
  list.innerHTML=rows.length?rows.map(rowHTML).join(""):`<div class="empty-col">조건에 맞는 업체가 없습니다. <button class="btn sm" type="button" data-act="clearf">필터 모두 해제</button></div>`;
  list.scrollTop=st;
  if(isInline()){
    if(!rows.some(c=>c.id===state.openId)){ state.openId=rows[0]?rows[0].id:null; state.editIdx=null; state.delIdx=null; state.draft=null; state.tab="log"; }
    if(!state.openId) $("#panel").innerHTML=`<div class="pane-empty">왼쪽 목록에서 업체를 고르세요.</div>`;
  }
}
function renderTabs(){
  const el=$("#stabs");
  if(state.view==="board"||!state.rows.length){ el.hidden=true; return; }
  el.hidden=false;
  const base=filtered(true);
  const tabs=[["all","전체"],...JUDGES.map(j=>[j,j]),["ended","상담종료"]];
  el.innerHTML=tabs.map(([k,l])=>`<button class="stab" type="button" data-stab="${esc(k)}" aria-pressed="${state.stab===k}">${esc(l)}<span class="c">${base.filter(c=>inTab(c,k)).length}</span></button>`).join("");
}
''')

# strip -> to-do tiles
cut('function renderStrip(){','function renderNotice(){','''function renderStrip(){
  const r=state.rows, el=$("#strip");
  const n=f=>r.filter(f).length, sig=x=>n(c=>c.a.signal===x);
  const over=n(c=>c.overdueUnk||(c.a.dday!=null&&c.a.dday<0)), due=n(FOCUS.due);
  const comp=r.length?Math.round(r.reduce((t,c)=>t+c.a.comp,0)/r.length):0;
  const tiles=[
    ["all","전체 업체",r.length,`양호 ${sig("good")} · 주의 ${sig("warn")} · 위험 ${sig("bad")}`,""],
    ["pending","판단 대기",n(FOCUS.pending),"상담 판단 전 업체",""],
    ["due","만기 경과·임박",due,over?`경과 ${over}곳 우선 확인`:"60일 이내 만기",over?"bad":due?"warn":""],
    ["fund","자금신청 진행",n(FOCUS.fund),`신청완료 ${n(c=>c.judge==="자금신청완료")}곳`,""],
    ["recent","최근 7일 상담",n(FOCUS.recent),"상담 기록 기준",""],
    ["data","자료 부족",n(FOCUS.data),`평균 자료 완성도 ${comp}%`,""]
  ];
  el.innerHTML=tiles.map(([k,l,v,s,cl])=>`<button class="tile ${cl}" type="button" data-focus="${k}" aria-pressed="${(state.focus||"all")===k}"><span class="l">${l}</span><span class="v num">${r.length?v:"—"}</span><span class="s">${r.length?s:"노션 연결 후 표시"}</span></button>`).join("");
}

''')

# render()
cut('function render(){','/* ---------- drawer ---------- */','''function render(){
  renderLive(); renderStrip(); renderNotice(); renderTabs();
  document.querySelectorAll("#viewSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===state.view));
  document.querySelectorAll("#groupSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.g===state.group));
  $("#groupSeg").hidden=state.view!=="board"; $("#sort").hidden=state.view==="table";
  const main=$("#main");
  if(!state.rows.length){
    if(state.status==="loading") main.innerHTML=`<div class="board" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${'<div class="skel"></div>'.repeat(6)}</div>`;
    else main.innerHTML=state.status==="live"?`<div class="notice"><div class="grow"><h2>등록된 업체가 없습니다</h2><p>노션 「위들리 기업컨디션 DB」에 업체를 한 줄 추가하면 1분 안에 이 보드에 나타납니다.</p></div></div>`:"";
  } else if(state.view==="board") renderBoard(filtered());
  else if(state.view==="table") renderTable(filtered());
  else renderList(filtered());
  const c=state.openId&&state.rows.find(x=>x.id===state.openId);
  if(c&&(isInline()||state.drawerOpen)) renderDrawer(c,true);
}

''')

# drawer -> tabbed detail (inline panel or overlay)
cut('function renderDrawer(c, keepInputs){','function logSection(','''function readInputs(keep){
  if(keep&&$("#memo")){
    const st=document.querySelector(".stamp[aria-pressed='true']");
    return {memo:$("#memo").value, judge:st?st.dataset.j:"", round:$("#roundSel")?$("#roundSel").value:"", date:$("#logDate")?$("#logDate").value:"", stage:$("#stageSel")?$("#stageSel").value:""};
  }
  return keep&&state.draft?state.draft:{};
}
function renderDrawer(c, keepInputs){
  const inline=isInline(), host=inline?$("#panel"):$("#drawerRoot");
  if(!host) return;
  const inp=readInputs(keepInputs);
  const scroller=inline?host:host.querySelector(".db"), st=keepInputs&&scroller?scroller.scrollTop:0;
  const body=detailHTML(c,inp,inline);
  host.innerHTML=inline?body:`<div class="scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dTitle">${body}</aside>`;
  const sc=inline?host:host.querySelector(".db"); if(sc) sc.scrollTop=st;
  if(!keepInputs&&!inline) host.querySelector(".x").focus();
}
function detailHTML(c,inp,inline){
  const a=c.a, list=logOf(c), editing=state.editIdx!=null?list[state.editIdx]:null;
  const judge=inp.judge!=null&&inp.judge!==""?inp.judge:(editing?editing.judge:"");
  const memo=inp.memo!=null?inp.memo:(editing?editing.memo:"");
  const roundSel=inp.round||(editing?(ROUNDS.includes(editing.round)?editing.round:"1차"):nextRound(list));
  const dateSel=inp.date||(editing&&editing.date?editing.date:today());
  const stageSel=inp.stage||c.stage;
  const kv=(k,v,src)=>`<div><div class="k">${k}</div><div class="v">${v}${src?` <span class="src">${src}</span>`:""}</div></div>`;
  const ended=c.stage===ENDED;
  const tabs=[["log","상담 기록",list.length],["info","기업 정보",""],["fin","재무·점수",a.score+"점"],["risk","리스크",a.flags.length||""]];
  let body="";
  if(state.tab==="info") body=`
      <section class="sec"><h3>연락처</h3>${contactHTML(c)}</section>
      <section class="sec"><h3>기본 정보</h3><div class="kv">
        ${kv("대표자",esc(c.ceo)||"미확인")}${kv("사업자번호",esc(c.bizno)||"미확인")}
        ${kv("사업자유형",esc(c.type)||"미확인")}${kv("지역",esc(c.region)||"미확인")}
        ${kv("업종",esc(c.industry)||"미확인")}${kv("개업일 / 업력",(c.opened||"—")+(a.age!=null?" ("+a.age.toFixed(1)+"년)":""))}
        ${kv("상시근로자",c.staff!=null?c.staff+"명":"미확인")}${kv("정보기준일",c.asOf||"미확인")}
      </div></section>
      <section class="sec"><h3>자금 수요</h3><div class="kv">
        ${kv("필요자금",won(c.need)||"미확정")}${kv("자금용도",c.uses.length?esc(c.uses.join(", ")):"미확인")}
      </div>${c.agencies.length?`<div class="chips" style="margin-top:8px">${c.agencies.map(x=>`<span class="chip acc">${esc(x)}</span>`).join("")}</div>`:""}</section>
      <section class="sec"><h3>기술력</h3><div class="kv">
        ${kv("인증",c.certs.length?esc(c.certs.join(", ")):"없음·미확인")}${kv("특허",c.patents!=null?c.patents+"건":"미확인")}
        ${kv("수출(최근연도)",c.exportUsd!=null?"$"+c.exportUsd.toLocaleString("en-US"):"없음·미확인")}${kv("자료 신뢰도",esc(c.trust))}
      </div></section>
      ${c.evid||c.verify?`<section class="sec"><h3>증빙 구분</h3>${c.verify?`<p class="prose" style="color:var(--muted);margin-bottom:6px">${esc(c.verify)}</p>`:""}${c.evid?`<p class="prose">${esc(c.evid)}</p>`:""}</section>`:""}
      ${c.next?`<section class="sec"><h3>다음 조치</h3><p class="prose">${esc(c.next)}</p></section>`:""}`;
  else if(state.tab==="fin") body=`
      <section class="sec"><h3>참고점수 ${a.score} / 100</h3><div class="breakdown">
        ${a.parts.map(p=>`<div class="br"><span>${p.k}</span><div class="track"><div class="fill" style="width:${p.got/p.max*100}%"></div></div><span class="pt">${p.got}/${p.max}</span><span class="note">${esc(p.note)}</span></div>`).join("")}
      </div></section>
      <section class="sec"><h3>매출 추이</h3>${bars(c)}</section>
      <section class="sec"><h3>재무비율</h3><div class="kv">
        ${kv("부채비율",a.impaired?'<span class="v bad">자본잠식</span>':a.debtRatio==null?"미확인":Math.round(a.debtRatio)+"%",a.debtSrc)}
        ${kv("유동비율",c.curRatio==null?"미확인":c.curRatio+"%",c.curRatio!=null?"보고서":"")}
        ${kv("영업이익",won(c.opInc)||"미확인",a.margin!=null?"이익률 "+a.margin.toFixed(1)+"%":"")}
        ${kv("당기순이익",won(c.netInc)||"미확인")}
        ${kv("총자산",won(c.assets)||"미확인")}
        ${kv("총부채 / 자본",(won(c.liab)||"—")+" / "+(won(c.equity)||"—"))}
      </div></section>
      <section class="sec"><h3>대출·상환</h3><div class="kv">
        ${kv("증빙 차입잔액",won(c.borrow)||"미확인",c.borrowAsOf?c.borrowAsOf+" 기준":"")}
        ${kv("참고 차입금(미검증)",won(c.refBorrow)||"없음","WEDLY 등")}
        ${kv("차입/연매출",a.lev==null?"계산 불가":a.lev.toFixed(2)+"배",a.levRef?"참고값 기준":"")}
        ${kv("다음 만기",c.nextDue?c.nextDue+(a.dday!=null?(a.dday<0?" (경과)":" (D-"+a.dday+")"):""):"미확인",c.overdueUnk?"연장 미확인":"")}
        ${kv("만기 금액",won(c.dueAmt)||"미확인")}
        ${kv("납세 / 연체",esc(c.tax)+" / "+esc(c.delinq))}
      </div></section>`;
  else if(state.tab==="risk") body=`
      ${a.flags.length?`<section class="sec"><h3>자동 점검 결과</h3><div class="flags">${a.flags.map(f=>`<div class="flag ${f[0]}"><b>${f[0]==="bad"?"결격":f[0]==="warn"?"주의":"메모"}</b><span>${esc(f[1])}</span></div>`).join("")}</div></section>`:`<section class="sec"><p class="prose" style="color:var(--muted)">자동 점검에서 걸린 리스크가 없습니다.</p></section>`}
      ${c.risk?`<section class="sec"><h3>핵심 리스크(노션 기록)</h3><p class="prose">${esc(c.risk)}</p></section>`:""}`;
  else body=`
      ${logSection(c,list,editing,judge,memo,roundSel,dateSel)}
      ${state.source!=="live"?`<section class="sec"><h3>진행상태</h3><p class="prose"><b>${esc(c.stage)}</b></p></section>`:`<section class="sec"><h3>진행상태 — 노션에 저장</h3>
        <div class="save-row"><select id="stageSel" aria-label="진행상태">${(STAGES.includes(c.stage)?STAGES:[c.stage,...STAGES]).map(s=>`<option value="${esc(s)}"${s===stageSel?" selected":""}>${esc(s)}</option>`).join("")}</select>
        <button class="btn primary" id="stageBtn" type="button">노션에 저장</button><span class="save-msg" id="stageMsg">현재 노션 값: ${esc(c.stage)}</span></div>
      </section>`}`;
  return `<div class="dh"><div class="t"><h2 id="dTitle">${esc(c.name)}</h2>
      <div class="meta">${esc([c.ceo&&"대표 "+c.ceo,c.bizno,c.type,c.region].filter(Boolean).join(" · "))}</div>
      <div class="meta">${esc(c.industry)}${c.asOf?" · 정보기준 "+esc(c.asOf):""}</div>
      <div class="hchips">${sigPill(a.signal)}<span class="chip ${ended?"":judgeCls(c.judge)}">${esc(ended?"상담종료":c.judge)}</span><span class="chip">${esc(c.stage)}</span><span class="chip">참고점수 ${a.score}</span><span class="chip">자료 ${a.comp}%</span></div>
      <div class="qa">${c.mobile?`<button class="btn sm" type="button" data-copy="${esc(c.mobile)}">${esc(c.mobile)} 복사</button>`:""}<a class="btn sm" href="${esc(c.url)}" target="_blank" rel="noopener">노션 행 편집</a>${c.report?`<a class="btn sm" href="${esc(c.report)}" target="_blank" rel="noopener">종합 보고서</a>`:""}</div>
    </div>${inline?"":`<button class="x" data-act="close" type="button" aria-label="닫기">×</button>`}</div>
    <div class="dtabs" role="tablist">${tabs.map(([k,l,n])=>`<button class="dtab" type="button" role="tab" data-tab="${k}" aria-selected="${state.tab===k}">${l}${n!==""?`<span class="c">${n}</span>`:""}</button>`).join("")}</div>
    <div class="db">${body}</div>`;
}
''')

# logSection: new-record form first, history below
rep('''    ${history}
    <div class="logform">''','''    <div class="logform">''')
rep('''        <span class="save-msg" id="saveMsg">${len>LOG_SOFT_LIMIT?"기록이 길어져 노션 칸 한도(2000자)에 가깝습니다. 오래된 기록 메모를 줄여 주세요.":"가장 최근 기록의 판단이 보드 칸에 반영됩니다."}</span></div>
    </div></section>`;''','''        <span class="save-msg" id="saveMsg">${len>LOG_SOFT_LIMIT?"기록이 길어져 노션 칸 한도(2000자)에 가깝습니다. 오래된 기록 메모를 줄여 주세요.":"가장 최근 기록의 판단이 보드 칸에 반영됩니다."}</span></div>
    </div>
    <div style="margin-top:14px">${history}</div></section>`;''')

rep('''function openDrawer(id){ const c=state.rows.find(x=>x.id===id); if(!c) return; state.openId=id; state.editIdx=null; state.delIdx=null; renderDrawer(c,false); }
function closeDrawer(){ state.openId=null; state.editIdx=null; state.delIdx=null; $("#drawerRoot").innerHTML=""; }''',
'''function resetDetail(){ state.editIdx=null; state.delIdx=null; state.draft=null; state.tab="log"; }
function openDrawer(id){ const c=state.rows.find(x=>x.id===id); if(!c) return; state.openId=id; resetDetail(); state.drawerOpen=true; renderDrawer(c,false); }
function closeDrawer(){ state.drawerOpen=false; state.editIdx=null; state.delIdx=null; state.draft=null; if(!isInline()) state.openId=null; $("#drawerRoot").innerHTML=""; }
function selectRow(id){
  const c=state.rows.find(x=>x.id===id); if(!c) return;
  if(!isInline()){ openDrawer(id); return; }
  state.openId=id; resetDetail();
  document.querySelectorAll("#list .row").forEach(r=>r.setAttribute("aria-current",r.dataset.row===id));
  renderDrawer(c,false); $("#panel").scrollTop=0;
}''')

# events
rep('''  const card=t.closest(".card,tbody tr"); if(card&&card.dataset.id){ openDrawer(card.dataset.id); return; }''',
'''  const card=t.closest(".card,tbody tr"); if(card&&card.dataset.id){ openDrawer(card.dataset.id); return; }
  const row=t.closest("[data-row]"); if(row){ selectRow(row.dataset.row); return; }
  const fo=t.closest("[data-focus]"); if(fo){ const k=fo.dataset.focus; state.focus=(k==="all"||state.focus===k)?null:k; render(); return; }
  const sb=t.closest("[data-stab]"); if(sb){ state.stab=sb.dataset.stab; render(); return; }
  const tb=t.closest("[data-tab]"); if(tb){ const c=state.rows.find(x=>x.id===state.openId); if(!c) return; state.draft=readInputs(true); state.tab=tb.dataset.tab; renderDrawer(c,true); return; }''')
rep('''if(act.dataset.act==="mcp") retryMcp(); return; }''','''if(act.dataset.act==="mcp") retryMcp(); if(act.dataset.act==="clearf"){ state.focus=null; state.stab="all"; state.q=""; $("#q").value=""; render(); } return; }''')
rep('''  if(e.key==="Escape"&&state.openId) closeDrawer();''','''  if(e.key==="Escape"&&state.drawerOpen) closeDrawer();''')
# a successful save clears the draft
rep('''    state.editIdx=null; state.delIdx=null;
    toast(c.name+" · "+done''','''    state.editIdx=null; state.delIdx=null; state.draft=null;
    toast(c.name+" · "+done''')
rep('<p class="foot">참고점수는','<p class="foot">위쪽 숫자 칸을 누르면 해당 업체만 걸러지고, 한 번 더 누르면 풀립니다. 참고점수는')
open(dst,'w',encoding='utf-8').write(s); print("ok")
