# 상권첫걸음 (가칭)

부산 카페 예비창업자가 후보 입지 두 곳을 같은 기준으로 비교하고 답사 체크리스트를 얻는 모바일 웹 → 앱인토스 미니앱.
기획서: [docs/mvp-spec.md](docs/mvp-spec.md)

## 이 저장소에 있는 것 (기획서 9.2절 0·4·6단계의 기반)

| 경로 | 내용 |
|---|---|
| `contracts/analysis.ts` | 분석 API 응답 계약. 화면(Lovable)과 서버가 공유하는 단일 기준 |
| `fixtures/*.json` | 계약을 따르는 **가상 데이터** (`is_fixture: true`). Lovable 화면 초안에 그대로 사용 |
| `src/metrics.ts` | 반경 집계·A/B 비교. null/0/미수집 구분, 경위도 뒤바뀜 검출. PostGIS 결과 대조용 독립 계산 |
| `src/ai-guard.ts` | AI 출력 검증기(근거 ID·금지 주장·LLM 숫자 차단) + 규칙형 대체 요약 |
| `scripts/d1-probe.ts` | 1주차 게이트: 상가정보 API 키로 카페 공식 코드 확인·부산 표본 3곳 완전성 검사 |

## 사용

```bash
npm test                 # Node 22.18+ (의존성 없음)
npm run fixtures         # fixtures/*.json 재생성
DATA_GO_KR_KEY=... npm run probe:d1
```

API 키는 환경변수로만 전달하며 출력·저장하지 않는다. 원본 응답은 `data/probe/`(git 제외)에 저장된다.
