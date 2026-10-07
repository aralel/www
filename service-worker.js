// Service Worker for Aralel GmbH PWA
//
// - HTML: network-first, so pages are always fresh online; cached copy offline,
//   falling back to the homepage in the page's own language.
// - Same-origin static files: stale-while-revalidate from a size-capped cache.
// - Cross-origin requests (stores, ads, analytics) are never intercepted.
// A new deploy ships a new ?v= so the worker updates, takes over immediately and
// drops the previous version's caches.

const swUrl = new URL(self.location.href);
const RELEASE_VERSION = swUrl.searchParams.get('v') || 'dev';
const PRECACHE_NAME = `aralel-precache-${RELEASE_VERSION}`;
const RUNTIME_CACHE_NAME = `aralel-runtime-${RELEASE_VERSION}`;
const MAX_RUNTIME_ENTRIES = 80;

const GERMAN_HOME = '/';
const ENGLISH_HOME = '/en.html';

const precacheUrls = [
  GERMAN_HOME,
  ENGLISH_HOME,
  `/styles.css?v=${RELEASE_VERSION}`,
  `/animations.css?v=${RELEASE_VERSION}`,
  `/script.js?v=${RELEASE_VERSION}`,
  `/animations.js?v=${RELEASE_VERSION}`,
  `/cookie-consent.js?v=${RELEASE_VERSION}`,
  `/manifest.json?v=${RELEASE_VERSION}`,
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/images/aralel-logo.png',
  '/images/hero-bg.svg'
];

// Cache each URL on its own: one missing file must not abort the whole install.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME)
      .then((cache) => Promise.allSettled(precacheUrls.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const currentCacheNames = [PRECACHE_NAME, RUNTIME_CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => !currentCacheNames.includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

async function trimRuntimeCache() {
  const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
  const cachedRequests = await runtimeCache.keys();
  const overflowCount = cachedRequests.length - MAX_RUNTIME_ENTRIES;
  // Cache keys come back in insertion order, so the oldest entries go first.
  for (let index = 0; index < overflowCount; index += 1) {
    await runtimeCache.delete(cachedRequests[index]);
  }
}

async function putInRuntimeCache(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return;
  }
  const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
  await runtimeCache.put(request, response);
  await trimRuntimeCache();
}

function offlineHomeFor(requestUrl) {
  return new URL(requestUrl).pathname.endsWith('_en.html') ? ENGLISH_HOME : GERMAN_HOME;
}

async function handleNavigation(event) {
  try {
    const networkResponse = await fetch(event.request);
    event.waitUntil(putInRuntimeCache(event.request, networkResponse.clone()));
    return networkResponse;
  } catch (networkError) {
    const cachedPage = await caches.match(event.request);
    return cachedPage || caches.match(offlineHomeFor(event.request.url));
  }
}

async function handleStaticAsset(event) {
  const cachedResponse = await caches.match(event.request);
  const networkUpdate = fetch(event.request)
    .then((networkResponse) => {
      event.waitUntil(putInRuntimeCache(event.request, networkResponse.clone()));
      return networkResponse;
    })
    .catch(() => cachedResponse);

  if (cachedResponse) {
    event.waitUntil(networkUpdate); // refresh in the background
    return cachedResponse;
  }
  return networkUpdate;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  const isNavigation = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  event.respondWith(isNavigation ? handleNavigation(event) : handleStaticAsset(event));
});
