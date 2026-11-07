// FACE:D AI 스튜디오 백엔드.
//
// 앱(빌드본 Oi 컴포넌트)이 기대하는 계약:
//   GET  {BASE}/api/ai/capabilities -> 200 {"enabled": boolean}
//   POST {BASE}/api/ai/edit  multipart/form-data
//        image   : PNG 파일 (portrait.png)
//        kind    : background | remove | hair | outfit | prompt
//        prompt  : 사용자 요청 문장 (최대 600자)
//        consent : "true"
//      -> 성공: 200 image/png 바이너리
//      -> 실패: 4xx/5xx {"message": "한국어 안내 문구"}
// 클라이언트는 credentials: "include" 로 호출하므로 CORS 는 정확한 Origin 을
// 돌려주고 Access-Control-Allow-Credentials: true 를 붙여야 한다.
//
// 이 파일은 Deno/Node 어디서든 돌도록 웹 표준 API만 쓴다. (테스트: supabase/tests)

export type Env = (name: string) => string | undefined;

export type Deps = {
  env: Env;
  fetch: typeof fetch;
  now?: () => number;
};

export const KINDS = ["background", "remove", "hair", "outfit", "prompt"] as const;
export type Kind = (typeof KINDS)[number];

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PROMPT = 600;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

// 얼굴을 바꾸지 않도록 모든 요청에 공통으로 붙는 안전 지시.
const PRESERVE =
  "Keep the person's identity exactly the same: do not change the face shape, eyes, nose, mouth, skin tone, age, expression or body proportions. " +
  "Keep the original framing, pose, lighting direction and photo realism. Do not add text, logos or watermarks.";

const KIND_INSTRUCTION: Record<Kind, string> = {
  background: "Replace only the background behind the person with: ",
  remove: "Remove the described object(s) and fill the area naturally so it matches the surroundings: ",
  hair: "Change only the hairstyle (keep the face untouched) to: ",
  outfit: "Change only the clothing (keep the face, neck and hands untouched) to: ",
  prompt: "Apply this edit to the photo: ",
};

export function buildPrompt(kind: Kind, userPrompt: string): string {
  return `${KIND_INSTRUCTION[kind]}${userPrompt.trim()}\n\n${PRESERVE}`;
}

// ---------- CORS ----------

export function allowedOrigin(origin: string | null, env: Env): string | null {
  if (!origin) return null;
  const raw = (env("ALLOWED_ORIGINS") ?? "").trim();
  if (!raw) return null;
  for (const rule of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (rule === "*") return origin;
    if (rule.includes("*")) {
      // 예: https://*.tossmini.com
      const re = new RegExp(
        "^" + rule.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\/]/g, "\\$&")).join("[a-z0-9-]+(?:\\.[a-z0-9-]+)*") + "$",
        "i",
      );
      if (re.test(origin)) return origin;
    } else if (rule.toLowerCase() === origin.toLowerCase()) {
      return origin;
    }
  }
  return null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { Vary: "Origin" };
  if (origin) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Credentials"] = "true";
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const fail = (status: number, message: string, cors: Record<string, string>) => json(status, { message }, cors);

// ---------- 사용량 한도 ----------
// 1) 인스턴스 메모리 기반 IP 단위 분당 제한 (빠른 1차 방어)
// 2) Supabase DB 기반 일일 한도 (IP별 + 전체). DB 함수가 없으면 2)는 건너뛴다.

const minuteHits = new Map<string, number[]>();

export function _resetMemoryLimits() {
  minuteHits.clear();
}

function hitMinuteLimit(key: string, limit: number, now: number): boolean {
  const arr = (minuteHits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= limit) {
    minuteHits.set(key, arr);
    return true;
  }
  arr.push(now);
  minuteHits.set(key, arr);
  if (minuteHits.size > 5000) minuteHits.clear();
  return false;
}

async function consumeDaily(deps: Deps, key: string, limit: number): Promise<boolean> {
  const url = deps.env("SUPABASE_URL");
  const service = deps.env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service || limit <= 0) return true;
  const r = await deps.fetch(`${url}/rest/v1/rpc/ai_edit_consume`, {
    method: "POST",
    headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_key: key, p_limit: limit }),
  });
  if (!r.ok) {
    // 한도 테이블 장애 시에는 비용 보호를 우선해 막는다.
    console.error("ai_edit_consume failed", r.status, await r.text().catch(() => ""));
    return false;
  }
  return (await r.json()) === true;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : d;
};

// ---------- 이미지 AI 제공업체 ----------

async function editWithOpenAI(deps: Deps, image: Blob, prompt: string, signal: AbortSignal): Promise<Blob> {
  const key = deps.env("OPENAI_API_KEY");
  if (!key) throw new ProviderError("missing OPENAI_API_KEY");
  const fd = new FormData();
  fd.set("model", deps.env("OPENAI_IMAGE_MODEL") || "gpt-image-1.5");
  fd.set("image", image, "portrait.png");
  fd.set("prompt", prompt);
  fd.set("n", "1");
  fd.set("size", deps.env("OPENAI_IMAGE_SIZE") || "auto");
  fd.set("quality", deps.env("OPENAI_IMAGE_QUALITY") || "medium");
  fd.set("input_fidelity", "high"); // 얼굴 디테일 보존
  fd.set("output_format", "png");
  const r = await deps.fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
    signal,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const code = body?.error?.code ?? "";
    if (code === "moderation_blocked" || code === "content_policy_violation") throw new PolicyError();
    throw new ProviderError(`openai ${r.status}: ${body?.error?.message ?? ""}`);
  }
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) throw new ProviderError("openai: empty result");
  return new Blob([base64ToBytes(b64)], { type: "image/png" });
}

async function editWithGemini(deps: Deps, image: Blob, prompt: string, signal: AbortSignal): Promise<Blob> {
  const key = deps.env("GEMINI_API_KEY");
  if (!key) throw new ProviderError("missing GEMINI_API_KEY");
  const model = deps.env("GEMINI_IMAGE_MODEL") || "gemini-2.5-flash-image";
  const data = bytesToBase64(new Uint8Array(await image.arrayBuffer()));
  const r = await deps.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: image.type || "image/png", data } }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
    signal,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new ProviderError(`gemini ${r.status}: ${body?.error?.message ?? ""}`);
  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData?.data || p.inline_data?.data);
  if (!img) {
    if (body?.promptFeedback?.blockReason || body?.candidates?.[0]?.finishReason === "SAFETY") throw new PolicyError();
    throw new ProviderError("gemini: empty result");
  }
  const d = img.inlineData ?? img.inline_data;
  return new Blob([base64ToBytes(d.data)], { type: d.mimeType ?? d.mime_type ?? "image/png" });
}

class ProviderError extends Error {}
class PolicyError extends Error {}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function providerName(env: Env): "openai" | "gemini" | null {
  const p = (env("AI_PROVIDER") || "openai").toLowerCase();
  if (p === "openai" && env("OPENAI_API_KEY")) return "openai";
  if (p === "gemini" && env("GEMINI_API_KEY")) return "gemini";
  return null;
}

export function isEnabled(env: Env): boolean {
  return env("AI_ENABLED") !== "false" && providerName(env) !== null;
}

// ---------- 라우터 ----------

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const { env } = deps;
  const origin = req.headers.get("Origin");
  const okOrigin = allowedOrigin(origin, env);
  const cors = corsHeaders(okOrigin);
  const path = new URL(req.url).pathname;

  // 브라우저 요청인데 허용되지 않은 Origin 이면 차단 (Origin 없는 서버 간 호출은 헬스체크 용도로만 허용)
  if (origin && !okOrigin) return fail(403, "허용되지 않은 접근이에요.", {});

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  if (path.endsWith("/api/ai/capabilities")) {
    if (req.method !== "GET") return fail(405, "지원하지 않는 요청이에요.", cors);
    return json(200, { enabled: isEnabled(env), kinds: KINDS }, cors);
  }

  if (path.endsWith("/api/ai/edit")) {
    if (req.method !== "POST") return fail(405, "지원하지 않는 요청이에요.", cors);
    if (!origin) return fail(403, "허용되지 않은 접근이에요.", {});
    if (!isEnabled(env)) return fail(503, "AI 편집이 아직 준비되지 않았어요.", cors);

    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_IMAGE_BYTES + 64 * 1024) return fail(413, "사진 용량이 너무 커요. 15MB 이하로 다시 시도해 주세요.", cors);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return fail(400, "요청 형식을 확인하지 못했어요.", cors);
    }
    const image = form.get("image");
    const kind = String(form.get("kind") ?? "") as Kind;
    const prompt = String(form.get("prompt") ?? "").trim();
    if (form.get("consent") !== "true") return fail(400, "사진 전송 동의가 필요해요.", cors);
    if (!(image instanceof Blob) || image.size === 0) return fail(400, "사진을 찾지 못했어요.", cors);
    if (image.size > MAX_IMAGE_BYTES) return fail(413, "사진 용량이 너무 커요. 15MB 이하로 다시 시도해 주세요.", cors);
    if (image.type && !IMAGE_TYPES.includes(image.type)) return fail(415, "JPG, PNG, WebP 사진만 사용할 수 있어요.", cors);
    if (!KINDS.includes(kind)) return fail(400, "편집 종류를 확인해 주세요.", cors);
    if (!prompt) return fail(400, "편집할 내용을 적어 주세요.", cors);
    if (prompt.length > MAX_PROMPT) return fail(400, "요청 문장은 600자 이하로 적어 주세요.", cors);

    const ip = clientIp(req);
    const now = (deps.now ?? Date.now)();
    if (hitMinuteLimit(ip, num(env("AI_PER_MINUTE_LIMIT"), 3), now)) {
      return fail(429, "요청이 많아요. 1분 뒤에 다시 시도해 주세요.", cors);
    }
    try {
      if (!(await consumeDaily(deps, `ip:${ip}`, num(env("AI_DAILY_LIMIT_PER_IP"), 10)))) {
        return fail(429, "오늘 사용할 수 있는 AI 편집 횟수를 모두 썼어요. 내일 다시 이용해 주세요.", cors);
      }
      if (!(await consumeDaily(deps, "global", num(env("AI_DAILY_LIMIT_GLOBAL"), 300)))) {
        return fail(429, "오늘 AI 편집 이용량이 많아 잠시 쉬어가요. 내일 다시 이용해 주세요.", cors);
      }
    } catch (e) {
      console.error("limit check error", e);
      return fail(503, "잠시 후 다시 시도해 주세요.", cors);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), num(env("AI_TIMEOUT_MS"), 170_000));
    req.signal?.addEventListener?.("abort", () => ctrl.abort());
    try {
      const fullPrompt = buildPrompt(kind, prompt);
      const out =
        providerName(env) === "gemini"
          ? await editWithGemini(deps, image, fullPrompt, ctrl.signal)
          : await editWithOpenAI(deps, image, fullPrompt, ctrl.signal);
      return new Response(out, {
        status: 200,
        headers: { ...cors, "Content-Type": out.type || "image/png", "Cache-Control": "no-store" },
      });
    } catch (e) {
      if (e instanceof PolicyError) {
        return fail(422, "요청하신 편집은 만들 수 없어요. 다른 표현으로 다시 시도해 주세요.", cors);
      }
      if (ctrl.signal.aborted) return fail(504, "AI 편집 시간이 너무 오래 걸렸어요. 다시 시도해 주세요.", cors);
      console.error("provider error", e);
      return fail(502, "AI 편집을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.", cors);
    } finally {
      clearTimeout(timer);
    }
  }

  return fail(404, "찾을 수 없는 경로예요.", cors);
}
