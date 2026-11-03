from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter as L
from openpyxl.comments import Comment
import datetime

FONT = "맑은 고딕"
NAVY = "1D3B4F"; TEAL = "1D5961"; SOFT = "E6EFEF"; GRAY = "F2F4F4"; LINE = "B9C6C4"
def f(size=10, bold=False, color="1A1A1A", italic=False): return Font(name=FONT, size=size, bold=bold, color=color, italic=italic)
thin = Side(style="thin", color=LINE)
box = Border(left=thin, right=thin, top=thin, bottom=thin)
fill = lambda c: PatternFill("solid", fgColor=c)
center = Alignment(horizontal="center", vertical="center", wrap_text=True)
left = Alignment(horizontal="left", vertical="center", wrap_text=True)

# 선택값
CHOICES = {
 "사업자유형": ["법인","개인","예비창업"],
 "지역": ["부산","서울","인천","경기","대구","기타"],
 "매출기준": ["부가세과표","재무제표","WEDLY추정","없음"],
 "예아니오": ["예","아니오"],
 "납세상태": ["완납확인","미확인","체납"],
 "연체여부": ["없음","미확인","있음"],
}
MULTI = {
 "자금용도": ["운전","시설","대환"],
 "인증": ["메인비즈","이노비즈","벤처","기업부설연구소","기타인증"],
 "신청후보기관": ["중진공","신용보증기금","기술보증기금","지역신보","소진공","은행","수출지원"],
}

# (구분, 항목명=노션 항목, 필수, 형식종류, 단위/형식 안내, 예시값, 설명, 열너비)
T,DATE,WON,NUM,PCT,CH,MU = "text","date","won","num","pct","choice","multi"
FIELDS = [
 ("기본정보","업체명",True,T,"텍스트","(예시) 한빛정밀(주)","사업자등록증상 상호",22),
 ("기본정보","사업자번호",True,T,"000-00-00000","123-45-67890","사업자등록번호. 법인은 법인등록번호가 아닌 사업자번호",15),
 ("기본정보","대표자",True,T,"텍스트","김대표","대표자 성명. 공동대표는 쉼표로 구분",10),
 ("기본정보","사업자유형",True,CH,"목록 선택","법인","",13),
 ("기본정보","업종",False,T,"텍스트","금속가공 제조업","주업종(업태·종목)",18),
 ("기본정보","지역",False,CH,"목록 선택","부산","사업장 소재 광역시·도",9),
 ("기본정보","개업일",False,DATE,"YYYY-MM-DD","2018-03-02","사업자등록증상 개업연월일",12),
 ("기본정보","주소",False,T,"텍스트","부산광역시 강서구 ○○로 12","사업장 주소",28),
 ("연락처","휴대전화",False,T,"010-0000-0000","010-1234-5678","대표자 또는 실무 담당자 휴대전화",15),
 ("연락처","대표전화",False,T,"000-000-0000","051-123-4567","",14),
 ("연락처","팩스",False,T,"000-000-0000","051-123-4568","",14),
 ("연락처","이메일",False,T,"텍스트","ceo@example.com","",20),
 ("연락처","홈페이지",False,T,"https://…","https://example.com","",20),
 ("연락처","연락처출처",False,T,"텍스트","대표 명함","연락처를 어디서 확인했는지",14),
 ("매출","매출2023",False,WON,"원","2,800,000,000","2023년 연매출(원 단위)",15),
 ("매출","매출2024",False,WON,"원","3,100,000,000","2024년 연매출(원 단위)",15),
 ("매출","매출2025",False,WON,"원","3,450,000,000","2025년 연매출. 결산 전이면 예상치 대신 비워 둠",15),
 ("매출","매출기준",False,CH,"목록 선택","부가세과표","위 매출의 근거 자료",12),
 ("재무(최근 결산)","총자산",False,WON,"원","2,400,000,000","재무상태표 자산총계",15),
 ("재무(최근 결산)","총부채",False,WON,"원","1,600,000,000","재무상태표 부채총계",15),
 ("재무(최근 결산)","자본총계",False,WON,"원","800,000,000","자본잠식이면 음수(-)로 입력",15),
 ("재무(최근 결산)","영업이익",False,WON,"원","210,000,000","손실이면 음수(-)",15),
 ("재무(최근 결산)","당기순이익",False,WON,"원","150,000,000","손실이면 음수(-)",15),
 ("재무(최근 결산)","부채비율보고",False,PCT,"% 숫자","200","총자산·총부채가 없을 때만 보고서상 부채비율(200% → 200)",12),
 ("재무(최근 결산)","유동비율",False,PCT,"% 숫자","135","보고서상 유동비율(135% → 135)",11),
 ("차입·만기","차입금잔액",False,WON,"원","900,000,000","금융권 증빙(부채증명 등) 기준 차입 합계",15),
 ("차입·만기","차입기준일",False,DATE,"YYYY-MM-DD","2026-10-15","차입금잔액의 기준일",12),
 ("차입·만기","참고차입금_미검증",False,WON,"원","950,000,000","WEDLY 등 분석보고서상 차입금. 증빙 잔액과 따로 기록",16),
 ("차입·만기","다음만기일",False,DATE,"YYYY-MM-DD","2027-02-28","가장 가까운 대출 만기일",12),
 ("차입·만기","만기금액",False,WON,"원","300,000,000","다음 만기에 도래하는 금액",15),
 ("차입·만기","만기경과미확인",False,CH,"예 / 아니오","아니오","만기가 지났는데 연장·상환 여부를 확인하지 못했으면 '예'",12),
 ("자금·기술","필요자금",False,WON,"원","500,000,000","이번에 필요한 자금 규모",15),
 ("자금·기술","자금용도",False,MU,"쉼표로 구분","운전, 대환","선택값 중 해당하는 것 모두",14),
 ("자금·기술","인증",False,MU,"쉼표로 구분","벤처, 기업부설연구소","보유 인증 모두. 없으면 비움",18),
 ("자금·기술","특허수",False,NUM,"건","2","등록 특허 건수",8),
 ("자금·기술","수출실적USD",False,NUM,"USD","120000","최근 연도 수출액(달러)",12),
 ("자금·기술","상시근로자",False,NUM,"명","18","4대보험 가입 기준",10),
 ("자금·기술","신청후보기관",False,MU,"쉼표로 구분","중진공, 지역신보","검토 중인 신청 기관",18),
 ("결격확인","납세상태",False,CH,"목록 선택","완납확인","국세·지방세 완납증명 확인 여부",11),
 ("결격확인","연체여부",False,CH,"목록 선택","없음","금융권 연체 여부",10),
 ("기타","정보기준일",True,DATE,"YYYY-MM-DD","2026-11-03","이 행의 정보를 확인한 날짜",12),
 ("기타","증빙구분메모",False,T,"텍스트","매출: 부가세과표증명 / 차입: 부채증명서","어떤 자료로 확인했는지, 특이사항",30),
]

wb = Workbook()

# ---------------- 작성안내 ----------------
g = wb.active; g.title = "작성안내"
g.sheet_view.showGridLines = False
widths = [5,13,18,6,13,26,44]
for i,w in enumerate(widths,1): g.column_dimensions[L(i)].width = w
g.merge_cells("A1:G1"); g["A1"] = "위들리 기업컨디션 등록서식 작성안내"
g["A1"].font = f(16,True,"FFFFFF"); g["A1"].fill = fill(NAVY); g["A1"].alignment = center
g.row_dimensions[1].height = 34
meta = [("문서명","위들리 기업컨디션 등록서식"),("버전","v1.0"),("작성일", datetime.date(2026,11,3)),("제출 시트","기업등록")]
r = 3
for k,v in meta:
    g.cell(r,1,k).font = f(10,True); g.merge_cells(start_row=r,start_column=1,end_row=r,end_column=2)
    g.cell(r,1).fill = fill(SOFT); g.cell(r,1).alignment = center
    g.merge_cells(start_row=r,start_column=3,end_row=r,end_column=7)
    c = g.cell(r,3,v); c.font = f(10); c.alignment = left
    if isinstance(v, datetime.date): c.number_format = "yyyy-mm-dd"
    for col in range(1,8): g.cell(r,col).border = box
    r += 1

def section(title):
    global r
    r += 1
    g.merge_cells(start_row=r,start_column=1,end_row=r,end_column=7)
    c = g.cell(r,1,title); c.font = f(12,True,TEAL)
    c.border = Border(bottom=Side(style="medium", color=TEAL))
    r += 1
def para(text, h=None):
    global r
    g.merge_cells(start_row=r,start_column=1,end_row=r,end_column=7)
    c = g.cell(r,1,text); c.font = f(10); c.alignment = left
    g.row_dimensions[r].height = h or 18
    r += 1

section("1. 목적")
para("정책자금 대출 가능성 1차 판단을 위해 기업 정보를 같은 형식으로 받습니다. 작성하신 내용은 위들리 컨디션 보드(노션 「위들리 기업컨디션 DB」)에 그대로 등록됩니다.", 32)

section("2. 작성 방법")
for s in ["① 「기업등록」 시트에서 한 행에 한 업체씩 작성합니다.",
          "② 회색 예시 행(7행)은 형식 참고용입니다. 작성 후 지우거나 그대로 두셔도 됩니다(등록 시 제외).",
          "③ 항목명 앞에 ● 표시가 있는 칸(업체명·사업자번호·대표자·사업자유형·정보기준일)은 반드시 작성합니다.",
          "④ '목록 선택' 칸은 셀을 누르면 나오는 목록에서 고릅니다. '쉼표로 구분' 칸은 아래 선택값 중 해당하는 것을 쉼표로 이어 적습니다.",
          "⑤ 금액은 원 단위 숫자만(쉼표·'원' 없이), 날짜는 YYYY-MM-DD, 비율은 % 기호 없이 숫자만 적습니다.",
          "⑥ 확인하지 못한 항목은 추정해서 채우지 말고 비워 둡니다."]:
    para(s, 30 if len(s) > 60 else 18)

section("3. 항목 정의")
heads = ["No","구분","항목","필수","입력 형식","예시","설명 / 선택값"]
for i,h in enumerate(heads,1):
    c = g.cell(r,i,h); c.font = f(10,True,"FFFFFF"); c.fill = fill(TEAL); c.alignment = center; c.border = box
g.row_dimensions[r].height = 22
r += 1
first_def = r
for n,(grp,name,req,kind,fmt,ex,desc,_) in enumerate(FIELDS,1):
    opts = CHOICES.get({"사업자유형":"사업자유형","지역":"지역","매출기준":"매출기준","만기경과미확인":"예아니오","납세상태":"납세상태","연체여부":"연체여부"}.get(name,""), None) if kind==CH else MULTI.get(name) if kind==MU else None
    d = desc + (("\n" if desc else "") + "선택값: " + " / ".join(opts) if opts else "")
    vals = [n,grp,name,"필수" if req else "",fmt,ex,d]
    for i,v in enumerate(vals,1):
        c = g.cell(r,i,v); c.font = f(9.5, i==3); c.border = box
        c.alignment = center if i in (1,2,4,5) else left
        if req and i==4: c.font = f(9.5,True,"B42318")
        if n%2==0: c.fill = fill(GRAY)
    lines = max(1, len(d)//34 + d.count("\n") + 1)
    g.row_dimensions[r].height = max(20, 15*lines)
    r += 1

section("4. 유의사항")
for s in ["• 증빙으로 확인한 값과 보고서 참고값은 구분합니다. WEDLY 등 분석보고서의 차입금은 「참고차입금_미검증」에, 매출 추정치는 「매출기준」을 'WEDLY추정'으로 표시합니다.",
          "• 대표자 연락처 등 개인정보가 포함되므로 메일 첨부 시 파일 암호를 걸어 전달해 주세요.",
          "• 문의: 서식 작성 중 궁금한 점은 요청하신 담당자에게 회신해 주세요."]:
    para(s, 32 if len(s) > 60 else 18)

g.print_options.horizontalCentered = True
g.page_setup.orientation = "portrait"; g.page_setup.paperSize = g.PAPERSIZE_A4
g.page_setup.fitToWidth = 1; g.page_setup.fitToHeight = 0; g.sheet_properties.pageSetUpPr.fitToPage = True
g.print_title_rows = None

# ---------------- 선택값 (숨김) ----------------
o = wb.create_sheet("선택값")
ranges = {}
col = 1
for k,vals in {**CHOICES, **MULTI}.items():
    o.cell(1,col,k).font = f(10,True)
    for i,v in enumerate(vals,2): o.cell(i,col,v).font = f(10)
    ranges[k] = f"선택값!${L(col)}$2:${L(col)}${len(vals)+1}"
    o.column_dimensions[L(col)].width = 14
    col += 1
o.sheet_state = "hidden"

# ---------------- 기업등록 ----------------
s = wb.create_sheet("기업등록", 1)
s.sheet_view.showGridLines = False
N = len(FIELDS); last = L(N+1)   # A열 = 번호
s.column_dimensions["A"].width = 5
for i,fd in enumerate(FIELDS, 2): s.column_dimensions[L(i)].width = fd[7]

s.merge_cells(f"A1:{last}1"); s["A1"] = "위들리 기업컨디션 등록서식"
s["A1"].font = f(16,True,"FFFFFF"); s["A1"].fill = fill(NAVY); s["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
s.row_dimensions[1].height = 32
# 작성 정보
info = [("작성 기관",""),("작성자",""),("작성일","")]
c0 = 1
for k,_ in info:
    s.cell(2,c0+1,k).font = f(9.5,True); s.cell(2,c0+1).fill = fill(SOFT); s.cell(2,c0+1).alignment = center; s.cell(2,c0+1).border = box
    s.merge_cells(start_row=2,start_column=c0+2,end_row=2,end_column=c0+3)
    for cc in range(c0+2,c0+4): s.cell(2,cc).border = box
    c0 += 3
s.cell(2,4).number_format = "@"
s.cell(2,8).number_format = "yyyy-mm-dd"
s.cell(3,2,"● 필수 항목   ·   흰 칸에 입력   ·   회색 7행은 예시   ·   작성 방법은 「작성안내」 시트 참고").font = f(9,False,"5A6863")
s.row_dimensions[2].height = 22

# 구분 머리행(4), 항목명(5), 입력형식(6)
s.cell(4,1,"No"); s.merge_cells("A4:A6")
groups = []
for i,fd in enumerate(FIELDS,2):
    if not groups or groups[-1][0] != fd[0]: groups.append([fd[0],i,i])
    else: groups[-1][2] = i
palette = ["1D5961","2F6E73","3F7C6A","5A6E3A","7A5C2E","6B4E71","8A3B3B","4F5B66"]
for gi,(name,a,b) in enumerate(groups):
    if b>a: s.merge_cells(start_row=4,start_column=a,end_row=4,end_column=b)
    c = s.cell(4,a,name); c.font = f(10,True,"FFFFFF"); c.alignment = center
    for cc in range(a,b+1): s.cell(4,cc).fill = fill(palette[gi%len(palette)]); s.cell(4,cc).border = box
for i,fd in enumerate(FIELDS,2):
    c = s.cell(5,i,("● " if fd[2] else "")+fd[1]); c.font = f(9.5,True, "B42318" if fd[2] else "1A1A1A")
    c.fill = fill(SOFT); c.alignment = center; c.border = box
    if fd[6]: c.comment = Comment(fd[6], "서식 안내", width=220, height=70)
    c = s.cell(6,i,fd[4]); c.font = f(8.5,False,"5A6863"); c.fill = fill(SOFT); c.alignment = center; c.border = box
for rr in (4,5,6):
    s.cell(rr,1).font = f(10,True,"FFFFFF" if rr==4 else "1A1A1A"); s.cell(rr,1).fill = fill(palette[0] if rr==4 else SOFT); s.cell(rr,1).alignment = center; s.cell(rr,1).border = box
s.row_dimensions[4].height = 20; s.row_dimensions[5].height = 30; s.row_dimensions[6].height = 18

EX = 7; FIRST = 8; ROWS = 100; LAST = FIRST+ROWS-1
def fmt_cell(c, kind):
    if kind == WON: c.number_format = '#,##0;-#,##0'
    elif kind == DATE: c.number_format = "yyyy-mm-dd"
    elif kind in (NUM,PCT): c.number_format = '#,##0'
    else: c.number_format = "@"
# 예시 행
s.cell(EX,1,"예시").font = f(9,True,"7A8582"); s.cell(EX,1).alignment = center; s.cell(EX,1).fill = fill("E4E8E7"); s.cell(EX,1).border = box
for i,fd in enumerate(FIELDS,2):
    v = fd[5]; kind = fd[3]
    if kind == WON: v = int(v.replace(",",""))
    elif kind in (NUM,PCT): v = int(v)
    elif kind == DATE: v = datetime.date.fromisoformat(v)
    c = s.cell(EX,i,v); c.font = f(9.5,False,"6F7B77",True); c.fill = fill("E4E8E7"); c.border = box
    c.alignment = Alignment(horizontal="right" if kind in (WON,NUM,PCT) else "center" if kind in (DATE,CH) else "left", vertical="center")
    fmt_cell(c, kind)
# 입력 행
for rr in range(FIRST, LAST+1):
    c = s.cell(rr,1,rr-FIRST+1); c.font = f(9,False,"7A8582"); c.alignment = center; c.border = box; c.fill = fill(GRAY)
    for i,fd in enumerate(FIELDS,2):
        c = s.cell(rr,i); c.border = box; c.font = f(10)
        kind = fd[3]
        c.alignment = Alignment(horizontal="right" if kind in (WON,NUM,PCT) else "center" if kind in (DATE,CH) else "left", vertical="center")
        fmt_cell(c, kind)
    s.row_dimensions[rr].height = 20

# 데이터 유효성
def add_dv(dv, col):
    dv.add(f"{L(col)}{FIRST}:{L(col)}{LAST}"); s.add_data_validation(dv)
for i,fd in enumerate(FIELDS,2):
    name, kind = fd[1], fd[3]
    if kind == CH:
        key = {"만기경과미확인":"예아니오"}.get(name, name)
        dv = DataValidation(type="list", formula1=f"={ranges[key]}", allow_blank=True, showErrorMessage=True,
                            errorTitle="목록에서 선택", error="셀의 ▼ 목록에서 골라 주세요.")
        add_dv(dv, i)
    elif kind == DATE:
        dv = DataValidation(type="date", operator="between", formula1="DATE(1950,1,1)", formula2="DATE(2100,12,31)", allow_blank=True,
                            showErrorMessage=True, errorTitle="날짜 형식", error="YYYY-MM-DD 형식의 날짜로 입력해 주세요. 예: 2026-11-03")
        add_dv(dv, i)
    elif kind in (WON,NUM,PCT):
        neg = name in ("자본총계","영업이익","당기순이익")
        dv = DataValidation(type="decimal", operator="between" if not neg else "between",
                            formula1="-1000000000000000" if neg else "0", formula2="1000000000000000", allow_blank=True,
                            showErrorMessage=True, errorTitle="숫자만 입력",
                            error="쉼표·단위 없이 숫자만 입력해 주세요." + (" 손실·잠식은 음수(-)로." if neg else ""))
        add_dv(dv, i)
    elif kind == MU:
        dv = DataValidation(type="custom", formula1="TRUE", allow_blank=True, showInputMessage=True,
                            promptTitle="쉼표로 구분", prompt="선택값: " + ", ".join(MULTI[name]))
        add_dv(dv, i)

s.freeze_panes = "C8"
s.auto_filter.ref = f"A6:{last}{LAST}"
s.page_setup.orientation = "landscape"; s.page_setup.paperSize = s.PAPERSIZE_A4
s.sheet_properties.pageSetUpPr.fitToPage = True; s.page_setup.fitToWidth = 0; s.page_setup.fitToHeight = 0
s.print_title_rows = "4:6"; s.print_title_cols = "A:B"

wb.active = 0
out = "/home/user/Brief/forms/위들리_기업컨디션_등록서식_v1.0.xlsx"
wb.save(out); print(out)
