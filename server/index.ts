/** 실행: node --env-file-if-exists=.env server/index.ts  (npm run dev:api / npm start) */
import { createServer } from "node:http";
import { createHandler } from "./app.ts";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const handler = createHandler({
  kakaoKey: process.env.KAKAO_REST_API_KEY ?? "",
  dataGoKrKey: process.env.DATA_GO_KR_SERVICE_KEY ?? "",
  allowedOrigins,
  distDir: new URL("../dist", import.meta.url).pathname,
});

createServer(handler).listen(port, host, () => {
  console.log(`API 서버: http://${host}:${port}`);
  console.log(`  카카오 키 ${process.env.KAKAO_REST_API_KEY ? "설정됨" : "없음"} · 상가정보 키 ${process.env.DATA_GO_KR_SERVICE_KEY ? "설정됨" : "없음"} (설정됨 ≠ 인증 성공)`);
  console.log(`  허용 origin: ${allowedOrigins.join(", ") || "(없음 — 같은 출처만)"}`);
});
