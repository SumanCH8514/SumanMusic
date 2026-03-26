const CACHE_VERSION = 'sumanmusic-v3';

const precacheManifest = self.__WB_MANIFEST || [];


self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      const urls = precacheManifest.map(entry =>
        typeof entry === 'string' ? entry : entry.url
      );
      return cache.addAll(urls).catch(() => {});
    })
  );
});


self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});




const skipPatterns = [
  /^\/__vite/,
  /\.hot-update\./,
  /\?t=\d+/,
  /firestore\.googleapis/,
  /identitytoolkit/,
  /accounts\.google/,
  /gstatic\.com/,
];

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  const isInternal = url.startsWith(self.location.origin);
  const isExternalApi = url.includes('lrclib.net') || url.includes('googleapis.com') || url.includes('i.ytimg.com');

  if (!isInternal && !isExternalApi) return;
  if (skipPatterns.some(re => re.test(url))) return;

  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(networkRes => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
        }
        return networkRes;
      }).catch(() => cached);


      if (isNavigation) {
        return cached || fetchPromise;
      }


      if (isExternalApi) {
        return cached || fetchPromise;
      }


      return cached || fetchPromise;
    }).catch(async () => {
      if (isNavigation) {
        const fallback = await caches.match('/index.html');
        return fallback || new Response('<!DOCTYPE html><html><body><p>You are offline.</p></body></html>', {
          status: 503,
          headers: { 'Content-Type': 'text/html' },
        });
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    })
  );
});
