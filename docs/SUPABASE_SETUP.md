# Supabase 서버 연결 가이드 (chaeumpartners07@gmail.com 계정 · 프로젝트 bridgenode)

코드는 이미 서버 연동이 끝난 상태입니다. 아래 순서대로 하면 실제 회원가입·랭킹·서버 채점이 켜집니다.
**소요 시간: 약 10분**

> **현재 상태 (2026-11-08 연결 완료)**
> - 프로젝트: `bridgenode` · ref `bzebdwvpmsaejkmnsoef` · 서울(ap-northeast-2) · 무료 플랜
> - URL: `https://bzebdwvpmsaejkmnsoef.supabase.co`
> - 적용된 마이그레이션: `0001_init` → `0002_seed_problems`(40문제) → `0003_hardening`
> - 실서버 테스트 통과: 가입(확인 메일) → 로그인 → 풀이(오답/정답·XP·레이팅) → 대결 5라운드(승리·전적 반영) → 직접 공격 차단
> - 남은 일: 배포 주소가 정해지면 3번의 **Site URL** 설정, 배포 서비스에 환경변수 2개 등록

## 1. 프로젝트 만들기
1. https://supabase.com 에 **chaeumpartners07@gmail.com** 으로 로그인
2. **New project** → 이름 `bridgenode`, Region **Northeast Asia (Seoul)**, DB 비밀번호는 비밀번호 관리자에 저장
3. 무료 플랜은 *실행 중인 프로젝트 2개까지* 무료입니다. 이 계정에서 처음 만드는 프로젝트라면 비용이 들지 않습니다.

## 2. 데이터베이스 만들기 (SQL 2개 실행)
Supabase 대시보드 → **SQL Editor** → New query 에서 순서대로 붙여 넣고 **Run**:
1. `supabase/migrations/0001_init.sql` — 표, 권한, 채점·대결·심사 함수
2. `supabase/migrations/0002_seed_problems.sql` — 기본 문제 40개
3. `supabase/migrations/0003_hardening.sql` — 보안 점검(advisors) 반영: 함수 search_path 고정, 외래키 인덱스

> 문제은행(`src/data/problems.ts`)을 수정했다면 `npm run seed:gen` 으로 2번 파일을 다시 만든 뒤 실행하세요. 같은 ID는 덮어쓰기 됩니다.

## 3. 로그인 설정
**Authentication → Sign In / Providers → Email**
- *Confirm email* 켜기 권장 (가짜 계정으로 랭킹 오염 방지). 가입 시 확인 메일이 발송되고, 링크를 누른 뒤 로그인합니다.
- **Authentication → URL Configuration → Site URL** 에 배포 주소(예: `https://bridgenode.vercel.app`)를 넣으세요. 확인 메일 링크가 이 주소로 돌아옵니다.

## 4. 앱에 키 넣기
**Project Settings → API** 에서 두 값을 복사해 프로젝트 루트에 `.env.local` 파일을 만듭니다:
```
VITE_SUPABASE_URL=https://<프로젝트ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable 또는 anon 키>
```
- 이 키는 **공개용**이라 브라우저에 노출돼도 괜찮습니다. 점수·정답은 서버 함수와 권한(RLS)이 보호합니다.
- **service_role / secret 키는 절대 넣지 마세요.**
- 배포 서비스(Vercel/Netlify)에는 같은 이름의 환경변수 2개를 등록하면 됩니다.

## 5. 확인
```bash
npm run dev
```
로그인 화면 아래 "데모(로컬 저장) 모드" 문구가 사라지면 서버 모드입니다.

## 운영하면서 바꿀 값
SQL Editor에서 실행:
```sql
-- 출제자가 늘면 승인 기준을 순찬성 3표로
update app_config set value = '3' where key = 'review_threshold';
-- 출제 권한 레벨 조정
update app_config set value = '10' where key = 'composer_level';
```

## 보안 구조 요약
| 항목 | 보호 방식 |
|---|---|
| 정답·해설 | 컬럼 권한으로 클라이언트 조회 차단. 정답 제출·해설 보기 함수로만 받음 |
| XP·레이팅·전적 | 표 직접 수정 금지. `submit_answer`, `duel_answer` 등 서버 함수만 변경 |
| 대결 시간 | 서버 시계로 계산 (클라이언트가 보낸 남은 시간은 무시), 상대 AI 결과도 서버가 생성 |
| 대결 중도 이탈 | 새 대결 시작 시 이전 대결은 남은 라운드 0점으로 자동 종료 |
| 출제·심사 | 서버에서 레벨 확인, 본인 문제 투표 불가, 대기 중 출제 10개 제한 |
| 내부 함수 | `finalize_duel`, `bump_streak` 등은 로그인 사용자도 직접 호출 불가 (실행 권한 회수) |

### 보안 점검(advisors)에서 남는 항목 — 의도된 상태
- **RLS Enabled No Policy** (`app_config`, `reviews`): 정책이 없어 클라이언트가 직접 읽을 수 없음. 함수로만 접근.
- **Signed-In Users Can Execute SECURITY DEFINER Function** (8개): `submit_answer`·`start_duel` 등 앱이 호출하는 공개 API. 함수 안에서 `auth.uid()`로 본인 확인.

## 로컬 검증 방법 (개발자용)
`supabase/tests/` 의 SQL은 일반 Postgres에서 Supabase 인증을 흉내 내 전체 시나리오를 검증합니다.
```bash
createdb mg_test
psql -d mg_test -f supabase/tests/00_local_auth_stub.sql
psql -d mg_test -f supabase/migrations/0001_init.sql
psql -d mg_test -f supabase/migrations/0002_seed_problems.sql
psql -d mg_test -f supabase/migrations/0003_hardening.sql
psql -d mg_test -f supabase/tests/10_scenario.sql
```
