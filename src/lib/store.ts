/**
 * 데이터 저장소 — 웹앱 / 미니앱 / 플레이스토어 앱이 모두 이 한 곳(Supabase)을 공유합니다.
 * SUPABASE 환경변수가 없으면 개발용 로컬 JSON 파일(.data/)을 씁니다.
 * (서버 전용 모듈: 클라이언트에서 import 금지)
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export type Table =
  | "visitors"
  | "diagnoses"
  | "chat_messages"
  | "leads"
  | "consents"
  | "events"
  | "privacy_requests";

type Row = Record<string, unknown> & { id?: string };

export interface ListOptions {
  eq?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
}

interface Store {
  insert<T extends Row>(table: Table, row: T): Promise<T & { id: string }>;
  update(table: Table, id: string, patch: Row): Promise<Row | null>;
  get(table: Table, id: string): Promise<Row | null>;
  list(table: Table, opts?: ListOptions): Promise<Row[]>;
  findOne(table: Table, eq: Record<string, unknown>): Promise<Row | null>;
}

// ───────── Supabase ─────────
// 테이블 접두어 (기본 bd_). 다른 서비스와 같은 Supabase 프로젝트를 공유할 때 충돌 방지.
const PREFIX = process.env.TABLE_PREFIX ?? "bd_";

class SupabaseStore implements Store {
  private client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }
  private get db() { return { from: (t: Table) => this.client.from(PREFIX + t) }; }
  async insert<T extends Row>(table: Table, row: T) {
    const { data, error } = await this.db.from(table).insert(row).select().single();
    if (error) throw new Error(`[db] insert ${table}: ${error.message}`);
    return data as T & { id: string };
  }
  async update(table: Table, id: string, patch: Row) {
    const { data, error } = await this.db.from(table).update(patch).eq("id", id).select().maybeSingle();
    if (error) throw new Error(`[db] update ${table}: ${error.message}`);
    return data;
  }
  async get(table: Table, id: string) {
    const { data, error } = await this.db.from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[db] get ${table}: ${error.message}`);
    return data;
  }
  async list(table: Table, opts: ListOptions = {}) {
    let q = this.db.from(table).select("*");
    for (const [k, v] of Object.entries(opts.eq || {})) q = q.eq(k, v as string);
    q = q.order(opts.orderBy || "created_at", { ascending: opts.ascending ?? false });
    q = q.limit(opts.limit || 500);
    const { data, error } = await q;
    if (error) throw new Error(`[db] list ${table}: ${error.message}`);
    return data || [];
  }
  async findOne(table: Table, eq: Record<string, unknown>) {
    const rows = await this.list(table, { eq, limit: 1 });
    return rows[0] || null;
  }
}

// ───────── 로컬 파일 (개발용) ─────────
class FileStore implements Store {
  private dir = path.join(process.cwd(), ".data");
  private async read(table: Table): Promise<Row[]> {
    try {
      return JSON.parse(await fs.readFile(path.join(this.dir, `${table}.json`), "utf8"));
    } catch {
      return [];
    }
  }
  private async write(table: Table, rows: Row[]) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(path.join(this.dir, `${table}.json`), JSON.stringify(rows, null, 2));
  }
  async insert<T extends Row>(table: Table, row: T) {
    const rows = await this.read(table);
    const full = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row } as T & { id: string };
    rows.push(full);
    await this.write(table, rows);
    return full;
  }
  async update(table: Table, id: string, patch: Row) {
    const rows = await this.read(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) return null;
    rows[i] = { ...rows[i], ...patch };
    await this.write(table, rows);
    return rows[i];
  }
  async get(table: Table, id: string) {
    return (await this.read(table)).find((r) => r.id === id) || null;
  }
  async list(table: Table, opts: ListOptions = {}) {
    let rows = await this.read(table);
    for (const [k, v] of Object.entries(opts.eq || {})) rows = rows.filter((r) => r[k] === v);
    const key = opts.orderBy || "created_at";
    const asc = opts.ascending ?? false;
    rows.sort((a, b) => (String(a[key]) < String(b[key]) ? -1 : 1) * (asc ? 1 : -1));
    return rows.slice(0, opts.limit || 500);
  }
  async findOne(table: Table, eq: Record<string, unknown>) {
    return (await this.list(table, { eq, limit: 1 }))[0] || null;
  }
}

let _store: Store | null = null;
export function db(): Store {
  if (_store) return _store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _store =
    url && key
      ? new SupabaseStore(createClient(url, key, { auth: { persistSession: false } }))
      : new FileStore();
  return _store;
}

export const usingSupabase = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
