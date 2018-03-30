let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      try {
        self.map = new google.maps.Map(document.getElementById('map'), {
          zoom: 16,
          center: restaurant.latlng,
          scrollwheel: false
        });
        fillBreadcrumb();
        DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      } catch (error) {
        console.log(error);
      }
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  name.setAttribute('aria-label', `Restaurant: ${restaurant.name}`);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  cuisine.setAttribute('aria-label', `Cuisine: ${restaurant.cuisine_type}`);

  fillRestaurantImages(restaurant);

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/*
 * create source tags and image tag and add them to the restaurant picture.
 */
fillRestaurantImages = (restaurant = self.restaurant) => {
  const imageName = DBHelper.imageUrlForRestaurant(restaurant);

  const smallSource = document.createElement('source');
  smallSource.srcset = imageName.replace('.', '-200.');
  smallSource.media = '(max-width: 200px)';

  const mediumSource = document.createElement('source');
  mediumSource.srcset = imageName.replace('.', '-400.');
  mediumSource.media = '(max-width: 400px)';

  const image = document.createElement('img');
  image.id = 'restaurant-img';
  image.classList.add('restaurant-img');
  image.alt = restaurant.photo_title;
  image.src = imageName;

  const picture = document.querySelector('#restaurant__image-container > picture');
  picture.appendChild(smallSource);
  picture.appendChild(mediumSource);
  picture.appendChild(image);

  const imageCaption = document.getElementById('restaurant__image-caption');
  imageCaption.textContent = restaurant.photo_title;
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  const fragment = document.createDocumentFragment();
  const caption = document.createElement('caption');
  caption.textContent = 'Opening hours';
  caption.className = 'restaurant-hours__caption';
  fragment.appendChild(caption);
  
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');

    // putting times in seperate elements for design-purposes
    operatingHours[key].split(',').map((time) => {
      const timeContainer = document.createElement('time');
      timeContainer.innerHTML = time;
      return timeContainer;
    }).forEach((timeContainer) => time.appendChild(timeContainer));

    row.appendChild(time);

    fragment.appendChild(row);
  }
  hours.appendChild(fragment);
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.classList.add('review');

  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.classList.add('review__name')
  li.appendChild(name);

  const date = document.createElement('time');
  date.innerHTML = review.date;
  date.classList.add('review__date');
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.classList.add('review__rating');
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.classList.add('review__comment');
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
