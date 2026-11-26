# 03. 문제 엔진 — 템플릿, AI 생성, 자동 검증

1인 운영의 핵심 모듈이다. 목표는 **사람이 문제를 쓰거나 검수하지 않아도** 매일 정확한 문제가 무한히 공급되는 것이다.

## 1. 문제 공급 트랙 2개
| 트랙 | 방식 | 정답 신뢰도 | 비용 | 비중(MVP) |
|---|---|---|---|---|
| **A. 파라미터 템플릿** | 코드가 변수를 바꿔 문제를 즉석 생성하고, 정답도 코드가 계산 | 100% (코드) | 0원 | 약 80% |
| **B. AI 원본 문제** | AI가 새 문제를 만들고, 3중 자동 검증을 통과한 것만 승인 | 높음 (검증 통과분만) | API 비용 | 약 20% |

추가로 트랙 A에는 **AI 스킨** 기능이 있다. 수학 구조와 정답은 코드가 정하고, AI는 문제의 "이야기"만 바꾼다(예: 동전 → 금괴, 저울 → 양팔 천칭). 숫자와 정답은 AI가 건드릴 수 없다.

## 2. 템플릿 인터페이스 (트랙 A)
```ts
// src/lib/problems/types.ts
export type Category = 'logic' | 'pattern' | 'geometry' | 'probability' | 'estimate';

export type Answer =
  | { type: 'integer'; value: number }
  | { type: 'decimal'; value: number; tolerance: number }          // |x - value| <= tolerance
  | { type: 'fraction'; num: number; den: number }                 // 기약분수로 비교, 동치 분수 허용
  | { type: 'choice'; options: string[]; correctIndex: number }
  | { type: 'sequence'; value: string }                            // 공백 제거 후 문자열 비교
  | { type: 'estimate'; value: number; fullFactor: number; partialFactor: number };

export interface ProblemInstance {
  templateId: string;
  seed: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  params: Record<string, number | string>;
  prompt: string;                 // 한국어 본문 (마크다운 허용)
  figure?: string;                // 선택: SVG 문자열 (기하 템플릿)
  answer: Answer;                 // 서버 전용. 클라이언트 응답에서 반드시 제거
  hints: [string, string];        // 힌트 1, 힌트 2 (힌트 3 = 정답 공개)
  explanation: string;            // 해설
  keyInsight: string;             // "생각의 핵심" 한 줄
}

export interface ProblemTemplate {
  id: string;                     // 예: 'logic.fake-coin'
  category: Category;
  version: number;                // 템플릿 수정 시 +1 (기존 기록 보존)
  minSolveSeconds: number;        // 어뷰징 판정용
  difficulties: Array<1|2|3|4|5>; // 지원하는 난이도
  generate(seed: number, difficulty: 1|2|3|4|5): ProblemInstance;
  verify(params: ProblemInstance['params']): Answer;   // generate와 다른 방법(브루트포스/시뮬레이션)으로 정답 재계산
}
```
규칙:
- `generate`는 **결정적**이어야 한다. 같은 `(seed, difficulty)`면 항상 같은 결과가 나와야 하며, `rng.ts`의 mulberry32를 쓴다.
- `verify`는 **다른 방법으로** 정답을 구한다. 공식으로 계산했다면 verify는 브루트포스, 전수 탐색, 몬테카를로 등으로 구한다. 몬테카를로는 허용 오차를 둔다.
- 속성 테스트: 난이도별 시드 1..1000에서 `generate().answer`와 `verify(params)`가 일치해야 한다.
- 숫자 범위는 "계산기 없이" 원칙을 지킨다. 각 템플릿 명세(04 문서)의 범위를 따른다.

## 3. 답 판정 (`answer.ts`)
- 입력 정규화: 전각 → 반각, 쉼표/공백 제거, "만/억" 단위 해석(추정 문제)
- integer: 정확히 일치
- decimal: 허용 오차 이내
- fraction: 사용자 입력을 약분해서 비교. 소수 입력도 허용하며 오차 1e-3 이내면 정답
- choice: 인덱스 비교
- sequence: 공백 제거 후 비교
- estimate: 비율 `r = max(x/v, v/x)`. `r ≤ fullFactor`면 정답, `r ≤ partialFactor`면 부분 정답, 그 외는 오답 (기본값 fullFactor=2, partialFactor=4)
- 반환값: `{ result: 'correct' | 'partial' | 'wrong' }`

## 4. AI 생성 파이프라인 (트랙 B + 스킨)
Supabase Edge Function `generate-problems`를 pg_cron으로 매일 03:00 KST에 실행한다.
수동으로 돌릴 때는 `pnpm gen:problems`를 쓴다.

```
[1] 재고 확인 ──▶ [2] 생성 요청 ──▶ [3] 3중 검증 ──▶ [4] 저장(status) ──▶ [5] 실사용 모니터링
```

**[1] 재고 확인**: 카테고리 × 별(1~5) 조합별로 승인된 트랙 B 문제 중 "아직 노출 30회 미만"인 것이 30개보다 적으면 부족분만 생성한다. 하루 생성 상한은 `AI_DAILY_LIMIT`(기본 100개)로 비용을 통제한다.

**[2] 생성 요청**: AI에 아래 JSON 스키마로 응답하게 한다(structured output / tool use 사용).
```json
{
  "category": "logic",
  "difficulty": 3,
  "prompt": "문제 본문(한국어, 300자 이내, 계산기 불필요)",
  "answer": { "type": "integer", "value": 22 },
  "hints": ["힌트1", "힌트2"],
  "explanation": "해설",
  "keyInsight": "생각의 핵심 한 줄",
  "solutionCode": "function solve() { /* 정답을 계산해 반환하는 순수 JS */ return 22; }",
  "tags": ["clock", "relative-speed"]
}
```
생성 프롬프트 요건:
- 성인 대상 두뇌 퍼즐. 공식 암기가 아니라 통찰로 풀리는 문제
- 계산기 불필요, 답은 하나로 정해질 것(모호한 표현과 함정 질문 금지)
- 이미 있는 문제와 겹치지 않도록 같은 카테고리 최근 문제 제목 50개를 "피해야 할 목록"으로 넣는다
- 정치, 종교, 폭력, 실존 인물·브랜드 언급 금지
- 예시로 04 문서 템플릿 2~3개를 few-shot으로 넣는다

**[3] 3중 자동 검증** (모두 통과해야 `approved`)
1. **코드 검증**: `solutionCode`를 샌드박스(QuickJS WASM, 시간 1초, 메모리 32MB, 네트워크/파일 접근 없음)에서 실행해서 결과가 `answer`와 일치하는지 확인한다.
2. **독립 풀이 검증**: 별도 AI 호출에 **정답을 숨긴 채로** 문제만 주고 풀게 한다. 이 과정을 2회 반복하며, 둘 다 `answer`와 일치해야 한다(추정형은 fullFactor 이내).
3. **품질 판정**: AI 심사 호출로 아래를 점수화(1~5)한다. 모두 4 이상이어야 통과한다.
   - 답의 유일성(모호하지 않은가), 계산기 없이 가능한가, "아하" 요소, 난이도 표기의 적절성, 한국어 자연스러움
4. 추가 규칙 검사(코드): 본문 길이, 금칙어, 기존 문제와의 유사도(임베딩 또는 정규화 텍스트 3-gram Jaccard > 0.6이면 중복으로 거절)

실패하면 `status='rejected'`와 `reject_reason`을 기록한다. 실패한 문제를 고쳐서 재시도하지 않고 버린다(단순함 우선).

**AI 스킨(트랙 A)**: 템플릿마다 사전에 스킨 50개를 배치로 생성해 `template_skins`에 저장한다. 스킨은 `{변수}` 자리표시자가 들어간 본문 텍스트다. 검증 방법은 다음과 같다. 자리표시자가 모두 존재하는지, 숫자 리터럴이 새로 추가되지 않았는지 정규식으로 확인하고, 원본 문장과 같은 문제인지 AI 심사 1회로 판정한다.

**[4] 저장**: `problems` 테이블. `status ∈ {pending, approved, rejected, quarantined, retired}`

## 5. 난이도 자동 보정
- 트랙 B 문제의 초기 레이팅은 AI가 표기한 difficulty로 정한다(`700 + 200×d`).
- 풀이가 쌓이면 Elo(02 문서 §5)로 레이팅이 자동 조정되고, 별 표시도 레이팅을 따라 바뀐다.
- 풀이 100회 이상인데 정답률이 3% 미만이거나 97% 초과면 `retired`로 처리한다(너무 어렵거나 너무 쉬운 문제).

## 6. 실사용 모니터링과 자동 격리
- 사용자 신고 3건 이상, 또는 신고율 5% 이상(노출 20회 이상일 때)이면 자동으로 `quarantined` 처리하고 출제를 중단한다.
- 정답률 이상치 감지: 레이팅 대비 기대 정답률보다 실제 정답률이 40%p 이상 낮으면(노출 30회 이상) 자동 격리한다. 정답이 틀렸을 가능성이 높기 때문이다.
- 격리된 문제는 `/admin`에서 운영자가 "복구 / 폐기" 버튼 하나로 처리한다. 하루 1~2분이면 되도록 한다.
- 격리된 문제로 바뀐 사용자 기록은 소급 보정하지 않는다(단순함 우선). 다만 해당 문제의 오답으로 잃은 두뇌지수는 복구한다(`rating_events` 역적용).

## 7. 비용 가드
- 환경변수 `AI_DAILY_LIMIT`, `AI_MODEL`, `AI_JUDGE_MODEL`(검증용, 더 저렴한 모델 사용 가능)
- 생성 1건당 호출 수: 생성 1 + 독립 풀이 2 + 품질 판정 1 = 4회
- `generation_jobs` 테이블에 토큰 사용량을 기록하고 `/admin`에 월 누적 비용을 표시한다.
