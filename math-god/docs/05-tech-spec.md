# 05. 기술 명세 — 스택, DB, API, 실시간, 광고, 보안

## 1. 아키텍처
```
[브라우저 PWA (Next.js)]
   │  Supabase JS (Auth, Realtime 구독, 공개 테이블 읽기)
   │  Next.js Route Handlers / Server Actions (문제 요청, 제출 = 서버 전용 로직)
   ▼
[Next.js 서버 (Vercel 또는 Render)] ── service role ──▶ [Supabase Postgres]
                                                         │  pg_cron: 오늘의 문제, 주간 정산, 백분위 집계, 문제 생성 호출
                                                         ▼
                                              [Edge Function: generate-problems] ──▶ Claude API
                                              [Edge Function: send-push]        ──▶ Web Push
```
- 문제 생성(파라미터 템플릿)과 채점 로직은 **Next.js 서버에서 TypeScript로** 실행한다. 템플릿 코드를 클라이언트 번들에 넣지 않는다(`server-only` 패키지 사용).
- DB 쓰기 중 원자성이 필요한 부분(XP, 레벨, 레이팅 반영)은 Postgres 함수 `apply_attempt_result()` 하나로 처리한다. 계산은 TS에서 하고 결과값만 넘긴다.

## 2. 환경변수 (`.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # 서버 전용
ANTHROPIC_API_KEY=                  # Edge Function / 스크립트 전용
AI_MODEL=claude-sonnet-5-5
AI_JUDGE_MODEL=claude-haiku-5-5
AI_DAILY_LIMIT=100
NEXT_PUBLIC_ADSENSE_CLIENT=         # ca-pub-xxxx
NEXT_PUBLIC_ADS_ENABLED=false       # 개발 중 false
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
ADMIN_EMAILS=                       # 쉼표 구분, /admin 접근 허용
CRON_SECRET=                        # pg_cron → /api/cron/* 호출 검증
```

## 3. DB 스키마 (초기 마이그레이션 `0001_init.sql`)
```sql
-- 사용자 프로필 (auth.users 1:1)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text unique check (char_length(nickname) between 2 and 12),
  is_anonymous boolean not null default true,
  xp bigint not null default 0,
  level int not null default 1,
  rating int not null default 1000,
  rating_games int not null default 0,
  placement_done boolean not null default false,
  streak_days int not null default 0,
  streak_last_date date,                 -- KST 기준 마지막 풀이 날짜
  streak_freezes int not null default 0 check (streak_freezes between 0 and 2),
  suspicious boolean not null default false,
  created_at timestamptz not null default now()
);

-- 레이팅 버킷: 파라미터 템플릿은 (template_id, difficulty) 단위, AI 문제는 문제 단위
create table rating_buckets (
  id text primary key,                   -- 'tpl:logic.fake-coin:3' 또는 'prb:<problem uuid>'
  category text not null,
  rating int not null,
  games int not null default 0,
  correct int not null default 0,
  reports int not null default 0,
  status text not null default 'active'  -- active | quarantined | retired
);

-- 트랙 B: AI 원본 문제 (+ 승인 상태)
create table problems (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  difficulty int not null check (difficulty between 1 and 5),
  prompt text not null,
  figure text,
  answer_public jsonb not null,          -- 답 형식 정보만 (type, options) — 정답 값 제외
  hints jsonb not null,                  -- ["...", "..."]
  explanation text not null,
  key_insight text not null,
  tags text[] default '{}',
  status text not null default 'pending',-- pending | approved | rejected | quarantined | retired
  reject_reason text,
  source text not null default 'ai',
  created_at timestamptz not null default now()
);
-- 정답은 별도 테이블 (RLS로 모든 클라이언트 접근 차단)
create table problem_answers (
  problem_id uuid primary key references problems on delete cascade,
  answer jsonb not null,
  solution_code text
);

-- AI 스킨 (트랙 A 본문 변형)
create table template_skins (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  template_version int not null,
  prompt_template text not null,         -- {param} 자리표시자 포함
  status text not null default 'pending'
);

-- 사용자에게 내준 문제 인스턴스 (서버가 생성, 정답은 여기 저장)
create table served_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  mode text not null,                    -- practice | daily | placement
  session_id uuid not null,
  template_id text,                      -- 트랙 A
  template_version int,
  seed bigint,
  difficulty int not null,
  problem_id uuid references problems,   -- 트랙 B
  skin_id uuid references template_skins,
  bucket_id text not null references rating_buckets,
  public_payload jsonb not null,         -- 클라이언트에 보낸 그대로(prompt, figure, answer 형식)
  answer jsonb not null,                 -- 서버 전용
  hints jsonb not null,
  explanation text not null,
  key_insight text not null,
  hints_used int not null default 0,
  served_at timestamptz not null default now(),
  match_id uuid                          -- 향후 1:1 대결 확장용 (MVP 미사용)
);

-- 제출 기록
create table attempts (
  id uuid primary key default gen_random_uuid(),
  served_id uuid not null references served_problems on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  try_no int not null default 1,         -- 1 또는 2(재도전)
  input jsonb not null,
  result text not null,                  -- correct | partial | wrong
  elapsed_ms int not null,               -- 서버 계산
  xp_gained int not null default 0,
  rating_before int not null,
  rating_after int not null,
  created_at timestamptz not null default now(),
  unique (served_id, try_no)
);

-- 오늘의 문제
create table daily_challenges (
  date_kst date primary key,
  items jsonb not null                   -- [{template_id, version, seed, difficulty} | {problem_id}] x3
);
create table daily_entries (
  date_kst date not null,
  user_id uuid not null references profiles on delete cascade,
  correct_count int not null default 0,
  total_ms int not null default 0,
  finished_at timestamptz,
  primary key (date_kst, user_id)
);

-- XP 이벤트 (주간 랭킹 집계용)
create table xp_events (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  amount int not null,
  reason text not null,                  -- attempt | daily_bonus | placement
  created_at timestamptz not null default now()
);
create index on xp_events (created_at, user_id);

-- 주간 XP (빠른 랭킹 조회용, apply_attempt_result에서 갱신)
create table weekly_xp (
  week_start date not null,              -- 월요일(KST)
  user_id uuid not null references profiles on delete cascade,
  xp int not null default 0,
  primary key (week_start, user_id)
);

-- 실시간 피드 (레벨업, 승급, 오늘의 문제 만점)
create table activity_feed (
  id bigserial primary key,
  user_id uuid references profiles on delete cascade,
  kind text not null,                    -- title_up | tier_up | daily_perfect | streak_milestone
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table badges (
  user_id uuid references profiles on delete cascade,
  code text not null,                    -- daily_top3:2026-12-01, weekly_top10:..., streak_30 ...
  awarded_at timestamptz not null default now(),
  primary key (user_id, code)
);

create table reports (
  id bigserial primary key,
  served_id uuid references served_problems,
  bucket_id text references rating_buckets,
  user_id uuid references profiles,
  reason text,
  created_at timestamptz not null default now(),
  unique (served_id, user_id)
);

create table generation_jobs (
  id bigserial primary key,
  started_at timestamptz default now(),
  requested int, approved int, rejected int,
  input_tokens bigint, output_tokens bigint,
  log jsonb
);

create table percentile_snapshot (       -- 10분마다 재계산
  rating int primary key,
  percentile numeric not null            -- 상위 %
);

create table push_subscriptions (
  user_id uuid references profiles on delete cascade,
  endpoint text primary key,
  keys jsonb not null,
  created_at timestamptz default now()
);

create table events (                    -- 지표 수집
  id bigserial primary key,
  user_id uuid,
  name text not null,                    -- placement_start, placement_done, signup_linked, ad_impression, ad_reward ...
  props jsonb,
  created_at timestamptz default now()
);
```

### 3.1 RLS 정책 요약
| 테이블 | 클라이언트 읽기 | 클라이언트 쓰기 |
|---|---|---|
| profiles | 모두 읽기 가능(공개 컬럼 view `public_profiles`로 노출) | 본인 nickname만 update |
| served_problems, attempts | **차단** (서버 API만) | 차단 |
| problems, problem_answers, template_skins | 차단 | 차단 |
| rating_buckets | 차단 | 차단 |
| daily_entries, weekly_xp | 모두 읽기 (랭킹) | 차단 |
| activity_feed | 모두 읽기 | 차단 |
| badges | 모두 읽기 | 차단 |
| reports, events, push_subscriptions | 차단 | 서버 API 경유 |

모든 쓰기는 Next.js 서버에서 service role로만 한다. RLS는 "기본 거부"로 켜 두고 위의 읽기만 허용한다.

### 3.2 Postgres 함수
- `apply_attempt_result(p_served_id, p_try_no, p_input, p_result, p_xp, p_user_rating_after, p_bucket_rating_after, ...)`
  - 한 트랜잭션에서 attempts insert, profiles update(xp, level, rating, streak), rating_buckets update, xp_events, weekly_xp upsert, daily_entries 갱신, 필요 시 activity_feed insert까지 처리한다.
  - `profiles` 행을 `for update`로 잠근다.
- `rank_of(user_id)`: 각 랭킹 종류별 내 순위를 반환한다(`count(*)` 기반, 인덱스 사용).
- 인덱스: `profiles(xp desc)`, `profiles(rating desc) where rating_games >= 30`, `weekly_xp(week_start, xp desc)`, `daily_entries(date_kst, correct_count desc, total_ms asc)`

## 4. 서버 API (Next.js Route Handlers, 모두 인증 필요)
| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/session` | body `{mode, category?}` → `{sessionId}`. placement/daily 모드는 서버가 문제 목록을 확정한다 |
| POST | `/api/problem/next` | body `{sessionId}` → 다음 문제 public payload `{servedId, category, stars, prompt, figure?, answerFormat, hintCosts}`. **answer, hints 본문 미포함** |
| POST | `/api/problem/hint` | body `{servedId}` → 다음 힌트 텍스트. hints_used를 증가시킨다. 3단계면 정답을 공개한다 |
| POST | `/api/problem/submit` | body `{servedId, input}` → `{result, correctAnswer?(오답 확정 또는 정답 시), xpGained, level, leveledUp, titleChanged, rating, ratingDelta, ranks:{daily,weekly,level,rating}, rankJump?, explanation, keyInsight, canRetry}` |
| POST | `/api/problem/report` | body `{servedId, reason}` |
| GET | `/api/ranking?type=daily|weekly|level|rating` | 상위 100명과 내 순위 |
| POST | `/api/ads/reward` | body `{kind: 'hint'|'streak_freeze', servedId?, adToken}` → 보상 지급(§8) |
| POST | `/api/push/subscribe` | 웹 푸시 구독 저장 |
| GET | `/api/admin/*` | ADMIN_EMAILS만. 격리 문제 목록, 복구/폐기, 생성 로그, 지표 |

제출 처리 순서(`/api/problem/submit`):
1. served_problems를 로드해서 본인 것인지, 이미 최종 제출했는지, 재도전이 가능한지 확인한다.
2. `elapsed_ms = now() − served_at`(서버 시각)
3. `answer.ts`로 판정 → `game/xp.ts`, `game/rating.ts`, `game/level.ts`, `game/streak.ts`로 계산한다.
4. 어뷰징 체크(02 문서 §11) → 의심되면 레이팅 변화는 0으로 하고 profiles.suspicious를 표시한다.
5. `apply_attempt_result()` 호출
6. 응답을 반환한다. Realtime은 테이블 변경으로 자동 전파된다.

## 5. 문제 요청 처리 (`/api/problem/next`)
1. 모드별로 다음 문제 소스를 결정한다(연습: 02 문서 §6 출제 알고리즘, 오늘: daily_challenges, 배치고사: §7).
2. 트랙 A면 `registry.get(templateId).generate(seed, difficulty)`. 승인된 스킨이 있으면 50% 확률로 스킨 본문을 쓴다.
3. served_problems에 정답 포함 전체를 저장하고, public payload만 반환한다.
4. 응답 시간 목표 p95 200ms

## 6. 실시간 (Supabase Realtime)
| 채널 | 방식 | 용도 |
|---|---|---|
| `activity_feed` insert | Postgres Changes | 홈 레벨업 피드 |
| `daily_entries` (오늘 날짜) | Postgres Changes | 오늘의 문제 랭킹 실시간 갱신 |
| `weekly_xp` (이번 주) | Postgres Changes | 주간 랭킹 실시간 갱신 |
| `presence:playing` | Presence | "지금 n명이 푸는 중" (풀이 화면 진입 시 track) |

- 랭킹 화면은 처음 로드 시 `/api/ranking`으로 받은 뒤, 변경 이벤트를 받으면 해당 행만 갱신·재정렬한다. 화면에 없는 사용자가 100위 안으로 들어오면 목록을 다시 불러온다(5초 디바운스).
- 레벨/두뇌지수 랭킹은 profiles 변경 이벤트 양이 많으므로 Realtime 구독 대신 **10초 폴링**으로 갱신한다(비용 절감). 내 순위는 제출 응답에 포함된다.

## 7. 스케줄 작업 (pg_cron, 시간은 KST 기준으로 UTC 변환해 등록)
| 시각(KST) | 작업 |
|---|---|
| 매일 00:00 | 전날 오늘의 문제 순위 확정 → 상위 3명 배지. 새 daily_challenges 생성(서버 API `/api/cron/daily` 호출, 시크릿 헤더) |
| 매일 00:05 | 스트릭 처리: 어제 기록이 없는 사용자는 보호권 소모 또는 리셋 |
| 매주 월 00:00 | 주간 XP 순위 확정 → 상위 10명 배지 |
| 10분마다 | percentile_snapshot 재계산, 문제 자동 격리/은퇴 판정(03 문서 §5–6) |
| 매일 03:00 | Edge Function `generate-problems` 호출 |
| 매일 12:30 | 오늘의 문제 미참여자에게 푸시 (선택) |
| 매일 21:00 | 스트릭 위험 사용자에게 푸시 |

오늘의 문제 생성은 템플릿 코드가 필요하므로 Next.js의 `/api/cron/*` 엔드포인트로 구현하고, pg_cron은 `pg_net`으로 해당 URL을 호출한다(`CRON_SECRET` 헤더 검증). 환경변수에 `CRON_SECRET`을 추가한다.

## 8. 광고
### 8.1 1단계 (웹 PWA)
- **Google AdSense** 디스플레이 배너를 쓴다. `NEXT_PUBLIC_ADS_ENABLED`가 false면 회색 자리표시자를 렌더링한다.
- **보상형 광고**는 Google Ad Manager의 웹 보상형 광고(GPT `rewardedSlotReady`/`rewardedSlotGranted` 이벤트)를 쓴다. 승인 전에는 "광고 대신 5초 대기" 폴백으로 구현하고, 인터페이스를 동일하게 유지한다.
- 광고 컴포넌트는 `src/lib/ads/`에 둔다: `<BannerSlot placement="result" />`, `useRewardedAd()`

### 8.2 배치 규칙
| 위치 | 형식 | 규칙 |
|---|---|---|
| 결과 화면 하단 | 배너 | 매 결과마다 표시. 단, 첫 세션의 첫 5문제는 광고 없음 |
| 랭킹 화면 목록 중간(20위 뒤) | 배너 | 항상 |
| 오늘의 문제 종료 화면 | 배너 | 항상 |
| 힌트 무료 사용 | 보상형 | 힌트 1단계를 광고 시청 시 XP 감소 없이 제공. 하루 5회 |
| 스트릭 보호권 | 보상형 | 시청 1회당 1개, 최대 2개 보유 |
| 문제 풀이 화면, 레벨 체크 진행 중 | **금지** | — |

- 보상 지급은 서버에서 한다. 클라이언트가 `rewardedSlotGranted` 이벤트를 받으면 일회용 토큰(서버가 시청 시작 시 발급, 60초 유효)을 `/api/ads/reward`로 보낸다. 서버는 토큰과 일일 한도를 검증한다.
- `events`에 `ad_impression`, `ad_reward`를 기록해서 지표를 본다.

### 8.3 2단계 (앱)
- Capacitor로 포장하고 `@capacitor-community/admob`을 쓴다. `useRewardedAd()`의 구현만 플랫폼별로 교체한다.

## 9. 인증
- Supabase 익명 로그인으로 시작하고, 이후 `linkIdentity`로 카카오/구글을 연결한다. 기록은 같은 user id라서 유지된다.
- 카카오는 Supabase의 Kakao provider를 쓴다.
- 닉네임 미설정 사용자는 랭킹에 "익명 ○○○○"(id 앞 4자리)로 표시한다.
- 회원 탈퇴 시 profiles cascade 삭제, 랭킹에서 즉시 제거

## 10. 보안 체크리스트
- [ ] 클라이언트 번들에 템플릿 코드, 정답이 포함되지 않음(빌드 산출물 grep 테스트)
- [ ] public payload 직렬화 함수는 화이트리스트 방식(허용된 필드만 복사)
- [ ] 모든 API에서 served_problems.user_id = 요청자 확인
- [ ] 제출 rate limit(분당 20회, 사용자 기준)
- [ ] 닉네임 금칙어 필터(`src/lib/moderation/badwords.ts`)
- [ ] AI 생성 solutionCode는 QuickJS 샌드박스에서만 실행
- [ ] cron 엔드포인트는 `CRON_SECRET` 검증
- [ ] Supabase RLS 기본 거부 확인 테스트(익명 키로 차단 테이블 select 시 0행 또는 에러)

## 11. 성능 / 운영
- 목표: 제출 API p95 300ms, 랭킹 API p95 300ms
- 에러 모니터링: Sentry(무료 플랜)
- 백업: Supabase 일일 백업(기본)
- 개인정보처리방침, 이용약관 페이지를 `/legal/privacy`, `/legal/terms`에 정적 페이지로 둔다(AdSense 심사 필수).
