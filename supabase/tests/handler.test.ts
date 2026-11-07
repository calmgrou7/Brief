// 실행: node --experimental-strip-types --test supabase/tests/handler.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { handle, allowedOrigin, _resetMemoryLimits, type Deps } from "../functions/ai-edit/handler.ts";

const BASE = "https://x.supabase.co/functions/v1/ai-edit";
const ORIGIN = "https://faced.apps.tossmini.com";
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

function deps(envVars: Record<string, string>, fetchImpl?: typeof fetch): Deps & { calls: any[] } {
  const calls: any[] = [];
  const f = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return fetchImpl ? fetchImpl(url, init) : new Response("{}", { status: 500 });
  }) as typeof fetch;
  return { env: (k) => envVars[k], fetch: f, calls };
}

const baseEnv = { ALLOWED_ORIGINS: "https://*.tossmini.com", OPENAI_API_KEY: "sk-test" };

function editReq(fields: Record<string, string | Blob>, origin = ORIGIN) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v as any);
  return withHeaders(new Request(`${BASE}/api/ai/edit`, { method: "POST", body: fd }), {
    Origin: origin,
    "x-forwarded-for": "1.2.3.4",
  });
}
const goodFields = () => ({
  image: new Blob([PNG], { type: "image/png" }),
  kind: "background",
  prompt: "밝은 아이보리 스튜디오 배경",
  consent: "true",
});

// Node(undici)의 Request 는 Origin 헤더 설정을 막으므로(Deno 는 허용) 테스트에서만 덮어쓴다.
function withHeaders(req: Request, h: Record<string, string>): Request {
  const headers = new Headers(req.headers);
  for (const [k, v] of Object.entries(h)) headers.set(k, v);
  Object.defineProperty(req, "headers", { value: headers });
  return req;
}

const openaiOk = (async () =>
  new Response(JSON.stringify({ data: [{ b64_json: Buffer.from(PNG).toString("base64") }] }), {
    status: 200,
  })) as unknown as typeof fetch;

test("origin allowlist supports wildcard and exact", () => {
  const env = (k: string) => (k === "ALLOWED_ORIGINS" ? "https://*.tossmini.com, http://localhost:5173" : undefined);
  assert.equal(allowedOrigin(ORIGIN, env), ORIGIN);
  assert.equal(allowedOrigin("http://localhost:5173", env), "http://localhost:5173");
  assert.equal(allowedOrigin("https://evil.com", env), null);
  assert.equal(allowedOrigin("https://a.tossmini.com.evil.com", env), null);
  assert.equal(allowedOrigin(ORIGIN, () => undefined), null);
});

test("capabilities: disabled without key, enabled with key, CORS w/ credentials", async () => {
  const req = () => withHeaders(new Request(`${BASE}/api/ai/capabilities`), { Origin: ORIGIN });
  let r = await handle(req(), deps({ ALLOWED_ORIGINS: "https://*.tossmini.com" }));
  assert.deepEqual((await r.json()).enabled, false);
  r = await handle(req(), deps(baseEnv));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).enabled, true);
  assert.equal(r.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal(r.headers.get("access-control-allow-credentials"), "true");
  r = await handle(req(), deps({ ...baseEnv, AI_ENABLED: "false" }));
  assert.equal((await r.json()).enabled, false);
});

test("preflight and forbidden origin", async () => {
  let r = await handle(withHeaders(new Request(`${BASE}/api/ai/edit`, { method: "OPTIONS" }), { Origin: ORIGIN }), deps(baseEnv));
  assert.equal(r.status, 204);
  assert.match(r.headers.get("access-control-allow-methods")!, /POST/);
  r = await handle(withHeaders(new Request(`${BASE}/api/ai/capabilities`), { Origin: "https://evil.com" }), deps(baseEnv));
  assert.equal(r.status, 403);
});

test("edit: validation errors return Korean message JSON", async () => {
  _resetMemoryLimits();
  const d = deps(baseEnv, openaiOk);
  const cases: [Record<string, any>, number][] = [
    [{ ...goodFields(), consent: "false" }, 400],
    [{ ...goodFields(), kind: "face" }, 400],
    [{ ...goodFields(), prompt: "  " }, 400],
    [{ ...goodFields(), prompt: "가".repeat(601) }, 400],
    [{ ...goodFields(), image: new Blob(["x"], { type: "text/plain" }) }, 415],
  ];
  for (const [f, status] of cases) {
    const r = await handle(editReq(f), d);
    assert.equal(r.status, status);
    assert.match((await r.json()).message, /[가-힣]/);
  }
  assert.equal(d.calls.length, 0, "provider must not be called on invalid input");
});

test("edit: success with OpenAI returns png and sends face-preserving prompt", async () => {
  _resetMemoryLimits();
  const d = deps(baseEnv, openaiOk);
  const r = await handle(editReq(goodFields()), d);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "image/png");
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()), PNG);
  const call = d.calls.find((c) => c.url.includes("api.openai.com"));
  assert.ok(call);
  const sent = call.init.body as FormData;
  assert.match(String(sent.get("prompt")), /Replace only the background/);
  assert.match(String(sent.get("prompt")), /identity exactly the same/);
  assert.equal(sent.get("input_fidelity"), "high");
});

test("edit: Gemini provider", async () => {
  _resetMemoryLimits();
  const gem = (async () =>
    new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: Buffer.from(PNG).toString("base64") } }] } }] }),
      { status: 200 },
    )) as unknown as typeof fetch;
  const d = deps({ ALLOWED_ORIGINS: "https://*.tossmini.com", AI_PROVIDER: "gemini", GEMINI_API_KEY: "g" }, gem);
  const r = await handle(editReq(goodFields()), d);
  assert.equal(r.status, 200);
  assert.ok(d.calls[0].url.includes("generativelanguage.googleapis.com"));
});

test("edit: provider moderation -> 422, provider failure -> 502", async () => {
  _resetMemoryLimits();
  const mod = (async () =>
    new Response(JSON.stringify({ error: { code: "moderation_blocked", message: "no" } }), { status: 400 })) as unknown as typeof fetch;
  let r = await handle(editReq(goodFields()), deps(baseEnv, mod));
  assert.equal(r.status, 422);
  _resetMemoryLimits();
  r = await handle(editReq(goodFields()), deps(baseEnv));
  assert.equal(r.status, 502);
  assert.equal(r.headers.get("access-control-allow-origin"), ORIGIN);
});

test("edit: per-minute limit", async () => {
  _resetMemoryLimits();
  const d = deps({ ...baseEnv, AI_PER_MINUTE_LIMIT: "2" }, openaiOk);
  assert.equal((await handle(editReq(goodFields()), d)).status, 200);
  assert.equal((await handle(editReq(goodFields()), d)).status, 200);
  const r = await handle(editReq(goodFields()), d);
  assert.equal(r.status, 429);
});

test("edit: daily DB limit via RPC (ip then global)", async () => {
  _resetMemoryLimits();
  const env = { ...baseEnv, SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "srk" };
  let allowGlobal = true;
  const f = (async (url: any, init: any) => {
    if (String(url).includes("/rpc/ai_edit_consume")) {
      const { p_key } = JSON.parse(init.body);
      return new Response(JSON.stringify(p_key === "global" ? allowGlobal : true), { status: 200 });
    }
    return openaiOk(url, init);
  }) as typeof fetch;
  const d = deps(env, f);
  assert.equal((await handle(editReq(goodFields()), d)).status, 200);
  allowGlobal = false;
  const r = await handle(editReq(goodFields()), d);
  assert.equal(r.status, 429);
  assert.equal(d.calls.filter((c) => c.url.includes("openai")).length, 1);
});
