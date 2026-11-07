// Supabase Edge Function 진입점. 배포 URL 예:
//   https://<project-ref>.supabase.co/functions/v1/ai-edit
// 앱의 AI 서버 주소(VITE_AI_API_BASE)에 위 URL을 넣으면
//   .../ai-edit/api/ai/capabilities, .../ai-edit/api/ai/edit 로 호출된다.
import { handle } from "./handler.ts";

Deno.serve((req) => handle(req, { env: (k) => Deno.env.get(k), fetch }));
