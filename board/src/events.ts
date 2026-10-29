// 보드가 다루는 단 하나의 데이터 모양. 두 앱 모두 이 모양으로 이벤트를 보낸다.

export type EventKind = 'client' | 'consult' | 'report' | 'task' | 'note';
export type EventStatus = 'open' | 'done';

export interface OpsEvent {
  id: string;
  app: string;
  kind: EventKind;
  title: string;
  client?: string;
  status: EventStatus;
  amount?: number; // 원(KRW)
  link?: string;
  at: string; // ISO 시각
}

export const KIND_LABEL: Record<EventKind, string> = {
  client: '고객',
  consult: '상담',
  report: '리포트',
  task: '할 일',
  note: '메모',
};

const DAY = 86_400_000;
/** 이 일수보다 오래 열려 있는 할 일은 '밀림'으로 본다. */
export const STALE_DAYS = 7;

export function daysSince(at: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(at).getTime()) / DAY);
}

/** 월요일 0시 기준 이번 주 시작. */
export function weekStart(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function normalizeClient(name: string): string {
  return name.replace(/\s+/g, '').replace(/\(주\)|㈜|주식회사/g, '').toLowerCase();
}

export interface AppSummary {
  app: string;
  thisWeek: number;
  lastWeek: number;
  open: number;
  stale: number;
  clients: number;
  amountThisMonth: number;
  lastActivity?: string;
  recent: OpsEvent[];
}

export function summarizeApp(events: OpsEvent[], app: string, now: Date): AppSummary {
  const mine = events.filter((e) => e.app === app);
  const start = weekStart(now).getTime();
  const prevStart = start - 7 * DAY;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let thisWeek = 0, lastWeek = 0, open = 0, stale = 0, amountThisMonth = 0;
  const clients = new Set<string>();
  for (const e of mine) {
    const t = new Date(e.at).getTime();
    if (t >= start && t <= now.getTime()) thisWeek++;
    else if (t >= prevStart && t < start) lastWeek++;
    if (e.status === 'open') {
      open++;
      if (daysSince(e.at, now) >= STALE_DAYS) stale++;
    }
    if (e.client) clients.add(normalizeClient(e.client));
    if (e.amount && t >= monthStart && t <= now.getTime()) amountThisMonth += e.amount;
  }
  const recent = sortByRecent(mine).slice(0, 4);
  return { app, thisWeek, lastWeek, open, stale, clients: clients.size, amountThisMonth, lastActivity: recent[0]?.at, recent };
}

export function sortByRecent(events: OpsEvent[]): OpsEvent[] {
  return [...events].sort((a, b) => b.at.localeCompare(a.at));
}

/** 열린 항목을 오래된 것부터. 밀린 일을 먼저 처리하게 한다. */
export function openItems(events: OpsEvent[]): OpsEvent[] {
  return events.filter((e) => e.status === 'open').sort((a, b) => a.at.localeCompare(b.at));
}

export interface SharedClient {
  name: string;
  apps: string[];
  lastAt: string;
}

/** 두 개 이상의 앱에 등장한 고객. 교차 제안 대상이다. */
export function sharedClients(events: OpsEvent[]): SharedClient[] {
  const byKey = new Map<string, { name: string; apps: Set<string>; lastAt: string }>();
  for (const e of events) {
    if (!e.client) continue;
    const key = normalizeClient(e.client);
    const cur = byKey.get(key);
    if (!cur) byKey.set(key, { name: e.client, apps: new Set([e.app]), lastAt: e.at });
    else {
      cur.apps.add(e.app);
      if (e.at > cur.lastAt) cur.lastAt = e.at;
    }
  }
  return [...byKey.values()]
    .filter((c) => c.apps.size > 1)
    .map((c) => ({ name: c.name, apps: [...c.apps], lastAt: c.lastAt }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** 같은 id는 뒤에 온 소스가 이긴다(예: 로컬에서 완료 처리한 값). */
export function mergeEvents(...lists: OpsEvent[][]): OpsEvent[] {
  const map = new Map<string, OpsEvent>();
  for (const list of lists) for (const e of list) map.set(e.id, e);
  return [...map.values()];
}
