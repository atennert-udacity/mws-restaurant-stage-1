let restaurants,
  neighborhoods,
  cuisines;
var map;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  fetchNeighborhoods();
  fetchCuisines();
});

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
    option.innerHTML = neighborhood;
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
    option.innerHTML = cuisine;
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
  updateRestaurants();
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
  self.markers.forEach(m => m.setMap(null));
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
  addMarkersToMap();
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
  if (restaurant.photograph) {
    fillRestaurantImages(restaurant, picture);
    figure.className = 'restaurant-img';
    figure.appendChild(picture);
    figure.appendChild(caption);
    li.appendChild(figure);
  }

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
    mediumSource.srcset = imageName.replace('.', '-400.');
    mediumSource.media = '(max-width: 400px)';
  
    picture.appendChild(smallSource);
    picture.appendChild(mediumSource);
  }

  const image = document.createElement('img');
  image.alt = restaurant.photo_title;
  image.src = imageName.replace('.', '-orig.');

  picture.appendChild(image);
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
};
