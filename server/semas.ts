/**
 * 소상공인시장진흥공단 상가(상권)정보 어댑터 (API_SETUP.md)
 * base: https://apis.data.go.kr/B553077/api/open/sdsc2
 *
 * 응답 형식은 실제 키로 아직 확인하지 않았다. 예상과 다르면 실패로 처리하고 수치를 만들지 않는다.
 */
import { getJson, UpstreamError, type Fetcher } from "./http.ts";

export const SEMAS_BASE = "https://apis.data.go.kr/B553077/api/open/sdsc2";
export const MAX_PAGES = 40;
export const QUERY_BUDGET_MS = 45_000;
const REQ_ROWS = 1000;

export interface SemasStore {
  bizesId: string;
  indsSclsCd: string | null;
  lng: number;
  lat: number;
}

export interface Envelope {
  resultCode: string;
  stdrYm: string | null;
  totalCount: number | null;
  pageNo: number | null;
  numOfRows: number | null;
  items: any[];
}

/** header/body 또는 response.header/body 봉투, items 배열 또는 items.item 배열 */
export function unwrap(json: any): Envelope {
  const root = json?.response ?? json;
  const header = root?.header;
  const body = root?.body;
  if (!header || !body) throw new UpstreamError("SHAPE", "상가정보 응답 봉투가 예상과 다름");
  const resultCode = String(header.resultCode ?? "");
  if (resultCode === "03") {
    // NODATA: 정상 응답의 0건
    return { resultCode, stdrYm: str(body.stdrYm ?? header.stdrYm), totalCount: 0, pageNo: 1, numOfRows: 0, items: [] };
  }
  if (resultCode !== "00") throw new UpstreamError(`RESULT_${resultCode || "EMPTY"}`, `상가정보 오류 코드 ${resultCode}`);
  const raw = body.items;
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.item) ? raw.item : raw == null || raw === "" ? [] : null;
  if (items === null) throw new UpstreamError("SHAPE", "상가정보 items 형식이 예상과 다름");
  return {
    resultCode,
    stdrYm: str(body.stdrYm ?? header.stdrYm),
    totalCount: num(body.totalCount),
    pageNo: num(body.pageNo),
    numOfRows: num(body.numOfRows),
    items,
  };
}

/** 전체 소분류에서 이름이 '카페' 또는 '커피 전문점'인 유일한 코드. 0개·2개 이상이면 중단. */
export async function findCafeCode(fetcher: Fetcher, key: string): Promise<{ code: string; name: string }> {
  const url = new URL(`${SEMAS_BASE}/smallUpjongList`);
  url.searchParams.set("servicekey", key);
  url.searchParams.set("type", "json");
  const env = unwrap(await getJson(fetcher, url.toString(), {}, "업종 분류"));
  return pickCafeCode(env.items);
}

export function pickCafeCode(items: any[]): { code: string; name: string } {
  const norm = (s: unknown) => String(s ?? "").replace(/\s+/g, "");
  const matches = items.filter((r) => ["카페", "커피전문점"].includes(norm(r?.indsSclsNm)) && r?.indsSclsCd);
  const codes = [...new Set(matches.map((r) => String(r.indsSclsCd)))];
  if (codes.length !== 1) {
    throw new UpstreamError("CAFE_CODE_AMBIGUOUS", `카페 소분류 코드가 ${codes.length}개로 확정 불가`);
  }
  return { code: codes[0], name: String(matches[0].indsSclsNm) };
}

export interface RadiusFetchResult {
  complete: boolean;
  reason: string | null;
  stdrYm: string | null;
  totalCount: number | null;
  stores: SemasStore[];
  pages: number;
}

/** 반경 내 전 업종 점포 전체 페이지 수집. 부분 응답은 complete=false. */
export async function fetchStoresInRadius(
  fetcher: Fetcher,
  key: string,
  center: { lng: number; lat: number },
  radiusM: number,
  now: () => number = Date.now,
): Promise<RadiusFetchResult> {
  const started = now();
  const byId = new Map<string, SemasStore>();
  let total: number | null = null;
  let stdrYm: string | null = null;
  let page = 1;
  const fail = (reason: string): RadiusFetchResult => ({
    complete: false, reason, stdrYm, totalCount: total, stores: [...byId.values()], pages: page - 1,
  });

  while (true) {
    if (page > MAX_PAGES) return fail("페이지 상한 초과");
    if (now() - started > QUERY_BUDGET_MS) return fail("조회 시간 초과");
    const url = new URL(`${SEMAS_BASE}/storeListInRadius`);
    url.searchParams.set("ServiceKey", key);
    url.searchParams.set("pageNo", String(page));
    url.searchParams.set("numOfRows", String(REQ_ROWS));
    url.searchParams.set("radius", String(radiusM));
    url.searchParams.set("cx", String(center.lng)); // 경도
    url.searchParams.set("cy", String(center.lat)); // 위도
    url.searchParams.set("type", "json");

    let env: Envelope;
    try {
      env = unwrap(await getJson(fetcher, url.toString(), {}, "상가정보"));
    } catch (e) {
      if (page === 1) throw e;
      return fail(`페이지 ${page} 실패`);
    }
    if (page === 1) {
      total = env.totalCount;
      stdrYm = env.stdrYm;
      if (total === null) return fail("totalCount 없음");
    } else if (env.stdrYm !== stdrYm) {
      return fail("페이지 간 기준월 불일치");
    }
    for (const r of env.items) {
      const s = toStore(r);
      if (s) byId.set(s.bizesId, s);
    }
    const pageSize = env.numOfRows ?? REQ_ROWS;
    const isLast = env.items.length < pageSize || page * pageSize >= total!;
    if (isLast) break;
    page++;
  }
  if (byId.size !== total) return { ...fail(`수신 ${byId.size}건 ≠ totalCount ${total}`), pages: page };
  return { complete: true, reason: null, stdrYm, totalCount: total, stores: [...byId.values()], pages: page };
}

function toStore(r: any): SemasStore | null {
  const lng = Number(r?.lon);
  const lat = Number(r?.lat);
  if (!r?.bizesId || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { bizesId: String(r.bizesId), indsSclsCd: r.indsSclsCd ? String(r.indsSclsCd) : null, lng, lat };
}

const str = (v: unknown) => (v == null || v === "" ? null : String(v));
const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
