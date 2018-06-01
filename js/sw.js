/**
 * This file is based on the Service worker from the wittr-project.
 */

const staticCacheName = 'atennert-restaurant-v1';
const contentImgsCache = 'atennert-restaurant-content-imgs';
const allCaches = [
  staticCacheName,
  contentImgsCache
];
let _database = undefined;

/**
 * Install the service worker and register cached files.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      return cache.addAll([
        '/index.html',
        '/restaurant.html',
        '/js/main.js',
        '/js/restaurant_info.js',
        '/js/dbhelper.js',
        '/js/register_sw.js',
        '/manifest.json',
        '/worker.js'
      ]);
    })
  );
});

/**
 * Delete old cached contents when installing a new SW.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName.startsWith('atennert-restaurant-') &&
                 !allCaches.includes(cacheName);
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

/**
 * Redirect fetch requests.
 */
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/index.html'));
      return;
    }
    if (requestUrl.pathname.startsWith('/img/')) {
      event.respondWith(serveImage(event));
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
function serveImage(event) {
  // fetching algorithm by Jake Archibald - Google I/O 2016
  const networkFetch = fetch(event.request);

  event.waitUntil(
    networkFetch.then(response => {
      const responseClone = response.clone();
      caches.open(contentImgsCache)
        .then(cache => cache.put(event.request, responseClone));
    })
  );

  return caches.match(event.request)
    .then((response) => response || networkFetch);
}

// basic outbox algorithm by Jake Archibald - Google I/O 2016
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-messages') {
    event.waitUntil(
      getMessagesFromOutbox()
        .then((messages) => {
          return Promise.all(messages.map((message) => sendReviewsToServer(message)));
        })
        .then(() => removeMessagesFromOutbox())
        .then(() => {
          this.clients.matchAll().then((clients) => {
            clients.forEach(client => client.postMessage('updateReviews'));
          });
        })
    );
  }
});

/**
 * Send reviews to server.
 * @param {*} data 
 */
sendReviewsToServer = (data) => {
  return fetch('http://localhost:1337/reviews/', {method: 'post', body: JSON.stringify(data)})
    .then((response) => response.json())
    .then((review) => {
      /*update table*/
      setDbData('reviews', [review]);
    });
};

/**
 * Get the messages, which are currently in the outbox.
 */
getMessagesFromOutbox = () => {
  return database()
    .then((db) => {
      const transaction = db.transaction('outbox', 'readonly');
      const store = transaction.objectStore('outbox');
      return store.getAll();
    })
    .then((query) => new Promise((resolve) => {
      query.onsuccess = () => resolve(query.result);
    }))
    .catch((error) => {
      console.warn(`encountered database problem when trying to get outbox contents`, error.message);
      return [];
    });
};

/**
 * Clear the outbox.
 */
removeMessagesFromOutbox = () => {
  return database()
    .then((db) => {
      const transaction = db.transaction('outbox', 'readwrite');
      const store = transaction.objectStore('outbox');
      return store.clear();
    })
    .then((query) => new Promise((resolve) => {
      query.onsuccess = () => resolve();
    }))
    .catch((error) => console.warn(`encountered database problem when trying to delete outbox contents`, error.message));
};

/**
 * Push received data to the database.
 */
setDbData = (storeName, data) => {
  return database()
    .then((db) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      data.forEach((entry) => {
        store.put(entry);
      });
    })
    .catch(() => {
      console.warn(`encountered database problem when trying to set ${storeName} ${data}`);
    });
};

/**
 * Get the database.
 */
database = () => {
  if (_database) {
    return Promise.resolve(_database);
  }

  const dbName = 'restaurant-reviews';
  const dbVersion = 1;

  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(dbName, dbVersion);

    openRequest.onerror = () => reject();

    openRequest.onsuccess = (event) => {
      _database = openRequest.result;
      resolve(_database);
    };
  });
}
