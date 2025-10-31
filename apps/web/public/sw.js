// Simple SWR service worker for DigiClient
const CACHE_NAME = 'digiclient-cache-v1';

self.addEventListener('install', (event) => {
  // Activate immediately
  // @ts-ignore
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // @ts-ignore
      self.clients.claim();
      // Clean up old caches
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return; // only same-origin
  if (url.pathname.startsWith('/api/')) return; // don't cache API
  if (url.pathname === '/sw.js') return; // don't cache SW itself

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        try { await cache.put(req, res.clone()); } catch {}
        return res;
      }).catch(() => cached);
      return cached || network;
    })()
  );
});