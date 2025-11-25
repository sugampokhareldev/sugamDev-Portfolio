// ===== Enhanced Service Worker for PWA =====
// Version: 3.0.0
// Improved caching strategies and offline support

const CACHE_VERSION = 'portfolio-v3.0.0';
const RUNTIME_CACHE = 'runtime-v3.0.0';
const IMAGE_CACHE = 'images-v3.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/offline.html', // Offline fallback page
    '/js/modules/animations-gsap.js',
    '/js/modules/skill-chart.js',
    '/js/modules/portfolio-api.js',
    '/js/modules/portfolio-ui.js',
    '/js/modules/portfolio-forms.js',
    '/js/modules/error-handler.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install event');

    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('[ServiceWorker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[ServiceWorker] Install failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate event');

    const currentCaches = [CACHE_VERSION, RUNTIME_CACHE, IMAGE_CACHE];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!currentCaches.includes(cacheName)) {
                        console.log('[ServiceWorker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Handle API requests differently (network-first strategy)
    if (request.url.includes('/api/')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Handle images (cache-first strategy)
    if (request.destination === 'image') {
        event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
        return;
    }

    // Handle static assets (cache-first with network update)
    if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
        event.respondWith(cacheFirstStrategy(request, CACHE_VERSION));
        return;
    }

    // Default: try network first, fallback to cache
    event.respondWith(networkFirstStrategy(request));
});

/**
 * Cache-first strategy
 * Try cache first, fallback to network and update cache
 */
async function cacheFirstStrategy(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Serve from cache immediately
        // Update cache in background
        fetch(request).then((response) => {
            if (response && response.status === 200) {
                cache.put(request, response.clone());
            }
        }).catch(() => {
            // Network failed, but we already served from cache
        });

        return cachedResponse;
    }

    // Not in cache, fetch from network
    try {
        const response = await fetch(request);

        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        // Network failed and not in cache
        return new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
        });
    }
}

/**
 * Network-first strategy
 * Try network first, fallback to cache on failure
 */
async function networkFirstStrategy(request) {
    const cache = await caches.open(RUNTIME_CACHE);

    try {
        const response = await fetch(request);

        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Nothing in cache either, return offline page for HTML requests
        if (request.destination === 'document') {
            const offlinePage = await cache.match('/offline.html');
            if (offlinePage) {
                return offlinePage;
            }
        }

        // Return a generic offline response
        return new Response('Offline - No cached version available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
        });
    }
}

/**
 * Background Sync for form submissions
 */
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Sync event:', event.tag);

    if (event.tag === 'sync-form-submission') {
        event.waitUntil(syncFormSubmissions());
    }
});

async function syncFormSubmissions() {
    console.log('[ServiceWorker] Syncing form submissions');

    // Get pending form submissions from IndexedDB
    const db = await openDB();
    const submissions = await getAllPendingSubmissions(db);

    for (const submission of submissions) {
        try {
            const response = await fetch(submission.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submission.data)
            });

            if (response.ok) {
                // Remove from pending
                await removePendingSubmission(db, submission.id);
                console.log('[ServiceWorker] Synced submission:', submission.id);
            }
        } catch (error) {
            console.error('[ServiceWorker] Failed to sync submission:', error);
            // Keep in queue for next sync
        }
    }
}

// IndexedDB helpers for background sync
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PortfolioSyncDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('submissions')) {
                db.createObjectStore('submissions', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function getAllPendingSubmissions(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['submissions'], 'readonly');
        const store = transaction.objectStore('submissions');
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

function removePendingSubmission(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['submissions'], 'readwrite');
        const store = transaction.objectStore('submissions');
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// Push notifications (optional)
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push event');

    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification('Portfolio Update', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification click');

    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});
