/**
 * API + 정적 서버 (API_SETUP.md)
 *   GET /api/status
 *   GET /api/addresses?q=&page=1     → 임시 id 발급(메모리 30분)
 *   GET /api/analysis?id=..[&id=..]  → 서버가 보관한 좌표로만 집계(캐시 15분)
 * 브라우저가 보낸 위경도로 직접 집계하지 않는다.
 */
import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { SUPPORTED_GU } from "../contracts/analysis.ts";
import { buildAnalysis } from "./analysis.ts";
import { UpstreamError, type Fetcher } from "./http.ts";
import { searchAddress, type AddressCandidate } from "./kakao.ts";
import { fetchStoresInRadius, findCafeCode, type RadiusFetchResult } from "./semas.ts";

export interface AppConfig {
  kakaoKey: string;
  dataGoKrKey: string;
  allowedOrigins: string[];
  distDir: string;
  fetcher?: Fetcher;
  now?: () => number;
}

const ADDRESS_TTL = 30 * 60_000;
const ANALYSIS_TTL = 15 * 60_000;
const CAFE_CODE_TTL = 24 * 60 * 60_000;

/** 메모리 기반 고정창 제한 (프록시 뒤에서는 공유 limiter로 교체 필요) */
const LIMITS = {
  addresses: { windowMs: 60_000, max: 30 },
  analysis: { windowMs: 60 * 60_000, max: 30 },
};

class TtlMap<V> {
  private m = new Map<string, { v: V; exp: number }>();
  private now: () => number;
  constructor(now: () => number) {
    this.now = now;
  }
  get(k: string): V | undefined {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (e.exp < this.now()) {
      this.m.delete(k);
      return undefined;
    }
    return e.v;
  }
  set(k: string, v: V, ttl: number) {
    if (this.m.size > 10_000) this.sweep();
    this.m.set(k, { v, exp: this.now() + ttl });
  }
  private sweep() {
    const t = this.now();
    for (const [k, e] of this.m) if (e.exp < t) this.m.delete(k);
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp",
};

export function createHandler(cfg: AppConfig) {
  const fetcher = cfg.fetcher ?? fetch;
  const now = cfg.now ?? Date.now;
  const places = new TtlMap<AddressCandidate>(now);
  const radiusCache = new TtlMap<RadiusFetchResult>(now);
  const hits = new TtlMap<number>(now);
  let cafe: { code: string; exp: number } | null = null;
  const distRoot = resolve(cfg.distDir);

  const supported = (p: AddressCandidate) => p.sido.startsWith("부산") && (SUPPORTED_GU as readonly string[]).includes(p.gu);

  function limited(kind: keyof typeof LIMITS, ip: string): boolean {
    const { windowMs, max } = LIMITS[kind];
    const k = `${kind}:${ip}:${Math.floor(now() / windowMs)}`;
    const n = (hits.get(k) ?? 0) + 1;
    hits.set(k, n, windowMs);
    return n > max;
  }

  async function cafeCode(): Promise<string> {
    if (cafe && cafe.exp > now()) return cafe.code;
    const { code } = await findCafeCode(fetcher, cfg.dataGoKrKey);
    cafe = { code, exp: now() + CAFE_CODE_TTL };
    return code;
  }

  async function api(req: IncomingMessage, url: URL): Promise<[number, unknown]> {
    const ip = req.socket.remoteAddress ?? "unknown";
    if (url.pathname === "/api/status") {
      // 설정 여부만. 인증 성공을 뜻하지 않는다.
      return [200, { kakao_configured: !!cfg.kakaoKey, data_go_kr_configured: !!cfg.dataGoKrKey, supported_gu: SUPPORTED_GU }];
    }

    if (url.pathname === "/api/addresses") {
      if (limited("addresses", ip)) return [429, { error: "RATE_LIMITED" }];
      const q = (url.searchParams.get("q") ?? "").trim();
      const page = Number(url.searchParams.get("page") ?? "1");
      if (q.length < 2 || q.length > 60 || !Number.isInteger(page) || page < 1 || page > 45) {
        return [400, { error: "INVALID_INPUT", message: "검색어는 2~60자, page는 1~45" }];
      }
      if (!cfg.kakaoKey) return [503, { error: "DATA_UNAVAILABLE", message: "주소 검색 키 미설정" }];
      const { items, isEnd } = await searchAddress(fetcher, cfg.kakaoKey, q, page);
      return [200, {
        is_end: isEnd,
        items: items.map((p) => {
          const id = randomUUID();
          places.set(id, p, ADDRESS_TTL);
          return { id, label: p.label, address: p.address, gu: p.gu, supported: supported(p), location: { lng: p.lng, lat: p.lat } };
        }),
      }];
    }

    if (url.pathname === "/api/analysis") {
      const ids = url.searchParams.getAll("id");
      if (ids.length < 1 || ids.length > 2 || new Set(ids).size !== ids.length) return [400, { error: "INVALID_INPUT" }];
      const ps = ids.map((id) => places.get(id));
      if (ps.some((p) => !p)) return [400, { error: "INVALID_INPUT", message: "주소 선택이 만료됐어요. 다시 검색해 주세요." }];
      if (ps.some((p) => !supported(p!))) return [422, { error: "OUTSIDE_COVERAGE", supported: SUPPORTED_GU }];
      if (limited("analysis", ip)) return [429, { error: "RATE_LIMITED" }];
      if (!cfg.dataGoKrKey) return [503, { error: "DATA_UNAVAILABLE", message: "상가정보 키 미설정" }];

      const code = await cafeCode();
      const keys = ["A", "B"] as const;
      const inputs = await Promise.all(
        ps.map(async (p, i) => {
          const ck = `${code}|${p!.lng.toFixed(6)},${p!.lat.toFixed(6)}|500`;
          let r = radiusCache.get(ck);
          if (!r) {
            try {
              r = await fetchStoresInRadius(fetcher, cfg.dataGoKrKey, { lng: p!.lng, lat: p!.lat }, 500, now);
            } catch (e) {
              r = { complete: false, reason: e instanceof UpstreamError ? e.message : "조회 실패", stdrYm: null, totalCount: null, stores: [], pages: 0 };
            }
            if (r.complete) radiusCache.set(ck, r, ANALYSIS_TTL); // 부분 결과는 캐시하지 않음
          }
          return { key: keys[i], place: p!, radius: r };
        }),
      );
      const out = buildAnalysis(randomUUID(), code, inputs, new Date(now()).toISOString().slice(0, 10));
      if (out.status === "failed") return [503, { error: "DATA_UNAVAILABLE", message: "상가정보를 끝까지 받지 못했어요.", detail: out.limitations }];
      return [200, out];
    }
    return [404, { error: "NOT_FOUND" }];
  }

  async function serveStatic(res: ServerResponse, pathname: string) {
    let rel: string;
    try {
      rel = decodeURIComponent(pathname);
    } catch {
      return send(res, 400, "text/plain", "bad request");
    }
    let file = resolve(join(distRoot, rel));
    if (file !== distRoot && !file.startsWith(distRoot + sep)) return send(res, 403, "text/plain", "forbidden");
    let st = await stat(file).catch(() => null);
    if (!st || st.isDirectory()) {
      if (extname(rel)) return send(res, 404, "text/plain", "not found");
      file = join(distRoot, "index.html"); // SPA
      st = await stat(file).catch(() => null);
      if (!st) return send(res, 404, "text/plain", "웹 빌드 없음 (npm run build:web)");
    }
    const body = await readFile(file);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (file.includes(`${sep}assets${sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    send(res, 200, MIME[extname(file)] ?? "application/octet-stream", body);
  }

  return async function handler(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const origin = req.headers.origin;
    if (origin && cfg.allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") return send(res, 204, "text/plain", "");
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "text/plain", "method not allowed");

    if (url.pathname.startsWith("/api/")) {
      try {
        const [status, body] = await api(req, url);
        res.setHeader("Cache-Control", "no-store");
        return send(res, status, "application/json; charset=utf-8", JSON.stringify(body));
      } catch (e) {
        const msg = e instanceof UpstreamError ? e.message : "내부 오류";
        if (!(e instanceof UpstreamError)) console.error("[api]", url.pathname, (e as Error)?.stack ?? e); // 쿼리(주소) 미기록
        return send(res, 503, "application/json; charset=utf-8", JSON.stringify({ error: "DATA_UNAVAILABLE", message: msg }));
      }
    }
    return serveStatic(res, url.pathname);
  };
}

function send(res: ServerResponse, status: number, type: string, body: string | Buffer) {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(body);
}
