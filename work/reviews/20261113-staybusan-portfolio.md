# 검토 보고서: Stay 부산(가칭) 기획안 · 컨셉 시안 · 포트폴리오 갤러리

- 검토일: 2026-11-13
- 검토자: reviewer
- 대상
  - 기획안 `work/planning/20261113-staybusan-homepage.md`
  - 원천 자료 `work/planning/source/staybusan-partner-deck-20261113.txt`
  - 시안 `portfolio-site/stay-busan/index.html`, `thumb.png`
  - 갤러리·피드 `portfolio-site/index.html`, `portfolio.json`, `README.md`, `_headers`
  - 참고: `work/builds/staybusan-concept/README.md`, `CLAUDE.md`(포트폴리오 사이트 절, 커밋 fa22c46)
- 확인 방법: 파일 정독, 원천 자료와 문장 단위 대조, 로컬 서버 + Playwright(360/768/1280px, EN/KO 전환, 폼 제출 흐름, 모달, 토스트, 하단 고정 바, 앵커, 콘솔 오류, 네트워크 요청, 저장소 사용), GitHub 저장소 공개 여부 확인
- 법적 판단은 법률 자문이 아니다. 아래 "위험"은 오해될 소지를 표시한 것이며, 실제 서비스 공개 전에는 협업 행정사 또는 변호사 감수가 필요하다.

---

## 판정: 보류

**대표 판단이 필요한 쟁점(한 문장):** 대표 승인 전인데도 시안과 피드 항목이 이미 공개 상태일 가능성이 높고(배포 브랜치에 푸시됨 + Render 자동 배포 + GitHub 저장소 공개), 공개 저장소에는 행정사 협업 제안 자료(수익모델·협업 대가 구조)까지 올라가 있으므로, "지금 내릴지 / 저장소를 비공개로 돌릴지"를 대표가 정해야 한다.

쟁점과 별개로, 대표에게 올리기 전 제작자·기획자가 고칠 항목이 아래에 있다(필수 9건, 권장 11건). 필수 수정이 끝나면 다시 검토한다.

---

## 1. 대표 판단 필요 (보류 사유)

### 1-1. 승인 전 공개 (프로세스 위반 소지) — 긴급
- `CLAUDE.md` 포트폴리오 절: "이 브랜치의 `portfolio-site/` 폴더가 그대로 배포된다. 푸시하면 자동 배포", "대표 승인(done) 후에만 피드에 넣는다."
- 그런데 `portfolio-site/portfolio.json`에 `stay-busan` 항목이 이미 들어 있고, 커밋 fe41892·fa22c46이 `origin/ccr-43ae7ad4-yf895e`에 푸시되어 있다. Render가 이 브랜치를 보고 있다면 시안과 피드가 이미 공개됐다(이 세션에서는 onrender.com 접속이 막혀 실제 노출은 확인 못 함).
- 본 홈페이지에 피드 연결 지시문(`work/planning/chatgpt-site-portfolio-feed-prompt.md`)을 이미 붙여 넣었다면 본 홈페이지에도 카드가 떠 있다.
- 규칙서 "외부로 나가는 일(게시)은 대표 승인 없이 하지 않는다"와 충돌한다.
- 대표가 정할 것: (a) 승인 전까지 `portfolio.json`의 `items`를 비우고 `stay-busan/` 폴더를 배포 루트 밖으로 옮길지, (b) 현 상태를 사후 승인할지.
- 참고: 이 검토 보고서를 푸시해도 Render가 다시 배포된다(보고서는 `portfolio-site/` 밖이라 공개 페이지 내용은 바뀌지 않음).

### 1-2. GitHub 저장소가 공개(public) 상태
- `gh api repos/calmgrou7/Brief` 결과 `"private": false`. 저장소 전체가 누구에게나 보인다.
- 노출되는 것: 원천 자료(행정사 협업 제안서: 수익원 우선순위, 협업 대가 방식, 시범 운영 계획, 연계 브랜드), 기획안의 "확인 필요" 내부 메모, `CLAUDE.md`(현황판 주소, Render 서비스 정보, 운영 방식), 직원 정의 파일, 검토 보고서.
- 대표 개인정보(이메일·계좌·전화)는 저장소에서 발견되지 않았다(정규식 검사).
- 특히 원천 자료 9쪽의 "월 고정 광고비·플랫폼 이용료" 협업 대가 구조는 법적 검토 전 안이라 외부에 보이면 오해 소지가 있다.
- 대표가 정할 것: 저장소 비공개 전환 여부(Render 연결은 비공개 저장소에서도 유지 가능, 연결 권한만 확인).

### 1-3. 연계 브랜드 실명 노출 (기획안 8-4에서 이미 제기)
- 시안 `#family` 섹션과 `portfolio.json`을 통해 "Heritage Studio B / 헤리티지 스튜디오 B", "NOWRO Korea"가 "Planned / 연결 예정"으로 공개된다. 원천 자료에 있는 이름이라 지어낸 것은 아니지만, 대표 소유 브랜드인지·상대 동의가 있는지 확인되지 않았다.
- 대표가 정할 것: 실명 유지 / `[자리표시]` 처리 / 섹션 삭제.

---

## 2. 사실 대조 결과

| 항목 | 원천 자료 | 시안 | 판단 |
|---|---|---|---|
| 시범 지표 24h · 80% · 50% · 4.0/5 | 10쪽 | `#promise` 4개 카드 모두 `Target / 목표` 배지, "not results yet" 설명, 카운트업 없음 | 적합 |
| 시범 범위 "네팔 어학원 1곳 + 부산·경남 대학권 1곳, 1학기" | 10쪽 | `#partners` 설명 | 적합 |
| 문의 채널 웹 폼 · WhatsApp · Viber | 7쪽 | 히어로, 협업 흐름 | 적합 |
| 역할 구분표 6행 | 8쪽 | `#who-does-what` | 적합(문구 학생 눈높이로 순화) |
| 결혼 = 매칭·중개 아님 | 5쪽 | 여정 6단계 주석, FAQ 6, 푸터 | 적합 |
| 일자리 알선은 등록 기관 | 6쪽 | 여정 4단계 주석, FAQ 4, 푸터 | 적합 |
| 수임료 분배 안 함 | 9쪽 | 파트너 카드 3 | 적합 |
| 연계 브랜드 2개 | 4쪽 | `#family` | 이름은 자료와 일치(노출 허락은 1-3) |
| **"English and Korean now, Nepali coming soon"** | **자료에 지원 언어 언급 없음** | 히어로 신뢰 문구, FAQ 7, 폼 언어 선택 | **근거 없음 → 수정 필수 F-2** |
| 여정 단계별 "행정사 연계" 배지 위치(2·4·5·6단계) | 5쪽 텍스트 추출본에서 4개 배지의 열 위치가 깨져 확정 불가 | 2·4·5·6단계 | 원본 슬라이드로 위치 확인 필요(권장 R-1) |
| 학교명·어학원명·행정사명·연락처·후기·제휴 로고 | 없음 | 모두 `[자리표시]` 또는 미표시 | 적합(지어낸 것 없음) |
| 문제 카드 4 "Many students leave Korea…" | "비자 경로를 몰라 졸업과 함께 출국"(어려움 서술, 수치 없음) | "Many students" | 수치 근거 없는 일반화. 권장 R-2 |

---

## 3. 법적 경계 검토 (법률 자문 아님, 리스크 표시)

전반 평가: 경계 안내 상자, 역할 구분표, FAQ 1·3, 폼 하단 문구, 푸터 법적 고지가 일관되게 "개별 판단·서류 대행·수임료는 하지 않는다"를 말하고 있어 구조는 잘 잡혀 있다. 다만 **"We help with / 저희가 돕는 일" 제목 아래 출입국 절차 항목이 나열된 곳**과 **"허가 가능 공고"** 표현이 그 경계를 스스로 흐린다.

| # | 위치 | 현재 문구 | 위험 관점 | 등급 |
|---|---|---|---|---|
| L-1 | 여정 6단계 목록 (index.html 571–572행) | 제목 "We help with / 저희가 돕는 일" 아래 `Status steps after marriage` · `Inviting family` / `결혼 후 체류 절차` · `가족 초청` | 플랫폼이 체류자격 변경·가족 초청 절차를 직접 돕는(대행하는) 것으로 읽힘. 행정사법상 행정기관 제출 서류 작성·신청 대리는 행정사 업무 | 높음 |
| L-2 | 여정 6단계 주석 (574행) | EN `who need help with the stay procedures that follow` / KO `체류자격 변경·가족 초청 절차를 돕는 단계입니다` | 위와 같음. "절차를 돕는"이 대행으로 읽힘 | 높음 |
| L-3 | 여정 4단계 목록 (558–559행), FAQ 4 (796행) | `Job posts you are allowed to apply for` / `허가 가능 공고`, `지원 가능한 공고 정보를 공유합니다` | (1) "you are allowed"는 학생 개인의 체류자격상 취업 가능 여부를 플랫폼이 판단해 주는 것으로 읽힘(개별 판단). (2) 구인 공고를 모아 보여 주는 것 자체가 직업안정법상 직업정보제공사업(신고 대상)에 해당할 수 있음. 시안 문구는 고치고, 실제 운영 전 신고 필요성 검토를 기획안 "확인 필요"에 추가 | 높음 |
| L-4 | 여정 5단계 목록 (565–566행) | `Document checklists` / `서류 체크리스트` (저희가 돕는 일) | 일반 체크리스트는 허용 범위로 보이나 "돕는 일" 제목과 합쳐지면 서류 준비 대행으로 읽힐 여지 | 중간 |
| L-5 | 파트너 카드 3 (818행) | EN `Receive consultations with basic documents and facts already organised` / KO `기본 서류와 사실관계가 정리된 상담 건을 받으세요` | 플랫폼이 서류를 정리·사실관계를 조사하는 것으로 읽힘(행정사 업무인 서류 작성·사실 확인과 경계). 원천 자료 문구 그대로지만 공개 페이지에서는 순화 필요 | 중간 |
| L-6 | 협업 흐름 2단계 (589행) | `Visa and stay questions go to a partner administrative agent.` / `체류 관련 질문은 협업 행정사에게 넘깁니다.` | 학생 동의 없이 자동으로 사건을 넘기는 것처럼 읽힘(개인정보 제3자 제공 + 사건 소개). 동의 전제 표기 필요 | 중간 |
| L-7 | 협업 흐름 5단계 (592행) | `You get automatic updates as your case moves forward.` | 플랫폼이 사건 진행에 관여하는 인상. 담당이 "Together"라 수용 가능하나, "행정사가 공유한 진행 상황을 알림"으로 주체를 밝히면 안전 | 낮음 |
| L-8 | FAQ 6 (800행) | `we can guide you through the general steps` | "guide you through"는 절차 동행(대행)으로 읽힐 여지 | 낮음 |
| L-9 | 히어로·폼·FAQ 전반 | `qualified partner administrative agent` / `자격을 갖춘 협업 행정사` | 출입국 민원 대행은 별도 대행기관 등록 제도가 있고, 법제처 해석상 외국어번역행정사는 출입국 신청서류 작성은 할 수 없다. 시안 문구는 그대로 두되, 실제 협업 행정사의 자격 종류·대행기관 등록 여부를 실제 운영 전 확인 항목으로 기획안에 추가 | 운영 전 확인 |
| L-10 | 상담 폼 동의문 (722행) | 제3자 제공 동의 한 문장 | 데모로는 충분. 실제 운영 시 개인정보보호법상 제3자 제공 동의에 받는 자·목적·항목·보유기간·거부권 고지가 필요하다는 메모를 기획안에 추가 | 운영 전 확인 |
| L-11 | 원천 자료 9쪽(공개 저장소) | "월 고정 광고비·플랫폼 이용료" 협업 대가 | 사건 소개와 연동되면 소개 대가로 볼 여지. 시안에는 노출 안 됨. 1-2 쟁점과 함께 대표에게 공유 | 참고 |

결혼중개업법 관점: "매칭·중개 하지 않음"이 세 곳에 명시되어 있어 시안 자체의 위험은 낮다. L-1·L-2만 고치면 된다.

---

## 4. 포트폴리오 표기 검토

- 시안 페이지: 상단 안내띠(닫아도 푸터 문구와 `f-strip` 유지), 푸터 컨셉 표기, "working name · 가칭" 배지, 폼 데모 배지, `noindex` 모두 있음. **실적으로 오해될 소지 낮음.**
- 갤러리 카드: `컨셉 시안` 배지 + `자체 프로젝트 · 홈페이지 · 2026`은 보이지만, 기획안 9절이 정한 구분 표기 **`자체 프로젝트 01 · 실제 운영 서비스 아님`이 빠졌다.** 태그에 `상담 접수`·`커뮤니티`가 있어 운영 기능처럼 보일 수 있다 → 필수 F-6.
- 피드(`portfolio.json`): 본 홈페이지는 이 피드의 `summary`를 그대로 쓴다. 본 홈페이지가 status 배지를 빠뜨리면 "실제 서비스"로 오해될 수 있으므로 `summary` 자체에 "컨셉 시안"과 "실제 운영 서비스 아님"이 들어가야 한다 → 필수 F-6.
- 갤러리 "앱" 필터: `앱 0` + "이 분류에는 아직 공개된 작업이 없어요." 본 홈페이지에는 앱 포트폴리오 3건이 있다고 되어 있어(규칙서 회사 정보) 두 사이트가 서로 다른 말을 한다. 다만 규칙서에 "기존 Render 사이트 8개는 샘플·초안이라 포트폴리오에 넣지 않는다(대표 지시)"가 있으므로, 앱 필터를 숨기거나 문구를 바꾸는 쪽을 권장 → R-8.

---

## 5. 완성도 검토 (Playwright 결과 포함)

정상 확인된 것
- 360/768/1280px 모두 가로 스크롤 없음, 콘솔 오류 0건, 깨진 내부 앵커 0건.
- 폼: 빈 제출 시 오류 6개 표시 후 첫 칸 포커스, 이메일 형식 오류, 9자리 숫자 경고(EN/KO), 분기 A/B 결과, 지난 날짜 분기 코드 존재, "Ask another question" 후 이름 칸 포커스.
- 제출 중 네트워크 요청 0건(폰트 제외), 저장소에는 언어 설정(`staybusan-lang`)만 저장, 폼 내용 저장 없음.
- 파트너 모달: 열면 첫 칸 포커스, ESC로 닫히고 원래 버튼으로 포커스 복귀. 토스트 정상. 하단 고정 바 300px 이후 표시.
- 제작자 추가 문구: 오류 메시지 4종(EN "Please fill this in." / "Please choose one." / "Please enter a valid email address." / "Please check this box to continue.", KO 대응) 의미·문법 문제 없음. "Back to BRIDGENODE portfolio / 브릿지노드 포트폴리오로" 링크 `../` 정상. 갤러리 안내 문구(로딩, 빈 분류, 불러오기 실패) 문법 문제 없음.
- 썸네일 1200×750, 시안 첫 화면 캡처와 일치, 사람 사진·외부 이미지 없음. 폰트는 Google Fonts(Plus Jakarta Sans, Noto Sans KR, OFL 라이선스)로 저작권 문제 없음.

발견된 문제는 아래 수정 목록에 포함.

---

## 6. 공개 노출 검토

| 항목 | 상태 | 판단 |
|---|---|---|
| `portfolio-site/README.md` | 배포 루트 안 → `/README.md`로 공개됨(로컬 서버에서 200 확인) | 내부 운영 절차(검토자, 커밋 명령, Render 설정)가 노출. 개인정보는 없음. 배포 루트 밖으로 이동 권장 F-8 |
| `portfolio-site/_headers` | `/_headers`로 공개, Render는 읽지도 않음 | 내용은 무해하나 쓸모없는 공개 파일. README와 함께 이동 권장 F-8 |
| 시안 HTML 주석 (11행) | `<!-- og:image: [자리표시] og-image 1200×630 (기획안 16번, 이미지 확정 후 추가) -->` | 내부 메모가 소스 보기로 노출. 삭제 F-9 |
| 대표 개인정보 | 저장소·페이지 어디에도 없음 | 적합 |
| 저장소 공개 | 1-2 참조 | 대표 판단 |

---

## 7. 수정 목록

### 필수 (F)

| # | 담당 | 파일 · 위치 | 고칠 내용 |
|---|---|---|---|
| F-1 | 기획자 → 제작자 | 기획안 4절 여정 표 6단계 / `stay-busan/index.html` 571–572행 | EN `Status steps after marriage` → `Guide: status change after marriage`, `Inviting family` → `Guide: inviting family`. KO `결혼 후 체류 절차` → `결혼 후 체류자격 변경 안내`, `가족 초청` → `가족 초청 절차 안내`. (안내만 한다는 점이 항목명에 드러나게) |
| F-2 | 기획자 → 제작자 | 히어로 신뢰 문구 496행, FAQ 7 802행, 기획안 같은 위치 | 원천 자료에 지원 언어가 없다. 확정 전까지 `English and Korean now, Nepali coming soon` → `Planned languages: English and Korean first, then Nepali.` / KO `지원 예정 언어: 영어·한국어부터, 이어서 네팔어.` FAQ 7 답변도 "planned" 기준으로 고치고, 대표에게 언어 계획 확인을 "필요한 자료"에 추가 |
| F-3 | 기획자 → 제작자 | 여정 6단계 주석 574행 | EN `…who need help with the stay procedures that follow.` → `…We share general information on the stay procedures that follow, and connect you to a partner administrative agent.` KO `…체류자격 변경·가족 초청 절차를 돕는 단계입니다.` → `…이후 체류자격 변경·가족 초청의 일반 절차를 안내하고 협업 행정사에게 연결해 드리는 단계입니다.` |
| F-4 | 기획자 → 제작자 | 여정 4단계 558–559행, FAQ 4 796행 | EN `Job posts you are allowed to apply for` → `Job info and student work-hour rules`, FAQ 4 `share job posts you are allowed to apply for` → `share general job information`. KO `허가 가능 공고` → `일자리 정보·근무 시간 규칙`, FAQ 4 `지원 가능한 공고 정보를 공유합니다` → `일반적인 일자리 정보를 안내합니다`. 기획안 8절에 "구인 정보 제공 시 직업정보제공사업 신고 필요 여부 검토" 추가 |
| F-5 | 기획자 → 제작자 | 파트너 카드 3 818행 | EN `Receive consultations with basic documents and facts already organised.` → `Receive consultation requests where the student has already shared basic information, such as visa type and expiry date.` KO `기본 서류와 사실관계가 정리된 상담 건을 받으세요.` → `체류자격·만료일 같은 기본 정보를 학생이 미리 남긴 상담 요청을 받으세요.` |
| F-6 | 제작자 | `portfolio.json` `summary` / `portfolio-site/index.html` 카드 `meta` | (1) `summary` 맨 앞에 `[컨셉 시안 · 실제 운영 서비스 아님]` 추가(본 홈페이지가 배지를 안 그려도 보이도록). (2) 갤러리 카드에 기획안 9절 구분 표기 `자체 프로젝트 01 · 실제 운영 서비스 아님`을 한 줄로 표시(예: json에 `note` 필드 추가 후 카드에 출력). (3) 태그 `상담 접수` → `상담 접수(데모)` |
| F-7 | 제작자 | 결과 화면 만료일 문구 1114–1120행 | `n === 1`일 때 `That is 1 days` 문법 오류, `n === 0`일 때 `That is 0 days from today. … remind you before it.`가 모순. n=1 → `That is 1 day from today.`, n=0 → EN `Your stay expiry date is today. Please talk to a qualified administrative agent as soon as possible.` / KO `만료일이 오늘이에요. 가능한 한 빨리 자격을 갖춘 행정사와 상담하세요.`(지난 날짜와 같은 스타일 `.expiry.past`) |
| F-8 | 제작자 | `portfolio-site/README.md`, `portfolio-site/_headers` | 배포 루트 밖(예: `work/builds/portfolio-site-README.md`)으로 옮긴다. `_headers`는 Render가 읽지 않으므로 내용은 README에 합치고 파일 삭제 |
| F-9 | 제작자 | `stay-busan/index.html` 11행 | 내부 메모 HTML 주석 삭제 |

### 권장 (R)

| # | 담당 | 파일 · 위치 | 고칠 내용 |
|---|---|---|---|
| R-1 | 기획자 | 기획안 여정 표 "행정사 연계 배지" 열 | 원천 텍스트 5쪽에서 배지 4개의 단계 위치가 확정되지 않는다. 원본 슬라이드로 2·4·5·6단계가 맞는지 확인하고 근거를 기획안에 적는다 |
| R-2 | 기획자 → 제작자 | 문제 카드 4 524행 | EN `Many students leave Korea at graduation simply because…` → `Some students leave Korea at graduation simply because…`(수치 근거 없는 "Many" 완화). KO `…출국하는 경우가 많습니다` → `…출국하기도 합니다` |
| R-3 | 기획자 → 제작자 | 협업 흐름 2단계 589행 | EN 뒤에 `, with your consent` 추가: `Visa and stay questions go to a partner administrative agent, with your consent.` KO `체류 관련 질문은 동의를 받은 뒤 협업 행정사에게 전달합니다.` |
| R-4 | 기획자 → 제작자 | 협업 흐름 5단계 592행 | EN `You get automatic updates as your case moves forward.` → `When the agent shares progress, we send you an automatic update.` KO `행정사가 진행 상황을 공유하면 자동으로 알려 드립니다.` |
| R-5 | 기획자 → 제작자 | FAQ 6 800행 | `we can guide you through the general steps` → `we can share the general steps` |
| R-6 | 기획자 | 기획안 8절 "확인 필요" | L-9(협업 행정사 자격 종류·출입국 민원 대행기관 등록 여부), L-10(개인정보 제3자 제공 동의 필수 고지 항목) 두 줄 추가. 실제 운영 전 확인 항목임을 명시 |
| R-7 | 제작자 | 히어로 하단(`#hero` padding, `.waves`) 360px | 신뢰 문구("Korean now, Nepali coming soon") 둘째 줄이 물결 장식과 겹쳐 읽기 어렵다. 모바일에서 `#hero` 아래 여백을 늘리거나(예: `padding-bottom:96px`) 물결 높이·불투명도를 줄인다 |
| R-8 | 제작자(대표 확인 후) | `portfolio-site/index.html` 필터 | 앱 0건인데 "앱" 필터가 보이고 "아직 공개된 작업이 없어요"가 나온다. 본 홈페이지(앱 3건)와 말이 다르다. 0건인 분류 버튼은 숨기거나 문구를 `이 사이트에는 아직 등록된 앱 작업이 없어요. 전체 작업은 브릿지노드 홈페이지에서 볼 수 있어요.`로 |
| R-9 | 제작자 | 안내띠 436행, `f-strip` 872행 | 한국어 고정 문구 `BRIDGENODE 컨셉 시안 · 실제 운영 서비스 아님`에 `lang="ko"`가 없어 영어 모드 스크린리더가 영어 발음으로 읽는다. `lang="ko"` 추가, 또는 EN 모드에 `BRIDGENODE concept demo · not a live service` 병기 |
| R-10 | 제작자 | 안내띠 "Back to BRIDGENODE portfolio" 링크(16px 높이), 언어 전환 버튼(38px 높이) | 기획안 기준 터치 영역 44px 미달. 링크는 `display:inline-flex;min-height:44px;align-items:center` 또는 패딩, 언어 버튼 `height:44px` |
| R-11 | 제작자 | 동의 오류 KO `동의에 체크해 주세요.` | `동의 항목에 체크해 주세요.`가 더 자연스럽다 |

### 참고 (조치 불필요, 기록용)
- 시안 위치가 기획안(`work/builds/staybusan-concept/`)과 다르지만 `work/builds/staybusan-concept/README.md`에 이유가 적혀 있어 문제 없음.
- 헤더 "Ask a question" 버튼이 480px 미만에서 숨겨짐: 첫 화면 주 버튼과 하단 고정 바가 대신해 기획안 성공 기준 2는 충족.
- 저작권 기여 기록: 대표가 직접 고친 문장은 아직 없음. 대표 승인 단계에서 수정한 문장을 기획안 6절 8번에 기록할 것.

---

## 8. 재검토 조건
1. 1-1·1-2·1-3에 대한 대표 결정.
2. F-1~F-9 반영 후 같은 범위로 재검토(법적 문구는 diff 기준으로 확인).

---

## 재검토(2202a20)

- 재검토일: 2026-11-13 · 범위: 커밋 2202a20(`git diff ade57af 2202a20 -- portfolio-site work/planning work/builds`)에서 F-1~F-9, R-2~R-5, R-7~R-11 반영 여부와 범위 밖 변경. 대표 판단 3건(1-1·1-2·1-3)은 다루지 않음.
- 확인 방법: diff 정독, 옛 문구 잔존 grep(0건), 로컬 서버 + Playwright 360px(콘솔 오류 0, 가로 스크롤 없음).

### 판정: 통과 (대표 판단 3건은 별도로 남아 있음)

### 반영 확인
| # | 결과 | 근거 |
|---|---|---|
| F-1 | 반영 | 6단계 목록 `Guide: status change after marriage` · `Guide: inviting family` / `결혼 후 체류자격 변경 안내` · `가족 초청 절차 안내`, 기획안 동기화 |
| F-2 | 반영 | 히어로·FAQ 7·폼·기획안 모두 "planned / 예정", 기획안 필요한 자료 9번 추가 |
| F-3 | 반영 | 6단계 주석 "일반 절차를 안내하고 협업 행정사에게 연결" |
| F-4 | 반영 | 4단계 목록·FAQ 4 수정, 기획안 확인 필요 11번 추가 |
| F-5 | 반영 | 파트너 카드 3 "학생이 미리 남긴 상담 요청" |
| F-6 | 반영 | summary 앞 표기, `note` 필드가 카드에 출력됨(실측), 태그 `상담 접수(데모)` |
| F-7 | 반영 | n=0 별도 문구(`.expiry.past`), n=1 단수 처리 |
| F-8 | 반영 | `portfolio-site/`에는 index.html·portfolio.json·stay-busan만 남음, README는 `work/builds/portfolio-site-README.md`로 |
| F-9 | 반영 | og:image 주석 삭제 |
| R-2~R-5 | 반영 | 제안 문구 그대로 |
| R-6 | 반영 | 기획안 확인 필요 12·13번 |
| R-7 | 반영 | 360px에서 신뢰 문구 아래 끝 909px, 물결 시작 941px로 겹침 없음 |
| R-8 | 반영 | 필터를 항목 있는 분류만 생성(실측 `전체 1 / 홈페이지 1`) |
| R-9 | 반영 | 안내띠·f-strip에 `lang="ko"`, f-strip은 EN 모드에 영어 병기 |
| R-10 | 반영 | 안내띠 링크 높이 약 47px, 언어 버튼 44px(실측) |
| R-11 | 반영 | `동의 항목에 체크해 주세요.` |

### 범위 밖 변경 점검
- FAQ 7 질문 `Which languages will you support?` / `어떤 언어를 지원할 예정인가요?`: F-2와 맞춘 자연스러운 변경. 문제 없음.
- 네팔어 `(planned / 예정)`: F-2와 일관. 문제 없음.
- 모바일 물결 높이 120→72px(960px 이상은 120px 유지), 히어로 아래 여백 104px: R-7 해결, 데스크톱 영향 없음.
- 영어 모드 푸터 `BRIDGENODE concept demo · not a live service` 병기: 문법 정상, 실적 오해 방지에 도움. KO 모드에서는 숨겨짐.
- 안내띠 링크 `padding:14px 0; margin:-14px 0`: 줄 높이는 그대로, 터치 영역만 확대. 닫기 버튼과 겹치지 않음.
- `f-strip a` 최소 높이 44px 추가: 문제 없음.
- 새 법적 위험 표현: 없음. 오탈자: 없음.

### 남은 수정 (선택, 통과 판정에 영향 없음)
- S-1(제작자·기획자, 선택): 여정 4단계 목록이 `Part-time work rules` 와 `Job info and student work-hour rules`(KO `시간제취업 규칙` · `일자리 정보·근무 시간 규칙`)로 "규칙"이 겹친다(검토자 제안 문구에서 생긴 중복). 둘째 항목을 EN `General job information` / KO `일반 일자리 정보`로 바꾸면 깔끔하다. 시안·기획안 같이 수정.
