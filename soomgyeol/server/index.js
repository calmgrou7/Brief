"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const config = require("./config");
const dbm = require("./db");
const auth = require("./auth");
const billing = require("./billing");
const site = require("./site");
const api = require("./api");
const { HttpError, createRouter, parseCookies, readBody } = require("./http");

const PUBLIC = path.join(__dirname, "..", "public");
const COOKIE = "sg_session";
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function securityHeaders(res) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (config.auth.cookieSecure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
}

function cookieAttrs(maxAgeSec) {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${config.auth.cookieSecure ? "; Secure" : ""}`;
}
const setSession = (res, t) => res.setHeader("Set-Cookie", `${COOKIE}=${t}; ${cookieAttrs(config.auth.sessionDays * 86400)}`);
const clearSession = res => res.setHeader("Set-Cookie", `${COOKIE}=; ${cookieAttrs(0)}`);

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function serveFile(res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not found"); return; }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": cache || "no-cache",
    });
    fs.createReadStream(file).pipe(res);
  });
}

function createApp({ dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "soomgyeol.db") } = {}) {
  const db = dbm.open(dbPath);
  const router = createRouter();
  api.register(router, { setSession, clearSession });

  const server = http.createServer(async (req, res) => {
    securityHeaders(res);
    const url = new URL(req.url, "http://local");
    const pathname = url.pathname;
    try {
      if (pathname.startsWith("/api/")) {
        const m = router.match(req.method, pathname);
        if (!m) throw new HttpError(404, "not_found", "없는 경로입니다.");
        const { route, params } = m;
        const raw = req.method === "GET" ? "" : await readBody(req);
        // CSRF 방지: 상태를 바꾸는 요청은 앱에서 보낸 fetch 헤더가 있어야 합니다(결제 웹훅 제외).
        if (req.method !== "GET" && !route.opts.webhook && req.headers["x-requested-with"] !== "fetch") {
          throw new HttpError(403, "csrf", "허용되지 않은 요청입니다.");
        }
        let body = {};
        if (raw && !route.opts.webhook) {
          try { body = JSON.parse(raw); } catch { throw new HttpError(400, "bad_json", "요청 형식이 올바르지 않습니다."); }
          if (!body || typeof body !== "object") body = {};
        }
        const token = parseCookies(req.headers.cookie)[COOKIE];
        const user = auth.userFromToken(db, token);
        if (route.opts.auth && !user) throw new HttpError(401, "login_required", "로그인이 필요합니다.");
        if (route.opts.auth === "admin" && user.role !== "admin") throw new HttpError(403, "forbidden", "관리자만 이용할 수 있습니다.");
        const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
        const out = await route.handler({ req, res, db, user, token, params, query: url.searchParams, body, raw, ip });
        if (out !== undefined && !res.headersSent) sendJson(res, 200, out);
        return;
      }

      if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "method", "허용되지 않은 요청입니다.");

      // 소개 웹사이트 (서버 렌더링)
      const page = site.pages[pathname.replace(/\/$/, "") || "/"];
      if (page) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
        res.end(page(db));
        return;
      }
      if (pathname === "/sitemap.xml") { res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" }); res.end(site.sitemap()); return; }
      if (pathname === "/.well-known/assetlinks.json") {
        res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" });
        res.end(JSON.stringify(config.android.certSha256.length ? [{
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: config.android.packageName, sha256_cert_fingerprints: config.android.certSha256 },
        }] : []));
        return;
      }
      if (pathname === "/robots.txt") { res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }); res.end(site.robots()); return; }

      // 웹앱·관리자
      if (pathname === "/app" || pathname === "/app/") return serveFile(res, path.join(PUBLIC, "app", "index.html"));
      if (pathname === "/admin" || pathname === "/admin/") return serveFile(res, path.join(PUBLIC, "admin", "index.html"));

      // 정적 파일 (경로 탈출 방지)
      const file = path.normalize(path.join(PUBLIC, decodeURIComponent(pathname)));
      if (!file.startsWith(PUBLIC + path.sep)) throw new HttpError(404, "not_found", "Not found");
      return serveFile(res, file, pathname.startsWith("/assets/") ? "public, max-age=3600" : "no-cache");
    } catch (e) {
      if (!(e instanceof HttpError)) {
        console.error(e);
        try { db.run("INSERT INTO error_log(source,message,path,created_at) VALUES(?,?,?,?)", "server", String(e.message || e).slice(0, 300), pathname.slice(0, 120), Date.now()); } catch {}
        e = new HttpError(500, "server_error", "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      }
      if (res.headersSent) { res.end(); return; }
      if (pathname.startsWith("/api/")) sendJson(res, e.status, { error: { code: e.code, message: e.message, ...(e.extra || {}) } });
      else {
        res.writeHead(e.status, { "Content-Type": "text/html; charset=utf-8" });
        res.end(site.layout({ path: pathname, title: "페이지를 찾을 수 없어요", description: "", body: `<section class="wrap section narrow"><h1>페이지를 찾을 수 없어요</h1><p>주소를 확인하거나 <a href="/">처음으로</a> 돌아가 주세요.</p></section>` }));
      }
    }
  });

  return { server, db };
}

if (require.main === module) {
  const { server, db } = createApp();
  const port = Number(process.env.PORT || 3000);
  setInterval(() => { try { billing.sweep(db); } catch (e) { console.error(e); } }, 60000).unref();
  server.listen(port, () => {
    console.log(`숨결 서버 실행 중: ${config.app.publicUrl}  (결제 모드: ${config.billing.mode})`);
    if (config.billing.webhookSecret === "dev-webhook-secret") console.log("주의: WEBHOOK_SECRET 이 개발용 값입니다.");
  });
}

module.exports = { createApp };
