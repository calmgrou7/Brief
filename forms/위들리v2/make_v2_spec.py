import sys, csv, datetime
sys.path.insert(0,'/tmp/claude-0/-home-user-Brief/39274743-c258-5ba9-989a-ef02c22196bd/scratchpad')
from v2_fields import F
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation

OUT="/home/user/Brief/forms/위들리v2/"
FONT="맑은 고딕"; NAVY="1D3B4F"; TEAL="1D5961"; SOFT="E6EFEF"; GRAY="F4F6F6"; LINE="B9C6C4"
f=lambda size=10,bold=False,color="1A1A1A",italic=False: Font(name=FONT,size=size,bold=bold,color=color,italic=italic)
fill=lambda c: PatternFill("solid",fgColor=c)
thin=Side(style="thin",color=LINE); box=Border(left=thin,right=thin,top=thin,bottom=thin)
center=Alignment(horizontal="center",vertical="center",wrap_text=True)
left=Alignment(horizontal="left",vertical="center",wrap_text=True)
GRADE={"필수":("B42318","FBE4E1"),"권장":("9A6312","FBF0DC"),"선택":("5A6863","EEF1F0"),"대시보드":("1D5961","DCEBEC")}
TYPE_KO={"title":"제목","text":"텍스트","select":"선택(1개)","multi_select":"선택(여러 개)","number":"숫자","date":"날짜","phone_number":"전화번호","email":"이메일","checkbox":"체크박스","url":"URL"}
TODAY=datetime.date(2026,11,11)

wb=Workbook()
# ---------- 1. 필수정보 리스트 ----------
s=wb.active; s.title="필수정보 리스트"; s.sheet_view.showGridLines=False
heads=["No","구분","노션 항목명","노션 유형","등급","작성 주체","입력 형식","허용값","대시보드 사용처","검수 기준","예시"]
widths=[5,11,18,11,9,10,16,30,30,34,26]
for i,w in enumerate(widths,1): s.column_dimensions[L(i)].width=w
last=L(len(heads))
s.merge_cells(f"A1:{last}1"); s["A1"]="위들리 v2 · 정책자금 기업정보 필수 항목 정의서"
s["A1"].font=f(16,True,"FFFFFF"); s["A1"].fill=fill(NAVY); s["A1"].alignment=Alignment(horizontal="left",vertical="center",indent=1); s.row_dimensions[1].height=32
meta=[("문서","위들리 v2 정책자금 DB 항목 정의 (v1.0)"),("작성일",TODAY),("노션 DB","위들리 v2 정책자금 DB (「위들리」 페이지 아래)"),
      ("등급","필수 = 대시보드 점수·자료완성도 계산에 쓰임 / 권장 = 표시·판단에 쓰임 / 선택 = 있으면 반영 / 대시보드 = 상담 기록 화면에서만 기록")]
r=3
for k,v in meta:
    c=s.cell(r,1,k); c.font=f(9.5,True); c.fill=fill(SOFT); c.alignment=center; s.merge_cells(start_row=r,start_column=1,end_row=r,end_column=2)
    s.merge_cells(start_row=r,start_column=3,end_row=r,end_column=len(heads)); c=s.cell(r,3,v); c.font=f(9.5); c.alignment=left
    if isinstance(v,datetime.date): c.number_format="yyyy-mm-dd"
    for cc in range(1,len(heads)+1): s.cell(r,cc).border=box
    r+=1
r+=1; HR=r
for i,h in enumerate(heads,1):
    c=s.cell(r,i,h); c.font=f(10,True,"FFFFFF"); c.fill=fill(TEAL); c.alignment=center; c.border=box
s.row_dimensions[r].height=24
for n,(grp,name,typ,grade,who,fmt,allowed,use,check,ex) in enumerate(F,1):
    r+=1
    vals=[n,grp,name,TYPE_KO[typ],grade,who,fmt,allowed.replace("/"," / "),use,check,ex]
    for i,v in enumerate(vals,1):
        c=s.cell(r,i,v); c.border=box; c.font=f(9.5,i==3); c.alignment=center if i in (1,2,4,5,6) else left
        if n%2==0: c.fill=fill(GRAY)
    fg,bg=GRADE[grade]; c=s.cell(r,5); c.font=f(9.5,True,fg); c.fill=fill(bg)
    longest=max(len(str(x)) for x in vals[6:])
    s.row_dimensions[r].height=max(20,15*(longest//30+1))
s.freeze_panes=s.cell(HR+1,4)
s.auto_filter.ref=f"A{HR}:{last}{r}"
s.page_setup.orientation="landscape"; s.page_setup.paperSize=s.PAPERSIZE_A4
s.sheet_properties.pageSetUpPr.fitToPage=True; s.page_setup.fitToWidth=1; s.page_setup.fitToHeight=0; s.print_title_rows=f"{HR}:{HR}"
cnt={g:sum(1 for x in F if x[3]==g) for g in GRADE}
r+=2; s.cell(r,2,f"항목 {len(F)}개 · 필수 {cnt['필수']} · 권장 {cnt['권장']} · 선택 {cnt['선택']} · 대시보드 기록 {cnt['대시보드']}").font=f(9.5,True,"5A6863")

# ---------- 2. 등록양식 ----------
t=wb.create_sheet("등록양식"); t.sheet_view.showGridLines=False
cols=[x for x in F if x[4]=="ChatGPT"]+[x for x in F if x[1] in ("진행상태","내판단")]
for i,x in enumerate(cols,1):
    t.column_dimensions[L(i)].width=max(11,min(28,len(x[1])*2+4))
    c=t.cell(1,i,x[1]); fg,bg=GRADE[x[3]]; c.font=f(9.5,True,fg); c.fill=fill(bg); c.alignment=center; c.border=box
    c=t.cell(2,i,x[5]); c.font=f(8.5,False,"5A6863"); c.fill=fill(SOFT); c.alignment=center; c.border=box
    ex=x[9]
    if x[1]=="진행상태": ex="사전검토"
    if x[1]=="내판단": ex="미판단"
    if x[2]=="number" and ex: ex=float(ex) if "." in ex else int(ex)
    elif x[2]=="date" and ex: ex=datetime.date.fromisoformat(ex)
    c=t.cell(3,i,ex); c.font=f(9.5,False,"6F7B77",True); c.fill=fill("E4E8E7"); c.border=box; c.alignment=left
    if x[2]=="number": c.number_format="#,##0;-#,##0"
    if x[2]=="date": c.number_format="yyyy-mm-dd"
    for rr in range(4,54): t.cell(rr,i).border=box; t.cell(rr,i).font=f(10)
t.row_dimensions[1].height=30; t.row_dimensions[2].height=28
t.freeze_panes="B4"
t.cell(55,1,"1행 = 노션 항목명(그대로 사용) · 2행 = 입력 형식 · 3행 = 예시(등록 대상 아님) · 4행부터 한 행에 한 업체. 빨강=필수, 주황=권장, 회색=선택, 청록=등록 시 기본값만").font=f(9,False,"5A6863")

# ---------- 3. ChatGPT 작업지침 ----------
g=wb.create_sheet("ChatGPT 작업지침"); g.sheet_view.showGridLines=False
g.column_dimensions["A"].width=4; g.column_dimensions["B"].width=120
g.merge_cells("A1:B1"); g["A1"]="ChatGPT 자료검수·노션 등록 작업지침"; g["A1"].font=f(15,True,"FFFFFF"); g["A1"].fill=fill(NAVY); g.row_dimensions[1].height=30
lines=[
("h","1. 역할"),
("p","너는 정책자금 컨설팅 자료 검수 담당이다. 받은 기업 자료(사업자등록증, 부가세 과세표준증명, 재무제표, 부채증명, WEDLY 보고서 등)를 검수해서 노션 「위들리 v2 정책자금 DB」에 등록한다."),
("h","2. 등록 규칙"),
("p","① 「필수정보 리스트」 시트에 있는 항목만 등록한다. 항목명은 노션 항목명과 글자 하나까지 똑같이 쓴다."),
("p","② 한 기업 = 노션 한 행. 같은 사업자번호가 이미 있으면 새로 만들지 말고 그 행을 고친다."),
("p","③ 금액은 원 단위 숫자만(쉼표·'원'·'억' 없이), 날짜는 YYYY-MM-DD, 비율은 % 기호 없이 숫자만 넣는다. 손실·자본잠식은 음수로 넣는다."),
("p","④ 확인하지 못한 값은 추정해서 채우지 않고 비운다. 비운 이유는 증빙구분메모에 적는다."),
("p","⑤ 금융권 증빙으로 확인한 차입 합계만 차입금잔액에 넣는다. WEDLY 등 보고서 값은 참고차입금_미검증에 따로 넣는다."),
("p","⑥ 매출이 추정치면 매출기준을 'WEDLY추정'으로 둔다(대시보드가 30% 감점)."),
("p","⑦ 선택 항목은 허용값 중에서만 고른다. 목록에 없는 값을 새로 만들지 않는다."),
("h","3. 검수 표시"),
("p","데이터신뢰도: 원본 증빙으로 모두 확인 = 1차증빙 / 일부만 확인 = 일부검증 / 보고서·고객 진술뿐 = 미검증추정 / 자료 없음 = 자료없음"),
("p","검수상태: 대조 끝 = 검수완료 / 숫자 불일치·누락 있음 = 보완필요(증빙구분메모에 무엇이 필요한지) / 등록만 함 = 미검수"),
("p","자료출처에는 값을 가져온 파일명·발급일을 적고, 정보기준일에는 확인한 날짜를 넣는다. 체납·연체·만기경과·자본잠식 등 결격 사항은 핵심리스크에 한 줄로 요약한다."),
("h","4. 건드리지 않는 항목 (대시보드 전용)"),
("p","진행상태·내판단은 새 업체를 처음 등록할 때만 각각 '사전검토'·'미판단'으로 넣고, 이후에는 절대 바꾸지 않는다. 상담차수·상담이력·다음조치는 입력하지 않는다. 이 칸들은 담당자가 대시보드에서 상담하며 기록한다."),
("h","5. 작업 후 보고"),
("p","등록·수정한 업체 이름, 비워 둔 필수 항목, 보완필요로 표시한 이유를 목록으로 보고한다."),
]
r=3
for kind,txt in lines:
    c=g.cell(r,2,txt); c.alignment=left
    if kind=="h": c.font=f(11.5,True,TEAL); g.row_dimensions[r].height=22
    else: c.font=f(10); g.row_dimensions[r].height=max(18,16*(len(txt)//70+1))
    r+=1

# ---------- 4. 선택값 ----------
o=wb.create_sheet("선택값"); o.sheet_view.showGridLines=False
col=1
for x in F:
    if x[2] in ("select","multi_select"):
        o.column_dimensions[L(col)].width=16
        c=o.cell(1,col,x[1]); c.font=f(10,True,"FFFFFF"); c.fill=fill(TEAL); c.alignment=center; c.border=box
        for i,v in enumerate(x[6].split("/"),2):
            c=o.cell(i,col,v); c.font=f(10); c.border=box
        col+=1
# 등록양식 드롭다운
sel={x[1]:i for i,x in enumerate(cols,1) if x[2]=="select"}
oc={o.cell(1,c).value:c for c in range(1,col)}
for name,ci in sel.items():
    n=len([x for x in F if x[1]==name][0][6].split("/"))
    dv=DataValidation(type="list",formula1=f"='선택값'!${L(oc[name])}$2:${L(oc[name])}${n+1}",allow_blank=True)
    dv.add(f"{L(ci)}4:{L(ci)}53"); t.add_data_validation(dv)

wb.active=0
wb.save(OUT+"위들리v2_필수정보리스트.xlsx")
# CSV (Excel·노션에서 한글 깨지지 않게 UTF-8 BOM)
with open(OUT+"위들리v2_필수정보리스트.csv","w",encoding="utf-8-sig",newline="") as fp:
    w=csv.writer(fp); w.writerow(heads)
    for n,x in enumerate(F,1): w.writerow([n,x[0],x[1],TYPE_KO[x[2]],x[3],x[4],x[5],x[6],x[7],x[8],x[9]])
with open(OUT+"위들리v2_등록양식.csv","w",encoding="utf-8-sig",newline="") as fp:
    w=csv.writer(fp); w.writerow([x[1] for x in cols])
print(len(F),"fields;",len(cols),"form columns;",cnt)
