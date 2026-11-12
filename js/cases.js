/**
 * 시공사례 목록 — 사진을 images/cases/ 에 넣고 한 줄씩 추가하면 사이트에 자동으로 나타납니다.
 * type: home(주택·아파트) | shop(카페·상가) | sun(썬룸)
 * img   : 사진 경로 → 천천히 확대·이동하며 영상처럼 움직입니다
 * video : 짧은 mp4 경로 (선택) → 소리 없이 반복 재생, img 는 로딩 전 미리보기로 쓰입니다
 * 둘 다 비워두면 색상 자리표시가 나옵니다.
 */
window.CASES = [
  { type: "home", title: "아파트 거실 슬림 폴딩도어", place: "지역 입력 · 슬림 폴딩도어 S", img: "images/hero/sample-1.svg" },
  { type: "shop", title: "카페 전면 글라스 폴딩도어", place: "지역 입력 · 글라스 폴딩도어 G", img: "images/hero/sample-2.svg" },
  { type: "sun",  title: "전원주택 테라스 썬룸",       place: "지역 입력 · 썬룸 + 단열 폴딩도어", img: "images/hero/sample-3.svg" },
  { type: "home", title: "단독주택 단열 폴딩도어",     place: "지역 입력 · 단열 폴딩도어 D", img: "" },
  { type: "shop", title: "음식점 테라스 폴딩도어",     place: "지역 입력 · 폴딩도어 F", img: "" },
  { type: "home", title: "리모델링 시스템창호 교체",   place: "지역 입력 · AL 시스템창호", img: "" }
];
