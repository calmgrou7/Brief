// 서비스워커: 오프라인 셸 캐시 + 푸시 알림 수신
const CACHE = 'policyfund-v3';
const SHELL = ['/', '/styles.css', '/app.js', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.origin !== location.origin) return;
  // 네트워크 우선, 실패 시 캐시
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: '새 정책자금 소식', body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || '새 정책자금 소식', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: d.url || '/' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => {
    const c = cs.find((x) => 'focus' in x);
    return c ? c.navigate(url).then((w) => w.focus()) : self.clients.openWindow(url);
  }));
});
