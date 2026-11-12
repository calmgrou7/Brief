/**
 * 사이트 설정 — 이 파일만 고치면 전화번호·주소·연동 정보가 사이트 전체에 반영됩니다.
 * 실제 정보가 정해지면 아래 값을 바꿔주세요.
 */
window.SITE = {
  company: "예스시스템",
  ceo: "○○○",
  bizno: "000-00-00000",
  address: "주소 입력",
  tel: "000-0000-0000",
  email: "email@example.com",
  kakao: "",                 // 카카오톡 채널 URL (예: https://pf.kakao.com/_xxxx/chat)
  hours: "평일 09:00 – 18:00",
  area: "시공 가능 지역 입력",

  /**
   * 메인 배경 (위에서부터 우선 적용)
   * 1) vimeo  : Vimeo 영상 ID (예: "123456789") — 사이트 용량 부담 없음, 가장 추천
   * 2) video  : 직접 올린 mp4 경로 (예: "images/hero/main.mp4") — 10~15초, 5MB 이하 권장
   *    videoMobile : 휴대폰용 가벼운 mp4 (선택)
   * 3) photos : 시공 사진들 → 천천히 확대·이동하며 넘어가는 '영상 같은' 슬라이드
   * poster : 영상 로딩 전에 보여줄 사진
   */
  hero: {
    vimeo: "",
    video: "",
    videoMobile: "",
    poster: "",
    photos: [
      { src: "images/hero/sample-1.svg", label: "샘플 이미지 · 거실 폴딩도어" },
      { src: "images/hero/sample-2.svg", label: "샘플 이미지 · 카페 글라스 폴딩도어" },
      { src: "images/hero/sample-3.svg", label: "샘플 이미지 · 테라스 썬룸" }
    ],
    interval: 6        // 사진 한 장당 보여주는 시간(초)
  },

  /**
   * 견적 문의 자동 접수 (Supabase)
   * 1) supabase/schema.sql 을 Supabase SQL Editor에서 실행
   * 2) 프로젝트 URL과 publishable(anon) 키를 아래에 입력
   * 비워두면 '데모 모드'로 동작합니다 (실제 전송 없음).
   */
  supabaseUrl: "",
  supabaseKey: ""
};
