/* 出國購物清單 PWA service worker：快取 App 外殼，離線與弱網都能立刻開啟 */
const VERSION = 'shoplist-v9';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './guides.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

// 整包一次下載成功才換版，不會有新舊檔案混用
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 快取優先：訊號再差也不用等網路。外殼更新靠 VERSION 換版
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSION).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') c.put(req, res.clone());
        return res;
      }).catch(() => (req.mode === 'navigate' ? c.match('./index.html') : Response.error()));
    }))
  );
});
