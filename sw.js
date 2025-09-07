// HempHive Service Worker
const CACHE_NAME = 'hemphive-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.png',
  '/favicon.ico',
  '/radio.txt',
  '/manifest.json',
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
  // Force activation of new service worker
  self.skipWaiting();
});

// Fetch event - serve from cache when offline, but always check network first for updates
self.addEventListener('fetch', function(event) {
  // Skip caching for external resources and audio streams
  if (event.request.url.includes('hemphive.github.io') || 
      event.request.url.includes('stream') ||
      event.request.url.includes('radio') ||
      event.request.url.includes('mp3') ||
      event.request.url.includes('webm')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // If it's a successful response, cache it
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(function() {
        // If network fails, try to serve from cache
        return caches.match(event.request);
      })
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
  // Take control of all clients immediately
  self.clients.claim();
});
