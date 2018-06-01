let restaurants,
  neighborhoods,
  cuisines,
  map,
  markers = [],
  mapScriptAdded = false;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  // prevent Roboto font from loading to save bandwidth
  // https://stackoverflow.com/questions/25523806/google-maps-v3-prevent-api-from-loading-roboto-font
  const head = document.getElementsByTagName('head')[0];
  const insertBefore = head.insertBefore;
  head.insertBefore = function (newElement, referenceElement) {
    if (newElement.href && newElement.href.indexOf('//fonts.googleapis.com/css?family=Roboto') > -1) {
        return;
    }
    insertBefore.call(head, newElement, referenceElement);
  };

  // open DB connection, load restaurants and options and load map markers if necessary.
  DBHelper.database.then(() => {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        console.error(error);
      } else {
        self.restaurants = restaurants;
        fillRestaurantsHTML();
      }
      fetchNeighborhoods();
      fetchCuisines();
      if (map) {
        addMarkersToMap();
      }
    });
  });
});

// register handler for post loading map content
const mapToggle = document.getElementById('map__toggle');
mapToggle.onchange = (event) => {
  const map = document.getElementById('map');
  if (mapToggle.checked) {
    map.className = '';
    if (!mapScriptAdded) {
      const mapScript = document.createElement('script');
      mapScript.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyC8y7sHdVpkLdBksQR9UDk0me5X_IbgD8g&libraries=places&callback=initMap';
      mapScript.async = true;
      mapScript.defer = true;
      document.body.appendChild(mapScript);
      mapScriptAdded = true;
    }
  } else {
    map.className = 'hide';
  }
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.textContent = neighborhood;
    option.value = neighborhood;
    select.appendChild(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.textContent = cuisine;
    option.value = cuisine;
    select.appendChild(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  try {
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });
  } catch(error) {
    console.log(error);
  }
  // load map markers if restaurant has been loaded.
  if (self.restaurants) {
    addMarkersToMap(self.restaurants);
  }
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      addMarkersToMap();
    }
  })
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(m => m.setMap(null));
  }
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  const fragment = document.createDocumentFragment();
  restaurants.forEach(restaurant => {
    fragment.appendChild(createRestaurantHTML(restaurant));
  });
  ul.appendChild(fragment);
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const figure = document.createElement('figure');
  const caption = document.createElement('figcaption');
  const picture = document.createElement('picture');
  caption.className = 'restaurant__image-caption';
  caption.textContent = restaurant.photo_title;
  fillRestaurantImages(restaurant, picture);
  figure.className = 'restaurant-img';
  figure.appendChild(picture);
  figure.appendChild(caption);
  li.appendChild(figure);

  const name = document.createElement('h1');
  const more = document.createElement('a');
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `Restaurant ${restaurant.name}`);
  more.textContent = restaurant.name;
  name.appendChild(more);
  li.appendChild(name);

  const neighborhood = document.createElement('p');
  neighborhood.textContent = restaurant.neighborhood;
  li.appendChild(neighborhood);

  const address = document.createElement('address');
  address.textContent = restaurant.address;
  li.appendChild(address);

  return li;
};

/*
 * Create source tags and image tag and add them to the restaurant picture.
 */
fillRestaurantImages = (restaurant, picture) => {
  const imageName = DBHelper.imageUrlForRestaurant(restaurant);

  if (!imageName.endsWith('.svg')) {
    const smallSource = document.createElement('source');
    smallSource.srcset = imageName.replace('.', '-200.');
    smallSource.media = '(max-width: 200px)';

    const mediumSource = document.createElement('source');
    mediumSource.srcset = imageName.replace('.', '-320.');
    mediumSource.media = '(max-width: 320px)';

    const biggerSource = document.createElement('source');
    biggerSource.srcset = imageName.replace('.', '-420.');
    biggerSource.media = '(max-width: 420px)';

    const bigSource = document.createElement('source');
    bigSource.srcset = imageName.replace('.', '-500.');
    bigSource.media = '(max-width: 500px)';

    picture.appendChild(smallSource);
    picture.appendChild(mediumSource);
    picture.appendChild(biggerSource);
    picture.appendChild(bigSource);
  }

  const image = document.createElement('img');
  image.alt = restaurant.photo_title;
  image.src = imageName.replace('.', '-orig.');

  picture.appendChild(image);
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = window.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, window.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    markers.push(marker);
  });
};
