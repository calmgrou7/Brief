# 뷰티커넥트

화장품·에스테틱 제품과 서비스를 고객과 연결하는 "뷰티 커넥터" 사업의 MVP와 사업 설계 문서.

- `mvp/index.html` — 단일 파일 MVP. 브라우저로 열면 바로 동작 (피부 진단·매칭, 커뮤니티, 파트너 입점, 운영 대시보드, 사업 구조·수익 시뮬레이터)
- `docs/business-plan.md` — 사업 구조 도식, 수익 모델, 콘텐츠 사업화, 자동화 설계, 확장 로드맵, 규제 체크리스트

데이터는 현재 예시이며 브라우저(localStorage)에만 저장된다. 실서비스 전환 순서는 `docs/business-plan.md` 5장 참고.

## 고객용 공개 사이트

- `public/index.html` — 고객용 버전 (운영 대시보드·사업 구조 탭 제외). `mvp/index.html`을 고친 뒤 `python3 build-public.py`로 다시 생성한다.
- Render 정적 사이트로 배포되며, 이 브랜치에 커밋하면 자동 재배포된다.

## 플랫폼 디자인 (NEW BEAUTY NEXUS)

- `platform/index.html` — 대표 피드백을 반영한 비즈니스 솔루션 플랫폼 (5개 고객 입구, 서비스 20, 창업 플래너, 파트너·브랜드, 해외 바이어, 전환·양도, 상담 신청). `build-public.py`가 `public/platform/`으로 복사해 함께 배포한다.
