// Minimal offline-friendly service worker: cache-first for static assets,
// network-first for API calls (progress must stay fresh).
const CACHE_NAME = 'bhs-v1'
const SHELL = ['/', '/manifest.json', '/icons/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return // network only
  }
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((resp) => {
          const clone = resp.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return resp
        }),
    ),
  )
})
