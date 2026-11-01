// CropScan AI - Service Worker
// Strictly avoids caching /api or Supabase and NEVER reloads open pages.

const CACHE_NAME = 'cropscan-v2';
const STATIC_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_SHELL))
  );
  // Activate immediately without reloading clients
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  // Do NOT send any reload messages to open pages
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER cache /api, Supabase, external APIs, or non-GET requests
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('nominatim.openstreetmap.org') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    event.request.method !== 'GET'
  ) {
    // Direct network pass-through
    return;
  }

  // 2. Network-first strategy for static pages and assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/_next/static') || STATIC_SHELL.includes(url.pathname))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match('/'));
      })
  );
});

