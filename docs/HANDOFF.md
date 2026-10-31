# 인수인계 문서 (HANDOFF)

최종 갱신: 2026-10-31 · 작성: Claude Code → 수신: Codex

## 1. 배경 / 목적
- 사용자: 1인 사업자(브릿지노드, 앱개발사). **업무 자동화·업그레이드**가 최우선 관심사.
- 목표: 기획 단계부터 출시·운영까지 모든 프로젝트를 총괄하는 대시보드. 장기적으로 아이디/비번·서버·도메인까지 지속 관리.
- 관리 대상 3개 트랙: **미니앱**, **웹앱**, **토스 인앱(앱인토스)**.

## 2. 현재 구현 상태 (v1, 완료)
| 영역 | 상태 | 비고 |
|---|---|---|
| 개요(전체/트랙별 진행률, 상태 카운트, 파이프라인) | ✅ | `renderOverview()` |
| 다음 절차 자동 집계 | ✅ | `nextActions()` — 프로젝트 nextStep, 검수/반려/승인, 도메인 60일·SSL 30일·서버 30일 |
| 프로젝트 CRUD + 단계 토글 | ✅ | 단계 템플릿은 `TRACKS` |
| 출시·업데이트 이력, n차 업데이트 계산 | ✅ | `releasedCount()`, `updateLabel()` |
| 도메인·서버 관리, D-day | ✅ | `renderInfra()` |
| 암호화 계정 보관함 | ✅ | PBKDF2-SHA256 310k → AES-GCM 256, 10분 자동잠금 |
| JSON 백업/복원, 출시이력 병합 import | ✅ | `exportData()`, `importData()` |
| 토스 콘솔 실시간 연동 | ❌ | 공개 API 미확인 → 수동 입력 + JSON 병합으로 대체 |
| 다기기/팀 공유 | ❌ | 현재 브라우저 localStorage 전용 |
| 알림(메일/캘린더) | ❌ | 백로그 참고 |

## 3. 데이터 모델 (localStorage `bridgenode-dashboard-v1`)
```ts
type State = {
  version: 1;
  meta: { company?: string; updatedAt?: string; sample?: boolean };  // sample=true면 예시 배너 표시
  projects: Project[]; releases: Release[]; domains: Domain[]; servers: Server[];
  vault: null | { v: 1; kdf: 'PBKDF2-SHA256'; iter: number; salt: string; iv: string; ct: string }; // base64
};
type Project = {
  id: string; name: string; client?: string; type: 'mini' | 'web' | 'toss'; hold: boolean;
  stages: { label: string; done: boolean }[];   // TRACKS[type].stages 로 생성
  startDate?: string; dueDate?: string;          // 'YYYY-MM-DD'
  nextStep?: string; serviceUrl?: string; repoUrl?: string; memo?: string;
};
type Release = {
  id: string; projectId: string; version: string; buildNo?: string;
  kind: 'first' | 'update' | 'hotfix';
  status: 'prep' | 'requested' | 'review' | 'rejected' | 'approved' | 'released';
  date?: string; server?: string; note?: string;
};
type Domain = { id; name; registrar?; registeredAt?; expiresAt; sslExpiresAt?; autoRenew: boolean; projectId?; dns?; memo? };
type Server = { id; name; provider?; host?; ip?; purpose?; plan?; cost?: number; renewAt?; projectId?; consoleUrl?; memo? };
// 보관함 복호화 후 (메모리에만 존재):
type Account = { id; service; category: 'toss'|'domain'|'server'|'store'|'dev'|'pay'|'etc'; url?; username; password?; projectId?; changedAt?; memo? };
```
기타 localStorage 키: `bridgenode-theme`(light/dark), `bridgenode-tab`(마지막 탭).

### 프로젝트 상태 판정 (`projStatus()`)
보류 → `hold` / 최근 릴리스 requested·review → `review` / rejected → `rejected` /
released ≥1 && 진행률 100% → `live` / 첫 단계 미완료 → `planning` / 그 외 `progress`.

### 진행률
프로젝트 = 완료 단계 수 / 전체 단계 수 (균등 가중). 트랙·전체 = 보류 제외 프로젝트 평균.

## 4. 코드 지도 (`dashboard/index.html`)
| 구간 | 함수/상수 |
|---|---|
| 설정 상수 | `STORE_KEY`, `TRACKS`, `REL_STATUS`, `REL_KIND`, `ACC_CAT` |
| 유틸 | `h()` 이스케이프, `uid()`, `todayStr()`, `daysUntil()`, `ddayBadge()`, `safeLink()`, `toast()` |
| 상태 | `sampleData()`, `load()`, `normalize()`(마이그레이션 지점), `save()` |
| 계산 | `progress()`, `projStatus()`, `currentStage()`, `latestRelease()`, `updateLabel()`, `nextActions()` |
| 렌더 | `renderOverview/Projects/Releases/Infra/Vault/Settings()`, `renderAll()` |
| 보관함 | `deriveKey()`, `createVault()`, `unlockVault()`, `sealVault()`, `lockVault()`, `armLock()` |
| 폼 | `FORMS` 정의(필드 스키마) → `openForm(kind, data, onSave)` 범용 모달 |
| 입출력 | `exportData()`, `importData()` (projects 있으면 전체복원, releases만 있으면 병합) |
| 이벤트 | `document` 위임 click(`data-*` 속성), change(릴리스 상태 select), submit(보관함) |

새 필드 추가 방법: `FORMS.<kind>.fields`에 항목 추가 → 해당 render 함수에 표시 → 필요 시 `normalize()` 기본값.

## 5. 출시 이력 병합 포맷 (자동화 입력)
예시: [`docs/examples/releases.sample.json`](examples/releases.sample.json)
- 프로젝트 매칭: `projectId` 우선, 없으면 `projectName`(이름 끝 " (예시)" 무시).
- 같은 프로젝트+버전 존재 시 필드 덮어쓰기(갱신), 없으면 추가. 잘못된 status는 `prep`.

## 6. 작업 백로그 (우선순위 순)
각 항목은 독립 PR로 진행. 완료 기준을 만족하고 `npm test` 통과 필수.

### B1. 만료 알림 .ics 내보내기 (자동화)
- 도메인 만료·SSL 만료·서버 갱신일·프로젝트 마감일을 iCalendar(.ics) 파일로 내보내기 버튼(백업·설정 탭).
- 각 이벤트에 30일 전/7일 전 VALARM.
- 완료 기준: Google 캘린더 가져오기 성공하는 유효한 .ics, UID 고정(재가져오기 시 중복 방지).

### B2. 출시 이력 JSON 생성 스크립트 (GitHub Actions)
- `scripts/release-record.mjs`: 인자(projectName, version, status, server, note)로 병합 포맷 JSON 출력.
- `.github/workflows/release-record.yml` 예시: 태그 push 시 아티팩트로 JSON 업로드.
- 완료 기준: 생성 JSON을 대시보드 가져오기 시 이력이 추가됨.

### B3. 프로젝트 체크리스트(세부 작업) 기능
- 단계마다 하위 체크리스트(예: 토스 검수 요청 전 필수 항목). 진행률을 세부 작업 기준으로 계산하는 옵션.
- `Project.stages[i].tasks?: {label, done}[]` 추가, 기존 데이터 하위호환.

### B4. 검색·필터·정렬
- 프로젝트/계정/도메인 텍스트 검색, 상태 필터(검수중만 보기 등).

### B5. 클라우드 동기화 (선택, 사용자 승인 후)
- Supabase 테이블로 projects/releases/domains/servers 동기화. **vault는 클라이언트 암호문 그대로 저장**(서버가 평문을 보지 못하게).
- 오프라인 우선: localStorage를 기본, 동기화는 옵션.

### B6. 보관함 강화
- 마스터 비밀번호 변경 기능(복호화→새 키로 재암호화), 비밀번호 변경일 90일 경과 경고.

## 7. 알려진 이슈 / 메모
- 토스 프로젝트에서 nextStep과 "검수 결과 확인" 항목이 다음 절차에 중복 표시될 수 있음(의도된 동작이나 개선 여지).
- 릴리스 상태 select 스타일을 render 후 인라인으로 지정 중 → CSS 클래스로 정리 권장.
- `crypto.subtle`은 보안 컨텍스트 필요(https 또는 file://, localhost). http 원격 호스팅 시 보관함 비활성.
