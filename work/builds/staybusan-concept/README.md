# Stay Busan 컨셉 시안: 위치 안내

- 기획안: `work/planning/20261113-staybusan-homepage.md`
- **최종 파일 위치: `portfolio-site/stay-busan/index.html`** (기획안에 적힌 이 폴더 대신 포트폴리오 사이트 폴더에 둠)
- 썸네일: `portfolio-site/stay-busan/thumb.png` (1200×750, 시안 첫 화면 캡처)
- 포트폴리오 등록: `portfolio-site/portfolio.json`의 `stay-busan` 항목

## 배포 방법 메모 (실장용)

- Render 정적 사이트 `bridgenode-portfolio`, publishPath = `portfolio-site/`, 빌드 명령 없음.
- 배포 후 주소: `https://<render 도메인>/stay-busan/` (갤러리는 `https://<render 도메인>/`)
- Render Settings > Headers에 `/portfolio.json` → `Access-Control-Allow-Origin: *` 추가 (`work/builds/portfolio-site-README.md`의 "응답 헤더" 절 참고).
- 이 시안은 `noindex` 메타가 걸려 있음(검색 노출 안 함). 공개 검색 노출을 원하면 `<meta name="robots">` 줄 삭제.

## 제작 메모

- 단일 HTML, 인라인 CSS/JS. 외부 요청은 Google Fonts(Plus Jakarta Sans, Noto Sans KR)만.
- 폼 2개(상담 접수, 파트너 문의)는 전송·저장·콘솔 출력 없음. 결과 화면을 띄운 뒤 폼을 바로 비움.
- 브라우저 저장소 사용은 두 가지뿐: 언어 선택(localStorage, 기획안 P1-1), 안내띠 닫음 상태(sessionStorage, 기획안 P1-8). 폼 내용은 저장하지 않음.
- [자리표시] 항목은 점선 테두리 + 회색 배경으로 화면에 그대로 보임: FAQ 2번 비용 정책, 학교 선택지 2개, 시범 운영 파트너, 푸터 연락처, og-image(HTML 주석).
- 기획안에 없던 최소 문구(직접 작성): 폼 오류 메시지 4종, 건너뛰기 링크, "Back to BRIDGENODE portfolio / 브릿지노드 포트폴리오로", 학교 자리표시 도움말 한 줄, Stay Busan/Partner agent/Together 배지의 한국어(원천 자료 표기 사용).
- 헤더의 "Ask a question" 버튼은 480px 이상에서만 보임(그보다 좁으면 로고·언어 전환·메뉴만으로 꽉 참). 좁은 화면에서는 첫 화면 주 버튼과 하단 고정 바가 같은 역할.
