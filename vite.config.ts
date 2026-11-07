import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import aitDevtools from "@apps-in-toss/devtools/unplugin";

// aitDevtools: 일반 브라우저 개발 시 앱인토스 SDK를 mock으로 치환 (프로덕션 빌드에서는 비활성)
export default defineConfig({
  plugins: [aitDevtools.vite(), react()],
  build: { outDir: "dist" },
  // 개발 중 /api 는 로컬 API 서버(npm run dev:api)로 전달 → 같은 출처처럼 동작
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
});
