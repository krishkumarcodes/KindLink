// KindLink Service Worker
// Explicitly bypasses all Google Translate scripts, API calls, gstatic assets, and translation iframes.

const CACHE_NAME = 'kindlink-static-v1';

const GOOGLE_TRANSLATE_HOSTS = [
  'translate.google.com',
  'translate.googleapis.com',
  'www.gstatic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

self.addEventListener('install', (event) => {
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
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Explicitly bypass Google Translate scripts, APIs, iframes, and static assets (NEVER CACHE)
  const isGoogleTranslate =
    GOOGLE_TRANSLATE_HOSTS.some((host) => url.hostname.includes(host)) ||
    url.pathname.includes('/translate') ||
    url.pathname.includes('element.js') ||
    url.searchParams.has('cb') ||
    url.searchParams.has('client') ||
    url.hostname.includes('translate');

  if (isGoogleTranslate) {
    // Network-only, completely bypassed from Service Worker caching
    return;
  }

  // 2. Bypass dynamic API routes, auth, and Supabase realtime/REST
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // 3. Static assets network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Cache clone of static assets
        if (
          url.pathname.startsWith('/_next/static/') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.ico')
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
