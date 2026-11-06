'use strict';
// Brazil Migration — uygulama olarak kurulabilme ve hızlı açılış. API, yönetim ve görüşme odası asla önbelleğe alınmaz.
const V = 'bm-v1', STATIC = V + '-static', PAGES = V + '-pages';
const PRE = ['/offline.html', '/bm/pwa/icon-192.png', '/brazil-migration-logo.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(STATIC).then(c => c.addAll(PRE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(V)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const skip = u => /^\/(api|admin|gorusme|kyc|r)\b/.test(u.pathname) || u.searchParams.has('nocache');
const isStatic = u => /^\/(bm|_next\/static|images|illustrations)\//.test(u.pathname) || /\.(css|js|webp|png|jpe?g|svg|woff2?|ico)$/.test(u.pathname);
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin || skip(u)) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { if (res.ok && !/^\/(panel|partner|avukat)\b/.test(u.pathname)) { const cp = res.clone(); caches.open(PAGES).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('/offline.html'))));
    return;
  }
  if (isStatic(u)) {
    e.respondWith(caches.open(STATIC).then(c => c.match(r).then(m => { const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => m); return m || net; })));
  }
});
