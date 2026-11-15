/* 오프라인 범위: 앱 화면 파일만 저장합니다. 로그인·기록·결제(API)는 항상 서버에서 받으며 오프라인에선 동작하지 않습니다. */
const CACHE = "soomgyeol-v1";
const SHELL = ["/app", "/app/engine.css", "/app/app.css", "/app/app.js", "/app/breath.js", "/assets/icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (!SHELL.includes(url.pathname)) return;
  // 네트워크 우선, 실패하면 저장본
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
