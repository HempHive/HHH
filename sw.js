// HempHive Service Worker - Simplified
const CACHE_NAME = 'hemphive-v3';

// Install event - minimal caching
self.addEventListener('install', function(event) {
  console.log('HempHive: Service Worker installing');
  self.skipWaiting();
});

// Fetch event - simple network-first approach
self.addEventListener('fetch', function(event) {
  // Only cache static assets, not dynamic content
  if (event.request.url.includes('.png') || 
      event.request.url.includes('.ico') || 
      event.request.url.includes('.webm') ||
      event.request.url.includes('.txt')) {
    
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            return response;
          }
          return fetch(event.request).then(function(response) {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
    );
  } else {
    // For all other requests, just fetch from network
    event.respondWith(fetch(event.request));
  }
});

// Activate event - clean up
self.addEventListener('activate', function(event) {
  console.log('HempHive: Service Worker activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
