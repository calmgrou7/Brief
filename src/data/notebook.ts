/** 기기 내 답사 보관함 (P0: 회원가입 없음, 6.7절) */
import { storage } from "../platform/host.ts";

export interface SavedCandidate {
  id: string;
  label: string;
  address: string;
  checklist: { text: string; done: boolean }[];
  note: string;
  analysis_id: string;
  metric_version: string;
  saved_at: string;
}

const KEY = "notebook.v1";

export async function loadNotebook(): Promise<SavedCandidate[]> {
  const raw = await storage.get(KEY);
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function saveNotebook(items: SavedCandidate[]): Promise<void> {
  await storage.set(KEY, JSON.stringify(items));
}
