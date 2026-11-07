/**
 * Kakao Local 주소 → 좌표 (API_SETUP.md)
 * GET https://dapi.kakao.com/v2/local/search/address.json, Authorization: KakaoAK {REST 키}
 * REGION_ADDR / ROAD_ADDR 만 선택 후보로 사용한다.
 */
import { getJson, UpstreamError, type Fetcher } from "./http.ts";

export interface AddressCandidate {
  label: string;
  address: string;
  sido: string;
  gu: string;
  dong_h_name: string | null;
  dong_h_code: string | null;
  lng: number;
  lat: number;
}

const ENDPOINT = "https://dapi.kakao.com/v2/local/search/address.json";

export async function searchAddress(
  fetcher: Fetcher,
  key: string,
  query: string,
  page: number,
): Promise<{ items: AddressCandidate[]; isEnd: boolean }> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", "10");
  const json = (await getJson(fetcher, url.toString(), { headers: { Authorization: `KakaoAK ${key}` } }, "주소 검색")) as any;
  if (!json || !Array.isArray(json.documents)) throw new UpstreamError("SHAPE", "주소 검색 응답 형식이 예상과 다름");
  return { items: parseKakaoDocuments(json.documents), isEnd: json.meta?.is_end !== false };
}

export function parseKakaoDocuments(docs: any[]): AddressCandidate[] {
  const out: AddressCandidate[] = [];
  for (const d of docs) {
    if (d?.address_type !== "REGION_ADDR" && d?.address_type !== "ROAD_ADDR") continue;
    const lng = Number(d.x);
    const lat = Number(d.y);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const region = d.address ?? d.road_address ?? {};
    const road = d.road_address;
    out.push({
      label: road?.building_name ? `${road.building_name}` : String(d.address_name ?? ""),
      address: String(road?.address_name ?? d.address_name ?? ""),
      sido: String(region.region_1depth_name ?? ""),
      gu: String(region.region_2depth_name ?? ""),
      dong_h_name: d.address?.region_3depth_h_name || null,
      dong_h_code: d.address?.h_code || null,
      lng,
      lat,
    });
  }
  return out;
}
