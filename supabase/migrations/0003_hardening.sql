-- Supabase 보안·성능 점검(advisors) 반영
-- 1) search_path 고정: 함수 실행 시 다른 스키마의 같은 이름 객체로 바꿔치기 되는 것을 방지
alter function public.problems_set_shape() set search_path = public;
alter function public.elo_delta(int, int, numeric, int) set search_path = public;
alter function public.parse_num(text) set search_path = public;
alter function public.norm_short(text) set search_path = public;
alter function public.check_answer(jsonb, text) set search_path = public;
alter function public.level_of(int) set search_path = public;

-- 2) 외래키 인덱스: 회원·문제 삭제 시 연쇄 삭제가 전체 스캔하지 않도록
create index if not exists reviews_reviewer_idx on public.reviews (reviewer_id);
create index if not exists solves_problem_idx on public.solves (problem_id);

-- 참고(의도된 상태라 수정하지 않음)
--  · app_config / reviews: RLS 켜고 정책 없음 → 클라이언트 직접 조회 차단, 함수로만 접근
--  · submit_answer 등 8개 security definer 함수: 로그인 사용자가 호출하는 공개 API.
--    내부 함수(finalize_duel, bump_streak, config_int …)는 0001에서 실행 권한을 회수함
