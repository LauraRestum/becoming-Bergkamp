/* Bergkamp Wedding · network-first service worker.
   Always grabs the freshest version from the network when online, updating the
   offline cache as it goes. When the network is unreachable it falls back to
   the cached copy so the app still opens and works offline. */

const VERSION = 'v12';
const CACHE = 'bergkamp-wedding-' + VERSION;

// Pre-cache the homepage, the things it needs to render, the manifest, and the
// app icons so the app can open offline straight after install.
const CORE_ASSETS = [
  '/home',
  '/music.js',
  '/site.webmanifest',
  '/styles.css',
  '/app.js',
  '/pwa.js',
  '/sw-register.js',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: pre-cache the core assets. We deliberately do NOT skipWaiting here.
// A freshly built worker stays in "waiting" until the page tells us to take
// over · that pause is what powers the "update available" prompt, so visitors
// are never yanked onto a new version mid-read.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS))
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

// The page asks us to activate immediately when the visitor taps "Update".
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Fetch: network-first for same-origin GET requests. Grab the freshest copy,
// stash it for offline use, and only fall back to the cache when the network
// is unreachable. Pages, scripts and styles use 'no-cache' so the browser
// checks with the server rather than handing back a stale copy from its own
// HTTP cache; images and fonts keep their long-lived caching.
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  const fresh = ['document', 'script', 'style', 'manifest', ''].includes(request.destination);

  event.respondWith(
    fetch(request, fresh ? { cache: 'no-cache' } : undefined)
      .then((response) => {
        // Stash a fresh copy of valid, basic (same-origin) responses.
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        // Offline: serve the cached copy if we have one.
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // Never cached and offline: fall back to the homepage for
          // navigations so the app still opens.
          if (request.mode === 'navigate') return caches.match('/');
          return Response.error();
        })
      )
  );
});
