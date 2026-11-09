# 보험지기 모바일 명함

지혜로운 보험생활 · 보험지기의 모바일 명함 페이지입니다 (`index.html` 한 장).

## 내 정보로 바꾸기 (5분)
1. `index.html` 위쪽 `window.CARD = { ... }` 부분만 고치면 됩니다.
   - `phone` 전화번호, `name` 실명, `company` 소속, `regNo` 설계사 등록번호
   - `kakao` 카카오톡 오픈채팅/채널 링크, `email`, `blog`
2. 얼굴 사진을 `profile.jpg` 이름으로 같은 폴더에 넣습니다 (정사각형, 600px 이상 권장).

## 어디서나 보이게 공개하기 (GitHub Pages, 무료)
저장소 Settings → Pages → Branch를 `main` / `(root)`로 지정하면
`https://<깃허브아이디>.github.io/<저장소이름>/` 주소가 생깁니다.
이 주소를 `shareUrl`에 넣으면 QR코드도 그 주소로 만들어집니다.
(무료 계정은 저장소가 Public이어야 Pages를 쓸 수 있습니다.)

## 들어 있는 기능
- 전화 · 문자 · 카카오톡 · 연락처(vCard) 저장 버튼
- 업무 소개: 보험금 청구 / 보험 재설계 상담 / 재무 컨설팅 / 무료 보장 분석
- 보험금 청구 기한(소멸시효 3년) 계산기
- 상담 신청서 → 문자 내용 자동 작성
- QR코드 · 링크 공유
- 다크 모드 자동 대응

## MOU 파트너 추가하기
`CARD.partners` 목록에 한 줄씩 넣으면 '함께하는 협약 기관·전문가' 섹션에 바로 보입니다.
```js
{ cat:"세무사", name:"○○세무회계", person:"김○○ 세무사", desc:"개인사업자 기장·절세", phone:"02-000-0000", url:"", mode:"direct" },
```
- `mode:"direct"` 연락처 공개 / `mode:"via"` 보험지기를 통해서만 연결
- 분야는 `CARD.partnerCats`에서 추가·삭제
- 대표님들이 명함의 '파트너 등록 신청'에서 보낸 문자 내용을 Claude에게 붙여 넣으면 목록에 반영해 줍니다.

## 영문(English) 버전
- 상단 오른쪽 `EN / 한국어` 버튼으로 언어를 바꿉니다.
- 휴대폰 언어가 한국어가 아니면 처음부터 영어로 보입니다.
- 외국인 고객에게는 주소 끝에 `#en`을 붙여 보내면 영어로 열립니다. 예) `https://calmgrou7.github.io/Brief/#en`
- 영문 이름·소속은 `CARD.nameEn`, `CARD.companyEn`, 파트너는 `nameEn`, `personEn`, `descEn`에 넣습니다.

## 구성 (v2)
상단바 → 소개(헤드라인·사진·약력) → 숫자 띠 → '이런 고민에' 상담 분야 카드 → 셀프 진단(청구 기한·보장 분석) → 고객 후기 → MOU 파트너 → 상담 문의(신청서·연락처·소개 문구·문자 신청·QR)
- 약력: `CARD.credentials`, 숫자 띠: `CARD.stats`, 고객 후기: `CARD.reviews` (비어 있으면 숨김)
- 소개 사진: `profile-hero.jpg` (세로 4:5), 카톡 미리보기: `profile.jpg` (정사각형)
