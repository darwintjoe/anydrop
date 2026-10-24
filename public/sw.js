/* AnyDrop service worker — minimal, on purpose.
 * Jobs:
 *  1. Make the PWA installable (offline fallback for the app shell).
 *  2. Never interfere with /api/* (including the OS share-target POST to /api/share,
 *     which must hit the network untouched — it is a navigation POST).
 */
const VERSION = 'anydrop-v1';
const PRECACHE = ['/', '/anydrop.svg', '/pwa/icon-192.png', '/pwa/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // share-target POST & API writes go straight to network
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never cache the API

  if (req.mode === 'navigate') {
    // Network-first for pages, cache fallback so the installed app always opens.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((hit) => hit || Response.error()))
    );
    return;
  }

  // Stale-while-revalidate for static assets.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
