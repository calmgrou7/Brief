/**
 * 1주차 데이터 검증 게이트 — D1 소상공인시장진흥공단 상가(상권)정보 (기획서 6.2절)
 *
 * 하는 일
 *  1) 업종 소분류 목록에서 '카페'가 들어간 공식 코드를 찾아 출력 (코드 추측 금지)
 *  2) 부산 표본 좌표 반경 500m 조회 → totalCount·페이지 완전성·좌표 범위 확인
 *  3) 결과를 data/probe/ 에 원본 JSON으로 저장 (키는 저장·출력하지 않음)
 *
 * 실행
 *   DATA_GO_KR_KEY=발급받은_디코딩_키 node scripts/d1-probe.ts
 *
 * 주의: 파라미터 이름은 공개 활용가이드 기준 후보다. 첫 실행 응답의 header/에러 메시지로
 * 반드시 확인하고, 다르면 PARAMS를 수정한다.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://apis.data.go.kr/B553077/api/open/sdsc2";
const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) {
  console.error("DATA_GO_KR_KEY 환경변수가 없습니다. data.go.kr에서 15012005 활용신청 후 설정하세요.");
  process.exit(1);
}

/** 표본 좌표: 대략적인 생활권 중심. 실제 후보 주소로 교체해도 된다. */
const SAMPLES = [
  { name: "부산진구 서면역 인근", lng: 129.0592, lat: 35.1578 },
  { name: "수영구 광안리 인근", lng: 129.1186, lat: 35.1532 },
  { name: "해운대구 해운대역 인근", lng: 129.1588, lat: 35.1637 },
];
const RADIUS_M = 500;
const PAGE_SIZE = 1000;

const OUT = "data/probe";
mkdirSync(OUT, { recursive: true });

async function call(op: string, params: Record<string, string | number>) {
  const url = new URL(`${BASE}/${op}`);
  url.searchParams.set("serviceKey", KEY!);
  url.searchParams.set("type", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url);
  const text = await res.text();
  const safeUrl = url.toString().replace(encodeURIComponent(KEY!), "***").replace(KEY!, "***");
  if (!res.ok) throw new Error(`${op} HTTP ${res.status} (${safeUrl})\n${text.slice(0, 500)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${op} JSON 아님 — 키 인코딩/승인 상태 확인 필요\n${text.slice(0, 500)}`);
  }
}

function items(json: any): any[] {
  const it = json?.body?.items;
  return Array.isArray(it) ? it : Array.isArray(it?.item) ? it.item : [];
}

async function main() {
  console.log("1) 업종 소분류 목록 조회 (smallUpjongList)");
  const upjong = await call("smallUpjongList", {});
  writeFileSync(`${OUT}/smallUpjongList.json`, JSON.stringify(upjong, null, 2));
  const cafe = items(upjong).filter((r) => JSON.stringify(r).includes("카페") || JSON.stringify(r).includes("커피"));
  console.log(`   '카페/커피' 포함 분류 ${cafe.length}건 → 수동 검토 후 industry_mappings에 기록하세요:`);
  for (const r of cafe) console.log("   ", JSON.stringify(r));

  console.log(`\n2) 반경 ${RADIUS_M}m 표본 조회 (storeListInRadius)`);
  for (const s of SAMPLES) {
    let page = 1;
    let total = Number.NaN;
    const rows: any[] = [];
    do {
      const json = await call("storeListInRadius", {
        radius: RADIUS_M, cx: s.lng, cy: s.lat, pageNo: page, numOfRows: PAGE_SIZE,
      });
      if (page === 1) {
        total = Number(json?.body?.totalCount);
        writeFileSync(`${OUT}/radius_${s.name.replace(/\s/g, "_")}_p1_header.json`,
          JSON.stringify({ header: json?.header, totalCount: json?.body?.totalCount }, null, 2));
      }
      const got = items(json);
      rows.push(...got);
      if (got.length === 0) break;
      page++;
    } while (rows.length < total);

    const ids = new Set(rows.map((r) => r.bizesId));
    const badCoord = rows.filter((r) => !(+r.lon >= 128.7 && +r.lon <= 129.4 && +r.lat >= 34.9 && +r.lat <= 35.4));
    const complete = Number.isFinite(total) && ids.size === total;
    writeFileSync(`${OUT}/radius_${s.name.replace(/\s/g, "_")}.json`, JSON.stringify(rows, null, 2));
    console.log(
      `   ${s.name}: totalCount=${total}, 수집=${rows.length}, 고유ID=${ids.size}, ` +
        `부산 범위 밖 좌표=${badCoord.length}, 완전성=${complete ? "통과" : "실패"}`,
    );
  }

  console.log("\n다음: 응답 필드명(bizesId·lon·lat·indsSclsCd 등)을 확인하고 DB 스키마를 확정하세요.");
  console.log(`원본은 ${OUT}/ 에 저장됨 (git에는 올리지 않음).`);
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
