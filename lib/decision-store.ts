import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// 결정 처리 기록. 지금은 로컬 파일(.data/decisions.json)에 저장하고,
// 2단계에서 Supabase approvals 테이블로 옮긴다 (docs/schema.sql).

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

export async function loadRecords(): Promise<Record<string, DecisionRecord>> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function saveRecord(id: string, record: DecisionRecord | null): Promise<void> {
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
