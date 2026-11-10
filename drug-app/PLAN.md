# 약궁합 — 같이 먹으면 안 되는 약 확인 앱 기획서

> 이 문서는 **Codex(코딩 에이전트)가 그대로 따라 구현**하도록 쓴 실행 명세다.
> 마일스톤(§13) 단위로 하나씩 Codex에 맡기고, 각 단계의 완료 조건을 확인한 다음 다음 단계로 넘어간다.
> 가칭: **약궁합** · 타깃: 30~60대 · 수익: 광고 · 데이터: 식약처 공공데이터(의약품 API) · 기준일: 2026-11-09

---

## 1. 한 줄 정의

먹고 있는 약을 이름이나 낱알 모양으로 담으면, 식약처 DUR 공공데이터를 바탕으로 아래 항목을 **신호등(빨강·노랑·초록)으로 한눈에** 보여주는 무료 앱(웹 + PWA, 이후 스토어 앱).

- **같이 먹으면 안 되는 조합**(병용금기)
- **같은 성분 중복**(예: 감기약과 해열진통제의 아세트아미노펜 중복)
- **효능군 중복**
- **나이·임신 주의**

## 2. 왜 하는가 (1인 사업자 관점)

| 항목 | 내용 |
|---|---|
| 수요 | "타이레놀 감기약 같이", "○○ 같이 먹으면 안 되는 약" 같은 검색이 꾸준하다. 약 이름 수만 개가 곧 롱테일 검색어다. |
| 원가 | 데이터는 무료 공공데이터(공공누리)다. 서버는 정적 페이지 + Supabase 무료 플랜으로 시작한다. |
| 운영 | 데이터 갱신은 **GitHub Actions 야간 배치가 자동으로** 처리한다. 사람이 손댈 일이 거의 없다. |
| 수익 | 약 이름별 정적 페이지 수만 개로 SEO 유입을 받고 AdSense를 단다. 앱(PWA → 스토어)에서는 AdMob을 쓴다. 복약 알림으로 재방문을 만들어 광고 노출을 늘린다. |
| 차별점 | 기존 공공 서비스(의약품안전나라, e약은요)는 **한 번에 한 약씩** 보여준다. 이 앱은 **내 약통 전체를 한 번에** 교차 점검하고, 가족별로 관리한다. |

## 3. 타깃과 핵심 시나리오 (30~60대)

- **페르소나 A, 40대 직장인 자녀**: 부모님이 여러 병원에서 받은 약과 영양제를 같이 드셔서 걱정이다. 가족 프로필을 쓴다.
- **페르소나 B, 30대 맞벌이**: 감기 걸린 날 집에 있는 상비약을 같이 먹어도 되는지 바로 알고 싶다.
- **페르소나 C, 50~60대 만성질환자**: 혈압약, 당뇨약을 복용하면서 새로 받은 약과 문제가 없는지 확인하고 싶다. 큰 글씨 모드가 필요하다.

| # | 시나리오 | 목표 |
|---|---|---|
| S1 | 약 2개를 검색해서 담음 → 결과 신호등 확인 | 30초 |
| S2 | "엄마 약통"에 처방약 5개를 저장해 두고, 새 약을 추가할 때마다 자동 재점검 | – |
| S3 | 약 이름을 모를 때 낱알 모양·색·각인으로 찾기 | 1분 |
| S4 | 검색엔진에서 "판콜 타이레놀 같이" 검색 → 약 상세 페이지 유입 → 내 약통에 담기 | – |
| S5 | 결과 화면을 캡처하거나 링크로 약사·가족에게 공유 | – |

## 4. 사용할 공공데이터 (식품의약품안전처, 공공데이터포털)

> ✅ **2026-11-10 검증 완료**: 아래 6개 주소 모두 공공데이터포털 명세(Swagger)로 확인했다. 인증키 없이 실제 호출하면 `SERVICE_KEY_IS_NULL`(키 없음)이 응답되어, 엔드포인트가 살아 있음을 확인했다. 세부 필드는 **부록 A**에 정리했다.
> 공통 Base URL: `https://apis.data.go.kr/1471000/` · 공통 파라미터: `serviceKey`(필수), `pageNo`, `numOfRows`, `type=json`

| 용도 | 데이터셋 (포털 ID) | 서비스 경로 | 사용할 operation |
|---|---|---|---|
| **성분 단위 DUR** (교차 점검 엔진의 핵심) | DUR 성분정보 ([15056780](https://www.data.go.kr/data/15056780/openapi.do)) | `DURIrdntInfoService03` | `getUsjntTabooInfoList02` 병용금기 · `getPwnmTabooInfoList02` 임부 · `getSpcifyAgrdeTabooInfoList02` 연령 · `getOdsnAtentInfoList02` 노인 · `getCpctyAtentInfoList02` 용량 · `getMdctnPdAtentInfoList02` 투여기간 · `getEfcyDplctInfoList02` 효능군중복 |
| **제품 단위 DUR**, 제품 → DUR 성분코드 매핑 | DUR 품목정보 ([15059486](https://www.data.go.kr/data/15059486/openapi.do)) | `DURPrdlstInfoService03` | `getUsjntTabooInfoList03` 등 9개(위와 같은 유형 + `getSeobangjeongPartitnAtentInfoList03` 서방정분할 + `getDurPrdlstInfoList03` 품목) |
| 일반의약품 쉬운 설명 | e약은요 ([15075057](https://www.data.go.kr/data/15075057/openapi.do)) | `DrbEasyDrugInfoService` | `getDrbEasyDrugList` |
| **같은 성분 과량 판단** | 성분별 1일 최대투여량 ([15098095](https://www.data.go.kr/data/15098095/openapi.do)) | `DayMaxDosgQyByIngdService` | `getDayMaxDosgQyByIngdInq` |
| 제품 → 주성분·함량, 전문/일반 | 의약품 제품 허가정보 ([15095677](https://www.data.go.kr/data/15095677/openapi.do)) | `DrugPrdtPrmsnInfoService08` | `getDrugPrdtPrmsnInq08` 목록 · `getDrugPrdtPrmsnDtlInq08` 상세 · `getDrugPrdtMcpnDtlInq08` **주성분 상세(함량)** |
| 낱알 모양으로 약 찾기, 약 사진 | 낱알식별 ([15057639](https://www.data.go.kr/data/15057639/openapi.do)) | `MdcinGrnIdntfcInfoService03` | `getMdcinGrnIdntfcInfoList03` |

예시 호출: `https://apis.data.go.kr/1471000/DURIrdntInfoService03/getUsjntTabooInfoList02?serviceKey={KEY}&type=json&pageNo=1&numOfRows=100`

**검증하면서 확인한 설계상 주의점**
1. **e약은요에는 성분 필드가 없다.** e약은요의 필드는 제품명, 업체, 품목기준코드, 문항 텍스트, 이미지뿐이다. 성분은 반드시 허가정보나 DUR 품목정보에서 `itemSeq`로 조인해서 가져온다.
2. **성분코드 체계가 데이터셋마다 다를 수 있다.**
   - DUR 쪽은 `INGR_CODE`, 1일 최대투여량은 `CPNT_CD`, 허가 주성분은 `MTRAL_CODE`를 쓴다.
   - 세 코드가 같은 체계인지 M0에서 실제 샘플로 확인한다.
   - 다르면 영문 성분명(`INGR_ENG_NAME` / `DRUG_CPNT_ENG_NM` / `MAIN_INGR_ENG`)을 정규화해서 매핑 테이블을 만든다.
3. **제품 → DUR 성분 매핑**: DUR 품목정보 응답에 `ITEM_SEQ`와 `INGR_CODE`가 함께 있다. DUR 대상 제품은 이 응답으로 직접 매핑하는 것을 1순위로 한다.
4. **삭제된 규칙 걸러내기**: 성분정보 응답의 `DEL_YN`(상태)으로 삭제된 규칙을 제외한다.
5. **증분 동기화**: 품목정보 계열은 `start_change_date`, `end_change_date` 파라미터를 지원한다. 일일 배치는 변경분만 받는다.
6. **http 금지**: 주소는 https로 호출한다.

- **활용신청**: 공공데이터포털에 회원가입하고 각 API를 활용신청하면 개발계정 키가 발급된다. 대부분 자동 승인이다.
  - 트래픽 한도를 넘으면 운영계정으로 전환을 신청한다. 이때 활용사례를 등록해야 한다.
- **출처 표시**: 모든 화면 하단에 "자료: 식품의약품안전처 (공공데이터포털)"을 쓰고, 데이터 기준일을 함께 표시한다.
- **장애 대비**: 공공데이터 API는 장기 중단 사례가 있었다(2025년 국정자원관리원 화재 이후 일부 서비스 불가 안내).
  - 그래서 **앱은 API를 실시간으로 호출하지 않는다.**
  - 대신 야간 배치로 자체 DB에 미러링하고, 앱은 자체 DB만 조회한다.
  - 원천 API가 멈춰도 마지막으로 성공한 데이터로 서비스는 계속된다.

## 5. 기술 스택 (결정 사항)

| 영역 | 선택 | 이유 |
|---|---|---|
| 웹/앱 | **Next.js 15 (App Router) + TypeScript** | 약 상세 페이지 수만 개를 SSG/ISR로 만들어 SEO에 유리하다 |
| UI | Tailwind CSS. **큰 글씨 모드**, 고대비 | 50~60대 사용성 |
| DB | **Supabase Postgres** (`pg_trgm` + 초성 검색 컬럼) | 무료로 시작, 검색 성능 |
| 데이터 동기화 | Node 스크립트 + **GitHub Actions cron** | 서버 없이 자동 갱신 |
| 내 약통 저장 | **기기 로컬(IndexedDB)이 기본** | 건강정보는 민감정보라서 MVP는 서버에 저장하지 않는다(§14) |
| 앱 배포 | 1단계 PWA, 2단계 **Capacitor**로 Android·iOS 스토어 출시 + AdMob | 코드 재사용 |
| 알림 | PWA 웹푸시, 앱은 로컬 알림 | 복약 알림 |
| 테스트 | Vitest(엔진 단위), Playwright(S1 E2E) | |
| 모니터링 | Sentry 무료 플랜, 배치 실패 시 이메일 알림 | |

## 6. 디렉토리 구조

```
/
├─ app/
│  ├─ page.tsx                       # 홈: 검색 + 내 약통 + 점검 결과
│  ├─ drug/[itemSeq]/page.tsx        # 약 상세 (SSG/ISR, SEO 핵심)
│  ├─ ingredient/[code]/page.tsx     # 성분 상세: "○○ 성분 같이 먹으면 안 되는 약"
│  ├─ identify/page.tsx              # 낱알 모양으로 찾기
│  ├─ check/page.tsx                 # 공유 링크용 결과 (약 목록을 쿼리스트링으로)
│  └─ api/search/route.ts            # 자동완성 검색
├─ lib/
│  ├─ engine/                        # ★ 교차 점검 엔진 (순수 함수, DB 접근 금지)
│  │  ├─ check.ts
│  │  ├─ rules/                      # contraindication, duplicate, efficacyGroup, profile
│  │  └─ types.ts
│  ├─ search/chosung.ts              # 초성 추출, 검색어 정규화
│  ├─ db/                            # Supabase 쿼리
│  └─ storage/cabinet.ts             # 로컬 약통 (IndexedDB)
├─ scripts/sync/                     # 공공데이터 → DB 동기화 배치
│  ├─ fetchAll.ts                    # 페이지네이션, 재시도, 원본 JSON 저장
│  ├─ normalize.ts                   # 원본 → 정규화 테이블
│  └─ sources.ts                     # ★ API 엔드포인트, 필드 매핑 (단일 진실 공급원)
├─ supabase/migrations/
├─ docs/api-samples/                 # M0에서 저장한 실제 응답 샘플, 필드 매핑 문서
├─ tests/fixtures/                   # 엔진 테스트용 가상 데이터
├─ AGENTS.md
└─ PLAN.md
```

## 7. 데이터 모델 (Supabase Postgres)

```sql
drugs            (item_seq pk, item_name, item_name_chosung, entp_name, etc_otc   -- 전문/일반
                  , image_url, efcy, use_method, atpn, intrc, se, deposit       -- e약은요 문항
                  , updated_at)
ingredients      (ingr_code pk, name_ko, name_en)
drug_ingredients (item_seq, ingr_code, amount, unit, pk(item_seq, ingr_code))
dur_pairs        (ingr_a, ingr_b, reason, notice_date, pk(ingr_a, ingr_b))        -- 병용금기 (a<b로 정렬 저장)
dur_ingr_rules   (ingr_code, type, detail, age_limit, notice_date)
                  -- type: PREGNANCY | ELDERLY | AGE | DOSE | DURATION | EFFICACY_GROUP
dur_efficacy_grp (ingr_code, group_name)                                          -- 효능군중복
max_daily_dose   (ingr_code, route, max_amount, unit)
pill_ident       (item_seq, shape, color_front, color_back, print_front, print_back, line_front, image_url)
sync_runs        (id, source, started_at, finished_at, rows, status, error)       -- 배치 이력
```

- **모든 연결의 키**: 품목기준코드(`item_seq`)와 성분코드(`ingr_code`). 실제 필드명은 M0에서 확정해서 `scripts/sync/sources.ts`에 매핑한다.
- **병용금기는 성분 쌍 단위로 저장한다.** 제품 쌍 단위로 저장하면 조합이 폭증한다. 판정할 때는 제품 → 성분으로 펼쳐서 확인한다.
- **매핑 실패 처리**: 성분 코드가 없는 제품은 성분 한글명을 정규화해서 매칭한다. 그래도 실패하면 `unmapped`로 표시하고 결과에 "일부 성분 정보 없음"을 보여준다.

## 8. 교차 점검 엔진 명세 (`lib/engine`, 순수 함수)

### 8.1 입력과 출력

```ts
interface CabinetDrug { itemSeq: string; name: string; ingredients: { code: string; name: string; amount?: number; unit?: string }[];
                        etcOtc: 'ETC' | 'OTC'; dailyCount?: number; }      // dailyCount: 하루 복용 횟수(선택)
interface Profile { age?: number; pregnant?: boolean; }
interface RuleData { pairs; ingrRules; efficacyGroups; maxDailyDose; }     // DB에서 미리 조회해 주입

type Level = 'DANGER' | 'CAUTION' | 'INFO';
interface Finding { level: Level; type: string; drugs: string[]; ingredients: string[];
                    title: string; detail: string; source: 'DUR' | 'E_DRUG' | 'COMPUTED'; }

function check(drugs: CabinetDrug[], profile: Profile, data: RuleData): {
  findings: Finding[];          // level → type 순서로 정렬
  summary: 'RED' | 'YELLOW' | 'GREEN';
  unmapped: string[];           // 성분 정보가 없는 약
}
```

### 8.2 규칙 (모두 `lib/engine/rules/*`에 하나씩)

| # | 규칙 | 판정 | 레벨 |
|---|---|---|---|
| R1 | **병용금기**: 서로 다른 두 약의 성분 쌍이 `dur_pairs`에 있음 (순서 무관) | 해당 두 약과 사유를 표시 | DANGER |
| R2 | **동일 성분 중복**: 같은 `ingr_code`가 2개 이상의 약에 들어 있음 | 중복 성분과 해당 약을 표시 | CAUTION |
| R3 | **1일 최대량 초과 가능성**: R2에 해당하고, 용량과 `dailyCount`가 모두 있으며, Σ(용량 × 횟수)가 `max_daily_dose`보다 큼 | 계산 근거를 표시 | DANGER |
| R4 | **효능군 중복**: 서로 다른 성분이 같은 `group_name`에 속함 | | CAUTION |
| R5 | **임부금기**: `profile.pregnant`이고 성분에 PREGNANCY 규칙이 있음 | | DANGER |
| R6 | **특정연령 금기**: `profile.age`가 규칙의 연령 조건에 해당함 | | DANGER |
| R7 | **노인주의**: `profile.age >= 65`이고 ELDERLY 규칙이 있음 | | CAUTION |
| R8 | **용량·투여기간 주의**: 성분에 DOSE 또는 DURATION 규칙이 있음 | 안내 문구 | INFO |
| R9 | **e약은요 상호작용 문구**: 일반의약품의 `intrc` 텍스트를 그대로 보여줌 (파싱하지 않음) | | INFO |

- **summary**: DANGER가 하나라도 있으면 `RED`, CAUTION이 있으면 `YELLOW`, 그 밖에는 `GREEN`.
- **초록 문구 주의**: "안전합니다"라고 쓰지 않는다. **"공공 DUR 기준으로 확인된 금기 조합은 없어요"**라고 쓴다(§14).
- **같은 약을 두 번 담은 경우**: 중복으로 경고하지 않고 하나로 합친다.

### 8.3 테스트 벡터 (`tests/fixtures`의 **가상 성분**으로 작성. 실제 의학 판단을 테스트에 하드코딩하지 않는다)

| # | 입력 | 기대값 |
|---|---|---|
| E1 | 약 X(성분 A), 약 Y(성분 B), pairs에 (A,B) | R1 DANGER 1건, summary RED |
| E2 | E1과 같고 pairs에 (B,A)로 저장 | 순서와 무관하게 동일한 결과 |
| E3 | 약 X(A), 약 Z(A, C) | R2 CAUTION (성분 A, 약 X·Z), summary YELLOW |
| E4 | E3 + 용량 X: A 500mg×3회, Z: A 325mg×3회, max A = 4000mg | 합계 2,475mg → R3 없음 |
| E5 | E4에서 X를 A 1000mg×3회로 변경 | 합계 3,975mg → R3 없음 (경계값 미만) |
| E6 | E4에서 X를 A 1000mg×4회로 변경 | 합계 4,975mg → R3 DANGER |
| E7 | 성분 C, D가 같은 효능군 | R4 CAUTION |
| E8 | 임부 프로필 + 성분 A에 PREGNANCY 규칙 | R5 DANGER |
| E9 | 65세 + ELDERLY 규칙 / 64세 | 65세는 R7 CAUTION, 64세는 없음 |
| E10 | 같은 itemSeq를 두 번 담음 | R2가 발생하지 않음 |
| E11 | 금기가 전혀 없는 3개 약 | findings 0건, GREEN |
| E12 | 성분 정보가 없는 약 1개 포함 | `unmapped`에 표시되고, 나머지 약은 정상 판정 |

### 8.4 실데이터 스모크 테스트 (M2 이후, DB 연결 상태에서)

다음 조합에서 R2(아세트아미노펜 중복)가 나와야 한다.
- 타이레놀정500mg + 판콜에이내복액
- 타이레놀정500mg + 판피린큐
- 타이레놀정500mg + 화이투벤큐

실제 성분 구성은 M0 데이터로 확인한 뒤 테스트를 확정한다. 데이터상 성분이 다르면 이 테스트에서 해당 조합을 뺀다.

## 9. 검색 명세

- **자동완성**: 제품명 부분일치(`pg_trgm`), 초성 검색("ㅌㅇㄹㄴ" → 타이레놀), 띄어쓰기와 괄호 무시.
- **정렬**: 정확일치 → 일반의약품 우선 → 이름 길이 짧은 순.
- **결과 행**: 낱알 이미지 썸네일, 제품명, 업체명, 전문/일반 배지.
- **낱알 식별**: 모양 아이콘 선택 → 색상 칩 → 각인 텍스트(선택) → 후보 그리드.
- **오타 보정**: 결과가 0건이면 유사어를 제안한다(trigram similarity 상위 5개).

## 10. 화면과 UX 명세

모바일 360px 우선이다. **큰 글씨 토글**(기본 17px → 21px)과 고대비를 지원하고, 다크모드도 지원한다.

1. **홈**
   - 상단에 검색창을 두고 "약 이름을 입력하거나 모양으로 찾기"라고 안내한다.
   - 그 아래에 **현재 약통**을 둔다(가족 탭: 나 / 엄마 / 아빠 / +추가). 담긴 약은 칩으로 보여준다.
   - 약이 2개 이상이면 그 아래에 **점검 결과**를 자동으로 보여준다.
2. **점검 결과**
   - 큰 신호등과 한 줄 요약을 보여준다. 예: "같이 먹으면 안 되는 조합 1건, 성분 중복 1건"
   - Finding 카드: 레벨 색, 해당 약 2개, 사유, 출처 배지(DUR / e약은요)
   - 카드 하단에 항상 다음 문구를 둔다: "복용 중인 약을 임의로 중단하지 말고 의사·약사와 상담하세요"
   - `[결과 공유]` 버튼: `/check?items=...` 링크를 만들고, 개인 프로필은 포함하지 않는다. `[약사에게 보여주기]`는 큰 글씨 전체화면이다.
3. **약 상세 `/drug/[itemSeq]`** (SEO 페이지)
   - H1은 "{제품명} 성분·효능·같이 먹으면 안 되는 약"이다.
   - 내용: 성분표, 효능, 사용법, 주의사항, 상호작용, 부작용, 보관법(e약은요)
   - **이 약의 성분과 병용금기인 성분 목록**과, 그 성분을 포함한 대표 제품 링크
   - `[내 약통에 담기]` CTA
   - 메타 정보: title, description, `Drug` 구조화 데이터(JSON-LD), 데이터 기준일
4. **성분 상세 `/ingredient/[code]`**: 이 성분이 들어 있는 제품 목록, 병용금기 성분, 1일 최대량.
5. **복약 알림 (M5)**: 약통의 약별로 시간을 설정하고 로컬 알림을 보낸다. 알림을 열면 앱이 실행되어 재방문으로 이어진다.
6. **프로필 (선택)**: 나이와 임신 여부. 기기에만 저장하고, 입력하지 않으면 R5~R7은 건너뛴다.

## 11. 수익화: 광고

| 위치 | 형식 | 규칙 |
|---|---|---|
| 약 상세·성분 상세 페이지 (웹) | AdSense 본문 중간 1개, 하단 1개 | 수익의 핵심(SEO 유입) |
| 홈 하단 | 배너 1개 | |
| 앱 (Capacitor) | AdMob 배너 + 가끔 전면광고(점검 3회당 최대 1회, 결과를 보여준 **뒤**) | 결과보다 먼저 전면광고를 띄우지 않는다 |
| **금지 위치** | 점검 결과의 DANGER·CAUTION 카드 사이, 경고 문구 주변 | 신뢰와 오클릭 방지 |

- **광고 카테고리 차단**: AdSense/AdMob에서 의약품, 건강기능식품, 병원, 의료 시술 광고를 차단한다.
  - 이유: 약 정보 옆에 의약품 광고가 붙으면 특정 제품을 권유하는 것처럼 보일 수 있다. 의약품 광고에는 규제가 있다(전문의약품은 대중광고 금지).
- **(후속) 광고 제거 인앱결제**: 연 4,900원. 광고 외 수익이 필요할 때만 검토한다.
- **트래픽 레버**: 약 상세 페이지 수만 개 × 롱테일 검색어, "감기약 같이 먹어도 되나요" 같은 FAQ 콘텐츠, 공유 링크.

## 12. 데이터 동기화 배치 (자동화)

| 작업 | 주기 | 내용 |
|---|---|---|
| `sync-dur` | 매일 03:00 KST | DUR 성분·품목 정보 전체 수집 → upsert |
| `sync-drugs` | 매주 일요일 04:00 | 허가정보, e약은요, 낱알식별, 1일 최대량 |
| `revalidate` | 동기화 직후 | 바뀐 `item_seq`만 Next.js ISR on-demand revalidate |
| `health` | 동기화마다 | 행 수가 직전 대비 20% 넘게 감소하면 **반영하지 않고 중단**하고 이메일 알림 (API 장애·빈 응답 방어) |

- **구현**
  - `scripts/sync/fetchAll.ts`: `pageNo` 루프, `numOfRows=100`, 실패하면 2s → 4s → 8s → 16s 간격으로 재시도.
  - 원본 JSON은 Supabase Storage에 날짜별로 보관한다(30일).
- **DB 반영 방식**: 정규화 결과를 스테이징 테이블에 넣고, 검증을 통과하면 트랜잭션으로 교체한다. 반쪽짜리 데이터가 노출되지 않게 하기 위해서다.
- **비밀값**: `DATA_GO_KR_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 GitHub Secrets에 둔다.
- **CI**: PR마다 `pnpm lint && pnpm test`를 돌리고, main에 push하면 Vercel에 배포된다.
- **주간 리포트 메일**: 매주 월요일에 다음 지표를 보낸다.
  - 동기화 성공률
  - 신규·변경 품목 수
  - 방문자(Vercel Analytics)
  - 광고 수익은 수동 확인

## 13. 마일스톤 (Codex 작업 단위)

각 단계를 별도 작업으로 요청하고, **완료 조건을 만족해야 다음 단계로 넘어간다.**

### M0. API 탐색 (가장 먼저)
- 프롬프트: "PLAN.md §4와 부록 A의 operation을 `DATA_GO_KR_KEY`로 실제 호출해서 응답 샘플을 `docs/api-samples/*.json`에 저장하고, 필드 매핑을 `docs/api-samples/README.md`에 정리해. 각 operation의 전체 건수(totalCount)를 기록하고, `INGR_CODE`·`CPNT_CD`·`MTRAL_CODE`가 같은 코드 체계인지 실제 값으로 비교해."
- 완료 조건:
  - 6개 데이터셋의 샘플과 매핑 문서가 있다.
  - §7 스키마의 각 컬럼이 어느 API의 어떤 필드에서 오는지 표로 정리되어 있다.
  - §7과 다른 점이 있으면 PLAN 수정안을 함께 제시한다.

### M1. 교차 점검 엔진 + 테스트
- 프롬프트: "PLAN.md §8대로 `lib/engine`과 vitest 테스트(E1~E12)를 만들어. DB와 UI는 만들지 마."
- 완료 조건: `pnpm test`가 전부 통과한다.

### M2. DB 스키마 + 동기화 배치
- 내용: §7 마이그레이션, §12의 `fetchAll`·`normalize`·health check, GitHub Actions cron.
- 완료 조건: 로컬에서 전체 동기화가 성공하고 `sync_runs`에 기록된다. §8.4 스모크 테스트가 통과한다.

### M3. 검색 + 홈 + 점검 결과 UI
- 완료 조건: 초성 검색이 동작한다. S1을 30초 안에 할 수 있다. 큰 글씨 모드가 동작한다. Playwright S1이 통과한다.

### M4. SEO 페이지 + 광고 슬롯
- 내용: `/drug`, `/ingredient` SSG/ISR, sitemap(분할), JSON-LD, AdSense 슬롯, 카테고리 차단 체크리스트.
- 완료 조건: Lighthouse SEO 95 이상, 광고 영역 때문에 CLS가 0.1을 넘지 않는다. sitemap이 Search Console에 제출 가능하다.

### M5. 가족 약통 + 낱알 식별 + 복약 알림 + PWA
- 완료 조건: S2, S3이 동작한다. 오프라인에서도 저장된 약통과 마지막 점검 결과를 볼 수 있다.

### M6. 스토어 앱 (Capacitor + AdMob)
- 완료 조건: Android 내부 테스트 트랙에 업로드된다. 로컬 알림과 AdMob 테스트 광고가 동작한다.

### (후속) 확장 후보
- 약봉투·처방전 사진 OCR로 한 번에 담기
- 건강기능식품과 약의 주의 정보(별도 공공데이터 검토)
- 약국 찾기(심평원 데이터)
- 보호자 공유(가족 간 약통 동기화, 동의 기반)

## 14. 법·안전 주의사항 (반드시 UI에 반영)

1. **의료 판단을 대체하지 않는다.**
   - 모든 결과 화면에 고정 문구를 둔다: "이 정보는 식약처 공공 DUR 데이터를 바탕으로 한 참고용이며, 진단이나 처방을 대신하지 않습니다. 복용 중인 약을 임의로 끊거나 바꾸지 말고 의사·약사와 상담하세요."
2. **"안전하다"는 표현을 금지한다.** 초록 결과는 "확인된 금기 조합 없음"으로만 쓴다. 데이터에 없는 위험이 있을 수 있다는 점을 함께 안내한다.
3. **복용법을 지시하지 않는다.** "드세요", "끊으세요" 같은 지시형 문구를 쓰지 않는다. 공공데이터 원문 표현을 우선한다.
4. **의료기기 해당 여부를 확인한다.** 공공 정보를 그대로 조회·표시하는 수준을 유지한다. 개인 맞춤 진단이나 용량 처방 기능을 추가하기 전에는 식약처 "의료기기 소프트웨어 / 웰니스 판단기준"을 검토한다.
5. **민감정보**: 복용 약과 임신 여부는 개인정보보호법상 **민감정보(건강)**다.
   - MVP는 **기기 로컬에만 저장**하고, 서버로 전송하지 않는다.
   - 공유 링크에는 약 목록만 넣고 프로필은 넣지 않는다.
   - 나중에 서버 동기화를 추가하면 별도 동의를 받고 암호화한다. 개인정보처리방침도 갱신한다.
6. **출처와 기준일**: 공공누리 출처 표시, 데이터 기준일, "식약처 데이터 반영 지연이 있을 수 있음"을 표시한다.
7. **광고**: 의약품·의료 광고 카테고리를 차단하고, 경고 카드 주변에는 광고를 두지 않는다(§11).
8. **앱스토어 심사**: 의료 정보 앱은 출처와 면책 고지를 요구받는다. 앱 설명과 첫 화면에 출처를 명시한다.

## 15. 핵심 지표 (KPI)

| 지표 | 목표(출시 6개월) |
|---|---|
| 월 방문자 (SEO 포함) | 10만 명 |
| 색인된 약 상세 페이지 | 2만 개 이상 |
| 점검 1회 이상 한 사용자 비율 | 40% 이상 |
| 약통 저장 사용자의 7일 재방문율 | 25% 이상 (복약 알림 효과) |
| 동기화 배치 성공률 | 99% 이상 |
| 페이지 RPM | 측정 후 목표 설정 |

## 16. 범위 밖 (MVP에서 하지 않음)

- 처방전 OCR, 의사·약사 상담 연결
- 건강기능식품 DB
- 회원가입과 서버 저장 (MVP는 로컬 전용)
- 약 가격·약국 재고
- 영어 등 다국어

---

## 부록 A. API 응답 필드 (2026-11-10 공공데이터포털 Swagger 기준)

> 응답 구조는 `response.body.items[]`다. 필드명의 대소문자는 API마다 다르니 그대로 쓴다.

### A1. DUR 성분정보 `DURIrdntInfoService03`
- **요청 파라미터**: `typeName`, `ingrCode`, `ingrKorName`(병용금기) 또는 `ingrName`(그 밖의 operation)
- **응답 필드**

| operation | 핵심 응답 필드 |
|---|---|
| `getUsjntTabooInfoList02` 병용금기 | `INGR_CODE`, `INGR_KOR_NAME`, `INGR_ENG_NAME`, `MIX_TYPE`, `MIX`, `ORI`(관계성분), `CLASS` ↔ `MIXTURE_INGR_CODE`, `MIXTURE_INGR_KOR_NAME`, `MIXTURE_INGR_ENG_NAME`, `MIXTURE_MIX_TYPE`, `MIXTURE_ORI`, `MIXTURE_CLASS`, `PROHBT_CONTENT`(금기내용), `NOTIFICATION_DATE`, `REMARK`, `DEL_YN` |
| `getPwnmTabooInfoList02` 임부 | `INGR_CODE`, `INGR_NAME`, `GRADE`(등급), `FORM_NAME`, `PROHBT_CONTENT`, `DEL_YN` |
| `getSpcifyAgrdeTabooInfoList02` 연령 | `INGR_CODE`, `INGR_NAME`, **`AGE_BASE`(연령기준, 텍스트 → 파싱 필요)**, `PROHBT_CONTENT`, `DEL_YN` |
| `getOdsnAtentInfoList02` 노인 | `INGR_CODE`, `INGR_NAME`, `FORM_NAME`, `PROHBT_CONTENT`, `DEL_YN` |
| `getCpctyAtentInfoList02` 용량 | `INGR_CODE`, `INGR_NAME`, **`MAX_QTY`(1일최대용량)**, `PROHBT_CONTENT`, `DEL_YN` |
| `getMdctnPdAtentInfoList02` 투여기간 | `INGR_CODE`, `INGR_NAME`, **`MAX_DOSAGE_TERM`(최대투여기간)**, `DEL_YN` |
| `getEfcyDplctInfoList02` 효능군중복 | `INGR_CODE`, `INGR_NAME`, **`EFFECT_CODE`(효능군)**, `SERS_NAME`(계열명), `CLASS_NAME`, `DEL_YN` |

### A2. DUR 품목정보 `DURPrdlstInfoService03`
- **요청 파라미터**: `typeName`, `ingrCode`, `itemName`, `itemSeq`, `bizrno`, **`start_change_date`, `end_change_date`**(증분)
- **응답 필드**
  - 병용금기(`getUsjntTabooInfoList03`)
    - 제품: `ITEM_SEQ`, `ITEM_NAME`, `ENTP_NAME`, `ETC_OTC_CODE`/`ETC_OTC_NAME`, `CLASS_CODE`/`CLASS_NAME`, `MAIN_INGR`, `CHART`
    - 성분: `INGR_CODE`, `INGR_KOR_NAME`
    - 상대 제품·성분: `MIXTURE_ITEM_SEQ`, `MIXTURE_ITEM_NAME`, `MIXTURE_INGR_CODE` …
    - 금기 정보: `PROHBT_CONTENT`, `NOTIFICATION_DATE`
  - 그 밖의 유형: `ITEM_SEQ`, `ITEM_NAME`, `INGR_CODE`, `INGR_NAME`, `MIX_TYPE`, `MIX_INGR`, `PROHBT_CONTENT`, `CHANGE_DATE`
  - 효능군중복: 위 필드에 `EFFECT_NAME`(효능), `SERS_NAME`이 추가된다.
  - `getDurPrdlstInfoList03`: `ITEM_SEQ`, `ITEM_NAME`, `ENTP_NAME`, `ETC_OTC_CODE`, `BAR_CODE`(표준코드), `MATERIAL_NAME`(원료성분), `EDI_CODE`, `CANCEL_DATE`, `CANCEL_NAME`, `TYPE_NAME`, `CHANGE_DATE`

### A3. e약은요 `DrbEasyDrugInfoService/getDrbEasyDrugList`
- **응답 필드**
  - 제품: `itemSeq`, `itemName`, `entpName`, `itemImage`, `openDe`, `updateDe`
  - 문항 텍스트(효능·사용법·주의·상호작용·부작용·보관): `efcyQesitm`, `useMethodQesitm`, `atpnWarnQesitm`, `atpnQesitm`, **`intrcQesitm`**, `seQesitm`, `depositMethodQesitm`
- 성분 필드는 없다.

### A4. 1일 최대투여량 `DayMaxDosgQyByIngdService/getDayMaxDosgQyByIngdInq`
- **응답 필드**: `CPNT_CD`(성분코드), `DRUG_CPNT_KOR_NM`, `DRUG_CPNT_ENG_NM`, `FOML_CD`, `FOML_NM`(제형), `DOSAGE_ROUTE_CODE`(투여경로), `DAY_MAX_DOSG_QY`(1일 최대투여량), `DAY_MAX_DOSG_QY_UNIT`(단위)

### A5. 의약품 제품 허가정보 `DrugPrdtPrmsnInfoService08`

| operation | 주요 요청 파라미터 | 핵심 응답 필드 |
|---|---|---|
| `getDrugPrdtPrmsnInq08` 목록 | `item_name`, `entp_name`, `item_ingr_name`, `spclty_pblc`, `edi_code` | `ITEM_SEQ`, `ITEM_NAME`, `ENTP_NAME`, `SPCLTY_PBLC`(전문/일반), `ITEM_INGR_NAME`(주성분), `ITEM_INGR_CNT`, `BIG_PRDT_IMG_URL`, `CANCEL_DATE`, `CANCEL_NAME`, `EDI_CODE` |
| `getDrugPrdtPrmsnDtlInq08` 상세 | `item_seq`, `main_item_ingr`, `start_change_date`, `end_change_date` | `ETC_OTC_CODE`, `MAIN_ITEM_INGR`(유효성분), `MAIN_INGR_ENG`, `MATERIAL_NAME`, `ATC_CODE`, `EE_DOC_DATA`/`UD_DOC_DATA`/`NB_DOC_DATA`(효능·용법·주의 문서), `BAR_CODE`, `CANCEL_NAME`, `CHANGE_DATE` |
| `getDrugPrdtMcpnDtlInq08` 주성분 상세 | `Item_seq`(대문자 I 주의) | `ITEM_SEQ`, `MTRAL_CODE`(원료코드), `MTRAL_NM`(원료명), **`QNT`(분량)**, **`INGD_UNIT_CD`(단위)**, `MAIN_INGR_ENG` |

- 규칙 R3(1일 최대량)의 용량은 주성분 상세의 `QNT`와 `INGD_UNIT_CD`를 사용한다.
- 취하·취소된 품목(`CANCEL_DATE`가 있는 품목)은 검색 결과에서 제외하거나 "허가 취소" 배지를 붙인다.

### A6. 낱알식별 `MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03`
- **요청 파라미터**: `item_name`, `entp_name`, `item_seq`, `edi_code`, `img_regist_ts`
- **응답 필드**
  - 제품: `ITEM_SEQ`, `ITEM_NAME`, `ENTP_NAME`, `ITEM_IMAGE`
  - 모양·색·각인: `DRUG_SHAPE`, `COLOR_CLASS1`, `COLOR_CLASS2`, `PRINT_FRONT`, `PRINT_BACK`, `LINE_FRONT`, `LINE_BACK`, `MARK_CODE_FRONT_ANAL`, `MARK_CODE_FRONT_IMG`
  - 크기: `LENG_LONG`, `LENG_SHORT`, `THICK`
  - 분류·코드: `ETC_OTC_NAME`, `FORM_CODE_NAME`, `EDI_CODE`, `STD_CD`(표준코드, 향후 바코드 스캔에 활용)
