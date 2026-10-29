import "server-only";
import type { DateRange } from "../types";
import { INSIGHT_FIELDS, type MetaInsightRaw } from "./insights";

// Meta Graph API 호출은 이 파일만 한다. 토큰은 서버 환경변수에서만 읽는다.

const GRAPH = "https://graph.facebook.com";

export function metaConfigured(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN);
}

function apiVersion(): string {
  return process.env.META_API_VERSION || "v24.0";
}

interface Page<T> {
  data: T[];
  paging?: { next?: string };
  error?: { message: string; code: number };
}

async function getJson<T>(url: string): Promise<Page<T>> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` },
    // 같은 조회는 1시간 캐시해 레이트리밋을 아낀다.
    next: { revalidate: 3600 },
  });
  const body = (await res.json()) as Page<T>;
  if (!res.ok || body.error) {
    throw new Error(`Meta API 오류 (${body.error?.code ?? res.status}): ${body.error?.message ?? res.statusText}`);
  }
  return body;
}

/** 광고 단위·일 단위 성과를 페이지를 끝까지 따라가며 가져온다 */
export async function fetchAdInsights(accountId: string, range: DateRange): Promise<MetaInsightRaw[]> {
  const params = new URLSearchParams({
    level: "ad",
    time_increment: "1",
    fields: INSIGHT_FIELDS,
    time_range: JSON.stringify(range),
    limit: "500",
  });
  let url: string | undefined = `${GRAPH}/${apiVersion()}/${accountId}/insights?${params}`;
  const out: MetaInsightRaw[] = [];
  while (url) {
    const page: Page<MetaInsightRaw> = await getJson<MetaInsightRaw>(url);
    out.push(...page.data);
    url = page.paging?.next;
  }
  return out;
}
