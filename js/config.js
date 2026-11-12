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
   * 견적 문의 자동 접수 (Supabase)
   * 1) supabase/schema.sql 을 Supabase SQL Editor에서 실행
   * 2) 프로젝트 URL과 publishable(anon) 키를 아래에 입력
   * 비워두면 '데모 모드'로 동작합니다 (실제 전송 없음).
   */
  supabaseUrl: "",
  supabaseKey: ""
};
