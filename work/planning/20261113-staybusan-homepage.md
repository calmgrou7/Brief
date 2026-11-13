# Stay 부산(가칭) 홈페이지 1차 시안 기획안

## 2026-11-13 대표 결정

> 아래 결정이 이 기획안 본문보다 우선한다. 본문의 `Stay Busan` / `Stay 부산` / `가칭` 표기는 작성 당시 기록으로 남겨 두고, 실제 페이지는 아래 기준으로 만든다.

1. **서비스 표기는 "Stay B"로 확정.** "Stay Busan / Stay 부산" 표기는 모두 Stay B로 바꾼다. "Stay with Busan" 같은 부제는 만들지 않는다. 필요하면 지역 표기 `Busan · Gyeongnam`만 쓴다. (8절 1번, 6절 7번 해결)
2. **연계 브랜드 실명 사용 허용:** Heritage Studio B(헤리티지 스튜디오 B), NOWRO Korea. 로고 파일이 없으므로 텍스트로만 표기한다. (8절 4번, 검토 보고서 1-3 해결)
3. **현재 시안은 공개 상태 유지.** (검토 보고서 1-1 관련)
4. **"질문 남기기" 무료 여부는 미정** → FAQ 2번 `[자리표시]` 유지. (8절 2번 미해결)

## 제작 메모 (대표 결정 아님)

> 이 절은 제작자·실장이 남긴 작업 기록이다. 대표가 정한 내용이 아니다. (검토 보고서 `work/reviews/20261113-stayb-and-dashboard.md` F-A3에 따라 결정 절에서 옮김)

- 2026-11-13 제작 반영(커밋 12b5c4e): 새 위치 `portfolio-site/stay-b/`(메인 `index.html` + 파트너용 `partners.html`), 옛 주소 `portfolio-site/stay-busan/`은 `../stay-b/`로 이동하는 안내 페이지. 이때 제작자가 안내띠 문구를 `BRIDGENODE 제작 · 서비스 준비 중(데모 폼은 실제로 전송되지 않습니다)`로 바꿨으나, 대표 지시로 확인되지 않음.
- 2026-11-13 실장 지시(대표 판단 전 기본값): 승인된 성격인 "포트폴리오 컨셉 시안"으로 되돌림. 안내띠 `BRIDGENODE 포트폴리오 · 컨셉 시안 · 실제 운영 서비스 아님 (데모 폼은 전송되지 않습니다)`, "서비스 준비 중" 표현 제거, 두 페이지 푸터에 `Stay B는 가칭입니다.` / `Stay B is a working name.` 한 줄 추가(본문 배지는 되살리지 않음).
- 대표 판단 대기: 시안으로 둘지 / 준비 중 서비스 사전 공개로 둘지, 가칭 표기 유지 여부, 헤리티지 스튜디오 B 담당 범위(웰컴 키트 포함 여부). 검토 보고서 A-6 참고.

---

- 작성일: 2026-11-13
- 작성: 홈페이지 기획자(planner)
- 원천 자료: `work/planning/source/staybusan-partner-deck-20261113.txt` (행정사 협업 소개 자료, 같은 날 사업계획 기준)
- 성격: 브릿지노드 자체 프로젝트 · 컨셉 시안 · 포트폴리오 1호로 공개 예정
- 제작 전제: 단일 HTML 정적 페이지, 폼은 실제 전송 없는 데모

> 이 기획안의 모든 숫자·브랜드명은 원천 자료에 있는 것만 썼다. 자료에 없는 학교명·어학원명·행정사명·연락처·후기는 전부 `[자리표시]`로 남겼다. 제작자는 `[자리표시]`를 임의의 이름이나 숫자로 바꾸지 말고 그대로 화면에 표시한다.

---

## 1. 목적

### 이 페이지가 해야 할 단 한 가지 일
부산·경남 대학의 외국인 유학생이 "여기라면 믿고 물어봐도 되겠다"고 느끼고 **상담 접수(Ask a question)** 또는 **커뮤니티 가입(Join the community)** 버튼을 누르게 한다.

- 학생용 주 행동(Primary): `Ask a question / 질문 남기기` → 페이지 안 상담 접수 폼(데모)
- 학생용 보조 행동(Secondary): `Join the community / 커뮤니티 참여하기` → 커뮤니티 섹션(WhatsApp·Viber 안내, 데모)
- 파트너용 행동(별도 1개): `Talk to us about partnering / 협업 문의하기` → 파트너 문의 폼(데모)

### 성공 기준 (시안 단계)
시안은 실제 운영이 아니므로 "실제 전환율"이 아니라 아래로 판단한다.
1. 처음 보는 사람이 첫 화면(모바일 기준 스크롤 없이 보이는 영역)만 보고 "누구를 위한, 무엇을 하는 곳인지"를 5초 안에 말할 수 있다.
2. 학생용 주 버튼이 첫 화면과 페이지 하단, 그리고 모바일 하단 고정 바에서 항상 보인다.
3. "이 사이트는 행정 대행을 하지 않는다"는 경계가 숨겨지지 않고, 상담 흐름 설명 안에서 자연스럽게 읽힌다.
4. 데모 폼을 끝까지 제출하면 "자동 분류" 결과 화면이 나와서, 플랫폼의 핵심 구조(생활 문의는 FAQ, 체류 문의는 협업 행정사)를 체험할 수 있다.
5. 포트폴리오 방문자(브릿지노드 잠재 고객)가 "기획부터 법적 경계까지 생각한 시안"이라는 인상을 받는다.

---

## 2. 타겟

### 주 방문자: 부산·경남 대학의 외국인 유학생 (1차: 네팔 어학원 연계 학생)
| 구분 | 내용 |
|---|---|
| 상황 | 입국 직전이거나 입국 초기. 한국어가 아직 서툴고 영어가 더 편함. 스마트폰으로, 주로 메신저 링크를 타고 들어옴 |
| 궁금한 것 | 숙소·외국인등록·은행·통신·건강보험을 어떤 순서로 하지? / 아르바이트해도 되나, 몇 시간까지? / 체류기간 만료 전에 뭘 해야 하지? / 졸업하면 남을 방법이 있나? / 결혼이 정해졌는데 체류 절차는? |
| 망설이는 것 | 이거 사기 아닐까? / 돈을 먼저 내라고 하는 건 아닐까? / 내 개인정보를 어디에 쓰지? / 자국 커뮤니티에서 들은 말이 다른데 누가 맞지? / 영어·한국어 말고 내 언어는? |
| 페이지가 줘야 할 것 | "누가, 어디까지 해 주는지"를 정직하게 보여 주기. 전문 판단은 자격 있는 행정사가 한다는 사실. 쉬운 영어. 메신저로도 연락 가능 |

### 보조 방문자 1: 대학 국제처 · 어학원(네팔 현지 포함)
- 궁금한 것: 우리 학생 정착 지원을 같이 운영할 수 있나? 학생 관리에 도움이 되나? 시범 운영은 어떻게?
- 망설이는 것: 검증 안 된 신생 서비스에 학생을 맡겨도 되나? 법적 문제는 없나?

### 보조 방문자 2: 협업 행정사
- 궁금한 것: 내가 받는 건 어떤 상담 건인가? 플랫폼이 어디까지 하나? 협업 대가는?
- 망설이는 것: 소개 대가로 수임료를 나누는 구조 아닌가? 플랫폼이 무자격 대행을 하진 않나?

### 제3의 방문자: 브릿지노드 포트폴리오 방문자
- 이 페이지는 포트폴리오 1호로 공개된다. 상단 고정 안내띠와 푸터에서 "브릿지노드가 만든 컨셉 시안이며 실제 운영 중인 서비스가 아님"을 분명히 밝힌다.

---

## 3. 페이지 구조 (모바일 우선)

단일 페이지, 위에서 아래로. 각 섹션에 `id`를 주고 상단 메뉴는 앵커 이동.

| 순서 | 섹션 id | 이름 | 역할 |
|---|---|---|---|
| 0 | `concept-bar` | 컨셉 시안 안내띠 | 실제 서비스가 아님을 맨 위에서 밝힘 (닫기 가능, 닫아도 푸터에 문구 유지) |
| 1 | `header` | 헤더 | 로고(가칭 표기), 언어 전환 EN/한국어, 주 버튼 |
| 2 | `hero` | 첫 화면 | 누구를 위한 무엇인지 + 주 버튼·보조 버튼 |
| 3 | `problems` | 이런 적 있나요 | 학생의 실제 어려움 공감 (정착 / 체류 / 일자리) |
| 4 | `journey` | 6단계 여정 | 입국 전 → 결혼·장기정착까지 "한 창구"임을 보여 줌. 단계별 "우리가 하는 일 / 행정사에게 연결" 구분 |
| 5 | `how-it-works` | 질문이 처리되는 방법 | 6단계 협업 흐름. **법적 경계 문구 1차 노출 위치** |
| 6 | `who-does-what` | 누가 무엇을 하나요 | 역할 구분표(학생 눈높이). **법적 경계 문구 2차 노출 위치** |
| 7 | `ask` | 상담 접수 폼 (데모) | 주 전환 지점. 제출 시 자동 분류 결과 화면 |
| 8 | `community` | 커뮤니티 | WhatsApp·Viber·국가별 커뮤니티 안내. 보조 전환 지점 |
| 9 | `promise` | 시범 운영 목표 | 24시간 첫 응답 등 4개 지표를 "목표"로만 표기 |
| 10 | `faq` | 자주 묻는 질문 | 망설임 해소(비용, 개인정보, 사기 여부, 언어) |
| 11 | `partners` | 파트너 (대학·어학원·행정사) | 보조 방문자용. 파트너 CTA 1개 |
| 12 | `family` | 함께할 브랜드 | 헤리티지 스튜디오 B, NOWRO Korea "단계적 연결 예정" |
| 13 | `final-cta` | 마지막 행동 유도 | 주 버튼 반복 |
| 14 | `footer` | 푸터 | 법적 고지 전문, 가칭 표기, 브릿지노드 제작 표기 |
| 고정 | `sticky-cta` | 모바일 하단 고정 바 | 스크롤 300px 이후 나타남. `Ask a question` + `Join` 두 버튼. `#ask`·`#community` 섹션이 화면에 보일 때는 숨김 |

### 모바일 레이아웃 원칙
- 기준 폭 360px, 좌우 여백 16px. 가로 스크롤 금지.
- 카드·표는 모바일에서 세로 쌓기. 6단계 여정은 모바일에서 가로 스와이프 탭이 아니라 **세로 아코디언**(한 번에 하나 펼침, 1단계 기본 펼침).
- 역할 구분표는 모바일에서 표 대신 "항목 카드 + 두 칸 배지(Stay Busan / Partner agent)" 형태.
- 데스크톱(≥960px): 최대 폭 1120px, 여정은 6열 가로, 협업 흐름은 6열 가로 화살표.

---

## 4. 실제 카피 (영어 우선 + 한국어 병기)

### 언어 표시 방식
- **제목·버튼·핵심 한 줄**: 영어를 크게, 바로 아래 한국어를 작게(본문의 0.85배, 보조색) 항상 함께 표시.
- **본문 문단·카드 설명·FAQ 답변**: 상단 언어 전환(EN / 한국어)으로 바꿔 보기. 기본값 EN.
- 아래 카피에서 `EN`은 영어, `KO`는 한국어. 둘 다 그대로 사용한다.

---

### 0. 컨셉 시안 안내띠 (`concept-bar`)
- EN: `Concept demo by BRIDGENODE. Stay Busan is a working name and this is not a live service yet.`
- KO: `브릿지노드가 만든 컨셉 시안입니다. Stay 부산은 가칭이며, 아직 운영 중인 서비스가 아닙니다.`
- 닫기 버튼 라벨(스크린리더용): `Close notice / 안내 닫기`

### 1. 헤더 (`header`)
- 로고 텍스트: `Stay Busan` + 작은 배지 `working name · 가칭`
- 메뉴(데스크톱만 노출, 모바일은 햄버거):
  - `How it works / 이용 방법` → `#how-it-works`
  - `Community / 커뮤니티` → `#community`
  - `FAQ / 자주 묻는 질문` → `#faq`
  - `For partners / 파트너` → `#partners`
- 언어 전환: `EN` | `한국어`
- 헤더 버튼: `Ask a question` (모바일에서는 버튼만, 한국어 병기 생략)

### 2. 첫 화면 (`hero`)
- 작은 머리말(eyebrow)
  - EN: `For international students in Busan & Gyeongnam`
  - KO: `부산·경남 외국인 유학생을 위한 곳`
- 헤드라인
  - EN: `One place to ask, from your first week to your future in Korea.`
  - KO: `한국에서의 첫 주부터 앞으로의 삶까지, 물어볼 곳은 한 곳이면 됩니다.`
- 서브카피
  - EN: `Settling in, student life, part-time work rules, visa deadlines, staying after graduation. Ask us first. We answer everyday questions ourselves, and connect visa and immigration matters to a qualified partner administrative agent (Haengjeongsa).`
  - KO: `정착, 학교생활, 아르바이트 규칙, 체류기간 만료, 졸업 후 진로까지. 먼저 저희에게 물어보세요. 생활 질문은 저희가 직접 답하고, 체류·출입국 문제는 자격을 갖춘 협업 행정사에게 연결해 드립니다.`
- 주 버튼: `Ask a question` / 아래 작은 글씨 `질문 남기기`
- 보조 버튼(외곽선): `Join the community` / `커뮤니티 참여하기`
- 버튼 아래 신뢰 한 줄(작은 글씨)
  - EN: `Web form, WhatsApp or Viber. Planned languages: English and Korean first, then Nepali.`
  - KO: `웹 폼, WhatsApp, Viber로 문의할 수 있어요. 지원 예정 언어: 영어·한국어부터, 이어서 네팔어.`

### 3. 이런 적 있나요 (`problems`)
- 섹션 제목
  - EN: `The information is out there. Someone you can trust to ask is not.`
  - KO: `정보가 없어서가 아니라, 믿고 물어볼 곳이 없어서 문제가 생깁니다.`
- 카드 1 — 제목 EN `Settling in` / KO `정착`
  - EN: `Housing contracts, alien registration, bank, phone, health insurance. Doing it all alone leads to mistakes, and sometimes scams.`
  - KO: `숙소 계약, 외국인등록, 은행·통신, 건강보험. 혼자 처리하다 실수하거나 사기를 당하기도 합니다.`
- 카드 2 — 제목 EN `Staying legally` / KO `체류`
  - EN: `Extending your stay, part-time work permission, renewing your passport. It is easy to mix them up or miss a deadline.`
  - KO: `체류기간 연장, 시간제취업 허가, 여권 갱신. 헷갈리거나 기한을 놓치기 쉽습니다.`
- 카드 3 — 제목 EN `Working` / KO `일자리`
  - EN: `A part-time job without permission, or too many hours, can put your visa status at risk.`
  - KO: `허가 없는 아르바이트나 허용 시간을 넘긴 근무는 체류자격에 문제를 만들 수 있습니다.`
- 카드 4 — 제목 EN `After graduation` / KO `졸업 이후`
  - EN: `Some students leave Korea at graduation simply because no one explained the paths for work or long-term stay.`
  - KO: `구직·취업·지역정착으로 이어지는 비자 경로를 몰라 졸업과 함께 출국하기도 합니다.`
- 카드 5 — 제목 EN `Life changes` / KO `삶의 변화`
  - EN: `Marriage or inviting family means changing your status, and it is hard to know where to start.`
  - KO: `결혼이나 가족 초청으로 자격을 바꿔야 할 때, 어디서부터 시작할지 막막합니다.`
- 카드 6 — 제목 EN `Language` / KO `언어`
  - EN: `Official guides in Korean are hard to follow, and tips in community chats are not always accurate.`
  - KO: `한국어 공공 안내는 어렵고, 커뮤니티에 도는 정보는 정확하지 않을 때가 많습니다.`
- 모바일에서는 카드 1~3만 먼저 보이고 `See 3 more / 3개 더 보기` 버튼으로 4~6 펼침.

### 4. 6단계 여정 (`journey`)
- 섹션 제목
  - EN: `Every stage of your student life, in one place.`
  - KO: `유학생활의 모든 단계를 한 곳에서.`
- 섹션 설명
  - EN: `At each stage, we show what Stay Busan does for you and when we connect you to a partner administrative agent.`
  - KO: `단계마다 Stay 부산이 직접 돕는 일과, 협업 행정사에게 연결하는 일을 나눠서 보여 드립니다.`
- 각 단계 공통 라벨: `We help with / 저희가 돕는 일`, 연결 배지 `Connected to a partner agent / 행정사 연계`

| 단계 | 제목 (EN / KO) | We help with (EN) | 저희가 돕는 일 (KO) | 행정사 연계 배지 |
|---|---|---|---|---|
| 1 | `Before you arrive` / `입국 전` | Arrival guide · Housing list · Info sessions at partner language schools | 입국 가이드 · 숙소 목록 · 어학원 설명회 | 없음 |
| 2 | `Settling in` / `정착` | Settling-in checklist · Welcome kit · Alien registration guide | 정착 체크리스트 · 웰컴 키트 · 외국인등록 안내 | 있음 |
| 3 | `Study & life` / `학업·생활` | Member discounts · Communities by country · Local events | 멤버십 할인 · 국가별 커뮤니티 · 지역 행사 | 없음 |
| 4 | `Getting ready for work` / `취업 준비` | Part-time work rules · General job information · Career talks | 시간제취업 규칙 · 일반 일자리 정보 · 취업 특강 | 있음 |
| 5 | `Visa & stay` / `비자·체류` | Expiry date reminders · Document checklists · Consultation requests | 만료일 알림 · 서류 체크리스트 · 상담 접수 | 있음 |
| 6 | `Marriage & long-term stay` / `결혼·장기정착` | Guide: status change after marriage · Guide: inviting family · Permanent residency guide | 결혼 후 체류자격 변경 안내 · 가족 초청 절차 안내 · 영주 준비 안내 | 있음 |

- 4단계 아래 작은 주석(일자리)
  - EN: `Job introductions are handled by registered employment agencies. Stay Busan shares information only.`
  - KO: `일자리 알선은 등록된 기관이 맡습니다. Stay 부산은 정보만 안내합니다.`
- 6단계 아래 작은 주석(결혼)
  - EN: `We do not offer matchmaking or marriage brokering. This stage is for students whose marriage is already decided. We share general information on the stay procedures that follow, and connect you to a partner administrative agent.`
  - KO: `Stay 부산은 결혼 매칭이나 중개를 하지 않습니다. 결혼이 이미 정해진 학생에게 이후 체류자격 변경·가족 초청의 일반 절차를 안내하고 협업 행정사에게 연결해 드리는 단계입니다.`
- 섹션 끝 버튼: `Ask about your stage / 지금 내 단계 질문하기` → `#ask` (주 버튼과 같은 스타일)

### 5. 질문이 처리되는 방법 (`how-it-works`) — 법적 경계 1차
- 섹션 제목
  - EN: `You ask once. We make sure it reaches the right person.`
  - KO: `한 번만 물어보세요. 맞는 사람에게 닿게 하는 건 저희 일입니다.`
- 6단계 (번호 원 + 제목 + 설명 + 담당 배지)

| # | 담당 배지 | 제목 EN / KO | 설명 EN | 설명 KO |
|---|---|---|---|---|
| 1 | Stay Busan | `You ask` / `문의 접수` | Send your question through the web form, WhatsApp or Viber. | 웹 폼, WhatsApp, Viber로 질문을 보내 주세요. |
| 2 | Stay Busan | `We sort it` / `자동 분류` | Everyday questions get an answer from our FAQ. Visa and stay questions go to a partner administrative agent, with your consent. | 생활 질문은 FAQ로 답하고, 체류 관련 질문은 동의를 받은 뒤 협업 행정사에게 전달합니다. |
| 3 | Stay Busan | `We get it ready` / `사전 정리` | We help you gather basic facts, like your visa type and expiry date, in a simple form, so you do not have to explain twice. | 체류자격·만료일 같은 기본 사실을 간단한 양식으로 정리해, 같은 설명을 두 번 하지 않게 합니다. |
| 4 | Partner agent | `You talk to an expert` / `행정사 상담` | A qualified administrative agent consults with you directly. Any fee and agreement are made between you and the agent. | 자격을 갖춘 행정사가 직접 상담합니다. 비용과 계약은 학생과 행정사가 직접 정합니다. |
| 5 | Together | `We keep you updated` / `진행 공유` | When the agent shares progress, we send you an automatic update. | 행정사가 진행 상황을 공유하면 자동으로 알려 드립니다. |
| 6 | Together | `We stay with you` / `사후 관리` | We remind you before your next expiry date, and keep improving our FAQ with our partners. | 다음 만료일 전에 미리 알려 드리고, 행정사와 함께 FAQ를 계속 보강합니다. |

- 6단계 바로 아래 경계 안내 상자(옅은 배경, 아이콘: 방패 또는 정보 "i")
  - 제목 EN: `What Stay Busan does not do`
  - 제목 KO: `Stay 부산이 하지 않는 일`
  - EN: `Stay Busan is an information and community service. We do not judge individual cases, write or file documents on your behalf, or charge fees for administrative work. Those are done only by a qualified partner administrative agent, under their own name.`
  - KO: `Stay 부산은 정보와 커뮤니티를 제공하는 서비스입니다. 개별 사건을 판단하거나, 서류를 대신 작성·신청하거나, 행정 업무 비용을 받지 않습니다. 이런 일은 자격을 갖춘 협업 행정사가 자신의 이름으로만 진행합니다.`

### 6. 누가 무엇을 하나요 (`who-does-what`) — 법적 경계 2차
- 섹션 제목
  - EN: `Who does what`
  - KO: `누가 무엇을 하나요`
- 설명
  - EN: `We want you to know exactly who is helping you, at every step.`
  - KO: `어느 단계에서든, 누가 나를 돕고 있는지 정확히 아셨으면 합니다.`
- 역할 표 (열: 항목 / Stay Busan / Partner agent)

| 항목 EN / KO | Stay Busan | Partner agent (협업 행정사) |
|---|---|---|
| `General guides based on public information` / `공개 정보 기반 일반 안내` | `Yes / 담당` | `Reviews the content / 내용 감수` |
| `Advice on your individual case` / `개인 사건 판단·상담` | `No / 하지 않음` | `Yes / 담당` |
| `Writing and filing documents` / `서류 작성·신청 대행` | `No / 하지 않음` | `Yes / 담당` |
| `Fees for administrative work` / `행정 업무 비용` | `No / 받지 않음` | `Charged to you directly / 학생에게 직접 청구` |
| `Reminders and follow-up` / `만료 알림·사후 관리` | `Yes / 담당` | `Shares results / 결과 공유` |
| `Your consent and safe handover of your information` / `개인정보 동의·안전한 전달` | `Yes / 담당` | `Uses it only for your case / 맡은 사건 범위 안에서만 이용` |

- "No / 하지 않음" 칸은 회색 배지, "Yes / 담당"은 브랜드색 배지. 빨강 X 표시는 쓰지 않는다(부정적·경고 느낌 방지).

### 7. 상담 접수 폼 (`ask`) — 주 전환 지점
- 섹션 제목
  - EN: `Ask your question`
  - KO: `질문 남기기`
- 설명
  - EN: `Tell us a little about your situation. We aim to reply within 24 hours.`
  - KO: `상황을 간단히 알려 주세요. 24시간 안에 첫 답변 드리는 것을 목표로 합니다.`
- 데모 표시(폼 상단, 노란 계열 배지)
  - EN: `Demo form: nothing you type here is sent or saved.`
  - KO: `데모 폼입니다. 입력한 내용은 전송되거나 저장되지 않습니다.`
- 필드 (라벨 EN / KO, 도움말)
  1. `Name or nickname` / `이름 또는 닉네임` — 필수. placeholder(예시 이름) 넣지 않음
  2. `School` / `학교` — 선택 박스. 옵션: `[자리표시] 시범 대학`, `[자리표시] 연계 어학원`, `Other / 기타`, `Not enrolled yet / 아직 입학 전`
  3. `Country` / `국적` — 선택 박스. 기본값 `Nepal / 네팔`, 그 외 `Other / 기타`
  4. `What is your question about?` / `어떤 질문인가요?` — 필수, 라디오 카드 6개:
     - `Settling in / 정착`
     - `Study & life / 학업·생활`
     - `Part-time work & jobs / 아르바이트·취업`
     - `Visa & stay / 비자·체류`
     - `Marriage & family / 결혼·가족`
     - `Something else / 기타`
  5. `Your stay expiry date (optional)` / `체류기간 만료일 (선택)` — 날짜 입력. 도움말 EN `Helps us remind you in time.` / KO `제때 알려 드리는 데 쓰입니다.`
  6. `Your question` / `질문 내용` — 필수, 여러 줄. 도움말 EN `Please do not include your passport or alien registration number.` / KO `여권번호나 외국인등록번호는 적지 마세요.`
  7. `How should we reply?` / `어디로 답변 드릴까요?` — 필수, 선택: `WhatsApp`, `Viber`, `Email / 이메일`
  8. `Contact` / `연락처` — 필수. 7번 선택에 따라 라벨 변경: `WhatsApp number / WhatsApp 번호`, `Viber number / Viber 번호`, `Email address / 이메일 주소`
  9. `Preferred language` / `원하는 언어` — `English`, `한국어`, `नेपाली (planned / 예정)` — 네팔어는 비활성(disabled)
  10. 동의 체크박스(필수)
      - EN: `I agree that Stay Busan may use this information to answer my question, and may share it with a partner administrative agent only if my question needs one.`
      - KO: `질문에 답하기 위해 Stay 부산이 이 정보를 이용하고, 행정사 상담이 필요한 경우에만 협업 행정사에게 전달하는 데 동의합니다.`
- 제출 버튼: `Send my question` / `질문 보내기`
- 버튼 아래 경계 한 줄(작은 글씨)
  - EN: `Stay Busan gives general information only. Advice on your individual case comes from a qualified partner administrative agent.`
  - KO: `Stay 부산은 일반 정보만 안내합니다. 개인 사건에 대한 판단은 자격을 갖춘 협업 행정사가 합니다.`
- 제출 후 결과 화면(폼 자리에 교체 표시) — 선택한 주제에 따라 분기
  - 공통 제목 EN: `Thank you. Here is where your question would go.` / KO: `감사합니다. 질문은 이렇게 처리됩니다.`
  - 분기 A (정착 / 학업·생활 / 기타):
    - 배지 `FAQ first / FAQ로 먼저 안내`
    - EN: `This looks like an everyday question. In the live service, you would first get an answer from our FAQ, and a team member would follow up if you need more.`
    - KO: `생활 질문으로 보여요. 실제 서비스에서는 FAQ로 먼저 답을 드리고, 더 필요하면 담당자가 이어서 도와드립니다.`
  - 분기 B (아르바이트·취업 / 비자·체류 / 결혼·가족):
    - 배지 `Partner agent / 협업 행정사 연결`
    - EN: `This may need a professional opinion. In the live service, we would organise the basic facts and pass your question to a qualified partner administrative agent, who would contact you directly.`
    - KO: `전문가 판단이 필요할 수 있는 질문이에요. 실제 서비스에서는 기본 사실을 정리해 자격을 갖춘 협업 행정사에게 전달하고, 행정사가 직접 연락드립니다.`
  - 만료일을 입력한 경우 추가 줄:
    - EN: `Your stay expiry date: {날짜}. That is {N} days from today. In the live service, we would remind you before it.`
    - KO: `입력하신 만료일: {날짜}. 오늘부터 {N}일 남았어요. 실제 서비스에서는 그 전에 미리 알려 드립니다.`
    - (만료일이 지난 날짜면) EN: `This date has already passed. Please talk to a qualified administrative agent as soon as possible.` / KO: `이미 지난 날짜예요. 가능한 한 빨리 자격을 갖춘 행정사와 상담하세요.`
  - 결과 하단 데모 문구: EN `This was a demo. No information was sent or stored.` / KO `데모였습니다. 어떤 정보도 전송·저장되지 않았습니다.`
  - 버튼: `Ask another question / 다른 질문하기` (폼 초기화), `Join the community / 커뮤니티 참여하기` → `#community`

### 8. 커뮤니티 (`community`) — 보조 전환 지점
- 섹션 제목
  - EN: `You are not alone here.`
  - KO: `여기서는 혼자가 아니에요.`
- 설명
  - EN: `Join students from your country and your school. Share tips, ask quick questions, and hear about local events and member discounts.`
  - KO: `같은 나라, 같은 학교 학생들과 함께하세요. 생활 팁을 나누고, 가볍게 묻고, 지역 행사와 멤버십 할인 소식을 받아 보세요.`
- 채널 카드 3개
  - `WhatsApp` — EN `Chat with us and join student groups.` / KO `문의하고 학생 그룹에 참여하세요.` — 버튼 `Open WhatsApp / WhatsApp 열기`
  - `Viber` — EN `Prefer Viber? We are there too.` / KO `Viber가 편하다면 여기서도 만나요.` — 버튼 `Open Viber / Viber 열기`
  - `Nepal community` — EN `For students from Nepal, with partner language schools.` / KO `네팔 학생을 위한 커뮤니티, 연계 어학원과 함께합니다.` — 버튼 `Join / 참여하기`
- 데모 처리: 세 버튼 모두 실제 링크 없이 클릭 시 작은 안내 팝업
  - EN: `Demo: the community link will be added when the service launches.`
  - KO: `데모입니다. 커뮤니티 링크는 서비스 시작 때 연결됩니다.`
- 커뮤니티 이용 안내 한 줄(작은 글씨)
  - EN: `Tips shared by members are personal experiences, not official advice. For your own case, ask us and we will connect you to a qualified agent.`
  - KO: `회원이 나누는 팁은 개인 경험이며 공식 안내가 아닙니다. 내 상황에 대해서는 저희에게 물어보시면 자격을 갖춘 행정사에게 연결해 드립니다.`

### 9. 시범 운영 목표 (`promise`)
- 섹션 제목
  - EN: `What we are aiming for in our pilot semester`
  - KO: `첫 시범 학기에 저희가 지키려는 목표`
- 설명
  - EN: `These are our goals for the pilot, not results yet. We will share real numbers after the pilot.`
  - KO: `시범 운영의 목표치이며, 아직 실적이 아닙니다. 시범 운영이 끝나면 실제 결과를 공개하겠습니다.`
- 지표 카드 4개 (큰 숫자 위에 작은 `Target / 목표` 배지 필수)
  - `24h` — EN `First reply within 24 hours` / KO `24시간 안에 첫 응답`
  - `80%` — EN `Questions resolved` / KO `문의 해결률`
  - `50%` — EN `Handled automatically, so people can focus on harder cases` / KO `자동 처리율 — 사람은 더 어려운 문의에 집중`
  - `4.0 / 5` — EN `Student satisfaction` / KO `학생 만족도`
- 숫자 카운트업 애니메이션 금지(실적처럼 보임). 정적인 숫자로 표시.

### 10. 자주 묻는 질문 (`faq`)
아코디언. 질문은 EN/KO 병기, 답변은 언어 전환에 따름.

1. Q EN `Is Stay Busan a government office or an administrative agent?` / KO `Stay 부산은 관공서나 행정사 사무소인가요?`
   - A EN: `Neither. Stay Busan is a private information and community service for international students. Visa and immigration work is done by qualified partner administrative agents, under their own name.`
   - A KO: `둘 다 아닙니다. Stay 부산은 유학생을 위한 민간 정보·커뮤니티 서비스입니다. 체류·출입국 업무는 자격을 갖춘 협업 행정사가 자신의 이름으로 진행합니다.`
2. Q EN `Do I have to pay to ask a question?` / KO `질문하려면 돈을 내야 하나요?`
   - A EN: `[자리표시: 상담 접수 비용 정책 확정 후 작성]. If you work with a partner administrative agent, any fee is agreed between you and the agent directly. Stay Busan never collects fees for administrative work.`
   - A KO: `[자리표시: 상담 접수 비용 정책 확정 후 작성]. 협업 행정사와 진행하게 되면 비용은 학생과 행정사가 직접 정합니다. Stay 부산은 행정 업무 비용을 받지 않습니다.`
3. Q EN `Can you tell me if my visa will be approved?` / KO `제 비자가 나올지 알려 줄 수 있나요?`
   - A EN: `No. We cannot judge individual cases. We can share general information and connect you to a qualified partner administrative agent who can look at your situation.`
   - A KO: `아니요. 저희는 개별 사건을 판단할 수 없습니다. 일반 정보를 안내하고, 내 상황을 직접 검토할 수 있는 협업 행정사에게 연결해 드립니다.`
4. Q EN `Can you find me a part-time job?` / KO `아르바이트를 구해 줄 수 있나요?`
   - A EN: `We explain the part-time work rules and share general job information. Job introductions themselves are handled by registered employment agencies.`
   - A KO: `시간제취업 규칙을 안내하고, 일반적인 일자리 정보를 안내합니다. 실제 일자리 알선은 등록된 기관이 맡습니다.`
5. Q EN `What happens to my personal information?` / KO `제 개인정보는 어떻게 되나요?`
   - A EN: `We use it only to answer your question. It is shared with a partner administrative agent only when your question needs one and only with your consent. Please never send your passport or alien registration number through the form or chat.`
   - A KO: `질문에 답하는 데만 사용합니다. 행정사 상담이 필요한 경우에만, 동의를 받은 뒤 협업 행정사에게 전달합니다. 여권번호나 외국인등록번호는 폼이나 채팅으로 보내지 마세요.`
6. Q EN `I am getting married in Korea. Can you help?` / KO `한국에서 결혼할 예정인데 도와줄 수 있나요?`
   - A EN: `If your marriage is already decided, we can share the general steps for changing your status and inviting family, and connect you to a partner administrative agent. We do not offer matchmaking or marriage brokering.`
   - A KO: `결혼이 이미 정해졌다면 체류자격 변경과 가족 초청의 일반 절차를 안내하고 협업 행정사에게 연결해 드립니다. 결혼 매칭이나 중개는 하지 않습니다.`
7. Q EN `Which languages will you support?` / KO `어떤 언어를 지원할 예정인가요?`
   - A EN: `Planned languages: English and Korean first, then Nepali. More languages may be added as we grow.`
   - A KO: `지원 예정 언어: 영어·한국어부터, 이어서 네팔어. 서비스가 커지면 다른 언어도 추가할 수 있습니다.`

### 11. 파트너 (`partners`) — 보조 방문자용, 파트너 CTA 1개
- 섹션 머리말 EN `For partners` / KO `파트너 기관께`
- 섹션 제목
  - EN: `Help your students settle in, stay safely, and succeed.`
  - KO: `학생이 잘 정착하고, 안전하게 머무르고, 잘 해낼 수 있도록 함께해 주세요.`
- 설명
  - EN: `We are starting with a one-semester pilot with one language school in Nepal and one university area in Busan and Gyeongnam.`
  - KO: `네팔 어학원 1곳과 부산·경남 대학권 1곳에서 한 학기 시범 운영으로 시작합니다.`
- 파트너 카드 3개
  - 카드 1 — EN `Universities` / KO `대학 국제처`
    - EN: `Run settling-in support together. Your students get one trusted place to ask, in their language.`
    - KO: `정착 지원을 함께 운영합니다. 학생들은 자기 언어로 믿고 물어볼 한 곳을 갖게 됩니다.`
  - 카드 2 — EN `Language schools` / KO `어학원`
    - EN: `Stay connected with your students before and after they arrive in Korea.`
    - KO: `입국 전부터 입국 후까지 학생과의 연결을 이어 갑니다.`
  - 카드 3 — EN `Administrative agents` / KO `행정사`
    - EN: `Receive consultation requests where the student has already shared basic information, such as visa type and expiry date. We take care of repeat questions and multilingual student contact. We do not share or split your fees.`
    - KO: `체류자격·만료일 같은 기본 정보를 학생이 미리 남긴 상담 요청을 받으세요. 반복 문의와 다국어 학생 응대는 플랫폼이 맡습니다. 수임료를 나누는 구조는 만들지 않습니다.`
- 파트너 로고 자리: 실제 제휴처가 없으므로 로고 줄을 만들지 않는다. 대신 한 줄 표기
  - EN: `Pilot partners: [자리표시]`
  - KO: `시범 운영 파트너: [자리표시]`
- 파트너 CTA 버튼(학생 버튼과 다른 보조 스타일, 외곽선): `Talk to us about partnering` / `협업 문의하기` → 파트너 문의 모달(데모)
- 파트너 문의 모달 필드: `Organisation / 기관명`(필수), `Type / 기관 유형`(University 대학 · Language school 어학원 · Administrative agent 행정사 · Other 기타), `Contact person / 담당자`(필수), `Email / 이메일`(필수), `Message / 문의 내용`
  - 상단 데모 배지: 7번 폼과 같은 문구
  - 제출 버튼: `Send / 보내기`
  - 제출 후: EN `Thank you. This is a demo, so nothing was sent. In the live service, we would reply by email.` / KO `감사합니다. 데모라서 실제로 전송되지는 않았어요. 실제 서비스에서는 이메일로 답변드립니다.`

### 12. 함께할 브랜드 (`family`)
- 섹션 제목
  - EN: `Growing together, step by step`
  - KO: `단계적으로 함께 넓혀 갑니다`
- 설명
  - EN: `Once our student community is established, we plan to connect these partner brands.`
  - KO: `학생 커뮤니티가 자리 잡은 뒤, 아래 연계 브랜드와 단계적으로 연결할 계획입니다.`
- 카드 2개 (각 카드에 `Planned / 연결 예정` 배지)
  - `Heritage Studio B` / `헤리티지 스튜디오 B` — EN `Goods, membership kits and social content` / KO `굿즈·멤버십 키트·SNS 콘텐츠`
  - `NOWRO Korea` — EN `Family visits and travel in Korea` / KO `가족 방문·관광`
- 로고 이미지는 대표가 사용 허락한 파일을 받을 때까지 텍스트로만 표시.

### 13. 마지막 행동 유도 (`final-cta`)
- 헤드라인
  - EN: `Not sure where to start? Start here.`
  - KO: `어디서부터 해야 할지 모르겠다면, 여기서 시작하세요.`
- 서브카피
  - EN: `One question is enough. We will help you find the next step.`
  - KO: `질문 하나면 충분해요. 다음 단계는 저희가 함께 찾아 드립니다.`
- 주 버튼: `Ask a question / 질문 남기기` → `#ask`
- 보조 링크: `Or join the community / 또는 커뮤니티 참여하기` → `#community`

### 14. 푸터 (`footer`) — 법적 고지 전문
- 브랜드: `Stay Busan (working name) · Stay 부산(가칭)`
- 법적 고지 (EN)
  - `Stay Busan provides general information based on public sources and operates a student community and consultation intake. It is not a government agency or an administrative agent's office. Stay Busan does not judge individual cases, prepare or file documents on anyone's behalf, or charge fees for administrative work. Those services are provided only by qualified partner administrative agents, under their own name and responsibility. Job introductions are handled by registered employment agencies. Stay Busan does not provide matchmaking or marriage brokering.`
- 법적 고지 (KO)
  - `Stay 부산은 공개 정보를 바탕으로 한 일반 안내와 유학생 커뮤니티, 상담 접수를 운영합니다. 관공서나 행정사 사무소가 아닙니다. Stay 부산은 개별 사건을 판단하거나, 서류를 대신 작성·신청하거나, 행정 업무 비용을 받지 않습니다. 이러한 업무는 자격을 갖춘 협업 행정사가 자신의 이름과 책임으로만 제공합니다. 일자리 알선은 등록된 기관이 수행하며, Stay 부산은 결혼 매칭·중개를 하지 않습니다.`
- 컨셉 표기 (항상 표시, 안내띠를 닫아도 유지)
  - EN: `This page is a concept demo designed and built by BRIDGENODE. "Stay Busan" and "Stay B" are working names. Forms on this page do not send or store any data.`
  - KO: `이 페이지는 브릿지노드가 기획·제작한 컨셉 시안입니다. "Stay 부산"과 "Stay B"는 가칭이며, 이 페이지의 폼은 어떤 정보도 전송·저장하지 않습니다.`
- 제작 표기 링크: `Made by BRIDGENODE / 브릿지노드 제작` → `https://bridgenode-studio.calmgrou.chatgpt.site/` (새 탭)
- 연락처 자리: `Contact: [자리표시]` (실제 이메일·전화 넣지 않음)

### 15. 모바일 하단 고정 바 (`sticky-cta`)
- 왼쪽(주): `Ask a question` → `#ask`
- 오른쪽(보조, 외곽선): `Join` → `#community`
- 높이 64px, 안전 영역(iPhone 홈 바) 여백 포함.

### 16. 메타 정보
- `<title>`: `Stay Busan (working name) · Concept`
- meta description EN: `A concept for one trusted place where international students in Busan and Gyeongnam can ask about settling in, student life, work rules, visas and long-term stay.`
- Open Graph 제목: `Stay Busan: one place to ask` / 이미지: `[자리표시] og-image 1200×630`
- `<html lang>`: 언어 전환 시 `en` ↔ `ko`로 변경

---

## 5. 기능 요구사항 (단일 HTML 정적 페이지 전제)

### 기본 전제
- 파일 1개(`index.html`)에 HTML·CSS·JS 모두 인라인. 서버, 데이터베이스, 외부 API 호출 없음.
- 외부 리소스는 웹폰트(Google Fonts)만 허용. 아이콘은 인라인 SVG.
- 결과물 위치: `work/builds/staybusan-concept/index.html`

### 필수 기능 (P1)
1. **언어 전환 EN / 한국어**
   - 본문 요소에 `data-en`, `data-ko` 또는 `<span lang="en">`/`<span lang="ko">` 쌍으로 넣고 JS로 표시 전환.
   - 제목·버튼의 병기(영어 크게+한국어 작게)는 언어와 관계없이 항상 보임. 한국어 모드에서는 순서를 바꿔 한국어를 크게, 영어를 작게.
   - 선택 언어는 `localStorage`에 기억(try/catch로 감싸고 실패해도 EN으로 정상 동작).
   - 네팔어 확장을 위해 문구를 JS 객체 한 곳(`i18n = {en:{}, ko:{}}`)에 모아 두는 구조 권장. `ne` 키를 나중에 추가만 하면 되게.
2. **상담 접수 데모 폼**
   - 브라우저 기본 검증 + JS 검증(필수값, 이메일 형식, 동의 체크).
   - "어디로 답변 드릴까요?" 선택에 따라 연락처 라벨·input type 변경(`tel` / `email`).
   - 제출 시 `preventDefault()`. 네트워크 전송, `localStorage` 저장, 콘솔 출력 모두 금지(개인정보 데모 원칙).
   - 결과 화면: 주제 → 분기 A/B 메시지, 만료일 입력 시 오늘 기준 남은 일수 계산(지난 날짜 분기 포함). 날짜 표기는 EN `13 Nov 2026`, KO `2026년 11월 13일` 형식.
   - `Ask another question` 클릭 시 폼 초기화 후 폼 맨 위로 포커스.
   - 질문 내용 입력란에 숫자 9자리 이상 연속 입력 감지 시(여권·등록번호 의심) 입력란 아래 경고 표시: EN `This looks like an ID number. Please remove it.` / KO `신분증 번호처럼 보여요. 지워 주세요.` (제출은 막지 않되 경고 유지)
3. **파트너 문의 데모 모달**: 같은 원칙(전송·저장 없음). ESC·바깥 클릭·닫기 버튼으로 닫힘, 열릴 때 첫 입력란 포커스, 닫힐 때 원래 버튼으로 포커스 복귀.
4. **커뮤니티 버튼 데모 팝업**: 작은 토스트(3초 후 사라짐, 스크린리더용 `aria-live="polite"`).
5. **6단계 여정 아코디언(모바일) / 6열(데스크톱)**: `<details>`/`<summary>` 사용 가능. 모바일에서 한 번에 하나만 열리게.
6. **FAQ 아코디언**: `<details>` 사용.
7. **모바일 하단 고정 바**: 스크롤 300px 이후 표시, `#ask`·`#community`가 화면에 들어오면 숨김(IntersectionObserver).
8. **컨셉 안내띠**: 닫기 가능, 닫은 상태는 세션 동안만 유지(`sessionStorage`, try/catch).
9. **앵커 이동**: 부드러운 스크롤, 고정 헤더 높이만큼 `scroll-margin-top`.

### 선택 기능 (P2, 시간 남으면)
- 문제 카드 "3개 더 보기" 펼침.
- 다크 모드(`prefers-color-scheme`) 지원.
- 인쇄 시 고정 바·안내띠 숨김.

### 접근성·품질 기준
- 색 대비 WCAG AA(본문 4.5:1 이상).
- 모든 폼 요소에 `<label>` 연결, 오류 메시지는 `aria-describedby`로 연결.
- 터치 영역 최소 44×44px.
- 키보드만으로 폼 제출·모달 닫기·아코디언 조작 가능.
- 이미지 없이도 완성된 화면이 되도록 설계(사진은 받으면 넣는 구조).
- 360px / 768px / 1280px 세 폭에서 깨짐 없는지 확인.

### 하지 않을 것 (명시)
- 실제 WhatsApp·Viber 링크(`wa.me`, `viber://`) 연결 금지 — 번호가 없고 데모이므로.
- 실제 폼 전송 서비스(Formspree, Google Forms 등) 연결 금지.
- 분석 도구(GA 등)·쿠키 배너 없음.
- 숫자 카운트업, 가짜 후기, 가짜 제휴 로고, 가짜 학생 사진 금지.

---

## 6. 필요한 자료 (대표에게 받을 것)

| # | 자료 | 용도 | 없을 때 처리 |
|---|---|---|---|
| 1 | Stay 부산 로고 또는 워드마크(가칭 단계라면 생략 가능) | 헤더·OG 이미지 | 텍스트 로고 `Stay Busan` + `working name` 배지 |
| 2 | 사용 가능한 사진(부산 거리·캠퍼스 분위기, 저작권 확인된 것) 2~4장 | 첫 화면·커뮤니티 섹션 | 사진 없이 일러스트형 도형·색 면으로 구성 |
| 3 | 헤리티지 스튜디오 B, NOWRO Korea 로고 및 사이트 노출 허락 여부 | 12번 섹션 | 텍스트로만 표기 |
| 4 | 시범 대학·어학원 이름 공개 가능 여부 | 폼 학교 옵션, 파트너 줄 | `[자리표시]` 유지 |
| 5 | 상담 접수 비용 정책(학생 질문 접수가 무료인지) | FAQ 2번 | `[자리표시]` 유지 |
| 6 | 공개용 연락 이메일(서비스용, 대표 개인 이메일 아님) | 푸터 | `[자리표시]` 유지 |
| 7 | 브랜드명 결정(Stay Busan / Stay B 중 시안 대표 표기) | 전체 | 이 기획안은 `Stay Busan`으로 통일 |
| 8 | 대표가 직접 쓴 문장 또는 수정한 카피(있다면) | 저작권용 창작 기여 기록 | 검토 단계에서 대표가 고친 문장을 기록 |
| 9 | 지원 언어 계획(영어·한국어·네팔어 지원 여부와 시기) — 원천 자료에 언급 없음 | 첫 화면 신뢰 문구, FAQ 7, 폼 언어 선택 | "지원 예정(planned)"으로만 표기 |

---

## 7. 제작자 전달 메모

### 분위기
- 한 줄 콘셉트: **"낯선 도시에서 처음 만난, 차분하고 믿음직한 선배."**
- 관공서처럼 딱딱하지 않게, 그렇다고 광고처럼 들뜨지 않게. 정보를 정직하게 나눠 보여 주는 단정한 톤.
- 부산 바다·항구에서 온 색: 깊은 바다색(남청)을 기본, 따뜻한 노을 주황을 포인트로.

### 색 (제안값, 토큰으로 정의)
- `--brand`: 남청 `#1F4E79` 계열 (버튼·강조)
- `--accent`: 노을 주황 `#F28C38` 계열 (주 버튼 배경 또는 포인트 하나만. 남용 금지)
- `--bg`: 따뜻한 흰색 `#FBFAF7`, `--surface`: `#FFFFFF`, `--muted-bg`: 옅은 하늘 `#EEF4F9` (경계 안내 상자)
- `--text`: `#1B2430`, `--text-muted`: `#5B6675`
- 데모 배지: 옅은 노랑 배경 + 진한 갈색 글자(경고가 아닌 안내 느낌)
- 빨간색은 폼 오류에만 사용.
- 주 버튼은 페이지 전체에서 같은 색·같은 모양. 파트너 버튼은 외곽선 스타일로 학생 버튼과 확실히 구분.

### 글꼴
- 영어: Inter 또는 Plus Jakarta Sans / 한국어: Pretendard(CDN이 허용 범위 밖이면 Noto Sans KR, Google Fonts)
- 네팔어(데바나가리) 확장 대비: 나중에 Noto Sans Devanagari를 추가할 수 있도록 font-family에 자리 확보.
- 본문 최소 16px, 줄간격 1.6. 한국어 병기 보조 문구는 0.85em.

### 참고할 점
- **법적 경계 문구는 "경고문"이 아니라 "안심시키는 설명"으로 디자인.** 방패·정보 아이콘, 옅은 배경 상자. 빨간 테두리나 느낌표 금지.
- **"Target / 목표" 배지는 4개 지표 숫자 위에 반드시 붙인다.** 배지 없이 숫자만 보이면 실적 과장이 된다.
- **[자리표시]는 눈에 띄게** 점선 테두리 + 회색 배경 인라인 표시로. 포트폴리오 방문자가 "의도적으로 비워 둔 것"으로 읽도록.
- 사람 사진을 임의 생성·스톡으로 넣지 않는다(특정 국적 학생을 연출하는 이미지 금지).
- 영어 문장은 짧고 쉬운 단어 위주(영어가 제2언어인 학생 기준). 제작 중 문장을 늘리지 않는다.
- 브릿지노드 홈페이지 톤("좋은 생각이 좋은 서비스가 되는 곳")과 충돌하지 않게, 푸터 제작 표기는 작고 단정하게.

---

## 8. 확인 필요 (기획자가 가정한 것)

1. **대표 표기 브랜드명**: 시안 전체를 `Stay Busan`(한국어 `Stay 부산`)으로 통일하고 `Stay B`는 푸터에만 언급했다. 반대로 할지 확인.
2. **학생 상담 접수 무료 여부**: 자료에 "유료 생활지원 패키지(행정 대행 제외)"가 있어서 "무료"라고 쓰지 않았다. FAQ 2번은 `[자리표시]`.
3. **"24시간 안에 첫 답변 목표" 문구를 폼 설명에 넣은 것**: 시범 목표치를 학생에게 약속처럼 보여도 괜찮은지.
4. **헤리티지 스튜디오 B, NOWRO Korea 노출**: 자료에 이름이 나오지만, 공개 포트폴리오에 실명 노출해도 되는지(대표 관련 브랜드인지, 상대 허락이 필요한지).
5. **"Haengjeongsa" 영어 표기**: 행정사를 `administrative agent (Haengjeongsa)`로 번역했다. 협업 행정사의 선호 표기가 있으면 반영.
6. **법적 경계 문구 최종 감수**: 행정사법(무자격 대행 금지), 직업안정법(일자리 알선), 결혼중개업법(결혼 중개) 관련 문구는 자료의 역할 구분을 옮긴 것이다. 실제 서비스 공개 전에는 협업 행정사 또는 법률 전문가 감수가 필요하다(자료 10페이지 "법적 경계: 함께 정하고 싶은 것"과 같은 항목). 컨셉 시안 공개에는 현재 문구로 충분하다고 가정했다.
7. **폼 항목 중 "체류기간 만료일"**: 실제 운영 시 민감할 수 있는 정보라 선택 입력으로 두었다. 데모에서는 저장하지 않는다.
8. **네팔 커뮤니티 카드**: 1차 타깃이 네팔 학생이라 별도 카드로 넣었다. 국가 중립을 원하면 `Communities by country`로 바꾼다.
9. **포트폴리오 카드 태그·분류**: 브릿지노드 포트폴리오 기존 분류(홈페이지/앱)에 맞춰 "홈페이지"로 넣었다.
10. **브릿지노드 기존 포트폴리오 8건과의 관계**: 대표 지시대로 "포트폴리오 1호(자체 프로젝트)"로 표기했다. 기존 8건이 있는 상태에서 "1호"가 자체 프로젝트 기준 1호라는 뜻인지 확인 필요(카드에는 `자체 프로젝트 01`로 표기).
11. **[실제 운영 전 확인] 직업정보제공사업 신고 필요 여부**: 일자리 정보(구인 정보)를 모아 제공하면 직업안정법상 직업정보제공사업 신고 대상이 될 수 있다. 실제 운영 전 신고 필요 여부를 검토한다. (검토 보고서 F-4 / L-3)
12. **[실제 운영 전 확인] 협업 행정사 자격 종류와 출입국 민원 대행기관 등록 여부**: 출입국 민원 대행은 별도 대행기관 등록 제도가 있고, 외국어번역행정사는 출입국 신청서류 작성을 할 수 없다는 해석이 있다. 협업 행정사의 자격 종류와 대행기관 등록 여부를 확인한다. (검토 보고서 R-6 / L-9)
13. **[실제 운영 전 확인] 개인정보 제3자 제공 동의 필수 고지 항목**: 실제 운영 시 행정사에게 상담 정보를 넘길 때 개인정보보호법상 제3자 제공 동의에 받는 자·제공 목적·제공 항목·보유 및 이용 기간·동의 거부권과 거부 시 불이익을 고지해야 한다. 현재 시안의 한 문장 동의문은 데모용이다. (검토 보고서 R-6 / L-10)

---

## 9. 포트폴리오 카드용 요약

| 항목 | 내용 |
|---|---|
| 제목 | `Stay 부산(가칭) — 유학생 정착 지원 플랫폼` |
| 영문 제목 | `Stay Busan (working name) — One place to ask for international students` |
| 한 줄 설명 (KO) | `부산·경남 외국인 유학생이 정착부터 비자·장기정착까지 한 곳에서 물어볼 수 있도록, 정보 제공과 행정사 연결의 경계를 분명히 설계한 영어·한국어 랜딩 페이지 컨셉.` |
| 한 줄 설명 (EN) | `A bilingual landing page concept that gives international students in Busan one trusted place to ask, with a clear line between general information and licensed administrative work.` |
| 태그 | `홈페이지` `랜딩 페이지` `다국어(EN/KO)` `상담 접수` `커뮤니티` `모바일 우선` `자체 프로젝트` |
| 상태 | `컨셉 시안` (Concept) |
| 구분 표기 | `자체 프로젝트 01 · 실제 운영 서비스 아님` |
| 썸네일 | 제작 완료 후 첫 화면(모바일 360px + 데스크톱 1280px) 캡처 2장 |
| 카드 상세 설명 (3문장, KO) | `흩어진 정보 대신 믿고 물어볼 한 곳이 필요한 유학생을 위해 기획했습니다. 질문이 들어오면 생활 문의는 FAQ로, 체류 문의는 협업 행정사에게 연결되는 구조를 데모 폼에서 직접 체험할 수 있습니다. 플랫폼이 하지 않는 일(개별 판단·서류 대행·수임료)을 숨기지 않고 안심시키는 설명으로 풀어낸 것이 핵심입니다.` |
