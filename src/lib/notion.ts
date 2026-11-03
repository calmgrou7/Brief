// Notion REST API(2025-09-03, data source 기반) 얇은 클라이언트와 속성 변환.
import type { FieldMap, FileRef, Range } from './schema';

const API = 'https://api.notion.com/v1';
const VERSION = '2025-09-03';
const TEXT_CHUNK = 2000; // 노션 rich_text 한 조각의 최대 글자 수

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

export class NotionError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function call(token: string, method: string, path: string, body?: Json): Promise<Json> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': VERSION,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    // 초당 3회 제한: 429면 안내된 시간만큼 기다렸다 재시도
    if (res.status === 429 && attempt < 3) {
      const wait = Number(res.headers.get('retry-after') ?? '1');
      await new Promise((r) => setTimeout(r, Math.min(wait, 5) * 1000));
      continue;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new NotionError(res.status, data.code ?? 'unknown', data.message ?? res.statusText);
    return data;
  }
}

export async function queryAll(token: string, dataSourceId: string): Promise<Json[]> {
  const out: Json[] = [];
  let cursor: string | undefined;
  do {
    const data = await call(token, 'POST', `/data_sources/${dataSourceId}/query`, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    out.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return out;
}

export const createPage = (token: string, dataSourceId: string, properties: Json) =>
  call(token, 'POST', '/pages', { parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties });

export const updatePage = (token: string, pageId: string, properties: Json) =>
  call(token, 'PATCH', `/pages/${pageId}`, { properties });

/** 영구 삭제가 아니라 노션 휴지통으로 이동(30일 내 복구 가능) */
export const trashPage = (token: string, pageId: string) =>
  call(token, 'PATCH', `/pages/${pageId}`, { in_trash: true });

export const getDataSource = (token: string, dataSourceId: string) =>
  call(token, 'GET', `/data_sources/${dataSourceId}`);

/* ---------- 연결 점검: 노션 속성이 앱이 기대하는 이름·종류인지 ---------- */

const NOTION_TYPE: Record<FieldMap[string][1], string> = {
  title: 'title', text: 'rich_text', select: 'select', multi: 'multi_select', status: 'status',
  date: 'date', range: 'date', number: 'number', checkbox: 'checkbox', phone: 'phone_number',
  email: 'email', url: 'url', relation: 'relation', files: 'files', uid: 'unique_id', edited: 'last_edited_time',
};

export interface SchemaIssue { name: string; problem: 'missing' | 'type' | 'option'; detail: string }

/**
 * 노션에서 속성 이름을 바꾸거나 지우면 화면에 빈 값만 나와 알아채기 어렵다. 그 차이를 찾아낸다.
 * statusOptions: 앱이 값을 써 넣는 상태 속성의 선택지(노션 API로는 새 선택지를 만들 수 없음)
 */
export function compareSchema(map: FieldMap, properties: Json, statusOptions: Record<string, readonly string[]> = {}): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  for (const [name, kind] of Object.values(map)) {
    const p = properties?.[name];
    if (!p) { issues.push({ name, problem: 'missing', detail: '속성이 없습니다' }); continue; }
    const want = NOTION_TYPE[kind];
    if (p.type !== want) { issues.push({ name, problem: 'type', detail: `종류가 ${p.type}입니다 (필요: ${want})` }); continue; }
    const need = statusOptions[name];
    if (need && p.type === 'status') {
      const have = new Set((p.status?.options ?? []).map((o: Json) => o.name));
      const lack = need.filter((o) => !have.has(o));
      if (lack.length) issues.push({ name, problem: 'option', detail: `선택지 없음: ${lack.join(', ')}` });
    }
  }
  return issues;
}

/* ---------- 읽기: 노션 속성 → 일반 값 ---------- */

const plain = (rt: Json[] | undefined) => (rt ?? []).map((t) => t.plain_text ?? '').join('');

function decodeProp(p: Json, kind: FieldMap[string][1]): unknown {
  if (!p) return emptyOf(kind);
  switch (kind) {
    case 'title': return plain(p.title);
    case 'text': return plain(p.rich_text);
    case 'select': return p.select?.name ?? '';
    case 'status': return p.status?.name ?? '';
    case 'multi': return (p.multi_select ?? []).map((o: Json) => o.name);
    case 'date': return p.date?.start ?? '';
    case 'range': return { start: p.date?.start ?? '', end: p.date?.end ?? '' } satisfies Range;
    case 'number': return typeof p.number === 'number' ? p.number : null;
    case 'checkbox': return Boolean(p.checkbox);
    case 'phone': return p.phone_number ?? '';
    case 'email': return p.email ?? '';
    case 'url': return p.url ?? '';
    case 'relation': return (p.relation ?? []).map((r: Json) => r.id);
    case 'files':
      return (p.files ?? []).map((f: Json): FileRef => ({ name: f.name, url: f.file?.url ?? f.external?.url ?? '' }));
    case 'uid': return p.unique_id ? `${p.unique_id.prefix ? p.unique_id.prefix + '-' : ''}${p.unique_id.number}` : '';
    case 'edited': return p.last_edited_time ?? '';
  }
}

function emptyOf(kind: FieldMap[string][1]): unknown {
  switch (kind) {
    case 'multi': case 'relation': case 'files': return [];
    case 'number': return null;
    case 'checkbox': return false;
    case 'range': return { start: '', end: '' };
    default: return '';
  }
}

export function decode<T>(page: Json, map: FieldMap): T {
  const out: Record<string, unknown> = { id: page.id, url: page.url ?? '' };
  for (const [key, [name, kind]] of Object.entries(map)) out[key] = decodeProp(page.properties?.[name], kind);
  return out as T;
}

/* ---------- 쓰기: 일반 값 → 노션 속성 ---------- */

function richText(s: string) {
  const chunks: Json[] = [];
  for (let i = 0; i < s.length; i += TEXT_CHUNK) chunks.push({ type: 'text', text: { content: s.slice(i, i + TEXT_CHUNK) } });
  return chunks;
}

const READ_ONLY = new Set(['uid', 'edited', 'files']);

function encodeProp(v: unknown, kind: FieldMap[string][1]): Json {
  const s = typeof v === 'string' ? v.trim() : '';
  switch (kind) {
    case 'title': return { title: richText(s) };
    case 'text': return { rich_text: richText(s) };
    case 'select': return { select: s ? { name: s } : null };
    case 'status': return { status: s ? { name: s } : null };
    case 'multi': return { multi_select: ((v as string[]) ?? []).map((name) => ({ name })) };
    case 'date': return { date: s ? { start: s } : null };
    case 'range': {
      const r = v as Range;
      return { date: r?.start ? { start: r.start, ...(r.end ? { end: r.end } : {}) } : null };
    }
    case 'number': return { number: typeof v === 'number' && Number.isFinite(v) ? v : null };
    case 'checkbox': return { checkbox: Boolean(v) };
    case 'phone': return { phone_number: s || null };
    case 'email': return { email: s || null };
    case 'url': return { url: s || null };
    case 'relation': return { relation: ((v as string[]) ?? []).map((id) => ({ id })) };
    default: throw new Error(`쓰기 불가 속성: ${kind}`);
  }
}

/** 넘긴 키만 변환(부분 수정). 읽기 전용 속성은 건너뛴다 */
export function encode(values: Record<string, unknown>, map: FieldMap): Json {
  const props: Json = {};
  for (const [key, v] of Object.entries(values)) {
    const def = map[key];
    if (!def || READ_ONLY.has(def[1])) continue;
    props[def[0]] = encodeProp(v, def[1]);
  }
  return props;
}
