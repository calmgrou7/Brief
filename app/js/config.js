/* 실시간 '함께하기' 설정 (선택)
 * Supabase 프로젝트의 URL과 anon(publishable) 키를 넣으면
 * 동시 접속 수와 다른 사람의 종소리(등불)가 실시간으로 보입니다.
 * 비워두면 '혼자 걷는 중' 모드로 동작합니다. (테이블 생성 불필요)
 * anon 키는 브라우저에 공개되는 키라 여기에 넣어도 됩니다. service_role 키는 절대 넣지 마세요. */
window.SANSA_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  ROOM_CAPACITY: 100 // 방(법당) 하나의 정원
};
