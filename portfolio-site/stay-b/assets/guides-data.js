/* Stay B guide hub content: 4 stages x 15 cards (planning v2, section 4-4).
   Edit copy here only. Each text has en + ko; add "ne" later with the same shape.
   Markers inside text:
     [[tbc]]        -> "to be confirmed / 확인 예정" chip (facts waiting for agent review)
     [[ph:...]]     -> dashed placeholder chip, shown as written (content still to come)
   guideUrl: leave "" until the full guide page exists; then the button becomes a link. */
window.STAYB_GUIDES = {
  stages: [
    { key:"arrive", n:1, icon:"i-bag",
      name:{ en:"Before I arrive", ko:"입국 전" },
      desc:{ en:"Packing, housing, first days", ko:"준비물, 숙소, 첫날 계획" },
      help:[
        { href:"#off-session", en:"Pre-arrival info session", ko:"입국 전 설명회" },
        { href:"#off-firstweek", en:"First-week support", ko:"공항부터 첫 주까지" },
        { href:"#ask", en:"Ask us", ko:"질문하기", ask:{ stage:"arrive", topic:"" } }
      ] },
    { key:"settle", n:2, icon:"i-key",
      name:{ en:"Just arrived", ko:"정착 중" },
      desc:{ en:"First 3 months: registration, bank, phone", ko:"입국 후 3개월: 외국인등록, 은행, 휴대폰" },
      help:[
        { href:"#off-settle", en:"Settling-in help", ko:"정착 동행·예약 안내" },
        { href:"#off-kit", en:"Welcome kit & membership card", ko:"웰컴 키트·멤버십 카드" },
        { href:"#ask", en:"Ask us", ko:"질문하기", ask:{ stage:"settle", topic:"" } }
      ] },
    { key:"life", n:3, icon:"i-book",
      name:{ en:"Study, life & work", ko:"생활·일" },
      desc:{ en:"Part-time work, saving money, friends", ko:"아르바이트, 생활비, 친구" },
      help:[
        { href:"#off-discount", en:"Member discounts", ko:"제휴업체 할인" },
        { href:"#off-meetup", en:"Meetups & communities", ko:"지역 행사·국가별 모임" },
        { href:"#off-career", en:"Career talks", ko:"취업 특강" },
        { href:"#ask", en:"Ask about part-time work", ko:"아르바이트 질문하기", ask:{ stage:"life", topic:"work" } }
      ] },
    { key:"visa", n:4, icon:"i-cal",
      name:{ en:"Visa & after graduation", ko:"비자·졸업 이후" },
      desc:{ en:"Expiry dates, passport, staying on", ko:"만료일, 여권, 졸업 후 진로" },
      help:[
        { href:"#off-career", en:"Career talks", ko:"취업 특강" },
        { href:"#ask", en:"Ask us", ko:"질문하기", ask:{ stage:"visa", topic:"visa" } }
      ] }
  ],

  cards: [
    /* ---------- 1. Before I arrive ---------- */
    { id:"1-1", stage:"arrive", checklist:true, list:"check",
      title:{ en:"Documents to bring", ko:"챙겨 갈 서류" },
      sum:{ en:"Keep these in your hand luggage, not in your suitcase.", ko:"캐리어가 아니라 기내 가방에 넣어 두세요." },
      points:{
        en:["Passport, with enough validity left [[tbc]]","Your visa and your school's admission letter","Copies of your academic certificates","A few passport-size photos [[tbc]]","Some Korean won in cash for your first days"],
        ko:["유효기간이 충분히 남은 여권 [[tbc]]","비자, 학교 입학허가서","학력 증명서 사본","여권용 사진 몇 장 [[tbc]]","첫 며칠 쓸 한국 돈 약간"] },
      source:{ en:"Your school's international office · Korea Immigration Service", ko:"학교 국제처 · 법무부 출입국·외국인정책본부" },
      guideUrl:"" },
    { id:"1-2", stage:"arrive", list:"dot",
      title:{ en:"Finding a safe place to live", ko:"안전하게 숙소 구하기" },
      sum:{ en:"Before paying a deposit, check your housing options with your school.", ko:"보증금을 보내기 전에 기숙사와 학교의 주거 안내를 먼저 확인하세요." },
      points:{
        en:["Ask your school about dormitories first.","Never send a deposit before you see a written contract.","Check that the person you pay is the real owner or a registered real estate agent.","Keep every receipt and message."],
        ko:["먼저 학교 기숙사를 알아보세요.","계약서를 보기 전에는 보증금을 보내지 마세요.","돈을 받는 사람이 실제 집주인이나 등록된 공인중개사인지 확인하세요.","영수증과 메시지는 모두 보관하세요."] },
      note:{ en:"A housing list will be shared at our info sessions.", ko:"숙소 목록은 입국 전 설명회에서 안내해요." }, notePh:true,
      source:{ en:"Your school's international office", ko:"학교 국제처" },
      guideUrl:"https://www.studyinkorea.go.kr/en/life/livingAndHousing.do" },
    { id:"1-3", stage:"arrive", list:"dot",
      title:{ en:"Your first day in Korea", ko:"한국에서의 첫날" },
      sum:{ en:"Landing, getting a SIM, and getting to your campus.", ko:"도착, 유심, 캠퍼스까지 이동." },
      points:{
        en:["Get a prepaid SIM at the airport with your passport, so you can use maps and messengers.","Buy a transport card for buses and the subway.","Plan how you will get to your campus before you land (train, bus or domestic flight).","Save your school's and dormitory's address in Korean."],
        ko:["공항에서 여권으로 선불 유심을 사면 지도와 메신저를 바로 쓸 수 있어요.","버스·지하철용 교통카드를 사세요.","캠퍼스까지 가는 방법(기차, 버스, 국내선)을 도착 전에 정해 두세요.","학교·기숙사 주소를 한국어로 저장해 두세요."] },
      source:{ en:"Korea Tourism Organization", ko:"한국관광공사" },
      guideUrl:"" },

    /* ---------- 2. Just arrived ---------- */
    { id:"2-1", stage:"settle", checklist:true, list:"check",
      title:{ en:"Alien registration: what to bring", ko:"외국인등록 준비물" },
      sum:{"en": "Check the requirements for your stay before booking a visit.", "ko": "방문 예약 전에 본인 체류자격의 등록 요건을 확인하세요."},
      points:{"en": ["Use Hi Korea to find the office for your home address.", "Confirm the application deadline, documents and fee with the office or 1345."], "ko": ["하이코리아에서 거주지 관할 출입국 기관을 찾으세요.", "제출 기한·준비 서류·수수료는 관할 기관 또는 1345에서 확인하세요."]},
      source:{"en": "Hi Korea", "ko": "하이코리아"},
      guideUrl:"https://www.hikorea.go.kr/Main.pt?locale=en" },
    { id:"2-2", stage:"settle", list:"num",
      title:{ en:"Bank and phone: the right order", ko:"은행·휴대폰 개설 순서" },
      sum:{ en:"Some steps need your alien registration card first. This order saves trips.", ko:"외국인등록증이 있어야 되는 일이 있어요. 이 순서면 헛걸음을 줄여요." },
      points:{
        en:["Prepaid SIM with your passport (day 1)","Alien registration (book and visit)","Bank account with your card and Korean phone number [[tbc]]","Switch to a monthly phone plan if you want [[tbc]]"],
        ko:["여권으로 선불 유심 (첫날)","외국인등록 (예약 후 방문)","외국인등록증과 한국 번호로 은행 계좌 개설 [[tbc]]","원하면 월정액 요금제로 변경 [[tbc]]"] },
      source:{ en:"Financial Supervisory Service · your bank", ko:"금융감독원 · 거래 은행" },
      guideUrl:"" },
    { id:"2-3", stage:"settle", list:"dot",
      title:{ en:"Health insurance", ko:"건강보험" },
      sum:{"en": "Check how health insurance applies to your stay.", "ko": "내 체류자격에 적용되는 건강보험 안내를 확인하세요."},
      points:{"en": ["Use the NHIS foreign resident guide to check enrollment and contributions.", "Ask your international office whether your school offers additional cover."], "ko": ["건강보험공단의 외국인 안내에서 가입과 보험료를 확인하세요.", "학교에서 별도 보험을 제공하는지는 국제처에 문의하세요."]},
      source:{"en": "National Health Insurance Service", "ko": "국민건강보험공단"},
      guideUrl:"https://www.nhis.or.kr/english/wbheaa02900m01.do" },
    { id:"2-4", stage:"settle", list:"dot",
      title:{ en:"Getting around and emergencies", ko:"교통·긴급 연락처" },
      sum:{ en:"Save these numbers today.", ko:"이 번호들은 오늘 저장해 두세요." },
      points:{
        en:["112 Police · 119 Fire and ambulance","1345 Immigration Contact Center, with foreign language help [[tbc]]","Map apps that work well in Korea: Naver Map, KakaoMap","One transport card works on Busan buses and subway."],
        ko:["112 경찰 · 119 화재·구급","1345 외국인종합안내센터, 외국어 상담 [[tbc]]","한국에서 잘 되는 지도 앱: 네이버 지도, 카카오맵","교통카드 하나로 부산 버스·지하철을 탈 수 있어요."] },
      source:{ en:"Korea Immigration Service · Busan Metropolitan City", ko:"법무부 · 부산광역시" },
      guideUrl:"https://www.immigration.go.kr/immigration_eng/1862/subview.do" },

    /* ---------- 3. Study, life & work ---------- */
    { id:"3-1", stage:"life", list:"dot",
      title:{ en:"Part-time work: the basic rules", ko:"시간제취업 기본 규칙" },
      sum:{ en:"You need permission before your first day of work. Not after.", ko:"일을 시작하기 전에 허가를 받아야 해요. 시작한 뒤가 아니라." },
      points:{
        en:["Get part-time work permission from immigration first, with your school's confirmation [[tbc]]","Allowed hours depend on your visa, Korean level and whether it is semester or vacation [[tbc]]","Some kinds of work are not allowed for students [[tbc]]","Working without permission, or too many hours, can put your visa at risk."],
        ko:["학교 확인을 받아 출입국에서 시간제취업 허가를 먼저 받으세요 [[tbc]]","허용 시간은 체류자격, 한국어 능력, 학기 중·방학에 따라 달라요 [[tbc]]","학생에게 허용되지 않는 일이 있어요 [[tbc]]","허가 없이 일하거나 시간을 넘기면 체류자격에 문제가 생길 수 있어요."] },
      source:{ en:"HiKorea · your school's international office", ko:"하이코리아 · 학교 국제처" },
      guideUrl:"https://studyinkorea.go.kr/en/life/residenceAndStayInfo.do?tab=part-time-job" },
    { id:"3-2", stage:"life", checklist:true, list:"check",
      title:{ en:"Before your first job: a checklist", ko:"첫 아르바이트 전 체크리스트" },
      sum:{ en:"Five things to check before you say yes.", ko:"하겠다고 말하기 전에 확인할 다섯 가지." },
      points:{
        en:["Your work permission is approved.","You have a written work contract.","Your pay is at least the minimum wage [[tbc]]","You know your pay day and get a pay slip.","Never hand over your passport or alien registration card to an employer."],
        ko:["시간제취업 허가가 났다.","근로계약서를 썼다.","시급이 최저임금 이상이다 [[tbc]]","월급날을 알고, 급여명세서를 받는다.","여권이나 외국인등록증을 사장님에게 맡기지 않는다."] },
      note:{ en:"Stay B shares general job information. Job introductions are made by registered employment agencies and job centers.", ko:"Stay B는 일반 일자리 정보만 안내해요. 일자리 소개는 등록된 직업소개소와 고용센터가 합니다." },
      source:{ en:"Ministry of Employment and Labor", ko:"고용노동부" },
      guideUrl:"https://studyinkorea.go.kr/en/life/residenceAndStayInfo.do?tab=part-time-job" },
    { id:"3-3", stage:"life", list:"dot",
      title:{ en:"Saving on everyday costs", ko:"생활비 아끼기" },
      sum:{ en:"Small savings add up over a semester.", ko:"작은 절약이 한 학기면 커져요." },
      points:{
        en:["Use student discounts on transport where available [[tbc]]","Cook with friends and shop at traditional markets.","Show your Stay B membership card at partner shops for discounts.","Check your school for free events and meals."],
        ko:["해당되면 학생 교통 할인을 쓰세요 [[tbc]]","친구와 같이 요리하고, 전통시장을 이용해 보세요.","제휴 매장에서 Stay B 멤버십 카드를 보여 주고 할인받으세요.","학교의 무료 행사·식사 정보를 챙기세요."] },
      source:{ en:"Busan Metropolitan City", ko:"부산광역시" },
      guideUrl:"" },
    { id:"3-4", stage:"life", list:"dot",
      title:{ en:"When you feel alone", ko:"외롭거나 힘들 때" },
      sum:{ en:"Feeling homesick is normal. You do not have to handle it alone.", ko:"향수병은 자연스러운 거예요. 혼자 견디지 않아도 돼요." },
      points:{
        en:["Your school has a counseling center. Ask the international office.","Join students from your country at our meetups.","If you are in danger, call 112 or 119."],
        ko:["학교에 상담센터가 있어요. 국제처에 물어보세요.","같은 나라 학생들이 모이는 Stay B 모임에 와 보세요.","위험할 때는 112나 119로 전화하세요."] },
      source:{ en:"Your school", ko:"재학 중인 학교" },
      guideUrl:"" },

    /* ---------- 4. Visa & after graduation ---------- */
    { id:"4-1", stage:"visa", list:"dot", tool:"expiry", wide:true,
      title:{ en:"Know your dates", ko:"내 만료일 알기" },
      sum:{"en": "Use the date on your residence document to count the days remaining.", "ko": "체류 서류에 표시된 만료일을 입력해 남은 날짜를 확인하세요."},
      points:{"en": ["Check the expiry date on your current residence record.", "Use Hi Korea to check the procedure for your status, or ask 1345."], "ko": ["현재 체류 서류에서 만료일을 확인하세요.", "하이코리아 또는 1345에서 본인의 연장 절차를 확인하세요."]},
      source:{"en": "Hi Korea", "ko": "하이코리아"},
      guideUrl:"https://www.hikorea.go.kr/Main.pt?locale=en" },
    { id:"4-2", stage:"visa", list:"dot",
      title:{ en:"Extension or passport renewal?", ko:"연장과 여권 갱신은 달라요" },
      sum:{"en": "Check which office handles each document.", "ko": "서류에 따라 담당 기관을 확인하세요."},
      points:{"en": ["For a stay extension, contact Korean immigration.", "For passport renewal, contact the embassy or consulate of your country.", "After renewal, ask immigration what changes you need to report."], "ko": ["체류기간 연장은 한국 출입국 기관에 문의하세요.", "여권 갱신은 본국 대사관 또는 영사관에 문의하세요.", "갱신 뒤에 신고할 내용이 있는지 출입국에 확인하세요."]},
      source:{"en": "Korea Immigration Service", "ko": "법무부 출입국·외국인정책본부"},
      guideUrl:"https://www.immigration.go.kr/immigration_eng/1862/subview.do" },
    { id:"4-3", stage:"visa", list:"dot",
      title:{ en:"Staying after graduation", ko:"졸업 후 한국에 남는 길" },
      sum:{"en": "Plan your next step with your university and immigration office.", "ko": "졸업 전 학교 국제처와 출입국 기관에 다음 절차를 확인하세요."},
      points:{"en": ["Read the official information on residency and job-seeking after graduation.", "Ask your international office which documents your school can issue."], "ko": ["공식 체류 안내에서 졸업 후 구직과 관련된 항목을 확인하세요.", "학교에서 발급받을 서류는 국제처에 문의하세요."]},
      source:{"en": "Study in Korea", "ko": "스터디인코리아"},
      guideUrl:"https://studyinkorea.go.kr/en/life/residenceAndStayInfo.do" },
    { id:"4-4", stage:"visa", list:"dot",
      title:{ en:"Big life changes", ko:"삶의 큰 변화가 생길 때" },
      sum:{"en": "Family visits and changes in your circumstances can involve different procedures.", "ko": "가족 방문이나 생활 여건의 변화에 따라 필요한 절차가 다를 수 있어요."},
      points:{"en": ["Before planning a family visit or a change of status, contact immigration or your consulate.", "Have your question and current status ready when contacting 1345."], "ko": ["가족 방문이나 체류자격 변경을 준비할 때 출입국 기관 또는 영사관에 먼저 문의하세요.", "1345에 문의할 때는 현재 체류자격과 궁금한 점을 정리해 두세요."]},
      note:{ en:"Family coming to visit you in Korea? NOWRO Korea can help with family trips. (coming soon)", ko:"가족이 한국에 방문할 때도, NOWRO Korea가 가족 여행을 도와요. (연결 예정)" },
      source:{"en": "Korea Immigration Service", "ko": "법무부 출입국·외국인정책본부"},
      guideUrl:"https://www.immigration.go.kr/immigration_eng/1862/subview.do" }
  ]
};
