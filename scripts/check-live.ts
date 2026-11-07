/**
 * 실데이터 연결 확인: npm run check:live
 * .env의 키로 부산 주소 두 곳을 검색 → 500m 집계를 출력한다. 키 값은 출력하지 않는다.
 */
import { createHandler } from "../server/app.ts";
import { createServer } from "node:http";

const QUERIES = process.argv.slice(2).length ? process.argv.slice(2) : ["부산 부산진구 중앙대로 692", "부산 수영구 광안해변로 219"];

if (!process.env.KAKAO_REST_API_KEY || !process.env.DATA_GO_KR_SERVICE_KEY) {
  console.error("KAKAO_REST_API_KEY / DATA_GO_KR_SERVICE_KEY 가 .env에 필요합니다.");
  process.exit(1);
}
const handler = createHandler({
  kakaoKey: process.env.KAKAO_REST_API_KEY,
  dataGoKrKey: process.env.DATA_GO_KR_SERVICE_KEY,
  allowedOrigins: [],
  distDir: "dist",
});
const server = createServer(handler).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const get = async (path: string) => {
  const r = await fetch(base + path);
  return { status: r.status, body: await r.json() };
};

try {
  const ids: string[] = [];
  for (const q of QUERIES) {
    const { status, body } = await get(`/api/addresses?q=${encodeURIComponent(q)}`);
    const first = body.items?.[0];
    console.log(`주소 "${q}" → HTTP ${status}, 후보 ${body.items?.length ?? 0}건${first ? `, 첫 후보 ${first.address} (${first.gu}, 지원=${first.supported})` : ""}`);
    if (status !== 200 || !first) throw new Error(body.message ?? "주소 검색 실패");
    ids.push(first.id);
  }
  const { status, body } = await get(`/api/analysis?${ids.map((i) => `id=${i}`).join("&")}`);
  console.log(`\n분석 HTTP ${status} · status=${body.status ?? body.error}`);
  for (const e of body.evidence ?? []) {
    console.log(`  후보 ${e.candidate} ${e.metric.padEnd(22)} ${String(e.value).padStart(6)} ${e.unit.padEnd(8)} ${e.status} 기준월=${e.source_period}`);
  }
  for (const l of body.limitations ?? body.detail ?? []) console.log("  · " + l);
  console.log("\n공식 사이트 수치와 대조하세요: 전체 페이지 수신, 중복, 업종코드, 기준월, 0건.");
} catch (e) {
  console.error("실패:", (e as Error).message);
  process.exitCode = 1;
} finally {
  server.close();
}
