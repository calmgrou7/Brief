# 인수인계 문서 (HANDOFF)

최종 갱신: 2026-10-31 · 작성: Claude Code → 수신: Codex

## 1. 배경
- 사용자: 1인 사업자(브릿지노드, 앱개발사). **업무 자동화·업그레이드**가 최우선.
- 목표: 기획→출시→운영까지 모든 프로젝트 총괄 + 계정·서버·도메인 지속 관리.
- 다른 브릿지노드 프로그램(nowro-korea)과 **같은 구조**로 유지한다 (AGENTS.md 스택 참고).

## 2. 현재 상태
기획 대비 완료 현황은 [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md), 남은 작업은 [NEXT_STEPS.md](NEXT_STEPS.md).

## 3. 데이터 모델
타입 정의 원본: `shared/model.ts` (`Project`, `Release`, `Domain`, `Server`, `Account`, `VaultBlob`, `DashboardState`).

SQLite 테이블 (`server/store.mjs`):
| 테이블 | 내용 |
|---|---|
| `records(kind,id,data,updated)` | kind = projects/releases/domains/servers, data = sanitize된 JSON |
| `vault(id=1,data)` | 보관함 암호문(VaultBlob) 1개 |
| `meta(key,value)` | `initialized`, `sample`, `updatedAt` |
| `sessions(id,expires)` | 로그인 세션 (토큰의 SHA-256만 저장) |
| `audit(event,detail,created)` | 활동 기록. 보관함 내용은 절대 기록 안 함 |

## 4. API (`server/index.mjs`)
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 상태 확인(무인증) |
| GET | `/api/session` | 로그인 여부 |
| POST | `/api/login` `{password}` | 세션 쿠키 발급. IP당 10분 5회 실패 시 429 |
| POST | `/api/logout` | 세션 삭제 |
| GET | `/api/state` | 전체 상태 |
| PUT/DELETE | `/api/records/:kind/:id` | 레코드 저장/삭제 (프로젝트 삭제 시 이력도 삭제) |
| PUT | `/api/vault` `{vault}` | 암호문 저장, `null`이면 삭제 |
| POST | `/api/import` | `projects` 있으면 전체 복원, `releases`만 있으면 병합 |
| POST | `/api/reset` `{mode:"empty"|"sample"}` | 초기화(보관함 유지) |
| GET | `/api/export` | 백업 JSON 다운로드 |
| GET | `/api/audit` | 최근 활동 100건 |

## 5. 코드 지도
| 위치 | 역할 |
|---|---|
| `shared/model.ts` | 상수(`TRACKS`, `REL_STATUS`…), 계산(`progress`, `projectStatus`, `updateLabel`, `nextActions`), `sanitize`, `validVault`, `planReleaseMerge`, `sampleState` |
| `server/store.mjs` | `Store` 클래스: CRUD, 보관함, 일괄교체, 가져오기, 세션, 감사 |
| `server/auth.mjs` | 비밀번호 비교(scrypt+timingSafeEqual), 토큰, 쿠키 파싱, 로그인 제한 |
| `src/App.tsx` | 로그인, 탭, `Ctx`(save/remove/openForm/goto/reload) |
| `src/views/*.tsx` | 탭별 화면. 입력 폼 필드 정의는 `views/forms.ts` |
| `src/ui.tsx` | `Badge`, `DDay`, `SafeLink`, `FormModal`(범용 입력 모달), `toast` |
| `src/vault.ts` | 보관함 암호화(PBKDF2-SHA256 310k → AES-GCM 256) |

새 필드 추가 순서: `model.ts` 타입 + `sanitize()` → `views/forms.ts` 필드 → 해당 화면 표시 → 테스트.

## 6. 출시 이력 병합 포맷
예시: [`examples/releases.sample.json`](examples/releases.sample.json). 매칭은 `projectId` 우선, 없으면 `projectName`("(예시)" 접미사 무시). 같은 프로젝트+버전이면 갱신.

## 7. 알려진 이슈
- 토스 프로젝트에서 nextStep과 "검수 결과 확인"이 다음 절차에 함께 표시될 수 있음(의도된 동작, 개선 여지).
- 토스 콘솔(앱인토스) 공개 API를 확인하지 못해 실시간 연동 없음. B2(웹훅)로 자동화 보완 예정.
- Node 22에서는 `node:sqlite` 실험 경고가 출력됨(동작 정상). 운영은 Node 24.
