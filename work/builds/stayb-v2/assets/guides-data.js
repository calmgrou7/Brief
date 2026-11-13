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
        { href:"#off-firstweek", en:"First-week support", ko:"공항부터 첫 주까지" }
      ] },
    { key:"settle", n:2, icon:"i-key",
      name:{ en:"Just arrived", ko:"정착 중" },
      desc:{ en:"First 3 months: registration, bank, phone", ko:"입국 후 3개월: 외국인등록, 은행, 휴대폰" },
      help:[
        { href:"#off-settle", en:"Settling-in help", ko:"정착 동행·예약 안내" },
        { href:"#off-kit", en:"Welcome kit & membership card", ko:"웰컴 키트·멤버십 카드" }
      ] },
    { key:"life", n:3, icon:"i-book",
      name:{ en:"Study, life & work", ko:"생활·일" },
      desc:{ en:"Part-time work, saving money, friends", ko:"아르바이트, 생활비, 친구" },
      help:[
        { href:"#off-discount", en:"Member discounts", ko:"제휴업체 할인" },
        { href:"#off-meetup", en:"Meetups & communities", ko:"지역 행사·국가별 모임" },
        { href:"#off-career", en:"Career talks", ko:"취업 특강" }
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
      sum:{ en:"Most scams happen before you even arrive. Slow down before you pay.", ko:"사기는 입국 전에 가장 많이 일어나요. 돈 보내기 전에 한 번 더 확인하세요." },
      points:{
        en:["Ask your school about dormitories first.","Never send a deposit before you see a written contract.","Check that the person you pay is the real owner or a registered real estate agent.","Keep every receipt and message."],
        ko:["먼저 학교 기숙사를 알아보세요.","계약서를 보기 전에는 보증금을 보내지 마세요.","돈을 받는 사람이 실제 집주인이나 등록된 공인중개사인지 확인하세요.","영수증과 메시지는 모두 보관하세요."] },
      note:{ en:"A housing list will be shared at our info sessions. [[ph:[자리표시: 숙소 목록 공개 방식]]]", ko:"숙소 목록은 입국 전 설명회에서 안내해요. [[ph:[자리표시: 숙소 목록 공개 방식]]]" }, notePh:true,
      source:{ en:"Your school's international office", ko:"학교 국제처" },
      guideUrl:"" },
    { id:"1-3", stage:"arrive", list:"dot",
      title:{ en:"Your first day in Korea", ko:"한국에서의 첫날" },
      sum:{ en:"Landing, getting a SIM, and getting to Busan.", ko:"도착, 유심, 부산까지 이동." },
      points:{
        en:["Get a prepaid SIM at the airport with your passport, so you can use maps and messengers.","Buy a transport card for buses and the subway.","Plan how you will get to Busan before you land (train, bus or domestic flight).","Save your school's and dormitory's address in Korean."],
        ko:["공항에서 여권으로 선불 유심을 사면 지도와 메신저를 바로 쓸 수 있어요.","버스·지하철용 교통카드를 사세요.","부산까지 가는 방법(기차, 버스, 국내선)을 도착 전에 정해 두세요.","학교·기숙사 주소를 한국어로 저장해 두세요."] },
      source:{ en:"Korea Tourism Organization", ko:"한국관광공사" },
      guideUrl:"" },

    /* ---------- 2. Just arrived ---------- */
    { id:"2-1", stage:"settle", checklist:true, list:"check",
      title:{ en:"Alien registration: what to bring", ko:"외국인등록 준비물" },
      sum:{ en:"If you stay in Korea longer than 90 days, you register with immigration. Book early.", ko:"한국에 90일 넘게 머물면 출입국에 외국인등록을 해야 해요. 예약은 일찍." },
      points:{
        en:["Deadline: within 90 days of arrival [[tbc]]","Book a visit online through HiKorea [[tbc]]","Usually needed: application form, passport, one photo, proof of enrollment, proof of address, fee [[tbc]]","Your card arrives a few weeks later [[tbc]]. Keep your receipt until then."],
        ko:["기한: 입국 후 90일 이내 [[tbc]]","하이코리아에서 방문 예약 [[tbc]]","보통 필요한 것: 신청서, 여권, 사진 1장, 재학증명서, 거주지 증빙, 수수료 [[tbc]]","카드는 몇 주 뒤에 나와요 [[tbc]]. 그때까지 접수증을 보관하세요."] },
      source:{ en:"HiKorea · Busan Immigration Office [[tbc]]", ko:"하이코리아 · 부산출입국·외국인청 [[tbc]]" },
      guideUrl:"" },
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
      sum:{ en:"International students are generally covered by Korea's National Health Insurance. Know when it starts and pay on time.", ko:"유학생도 대체로 국민건강보험에 가입돼요. 언제 시작되는지 알고, 보험료는 제때 내세요." },
      points:{
        en:["When coverage starts depends on your visa type [[tbc]]","You will get a monthly bill [[tbc]]","Unpaid bills can cause problems when you extend your stay [[tbc]]","Ask your school if you also have school insurance."],
        ko:["가입 시점은 체류자격에 따라 달라요 [[tbc]]","매달 보험료 고지서가 와요 [[tbc]]","보험료를 안 내면 체류기간 연장 때 문제가 될 수 있어요 [[tbc]]","학교 보험이 따로 있는지 국제처에 물어보세요."] },
      source:{ en:"National Health Insurance Service", ko:"국민건강보험공단" },
      guideUrl:"" },
    { id:"2-4", stage:"settle", list:"dot",
      title:{ en:"Getting around and emergencies", ko:"교통·긴급 연락처" },
      sum:{ en:"Save these numbers today.", ko:"이 번호들은 오늘 저장해 두세요." },
      points:{
        en:["112 Police · 119 Fire and ambulance","1345 Immigration Contact Center, with foreign language help [[tbc]]","Map apps that work well in Korea: Naver Map, KakaoMap","One transport card works on Busan buses and subway."],
        ko:["112 경찰 · 119 화재·구급","1345 외국인종합안내센터, 외국어 상담 [[tbc]]","한국에서 잘 되는 지도 앱: 네이버 지도, 카카오맵","교통카드 하나로 부산 버스·지하철을 탈 수 있어요."] },
      source:{ en:"Korea Immigration Service · Busan Metropolitan City", ko:"법무부 · 부산광역시" },
      guideUrl:"" },

    /* ---------- 3. Study, life & work ---------- */
    { id:"3-1", stage:"life", list:"dot",
      title:{ en:"Part-time work: the basic rules", ko:"시간제취업 기본 규칙" },
      sum:{ en:"You need permission before your first day of work. Not after.", ko:"일을 시작하기 전에 허가를 받아야 해요. 시작한 뒤가 아니라." },
      points:{
        en:["Get part-time work permission from immigration first, with your school's confirmation [[tbc]]","Allowed hours depend on your visa, Korean level and whether it is semester or vacation [[tbc]]","Some kinds of work are not allowed for students [[tbc]]","Working without permission, or too many hours, can put your visa at risk."],
        ko:["학교 확인을 받아 출입국에서 시간제취업 허가를 먼저 받으세요 [[tbc]]","허용 시간은 체류자격, 한국어 능력, 학기 중·방학에 따라 달라요 [[tbc]]","학생에게 허용되지 않는 일이 있어요 [[tbc]]","허가 없이 일하거나 시간을 넘기면 체류자격에 문제가 생길 수 있어요."] },
      source:{ en:"HiKorea · your school's international office", ko:"하이코리아 · 학교 국제처" },
      guideUrl:"" },
    { id:"3-2", stage:"life", checklist:true, list:"check",
      title:{ en:"Before your first job: a checklist", ko:"첫 아르바이트 전 체크리스트" },
      sum:{ en:"Five things to check before you say yes.", ko:"하겠다고 말하기 전에 확인할 다섯 가지." },
      points:{
        en:["Your work permission is approved.","You have a written work contract.","Your pay is at least the minimum wage [[tbc]]","You know your pay day and get a pay slip.","Never hand over your passport or alien registration card to an employer."],
        ko:["시간제취업 허가가 났다.","근로계약서를 썼다.","시급이 최저임금 이상이다 [[tbc]]","월급날을 알고, 급여명세서를 받는다.","여권이나 외국인등록증을 사장님에게 맡기지 않는다."] },
      note:{ en:"Stay B shares general job information. Job introductions are made by registered employment agencies and job centers.", ko:"Stay B는 일반 일자리 정보만 안내해요. 일자리 소개는 등록된 직업소개소와 고용센터가 합니다." },
      source:{ en:"Ministry of Employment and Labor", ko:"고용노동부" },
      guideUrl:"" },
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
      sum:{ en:"Your stay expiry date is on your alien registration card. Missing it can cause serious problems.", ko:"체류 만료일은 외국인등록증에 있어요. 놓치면 큰 문제가 될 수 있어요." },
      points:{
        en:["Apply to extend before your expiry date [[tbc]]","Extensions are applied for through immigration (HiKorea).","Unpaid health insurance or missing school documents can slow things down [[tbc]]","Stay B plans to remind you 90, 30 and 7 days before your date."],
        ko:["만료일 전에 연장을 신청하세요 [[tbc]]","연장은 출입국(하이코리아)을 통해 신청해요.","건강보험료 미납이나 학교 서류가 없으면 늦어질 수 있어요 [[tbc]]","Stay B는 만료 90일·30일·7일 전에 알려 드릴 계획이에요."] },
      source:{ en:"HiKorea", ko:"하이코리아" },
      guideUrl:"" },
    { id:"4-2", stage:"visa", list:"dot",
      title:{ en:"Extension or passport renewal?", ko:"연장과 여권 갱신은 달라요" },
      sum:{ en:"They are two different things, done in two different places.", ko:"둘은 다른 일이고, 하는 곳도 달라요." },
      points:{
        en:["Extending your stay: Korean immigration office.","Renewing your passport: Embassy of Nepal in Seoul [[tbc]]","After you get a new passport, report the change to immigration within a set period [[tbc]]"],
        ko:["체류기간 연장: 한국 출입국 기관","여권 갱신: 주한 네팔대사관(서울) [[tbc]]","새 여권을 받으면 정해진 기간 안에 출입국에 변경 신고 [[tbc]]"] },
      source:{ en:"HiKorea · Embassy of Nepal in Seoul", ko:"하이코리아 · 주한 네팔대사관" },
      guideUrl:"" },
    { id:"4-3", stage:"visa", list:"dot",
      title:{ en:"Staying after graduation", ko:"졸업 후 한국에 남는 길" },
      sum:{ en:"Some students leave only because no one explained the options. Start looking a semester early.", ko:"방법을 몰라서 졸업과 함께 떠나는 학생도 있어요. 한 학기 전부터 알아보세요." },
      points:{
        en:["Job-seeking visa after graduation [[tbc]]","Work visas for specific jobs [[tbc]]","Regional programs for living and working in Busan and Gyeongnam [[tbc]]","Which path fits you is a decision for a qualified administrative agent."],
        ko:["졸업 후 구직 비자 [[tbc]]","특정 직종 취업 비자 [[tbc]]","부산·경남 지역 정착 제도 [[tbc]]","어떤 길이 맞는지는 자격 있는 행정사가 판단해요."] },
      source:{ en:"HiKorea · Ministry of Justice", ko:"하이코리아 · 법무부" },
      guideUrl:"" },
    { id:"4-4", stage:"visa", list:"dot",
      title:{ en:"Big life changes", ko:"삶의 큰 변화가 생길 때" },
      sum:{ en:"Getting married or inviting family changes your stay status. Start with the right person.", ko:"결혼이나 가족 초청은 체류자격이 바뀌는 일이에요. 맞는 사람과 시작하세요." },
      points:{
        en:["Guide: status change after marriage (coming soon)","Guide: inviting family (coming soon)","Guide: getting ready for permanent residency (coming soon)","For your own case, ask us and we will connect you to a qualified administrative agent, with your consent."],
        ko:["결혼 후 체류자격 변경 안내 (준비 중)","가족 초청 절차 안내 (준비 중)","영주 준비 안내 (준비 중)","내 상황은 질문을 남기면, 동의를 받아 자격 있는 행정사에게 연결해 드려요."] },
      note:{ en:"Family coming to visit you in Korea? NOWRO Korea can help with family trips. (coming soon)", ko:"가족이 한국에 방문할 때도, NOWRO Korea가 가족 여행을 도와요. (연결 예정)" },
      source:{ en:"HiKorea", ko:"하이코리아" },
      guideUrl:"" }
  ]
};
