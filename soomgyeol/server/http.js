"use strict";

class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.status = status; this.code = code; this.extra = extra;
  }
}

function createRouter() {
  const routes = [];
  function add(method, pattern, handler, opts = {}) {
    const keys = [];
    const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$");
    routes.push({ method, re, keys, handler, opts });
  }
  function match(method, pathname) {
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(pathname);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { route: r, params };
    }
    return null;
  }
  return {
    get: (p, h, o) => add("GET", p, h, o),
    post: (p, h, o) => add("POST", p, h, o),
    patch: (p, h, o) => add("PATCH", p, h, o),
    del: (p, h, o) => add("DELETE", p, h, o),
    match,
  };
}

function parseCookies(header) {
  const out = {};
  String(header || "").split(";").forEach(part => {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, "too_large", "요청이 너무 큽니다.")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v, min, max, dflt) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};

module.exports = { HttpError, createRouter, parseCookies, readBody, str, int };
