// Simple service worker for DigiClient
// Note: avoid caching Next.js runtime assets to prevent dev chunk issues
const CACHE_NAME = 'digiclient-cache-v2';

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
  if (url.pathname.startsWith('/_next/')) return; // don't cache Next runtime/chunks
  if (url.pathname === '/sw.js') return; // don't cache SW itself

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const res = await fetch(req);
        try { await cache.put(req, res.clone()); } catch {}
        return res;
      } catch (_) {
        const cached = await cache.match(req);
        if (cached) return cached;
        // Propagate original error if no cache available
        throw _;
      }
    })()
  );
});