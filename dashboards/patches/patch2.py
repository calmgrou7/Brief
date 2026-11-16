import sys
S='/tmp/claude-0/-home-user-Brief/39274743-c258-5ba9-989a-ef02c22196bd/scratchpad'
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
css=open(S+'/patch2_css.txt',encoding='utf-8').read(); js=open(S+'/patch2_js.txt',encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count, ("count", s.count(old), old[:90]); s=s.replace(old,new)
rep('.drawer .dtabs{position:static}','.drawer .dtabs{position:static}\n'+css)
rep('function detailHTML(c,inp,inline){',js+'function detailHTML(c,inp,inline){')
rep('''    <div class="dtabs" role="tablist">''','''    ${briefHTML(c)}
    <div class="dtabs" role="tablist">''')
rep('''    <span class="r2">${esc([c.type,c.region,c.stage].filter(Boolean).join(" · "))}''','''    <span class="r2">${c.need!=null?`<b style="color:var(--ink)">필요 ${won(c.need)}</b> · `:""}${esc([c.type,c.region,c.stage].filter(Boolean).join(" · "))}''')
# ChatGPT 검수상태(v2에만 있음): 값이 있을 때만 표시
rep('''  const miss=missingDocs(c);''','''  if(c.review==="보완필요") P.unshift(["warn","검수","ChatGPT 검수 결과 보완필요 — 기업 정보 탭의 자료 출처·검수 메모를 확인하세요."]);
  const miss=missingDocs(c);''')
rep('''<span class="chip">참고점수 ${a.score}</span>''','''${c.review?`<span class="chip ${c.review==="검수완료"?"good":c.review==="보완필요"?"bad":""}">검수 ${esc(c.review)}</span>`:""}<span class="chip">참고점수 ${a.score}</span>''')
rep('''${c.pending?` · <span class="v warn">노션 미반영</span>`:""}</span>''','''${c.pending?` · <span class="v warn">노션 미반영</span>`:""}${c.review==="보완필요"?` · <span class="v bad">보완필요</span>`:""}</span>''')
rep('''<section class="sec"><h3>증빙 구분</h3>${c.verify?`<p class="prose" style="color:var(--muted);margin-bottom:6px">${esc(c.verify)}</p>`:""}''','''<section class="sec"><h3>자료 출처 · 증빙</h3>${c.verify?`<p class="prose" style="color:var(--muted);margin-bottom:6px">${esc(c.verify)}</p>`:""}''')
open(p,'w',encoding='utf-8').write(s); print('patch2 ok',p.split('/')[-2])
