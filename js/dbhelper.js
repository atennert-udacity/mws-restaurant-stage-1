/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Backend URL.
   * Change this to restaurants.json file location on your server.
   */
  static get BACKEND_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/`;
  }

  static get _restaurantsStore() {
    return 'restaurants';
  }

  static get _reviewsStore() {
    return 'reviews';
  }

  static get _outbox() {
    return 'outbox';
  }

  static get database() {
    if (DBHelper._database) {
      return Promise.resolve(DBHelper._database);
    }

    const dbName = 'restaurant-reviews';
    const dbVersion = 1;

    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open(dbName, dbVersion);

      openRequest.onerror = () => reject();

      openRequest.onupgradeneeded = () => {
        const db = openRequest.result,
          restaurantStore = db.createObjectStore(DBHelper._restaurantsStore, {keyPath: 'id'}),
          reviewStore = db.createObjectStore(DBHelper._reviewsStore, {keyPath: 'id'}),
          outboxStore = db.createObjectStore(DBHelper._outbox, {autoIncrement : true});

        restaurantStore.createIndex('by-id', 'id');
        reviewStore.createIndex('by-restaurant', 'restaurant_id');
        outboxStore.createIndex('by-restaurant', 'restaurant_id');
      };

      openRequest.onsuccess = (event) => {
        DBHelper._database = openRequest.result;
        resolve(DBHelper._database);
      };
    });
  }

  static getDbRestaurants(id) {
    return DBHelper.database
      .then((db) => {
        const transaction = db.transaction(DBHelper._restaurantsStore, 'readonly');
        const store = transaction.objectStore(DBHelper._restaurantsStore);
        return id ? store.getAll(~~id) : store.getAll();
      })
      .then((query) => new Promise((resolve) => {
        query.onsuccess = () => resolve(query.result);
      }))
      .catch(() => {
        console.warn(`encountered database problem when trying to find restaurant ${id}`);
        return undefined;
      });
  }

  static getDbReviews(restaurantId) {
    return DBHelper.database
      .then((db) => {
        const transaction1 = db.transaction(DBHelper._reviewsStore, 'readonly'),
          transaction2 = db.transaction(DBHelper._outbox, 'readonly'),
          store1 = transaction1.objectStore(DBHelper._reviewsStore),
          store2 = transaction2.objectStore(DBHelper._outbox),
          index1 = store1.index('by-restaurant'),
          index2 = store2.index('by-restaurant');

        return Promise.all(
          [index1, index2].map((index) => new Promise((resolve) => {
            const query = restaurantId ? index.getAll(~~restaurantId) : index.getAll();
            query.onsuccess = () => resolve(query.result);
          })))
      })
      .then(([result1, result2]) => [...result1, ...result2])
      .catch((error) => {
        console.warn(`encountered database problem when trying to find reviews for restaurant ${restaurantId}`, error.message);
        return undefined;
      });
  }

  static setDbData(storeName, data) {
    return DBHelper.database
      .then((db) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        data.forEach((entry) => {
          store.put(entry);
        });
      })
      .catch((error) => {
        console.warn(`encountered database problem when trying to set ${storeName} ${data}`, error.message);
      });
  }

  /**
   * Fetch all restaurants. First check the database if the restaurants are already there.
   * Then make a server request to get updated information.
   */
  static fetchRestaurants(callback, id = '') {
    let internalCallback = callback;
    DBHelper.getDbRestaurants(id)
      .then((restaurants) => {
        if (restaurants && restaurants.length > 0) {
          internalCallback(null, restaurants);
          internalCallback = () => {};
        }
      })
      .then(() => fetch(`${DBHelper.BACKEND_URL}restaurants/${id}`))
      .then((response) => response.json())
      .then((restaurants) => {
        if (!Array.isArray(restaurants)) {
          restaurants = [restaurants];
        }
        // fix image type
        restaurants.forEach(DBHelper.fixRestaurantImage);
        DBHelper.setDbData(DBHelper._restaurantsStore, restaurants);
        internalCallback(null, restaurants);
      })
      .catch((error) => { // Oops!. Got an error from server or with the response
        const errorText = `Request failed. ${error.message}`;
        internalCallback(errorText, null);
      });
  }

  /**
   * Fix a restaurants photo and add a description.
   * @param {The restaurant for which to fix the photo} restaurant 
   */
  static fixRestaurantImage(restaurant) {
    if (restaurant.photograph) {
      restaurant.photograph = `${restaurant.photograph}.jpg`;
    } else {
      restaurant.photograph = 'no-img.svg';
    }
    restaurant.photo_title = `${restaurant.name} restaurant - ${restaurant.neighborhood}`;
    return restaurant;
  }

  static fetchReviews(callback, id) {
    let internalCallback = callback;
    DBHelper.getDbReviews(id)
      .then((reviews) => {
        if (reviews && reviews.length > 0) {
          internalCallback(reviews);
          internalCallback = () => {};
        }
      })
      .then(() => fetch(`${DBHelper.BACKEND_URL}reviews/?restaurant_id=${id}`))
      .then((response) => response.json())
      .then((reviews) => {
        if (!Array.isArray(reviews)) {
          reviews = [reviews];
        }
        DBHelper.setDbData(DBHelper._reviewsStore, reviews);
        internalCallback(reviews);
      })
      .catch((error) => { // Oops!. Got an error from server or with the response
        console.error(`Request failed. ${error.message}`);
        internalCallback([]);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    }, id);
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.getDbRestaurants().then((restaurants) => {
      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((restaurant) => restaurant.neighborhood),
        // Remove duplicates from neighborhoods
        uniqueNeighborhoods = neighborhoods.filter((neighborhood, i) => neighborhoods.indexOf(neighborhood) == i);
      callback(null, uniqueNeighborhoods);
    })
    .catch((error) => callback(error, null));
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.getDbRestaurants().then((restaurants) => {
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((restaurant) => restaurant.cuisine_type),
        // Remove duplicates from cuisines
        uniqueCuisines = cuisines.filter((cuisine, i) => cuisines.indexOf(cuisine) === i);
      callback(null, uniqueCuisines);
    })
    .catch((error) => callback(error, null));
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  /**
   * Request setting the restaurant as you favorite.
   * @param {*} id 
   * @param {*} isFavorite 
   */
  static setRestaurantAsFavorite(id, isFavorite) {
    fetch(`${DBHelper.BACKEND_URL}restaurants/${id}/?is_favorite=${isFavorite}`, {method: 'PUT'})
      .then((response) => response.json())
      .then((restaurant) => {
        const correctedRestaurant = DBHelper.fixRestaurantImage(restaurant);
        DBHelper.setDbData(DBHelper._restaurantsStore, [correctedRestaurant]);
      })
      .catch((error) => {
        console.error(`Request failed. ${error.message}`);
      });
  }

  /**
   * Add a review to the outbox.
   * @param {*} review 
   */
  static addToOutbox(review) {
    return DBHelper.setDbData(DBHelper._outbox, [review]);
  }

  /**
   * Handle sending of a review, including outbox handling.
   * @param {*} data {restaurantId, name, rating, comments}
   */
  static onSendReview(data, callback) {
    // basic outbox algorithm by Jake Archibald - Google I/O 2016
    return DBHelper.addToOutbox(data)
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => reg.sync.register('send-messages'))
      .catch((error) => {
        DBHelper.removeMessagesFromOutbox();
        DBHelper.sendReviewsToServer([data])
          .then(() => callback());
      })
      .catch((error) => console.error(error.message));
  }

  /**
   * Send reviews to server.
   * @param {*} data 
   */
  static sendReviewsToServer(data) {
    return fetch('http://localhost:1337/reviews/', {method: 'post', body: JSON.stringify(data)})
      .then((response) => response.json())
      .then((review) => {
        /*update table*/
        DBHelper.setDbData(DBHelper._reviewsStore, [review]);
      });
  }

  /**
   * Clear the outbox.
   */
  static removeMessagesFromOutbox() {
    return DBHelper.database
      .then((db) => {
        const transaction = db.transaction(DBHelper._outbox, 'readwrite');
        const store = transaction.objectStore(DBHelper._outbox);
        return store.clear();
      })
      .then((query) => new Promise((resolve) => {
        query.onsuccess = () => resolve();
      }))
      .catch(() => console.warn(`encountered database problem when trying to delete outbox contents`));
  }
}
