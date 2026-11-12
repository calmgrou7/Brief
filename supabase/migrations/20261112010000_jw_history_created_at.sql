-- 연혁: 같은 날짜일 때 등록 순서로 정렬하기 위한 등록 시각
alter table public.jw_history add column created_at timestamptz not null default now();
