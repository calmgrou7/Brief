# Brief

1인 마케터를 위한 AI 광고 마케팅 운영 시스템.
기획 → 소재 제작 → 메타 광고 집행 → 재무 관리 → 성과 대시보드까지, 반복 업무는 에이전트가 맡고 사람은 승인만 합니다.

## 문서

- [기획서](docs/PLAN.md): 에이전트 정의, 화면 구성, 데이터 구조, KPI, 메타 API 연동, 로드맵
- [DB 스키마 초안](docs/schema.sql)

## 현재 단계: 1단계 성과 대시보드 MVP

| 화면 | 내용 |
|---|---|
| `/` 오늘의 결정함 | 데이터를 "오늘 누를 결정"으로 바꿔 돈 효과 순으로 정렬 (소재 중지·예산 증액·소재 교체·예산 조정). 승인/내일 다시/무시, 처리 기록과 되돌리기. 이번 달 숫자, 고객별 내 수수료, 고객별 현황 표 |
| `/clients/[id]` 고객 대시보드 (운영자용) | 이 고객의 결정, 기간 선택(7일/30일/이번 달), 직전 기간 대비 증감, 마케팅 퍼널, KPI, 일별 광고비·CPA 차트, 소재별 성과와 판정, **고객 리포트 링크 복사** |
| `/finance` 월말 정산 | 지난달·이번 달 고객별 광고비, 내 수수료, 비용, 남는 돈(이익률), 청구 합계와 상태. 고객별 비용(제작비·도구비) 입력 |
| `/finance/[고객]` 청구서 | 청구 내역(대납 광고비·수수료·부가세), 카톡·문자용 안내문 복사, 청구 상태(초안·보냄·입금 완료) |
| `/r/[링크]` 고객 공유 리포트 | 고객사가 자기 성과만 보는 화면. 쉬운 말 요약, 퍼널, KPI, 차트, 소재별 성과, 용어 설명. 수수료·결정·판정·다른 고객 정보 없음. 서명된 링크라 추측·위조 불가, 90일 후 만료 |

결정 승인은 지금은 기록만 남습니다. 메타에 실제로 반영하는 것은 4단계 집행 에이전트에서 연결합니다.

## 저장소 (Supabase)

`DATABASE_URL`이 있으면 Supabase(Postgres)에, 없으면 `.data/` 폴더의 파일에 저장합니다. 배포(Vercel 등)에서는 파일이 남지 않으므로 Supabase가 필요합니다.

1. Supabase에서 새 프로젝트를 만듭니다 (리전: Seoul).
2. SQL Editor에서 `supabase/migrations/` 안의 파일을 번호 순서대로 실행합니다.
3. 대시보드 Connect > Transaction pooler 연결 문자열을 `DATABASE_URL`에 넣습니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # KPI·수수료·메타 응답 변환 테스트
npm run build
```

설정이 없으면 **샘플 데이터**(가상 고객 3곳)로 실행됩니다.

## 실제 메타 광고계정 연결

1. 메타 비즈니스 관리자에서 시스템 사용자를 만들고 `ads_read` 권한 토큰을 발급합니다.
2. `.env.example`을 `.env.local`로 복사한 뒤 `META_ACCESS_TOKEN`을 입력합니다.
3. `clients.config.example.json`을 `clients.config.json`으로 복사한 뒤 고객 정보와 `metaAccountId`(`act_...`)를 입력합니다.
4. 서버를 다시 시작하면 상단 표시가 "메타 연결됨"으로 바뀝니다.

`clients.config.json`과 `.env.local`은 git에 올라가지 않습니다.

## 고객 리포트 링크

운영 서버에는 `.env.local`(또는 배포 환경변수)에 `REPORT_SECRET`을 16자 이상으로 꼭 설정하세요. 설정이 없으면 운영 모드에서 링크 기능이 꺼집니다. 이 값을 바꾸면 이미 보낸 링크가 모두 무효가 됩니다(링크별 폐기는 2단계).

## 운영자 로그인

운영자 화면(결정함, 고객 페이지)과 승인 버튼은 `OWNER_PASSWORD`(8자 이상)로 잠깁니다. 고객 리포트 링크는 로그인 없이 열립니다.

| 상황 | 동작 |
|---|---|
| `OWNER_PASSWORD` 설정 | 로그인해야 사용. 30일 유지, 상단 "로그아웃" |
| 미설정 + `npm run dev` | 잠금 없이 열림 (내 컴퓨터에서 개발용) |
| 미설정 + 운영 서버 | 운영자 화면 잠김, 로그인 화면에 설정 안내 |

비밀번호를 바꾸면 모든 기기의 로그인이 풀립니다.

## 구조

```
app/(owner)/         운영자 화면 (결정함, 고객 대시보드)
app/r/[token]/       고객 공유 리포트
app/login/           운영자 로그인
supabase/migrations/ DB 테이블 정의
components/          UI 조각, 차트, 숫자 표기
lib/kpi.ts           KPI 계산 (순수 함수)
lib/finance.ts       수수료·월말 예상·예산 페이스
lib/summary.ts       고객 요약, 소재 판정
lib/decisions.ts     오늘의 결정 생성과 돈 효과 계산
lib/decision-store.ts 결정 처리 기록 (Supabase 또는 로컬 파일)
lib/billing.ts       청구서·고객별 이익 계산
lib/finance-store.ts 비용·청구 상태 저장 (Supabase 또는 로컬 파일)
lib/performance.ts   기간별 성과 묶음 (운영자 페이지·고객 리포트 공용)
lib/report.ts        고객 리포트 요약 문장
lib/report-link.ts   고객 리포트 링크 서명·검증
lib/session.ts       운영자 로그인 세션 서명·검증
lib/auth.ts          로그인 확인·쿠키 (운영자 화면·서버 액션에서 호출)
lib/db.ts            Supabase(Postgres) 연결 (없으면 로컬 파일)
lib/data.ts          데이터 출처 선택 (샘플 / 메타)
lib/meta/            Meta Graph API 호출과 응답 변환
lib/sample-data.ts   샘플 데이터 생성기
```
