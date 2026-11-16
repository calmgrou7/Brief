# 단계별 출시 로드맵

원칙: **화면과 로직은 웹앱 하나로 만들고**, 미니앱과 플레이스토어 앱은 그 웹앱을 감싸는 "껍데기"로 만듭니다.
그러면 1인이 유지보수할 코드는 하나이고, 모든 채널의 고객 데이터가 같은 DB에 쌓입니다.

## 채널 통합 방식
| 항목 | 방식 |
|---|---|
| 채널 구분 | 진입 URL에 `?ch=toss` / `?ch=android` → 모든 이벤트·리드에 `channel` 기록 (TWA는 `android-app://` referrer로도 자동 인식) |
| 고객 식별 | 비로그인 상태에서는 기기별 `anon_id`. 상담 신청 시 **인증된 휴대폰 번호**로 하나의 고객으로 통합 |
| 채널 이력 | `leads.first_channel`(최초 유입), `last_channel`, `channels[]`(누적) |
| 외부 ID | 미니앱 로그인 사용자키 등은 `leads.external_ids` (jsonb)에 저장 |
| 성과 비교 | `/admin` 퍼널 + `events` 테이블을 채널별로 집계 |

---

## 1단계 — 웹앱 (지금, 1~3주)
**목표:** 광고 1만~30만 원으로 리드당 비용(CPL)과 점검 → 신청 전환율 검증

- [x] 점검 퀴즈, 결과 부분 공개, AI 상담, 청구 가이드, 상담 신청, 관리자 대시보드
- [ ] Supabase 연결 + Vercel 배포 + 도메인
- [ ] SOLAPI 문자 인증 연결
- [ ] Zapier: 리드 → 구글시트 → HOT 알림
- [ ] 메타/네이버 광고 랜딩: `/check?utm_source=meta&utm_campaign=...`
- [ ] 1주 데이터로 문항·결과 문구 A/B 조정

**넘어가는 기준:** 점검 완료 → 신청 전환 5% 이상, 목표 CPL 이하

## 2단계 — 미니앱 (4~6주)
**같은 웹앱 URL을 미니앱 WebView로 띄웁니다.** 진입 URL: `https://도메인/?ch=toss`

- [ ] **먼저 확인:** 대상 플랫폼(토스 앱인토스, 카카오 등)이 *보험 상담·개인정보 수집* 미니앱을 허용하는지 운영정책 확인
      (자체 보험 사업을 하는 플랫폼은 이 카테고리를 제한할 수 있음 → 불가하면 다른 플랫폼으로 대체)
- [ ] 플랫폼 로그인 연동(선택): 사용자 동의 하에 이름·휴대폰을 받으면 문자 인증 단계를 생략해 전환율 상승
      → `/api/leads`에 플랫폼 인증 검증 분기를 추가하고 `external_ids`에 사용자키 저장
- [ ] 플랫폼 디자인 가이드 대응: `html[data-channel="toss"]`일 때 웹 헤더 숨김은 이미 적용됨
- [ ] 미니앱 전용 이벤트(공유, 재방문 알림) 추가

## 3단계 — 구글플레이 앱 (7~10주)
**TWA(Trusted Web Activity)** 로 웹앱을 안드로이드 앱으로 감쌉니다. 웹을 고치면 앱도 바로 바뀝니다(재심사 불필요).

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://도메인/manifest.webmanifest
# twa-manifest.json 에서 startUrl 을 "/?ch=android" 로 설정
bubblewrap build
```
- [ ] Play Console 앱 서명 키 SHA-256 → 환경변수 `ANDROID_PACKAGE`, `ANDROID_SHA256` → `/.well-known/assetlinks.json` 자동 응답
- [ ] 512px PNG 아이콘·스크린샷 준비 (현재 `public/icon.svg`)
- [ ] 스토어 심사 항목: [COMPLIANCE.md](COMPLIANCE.md) 참고 (데이터 보안 양식, 금융 기능 신고, 삭제 URL)
- [ ] 앱 전용 가치 추가 (최소 기능 정책 대응): **청구 기한 푸시 알림**, 영수증 촬영 보관함

## 2차 확장 (출시 후)
- 커뮤니티: `/admin` → "AI 질문 모음"에서 자주 나오는 질문을 익명 Q&A 콘텐츠로 발행 → 검색 유입
- 증권·영수증 OCR → 자동 보장 분석 리포트
- 알림톡 자동 시나리오 (접수 즉시 → 미연락 24시간 → 청구 기한 리마인드)
