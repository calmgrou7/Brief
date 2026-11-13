# Stay B 홈페이지: 위치·배포 메모

- 기획안: `work/planning/20261113-staybusan-homepage.md` (맨 위 "2026-11-13 대표 결정" 절이 우선)
- 파일 위치: `portfolio-site/stay-b/`
  - `index.html` 학생용 메인 · `partners.html` 대학 국제처·어학원·행정사·제휴업체용
  - `assets/site.css` 공통 스타일 · `assets/common.js` 공통 스크립트(언어 전환, 안내띠, 메뉴, 토스트, 데모 폼 검사)
  - `thumb.png` 1200×750 첫 화면 캡처
- 옛 주소 `portfolio-site/stay-busan/index.html`은 `../stay-b/`로 바로 이동하는 안내 페이지(meta refresh + 링크).
- 피드: `portfolio-site/portfolio.json` 항목 id `stay-b`, url `/stay-b/`, thumbnail `/stay-b/thumb.png`.

## 배포 방법 (실장용)
- Render 정적 사이트 `bridgenode-portfolio`가 `portfolio-site/`를 그대로 배포. 브랜치 푸시 = 자동 배포.
- 배포 후 주소: `https://bridgenode-portfolio.onrender.com/stay-b/`, 파트너 페이지 `/stay-b/partners.html`.
- 두 페이지 모두 `noindex`.

## 제작 메모
- 법적 경계 문구(검토 보고서 F-1~F-9, R-2~R-11 반영본)는 옛 시안에서 그대로 옮기고 이름만 Stay B로 바꿈.
- 파트너 페이지에 넣지 않은 것: 플랫폼 수익원, 협업 대가 방식(광고비·이용료 등), 기관 계약 단가. 넣은 것: 수임료 분배 안 함, 세부 방식은 법적 검토 후 함께 확정.
- 폼(상담 접수, 파트너 문의)은 전송·저장·콘솔 출력 없음. 브라우저 저장소는 언어 선택(`stayb-lang`)과 안내띠 닫음(`stayb-bar`, 세션)만.
- 외부 요청은 Google Fonts뿐.
