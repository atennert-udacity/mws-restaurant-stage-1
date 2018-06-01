let restaurant,
  map,
  mapScriptAdded = false;

/**
 * Fetch restaurant as soon as the page is loaded.
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

  // open DB, fetch restaurant data and load map if necessary.
  DBHelper.database.then(() => {
    fetchRestaurantFromURL((error, restaurant) => {
      fillBreadcrumb();
      if (map) {
        initMap();
      }
    });
  });

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data === 'updateReviews') {
        DBHelper.fetchReviews((reviews) => {
          fillReviewsHTML(reviews);
        }, self.restaurant.id);
      }
    })
  }
});

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
 * Initialize Google map, called from HTML.
 * If restaurant is not loaded the map will be marked as 'to load' for restaurant load handling.
 */
window.initMap = () => {
  if (self.restaurant) {
    try {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: self.restaurant.latlng,
        scrollwheel: false
      });
    } catch (error) {
      console.warn(error);
    }
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  } else {
    map = true;
  }
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
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
      callback(null, restaurant);
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name'),
    address = document.getElementById('restaurant-address'),
    isFavorite = document.getElementById('restaurant__is-favorite'),
    cuisine = document.getElementById('restaurant-cuisine'),
    restaurantId = restaurant.id;

  name.textContent = restaurant.name;
  name.setAttribute('aria-label', `Restaurant: ${restaurant.name}`);

  address.textContent = restaurant.address;

  isFavorite.checked = !!restaurant.isFavorite;
  isFavorite.onchange = () => DBHelper.setRestaurantAsFavorite(restaurantId, isFavorite.checked);

  cuisine.textContent = restaurant.cuisine_type;
  cuisine.setAttribute('aria-label', `Cuisine: ${restaurant.cuisine_type}`);

  fillRestaurantImages(restaurant);

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.fetchReviews((reviews) => fillReviewsHTML(reviews), restaurantId);
}

/*
 * create source tags and image tag and add them to the restaurant picture.
 */
fillRestaurantImages = (restaurant = self.restaurant) => {
  const imageName = DBHelper.imageUrlForRestaurant(restaurant);
  const picture = document.querySelector('#restaurant__image-container > picture');

  if (!imageName.endsWith('.svg')) {
    const mediumSource = document.createElement('source');
    mediumSource.srcset = imageName.replace('.', '-320.');
    mediumSource.media = '(max-width: 320px)';

    const biggerSource = document.createElement('source');
    biggerSource.srcset = imageName.replace('.', '-420.');
    biggerSource.media = '(max-width: 420px)';

    const bigSource = document.createElement('source');
    bigSource.srcset = imageName.replace('.', '-500.');
    bigSource.media = '(max-width: 500px)';

    picture.appendChild(mediumSource);
    picture.appendChild(biggerSource);
    picture.appendChild(bigSource);
  }

  const image = document.createElement('img');
  image.id = 'restaurant-img';
  image.classList.add('restaurant-img');
  image.alt = restaurant.photo_title;
  image.src = imageName.replace('.', '-orig.');

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
  
  let row, day, time, timeContainer, key;
  const keys = Object.keys(operatingHours);
  for (key of keys) {
    row = document.createElement('tr');

    day = document.createElement('td');
    day.textContent = key;
    row.appendChild(day);

    time = document.createElement('td');

    // putting times in seperate elements for design-purposes
    operatingHours[key].split(',').map((time) => {
      timeContainer = document.createElement('time');
      timeContainer.textContent = time;
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
fillReviewsHTML = (reviews) => {
  const container = document.getElementById('reviews-container');
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const title = document.createElement('h2');
  title.textContent = 'Reviews';
  fragment.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.textContent = 'No reviews yet!';
    fragment.appendChild(noReviews);
    return;
  }
  const ul = document.createElement('ul');
  ul.id = 'reviews-list';
  let review;
  for (review of reviews) {
    ul.appendChild(createReviewHTML(review));
  }
  ul.appendChild(createReviewForm());
  fragment.appendChild(ul);
  container.appendChild(fragment);

  const reviewForm = container.querySelector('.review__form');
  reviewForm.addEventListener('submit', (event) => {
    if (event.preventDefault) {
      event.preventDefault();
    }
    handleAddReview(reviewForm, event);
    return false; // don't let the form submit by itself
  });
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li'),
    name = document.createElement('p'),
    date = document.createElement('time'),
    rating = document.createElement('p'),
    comments = document.createElement('p');

  li.className = 'review';

  name.textContent = review.name;
  name.className = 'review__name';
  li.appendChild(name);

  date.textContent = !review.updatedAt ? 'sending'
    : new Date(review.updatedAt).toLocaleDateString('en-EN', {year: 'numeric', month: 'long', day: 'numeric'});
  date.className = 'review__date';
  li.appendChild(date);

  rating.textContent = `Rating: ${review.rating}`;
  rating.className = 'review__rating';
  li.appendChild(rating);

  comments.textContent = review.comments;
  comments.className = 'review__comment';
  li.appendChild(comments);

  return li;
}

createReviewForm = () => {
  const li = document.createElement('li');
  li.className = 'review__form-container';
  li.innerHTML = `<h2 id="review__form--header">Submit your review</h2>
  <form class="review__form">
    <label class="review__form--name-label" for="review__form--name">Name</label>
    <input type="text" name="name" id="review__form--name">
    <label class="review__form--rating-label" for="review__form--rating">Rating</label>
    <select id="review__form--rating" name="rating">
      <option value="1">Rating: 1</option>
      <option value="2">Rating: 2</option>
      <option value="3">Rating: 3</option>
      <option value="4">Rating: 4</option>
      <option value="5">Rating: 5</option>
    </select>
    <label class="review__form--comment-label" for="review__form--comment">Comments</label>
    <textarea name="comments" id="review__form--comment"></textarea>
    <button id="review__form--submit" type="submit">Submit</button>
  </form>`;
  return li;
}

/**
 * Handle submitting a review.
 */
handleAddReview = (form, event) => {
  // get form data
  const formData = convertFormData(form.elements);
  Object.assign(formData, {restaurant_id: self.restaurant.id});

  // add temporary review
  const reviewListElement = createReviewHTML(formData),
    list = document.getElementById('reviews-list');
  
  list.insertBefore(reviewListElement, list.lastChild);

  /* send data */
  DBHelper.onSendReview(formData, () => DBHelper.fetchReviews((reviews) => fillReviewsHTML(reviews), self.restaurant.id));
}

/**
 * Convert data from form to object.
 */
convertFormData = (elements) => [].reduce.call(elements, (data, element) => {
  data[element.name] = element.value;
  return data;
}, {});

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.textContent = restaurant.name;
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
