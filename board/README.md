# 운영 보드 — 채움 · 위들리 통합 현황

채움(법인 컨설팅 웹앱)과 위들리는 각자 따로 돌아가고, 이 보드는 **두 앱이 보내는 활동 기록을 한 화면에 모아** 보여줍니다.
앱끼리 서로 직접 연결하지 않으므로, 한 앱을 고치거나 새 앱을 추가해도 다른 앱은 영향을 받지 않습니다.

```
채움  ──┐  sendHubEvent()
        ├──▶ Supabase ops_events ──▶ 운영 보드
위들리 ─┘
```

## 화면

- **요약 카드**: 이번 주 활동(지난주 대비), 진행 중, 7일 넘게 밀린 일, 두 앱 공통 고객
- **앱별 카드**: 이번 주·진행 중·밀린 일·고객 수, 최근 활동, 사흘 넘게 조용하면 알림, 앱 바로가기
- **할 일 · 진행 중**: 두 앱의 열린 항목을 오래된 순으로. 체크하면 완료, 바로 추가 가능
- **통합 타임라인**: 전체/앱별 필터
- **두 앱에 모두 있는 고객**: `(주)`·띄어쓰기 차이는 같은 고객으로 묶음 → 교차 제안 대상

## 실행

```bash
cd board
npm install
npm run dev      # 개발 서버 (설정 없으면 예시 데이터로 뜸)
npm test         # 집계 로직 테스트
npm run build    # 배포용 빌드(dist/)
```

## 실제 데이터 연결 (한 번만)

1. Supabase 프로젝트의 SQL Editor에서 `supabase/ops_events.sql`을 실행합니다.
   실행 전 파일 끝의 `you@example.com`을 보드에 로그인할 본인 이메일로 바꿉니다.
2. Supabase Authentication에서 그 이메일 사용자를 만들어 두고(Invite user), 새 가입은 꺼 둡니다.
3. `board/.env.example`을 `.env`로 복사해 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, 두 앱 주소를 채웁니다.
4. 각 앱의 전송 키를 확인합니다: `select id, ingest_key from ops_apps;`

보드는 로그인한 등록 이메일만 볼 수 있습니다(고객명이 들어 있으므로). 앱 쪽은 로그인 없이 **앱별 전송 키**로만 기록을 넣을 수 있고, 읽지는 못합니다.

## 각 앱에서 보내기

`src/hub-client.ts`를 앱에 복사하고, 의미 있는 순간에 한 줄씩 부릅니다. 실패해도 앱 동작을 막지 않습니다.

```ts
const hub = {
  url: import.meta.env.VITE_HUB_URL,
  anonKey: import.meta.env.VITE_HUB_ANON_KEY,
  app: 'chaeum',                              // 위들리는 'widly'
  ingestKey: import.meta.env.VITE_HUB_INGEST_KEY,
};

// 채움 예: 리포트를 만들었을 때
sendHubEvent(hub, { externalId: `case-${c.id}-report`, kind: 'report', title: '대표용 리포트 생성', client: c.company.name });

// 진행 중인 상담 → 끝나면 같은 externalId로 status만 바꿔 다시 보냄
sendHubEvent(hub, { externalId: `case-${c.id}-consult`, kind: 'consult', title: '정책자금 상담', client: c.company.name, status: 'open' });
sendHubEvent(hub, { externalId: `case-${c.id}-consult`, kind: 'consult', title: '정책자금 상담', client: c.company.name, status: 'done', amount: 1_500_000 });
```

| 필드 | 뜻 |
|---|---|
| `kind` | `client`(신규 고객) · `consult`(상담) · `report`(리포트) · `task`(할 일) · `note`(메모) |
| `status` | `open`이면 보드의 '할 일·진행 중'에 뜸. 기본값 `done` |
| `externalId` | 같은 값으로 다시 보내면 새로 쌓지 않고 갱신 |
| `amount` | 원 단위 금액(이번 달 합계에 반영) |
| `client` | 고객사명. 두 앱에 같은 고객이 나오면 공통 고객으로 묶임 |

## 앱 추가

`src/apps.ts`에 한 줄, `ops_apps`에 한 행(`insert into ops_apps (id, name) values ('새앱', '이름');`)을 추가하면 됩니다.
