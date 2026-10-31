import http from "node:http";
import { readFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { resolve, extname, sep, join } from "node:path";
import { pathToFileURL } from "node:url";
import { Store, ServiceError } from "./store.mjs";
import {
  passwordMatcher,
  newToken,
  tokenId,
  parseCookies,
  LoginLimiter,
} from "./auth.mjs";

const COOKIE = "bn_session";
const MAX_BODY = 5 * 1024 * 1024;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};

export function createApp(store, options = {}) {
  const matches = passwordMatcher(
    options.password ?? process.env.ADMIN_PASSWORD,
  );
  const hours = Number(options.sessionHours ?? process.env.SESSION_HOURS) || 12;
  const secure = options.secureCookie ?? process.env.NODE_ENV === "production";
  const limiter = options.limiter || new LoginLimiter();
  const distRoot = resolve(options.dist || "dist");

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    const send = (status, data, headers = {}) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...headers,
      });
      res.end(JSON.stringify(data));
    };
    try {
      if (!url.pathname.startsWith("/api/"))
        return serveStatic(distRoot, url, res, send);
      if (req.method === "GET" && url.pathname === "/api/health")
        return send(200, { ok: true });

      const cookies = parseCookies(req.headers.cookie);
      const authed = store.validSession(tokenId(cookies[COOKIE]));
      // CSRF 방지: 변경 요청은 커스텀 헤더 필수 (다른 사이트 폼에서는 보낼 수 없음)
      if (req.method !== "GET" && req.headers["x-bn-request"] !== "1")
        throw new ServiceError("BAD_REQUEST", 400);

      if (url.pathname === "/api/session" && req.method === "GET")
        return send(200, { authenticated: authed });
      if (url.pathname === "/api/login" && req.method === "POST") {
        const ip = req.socket.remoteAddress || "unknown";
        if (limiter.blocked(ip))
          throw new ServiceError("TOO_MANY_ATTEMPTS", 429);
        const body = await readJson(req);
        if (!matches(body.password)) {
          limiter.fail(ip);
          store.audit("login.fail", {});
          throw new ServiceError("INVALID_PASSWORD", 401);
        }
        limiter.reset(ip);
        const token = newToken();
        store.createSession(tokenId(token), hours);
        store.audit("login.ok", {});
        return send(
          200,
          { ok: true },
          {
            "Set-Cookie": `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${hours * 3600}${secure ? "; Secure" : ""}`,
          },
        );
      }
      if (url.pathname === "/api/logout" && req.method === "POST") {
        if (cookies[COOKIE]) store.endSession(tokenId(cookies[COOKIE]));
        return send(
          200,
          { ok: true },
          {
            "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`,
          },
        );
      }

      if (!authed) throw new ServiceError("UNAUTHORIZED", 401);

      if (url.pathname === "/api/state" && req.method === "GET")
        return send(200, store.state());
      if (url.pathname === "/api/audit" && req.method === "GET")
        return send(200, { items: store.auditLog(100) });
      if (url.pathname === "/api/export" && req.method === "GET") {
        const day = new Date().toISOString().slice(0, 10);
        store.audit("export", {});
        return send(200, store.state(), {
          "Content-Disposition": `attachment; filename="bridgenode-dashboard-${day}.json"`,
        });
      }
      const rec = url.pathname.match(
        /^\/api\/records\/([a-z]+)\/([A-Za-z0-9-]{1,64})$/,
      );
      if (rec && req.method === "PUT")
        return send(200, store.upsert(rec[1], rec[2], await readJson(req)));
      if (rec && req.method === "DELETE")
        return send(200, (store.remove(rec[1], rec[2]), { ok: true }));
      if (url.pathname === "/api/vault" && req.method === "PUT")
        return send(200, {
          vault: store.setVault((await readJson(req)).vault ?? null),
        });
      if (url.pathname === "/api/import" && req.method === "POST")
        return send(200, store.importData(await readJson(req)));
      if (url.pathname === "/api/reset" && req.method === "POST")
        return send(200, store.reset((await readJson(req)).mode));
      throw new ServiceError("NOT_FOUND", 404);
    } catch (e) {
      if (e instanceof ServiceError)
        return send(e.status, { error: e.message });
      console.error(e);
      return send(500, { error: "SERVER_ERROR" });
    }
  });
}

function readJson(req) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        fail(new ServiceError("TOO_LARGE", 413));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        ok(
          chunks.length
            ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
            : {},
        );
      } catch {
        fail(new ServiceError("INVALID_JSON"));
      }
    });
    req.on("error", fail);
  });
}

function serveStatic(root, url, res, send) {
  let file = resolve(root, "." + decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + sep))
    throw new ServiceError("NOT_FOUND", 404);
  if (!existsSync(file) || !statSync(file).isFile())
    file = resolve(root, "index.html");
  if (!existsSync(file))
    return send(404, { error: "Run npm run dev or npm run build first." });
  const ext = extname(file);
  res.writeHead(200, {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Cache-Control": file.includes(`${sep}assets${sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache",
    "Content-Security-Policy":
      "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  });
  res.end(readFileSync(file));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  if (!process.env.ADMIN_PASSWORD) {
    console.error(
      "ADMIN_PASSWORD 환경변수가 필요합니다 (12자 이상). .env.example 참고.",
    );
    process.exit(1);
  }
  const dataDir = resolve(process.env.DATA_DIR || ".data");
  mkdirSync(dataDir, { recursive: true });
  const store = new Store(join(dataDir, "bridgenode.sqlite"));
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT) || 8787;
  createApp(store).listen(port, host, () =>
    console.log(`BridgeNode dashboard API http://${host}:${port}`),
  );
}
