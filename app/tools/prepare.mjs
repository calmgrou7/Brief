// 원본 소스 없이 빌드본(dist)에 AI 스튜디오 서버 주소를 연결한다.
//   AI_BASE=https://<ref>.supabase.co/functions/v1/ai-edit node tools/prepare.mjs
// - 빌드본에 빈 문자열로 고정된 AI 주소를 globalThis.FACED_AI_BASE 로 바꾼다 (한 번만, 여러 번 실행해도 안전)
// - dist/ai-config.js 에 주소를 기록하고 index.html 에서 먼저 불러온다
// AI_BASE 가 비어 있으면 앱은 기존처럼 "연결 준비 중"을 보여주고 사진을 외부로 보내지 않는다.
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(import.meta.dirname, "../dist");
const base = (process.env.AI_BASE ?? "").trim().replace(/\/$/, "");
if (base && !/^https:\/\/[^\s"'`\\]+$/.test(base) && !/^http:\/\/localhost(:\d+)?(\/[^\s"'`\\]*)?$/.test(base)) {
  console.error("AI_BASE 는 https:// 로 시작하는 주소여야 해요:", base);
  process.exit(1);
}

const ORIGINAL = "C=``.replace(/\\/$/,``)";
const PATCHED = "C=(globalThis.FACED_AI_BASE||``).replace(/\\/$/,``)";
const assets = path.join(dist, "assets");
const entries = fs.readdirSync(assets).filter((f) => /^index-.*\.js$/.test(f));
if (entries.length !== 1) throw new Error(`entry js 를 하나만 찾아야 하는데 ${entries.length}개예요`);
const jsPath = path.join(assets, entries[0]);
let js = fs.readFileSync(jsPath, "utf8");
const count = js.split(ORIGINAL).length - 1;
if (count === 1) {
  js = js.replace(ORIGINAL, PATCHED);
  fs.writeFileSync(jsPath, js);
  console.log("패치 적용:", entries[0]);
} else if (js.includes(PATCHED)) {
  console.log("이미 패치됨:", entries[0]);
} else {
  throw new Error("AI 주소 위치를 찾지 못했어요. 빌드본이 바뀌었는지 확인하세요.");
}

fs.writeFileSync(path.join(dist, "ai-config.js"), `globalThis.FACED_AI_BASE=${JSON.stringify(base)};\n`);

const htmlPath = path.join(dist, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
if (!html.includes('src="/ai-config.js"')) {
  html = html.replace('<script type="module"', '<script src="/ai-config.js"></script>\n  <script type="module"');
  fs.writeFileSync(htmlPath, html);
}
console.log("AI 서버 주소:", base || "(비어 있음 → AI 스튜디오는 '연결 준비 중')");
