import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHandler } from "../server/app.ts";
import { parseKakaoDocuments } from "../server/kakao.ts";
import { fetchStoresInRadius, pickCafeCode, unwrap } from "../server/semas.ts";

const C = { lng: 129.0592, lat: 35.1578 };
const north = (m: number) => C.lat + m / 111_195;

// ---------- semas parsing ----------
test("봉투: header/body 와 response.header/body, items 와 items.item", () => {
  assert.equal(unwrap({ header: { resultCode: "00" }, body: { items: [{ a: 1 }], totalCount: 1 } }).items.length, 1);
  assert.equal(unwrap({ response: { header: { resultCode: "00" }, body: { items: { item: [{}, {}] } } } }).items.length, 2);
  assert.equal(unwrap({ header: { resultCode: "03" }, body: {} }).totalCount, 0);
  assert.throws(() => unwrap({ header: { resultCode: "30" }, body: {} }), /오류 코드 30/);
  assert.throws(() => unwrap({ foo: 1 }), /봉투/);
});

test("카페 코드: 유일할 때만", () => {
  assert.deepEqual(pickCafeCode([{ indsSclsCd: "I21201", indsSclsNm: "카페" }, { indsSclsCd: "I2", indsSclsNm: "제과점" }]), { code: "I21201", name: "카페" });
  assert.equal(pickCafeCode([{ indsSclsCd: "X1", indsSclsNm: "커피 전문점" }]).code, "X1");
  assert.throws(() => pickCafeCode([{ indsSclsCd: "A", indsSclsNm: "카페" }, { indsSclsCd: "B", indsSclsNm: "커피전문점" }]), /2개/);
  assert.throws(() => pickCafeCode([{ indsSclsCd: "A", indsSclsNm: "카페·디저트" }]), /0개/);
});

test("카카오: REGION_ADDR/ROAD_ADDR만", () => {
  const r = parseKakaoDocuments([
    { address_type: "REGION", x: "129", y: "35" },
    { address_type: "ROAD_ADDR", address_name: "부산 부산진구 중앙대로 692", x: "129.05", y: "35.15",
      address: { region_1depth_name: "부산", region_2depth_name: "부산진구", region_3depth_h_name: "부전2동", h_code: "2623010" },
      road_address: { address_name: "부산 부산진구 중앙대로 692", building_name: "" } },
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].gu, "부산진구");
  assert.equal(r[0].dong_h_name, "부전2동");
});

// ---------- fake upstream ----------
type Store = { bizesId: string; indsSclsCd: string; lon: string; lat: string };
function makeStores(n: number, cafes: number): Store[] {
  return Array.from({ length: n }, (_, i) => ({
    bizesId: `S${i}`, indsSclsCd: i < cafes ? "CAFE01" : "OTHER", lon: String(C.lng), lat: String(north(10 + (i % 400))),
  }));
}

function fakeFetch(opts: { stores: Store[]; pageSize?: number; failPage?: number; kakaoGu?: string }) {
  const calls: string[] = [];
  const fn = async (url: string) => {
    calls.push(url);
    const u = new URL(url);
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });
    if (u.hostname === "dapi.kakao.com") {
      return json({ meta: { is_end: true }, documents: [
        { address_type: "ROAD_ADDR", address_name: `부산 ${opts.kakaoGu ?? "부산진구"} 가상로 1`, x: String(C.lng), y: String(C.lat),
          address: { region_1depth_name: "부산", region_2depth_name: opts.kakaoGu ?? "부산진구", region_3depth_h_name: "가상동", h_code: "1" } },
        { address_type: "ROAD_ADDR", address_name: "부산 수영구 가상로 2", x: String(C.lng + 0.001), y: String(C.lat),
          address: { region_1depth_name: "부산", region_2depth_name: "수영구", region_3depth_h_name: "가상동2", h_code: "2" } },
      ] });
    }
    if (u.pathname.endsWith("/smallUpjongList")) {
      return json({ header: { resultCode: "00" }, body: { items: [{ indsSclsCd: "CAFE01", indsSclsNm: "카페" }] } });
    }
    if (u.pathname.endsWith("/storeListInRadius")) {
      const page = Number(u.searchParams.get("pageNo"));
      if (page === opts.failPage) return new Response("err", { status: 500 });
      const size = opts.pageSize ?? Number(u.searchParams.get("numOfRows"));
      const items = opts.stores.slice((page - 1) * size, page * size);
      return json({ header: { resultCode: "00", stdrYm: "202609" }, body: { items, totalCount: opts.stores.length, pageNo: page, numOfRows: size } });
    }
    return new Response("nf", { status: 404 });
  };
  return { fn, calls };
}

test("반경 수집: 여러 페이지 완전 수집", async () => {
  const { fn } = fakeFetch({ stores: makeStores(2500, 30), pageSize: 1000 });
  const r = await fetchStoresInRadius(fn, "k", C, 500);
  assert.equal(r.complete, true);
  assert.equal(r.pages, 3);
  assert.equal(r.stores.length, 2500);
  assert.equal(r.stdrYm, "202609");
});

test("반경 수집: 중간 페이지 실패는 미완료", async () => {
  const { fn } = fakeFetch({ stores: makeStores(2500, 30), pageSize: 1000, failPage: 2 });
  const r = await fetchStoresInRadius(fn, "k", C, 500);
  assert.equal(r.complete, false);
  assert.match(r.reason!, /페이지 2/);
});

// ---------- HTTP ----------
async function withServer(cfg: Parameters<typeof createHandler>[0], fn: (base: string) => Promise<void>) {
  const srv = createServer(createHandler(cfg)).listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  try {
    await fn(`http://127.0.0.1:${(srv.address() as any).port}`);
  } finally {
    srv.close();
  }
}
const dist = (() => {
  const d = mkdtempSync(join(tmpdir(), "dist-"));
  mkdirSync(join(d, "assets"));
  writeFileSync(join(d, "index.html"), "<html>ok</html>");
  writeFileSync(join(d, "assets", "a.js"), "1");
  return d;
})();

test("주소 → 분석 전체 흐름, 키 비노출, 캐시", async () => {
  const { fn, calls } = fakeFetch({ stores: makeStores(120, 7) });
  await withServer({ kakaoKey: "KAKAO_SECRET", dataGoKrKey: "DATA_SECRET", allowedOrigins: [], distDir: dist, fetcher: fn }, async (base) => {
    const st = await (await fetch(`${base}/api/status`)).text();
    assert.ok(!st.includes("SECRET"));
    const a = await (await fetch(`${base}/api/addresses?q=${encodeURIComponent("가상로")}`)).json();
    assert.equal(a.items.length, 2);
    assert.equal(a.items[0].supported, true);
    const res = await fetch(`${base}/api/analysis?id=${a.items[0].id}&id=${a.items[1].id}`);
    const body = await res.json();
    assert.equal(res.status, 200);
    const comp = body.evidence.find((e: any) => e.id === "E_COMPETITORS_A");
    assert.equal(comp.value, 7);
    assert.equal(comp.source_period, "202609");
    assert.equal(body.evidence.find((e: any) => e.id === "E_POP_A").status, "missing");
    assert.equal(body.comparison.find((r: any) => r.metric === "dong_population").status, "not_comparable");
    assert.equal(body.is_fixture, false);
    assert.ok(!JSON.stringify(body).includes("SECRET"));
    const radiusCalls = calls.filter((c) => c.includes("storeListInRadius")).length;
    await fetch(`${base}/api/analysis?id=${a.items[0].id}`);
    assert.equal(calls.filter((c) => c.includes("storeListInRadius")).length, radiusCalls, "캐시 재사용");
  });
});

test("지원 지역 밖 422, 만료·임의 id 400, 브라우저 좌표 무시", async () => {
  const { fn } = fakeFetch({ stores: makeStores(5, 1), kakaoGu: "중구" });
  await withServer({ kakaoKey: "k", dataGoKrKey: "d", allowedOrigins: [], distDir: dist, fetcher: fn }, async (base) => {
    const a = await (await fetch(`${base}/api/addresses?q=가상로`)).json();
    assert.equal(a.items[0].supported, false);
    assert.equal((await fetch(`${base}/api/analysis?id=${a.items[0].id}`)).status, 422);
    assert.equal((await fetch(`${base}/api/analysis?id=nope`)).status, 400);
    assert.equal((await fetch(`${base}/api/analysis?cx=129&cy=35`)).status, 400);
    assert.equal((await fetch(`${base}/api/addresses?q=a`)).status, 400);
  });
});

test("키 미설정 503, CORS 정확 일치, 정적 경로 탈출 차단", async () => {
  await withServer({ kakaoKey: "", dataGoKrKey: "", allowedOrigins: ["https://app.example"], distDir: dist }, async (base) => {
    assert.equal((await fetch(`${base}/api/addresses?q=부산진구`)).status, 503);
    const ok = await fetch(`${base}/api/status`, { headers: { Origin: "https://app.example" } });
    assert.equal(ok.headers.get("access-control-allow-origin"), "https://app.example");
    const no = await fetch(`${base}/api/status`, { headers: { Origin: "https://evil.example" } });
    assert.equal(no.headers.get("access-control-allow-origin"), null);
    assert.equal(await (await fetch(`${base}/`)).text(), "<html>ok</html>");
    assert.equal(await (await fetch(`${base}/notebook`)).text(), "<html>ok</html>");
    for (const p of ["/%2e%2e/%2e%2e/etc/passwd", "/..%2f..%2fetc/passwd", "/%2e%2e%2f%2e%2e%2fetc%2fpasswd"]) {
      const body = await (await fetch(base + p)).text();
      assert.ok(!body.includes("root:"), p);
      assert.ok(body === "<html>ok</html>" || body === "forbidden", `${p} → ${body}`);
    }
    assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
  });
});
