/**
 * sw.js - Enterprise Service Worker
 * Handles offline caching for the PDF Reader
 */

const CACHE_NAME = 'design-aid-v1';
// Files to cache immediately
const PRE_CACHE = [
    '/',
    '/index.html',
    '/book.js',
    '/book.css',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRE_CACHE))
            .then(self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    // Strategy: Cache First, falling back to Network
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request).then(networkResponse => {
                    // Optional: Dynamically cache the PDF once it's downloaded
                    if (event.request.url.includes('.pdf') || event.request.url.includes('.json')) {
                        return caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    }
                    return networkResponse;
                });
            })
    );
});