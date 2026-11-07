/**
 * 분석 API 클라이언트.
 *  - live: 서버(/api/addresses → /api/analysis). VITE_API_BASE_URL 비우면 같은 출처.
 *  - fixture: VITE_DATA_MODE=fixture 일 때만. 운영에서 서버 장애 시 가상 데이터로 몰래 대체하지 않는다.
 */
import type { AnalysisResponse, LngLat } from "../../contracts/analysis.ts";
import { SUPPORTED_GU } from "../../contracts/analysis.ts";
import complete from "../../fixtures/analysis.complete.json";
import partial from "../../fixtures/analysis.partial-population.json";

export interface Place {
  id: string;
  label: string;
  address: string;
  gu: string;
  supported: boolean;
  location: LngLat;
}

export const DATA_MODE: "live" | "fixture" = import.meta.env.VITE_DATA_MODE === "fixture" ? "fixture" : "live";
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const MESSAGES: Record<string, string> = {
  INVALID_INPUT: "입력을 확인해 주세요.",
  OUTSIDE_COVERAGE: `아직 분석할 수 없는 지역이에요. 지원 지역: ${SUPPORTED_GU.join(", ")}`,
  RATE_LIMITED: "요청이 많아요. 잠시 후 다시 시도해 주세요.",
  DATA_UNAVAILABLE: "자료를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
};

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { signal, headers: { Accept: "application/json" } });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("NETWORK", "서버에 연결하지 못했어요. 네트워크를 확인해 주세요.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const code = body?.error ?? "DATA_UNAVAILABLE";
    throw new ApiError(code, body?.message ?? MESSAGES[code] ?? MESSAGES.DATA_UNAVAILABLE);
  }
  return body as T;
}

// ---------- fixture ----------
const FIXTURE_PLACES: Place[] = [
  { id: "p1", label: "서면역 인근 (가상)", address: "부산 부산진구 가상로 1", gu: "부산진구", supported: true, location: { lng: 129.0592, lat: 35.1578 } },
  { id: "p2", label: "광안리 인근 (가상)", address: "부산 수영구 가상로 2", gu: "수영구", supported: true, location: { lng: 129.1186, lat: 35.1532 } },
  { id: "p3", label: "해운대역 인근 (가상)", address: "부산 해운대구 가상로 3", gu: "해운대구", supported: true, location: { lng: 129.1588, lat: 35.1637 } },
  { id: "p4", label: "전포동 카페거리 (가상)", address: "부산 부산진구 가상로 4", gu: "부산진구", supported: true, location: { lng: 129.0647, lat: 35.1547 } },
  { id: "p5", label: "남포동 인근 (가상·지원 밖)", address: "부산 중구 가상로 5", gu: "중구", supported: false, location: { lng: 129.0303, lat: 35.0979 } },
];

function fixtureAnalysis(places: Place[]): AnalysisResponse {
  const base = (places[1]?.gu === "해운대구" ? partial : complete) as AnalysisResponse;
  const res: AnalysisResponse = structuredClone(base);
  res.candidates = res.candidates
    .slice(0, places.length)
    .map((c, i) => ({ ...c, label: places[i].label, location: places[i].location }));
  if (places.length === 1) {
    res.evidence = res.evidence.filter((e) => e.candidate === "A");
    res.comparison = null;
  }
  return res;
}

// ---------- public ----------
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const t = q.trim();
  if (DATA_MODE === "fixture") {
    return t ? FIXTURE_PLACES.filter((p) => p.label.includes(t) || p.address.includes(t)) : FIXTURE_PLACES;
  }
  if (t.length < 2) return [];
  const r = await get<{ items: Place[] }>(`/api/addresses?q=${encodeURIComponent(t)}&page=1`, signal);
  return r.items;
}

export async function analyze(places: Place[]): Promise<AnalysisResponse> {
  if (places.some((p) => !p.supported)) throw new ApiError("OUTSIDE_COVERAGE", MESSAGES.OUTSIDE_COVERAGE);
  if (DATA_MODE === "fixture") {
    await new Promise((r) => setTimeout(r, 400));
    return fixtureAnalysis(places);
  }
  return get<AnalysisResponse>(`/api/analysis?${places.map((p) => `id=${encodeURIComponent(p.id)}`).join("&")}`);
}
