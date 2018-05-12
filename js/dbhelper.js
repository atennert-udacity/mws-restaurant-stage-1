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
    return `http://localhost:${port}/restaurants`;
  }

  static get _objectStore() {
    return 'restaurants';
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
        const db = openRequest.result;
        const store = db.createObjectStore(DBHelper._objectStore, {keyPath: 'id'});
        store.createIndex('by-id', 'id');
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
        const transaction = db.transaction(DBHelper._objectStore, 'readonly');
        const store = transaction.objectStore(DBHelper._objectStore);
        return id ? store.getAll(~~id) : store.getAll();
      })
      .then((query) => new Promise((resolve) => {
        query.onsuccess = () => resolve(query.result.map((dbEntry) => dbEntry.restaurant));
      }))
      .catch(() => {
        console.warn(`encountered database problem when trying to find restaurant ${id}`);
        return undefined;
      })
  }

  static setDbRestaurants(restaurants) {
    DBHelper.database
      .then((db) => {
        const transaction = db.transaction(DBHelper._objectStore, 'readwrite');
        const store = transaction.objectStore(DBHelper._objectStore);
        restaurants.forEach((restaurant) => {
          store.put({id: restaurant.id, restaurant: restaurant});
        });
      })
      .catch(() => {
        console.warn(`encountered database problem when trying to set restaurants ${restaurants}`);
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
      .then(() => fetch(`${DBHelper.BACKEND_URL}/${id}`))
      .then((response) => response.json())
      .then((restaurants) => {
        if (!Array.isArray(restaurants)) {
          restaurants = [restaurants];
        }
        // fix image type
        restaurants.forEach((restaurant) => {
          if (restaurant.photograph) {
            restaurant.photograph = `${restaurant.photograph}.jpg`;
          } else {
            restaurant.photograph = 'no-img.svg';
          }
          restaurant.photo_title = `${restaurant.name} restaurant - ${restaurant.neighborhood}`;
        });
        DBHelper.setDbRestaurants(restaurants);
        internalCallback(null, restaurants);
      })
      .catch((error) => { // Oops!. Got an error from server or with the response
        const errorText = `Request failed. ${error.message}`;
        internalCallback(errorText, null);
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

}
