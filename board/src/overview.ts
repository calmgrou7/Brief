// 종합 화면 계산. 각 서비스 요약을 읽기만 하고 어디에도 저장하지 않는다.
import type { Alert, Item, ServiceSummary } from './contract';

export type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; summary: ServiceSummary }
  | { status: 'demo'; summary: ServiceSummary }
  | { status: 'error'; error: string }
  | { status: 'none' };

export interface Tagged<T> {
  service: string;
  value: T;
}

/** 이 시간보다 오래된 요약은 '갱신 멈춤'으로 알린다. */
export const STALE_HOURS = 24;

export function summaryOf(s: LoadState): ServiceSummary | undefined {
  return s.status === 'ok' || s.status === 'demo' ? s.summary : undefined;
}

const LEVEL_ORDER = { bad: 0, caution: 1, info: 2 } as const;

/** 서비스가 보낸 알림 + 보드가 보는 연결 상태 알림을 심각한 순으로. */
export function combinedAlerts(states: Record<string, LoadState>, now: Date): Tagged<Alert>[] {
  const out: Tagged<Alert>[] = [];
  for (const [service, s] of Object.entries(states)) {
    if (s.status === 'error') out.push({ service, value: { level: 'bad', message: `요약을 불러오지 못했습니다 (${s.error})` } });
    const sum = summaryOf(s);
    if (!sum) continue;
    if (s.status === 'ok' && now.getTime() - Date.parse(sum.updatedAt) > STALE_HOURS * 3_600_000) {
      out.push({ service, value: { level: 'caution', message: `요약이 ${STALE_HOURS}시간 넘게 갱신되지 않았습니다` } });
    }
    for (const a of sum.alerts) out.push({ service, value: a });
  }
  return out.sort((a, b) => LEVEL_ORDER[a.value.level] - LEVEL_ORDER[b.value.level]);
}

export function combinedItems(states: Record<string, LoadState>): Tagged<Item>[] {
  const out: Tagged<Item>[] = [];
  for (const [service, s] of Object.entries(states)) for (const value of summaryOf(s)?.items ?? []) out.push({ service, value });
  return out.sort((a, b) => b.value.at.localeCompare(a.value.at));
}

export function countOpen(states: Record<string, LoadState>): number {
  return combinedItems(states).filter((t) => t.value.status === 'open').length;
}

function normalizeClient(name: string): string {
  return name.replace(/\s+/g, '').replace(/\(주\)|㈜|주식회사/g, '').toLowerCase();
}

export interface SharedClient {
  name: string;
  services: string[];
  lastAt: string;
}

/** 둘 이상의 서비스에 등장한 고객. 다음 제안을 넣기 좋은 곳이다. */
export function sharedClients(states: Record<string, LoadState>): SharedClient[] {
  const byKey = new Map<string, { name: string; services: Set<string>; lastAt: string }>();
  for (const { service, value } of combinedItems(states)) {
    if (!value.client) continue;
    const key = normalizeClient(value.client);
    const cur = byKey.get(key);
    if (!cur) byKey.set(key, { name: value.client, services: new Set([service]), lastAt: value.at });
    else {
      cur.services.add(service);
      if (value.at > cur.lastAt) cur.lastAt = value.at;
    }
  }
  return [...byKey.values()]
    .filter((c) => c.services.size > 1)
    .map((c) => ({ name: c.name, services: [...c.services], lastAt: c.lastAt }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}
