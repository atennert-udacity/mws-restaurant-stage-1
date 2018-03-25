const staticCacheName = 'atennert-restaurant-v1';
const contentImgsCache = 'atennert-restaurant-content-imgs';
const allCaches = [
  staticCacheName,
  contentImgsCache
];

/**
 * Install the service worker and register cached files.
 */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
        '/index.html',
        '/restaurant.html',
        '/js/main.js',
        '/js/dbhelper.js',
        '/js/restaurant_info.js',
        '/css/styles.css',
        '/data/restaurants.json'
      ]);
    })
  );
});

/**
 * Delete old cached contents when installing a new SW.
 */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('atennert-restaurant-') &&
                 !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

/**
 * Redirect fetch requests.
 */
self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/index.html'));
      return;
    }
    if (requestUrl.pathname.startsWith('/img/')) {
      event.respondWith(serveImage(event.request));
      return;
    }
  }

  event.respondWith(
    caches.match(requestUrl.pathname).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

/**
 * Handle an image request ... serve the image from cache.
 * @param {*} request The request for an image
 */
function serveImage(request) {
  const storageUrl = request.url;

  return caches.open(contentImgsCache).then(function(cache) {
    return cache.match(storageUrl).then(function(response) {
      if (response) return response;

      return fetch(request).then(function(networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}