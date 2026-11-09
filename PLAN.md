# 알바 급여·주휴수당 계산기 — 제품/개발 기획서

> 이 문서는 **Codex(코딩 에이전트)가 그대로 따라 구현**하도록 쓴 실행 명세다.
> 마일스톤(§10) 단위로 하나씩 Codex에 맡기고, 각 단계의 완료 조건을 확인한 다음 다음 단계로 넘어간다.
> 기준일: 2026-11-09

---

## 1. 한 줄 정의

소상공인 사장님이 **시급·요일별 근무시간만 넣으면** 주휴수당, 주급·월급, 가산수당, 공제액, 실수령액을 바로 보여주는 모바일 웹앱(PWA).

## 2. 왜 하는가 (1인 사업자 관점)

| 항목 | 내용 |
|---|---|
| 수요 | 매년 최저임금이 바뀔 때마다(7~8월 고시, 1월 시행) "주휴수당 계산", "최저시급 월급" 검색이 몰린다. 매년 반복되는 수요다. |
| 운영 부담 | 계산 로직은 한 번만 만들면 된다. 해마다 **`src/rates.js`의 숫자 몇 개만 바꾸면 끝**난다. |
| 비용 | 정적 사이트라 GitHub Pages나 Cloudflare Pages에 올리면 서버비가 0원이다. |
| 수익 | 1단계는 광고(AdSense), 2단계는 구독(Pro)이다. §8 참고. |
| 자동화 | 매년 고시 시기에 "요율 갱신" 이슈가 자동으로 만들어지고, 테스트를 통과하면 자동 배포된다. §9 참고. |

## 3. 타깃 사용자 및 핵심 시나리오

- **주 사용자**: 직원 5인 미만 또는 5인 이상의 카페, 편의점, 음식점 사장님. 모바일로 쓴다.
- **보조 사용자**: 내 급여가 맞는지 확인하려는 알바생.

핵심 시나리오:
1. 사장님이 새 알바의 월 인건비를 미리 계산해 본다. → 월급과 사업주 부담분까지 확인한다.
2. 주 15시간 경계를 확인한다. → "주휴수당 발생 여부"를 즉시 보여준다.
3. 급여일에 실수령액을 계산하고 결과를 알바에게 카톡으로 보낸다. → "결과 복사/공유" 버튼을 쓴다.
4. 최저임금 위반 여부를 점검한다. → 입력한 시급이 해당 연도 최저임금보다 낮으면 경고한다.

## 4. 기술 스택 (결정 사항)

- **빌드 없는 정적 웹앱**: HTML + CSS + 바닐라 JS(ES Modules)로 만든다. 프레임워크와 번들러는 쓰지 않는다.
  - 이유: 유지보수할 의존성이 0개이고, 매년 숫자만 바꾸면 되며, 어떤 정적 호스팅에도 올라간다.
- **테스트**: Node 20+ 내장 `node:test`와 `node:assert`를 쓴다. npm 패키지는 설치하지 않는다.
- **PWA**: `manifest.webmanifest`와 간단한 `sw.js`(오프라인 캐시)를 둬서 홈 화면에 앱처럼 추가할 수 있게 한다.
- **호스팅**: GitHub Pages에 GitHub Actions로 배포한다.
- **추후 앱스토어**: 필요할 때 Capacitor나 TWA로 감싸서 Play 스토어에 올린다. 코드는 그대로 둔다.

## 5. 디렉토리 구조

```
/
├─ index.html              # 단일 페이지 UI
├─ style.css
├─ app.js                  # DOM 바인딩만 담당 (계산 로직 금지)
├─ src/
│  ├─ rates.js             # ★ 연도별 요율 테이블 — 매년 이 파일만 수정
│  └─ calc.js              # 순수 함수 계산 엔진 (DOM 접근 금지)
├─ test/
│  └─ calc.test.js         # §7 테스트 벡터 전부 포함
├─ manifest.webmanifest
├─ sw.js
├─ icons/                  # 192, 512 png
├─ .github/workflows/
│  ├─ ci.yml               # push/PR마다 node --test
│  ├─ deploy.yml           # main push → 테스트 통과 시 Pages 배포
│  └─ yearly-rates.yml     # 매년 8/6 "요율 갱신" 이슈 자동 생성
├─ AGENTS.md
└─ PLAN.md
```

## 6. 데이터 및 계산 명세

### 6.1 `src/rates.js` — 연도별 요율 (단일 진실 공급원)

```js
// 출처는 반드시 주석으로 남긴다. provisional: true 는 미확정 값 → UI에 "잠정" 배지 표시.
export const RATES = {
  2026: {
    minWage: 10320,                       // 최저임금위원회 고시
    pension: 0.0475,                      // 국민연금 근로자 부담 (총 9.5%의 1/2)
    health: 0.03595,                      // 건강보험 근로자 부담 (총 7.19%의 1/2)
    ltcRatio: 0.1314,                     // 장기요양 = 건강보험료 × 13.14%
    employment: 0.009,                    // 고용보험 근로자 부담
    pensionBase: { min: 400000, max: 6370000 }, // 기준소득월액 하한/상한(근사)
    provisional: [],
  },
  2027: {
    minWage: 10700,                       // 2026.7 의결, 2026.8.5 고시 (+3.7%)
    pension: 0.05,                        // 총 10% (연금개혁 법정 일정)
    health: 0.03595,                      // 7.19% 동결 (2026.9.8 건정심 의결)
    ltcRatio: 0.1314,                     // ⚠ 2027 미확정 → 2026값 임시 사용
    employment: 0.009,                    // ⚠ 미확정 → 2026값 임시 사용
    pensionBase: { min: 400000, max: 6370000 },
    provisional: ['ltcRatio', 'employment', 'pensionBase'],
  },
};
export const DEFAULT_YEAR = () => {
  const y = new Date().getFullYear();
  return RATES[y] ? y : Math.max(...Object.keys(RATES).map(Number));
};
```

### 6.2 입력 모델

```js
{
  year: 2027,
  hourlyWage: 10700,
  over5: true,                 // 상시근로자 5인 이상 여부 (가산수당 적용 기준)
  week: [                      // 월~일 7개. 휴게시간 제외 실근로시간
    { hours: 8, nightHours: 0 },   // nightHours: 22:00~06:00 사이 근로시간
    ...
  ],
  deduction: 'none' | 'tax33' | 'insurance',
}
```

### 6.3 계산 규칙 (근로기준법 기준, 모든 함수는 순수 함수)

**상수**: `WEEKS_PER_MONTH = 365 / 7 / 12` (약 4.345)

1. **주 소정근로시간**: `contractHours = Σ min(h, 8)`, 최대 40. 1일 8시간을 넘는 부분은 연장근로라서 소정근로에 넣지 않는다.
2. **총 근로시간**: `totalHours = Σ h`
3. **주휴수당**
   - 조건: `contractHours >= 15`. 개근은 전제로 하고 UI에 안내 문구를 둔다.
   - `paidHolidayHours = min(contractHours, 40) / 40 × 8`
   - `weeklyHolidayPay = paidHolidayHours × wage`
4. **연장근로시간** (5인 이상일 때만 가산)
   - `dailyOT = Σ max(0, h − 8)`
   - `weeklyOT = max(0, Σ min(h, 8) − 40)`
   - `overtimeHours = dailyOT + weeklyOT`
   - `overtimePremium = overtimeHours × wage × 0.5`
5. **야간근로 가산** (5인 이상일 때만): `nightPremium = Σ nightHours × wage × 0.5`. 연장 가산과 중복으로 붙는다.
6. **5인 미만**: `overtimePremium = nightPremium = 0`. 시간당 기본급(100%)은 그대로 지급한다.
7. **주급**: `basePay = totalHours × wage`, `weeklyGross = basePay + weeklyHolidayPay + overtimePremium + nightPremium`
8. **월급**
   - `monthlyHours = round((contractHours + paidHolidayHours) × WEEKS_PER_MONTH)`. 주 40시간이면 209시간이 된다.
   - `monthlyBase = monthlyHours × wage` (소정근로와 주휴를 합한 월 기본급)
   - `monthlyExtra = round((overtimeHours × wage + overtimePremium + nightPremium) × WEEKS_PER_MONTH)`
     - 연장근로 시간 자체에 대한 100% 임금도 여기에 포함된다.
   - `monthlyGross = monthlyBase + monthlyExtra`
9. **공제** (월급 기준, 각 항목은 **10원 미만 절사**: `floor10(x) = Math.floor(x / 10) * 10`)
   - `none`: 0원
   - `tax33`: 소득세 `floor10(gross × 0.03)`, 지방소득세 `floor10(소득세 × 0.1)`
   - `insurance`:
     - 국민연금 `floor10(clamp(gross, base.min, base.max) × pension)`
     - 건강보험 `floor10(gross × health)`
     - 장기요양 `floor10(건강보험료 × ltcRatio)`
     - 고용보험 `floor10(gross × employment)`
     - 근로소득세(간이세액표)는 MVP에서 계산하지 않는다. UI에 "근로소득세 별도"라고 표시한다.
10. **실수령액**: `net = monthlyGross − 공제 합계`
11. **최저임금 경고**: `hourlyWage < RATES[year].minWage`이면 `warnings`에 `'BELOW_MIN_WAGE'`를 넣는다.
12. **참고 경고**: 주 15시간 미만이면 `'NO_WEEKLY_HOLIDAY'`, 4대보험을 골랐는데 월 60시간 미만이면 `'INSURANCE_MAY_NOT_APPLY'`를 넣는다.

### 6.4 출력 모델 (`calculate(input)` 반환값)

```js
{
  weekly: { contractHours, totalHours, paidHolidayHours, basePay,
            weeklyHolidayPay, overtimeHours, overtimePremium, nightPremium, gross },
  monthly: { hours, base, extra, gross },
  deductions: { items: [{ key, label, amount }], total },
  net,
  warnings: [],          // 위 코드 문자열 배열
  provisional: [],       // 해당 연도 rates.provisional 그대로
}
```
모든 금액은 원 단위 정수다. 중간 계산은 실수로 하고, 최종 표시값만 `Math.round`한다(공제는 10원 절사).

## 7. 테스트 벡터 (`test/calc.test.js`에 전부 구현, 기대값 고정)

| # | 입력 | 기대값 |
|---|---|---|
| T1 | 2027, 10,700원, 5인↑, 월~금 8h | 주휴 8h, 주휴수당 85,600, 주급 513,600, 월 209h, 월급 **2,236,300** |
| T2 | 2027, 10,700원, 월~금 4h (주 20h) | 주휴 4h, 월 104h, 월급 **1,112,800** |
| T3 | 2027, 10,700원, 월~금 3h (주 15h) | 주휴 3h (경계값 포함), 월 78h, 월급 834,600 |
| T4 | 2027, 10,700원, 주 14h | 주휴 0, 경고 `NO_WEEKLY_HOLIDAY`, 월 61h, 월급 652,700 |
| T5 | 2027, 10,700원, 5인↑, 월~금 10h | 소정 40h, 연장 10h, 연장가산 53,500/주, 기본급 535,000, 주휴 85,600 |
| T6 | T5와 같고 5인 미만 | 연장가산 0, 기본급 535,000 |
| T7 | 2027, 5인↑, 월~금 8h, 각 nightHours 2 | 야간가산 53,500/주 |
| T8 | T2 + `tax33` | 소득세 33,380, 지방세 3,330, 합계 36,710, 실수령 **1,076,090** |
| T9 | T1 + `insurance` | 연금 111,810 / 건강 80,390 / 요양 10,560 / 고용 20,120 / 합계 222,880 / 실수령 **2,013,420** |
| T10 | 2027, 시급 10,000원 | 경고 `BELOW_MIN_WAGE` |
| T11 | 2026, 10,320원, 월~금 8h | 월급 2,156,880 |
| T12 | `DEFAULT_YEAR()` | 존재하는 연도를 반환한다. RATES의 모든 연도에 필수 키가 있다(스키마 테스트). |

## 8. UI/UX 명세

모바일 우선(360px 기준)이고 단일 화면이다. 다크모드를 지원한다(`prefers-color-scheme`).

**입력 영역** (위에서 아래 순서)
1. 연도 선택: 기본값은 `DEFAULT_YEAR()`다. 선택하면 "2027 최저시급 10,700원"을 표시한다.
2. 시급 입력과 `[최저시급 적용]` 버튼. 숫자에 천 단위 콤마를 넣는다.
3. 사업장 규모 토글: `5인 미만 / 5인 이상`. ⓘ 툴팁으로 "5인 이상만 연장·야간 50% 가산"이라고 안내한다.
4. 요일별 근무표: 월~일 7행, 각 행에 `근무시간`, `야간(22~06시)`을 둔다. 빠른 입력 프리셋도 둔다.
   - 프리셋: `주5일 8h`, `주5일 4h`, `주말 8h`, `초기화`
5. 공제 방식: `없음 / 3.3% / 4대보험`

**결과 영역** (입력이 바뀌면 즉시 다시 계산하고, 계산 버튼은 두지 않는다)
- 큰 숫자로 **월 예상 실수령액**을 보여준다. 그 아래에 월 총액, 공제 합계를 둔다.
- 카드 3장
  - 주휴수당: 발생 여부 배지와 금액
  - 주급 내역
  - 월급 내역: 월 환산시간 포함
- 공제 상세 표. 잠정 요율이면 "잠정" 배지를 붙인다.
- 경고 배너: 최저임금 미달은 빨강, 그 밖의 안내는 노랑.
- `[결과 복사]` 버튼: 카톡에 붙여넣기 좋은 텍스트 요약을 만든다. `[공유]` 버튼은 Web Share API가 있을 때만 보인다.
- 하단 고지: "본 계산은 참고용이며 법적 효력이 없습니다. 근로소득세 간이세액은 포함되지 않습니다."

**상태 저장**: 마지막 입력값을 `localStorage`에 저장한다. 읽기와 쓰기는 모두 `try/catch`로 감싼다.

## 9. 수익화 설계

| 단계 | 시점 | 내용 | 구현 포인트 |
|---|---|---|---|
| 1. 광고 | 출시 직후 | 결과 카드 아래, 페이지 하단에 AdSense를 단다. | `<div class="ad-slot" data-slot="result-bottom">` 자리만 미리 만들어 둔다. 광고 ID는 `config.js`의 상수로 둔다. CLS를 막기 위해 높이를 고정한다. |
| 2. 유입 | 출시~ | SEO 랜딩 문구를 넣는다: "2027 주휴수당 계산기", "최저시급 월급 계산" | `<title>`, meta description, OG 태그, FAQ 섹션(JSON-LD `FAQPage`) |
| 3. 구독(Pro) | 월 방문 1만 이상일 때 | 알바 여러 명 저장, 월별 급여대장, **급여명세서 PDF 발송**(2021년부터 의무), 광고 제거 | 버튼만 노출하는 "Pro 대기자 신청" 폼(이메일 수집)으로 수요를 먼저 검증한다. 결제는 토스페이먼츠 정기결제를 쓰고 백엔드는 Supabase를 쓴다. **MVP에서는 구현하지 않는다.** |

## 10. 자동화 (운영 시간을 0에 가깝게)

1. **`ci.yml`**: push나 PR이 오면 `node --test`를 돌린다.
2. **`deploy.yml`**: main에 push되면 테스트를 돌리고, 통과하면 GitHub Pages에 배포한다(`actions/deploy-pages`).
3. **`yearly-rates.yml`**: `cron: '0 0 6 8 *'`(매년 8월 6일, 최저임금 고시 다음 날)에 실행한다.
   - 내용: `gh issue create`로 "🗓 {내년} 요율 갱신" 이슈를 만든다(`permissions: issues: write`).
   - 이슈 본문에 체크리스트를 넣는다: 최저임금(8월), 건강보험료율(9월), 장기요양·고용보험(10~12월), `provisional` 비우기, 테스트 T11처럼 해당 연도 벡터 추가.
   - 9월 15일과 12월 15일에도 리마인더를 보낸다(같은 워크플로에 cron을 여러 개 등록).
4. **연도 누락 방지 테스트**: 오늘이 9월 이후인데 `RATES[올해+1]`이 없으면 `console.warn`을 출력한다. 실패 처리는 하지 않는다.
5. **Codex로 갱신**: 이슈가 생기면 Codex에 다음과 같이 지시한다. "이 이슈의 체크리스트대로 `src/rates.js`에 {연도}를 추가하고 테스트를 추가해." 이 지시 하나로 갱신이 끝난다.

## 11. 마일스톤 (Codex 작업 단위)

각 단계를 별도 작업으로 Codex에 요청한다. **완료 조건을 만족해야 다음 단계로 넘어간다.**

### M1. 계산 엔진 + 테스트
- 요청 프롬프트: "PLAN.md §6, §7대로 `src/rates.js`, `src/calc.js`, `test/calc.test.js`를 만들어. DOM 코드는 금지야."
- 완료 조건: `node --test`에서 T1~T12가 전부 통과한다.

### M2. UI
- 요청 프롬프트: "PLAN.md §8대로 `index.html`, `style.css`, `app.js`를 만들어. 계산은 `src/calc.js`만 호출해."
- 완료 조건: 모바일 360px에서 가로 스크롤이 없다. 입력을 바꾸면 결과가 즉시 갱신된다. 결과 복사가 동작한다.

### M3. PWA + SEO
- 내용: manifest, sw.js, 아이콘, meta/OG, FAQ JSON-LD
- 완료 조건: Lighthouse에서 PWA 설치가 가능하고 SEO 점수가 90 이상이다.

### M4. CI/CD + 연례 자동화
- 내용: §10의 워크플로 3개
- 완료 조건: PR에서 CI가 녹색이다. main push로 Pages 배포가 성공한다. `workflow_dispatch`로 이슈 생성을 수동 테스트한다.

### M5. 광고 슬롯 + Pro 대기자 폼
- 내용: §9의 1단계와 3단계(폼만)
- 완료 조건: 광고 자리 때문에 레이아웃이 밀리지 않는다(CLS 0.1 미만).

### (후속) M6. 확장 후보
- 휴일근로 가산(8h 이내 50%, 초과 100%)
- 근로소득세 간이세액표
- 퇴직금 계산
- 급여명세서 PDF
- 여러 알바 관리(Pro)

## 12. 범위 밖 / 주의사항

- 이 앱은 노무 자문이 아니다. 모든 화면에 참고용이라는 고지를 둔다.
- "3.3% 공제"는 원래 사업소득자에게 적용하는 방식이다. 근로자에게 쓰면 문제가 될 수 있다는 안내 툴팁을 둔다.
- 개인정보는 수집하지 않는다. 모든 계산은 브라우저 안에서 한다. Pro 대기자 이메일만 예외이며 동의 문구를 둔다.
- 요율의 출처 URL은 `rates.js` 주석에 남긴다.

## 13. 연간 운영 캘린더

| 시기 | 할 일 | 소요 |
|---|---|---|
| 7월 중순 | 최저임금 의결. 블로그나 SNS 콘텐츠에 활용 | – |
| 8월 6일 | 자동 이슈 생성. 최저임금을 반영하고 `provisional` 표시 | 10분 |
| 9월 | 건강보험료율 확정을 반영 | 5분 |
| 10~12월 | 장기요양·고용보험 확정, 국민연금 기준소득월액을 반영하고 `provisional`을 비움 | 5분 |
| 1월 1일 | 기본 연도가 자동으로 바뀌는지 확인 (`DEFAULT_YEAR`) | 1분 |
