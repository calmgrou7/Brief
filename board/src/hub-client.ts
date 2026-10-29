// 각 앱(채움·위들리)에 그대로 복사해 쓰는 전송 함수. 의존성 없음.
// 보드로 보내는 건 부가 기능이라, 실패해도 앱 동작을 막지 않도록 예외를 던지지 않는다.
//
// 사용 예:
//   const hub = { url: import.meta.env.VITE_HUB_URL, anonKey: import.meta.env.VITE_HUB_ANON_KEY,
//                 app: 'chaeum', ingestKey: import.meta.env.VITE_HUB_INGEST_KEY };
//   sendHubEvent(hub, { externalId: `case-${c.id}-report`, kind: 'report', title: '대표용 리포트 생성', client: c.company.name });

export interface HubConfig {
  url?: string;
  anonKey?: string;
  app: string;
  ingestKey?: string;
}

export interface HubEvent {
  /** 같은 값으로 다시 보내면 새로 쌓지 않고 갱신한다(상태 변경 등). */
  externalId?: string;
  kind: 'client' | 'consult' | 'report' | 'task' | 'note';
  title: string;
  client?: string;
  status?: 'open' | 'done';
  amount?: number;
  link?: string;
  at?: string;
}

export async function sendHubEvent(cfg: HubConfig, e: HubEvent): Promise<boolean> {
  if (!cfg.url || !cfg.anonKey || !cfg.ingestKey) return false;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/ingest_event`, {
      method: 'POST',
      headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_app: cfg.app,
        p_key: cfg.ingestKey,
        p_external_id: e.externalId ?? null,
        p_kind: e.kind,
        p_title: e.title,
        p_client: e.client ?? null,
        p_status: e.status ?? 'done',
        p_amount: e.amount ?? null,
        p_link: e.link ?? null,
        p_at: e.at ?? null,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
