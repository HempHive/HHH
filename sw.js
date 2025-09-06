// HempHive Service Worker
const CACHE_NAME = 'hemphive-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.png',
  '/favicon.ico',
  '/radio.txt',
  // Add other critical resources
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('HempHive: Caching resources');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('HempHive: Deleting old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
