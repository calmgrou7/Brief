import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";

// 결정 처리 기록. DATABASE_URL이 있으면 Supabase의 decision_records 테이블
// (supabase/migrations/0001_decision_records.sql), 없으면 로컬 파일(.data/decisions.json).

export type DecisionStatus = "approved" | "snoozed" | "dismissed";

export interface DecisionRecord {
  status: DecisionStatus;
  /** 처리 시각 (ISO) */
  at: string;
  /** 보류는 이 날짜(포함)까지 숨긴다 */
  until?: string;
  /** 처리 당시 제목·효과 (기록 화면용) */
  title: string;
  clientName: string;
  impactLabel: string;
}

const FILE = path.join(process.cwd(), ".data", "decisions.json");

interface Row {
  id: string;
  status: DecisionStatus;
  at: Date;
  until: string | null;
  title: string;
  client_name: string;
  impact_label: string;
}

export async function loadRecords(): Promise<Record<string, DecisionRecord>> {
  const sql = db();
  if (sql) {
    const rows = await sql<Row[]>`select id, status, at, until::text as until, title, client_name, impact_label from decision_records`;
    return Object.fromEntries(
      rows.map((r) => [
        r.id,
        {
          status: r.status,
          at: r.at.toISOString(),
          until: r.until ?? undefined,
          title: r.title,
          clientName: r.client_name,
          impactLabel: r.impact_label,
        },
      ]),
    );
  }
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function saveRecord(id: string, record: DecisionRecord | null): Promise<void> {
  const sql = db();
  if (sql) {
    if (!record) {
      await sql`delete from decision_records where id = ${id}`;
      return;
    }
    await sql`
      insert into decision_records (id, status, at, until, title, client_name, impact_label)
      values (${id}, ${record.status}, ${record.at}, ${record.until ?? null}, ${record.title}, ${record.clientName}, ${record.impactLabel})
      on conflict (id) do update set
        status = excluded.status, at = excluded.at, until = excluded.until,
        title = excluded.title, client_name = excluded.client_name, impact_label = excluded.impact_label`;
    return;
  }
  const all = await loadRecords();
  if (record) all[id] = record;
  else delete all[id];
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(all, null, 2));
}

/** 오늘 결정함에 보일지: 처리 기록이 없거나, 보류 기간이 지났으면 보인다 */
export function isOpen(record: DecisionRecord | undefined, today: string): boolean {
  if (!record) return true;
  return record.status === "snoozed" && (record.until ?? "") < today;
}
