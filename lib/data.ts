import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { addDays, today } from "./dates";
import { fetchAdInsights, metaConfigured } from "./meta/client";
import { adsFromInsights, parseInsight } from "./meta/insights";
import { SAMPLE_CLIENTS, sampleAds, sampleInsights } from "./sample-data";
import type { Ad, Client, InsightRow } from "./types";

// 화면은 이 모듈만 통해 데이터를 읽는다.
// - META_ACCESS_TOKEN + clients.config.json 이 있으면 메타 실데이터
// - 아니면 샘플 데이터
// 다음 단계에서 Supabase 저장소가 이 자리에 들어온다.

/** 화면이 쓰는 최대 조회 범위: 최근 30일 + 비교용 직전 30일 + 여유 */
const LOOKBACK_DAYS = 70;

export type DataMode = "sample" | "meta";

export interface ClientData {
  client: Client;
  ads: Ad[];
  rows: InsightRow[];
  /** 기간 계산의 기준일 (계정 시간대의 오늘) */
  anchor: string;
}

const loadConfig = cache(async (): Promise<Client[] | null> => {
  try {
    const raw = await readFile(path.join(process.cwd(), "clients.config.json"), "utf8");
    return JSON.parse(raw) as Client[];
  } catch {
    return null;
  }
});

export const getMode = cache(async (): Promise<DataMode> => {
  return metaConfigured() && (await loadConfig()) ? "meta" : "sample";
});

export const listClients = cache(async (): Promise<Client[]> => {
  return (await getMode()) === "meta" ? ((await loadConfig()) ?? []) : SAMPLE_CLIENTS;
});

export const getClientData = cache(async (id: string): Promise<ClientData | null> => {
  const client = (await listClients()).find((c) => c.id === id);
  if (!client) return null;
  const anchor = today();

  if ((await getMode()) === "sample") {
    return { client, ads: sampleAds(id), rows: sampleInsights(id, anchor, LOOKBACK_DAYS), anchor };
  }

  if (!client.metaAccountId) return { client, ads: [], rows: [], anchor };
  const raws = await fetchAdInsights(client.metaAccountId, { since: addDays(anchor, -(LOOKBACK_DAYS - 1)), until: anchor });
  return { client, ads: adsFromInsights(id, raws), rows: raws.map(parseInsight), anchor };
});
