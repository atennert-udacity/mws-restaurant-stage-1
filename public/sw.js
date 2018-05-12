/**
 * This file is based on the Service worker from the wittr-project.
 */

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
        '/js/restaurant_info.js',
        '/js/dbhelper.js',
        '/js/register_sw.js',
        '/manifest.json'
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

  event.respondWith(caches.open(staticCacheName).then((cache) => {
    return cache.match(event.request.url).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        cache.put(event.request.url, networkResponse.clone());
        return networkResponse;
      });
    });
  }));
});

/**
 * Handle an image request ... serve the image from cache.
 * @param {*} request The request for an image
 */
function serveImage(request) {
  const storageUrl = request.url;

  return caches.open(contentImgsCache).then((cache) => {
    return cache.match(storageUrl).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((networkResponse) => {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}
