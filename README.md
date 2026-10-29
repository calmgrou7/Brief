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
| `/clients/[id]` 고객 대시보드 | 이 고객의 결정, 기간 선택(7일/30일/이번 달), 직전 기간 대비 증감, 마케팅 퍼널, KPI, 일별 광고비·CPA 차트, 소재별 성과와 판정 |

결정 승인은 지금은 기록만 남습니다(`.data/decisions.json`). 메타에 실제로 반영하는 것은 4단계 집행 에이전트에서 연결합니다.

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

## 구조

```
app/                 화면 (Next.js App Router)
components/          UI 조각, 차트, 숫자 표기
lib/kpi.ts           KPI 계산 (순수 함수)
lib/finance.ts       수수료·월말 예상·예산 페이스
lib/summary.ts       고객 요약, 소재 판정
lib/decisions.ts     오늘의 결정 생성과 돈 효과 계산
lib/decision-store.ts 결정 처리 기록 (로컬 파일 → 2단계에서 Supabase)
lib/data.ts          데이터 출처 선택 (샘플 / 메타)
lib/meta/            Meta Graph API 호출과 응답 변환
lib/sample-data.ts   샘플 데이터 생성기
```
