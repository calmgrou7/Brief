# 홈페이지 홍보 쇼츠 자동 제작기

사이트 캡처 이미지 + 문구(JSON)만 바꾸면 1080×1920 쇼츠(본편 + 브릿지노드 엔딩 + 배경음)가 자동으로 나옵니다.

## 결과물
- `out/stay-b_shorts.mp4` : Stay B 홍보 쇼츠 (29초, 본편 24.4초 + 엔딩 4.6초)
- `out/bridgenode_ending.mp4` : 브릿지노드 엔딩 단독본 (다른 영상 편집 시 뒤에 붙여 쓰기)

## 새 사이트 쇼츠 만들기
1. 사이트를 모바일 화면으로 캡처해 `assets/<프로젝트>/`에 넣기 (섹션별 세로 이미지)
2. `projects/stay-b.json`을 복사해 문구·이미지 경로 수정
   - 장면 종류: `hook`(첫 3초 후킹) · `phone`(폰 화면 스크롤) · `cta`(마무리 유도)
   - `"ending": "projects/bridgenode-ending.json"` 이 있으면 엔딩이 자동으로 붙음
3. 렌더링

```bash
npm install
node preview.js projects/stay-b.json out/preview.png   # 장면별 스틸 미리보기
node render.js projects/stay-b.json                     # 최종 mp4
```

엔딩 문구(연락처·슬로건)는 `projects/bridgenode-ending.json`에서 수정하면 다음 렌더링부터 모든 쇼츠에 반영됩니다.
배경음은 `music.py`가 코드로 합성하므로 저작권 문제가 없습니다. 플랫폼 인기 음원을 쓰려면 업로드 시 교체하세요.
