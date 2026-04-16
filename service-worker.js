// Service Worker for Aralel GmbH PWA

const swUrl = new URL(self.location.href);
const RELEASE_VERSION = swUrl.searchParams.get('v') || 'dev';
const CACHE_NAME = `aralel-cache-${RELEASE_VERSION}`;
const urlsToCache = [
  '/',
  '.well-known/assetlinks.json',
  '/index.html',
  '/styles.css?v=' + RELEASE_VERSION,
  '/script.js?v=' + RELEASE_VERSION,
  '/manifest.json?v=' + RELEASE_VERSION,
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/images/aralel-logo.png',
  '/images/hero-bg.svg',
  '/images/game1.svg',
  '/images/game2.svg',
  '/images/game3.svg',
  '/images/team.svg'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - keep HTML fresh while still caching static assets.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html');
  const isNavigation = event.request.mode === 'navigate' || acceptsHtml;

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => caches.match(event.request)
          .then(response => response || caches.match('/index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        );
      })
  );
});
