# Stay B v2: 유학생 UX 동선 점검 (기획자, 2026-11-14)

- 대상: 공개된 v2 `portfolio-site/stay-b/` (= `work/builds/stayb-v2/`, 파일 차이 없음 확인)
- 기준: 기획안 `work/planning/20261114-stayb-homepage-v2.md`(대표 결정 1~12), 마케터 `work/marketing/20261114-stayb-brand-and-promo.md`
- 방법: 로컬 서버 + Playwright(Chromium), **모바일 390×844 터치**(isMobile, hasTouch), 영어 기본(학생 기준). 비교용으로 360×640, 한국어 첫 화면 1회. 손가락 스크롤은 "목표가 화면 위쪽 120px에 오도록 스크롤한 거리"로 재고 844px = 1화면으로 환산.
- 스크린샷: `work/planning/stayb-ux-shots/` (파일명은 표에 적음)
- 콘솔 오류 0, 모든 동선에서 JS 오류 없음.

## 한 줄 결론

**네 명 모두 "내 단계 정보"까지는 탭 2번, 스크롤 없이 도착한다(첫 화면이 아주 잘 작동).** 막히는 곳은 정보를 읽은 **다음 행동**이다. ① 설명회·특강 "일정 받기"가 토스트로 끝나 연락을 남길 길이 없고 ② 생활·일 단계에는 "질문하기" 칩이 없으며 ③ 고정 바·첫 화면의 질문 링크는 이미 고른 단계를 폼에 넘기지 않고 ④ 만료일 도구에 넣은 날짜를 폼에서 다시 입력해야 한다. 모두 화면 구조를 바꾸지 않고 링크·속성·짧은 문구로 고칠 수 있다.

---

## 1. 첫 화면 사실 확인 (390×844)

| 항목 | 측정 | 판정 |
|---|---|---|
| 안내띠 + 헤더 | 0–126px (안내띠 69 + 헤더 57) | 괜찮음 |
| `Free to read · Free to ask` 칩 | 372–400px | 보임 |
| 단계 버튼 4개 (2×2) | 410–686px, 설명 줄까지 보임 | **스크롤 없이 4개 모두 보임** |
| `Can't find your answer? Ask us` | 690–734px (한국어 666–710px) | 보임 |
| 360×640 작은 폰 | 질문 링크 하단 634px | 보임(설명 줄 숨김 처리 정상) |
| 페이지 전체 길이 | 14,928px ≈ **17.7화면** | 길다. 그래서 "중간에서 바로 가는 링크"가 중요 |
| 섹션 시작 위치 | 정보 1,650 · 오프라인 2,955(길이 3,557) · 장면 6,512 · 커뮤니티 8,288 · 질문 9,331 · 안심 11,498 · FAQ 12,955 · 마지막 13,526 | 오프라인 섹션이 4.2화면으로 가장 김 |
| 질문 폼 높이 | 1,721px ≈ 2화면 (항목 11개, 필수 5개) | 길다(권장 개선) |

스크린샷: `00-hero-390.png`, `00-hero-390-ko.png`, `x-04-hero-360x640.png`

---

## 2. 페르소나별 동선 표

> 탭 = 손가락으로 누른 횟수, 입력 = 글자 입력칸 수, 스크롤 = 손으로 넘긴 화면 수(링크 점프는 제외).

### 요약

| 페르소나 | 진입 → 목적 | 탭 / 입력 / 스크롤 | 막힘·헷갈림 | 결과 |
|---|---|---|---|---|
| ① 입국 전 네팔 학생 (카트만두, 입학 확정, 영어 중급) | 첫 화면 → "뭘 챙기지?" + "설명회 언제 해?" | 준비물까지 **2탭/0/0** · 설명회 일정까지 **5탭/0/0.9화면** · 대안(폼 찾기) **+7화면** | `Get session dates` 누르면 "Demo: dates will be shared when the service starts." 토스트로 끝남. 연락처 남길 곳 없음. 폼 주제에 "설명회" 선택지 없음. 학교 기본값이 "Partner university"로 미리 선택돼 있어 입국 전 학생이 그대로 보내기 쉬움 | **준비물 성공 / 일정 받기 실패(막다른 길)** |
| ② 입국 첫 주 (부산 도착 이틀째) | 첫 화면 → 외국인등록 준비물 + 은행·폰 순서 + "같이 가 줄 수 있어?" | **8탭/3/2.1화면** | 막힘 없음. 정착 도움 카드 → `Ask about settling-in help`가 폼으로 바로 점프하고 단계(Just arrived)·주제(첫 주·정착 도움)까지 자동 선택. 날짜 입력칸이 하단 고정 바 뒤에 숨는 순간 있음(아래 ④와 같은 문제) | **성공**(결과: "Guides first" 안내) |
| ③ 첫 아르바이트 앞둔 학생 (식당에서 "내일부터 나와") | 첫 화면 → 규칙 확인 + "이 일 해도 돼?" 질문 | 규칙까지 **2탭/0/0** · 질문 폼까지 **4탭/0/2.2화면** | 생활·일 단계의 "직접 받을 수 있는 도움" 줄이 할인·모임·특강 3개뿐, **질문하기 칩 없음**. 고정 바 `Ask us`로 가면 단계·주제가 **비어 있음**(고정 바에 "Study, life & work"가 떠 있는데도). 자동 선택되는 경로(장면 카드 2번)는 첫 화면에서 **8.2화면** 아래 | **성공하지만 우회**(단계·주제 직접 다시 고름) |
| ④ 비자 만료·졸업 앞둔 학생 (만료 50일 전, 2월 졸업) | 첫 화면 → 남은 날 계산 + 졸업 후 길 + 행정사 질문 | **8탭/5/2.9화면** | 만료일 도구 결과 "50 days left · Start preparing now" 다음 **행동 버튼 없음**. 도구에 넣은 날짜가 폼으로 **안 넘어가** 다시 입력. 도구 입력칸이 하단 고정 바에 가려진 채로 스크롤이 멈춤(`p4-03`) | **성공**(결과: "Partner agent" 분기, 50일 표시) |

### 단계별 기록

**① 입국 전 네팔 학생**
| # | 행동 | 화면 반응 | 스크린샷 |
|---|---|---|---|
| 1 | `नेपाली` 버튼 확인 | 비활성 + soon. 영어로 읽기 시작(예상대로) | `00-hero-390.png` |
| 2 | 탭 `1 Before I arrive` | 정보 허브로 1,817px 점프, 탭 "Before I arrive" 선택, 고정 바 "My stage · Before I arrive" | `p1-01-after-stage-tap.png` |
| 3 | 탭 1-1 `Key points` | 서류 5개 목록 펼침 → **목적 A 달성(2탭)** | `p1-02-card11-open.png` |
| 4 | 탭 `Full guide · coming soon` | 토스트 "being checked… Ask us" 4초 후 사라짐 | `p1-03-guide-soon-toast.png` |
| 5–6 | 1-2 숙소, 1-3 첫날 펼침 | 정상 | – |
| 7 | 스크롤 0.9화면 | "Help in person for this stage" 줄 | `p1-04-help-row.png` |
| 8 | 탭 `Pre-arrival info session` | 오프라인 카드로 점프. "For students already admitted…" 대상 줄 보임 | `p1-05-off-session.png` |
| 9 | 탭 `Get session dates` | 토스트 "Demo: dates will be shared when the service starts." → **어떻게 받는지 모름, 남길 곳 없음** | `p1-06-dates-toast.png` |
| 10 | 질문 폼까지 스크롤 | **7화면**. 주제 선택지에 설명회 없음 | – |

**② 입국 첫 주**
| # | 행동 | 화면 반응 | 스크린샷 |
|---|---|---|---|
| 1 | 탭 `2 Just arrived` | 정착 탭, 카드 2-1부터 | `p2-01-after-stage-tap.png` |
| 2 | 2-1 펼침 | 준비물 4줄, "to be confirmed" 칩 5개 | `p2-02-card21-open.png` |
| 3 | 2-2 펼침 | 순서 1→4 번호 목록, 고정 탭 바가 위에 붙어 있음(좋음) | `p2-03-card22-open.png` |
| 4 | 스크롤 1.4화면 → 탭 `Settling-in help` | 정착 동행 카드 | `p2-04-off-settle.png` |
| 5 | 탭 `Ask about settling-in help` | 폼으로 점프, 단계 settle·주제 firstweek 자동 | `x-05-ask-landing.png`(착지 위치 동일) |
| 6–10 | 이름·질문·WhatsApp·연락처·동의 | 제출 버튼 위에 고정 바 없음(폼 안에선 숨김, 좋음) | `p2-06-form-filled.png` |
| 11 | `Send my question` | 결과로 올라가 포커스, "Guides first" | `p2-07-result.png` |

**③ 첫 아르바이트**
| # | 행동 | 화면 반응 | 스크린샷 |
|---|---|---|---|
| 1 | 탭 `3 Study, life & work` | 생활 탭 | `p3-01-after-stage-tap.png` |
| 2 | 3-1 펼침 | "You need permission before your first day of work." → 핵심 답 얻음 | `p3-02-card31-open.png` |
| 3 | 3-2 펼침 | 체크리스트 5개 | `p3-03-card32-open.png` |
| 4 | 스크롤 1.6화면 | 도움 줄: Member discounts · Meetups · Career talks — **질문 칩 없음** | `p3-04-help-row-no-ask.png` |
| 5 | 고정 바 `Ask us` | 폼 도착, **단계·주제 비어 있음** | – |
| 비교 | 처음부터 장면 카드 2번 `Ask us` | 8.2화면 스크롤, 대신 단계 life·주제 work 자동 | `p3-06-moment2.png` |

**④ 비자 만료·졸업**
| # | 행동 | 화면 반응 | 스크린샷 |
|---|---|---|---|
| 1 | 탭 `4 Visa & after graduation` | 비자 탭, 탭 줄이 오른쪽 끝까지 자동 스크롤(좋음) | `p4-01-after-stage-tap.png` |
| 2 | 4-1 펼침 → 날짜 입력 | "50 days left · Start preparing now". **입력칸이 고정 바 뒤에** 걸림 | `p4-02-card41-open.png`, `p4-03-expiry-tool.png` |
| 3–4 | 4-2, 4-3 펼침 | 졸업 후 길 3가지 + "행정사가 판단" 문장 | `p4-04-card43-open.png` |
| 5 | 스크롤 1.2화면 → 칩 `Ask us` | 폼, 단계 visa·주제 visa 자동, **만료일은 빈칸** | – |
| 6–11 | 이름·만료일(재입력)·질문·Viber·연락처·동의 → 제출 | "Partner agent" + "3 Jan 2027, 50 days" | `p4-06-result.png` |
| 12 | 브라우저 뒤로 | `#guides-visa`로 돌아감(정상) | – |

---

## 3. 문제 목록 (우선순위)

| ID | 우선 | 어디서 | 문제 | 개선안 |
|---|---|---|---|---|
| U-1 | **높음** | `#off-session` `Get session dates`, `#off-career` `Get talk dates` (①④) | 버튼이 토스트만 띄움. "서비스 시작 때 안내"라는데 어떻게 받는지 없음 → 입국 전 학생의 핵심 행동이 막다른 길 | 버튼을 질문 폼 링크로 바꾸고 단계·주제 자동 선택. 폼 주제에 `Session or talk dates / 설명회·특강 일정` 추가. 결과 화면에 일정 안내 문장 1줄(대표 결정 7 "협의 후 공개" 유지) |
| U-2 | **높음** | 정보 허브 `#guides-life` 도움 줄 (③) | 아르바이트 질문은 행정사 연결(B 분기) 대상인데 이 단계에만 질문 칩이 없음. 비자 단계엔 있음 | 4단계 모두 도움 줄 마지막에 질문 칩. 생활·일은 `Ask about part-time work / 아르바이트 질문하기`(주제 work) |
| U-3 | **높음** | 하단 고정 바 `Ask us`, 첫 화면 `Can't find your answer? Ask us` (③) | 단계를 이미 골라 고정 바에 이름까지 떠 있는데 폼에서 다시 골라야 함 | 기억된 단계(`savedStage`)가 있으면 두 링크에 `data-ask-stage`를 넣어 자동 선택 |
| U-4 | 중간 | 카드 4-1 만료일 도구 (④) | "Start preparing now" 다음 행동 없음. 날짜를 폼에서 다시 입력 | 결과 아래 링크 `Ask about my dates / 내 만료일로 질문하기 →`: 폼으로 이동 + 단계 visa·주제 visa + 도구 날짜를 `#f-expiry`에 복사 |
| U-5 | 중간 | 모바일 전체, 특히 카드 안 입력칸 (②④) | 하단 고정 바(약 65px)가 화면 아래 입력칸·버튼을 가림. 고정 바는 첫 화면·질문·마지막 섹션에서만 숨음 | 모바일에서 `html{scroll-padding-bottom}`을 고정 바 높이만큼, 그리고 입력칸에 포커스가 있을 때 고정 바 숨김 |
| U-6 | 중간 | 폼 `#f-school` (①) | 첫 옵션 `Partner university (to be announced)`가 기본 선택 → 입국 전 학생이 그대로 보내면 틀린 정보 | 맨 앞에 `Choose / 선택`(value "") 추가, 기본 선택 |
| U-7 | 중간 | 질문 폼 길이 (②④) | 1,721px, 11칸. 필수 5칸인데 선택 칸이 사이사이에 있어 2화면을 내려야 제출 | 학교·국적·원하는 언어를 `More about me (optional) / 나에 대해 더 알려 주기(선택)` 접힘 묶음으로. 주제·만료일은 밖에 둠(자동 선택·이어받기 대상) |
| U-8 | 낮음 | 단계 탭 착지 위치 (전원) | 단계 버튼을 누르면 첫 카드가 192px에 놓여 위쪽 약 135px에 이전 안내 문단이 걸침(`scroll-margin-top`과 `scroll-padding-top`이 겹쳐 더해짐). 탭 줄이 아직 붙지 않은 상태로 보임 | 모바일에서 `[id^="guides-"]`·`[id^="guide-"]`의 `scroll-margin-top`을 탭 줄 높이 기준(약 64px)으로, 겹치는 `scroll-padding-top`과 합이 header+탭줄+8px이 되게 |
| U-9 | 낮음 | `Full guide · coming soon` 토스트 (전원) | 토스트 안 `Ask us` 링크가 4초 뒤 사라져 누르기 전에 없어짐(글 읽는 데 4초 부족) | 링크가 있는 토스트는 8초 |
| U-10 | 낮음 | 오프라인 카드 `off-kit`, `off-discount` | 행동 버튼 없음(다른 카드엔 다 있음) | 할인 카드에 `See the community / 커뮤니티 보기`(`#community`). 키트는 구성 자료 대기라 그대로 |

> 잘 된 점(바꾸지 말 것): 첫 화면 단계 버튼 4개가 390×844·360×640 모두 스크롤 없이 보임 / 단계 버튼 한 번에 정보 탭으로 이동 + 고정 바에 내 단계 표시 / 오프라인 카드·장면 카드 → 폼 자동 선택 / 제출 후 결과로 포커스 이동 / 뒤로 가기 정상 / 법적 경계 문구(대상 한정·대행 안 함)가 동선 중에 자연스럽게 보임.

---

## 4. 웹코더 수정 목록

> 대표 결정 1~12 위반 없음 확인: 이름·장소·일정·가격을 새로 쓰지 않는다(7·8), 무료 표기 그대로(4), 첫 화면 행동 순서 그대로(5), 심볼은 디자이너 명세 A안(9, 대표 확정), noindex·안내띠 그대로(3·12).

### 필수 (7건)

**M-1. Stay B 심볼 A안(누운 B)으로 교체** — 근거 `work/design/stayb-v2/design-spec.md` 3절
- `index.html`, `partners.html`의 `<symbol id="i-mark">`를 A안 컬러로 교체(viewBox `0 0 32 32`, clipPath id는 `sb-clip-mark`처럼 겹치지 않게). 헤더(28px)·안심 섹션 제목 아이콘(24px)이 같이 바뀐다.
- 푸터는 A안 **단색·반전(mask)** 버전을 별도 `<symbol id="i-mark-mono">`로 두고 푸터 `<use>`만 이걸로(mask id `sb-mask-footer`).
- 파비콘: 두 페이지의 `<link rel="icon">` data URI를 A안으로. 추가로 `favicon.svg` + `favicon-32.png` 파일 생성, `<link rel="icon" type="image/svg+xml" href="favicon.svg">` + PNG 대체.
- `og-image.png`, `thumb.png` 안 옛 심볼도 A안으로 다시 생성(문구·배치는 그대로).
- 확인: 16px에서 B의 구멍 2개가 보이는지, 다크 모드에서도 컬러 심볼 그대로인지.

**M-2. "일정 받기" 버튼을 질문 폼으로 연결 (U-1)**
- `#off-session` 버튼: `<button data-toast="dates">` → `<a class="btn btn-warm" href="#ask" data-ask-stage="arrive" data-ask-topic="dates">`, 문구 그대로 `Get session dates / 설명회 일정 받기`.
- `#off-career` 버튼: 같은 방식, `data-ask-stage="life" data-ask-topic="dates"`, 문구 그대로 `Get talk dates / 특강 일정 받기`.
- `#f-topic`에 옵션 추가(“First-week…” 다음): `<option value="dates">Session or talk dates / 설명회·특강 일정</option>`
- `home.js` 결과(A 분기)에서 `topic === "dates"`일 때 안내 문장 대신:
  - EN `In the live service, we would send you the dates on the channel you chose, once places and dates are set after partner talks.`
  - KO `실제 서비스에서는 장소·일정이 협의 후 정해지면, 고른 채널로 일정을 보내 드려요.`
- `common.js`의 `toastDates`는 다른 곳에서 안 쓰이면 지워도 됨.

**M-3. 모든 단계 도움 줄에 질문 칩 (U-2)** — `assets/guides-data.js` `help` 배열 마지막에 추가
- arrive: `{ href:"#ask", en:"Ask us", ko:"질문하기", ask:{ stage:"arrive", topic:"" } }`
- settle: `{ href:"#ask", en:"Ask us", ko:"질문하기", ask:{ stage:"settle", topic:"" } }`
- life: `{ href:"#ask", en:"Ask about part-time work", ko:"아르바이트 질문하기", ask:{ stage:"life", topic:"work" } }`
- visa: 기존 칩 유지.
- `home.js` 칩 생성부: `topic`이 빈 문자열이면 `data-ask-topic` 속성을 생략(현재 클릭 처리부는 빈 값이면 주제를 건드리지 않으므로 동작은 같음, 마크업 정리용).
- 도움 줄 제목 `Help in person for this stage`는 질문 칩이 섞여도 그대로 둔다(아이콘이 말풍선이라 구분됨).

**M-4. 고정 바·첫 화면 질문 링크가 내 단계를 넘김 (U-3)**
- `home.js` `syncSticky()`에서 `savedStage`가 있으면 고정 바 `a[href="#ask"]`와 `.hero-ask`에 `data-ask-stage=savedStage` 설정, 없으면 속성 제거. 주제는 넣지 않는다.

**M-5. 만료일 도구 → 폼 이어받기 (U-4)**
- `toolHTML()`의 `#tool-hint` 바로 위에 링크 추가: `<a class="link" href="#ask" id="tool-ask" data-ask-stage="visa" data-ask-topic="visa">Ask about my dates →</a>` / KO `내 만료일로 질문하기 →` (EN·KO 병기는 기존 `pair()` 방식).
- 미리 선택 클릭 처리부(`[data-ask-stage]`)에서 클릭한 요소가 `#tool-ask`이고 `#tool-date`에 값이 있으면 `#f-expiry`에 같은 값을 넣는다. 저장은 하지 않음(데모 원칙 유지, `Nothing you enter is saved.` 문구 그대로 참).

**M-6. 하단 고정 바가 입력칸을 가리지 않게 (U-5)**
- `site.css` 모바일(<960px): `html{scroll-padding-bottom:calc(80px + env(safe-area-inset-bottom))}`.
- `home.js`: `focusin`이 `input, select, textarea`이면 고정 바 숨김, `focusout` 후 원래 규칙(`updSticky`)으로 복귀.
- 확인: 390×844에서 카드 4-1 날짜칸에 포커스했을 때 칸 하단이 고정 바 위에 있을 것.

**M-7. 학교 선택 기본값 비우기 (U-6)**
- `#f-school` 맨 앞에 `<option value="" selected>Choose / 선택</option>`. 선택 항목이므로 검증 없음.

### 권장 (4건)

- **R-1 (U-7) 폼 선택 항목 접기**: 학교·국적·원하는 언어를 `<details class="more-fields"><summary>More about me (optional) / 나에 대해 더 알려 주기(선택)</summary>…</details>`로 묶어 이름 → 단계 → 주제 → 만료일 → 질문 → 회신 방법 → 연락처 → 동의 → 보내기 순서. 데스크톱은 펼친 상태. 목표: 모바일 폼 높이 1,721 → 약 1,250px.
- **R-2 (U-8) 단계 착지 위치**: 단계 버튼·도움 칩 점프 뒤 첫 카드 상단이 `헤더 + 탭 줄 + 8px`(390폭 기준 약 122px)에 오게 `scroll-margin-top` 조정. 탭 줄이 붙은 상태로 보여야 함.
- **R-3 (U-9)**: 링크가 들어 있는 토스트(`toastGuide`)는 8초 유지.
- **R-4 (U-10)**: `#off-discount` 하단에 `<a class="btn btn-warm" href="#community">See the community / 커뮤니티 보기</a>`.

### 반영 후 확인 (웹코더 자체 테스트)
1. 390×844에서 4개 동선 재실행: ① 설명회 버튼 → 폼(arrive·dates) ② 정착 카드 → 폼(settle·firstweek) ③ 생활 탭 질문 칩 → 폼(life·work), 고정 바 Ask → 폼(life) ④ 도구 날짜 → 폼 만료일 채워짐.
2. 360/400/1280 × EN/KO × 라이트/다크: 가로 넘침 0, 콘솔 오류 0.
3. 심볼 16·24·28px 판독, 파비콘 탭 표시.
4. 결과 화면 "dates" 문장에 장소·일정·이름이 들어가지 않았는지(대표 결정 7).

---

## 5. 스스로 정한 가정
- 학생은 영어로 먼저 본다고 보고 EN으로 동선을 돌렸다(네팔어 비활성). 한국어는 첫 화면만 비교.
- 페르소나의 "목적 달성"은 데모 기준: 정보를 읽거나, 질문 폼을 제출해 결과 화면을 보면 성공.
- 기획안 4절에서 "일정 받기 → 데모 토스트"로 정한 것은 내가(기획자) 바꾸는 것이다. 폼은 여전히 아무것도 보내지 않으므로 "데모" 성격은 그대로.
- 새 주제 옵션·결과 문장·링크 문구는 기획자가 썼다(마케터 톤: 짧고 쉬운 영어).

## 6. 대표 결정 필요
- 없음(심볼은 A안 확정 지시에 따름. 일정·장소 공개는 기존 대기 항목 그대로).
