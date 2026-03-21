const CACHE_NAME = 'sumanmusic-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.png',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests like API calls if they fail
  const isSameOrigin = event.request.url.startsWith(self.location.origin);
  
  // Only intercept same-origin requests to avoid CORS/security issues with external APIs
  if (!isSameOrigin) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .catch(err => {
            console.warn('SW Fetch failed:', event.request.url, err);
            throw err;
          });
      })
  );
});
