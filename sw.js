const CACHE_NAME = 'sai-prasad-v14';
const ASSETS = [
  '/',
  '/index.html',
  '/order.html',
  '/dish.html',
  '/order.css',
  '/order.js',
  '/track.html',
  '/profile.html',
  '/logo.png',
  '/dal-bati-hero.jpg',
  '/dal-bati-closeup.jpg',
  '/manifest.json'
];

// Install — cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', (e) => {
  // Skip non-GET, API calls, and large files like APKs that crash mobile caches
  if (
    e.request.method !== 'GET' || 
    e.request.url.includes('amazonaws.com') ||
    e.request.url.endsWith('.apk')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
