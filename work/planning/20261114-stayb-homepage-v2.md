# Stay B 홈페이지 기획안 v2: 유학생 중심 전면 재정리

- 작성일: 2026-11-14 (KST)
- 작성: 홈페이지 기획자(planner)
- 1순위 원천 자료: `work/planning/source/staybusan-business-plan-20261113-student-parts.md` (대표 사업계획서 학생 관점 발췌)
- 보조 자료: `work/planning/source/staybusan-partner-deck-20261113.txt`, v1 기획안 `work/planning/20261113-staybusan-homepage.md`, 검토 보고서 `work/reviews/20261113-staybusan-portfolio.md`, `work/reviews/20261113-stayb-and-dashboard.md`
- 대상 파일(제작 후): `portfolio-site/stay-b/index.html` 교체, `portfolio-site/stay-b/partners.html` 소폭 수정
- 제작 흐름(이번부터): 웹디자이너(시안) → 웹코더(구현) → 검토자 → 대표 승인

> v1 파일은 그대로 둔다. 이 v2가 메인 페이지(`index.html`)의 새 기준이다. v1의 "2026-11-13 대표 결정" 절은 아래 0-2에 그대로 이어받는다.

---

## 0. 먼저 읽기

### 0-1. v1 대비 바뀐 점 요약

| 구분 | v1 (2026-11-13) | v2 (이번) |
|---|---|---|
| 페이지가 말하는 것 | "믿고 물어볼 한 곳" (상담 창구) | "정보는 여기서 찾고, 도움은 부산에서 직접 받는다" (온라인 정보 허브 + 오프라인 정착 지원) |
| 주 행동 | `Ask a question` 질문 남기기 | `Where are you now?` 내 단계 고르기 → 단계별 정보 카드 |
| 보조 행동 | 커뮤니티 참여 | 1순위 보조: 질문 남기기 / 2순위 보조: 커뮤니티 참여 (근거 3-2) |
| 원천 자료 | 행정사 협업 소개 자료 | 대표 사업계획서 학생 관점 발췌 |
| 메인에서 뺀 것 | - | 6단계 협업 흐름(`how-it-works`), 역할 구분표(`who-does-what`), 시범 운영 목표 지표 24h/80%/50%/4.0(`promise`), 파트너 섹션(`partners`), 연계 브랜드 카드(`family`) → 모두 `partners.html`에 이미 있거나 그쪽으로. 메인에는 푸터 링크 한 줄만 |
| 새로 넣은 것 | - | 정보 허브(4단계 × 실제 정보 카드 14장), 오프라인 연계 섹션(7개 경험), 학생의 실제 장면 4개, "이렇게 연결돼요" 3단계 띠 |
| 공감 섹션 | 문제 카드 6장("이런 적 있나요") | 학생의 실제 장면 4개(입국 첫 주 / 첫 아르바이트 전 / 만료일 다가올 때 / 졸업 앞두고), 각 장면이 정보 카드와 오프라인 지원으로 바로 이어짐 |
| 여정 구조 | 6단계 아코디언(행정사 연계 배지 포함) | 학생이 고르기 쉬운 4단계: 입국 전 / 정착 중 / 생활·일 / 비자·졸업 이후 |
| 법적 경계 문구 | 히어로, 여정 주석 2곳, 경계 상자, 역할표, 폼 하단, 커뮤니티, FAQ 4곳, 푸터 (약 10곳) | 안심 섹션 `#trust` 한 곳 + 푸터. 꼭 필요한 문맥 3곳(폼 동의문, 일자리 카드 1줄, 결혼 FAQ)만 짧게 |
| 폼 설명 | "24시간 안에 첫 답변 목표" | 삭제(시범 목표치를 학생에게 약속처럼 보이지 않게, v1 확인 필요 3번 해소) |
| 헤리티지 스튜디오 B | 메인: 굿즈·멤버십 키트·SNS "연결 예정" / 웰컴 키트는 Stay B 일로 표시 | 사업계획서 근거로 "웰컴 키트·멤버십 카드 디자인"을 헤리티지 스튜디오 B가 맡는다고 표기(오프라인 섹션). `partners.html` 문구도 같이 맞춤 |
| 가족(NOWRO Korea) | 연계 브랜드 카드 | 학생 관점 한 줄 "가족이 한국에 올 때도" |
| 언어 전환 | EN / 한국어 | EN / 한국어 / नेपाली(준비 중, 비활성) |
| 제작 메모 | 색·폰트 제안값 포함 | 섹션별 "보여야 할 느낌·시각 위계" 메모만. 색·폰트는 웹디자이너가 정함 |
| 추가 | - | 온라인 마케터 검토용 메모(키워드 후보, 공유 미리보기 문구) |

### 0-2. 대표 결정 (v1에서 이어받음, 본문보다 우선)

1. 서비스 표기는 **Stay B**. "Stay Busan / Stay 부산" 표기는 쓰지 않는다. 부제가 필요하면 `Busan · Gyeongnam`만.
2. 연계 브랜드 실명 사용 허용: **Heritage Studio B(헤리티지 스튜디오 B)**, **NOWRO Korea**. 로고 파일이 없으므로 텍스트로만.
3. 사이트 성격은 **포트폴리오 컨셉 시안**. 상단 안내띠와 푸터의 "가칭" 표기 유지.
   - 안내띠: EN `BRIDGENODE portfolio · Concept demo · Not a live service (demo forms do not send anything)` / KO `BRIDGENODE 포트폴리오 · 컨셉 시안 · 실제 운영 서비스 아님 (데모 폼은 전송되지 않습니다)`
   - 푸터: `Stay B is a working name.` / `Stay B는 가칭입니다.`
4. **(2026-11-14 대표 결정) '질문 남기기'는 무료로 표기한다.** 오프라인 생활지원(공항 픽업·정착 동행 등) 비용은 아직 미정 → 그 자리만 `[자리표시]`.
5. **(2026-11-14 대표 결정) 첫 화면 행동 순서 확정:** `내 단계 고르기(주) → 질문하기 → 커뮤니티`.
6. **(2026-11-14 대표 결정) 웰컴 키트·멤버십 카드에 "Designed by Heritage Studio B" 표기 OK.**
7. **(2026-11-14 대표 결정) 장소·일정·제휴 학교/어학원/업체 이름은 아직 사전 협의 전** → 이름·장소를 쓰지 말고 **체계(어떻게 운영되는지)만** 보여 준다. 예: "협력 어학원과 함께 입국 전 설명회", "제휴 학교 국제처와 연계", "제휴 생활업체 할인". 실제 명칭·장소·일정은 협의 후 업데이트. `[자리표시]` 남발 대신 "협의 후 공개 예정" 같은 자연스러운 문구로.
8. 선택형 오프라인 생활지원(공항 픽업·정착 동행 등)의 비용은 대표 확인 중 → "선택형 서비스, 비용 안내 예정"으로 표기.
5. 시안은 공개 상태 유지(`noindex` 유지).

### 0-3. 표기 규칙 (디자이너·코더 공통)

- `[자리표시: …]` = 대표에게 받아야 할 내용. **화면에 그대로 보이게** 점선 테두리 칩으로 표시한다. 임의의 이름·숫자·사진으로 채우지 않는다.
- `[확인 필요: …]` = 일반 공개 정보지만 구체 수치·기한·요건이 행정사 감수 전인 부분. 화면에는 칩 `to be confirmed / 확인 예정`으로 표시하고, 괄호 안 설명은 화면에 쓰지 않는다(이 문서용 메모). 수치를 지어 넣지 않는다.
- 영어를 먼저, 한국어를 병기. 제목·버튼·짧은 라벨은 영어(크게) + 한국어(작게) 항상 함께. 긴 본문·카드 내용은 상단 언어 전환으로 바꿔 보기(기본 EN). 한국어 모드에서는 큰 글씨·작은 글씨 순서만 바꾼다(v1 방식 유지).
- 네팔어: 전환 버튼에 `नेपाली` + `soon / 준비 중` 표시, 비활성. 문구 구조는 `i18n = {en, ko}` 한 곳에 모아 `ne`를 나중에 추가만 하면 되게.
- 영어 문장은 짧고 쉬운 단어(영어가 제2언어인 학생 기준). 제작 중에 문장을 늘리지 않는다.

---

## 1. 목적

### 이 페이지가 해야 할 단 한 가지 일
부산·경남에 오는(또는 이미 온) 외국인 유학생이 **"내 지금 단계에 필요한 정보가 여기 있고, 부족한 건 부산에서 사람이 직접 도와준다"** 고 느끼고, **자기 단계를 눌러 정보 카드를 열어 보게** 한다.

### 핵심 약속 (첫 화면에서 보여야 할 한 문장)
- EN: `Find answers here. Get help in person, in Busan.`
- KO: `필요한 정보는 여기서 찾고, 필요한 도움은 부산에서 직접 받으세요.`

### 성공 기준 (컨셉 시안 단계)
1. 처음 보는 학생이 모바일 첫 화면(스크롤 전)만 보고 "유학생 정보 + 오프라인 정착 지원"이라고 5초 안에 말할 수 있다.
2. 첫 화면에 4개 단계 버튼이 보이고, 누르면 1초 안에 그 단계의 정보 카드 목록으로 이동한다.
3. 정보 카드 14장 모두에 "핵심 내용 3~5줄 + 공식 출처 이름 + 자세한 가이드(준비 중)"가 있다. 빈 카드가 없다.
4. 오프라인 섹션에서 "온라인에서 찾고 → 오프라인에서 만나고 → 계속 연결된다" 흐름이 그림처럼 한눈에 보인다.
5. 메인 페이지에 파트너·운영 지표·역할 구분표가 없다(푸터 링크 한 줄 제외).
6. 법적 경계 문구는 `#trust` 한 곳 + 푸터에 모여 있고, 경고문이 아니라 안심시키는 설명으로 읽힌다.
7. 포트폴리오 방문자(브릿지노드 잠재 고객)가 "정보 구조 설계와 오프라인 서비스 연결까지 생각한 시안"이라는 인상을 받는다.

---

## 2. 타겟

### 주 방문자: 부산·경남 대학의 외국인 유학생 (1차: 네팔 학생, 네팔 어학원 연계)
| 구분 | 내용 |
|---|---|
| 상황 | 네팔에서 입국을 준비 중이거나, 부산에 온 지 얼마 안 됨. 영어가 한국어보다 편함. 어학원·친구가 보낸 WhatsApp·Viber 링크를 타고 스마트폰으로 들어옴. 데이터가 넉넉하지 않을 수 있음 |
| 궁금한 것 (단계별) | 입국 전: 뭘 챙기지? 숙소는? / 정착 중: 외국인등록은 언제, 뭘 들고? 은행·유심은 어떤 순서로? 건강보험은? / 생활·일: 아르바이트 해도 되나? 생활비 아끼는 법? 친구는? / 비자·졸업 이후: 만료일 전에 뭘 해야 하지? 여권 갱신이랑 뭐가 달라? 졸업하고 남을 방법이 있나? |
| 망설이는 것 | 이 정보 믿어도 되나? 돈 내라고 하는 거 아냐? 사기 아냐? 내 개인정보는? 커뮤니티에서 들은 말이랑 다른데? 실제로 만날 수 있는 사람이 있나? |
| 페이지가 줘야 할 것 | 내 단계에 딱 맞는 짧고 쉬운 정보 / 실제로 만나고 받을 수 있는 도움(설명회, 첫 주 지원, 웰컴 키트, 할인, 모임) / 누가 어디까지 돕는지 한 번에 정직하게 / 같은 나라 학생들과 계속 연결 |

### 2차 방문자 (메인에서는 다루지 않음)
- 대학 국제처·어학원·협업 행정사·제휴업체 → 푸터 링크 한 줄로 `partners.html`로 보낸다.
- 브릿지노드 포트폴리오 방문자 → 안내띠·푸터 컨셉 표기로 충분.

---

## 3. 페이지 구조 (모바일 우선)

### 3-1. 섹션 순서

| # | 섹션 id | 이름 | 역할 |
|---|---|---|---|
| 0 | `concept-bar` | 컨셉 시안 안내띠 | 대표 결정 문구. 닫기 가능, 닫아도 푸터에 유지 |
| 1 | `header` | 헤더 | 로고 텍스트 Stay B, 메뉴, 언어 전환, 헤더 버튼 `Ask` |
| 2 | `hero` | 첫 화면 | 핵심 약속 + 온라인/오프라인 연결 그림 + **단계 고르기(주 행동)** + 질문 링크(보조) |
| 3 | `connect` | 이렇게 연결돼요 | 찾고 → 만나고 → 계속 연결 3단계 띠 |
| 4 | `guides` | 정보 허브 | 4단계 탭 × 정보 카드. 단계마다 "이 단계에서 직접 받을 수 있는 도움" 줄 |
| 5 | `offline` | 부산에서 직접 만나는 도움 (핵심) | 오프라인 경험 7개 + 가족 방문 한 줄 |
| 6 | `moments` | 이런 순간에 | 학생의 실제 장면 4개 → 정보 카드·오프라인 지원으로 연결. 후기 자리표시 |
| 7 | `community` | 계속 연결 | WhatsApp·Viber·네팔 학생 커뮤니티, 다가오는 모임 |
| 8 | `ask` | 질문 남기기 (데모 폼) | 정보로 해결 안 될 때 |
| 9 | `trust` | 누가 무엇을 돕나요 | 법적 경계를 안심시키는 설명으로 한 곳에 |
| 10 | `faq` | 자주 묻는 질문 | 학생이 실제로 묻는 7개 |
| 11 | `final-cta` | 마지막 행동 유도 | 단계 고르기 반복 + 질문 링크 |
| 12 | `footer` | 푸터 | 법적 고지 전문, 컨셉·가칭 표기, 파트너 링크 한 줄, 제작: BRIDGENODE |
| 고정 | `sticky-cta` | 모바일 하단 고정 바 | `My stage` + `Ask` |

### 3-2. 첫 화면 행동 순서 제안과 근거

**제안 순서: ① 내 단계 고르기(주) → ② 질문 남기기(보조 1, 첫 화면 텍스트 링크 + 고정 바) → ③ 커뮤니티 참여(보조 2, 오프라인 섹션 다음과 마지막 화면)**

1. **단계 고르기가 주 행동인 이유**
   - 대표 피드백의 핵심이 "유학생은 여기서 정보를 얻는 시스템"이다. 첫 화면에서 정보를 바로 꺼내 볼 수 있어야 그 느낌이 난다.
   - 개인정보를 하나도 요구하지 않는다. "사기 아닐까, 내 정보는?"이라고 망설이는 학생에게 가장 부담 없는 첫 행동이다.
   - 학생은 메신저로 특정 질문을 들고 들어온다. 4개 중 하나만 누르면 자기 질문 근처로 바로 간다(검색창보다 쉽고, 공개 정보 범위 안에서 끝난다).
2. **질문 남기기가 보조 1순위인 이유**
   - 질문은 "정보를 봤는데도 내 상황엔 안 맞을 때" 하는 다음 행동이다. 주 행동의 자연스러운 후속이라 같은 첫 화면에 `Can't find your answer? Ask us` 링크로 붙인다.
   - 정보 카드를 먼저 보고 나면 신뢰가 생겨 질문 품질이 올라가고, 행정사 상담이 필요한 질문만 걸러진다.
   - 모바일 하단 고정 바의 오른쪽 버튼으로 항상 닿게 한다.
3. **커뮤니티 참여가 보조 2순위인 이유**
   - "계속 연결된다"는 흐름의 3번째 단계다. 오프라인 경험(설명회·모임·할인)을 본 뒤에 커뮤니티의 가치가 이해된다.
   - 컨셉 시안에서는 실제 링크가 없어(데모 팝업) 첫 화면에 두면 "눌렀는데 아무것도 없음"이 첫 경험이 된다.
   - 첫 화면 행동이 3개면 학생이 고르기 어렵다. 첫 화면은 "고르기 + 막히면 묻기" 두 가지만.
4. 검토했다 뺀 대안: 커뮤니티를 보조 1순위로(네팔 학생은 메신저 그룹이 익숙함). → 시범 운영에서 커뮤니티 유입이 질문보다 많으면 순서를 바꾼다. [확인 필요: 대표 판단]

### 3-3. 모바일 레이아웃 원칙
- 기준 폭 360px, 좌우 여백 16px, 가로 스크롤 금지. 최대 폭 1120px(데스크톱 ≥960px).
- 첫 화면(360×640 기준, 안내띠 포함)에 반드시 보일 것: 머리말, 헤드라인, 온라인↔오프라인 연결 그림(작게), 단계 버튼 4개(2×2 격자), 질문 링크. 서브카피가 길어 밀리면 서브카피를 단계 버튼 아래로 내린다.
- 정보 허브 단계 탭은 모바일에서 가로로 넘기는 칩 줄(현재 탭이 화면 안에 보이게 자동 스크롤). 카드는 세로로 쌓고, 카드마다 제목+요약만 보이고 `Key points` 펼침.
- 오프라인 섹션: 모바일 세로 카드, 데스크톱 3열. "찾고 → 만나고 → 연결" 흐름 그림은 모바일 세로, 데스크톱 가로.

---

## 4. 실제 카피

### 0. 안내띠 (`concept-bar`)
- 0-2의 대표 결정 문구 그대로. `Back to BRIDGENODE portfolio / 브릿지노드 포트폴리오로` 링크(포트폴리오 갤러리 `../`), 닫기 버튼 라벨 `Close notice / 안내 닫기`.
- 한국어 고정 문구에는 `lang="ko"`(v1 검토 R-9 유지).

### 1. 헤더 (`header`)
- 로고 텍스트: `Stay B` (가칭 배지 없음, 가칭은 푸터에)
- 메뉴(데스크톱 노출, 모바일은 메뉴 버튼):
  - `Guides / 정보` → `#guides`
  - `In person / 직접 만나는 도움` → `#offline`
  - `Community / 커뮤니티` → `#community`
  - `FAQ / 자주 묻는 질문` → `#faq`
- 언어 전환: `EN` | `한국어` | `नेपाली`(비활성, 툴팁·보조 텍스트 `Coming soon / 준비 중`)
- 헤더 버튼(작은 외곽선): `Ask us / 질문하기` → `#ask`

### 2. 첫 화면 (`hero`)
- 머리말
  - EN: `For international students in Busan & Gyeongnam`
  - KO: `부산·경남 외국인 유학생을 위한 곳`
- 헤드라인
  - EN: `Find answers here. Get help in person, in Busan.`
  - KO: `필요한 정보는 여기서 찾고, 필요한 도움은 부산에서 직접 받으세요.`
- 서브카피
  - EN: `Simple guides for every stage of student life in Korea, from packing to graduation. And real support you can join: info sessions, first-week help, a welcome kit, member discounts and meetups.`
  - KO: `짐 싸는 날부터 졸업까지, 한국 유학생활 단계별로 쉽게 정리한 정보. 그리고 직접 받을 수 있는 도움: 입국 전 설명회, 첫 주 지원, 웰컴 키트, 멤버 할인, 지역 모임.`
- 온라인↔오프라인 연결 그림(헤드라인 옆 또는 아래, 작은 두 칸 + 잇는 선)
  - 왼쪽 칸: EN `Online` `Guides & checklists` / KO `온라인` `정보·체크리스트`
  - 오른쪽 칸: EN `In Busan` `Sessions, help & meetups` / KO `부산에서` `설명회·지원·모임`
  - 가운데 잇는 선 위 작은 글씨: EN `connected` / KO `연결`
- 단계 고르기(주 행동)
  - 질문: EN `Where are you now?` / KO `지금 어느 단계인가요?`
  - 버튼 4개 (큰 글씨 / 작은 글씨 한 줄)
    1. EN `Before I arrive` · `Packing, housing, first days` / KO `입국 전` · `준비물, 숙소, 첫날 계획`
    2. EN `Just arrived` · `First 3 months: registration, bank, phone` / KO `정착 중` · `입국 후 3개월: 외국인등록, 은행, 휴대폰`
    3. EN `Study, life & work` · `Part-time work, saving money, friends` / KO `생활·일` · `아르바이트, 생활비, 친구`
    4. EN `Visa & after graduation` · `Expiry dates, passport, staying on` / KO `비자·졸업 이후` · `만료일, 여권, 졸업 후 진로`
- 보조 링크(버튼 아래 텍스트 링크): EN `Can't find your answer? Ask us →` / KO `찾는 답이 없나요? 직접 물어보세요 →` → `#ask`
- 신뢰 한 줄(작은 글씨): EN `English and Korean now. Nepali coming soon. Visa and document work is handled only by qualified administrative agents.` / KO `영어·한국어로 시작하고, 네팔어도 준비 중이에요. 체류·서류 업무는 자격 있는 행정사만 맡습니다.`
  - 이 한 줄의 뒷문장은 `#trust`로 가는 링크(`How we work with experts / 전문가와 함께하는 방식`).

### 3. 이렇게 연결돼요 (`connect`)
- 제목: EN `How Stay B works` / KO `Stay B는 이렇게 연결돼요`
- 3단계 (번호 + 제목 + 한 줄)
  1. EN `Find it online` — `Guides and checklists for your stage, in plain English and Korean.` / KO `온라인에서 찾고` — `지금 단계에 맞는 정보와 체크리스트를 쉬운 영어·한국어로.`
  2. EN `Meet us in person` — `Info sessions, first-week help, a welcome kit and local meetups.` / KO `오프라인에서 만나고` — `입국 전 설명회, 첫 주 지원, 웰컴 키트, 지역 모임까지.`
  3. EN `Stay connected` — `Student chats, member discounts, and a reminder before your stay expiry date.` / KO `계속 연결돼요` — `학생 커뮤니티, 멤버 할인, 체류 만료일 전 알림까지.`

### 4. 정보 허브 (`guides`)
- 제목: EN `Guides for your stage` / KO `내 단계에 맞는 정보`
- 설명: EN `Short, simple guides based on public information. Pick your stage.` / KO `공개된 정보를 바탕으로 짧고 쉽게 정리했어요. 내 단계를 골라 보세요.`
- 감수 안내 한 줄(작은 글씨, 섹션 상단 1회만): EN `Guides are general information. Before launch, they are checked by a qualified administrative agent. Items marked "to be confirmed" are being checked.` / KO `일반 정보입니다. 서비스 시작 전 자격 있는 행정사가 감수합니다. "확인 예정" 표시는 지금 확인 중인 내용이에요.`
- 단계 탭 4개: 첫 화면 버튼과 같은 이름(큰 글씨만).
- 카드 공통 구조
  - 제목 / 한 줄 요약 / `Key points / 핵심` 3~5줄 / `Official source / 공식 출처:` 기관 이름(텍스트만) / 버튼 `Full guide · coming soon / 자세한 가이드 · 준비 중`
  - 카드 오른쪽 위 작은 라벨: 해당되면 `Checklist / 체크리스트`
- 탭 패널 맨 아래 공통 줄: `Help in person for this stage / 이 단계에서 직접 받을 수 있는 도움` + 오프라인 카드로 가는 칩 2~3개(아래 단계별 지정)

#### 단계 1. Before I arrive / 입국 전

**카드 1-1. Documents to bring / 챙겨 갈 서류** (Checklist)
- 요약 EN `Keep these in your hand luggage, not in your suitcase.` / KO `캐리어가 아니라 기내 가방에 넣어 두세요.`
- 핵심 EN
  - `Passport, with enough validity left [확인 필요: 권장 잔여 유효기간]`
  - `Your visa and your school's admission letter`
  - `Copies of your academic certificates`
  - `A few passport-size photos [확인 필요: 규격 3.5×4.5cm 여부]`
  - `Some Korean won in cash for your first days`
- 핵심 KO
  - `유효기간이 충분히 남은 여권 [확인 필요]`
  - `비자, 학교 입학허가서`
  - `학력 증명서 사본`
  - `여권용 사진 몇 장 [확인 필요]`
  - `첫 며칠 쓸 한국 돈 약간`
- 공식 출처: `Your school's international office · Korea Immigration Service` / `학교 국제처 · 법무부 출입국·외국인정책본부`

**카드 1-2. Finding a safe place to live / 안전하게 숙소 구하기**
- 요약 EN `Most scams happen before you even arrive. Slow down before you pay.` / KO `사기는 입국 전에 가장 많이 일어나요. 돈 보내기 전에 한 번 더 확인하세요.`
- 핵심 EN
  - `Ask your school about dormitories first.`
  - `Never send a deposit before you see a written contract.`
  - `Check that the person you pay is the real owner or a registered real estate agent.`
  - `Keep every receipt and message.`
- 핵심 KO
  - `먼저 학교 기숙사를 알아보세요.`
  - `계약서를 보기 전에는 보증금을 보내지 마세요.`
  - `돈을 받는 사람이 실제 집주인이나 등록된 공인중개사인지 확인하세요.`
  - `영수증과 메시지는 모두 보관하세요.`
- 공식 출처: `Your school's international office` / `학교 국제처`
- 화면 하단 작은 줄: EN `A housing list will be shared at our info sessions. [자리표시: 숙소 목록 공개 방식]` / KO `숙소 목록은 입국 전 설명회에서 안내해요. [자리표시]`

**카드 1-3. Your first day in Korea / 한국에서의 첫날**
- 요약 EN `Landing, getting a SIM, and getting to Busan.` / KO `도착, 유심, 부산까지 이동.`
- 핵심 EN
  - `Get a prepaid SIM at the airport with your passport, so you can use maps and messengers.`
  - `Buy a transport card for buses and the subway.`
  - `Plan how you will get to Busan before you land (train, bus or domestic flight).`
  - `Save your school's and dormitory's address in Korean.`
- 핵심 KO
  - `공항에서 여권으로 선불 유심을 사면 지도와 메신저를 바로 쓸 수 있어요.`
  - `버스·지하철용 교통카드를 사세요.`
  - `부산까지 가는 방법(기차, 버스, 국내선)을 도착 전에 정해 두세요.`
  - `학교·기숙사 주소를 한국어로 저장해 두세요.`
- 공식 출처: `Korea Tourism Organization` / `한국관광공사`

- 이 단계 오프라인 칩: `Pre-arrival info session` → `#off-session`, `First-week support` → `#off-firstweek`

#### 단계 2. Just arrived / 정착 중 (입국 후 3개월)

**카드 2-1. Alien registration: what to bring / 외국인등록 준비물** (Checklist)
- 요약 EN `If you stay in Korea longer than 90 days, you register with immigration. Book early.` / KO `한국에 90일 넘게 머물면 출입국에 외국인등록을 해야 해요. 예약은 일찍.`
- 핵심 EN
  - `Deadline: within 90 days of arrival [확인 필요]`
  - `Book a visit online through HiKorea [확인 필요: 방문 예약 필수 여부]`
  - `Usually needed: application form, passport, one photo, proof of enrollment, proof of address, fee [확인 필요: 서류 목록·수수료]`
  - `Your card arrives a few weeks later [확인 필요: 발급 기간]. Keep your receipt until then.`
- 핵심 KO
  - `기한: 입국 후 90일 이내 [확인 필요]`
  - `하이코리아에서 방문 예약 [확인 필요]`
  - `보통 필요한 것: 신청서, 여권, 사진 1장, 재학증명서, 거주지 증빙, 수수료 [확인 필요]`
  - `카드는 몇 주 뒤에 나와요 [확인 필요]. 그때까지 접수증을 보관하세요.`
- 공식 출처: `HiKorea · Busan Immigration Office [확인 필요: 관할 기관명]` / `하이코리아 · 부산출입국·외국인청 [확인 필요]`

**카드 2-2. Bank and phone: the right order / 은행·휴대폰 개설 순서**
- 요약 EN `Some steps need your alien registration card first. This order saves trips.` / KO `외국인등록증이 있어야 되는 일이 있어요. 이 순서면 헛걸음을 줄여요.`
- 핵심 EN (번호 목록)
  1. `Prepaid SIM with your passport (day 1)`
  2. `Alien registration (book and visit)`
  3. `Bank account with your card and Korean phone number [확인 필요: 은행별 요건]`
  4. `Switch to a monthly phone plan if you want [확인 필요]`
- 핵심 KO
  1. `여권으로 선불 유심 (첫날)`
  2. `외국인등록 (예약 후 방문)`
  3. `외국인등록증과 한국 번호로 은행 계좌 개설 [확인 필요]`
  4. `원하면 월정액 요금제로 변경 [확인 필요]`
- 공식 출처: `Financial Supervisory Service · your bank` / `금융감독원 · 거래 은행`

**카드 2-3. Health insurance / 건강보험**
- 요약 EN `International students are generally covered by Korea's National Health Insurance. Know when it starts and pay on time.` / KO `유학생도 대체로 국민건강보험에 가입돼요. 언제 시작되는지 알고, 보험료는 제때 내세요.`
- 핵심 EN
  - `When coverage starts depends on your visa type [확인 필요: 자격별 가입 시점]`
  - `You will get a monthly bill [확인 필요: 보험료 수준·감면]`
  - `Unpaid bills can cause problems when you extend your stay [확인 필요]`
  - `Ask your school if you also have school insurance.`
- 핵심 KO
  - `가입 시점은 체류자격에 따라 달라요 [확인 필요]`
  - `매달 보험료 고지서가 와요 [확인 필요]`
  - `보험료를 안 내면 체류기간 연장 때 문제가 될 수 있어요 [확인 필요]`
  - `학교 보험이 따로 있는지 국제처에 물어보세요.`
- 공식 출처: `National Health Insurance Service` / `국민건강보험공단`

**카드 2-4. Getting around and emergencies / 교통·긴급 연락처**
- 요약 EN `Save these numbers today.` / KO `이 번호들은 오늘 저장해 두세요.`
- 핵심 EN
  - `112 Police · 119 Fire and ambulance`
  - `1345 Immigration Contact Center, with foreign language help [확인 필요: 지원 언어·시간]`
  - `Map apps that work well in Korea: Naver Map, KakaoMap`
  - `One transport card works on Busan buses and subway.`
- 핵심 KO
  - `112 경찰 · 119 화재·구급`
  - `1345 외국인종합안내센터, 외국어 상담 [확인 필요]`
  - `한국에서 잘 되는 지도 앱: 네이버 지도, 카카오맵`
  - `교통카드 하나로 부산 버스·지하철을 탈 수 있어요.`
- 공식 출처: `Korea Immigration Service · Busan Metropolitan City` / `법무부 · 부산광역시`

- 이 단계 오프라인 칩: `Settling-in help` → `#off-settle`, `Welcome kit & membership card` → `#off-kit`

#### 단계 3. Study, life & work / 생활·일

**카드 3-1. Part-time work: the basic rules / 시간제취업 기본 규칙**
- 요약 EN `You need permission before your first day of work. Not after.` / KO `일을 시작하기 전에 허가를 받아야 해요. 시작한 뒤가 아니라.`
- 핵심 EN
  - `Get part-time work permission from immigration first, with your school's confirmation [확인 필요: 절차]`
  - `Allowed hours depend on your visa, Korean level and whether it is semester or vacation [확인 필요: 허용 시간]`
  - `Some kinds of work are not allowed for students [확인 필요: 제한 업종]`
  - `Working without permission, or too many hours, can put your visa at risk.`
- 핵심 KO
  - `학교 확인을 받아 출입국에서 시간제취업 허가를 먼저 받으세요 [확인 필요]`
  - `허용 시간은 체류자격, 한국어 능력, 학기 중·방학에 따라 달라요 [확인 필요]`
  - `학생에게 허용되지 않는 일이 있어요 [확인 필요]`
  - `허가 없이 일하거나 시간을 넘기면 체류자격에 문제가 생길 수 있어요.`
- 공식 출처: `HiKorea · your school's international office` / `하이코리아 · 학교 국제처`

**카드 3-2. Before your first job: a checklist / 첫 아르바이트 전 체크리스트** (Checklist)
- 요약 EN `Five things to check before you say yes.` / KO `하겠다고 말하기 전에 확인할 다섯 가지.`
- 핵심 EN
  - `Your work permission is approved.`
  - `You have a written work contract.`
  - `Your pay is at least the minimum wage [확인 필요: 해당 연도 최저임금]`
  - `You know your pay day and get a pay slip.`
  - `Never hand over your passport or alien registration card to an employer.`
- 핵심 KO
  - `시간제취업 허가가 났다.`
  - `근로계약서를 썼다.`
  - `시급이 최저임금 이상이다 [확인 필요]`
  - `월급날을 알고, 급여명세서를 받는다.`
  - `여권이나 외국인등록증을 사장님에게 맡기지 않는다.`
- 카드 하단 한 줄(일자리 문맥, 필수): EN `Stay B shares general job information. Job introductions are made by registered employment agencies and job centers.` / KO `Stay B는 일반 일자리 정보만 안내해요. 일자리 소개는 등록된 직업소개소와 고용센터가 합니다.`
- 공식 출처: `Ministry of Employment and Labor` / `고용노동부`

**카드 3-3. Saving on everyday costs / 생활비 아끼기**
- 요약 EN `Small savings add up over a semester.` / KO `작은 절약이 한 학기면 커져요.`
- 핵심 EN
  - `Use student discounts on transport where available [확인 필요: 부산 학생 교통 할인 대상]`
  - `Cook with friends and shop at traditional markets.`
  - `Show your Stay membership card at partner shops for discounts.`
  - `Check your school for free events and meals.`
- 핵심 KO
  - `해당되면 학생 교통 할인을 쓰세요 [확인 필요]`
  - `친구와 같이 요리하고, 전통시장을 이용해 보세요.`
  - `제휴 매장에서 Stay 멤버십 카드를 보여 주고 할인받으세요.`
  - `학교의 무료 행사·식사 정보를 챙기세요.`
- 공식 출처: `Busan Metropolitan City` / `부산광역시`

**카드 3-4. When you feel alone / 외롭거나 힘들 때**
- 요약 EN `Feeling homesick is normal. You do not have to handle it alone.` / KO `향수병은 자연스러운 거예요. 혼자 견디지 않아도 돼요.`
- 핵심 EN
  - `Your school has a counseling center. Ask the international office.`
  - `Join students from your country at our meetups.`
  - `If you are in danger, call 112 or 119.`
- 핵심 KO
  - `학교에 상담센터가 있어요. 국제처에 물어보세요.`
  - `같은 나라 학생들이 모이는 Stay B 모임에 와 보세요.`
  - `위험할 때는 112나 119로 전화하세요.`
- 공식 출처: `Your school` / `재학 중인 학교`

- 이 단계 오프라인 칩: `Member discounts` → `#off-discount`, `Meetups & communities` → `#off-meetup`, `Career talks` → `#off-career`

#### 단계 4. Visa & after graduation / 비자·졸업 이후

**카드 4-1. Know your dates / 내 만료일 알기**
- 요약 EN `Your stay expiry date is on your alien registration card. Missing it can cause serious problems.` / KO `체류 만료일은 외국인등록증에 있어요. 놓치면 큰 문제가 될 수 있어요.`
- 핵심 EN
  - `Apply to extend before your expiry date [확인 필요: 신청 가능 시작 시점]`
  - `Extensions are applied for through immigration (HiKorea).`
  - `Unpaid health insurance or missing school documents can slow things down [확인 필요]`
  - `Stay B plans to remind you 90, 30 and 7 days before your date.`
- 핵심 KO
  - `만료일 전에 연장을 신청하세요 [확인 필요]`
  - `연장은 출입국(하이코리아)을 통해 신청해요.`
  - `건강보험료 미납이나 학교 서류가 없으면 늦어질 수 있어요 [확인 필요]`
  - `Stay B는 만료 90일·30일·7일 전에 알려 드릴 계획이에요.`
- 카드 안 작은 도구(데모): `How many days do I have? / 며칠 남았을까?` 날짜 입력 → 남은 일수 표시(아래 5절)
- 공식 출처: `HiKorea` / `하이코리아`

**카드 4-2. Extension or passport renewal? / 연장과 여권 갱신은 달라요**
- 요약 EN `They are two different things, done in two different places.` / KO `둘은 다른 일이고, 하는 곳도 달라요.`
- 핵심 EN
  - `Extending your stay: Korean immigration office.`
  - `Renewing your passport: Embassy of Nepal in Seoul [확인 필요: 대사관 절차·소요 기간]`
  - `After you get a new passport, report the change to immigration within a set period [확인 필요: 신고 기한]`
- 핵심 KO
  - `체류기간 연장: 한국 출입국 기관`
  - `여권 갱신: 주한 네팔대사관(서울) [확인 필요]`
  - `새 여권을 받으면 정해진 기간 안에 출입국에 변경 신고 [확인 필요]`
- 공식 출처: `HiKorea · Embassy of Nepal in Seoul` / `하이코리아 · 주한 네팔대사관`

**카드 4-3. Staying after graduation / 졸업 후 한국에 남는 길**
- 요약 EN `Some students leave only because no one explained the options. Start looking a semester early.` / KO `방법을 몰라서 졸업과 함께 떠나는 학생도 있어요. 한 학기 전부터 알아보세요.`
- 핵심 EN
  - `Job-seeking visa after graduation [확인 필요: D-10 요건]`
  - `Work visas for specific jobs [확인 필요: E-7 등 요건]`
  - `Regional programs for living and working in Busan and Gyeongnam [확인 필요: 지역특화형 비자 부산·경남 시행 여부]`
  - `Which path fits you is a decision for a qualified administrative agent.`
- 핵심 KO
  - `졸업 후 구직 비자 [확인 필요]`
  - `특정 직종 취업 비자 [확인 필요]`
  - `부산·경남 지역 정착 제도 [확인 필요]`
  - `어떤 길이 맞는지는 자격 있는 행정사가 판단해요.`
- 공식 출처: `HiKorea · Ministry of Justice` / `하이코리아 · 법무부`

**카드 4-4. Big life changes / 삶의 큰 변화가 생길 때**
- 요약 EN `Getting married or inviting family changes your stay status. Start with the right person.` / KO `결혼이나 가족 초청은 체류자격이 바뀌는 일이에요. 맞는 사람과 시작하세요.`
- 핵심 EN
  - `Guide: status change after marriage (coming soon)`
  - `Guide: inviting family (coming soon)`
  - `Guide: getting ready for permanent residency (coming soon)`
  - `For your own case, ask us and we will connect you to a qualified administrative agent, with your consent.`
- 핵심 KO
  - `결혼 후 체류자격 변경 안내 (준비 중)`
  - `가족 초청 절차 안내 (준비 중)`
  - `영주 준비 안내 (준비 중)`
  - `내 상황은 질문을 남기면, 동의를 받아 자격 있는 행정사에게 연결해 드려요.`
- 공식 출처: `HiKorea` / `하이코리아`
- 카드 하단 한 줄(가족, 학생 관점): EN `Family coming to visit you in Korea? NOWRO Korea can help with family trips. (coming soon)` / KO `가족이 한국에 방문할 때도, NOWRO Korea가 가족 여행을 도와요. (연결 예정)`

- 이 단계 오프라인 칩: `Career talks` → `#off-career`, `Ask us` → `#ask`

#### "자세한 가이드 · 준비 중" 처리 방식
- 버튼 모양: 회색 글자 + 시계 아이콘의 텍스트 버튼(비활성처럼 보이지만 누를 수 있음, `aria-disabled` 쓰지 않음).
- 누르면 하단 토스트 4초:
  - EN `This full guide is being checked by a qualified administrative agent. Need help now? Ask us.` + 링크 `Ask us`
  - KO `자세한 가이드는 자격 있는 행정사가 감수 중이에요. 지금 도움이 필요하면 질문을 남겨 주세요.` + 링크 `질문하기`
- 실제 가이드 페이지가 생기면 버튼을 `Read the full guide / 자세히 보기` 링크로 바꾸기만 하면 되게 카드마다 `data-guide-url` 자리를 둔다(지금은 비움).

### 5. 부산에서 직접 만나는 도움 (`offline`) — 핵심 섹션
- 머리말: EN `In person` / KO `직접 만나는 도움`
- 제목: EN `Not just a website. Real help in Busan.` / KO `웹사이트로 끝나지 않아요. 부산에서 직접 돕습니다.`
- 설명: EN `Find the answer online. When you need a hand, meet us. Then stay connected all through your student life.` / KO `정보는 온라인에서 찾고, 손이 필요할 땐 직접 만나요. 그리고 유학생활 내내 연결돼 있어요.`
- 흐름 그림(섹션 상단, 3칸 + 화살표): `Find online / 온라인에서 찾고` → `Meet in person / 오프라인에서 만나고` → `Stay connected / 계속 연결돼요`. 아래 카드 7개가 각자 어느 칸에 속하는지 같은 아이콘으로 표시.
- 카드 공통: 제목 / 언제(단계 라벨) / 설명 2문장 / `Cost / 비용: [자리표시]` / 상태 배지 `Planned / 준비 중` / 버튼(카드별)

| id | 흐름 칸 | 제목 EN / KO | 언제 | 설명 EN | 설명 KO | 버튼 |
|---|---|---|---|---|---|---|
| `off-session` | 만나고 | `Pre-arrival info sessions` / `입국 전 설명회` | Before I arrive / 입국 전 | `Meet us in Nepal, with our partner language school, before you fly. Learn about Busan, your school, housing and your first week.` | `출국 전 네팔에서 연계 어학원과 함께 만나요. 부산, 학교, 숙소, 첫 주를 미리 알려 드려요.` | `Get session dates / 설명회 일정 받기` → 데모 토스트 |
| `off-firstweek` | 만나고 | `First-week support` / `공항부터 첫 주까지` | Before I arrive → Just arrived | `Optional help when you land, such as airport pickup and a guided first week. It does not include any administrative or visa work.` | `원하는 학생에게 공항 픽업, 첫 주 생활 안내 같은 도움을 드려요. 행정·체류 업무 대행은 포함하지 않아요.` | `Ask about first-week support / 첫 주 지원 문의` → `#ask`(주제 자동 선택: Just arrived) |
| `off-settle` | 만나고 | `Settling-in help` / `정착 동행·예약 안내` | Just arrived / 정착 중 | `We show you how to book your alien registration visit and what to bring. We can go with you to open a bank account or get a phone.` | `외국인등록 방문 예약 방법과 준비물을 알려 드려요. 은행 계좌 개설, 휴대폰 개통에는 함께 가 드릴 수 있어요.` | `Ask about settling-in help / 정착 도움 문의` → `#ask` |
| `off-kit` | 만나고 | `Welcome kit & Stay membership card` / `웰컴 키트·Stay 멤버십 카드` | Just arrived / 정착 중 | `A welcome kit for your first days in Busan, and a membership card for partner discounts. Designed by Heritage Studio B.` | `부산에서의 첫날을 위한 웰컴 키트와, 제휴 할인에 쓰는 멤버십 카드. 헤리티지 스튜디오 B가 디자인합니다.` | 없음. 카드 안 `What's inside: [자리표시: 웰컴 키트 구성]` |
| `off-discount` | 연결 | `Member discounts` / `제휴업체 할인` | Study, life & work / 생활·일 | `Show your Stay membership card for discounts at local partners: places to stay, food, phone plans and everyday services.` | `Stay 멤버십 카드를 보여 주면 지역 제휴처(숙소, 식당, 통신, 생활 서비스)에서 할인받아요.` | 없음. 카드 안 `Partners: [자리표시: 제휴업체 목록]` |
| `off-meetup` | 연결 | `Meetups & communities` / `지역 행사·국가별 모임` | Study, life & work / 생활·일 | `Local events and meetups by school and by country, starting with students from Nepal.` | `학교별·국가별 모임과 지역 행사. 네팔 학생 모임부터 시작해요.` | `See the community / 커뮤니티 보기` → `#community` |
| `off-career` | 만나고 | `Career talks` / `취업 특강` | Study, life & work → Visa & after graduation | `Talks on job hunting in Korea, writing a Korean-style resume, and Korean for work.` | `한국 구직 방법, 한국식 이력서, 일할 때 쓰는 한국어를 배우는 특강.` | `Get talk dates / 특강 일정 받기` → 데모 토스트 |

- 카드 아래 장소·일정 한 줄: EN `Where and when: [자리표시: 시범 장소·일정]` / KO `장소·일정: [자리표시]`
- 섹션 맨 아래 가족 한 줄(작은 카드, 아이콘: 비행기 또는 집): EN `When your family visits: NOWRO Korea helps families travel in Korea. (coming soon)` / KO `가족이 방문할 때도: NOWRO Korea가 가족의 한국 여행을 도와요. (연결 예정)`
- 데모 토스트 문구(설명회·특강 일정): EN `Demo: dates will be shared when the service starts.` / KO `데모입니다. 일정은 서비스 시작 때 안내해요.`

### 6. 이런 순간에 (`moments`)
- 제목: EN `Moments we are here for` / KO `이런 순간을 위해 있어요`
- 장면 카드 4개. 장면 글은 "후기"가 아니라 2인칭 상황 묘사(따옴표·이름·사진 없음). 카드마다 버튼 2개: 정보(외곽선) / 직접 도움(채움).

1. **Your first week in Busan / 부산에서의 첫 주**
   - EN `You landed two days ago. Your phone runs on a prepaid SIM, the bank asks for a card you do not have yet, and the immigration website is in Korean.`
   - KO `도착한 지 이틀. 휴대폰은 선불 유심이고, 은행은 아직 없는 카드를 달라고 하고, 출입국 사이트는 한국어예요.`
   - 버튼: `Settling-in checklist / 정착 체크리스트` → 정착 중 탭 카드 2-1 / `Get settling-in help / 정착 도움 받기` → `#off-settle`
2. **Before your first part-time job / 첫 아르바이트 전**
   - EN `A restaurant near campus says you can start tomorrow. A friend says you do not need permission. Is that true?`
   - KO `학교 앞 식당에서 내일부터 나오라고 해요. 친구는 허가 같은 건 필요 없대요. 정말일까요?`
   - 버튼: `Part-time work rules / 시간제취업 규칙` → 카드 3-1 / `Ask us / 질문하기` → `#ask`
3. **When your expiry date is getting close / 만료일이 다가올 때**
   - EN `Your card says two months left. Extension, passport renewal, health insurance. Which comes first?`
   - KO `카드에 두 달 남았다고 적혀 있어요. 연장, 여권 갱신, 건강보험. 뭐부터 해야 하죠?`
   - 버튼: `Know your dates / 만료일 알기` → 카드 4-1 / `Ask us / 질문하기` → `#ask`
4. **Before graduation / 졸업을 앞두고**
   - EN `Your friends are packing. You want to stay and work in Busan, but you are not sure there is a way.`
   - KO `친구들은 짐을 싸요. 나는 부산에 남아 일하고 싶은데, 방법이 있는지 모르겠어요.`
   - 버튼: `After graduation / 졸업 후 진로` → 카드 4-3 / `Join a career talk / 취업 특강` → `#off-career`
- 후기 자리(장면 아래, 한 칸): EN `Student stories will be shared after our pilot.` / KO `학생 이야기는 시범 운영 후에 전해 드릴게요.` + `[자리표시: 실제 학생 후기·사진, 본인 동의 받은 것만]`

### 7. 계속 연결 (`community`)
- 제목: EN `You are not alone here.` / KO `여기서는 혼자가 아니에요.`
- 설명: EN `Join students from your country and your school. Share tips, ask quick questions, and hear first about meetups and member discounts.` / KO `같은 나라, 같은 학교 학생들과 함께하세요. 팁을 나누고, 가볍게 묻고, 모임과 할인 소식을 먼저 받아 보세요.`
- 채널 카드 3개 (버튼은 모두 데모 토스트)
  - `WhatsApp` — EN `Chat with us and join student groups.` / KO `문의하고 학생 그룹에 참여하세요.` — `Open WhatsApp / WhatsApp 열기`
  - `Viber` — EN `Prefer Viber? We are there too.` / KO `Viber가 편하다면 여기서도 만나요.` — `Open Viber / Viber 열기`
  - `Nepal student community` — EN `For students from Nepal, with our partner language school.` / KO `네팔 학생 커뮤니티, 연계 어학원과 함께해요.` — `Join / 참여하기`
- 다가오는 모임 줄: EN `Upcoming meetups: [자리표시: 시범 모임 일정]` / KO `다가오는 모임: [자리표시]`
- 이용 안내 한 줄(작은 글씨): EN `Tips from members are personal experiences, not official advice.` / KO `회원이 나누는 팁은 개인 경험이며 공식 안내가 아니에요.`
- 데모 토스트: EN `Demo: community links will be added when the service starts.` / KO `데모입니다. 커뮤니티 링크는 서비스 시작 때 연결돼요.`

### 8. 질문 남기기 (`ask`) — 데모 폼
- 제목: EN `Still have a question? Ask us.` / KO `아직 궁금한 게 있나요? 물어보세요.`
- 설명: EN `Tell us a little about your situation. We will reply on the channel you choose.` / KO `상황을 간단히 알려 주세요. 고른 채널로 답해 드릴게요.`
- 데모 배지(폼 상단): EN `Demo form: nothing you type here is sent or saved.` / KO `데모 폼입니다. 입력한 내용은 전송되거나 저장되지 않습니다.`
- 필드 (v1 대비 바뀐 것만 표시, 나머지는 v1 4절 7번과 같음, 표기는 Stay B)
  1. `Name or nickname / 이름 또는 닉네임` (필수)
  2. `School / 학교` — `[자리표시] 시범 대학`, `[자리표시] 연계 어학원`, `Other / 기타`, `Not enrolled yet / 아직 입학 전`
  3. `Country / 국적` — 기본 `Nepal / 네팔`, `Other / 기타`
  4. **변경** `Which stage are you in? / 지금 어느 단계인가요?` (필수, 라디오 카드 5개): `Before I arrive / 입국 전`, `Just arrived / 정착 중`, `Study, life & work / 생활·일`, `Visa & after graduation / 비자·졸업 이후`, `Something else / 기타`
     - 정보 카드·오프라인 카드에서 `#ask`로 왔으면 해당 단계 자동 선택
  5. **추가** `What is it about? / 어떤 내용인가요?` (선택, 한 줄 선택 박스): `Everyday life / 생활`, `Part-time work / 아르바이트`, `Visa & stay / 체류`, `Marriage & family / 결혼·가족`, `First-week or settling-in help / 첫 주·정착 도움`, `Other / 기타`
  6. `Your stay expiry date (optional) / 체류기간 만료일 (선택)` — 도움말 `Helps us remind you in time. / 제때 알려 드리는 데 쓰여요.`
  7. `Your question / 질문 내용` (필수) — 도움말 `Please do not include your passport or alien registration number. / 여권번호나 외국인등록번호는 적지 마세요.`
  8. `How should we reply? / 어디로 답할까요?` — `WhatsApp`, `Viber`, `Email / 이메일`
  9. `Contact / 연락처` — 8번에 따라 라벨 변경
  10. `Preferred language / 원하는 언어` — `English`, `한국어`, `नेपाली (soon / 준비 중)` 비활성
  11. 동의(필수, 필수 문맥): EN `I agree that Stay B may use this information to answer my question, and may share it with a partner administrative agent only if my question needs one.` / KO `질문에 답하기 위해 Stay B가 이 정보를 이용하고, 행정사 상담이 필요한 경우에만 협업 행정사에게 전달하는 데 동의합니다.`
- 제출 버튼: `Send my question / 질문 보내기`
- 폼 하단 경계 한 줄은 **삭제**(`#trust`로 모음).
- 결과 화면 분기(v1 문구 유지, Stay B 표기):
  - 분기 A(5번이 생활·첫 주·정착 도움·기타이거나 비어 있고, 4번이 입국 전·정착 중·생활·일): 배지 `Guides first / 정보로 먼저 안내` — EN `This looks like an everyday question. In the live service, we would first send you the right guide, and a team member would follow up if you need more. For first-week or settling-in help, we would tell you how to join.` / KO `생활 질문으로 보여요. 실제 서비스에서는 맞는 정보를 먼저 보내 드리고, 더 필요하면 담당자가 이어서 도와요. 첫 주·정착 도움이라면 신청 방법을 안내해 드려요.`
  - 분기 B(5번이 아르바이트·체류·결혼·가족이거나, 4번이 비자·졸업 이후): 배지 `Partner agent / 협업 행정사 연결` — v1 문구 그대로.
  - 만료일 입력 시 남은 일수 줄, 지난 날짜 줄: v1 그대로.
  - 결과 하단 데모 문구와 버튼 2개(`Ask another question`, `Join the community`): v1 그대로.

### 9. 누가 무엇을 돕나요 (`trust`) — 법적 경계는 여기 한 곳
- 머리말: EN `How we work` / KO `이렇게 일해요`
- 제목: EN `We help with everyday life. Visa and document work is done by qualified experts.` / KO `생활은 Stay B가 돕고, 체류·서류는 자격 있는 행정사가 맡아요.`
- 설명: EN `So you always know who is helping you, and nobody asks you to pay for something they are not allowed to do.` / KO `누가 나를 돕고 있는지 늘 알 수 있게, 그리고 자격 없는 사람에게 돈을 내는 일이 없게.`
- 두 칸 (같은 무게, 대립이 아니라 나란히)
  - 왼쪽 `Stay B helps with / Stay B가 돕는 일`
    - EN: `Guides and checklists based on public information` · `Info sessions, settling-in help, welcome kit, discounts and meetups` · `Community chats and expiry date reminders` · `Passing your question to a partner agent, only with your consent`
    - KO: `공개 정보 기반 안내·체크리스트` · `설명회, 정착 동행, 웰컴 키트, 할인, 모임` · `커뮤니티, 만료일 알림` · `동의를 받은 경우에만 협업 행정사에게 질문 전달`
  - 오른쪽 `A qualified administrative agent (Haengjeongsa) handles / 자격 있는 협업 행정사가 맡는 일`
    - EN: `Advice on your own case` · `Preparing and filing visa and stay documents` · `Any fee for this work, agreed directly between you and the agent`
    - KO: `내 상황에 대한 판단과 상담` · `체류·출입국 서류 작성과 신청` · `이 업무 비용은 학생과 행정사가 직접 정함`
- 두 칸 아래 작은 줄 3개 (아이콘 + 한 줄)
  - EN `Stay B does not charge any fee for administrative work and does not take a share of the agent's fee.` / KO `Stay B는 행정 업무 비용을 받지 않고, 행정사 비용의 일부도 받지 않아요.`
  - EN `Job introductions are made by registered employment agencies and job centers.` / KO `일자리 소개는 등록된 직업소개소와 고용센터가 해요.`
  - EN `Stay B does not offer matchmaking or marriage brokering.` / KO `Stay B는 결혼 매칭이나 중개를 하지 않아요.`
- 개인정보 한 줄: EN `Your information is used only to help you, and shared with an agent only when you agree. Never send your passport or alien registration number.` / KO `내 정보는 나를 돕는 데만 쓰고, 동의할 때만 행정사에게 전달해요. 여권번호·외국인등록번호는 보내지 마세요.`
- 이 섹션 문구는 검토 통과본(v1 경계 상자·역할표·FAQ 1·3·5, partners.html 원칙 1의 F-A1 문구)의 의미를 그대로 유지하고 말투만 바꿨다. "사건 소개" 표현은 쓰지 않는다.

### 10. 자주 묻는 질문 (`faq`) — 7개, 답은 짧게
1. Q EN `Is Stay B free?` / KO `Stay B는 무료인가요?`
   - A EN `The guides on this site are free to read, and asking us a question is free. [자리표시: 선택형 오프라인 생활지원 비용]` / KO `이 사이트의 정보는 누구나 무료로 볼 수 있고, 질문 남기기도 무료예요. [자리표시: 선택형 오프라인 생활지원 비용]`
2. Q EN `Is Stay B a government office or an administrative agent?` / KO `Stay B는 관공서나 행정사 사무소인가요?`
   - A EN `Neither. Stay B is a private information, support and community service for international students. See How we work.` / KO `둘 다 아니에요. 유학생을 위한 민간 정보·지원·커뮤니티 서비스예요. "이렇게 일해요"를 참고하세요.` (`#trust` 링크)
3. Q EN `Can you tell me if my visa will be approved?` / KO `제 비자가 나올지 알려 줄 수 있나요?`
   - A EN `No. We share general information, and connect you to a qualified partner agent who can look at your case.` / KO `아니요. 일반 정보를 안내하고, 내 상황을 볼 수 있는 자격 있는 협업 행정사에게 연결해 드려요.`
4. Q EN `Where can I meet you in person?` / KO `어디서 직접 만날 수 있나요?`
   - A EN `In Busan, at [자리표시: 장소]. Before you arrive, at info sessions with our partner language school in Nepal.` / KO `부산 [자리표시: 장소]에서 만나요. 입국 전에는 네팔 연계 어학원 설명회에서 만나요.`
5. Q EN `Can you find me a part-time job?` / KO `아르바이트를 구해 줄 수 있나요?`
   - A EN `We explain the rules and share general job information. Job introductions are made by registered agencies.` / KO `규칙과 일반 일자리 정보를 안내해요. 일자리 소개는 등록된 기관이 해요.`
6. Q EN `I am getting married in Korea. Can you help?` / KO `한국에서 결혼할 예정인데 도와줄 수 있나요?`
   - A EN `If your marriage is already decided, we share general information on the stay steps that follow, and connect you to a partner agent. We do not offer matchmaking or marriage brokering.` / KO `결혼이 이미 정해졌다면 이후 체류 절차의 일반 정보를 안내하고 협업 행정사에게 연결해 드려요. 결혼 매칭·중개는 하지 않아요.`
7. Q EN `Which languages do you support?` / KO `어떤 언어를 지원하나요?`
   - A EN `English and Korean first, then Nepali. More languages may come as we grow.` / KO `영어·한국어부터, 이어서 네팔어. 서비스가 커지면 다른 언어도 추가할 수 있어요.`

### 11. 마지막 행동 유도 (`final-cta`)
- 헤드라인: EN `Start with where you are now.` / KO `지금 내 단계부터 시작하세요.`
- 단계 버튼 4개(첫 화면과 같은 이름, 작은 크기, 한 줄 또는 2×2)
- 보조 링크 2개: `Ask us / 질문하기` → `#ask` · `Join the community / 커뮤니티 참여하기` → `#community`

### 12. 푸터 (`footer`)
- 브랜드: `Stay B` · `Busan · Gyeongnam`
- 파트너 링크 한 줄: EN `For universities, language schools and partners →` / KO `대학·어학원·협력 기관 안내 →` → `partners.html`
- 법적 고지(EN): `Stay B provides general information based on public sources, offline settling-in support, and a student community and consultation intake. It is not a government agency or an administrative agent's office. Stay B does not judge individual cases, prepare or file documents on anyone's behalf, or charge fees for administrative work. Those services are provided only by qualified partner administrative agents, under their own name and responsibility. Job introductions are handled by registered employment agencies. Stay B does not provide matchmaking or marriage brokering.`
- 법적 고지(KO): `Stay B는 공개 정보를 바탕으로 한 일반 안내, 오프라인 정착 지원, 유학생 커뮤니티와 상담 접수를 운영합니다. 관공서나 행정사 사무소가 아닙니다. Stay B는 개별 사건을 판단하거나, 서류를 대신 작성·신청하거나, 행정 업무 비용을 받지 않습니다. 이러한 업무는 자격을 갖춘 협업 행정사가 자신의 이름과 책임으로만 제공합니다. 일자리 알선은 등록된 기관이 수행하며, Stay B는 결혼 매칭·중개를 하지 않습니다.`
  - v1 통과 문구에 "오프라인 정착 지원 / offline settling-in support"만 추가했다(검토자 확인 필요).
- 컨셉 표기(항상): EN `This page is a concept demo designed and built by BRIDGENODE. Forms on this page do not send or store any data.` / KO `이 페이지는 브릿지노드가 기획·제작한 컨셉 시안입니다. 이 페이지의 폼은 어떤 정보도 전송·저장하지 않습니다.`
- 가칭: `Stay B is a working name.` / `Stay B는 가칭입니다.`
- 연락처: `Contact: [자리표시]`
- 제작 표기: 브릿지노드 마크(`brand/bridgenode-mark.svg`, 높이 16px) + 텍스트 `Made by BRIDGENODE / 제작: BRIDGENODE` → `https://bridgenode-studio.calmgrou.chatgpt.site/` (새 탭). 로고는 이 한 곳에만 쓴다.

### 13. 모바일 하단 고정 바 (`sticky-cta`)
- 왼쪽(주): `My stage / 내 단계` → `#guides` (마지막으로 고른 단계 탭 열기)
- 오른쪽(보조, 외곽선): `Ask us / 질문하기` → `#ask`
- 스크롤 300px 이후 표시. `#hero`의 단계 버튼, `#ask`, `#final-cta`가 화면에 보이면 숨김.

### 14. 메타 정보
- `<title>`: `Stay B · Student life guides & support in Busan (Concept)`
- meta description(EN): `Guides for every stage of student life in Busan and Gyeongnam, plus in-person support: info sessions, first-week help, member discounts and meetups. Concept demo.`
- OG: 11절 마케터 메모의 초안 사용. 이미지 `[자리표시] og-image 1200×630`
- `noindex` 유지(컨셉 시안). `<html lang>` 언어 전환 시 `en`↔`ko`.

---

## 5. 기능 요구사항

### 기본 전제
- 정적 페이지. 서버·데이터베이스·외부 API·분석 도구·쿠키 배너 없음. 외부 리소스는 웹폰트만.
- 기존 구조 유지: `portfolio-site/stay-b/index.html` + `assets/site.css` + `assets/common.js`(partners.html과 공유).
- **작업 위치:** 공개 사이트가 푸시하면 바로 배포되므로, 웹코더는 `work/builds/stayb-v2/`에서 만들고 검토 통과 + 대표 승인 후 `portfolio-site/stay-b/`로 옮긴다.

### 필수 (P1)
1. **단계 선택 → 정보 허브 연동**
   - 첫 화면·마지막 화면 단계 버튼, 장면 카드 버튼, 고정 바가 모두 같은 함수로 `#guides`의 해당 탭을 연다. 주소는 `#guides-arrive`, `#guides-settle`, `#guides-life`, `#guides-visa`(공유·뒤로가기 가능). 특정 카드로 갈 때는 `#guide-2-1`처럼 카드 id로 이동하고 1.5초 강조.
   - 탭은 WAI-ARIA 탭 패턴(`role=tablist/tab/tabpanel`, 좌우 화살표 키). 기본 탭: 저장된 값이 없으면 `Before I arrive`.
   - 마지막으로 고른 단계를 `localStorage`에 기억(try/catch, 실패해도 정상 동작). 개인 편의용일 뿐 다른 데이터는 저장하지 않는다.
2. **정보 카드**: 모바일은 `Key points` 펼침(`<details>`), 데스크톱(≥960px)은 처음부터 펼침. `[확인 필요]`는 `to be confirmed / 확인 예정` 칩으로 렌더링. "자세한 가이드 · 준비 중" 토스트(4절 처리 방식).
3. **만료일 남은 일수 데모 도구(카드 4-1)**: 날짜 입력 → `N days left / N일 남았어요`. 90일 이하면 `Start preparing now / 지금 준비를 시작하세요`, 지난 날짜면 v1의 지난 날짜 문구. 저장·전송 없음. 아래 줄 `Reminders by WhatsApp or Viber are planned. / WhatsApp·Viber 알림은 준비 중이에요.`
4. **오프라인 카드 → 질문 폼 연결**: `#ask`로 갈 때 폼 4번(단계)·5번(내용)을 자동 선택(`첫 주 지원` → 정착 중 + 첫 주·정착 도움).
5. **질문 데모 폼**: v1 5절 2번 기능 그대로(검증, 연락처 라벨 변경, `preventDefault`, 전송·저장·콘솔 출력 금지, 9자리 이상 숫자 경고, 결과 분기, 남은 일수, 초기화 후 포커스). 분기 규칙만 4절 8번대로.
6. **데모 토스트**: 커뮤니티 버튼, 설명회·특강 일정 버튼, 자세한 가이드 버튼. `aria-live="polite"`, 3~4초.
7. **언어 전환 EN / 한국어 / नेपाली(비활성)**: v1 방식(`i18n` 한 곳, `localStorage` 기억, try/catch). 네팔어 버튼은 `disabled` + 옆에 `soon` 텍스트.
8. **고정 바**: 4절 13번 표시·숨김 규칙(IntersectionObserver).
9. **안내띠 닫기**: `sessionStorage`(try/catch), 푸터 컨셉 표기는 항상.
10. **앵커 이동**: 부드러운 스크롤(`prefers-reduced-motion`이면 즉시), 고정 헤더 높이만큼 `scroll-margin-top`.

### 선택 (P2)
- 입국일 입력 → "지금 당신의 단계는 ○○" 추천(사업계획서의 "입국일 기준 단계별 체크리스트" 데모). 저장 없음.
- 체크리스트 카드(1-1, 2-1, 3-2)의 항목을 체크 가능하게(세션 동안만, 저장 없음).
- 다크 모드, 인쇄 시 고정 바·안내띠 숨김.

### partners.html 수정 (메인에서 뺀 내용의 위치)
- 이미 있는 섹션: 협업 구조(`structure`), 역할 구분(`roles`), 협업 흐름(`flow`), 원칙(`principles`), 파트너 가치(`value`), 시범 운영 목표 지표(`pilot`, Target 배지), 함께하기(`together`), 문의(`contact`). → 메인에서 뺀 `how-it-works`·`who-does-what`·`promise`·`partners`·`family` 내용은 이미 여기 있으므로 **새로 옮겨 붙이지 않는다.**
- 바꿀 것 2가지
  1. 헤리티지 스튜디오 B 문구를 사업계획서 기준으로: EN `Brand experience for Stay B: welcome kits, membership cards, goods and social content.` / KO `Stay B 브랜드 경험: 웰컴 키트·멤버십 카드·굿즈·SNS 콘텐츠.` (검토 보고서 A-6 4번 근거: 사업계획서 "헤리티지 스튜디오 B가 Stay 부산의 브랜드 경험(웰컴 키트, 멤버십 카드, SNS)을 만듦")
  2. 맨 위에 학생용 메인으로 돌아가는 링크: `For students → Stay B home / 학생용 페이지로 →` → `index.html`
- 그 외 partners.html 문구는 검토 통과본 그대로.

### 접근성·품질 기준
- 색 대비 WCAG AA, 터치 영역 44×44px 이상, 모든 폼 요소 `<label>`, 오류 `aria-describedby`, 키보드만으로 탭·아코디언·폼·토스트 링크 조작.
- 360 / 768 / 1280px에서 가로 넘침 0, 콘솔 오류 0.
- 사진 없이도 완성된 화면(사진은 받으면 넣는 구조).
- 페이지 무게: 첫 화면 요소 합계 가볍게(네팔 현지 모바일 데이터 고려). 이미지는 받는 경우 WebP + 지연 로딩.

### 하지 않을 것
- 실제 WhatsApp·Viber 링크, 실제 폼 전송 서비스, 분석 도구.
- 가짜 후기·가짜 학생 사진·가짜 제휴 로고·가짜 일정·지어낸 수치. 숫자 카운트업.
- 메인 페이지에 파트너 섹션, 운영 지표, 역할 구분표, 협업 흐름 넣기.
- "대행해 드려요", "비자 받아 드려요", "일자리 소개해 드려요", "결혼 상대" 등 행정 대행·취업 알선·결혼 중개로 읽히는 표현.

---

## 6. 필요한 자료 (대표에게 받을 것)

| # | 자료 | 쓰는 곳 | 없을 때 |
|---|---|---|---|
| 1 | 질문 접수·오프라인 지원(첫 주 지원, 웰컴 키트, 멤버십 카드, 설명회, 특강) 비용 정책 | 오프라인 카드 비용 줄, FAQ 1 | `[자리표시]` |
| 2 | 웰컴 키트 구성품 (헤리티지 스튜디오 B와 정한 것) | `off-kit` 카드 | `[자리표시]` |
| 3 | 웰컴 키트·멤버십 카드 실물 또는 디자인 시안 이미지 (헤리티지 스튜디오 B 사용 허락) | `off-kit` 카드, 오프라인 섹션 대표 이미지 | 이미지 없이 아이콘·도형 |
| 4 | 시범 장소(부산 사무실·모임 장소)와 일정 공개 가능 여부 | 오프라인 장소 줄, FAQ 4, 커뮤니티 모임 줄 | `[자리표시]` |
| 5 | 제휴업체 목록 공개 가능 여부 | `off-discount` 카드 | `[자리표시]` |
| 6 | 시범 대학·어학원 이름 공개 가능 여부 | 폼 학교 옵션 | `[자리표시]` |
| 7 | 숙소 목록 공개 방식(설명회 배포 / 웹 공개) | 카드 1-2 하단 | `[자리표시]` |
| 8 | 저작권 확인된 부산 사진(거리·바다·캠퍼스) 2~4장, 사람 얼굴 없거나 동의 받은 것 | 첫 화면, 오프라인 섹션 | 사진 없이 구성 |
| 9 | 공개용 서비스 연락 이메일(대표 개인 이메일 아님) | 푸터 | `[자리표시]` |
| 10 | 협업 행정사의 정보 카드 감수 가능 범위·일정 | `[확인 필요]` 해소, "자세한 가이드" 오픈 | 칩 유지 |
| 11 | 대표가 직접 쓰거나 고친 문장(있다면) | 저작권 창작 기여 기록 | 검토 단계에서 기록 |

---

## 7. 제작자 전달 메모

### 7-1. 전체 분위기 (웹디자이너용)
- 한 줄 콘셉트: **"부산에 먼저 온 선배가 건네는 정리 노트, 그리고 그 선배를 직접 만날 수 있는 곳."**
- v1이 "믿을 수 있는 기관" 느낌이었다면, v2는 **"쓸모 있는 생활 안내서 + 사람 냄새 나는 오프라인"**. 관공서·법률사무소처럼 보이면 실패, 광고 전단처럼 들떠도 실패.
- 화면의 대부분이 "정보"와 "만남"으로 채워져야 한다. 운영 구조·경계 설명은 한 섹션(`#trust`)만, 차분하게.
- 온라인(정보)과 오프라인(만남)을 시각적으로 구분하되 **이어져 보이게**. 예: 두 영역을 서로 다른 질감·형태로 표현하고, 잇는 선/다리 모양 모티프를 반복. 이 "연결" 모티프가 페이지의 시각적 서명이다.
- 색·폰트는 디자이너가 정한다. 조건만: 네팔어(데바나가리) 글꼴을 나중에 추가할 자리, 본문 16px 이상, 경고색(빨강)은 폼 오류에만.
- 사람 사진을 생성·스톡으로 넣지 않는다(특정 국적 학생 연출 금지). 사람 대신 사물(여권, 교통카드, 웰컴 키트, 지도, 부산 풍경)로 장면을 만든다.
- 브릿지노드 로고는 푸터 "제작: BRIDGENODE" 한 곳에만, 작고 단정하게. Stay B 화면 안에서 브릿지노드 오렌지가 주인공처럼 보이지 않게.

### 7-2. 섹션별 보여야 할 느낌·시각 위계

| 섹션 | 느낌 | 시각 위계 (1이 가장 먼저 보임) |
|---|---|---|
| 안내띠 | 조용한 안내, 경고 아님 | 한 줄, 낮은 대비 |
| 헤더 | 가볍고 얇게, 첫 화면을 가리지 않게 | 1 로고 텍스트 2 언어 전환 3 Ask 버튼(작게) |
| 첫 화면 | "여기 오면 내 단계 정보가 있구나"가 바로 보이는 실용적 환영 | 1 헤드라인 2 단계 버튼 4개(가장 누르고 싶게, 큰 터치 면) 3 온라인↔오프라인 연결 그림 4 서브카피 5 질문 링크 6 신뢰 한 줄 |
| 이렇게 연결돼요 | 한 호흡에 읽히는 띠, 설명 아님 | 1 3칸 아이콘+제목 2 한 줄 설명. 화살표/다리로 이어짐 |
| 정보 허브 | 깔끔한 안내서·노트, 훑어보기 쉬움 | 1 단계 탭(현재 위치 분명히) 2 카드 제목 3 요약 4 핵심 줄 5 출처·준비 중 버튼(가장 약하게). 체크리스트 카드는 체크 아이콘으로 구분. "확인 예정" 칩은 눈에 띄되 불안하지 않게 |
| 단계별 "직접 받을 수 있는 도움" 줄 | 정보에서 만남으로 넘어가는 다리 | 정보 카드보다 따뜻한 톤의 칩, 오프라인 섹션과 같은 시각 언어 |
| 오프라인 (핵심) | 페이지에서 가장 따뜻하고 "사람이 있는" 섹션. 정보 허브와 질감이 확실히 달라야 함 | 1 섹션 제목 2 찾고→만나고→연결 흐름 그림 3 카드 제목 4 언제(단계 라벨) 5 설명 6 비용 자리표시·준비 중 배지. 웰컴 키트·멤버십 카드 카드는 실물 이미지가 들어갈 큰 자리(없으면 도형) |
| 이런 순간에 | 공감, 짧은 이야기 | 1 장면 제목 2 장면 글(조금 큰 본문, 인용부호 쓰지 않음) 3 버튼 2개. 후기 자리표시는 점선으로 "비워 둔 것"이 분명히 |
| 커뮤니티 | 활기, 친근 | 1 제목 2 채널 카드 3개 3 모임 자리표시 4 이용 안내(작게) |
| 질문 남기기 | 차분하고 쉬움, 서류 양식처럼 보이지 않게 | 1 제목 2 데모 배지 3 단계 라디오 카드 4 나머지 입력 5 동의 6 보내기 버튼 |
| 누가 무엇을 돕나요 | 안심. 경고문·약관처럼 보이면 실패 | 1 제목 2 두 칸(같은 무게, 나란히, X·빨강 금지) 3 작은 줄 3개(아이콘) 4 개인정보 한 줄 |
| FAQ | 정돈, 가벼움 | 질문만 보이는 아코디언 |
| 마지막 행동 | 첫 화면의 메아리 | 1 헤드라인 2 단계 버튼 3 보조 링크 |
| 푸터 | 단정, 작은 글씨 | 1 파트너 링크 한 줄 2 법적 고지 3 컨셉·가칭 4 제작: BRIDGENODE |

### 7-3. 웹코더용 메모
- `[자리표시]`·`[확인 필요]`는 문자열을 바꾸지 말고 칩 컴포넌트 하나로 처리(나중에 내용이 오면 칩만 지우면 되게).
- 정보 카드·오프라인 카드는 데이터 배열(JS 객체 또는 JSON 한 곳)로 만들어 렌더링 권장. 감수 후 문구가 자주 바뀌고 네팔어가 추가되기 때문.
- 카드 id 규칙: 정보 `guide-{단계번호}-{카드번호}`, 오프라인 `off-{이름}`(4절 표 그대로).
- partners.html과 `assets/common.js`를 공유하므로 언어 전환·토스트 함수 바꿀 때 partners.html도 같이 확인.
- 옛 주소 `portfolio-site/stay-busan/` 이동 페이지는 그대로 둔다.
- `portfolio.json`의 Stay B 항목 설명은 이번 범위에서 바꾸지 않는다(10절 제안 참고, 대표 승인 후 반영).

---

## 8. 확인 필요 (기획자가 가정한 것)

1. **첫 화면 행동 순서**: 단계 고르기 → 질문 → 커뮤니티로 제안(3-2 근거). 커뮤니티를 2순위로 올릴지 대표 판단.
2. **4단계 구분**: 사업계획서 6단계를 학생이 고르기 쉽게 4단계로 묶었다(입국 전 / 정착 중 = 정착 / 생활·일 = 학업·생활 + 아르바이트·취업 준비 / 비자·졸업 이후 = 비자·체류 + 결혼·장기정착).
3. **헤리티지 스튜디오 B 담당 범위**: 사업계획서("웰컴 키트, 멤버십 카드, SNS")를 근거로 "웰컴 키트·멤버십 카드 디자인"을 헤리티지 스튜디오 B로 표기하고, 학생에게 주는 주체는 Stay B로 두었다. 검토 보고서 A-6 4번을 이 근거로 정리했으니 대표가 맞는지만 확인.
4. **"Designed by Heritage Studio B"** 표기를 학생 화면에 쓰는 것(브랜드 노출 범위).
5. **정착 동행 범위**: 은행·휴대폰은 "함께 가 드릴 수 있어요", 외국인등록은 "예약 방법과 준비물 안내"까지로 썼다. 출입국 방문에 동행까지 할지는 행정사와 법적 경계 확인 후 결정(대행으로 보일 수 있어 지금은 쓰지 않음).
6. **첫 주 지원(공항 픽업 등)**: 사업계획서상 선택형·유료 여부 미정 → 비용 `[자리표시]`. 공항이 인천인지 김해인지 쓰지 않았다.
7. **만료 알림 90·30·7일**: 사업계획서의 자동화 계획을 "plans to / 계획"으로 표기. 실제 운영 시 알림 채널(WhatsApp·Viber)과 동의 문구 필요.
8. **정보 카드 내용**: 일반 공개 정보 수준으로만 썼고, 수치·기한·요건은 모두 `[확인 필요]`. 서비스 공개 전 협업 행정사 감수 필수. 특히 2-1(외국인등록 기한·서류·수수료), 2-3(건강보험 가입 시점), 3-1(시간제취업 허용 시간·제한 업종), 3-2(최저임금), 4-1(연장 신청 시점), 4-2(여권 변경 신고 기한), 4-3(D-10·E-7·지역특화형 비자 요건).
9. **공식 출처 표기**: 기관 이름만 텍스트로 쓰고 링크는 넣지 않았다. 링크를 넣을지, 넣는다면 공식 주소 확인 후(검토자 확인).
10. **앱 이름(네이버 지도, 카카오맵) 언급**: 일반 생활 정보라 넣었다. 특정 기업 홍보로 보이면 "지도 앱"으로 바꾼다.
11. **FAQ 1 "정보는 무료로 볼 수 있다"**: 공개 웹페이지 열람이라 사실로 보고 썼다. 대표 결정 4번(무료 여부 미정)은 질문 접수·오프라인 지원에 적용.
12. **푸터 법적 고지에 "오프라인 정착 지원" 추가**: v1 통과 문구에 서비스 범위만 늘렸다. 검토자 재확인.
13. **v1의 "실제 운영 전 확인" 3건은 그대로 유효**: 직업정보제공사업 신고 여부(일자리 정보), 협업 행정사 자격 종류·출입국 민원 대행기관 등록 여부, 개인정보 제3자 제공 동의 필수 고지 항목.
14. **네팔어 키워드·문구**: 11절의 네팔어는 기획자 초안이며 원어민 확인 필요.

---

## 9. 저작권 기여 기록 메모
- 이번 v2의 방향("주 고객은 유학생, 정보를 얻는 시스템, 한국 정착을 위한 오프라인 플랫폼과 연계")은 대표가 직접 준 피드백에서 나왔다. 대표의 선택·배열 기여로 기록한다.
- 대표가 시안 검토 때 직접 고친 문장은 검토 보고서에 따로 기록한다.

---

## 10. 포트폴리오 카드 문구 제안 (대표 승인 후 `portfolio.json` 반영)
- 한 줄 설명(KO): `부산·경남 유학생이 내 단계에 맞는 정보를 찾고, 설명회·정착 동행·웰컴 키트·모임 같은 오프라인 지원으로 이어지도록 설계한 영어·한국어 정보 허브 컨셉.`
- 한 줄 설명(EN): `A bilingual concept for international students in Busan: find guides for your stage online, then get real support in person.`

---

## 11. 온라인 마케터 검토용 메모

> 지금 시안은 `noindex`(검색 노출 안 함)다. 아래는 사전 공개 페이지로 바꿀 때를 위한 초안이다. 네팔어는 원어민 확인 전 초안.

### 11-1. 타겟 키워드 후보

| 묶음 | 영어 | 한국어 | 네팔어(초안) |
|---|---|---|---|
| 브랜드·지역 | `international students Busan`, `study in Busan`, `Busan student support` | `부산 유학생`, `부산 외국인 유학생`, `부산 유학생 정착` | `बुसान विद्यार्थी`, `बुसानमा पढाइ` |
| 네팔 학생 | `Nepali students in Korea`, `Nepali students Busan`, `study in Korea from Nepal` | `네팔 유학생`, `네팔 유학생 부산` | `कोरियामा नेपाली विद्यार्थी`, `नेपालबाट कोरिया अध्ययन` |
| 입국 전 | `Korea student visa checklist`, `what to bring to Korea for study` | `한국 유학 준비물` | `कोरिया विद्यार्थी भिसा`, `कोरिया जाँदा के लैजाने` |
| 정착 | `alien registration card Busan`, `ARC Korea checklist`, `open bank account Korea foreigner`, `health insurance international students Korea` | `외국인등록 준비물`, `외국인 은행 계좌 개설`, `유학생 건강보험` | `एलियन रजिस्ट्रेसन कार्ड कोरिया`, `कोरियामा बैंक खाता` |
| 생활·일 | `part-time job rules international students Korea`, `D-2 visa part-time work`, `Busan student discount` | `유학생 시간제취업`, `유학생 아르바이트 규칙`, `부산 유학생 할인` | `कोरियामा पार्ट टाइम काम` |
| 비자·졸업 | `D-2 visa extension Busan`, `stay in Korea after graduation`, `job seeking visa Korea` | `유학생 체류기간 연장`, `유학생 졸업 후 비자` | `कोरिया भिसा नवीकरण` |
| 커뮤니티·오프라인 | `Nepali community Busan`, `international student meetup Busan` | `부산 유학생 커뮤니티`, `부산 외국인 모임` | `बुसान नेपाली समुदाय` |

- 메모: 비자 관련 키워드로 유입된 학생이 "비자를 대신 받아 준다"고 오해하지 않게, 해당 키워드용 글은 정보 카드(일반 정보) + "행정사 연결" 구조로만 만든다.

### 11-2. 공유 미리보기 문구 초안 (메신저·SNS)
- OG 제목(EN): `Stay B: student life in Busan, made simple`
- OG 설명(EN): `Guides for every stage, from packing to graduation, plus real help in Busan: info sessions, first-week support, discounts and meetups.`
- OG 제목(KO): `Stay B: 부산 유학생활, 쉽게`
- OG 설명(KO): `입국 준비부터 졸업까지 단계별 정보, 그리고 부산에서 직접 받는 도움: 설명회, 첫 주 지원, 할인, 모임.`
- WhatsApp·Viber 공유용 한 줄(EN): `New in Busan? Find what you need for your stage, and meet people who can help.`
- 네팔어 한 줄(초안): `बुसानमा नयाँ हुनुहुन्छ? आफ्नो चरणका लागि चाहिने जानकारी यहाँ पाउनुहोस्।`
- 컨셉 시안 단계에서는 OG 설명 끝에 `(Concept demo)` / `(컨셉 시안)`을 붙인다.
