-- 시나리오 검증: 정답 비공개, 점수 직접수정 차단, 채점/XP/레이팅, 대결, 출제·심사, 비로그인 차단
-- 실행: psql -f 00_local_auth_stub.sql → ../migrations/*.sql → 이 파일
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111', '{"username":"테스터"}'),
 ('22222222-2222-2222-2222-222222222222', '{"username":"테스터"}'),
 ('33333333-3333-3333-3333-333333333333', '{}');
select username from profiles order by created_at, username;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '--- 1. 정답 컬럼 직접 조회 (실패해야 함)'
select answer from problems limit 1;
\echo '--- 2. 점수 직접 수정 (실패해야 함)'
update profiles set xp = 99999 where id = auth.uid();
select xp from profiles where id = auth.uid();
\echo '--- 3. 오답 → 정답 → 재제출'
select submit_answer('m-euclid-gcd', '17');
select submit_answer('m-euclid-gcd', '18') - 'explanation' as r;
select submit_answer('m-euclid-gcd', '18') - 'explanation' as r;
select submit_answer('r-zeta-minus1', '-1/12') - 'explanation' as frac;
select submit_answer('u-basel', '3') - 'explanation' as choice;
select submit_answer('g-torus-pi1', '2') ->> 'correct' as choice2;
select xp, rating, total_attempts, total_correct, streak_count from profiles where id = auth.uid();
select problem_id, misses, solved_at is not null as solved from solves order by 1;
\echo '--- 4. 해설 미리보기 후 정답 → XP 40%'
select reveal_explanation('h-binomial') is not null as got;
select submit_answer('h-binomial', '80') ->> 'xp' as xp_after_reveal;
\echo '--- 5. 레벨 부족 출제 (실패해야 함)'
select submit_problem('{"tier":"high","topic":"algebra","source":"x","statement":{"ko":"a","en":"a"},"explanation":{"ko":"b"},"answer":{"kind":"numeric","value":1}}');
\echo '--- 6. 대결'
select jsonb_array_length(d->'problems') as n, d->>'opponent' is not null as opp from (select start_duel() d) x;
reset role;
update duels set round_started_at = now() - interval '10 seconds';
set role authenticated;
select duel_answer((select id from duels where status='live'), '999');
reset role;
update duels set round_started_at = now() - interval '120 seconds';
set role authenticated;
\echo '    시간 초과 정답 → 0점이어야 함'
reset role;
select coalesce(p.answer->>'value', p.answer->>'correct') as cur_ans, d.id as cur_duel
  from duels d join problems p on p.id = d.problem_ids[d.round + 1] where d.status = 'live' \gset
set role authenticated;
select duel_answer(:'cur_duel', :'cur_ans') ->> 'mine' as timeout_should_be_0;
select duel_answer((select id from duels where status='live'), null) ->> 'finished';
select duel_answer((select id from duels where status='live'), null) ->> 'finished';
select duel_answer((select id from duels where status='live'), null) -> 'final';
select status, round, result, my_score, opp_score, rating_delta, xp from duels;
select duels_w, duels_l, duels_d from profiles where id = auth.uid();
\echo '    다른 사람 대결 조작 (실패해야 함)'
reset role;
insert into auth.users (id, raw_user_meta_data) values ('44444444-4444-4444-4444-444444444444','{"username":"x"}');
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select start_duel() is not null;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select duel_answer((select id from duels where status='live' limit 1), '1');

\echo '--- 7. 출제 · 심사'
reset role;
update profiles set xp = 2250 where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
set role authenticated;
select left(submit_problem('{"tier":"undergrad","topic":"analysis","source":"Riemann integral","statement":{"ko":"$\\int_0^1 x^2dx$?","en":"Evaluate"},"explanation":{"ko":"1/3","en":"1/3"},"answer":{"kind":"numeric","value":0.3333333333,"tolerance":1e-6}}'), 2) as id;
select jsonb_array_length(my_problems()) as mine;
select jsonb_array_length(review_queue()) as own_queue_should_be_0;
\echo '    본인 투표 (실패해야 함)'
select vote_problem((select id from problems where status='pending'), true, 'self');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select jsonb_array_length(review_queue()) as queue;
select vote_problem((select (review_queue()->0->>'id')), true, '좋은 문제');
select count(*) as community_visible from problems where author_id is not null;
select submit_answer((select id from problems where author_id is not null), '1/3') ->> 'correct' as solve_community;
reset role;
select username, xp, approved_count from profiles where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222') order by username;
\echo '--- 8. 비로그인(anon)'
set role anon;
select count(*) from problems;
select submit_answer('m-euclid-gcd', '18');
reset role;
