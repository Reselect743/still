/* Still — service worker
   Strategy: precache the app shell at install; cache-first for
   everything, with runtime caching of anything else fetched
   successfully (i.e. the Google Fonts CSS + woff2 files on the
   first online load). After one online visit, the app is fully
   functional in airplane mode. */

const CACHE = 'still-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((resp) => {
        // Runtime-cache successful responses (incl. opaque font responses)
        if (resp && (resp.ok || resp.type === 'opaque')) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Offline and uncached: fall back to the shell for navigations
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
