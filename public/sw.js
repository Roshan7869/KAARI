// Kaari Marketplace - Service Worker
// Minimal SW that satisfies PWA manifest requirements.
// Extend this file later to add offline caching if needed.

const CACHE_NAME = 'kaari-v1';

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Remove old caches
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first strategy: always try network, fall back to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin or CDN images
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
