const CACHE_NAME = 'senzor-app-cache-v1';

// Critical core assets to install immediately upon service worker registration
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/logo.svg',
  '/icon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Take control of all open clients immediately and purge old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. SECURITY & INTEGRITY: Ignore non-GET requests (e.g., API Mutations, Telemetry Ingestion)
  if (request.method !== 'GET') return;

  // 2. SECURITY: Ignore Chrome extensions and external URL domains
  if (!url.origin.includes(self.location.origin)) return;

  // 3. API & TELEMETRY: Network First, fallback to Cache 
  // Guarantees fresh data when online, but allows read-only viewing of dashboards if offline.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 4. STATIC ASSETS: Next.js build files, Images, CSS -> Stale While Revalidate
  // Returns cached asset instantly while fetching the latest version in the background.
  if (
    url.pathname.startsWith('/_next/static/') || 
    request.destination === 'image' || 
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 5. HTML NAVIGATION: Network First, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default Fallback
  event.respondWith(staleWhileRevalidate(request));
});

// --- ENTERPRISE CACHING STRATEGIES ---

/**
 * Network First Strategy:
 * Tries the network. If successful, caches the response. If it fails, reads from cache.
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy:
 * Immediately returns the cached version (if available) while concurrently
 * fetching an updated version from the network to save for the next request.
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((err) => {
    console.warn('[Senzor PWA] Background revalidation failed:', err);
  });

  return cachedResponse || fetchPromise;
}