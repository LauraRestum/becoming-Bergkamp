/* Bergkamp Wedding — minimal cache-first service worker.
   Caches the homepage and its core assets so the app opens
   instantly and works offline once installed. */

const CACHE = 'bergkamp-wedding-v1';

// Precache the homepage, the things it needs to render, the
// manifest, and the app icons.
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/styles.css',
  '/app.js',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: pre-cache the core assets, then activate immediately.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: drop any old caches, then take control of open pages.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin GET requests. Serve from cache
// when we have it; otherwise hit the network and stash a copy.
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache valid, basic (same-origin) responses.
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        // Offline and not cached: fall back to the homepage for
        // navigations so the app still opens.
        if (request.mode === 'navigate') return caches.match('/');
      });
    })
  );
});
