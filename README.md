# 이헌영 지점장 모바일 명함

지혜로운 보험생활 · 이헌영 지점장의 모바일 명함 (`index.html` 한 장).

## 구성
1. 명함 앞면: 사진, 이름·직함, 하는 일 한 줄, 전화하기·연락처 저장, 연락처 목록
2. 고객을 위해 하는 일: 보험금 청구 · 보험 재설계 · 재무 컨설팅 · 무료 보장 분석
3. 함께 일하는 전문가 (MOU): 협약 분야, 등록된 파트너, 협업 신청
4. 명함 보내기 · 링크 복사 · QR코드

## 수정 방법
`index.html` 위쪽 `window.CARD` 부분만 고치면 됩니다.
- 파트너 추가: `partners`에 `{ field:"세무사", name:"○○세무회계", person:"김○○ 세무사", desc:"…", phone:"02-000-0000" }`
  - `phone`을 비우면 "지점장 통해 연결"로 표시
- 분야 추가·삭제: `fields`
- 사진: `profile-hero.jpg` (세로), 카톡 미리보기: `profile.jpg`

## 영어
오른쪽 위 `English`로 전환. 주소 끝에 `#en`을 붙이면 영어로 열립니다.

## 공개 (GitHub Pages)
Settings → Pages → 이 브랜치 / root 선택 → `https://calmgrou7.github.io/Brief/`
