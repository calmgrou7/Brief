// 서비스가 종합 보드에 내주는 '요약'의 모양. 데이터 원본은 각 서비스가 갖고, 보드는 이것만 읽는다.
// 서비스마다 KPI는 자유롭게 정하고, 알림·최근 활동만 공통 모양을 맞춘다.

export type Tone = 'good' | 'caution' | 'bad';

export interface Kpi {
  label: string;
  value: number | string;
  unit?: string;
  tone?: Tone;
  hint?: string;
}

export interface Alert {
  level: 'info' | 'caution' | 'bad';
  message: string;
  link?: string;
}

export interface Item {
  title: string;
  at: string; // ISO 시각
  status?: 'open' | 'done';
  kind?: string;
  client?: string;
  amount?: number; // 원(KRW)
  link?: string;
}

export interface ServiceSummary {
  updatedAt: string;
  kpis: Kpi[];
  alerts: Alert[];
  items: Item[];
}

const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isDate = (v: unknown): v is string => str(v) && !Number.isNaN(Date.parse(v));
const TONES = ['good', 'caution', 'bad'];
const LEVELS = ['info', 'caution', 'bad'];

/** 서비스가 보낸 JSON을 검사한다. 잘못된 항목 하나 때문에 타일 전체가 깨지지 않도록 그 항목만 버린다. */
export function parseSummary(raw: unknown): ServiceSummary {
  if (!raw || typeof raw !== 'object') throw new Error('요약 형식이 아닙니다');
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.kpis)) throw new Error('kpis가 없습니다');
  const kpis = r.kpis.flatMap((k): Kpi[] => {
    if (!k || !str(k.label) || !(typeof k.value === 'number' || typeof k.value === 'string')) return [];
    return [{ label: k.label, value: k.value, unit: str(k.unit) ? k.unit : undefined, tone: TONES.includes(k.tone) ? k.tone : undefined, hint: str(k.hint) ? k.hint : undefined }];
  });
  const alerts = (Array.isArray(r.alerts) ? r.alerts : []).flatMap((a): Alert[] =>
    a && str(a.message) ? [{ level: LEVELS.includes(a.level) ? a.level : 'info', message: a.message, link: str(a.link) ? a.link : undefined }] : [],
  );
  const items = (Array.isArray(r.items) ? r.items : []).flatMap((i): Item[] => {
    if (!i || !str(i.title) || !isDate(i.at)) return [];
    return [{
      title: i.title,
      at: i.at,
      status: i.status === 'open' || i.status === 'done' ? i.status : undefined,
      kind: str(i.kind) ? i.kind : undefined,
      client: str(i.client) ? i.client : undefined,
      amount: typeof i.amount === 'number' && Number.isFinite(i.amount) ? i.amount : undefined,
      link: str(i.link) ? i.link : undefined,
    }];
  });
  return { updatedAt: isDate(r.updatedAt) ? r.updatedAt : new Date().toISOString(), kpis, alerts, items };
}
