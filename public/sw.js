const CACHE = 'mrs-english-v3-phase1-v1';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('./precache.json', { cache:'no-store' });
    if (!response.ok) throw new Error('Production build required for offline installation');
    const paths = await response.json();
    const cache = await caches.open(CACHE);
    await cache.addAll(paths);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('mrs-english-v3-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(CACHE)).match(event.request);
    return cached || fetch(event.request);
  })());
});
