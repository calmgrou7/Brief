# 보담체크 — AI 보험 점검 · 상담 · 청구 가이드 (고객 DB 수집용 MVP)

**하나의 코드와 하나의 DB**로 웹앱 → 미니앱 → 구글플레이 앱을 차례로 출시합니다.
목표는 동의를 받은 고품질 고객 DB(리드)를 모으는 것입니다.

```
 [웹앱]  [미니앱 WebView]  [플레이스토어 TWA]
    \          |              /
     └── 같은 Next.js 앱 (?ch=web|toss|android) ──┐
                                                 ▼
                     API (/api/*) ──► Supabase DB (공용)
                                  └─► 웹훅 → Zapier/n8n → 시트·알림톡·슬랙
```

## 핵심 기능 (MVP)
| 기능 | 경로 | 리드 수집에서 하는 역할 |
|---|---|---|
| 30초 보험 점검 (보장 점검 + 숨은 보험금) | `/check` | 유입 훅. 결과 1개만 공개하고 나머지는 상담 신청 시 공개 |
| AI 보험 상담 | `/ask` | 궁금증 해소 → "전문가 확인" 버튼으로 연결. 질문은 콘텐츠 원천 데이터 |
| 청구 가이드 (정적·SEO) | `/claim/*` | 검색 유입 → 점검/상담으로 연결 |
| 상담 신청 (휴대폰 인증 + 분리 동의) | `/consult` | 리드 확보 |
| 관리자 대시보드 | `/admin` | HOT/WARM/COLD 자동 정렬, 상태·메모, 퍼널, CSV, AI 질문 모음 |
| 개인정보 삭제 요청 | `/privacy#request` | 스토어 심사용 데이터 삭제 URL |

## 빠른 시작
```bash
npm install
cp .env.example .env.local   # 값 채우기 (비워둬도 개발 모드로 동작)
npm run dev                  # http://localhost:3000
```
- Supabase 키가 없으면 `.data/`의 로컬 JSON 파일에 저장합니다 (개발용).
- Claude 키가 없으면 내장 FAQ로 답변합니다.
- `OTP_DEV_MODE=true`이면 인증번호가 화면에 표시됩니다.

## 운영 전환 체크리스트
1. Supabase 프로젝트를 만들고 `supabase/migrations/0001_init.sql` 실행 → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 설정
2. SOLAPI 발신번호 등록 → `SOLAPI_*` 설정, `OTP_DEV_MODE=false`
3. `ANTHROPIC_API_KEY` 설정 (비용을 줄이려면 `CLAUDE_MODEL` 변경 가능)
4. `LEAD_WEBHOOK_URL`에 Zapier/n8n 웹훅 연결 (아래 자동화 참고)
5. `NEXT_PUBLIC_OPERATOR_NAME`, 개인정보처리방침의 책임자 정보 입력 → **법률 검토**
6. Vercel 배포 (환경변수 동일하게 입력)

## 자동화 (1인 운영)
리드가 접수되면 `LEAD_WEBHOOK_URL`로 아래 JSON을 보냅니다.
```json
{ "event": "lead.created", "id": "...", "name": "홍길동", "phone": "01012345678",
  "grade": "HOT", "score": 82, "interest": "claim", "channel": "toss",
  "findings": ["수술비 청구 누락 가능성", "..."], "message": "...", "created_at": "..." }
```
추천 Zap: **웹훅 수신 → 구글시트 행 추가 → (grade=HOT이면) 내 휴대폰 알림 + 고객에게 접수 알림톡**.
같은 번호로 다시 신청하면 `lead.returning` 이벤트가 오고, 기존 고객에 채널 이력이 합쳐집니다.

## 문서
- [단계별 로드맵 (웹 → 미니앱 → 플레이스토어)](docs/ROADMAP.md)
- [규제·스토어 심사 체크리스트](docs/COMPLIANCE.md)
