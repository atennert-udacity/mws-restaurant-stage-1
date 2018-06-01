let restaurant,map,mapScriptAdded=!1;document.addEventListener("DOMContentLoaded",e=>{const t=document.getElementsByTagName("head")[0],n=t.insertBefore;t.insertBefore=function(e,a){e.href&&e.href.indexOf("//fonts.googleapis.com/css?family=Roboto")>-1||n.call(t,e,a)},DBHelper.database.then(()=>{fetchRestaurantFromURL((e,t)=>{fillBreadcrumb(),map&&initMap()})}),navigator.serviceWorker&&navigator.serviceWorker.addEventListener("message",e=>{"updateReviews"===e.data&&DBHelper.fetchReviews(e=>{fillReviewsHTML(e)},self.restaurant.id)})});const mapToggle=document.getElementById("map__toggle");mapToggle.onchange=(e=>{const t=document.getElementById("map");if(mapToggle.checked){if(t.className="",!mapScriptAdded){const e=document.createElement("script");e.src="https://maps.googleapis.com/maps/api/js?key=AIzaSyC8y7sHdVpkLdBksQR9UDk0me5X_IbgD8g&libraries=places&callback=initMap",e.async=!0,e.defer=!0,document.body.appendChild(e),mapScriptAdded=!0}}else t.className="hide"}),window.initMap=(()=>{if(self.restaurant){try{self.map=new google.maps.Map(document.getElementById("map"),{zoom:16,center:self.restaurant.latlng,scrollwheel:!1})}catch(e){console.warn(e)}DBHelper.mapMarkerForRestaurant(self.restaurant,self.map)}else map=!0}),fetchRestaurantFromURL=(e=>{if(self.restaurant)return void e(null,self.restaurant);const t=getParameterByName("id");t?DBHelper.fetchRestaurantById(t,(t,n)=>{self.restaurant=n,n?(fillRestaurantHTML(),e(null,n)):console.error(t)}):(error="No restaurant id in URL",e(error,null))}),fillRestaurantHTML=((e=self.restaurant)=>{const t=document.getElementById("restaurant-name"),n=document.getElementById("restaurant-address"),a=document.getElementById("restaurant__is-favorite"),r=document.getElementById("restaurant-cuisine"),o=e.id;t.textContent=e.name,t.setAttribute("aria-label",`Restaurant: ${e.name}`),n.textContent=e.address,a.checked=!!e.isFavorite,a.onchange=(()=>DBHelper.setRestaurantAsFavorite(o,a.checked)),r.textContent=e.cuisine_type,r.setAttribute("aria-label",`Cuisine: ${e.cuisine_type}`),fillRestaurantImages(e),e.operating_hours&&fillRestaurantHoursHTML(),DBHelper.fetchReviews(e=>fillReviewsHTML(e),o)}),fillRestaurantImages=((e=self.restaurant)=>{const t=DBHelper.imageUrlForRestaurant(e),n=document.querySelector("#restaurant__image-container > picture");if(!t.endsWith(".svg")){const e=document.createElement("source");e.srcset=t.replace(".","-320."),e.media="(max-width: 320px)";const a=document.createElement("source");a.srcset=t.replace(".","-420."),a.media="(max-width: 420px)";const r=document.createElement("source");r.srcset=t.replace(".","-500."),r.media="(max-width: 500px)",n.appendChild(e),n.appendChild(a),n.appendChild(r)}const a=document.createElement("img");a.id="restaurant-img",a.classList.add("restaurant-img"),a.alt=e.photo_title,a.src=t.replace(".","-orig."),n.appendChild(a),document.getElementById("restaurant__image-caption").textContent=e.photo_title}),fillRestaurantHoursHTML=((e=self.restaurant.operating_hours)=>{const t=document.getElementById("restaurant-hours"),n=document.createDocumentFragment(),a=document.createElement("caption");let r,o,i,l,s;a.textContent="Opening hours",a.className="restaurant-hours__caption",n.appendChild(a);const m=Object.keys(e);for(s of m)r=document.createElement("tr"),(o=document.createElement("td")).textContent=s,r.appendChild(o),i=document.createElement("td"),e[s].split(",").map(e=>((l=document.createElement("time")).textContent=e,l)).forEach(e=>i.appendChild(e)),r.appendChild(i),n.appendChild(r);t.appendChild(n)}),fillReviewsHTML=(e=>{const t=document.getElementById("reviews-container");t.innerHTML="";const n=document.createDocumentFragment(),a=document.createElement("h2");if(a.textContent="Reviews",n.appendChild(a),!e){const e=document.createElement("p");return e.textContent="No reviews yet!",void n.appendChild(e)}const r=document.createElement("ul");let o;for(o of(r.id="reviews-list",e))r.appendChild(createReviewHTML(o));r.appendChild(createReviewForm()),n.appendChild(r),t.appendChild(n);const i=t.querySelector(".review__form");i.addEventListener("submit",e=>(e.preventDefault&&e.preventDefault(),handleAddReview(i,e),!1))}),createReviewHTML=(e=>{const t=document.createElement("li"),n=document.createElement("p"),a=document.createElement("time"),r=document.createElement("p"),o=document.createElement("p");return t.className="review",n.textContent=e.name,n.className="review__name",t.appendChild(n),a.textContent=e.updatedAt?new Date(e.updatedAt).toLocaleDateString("en-EN",{year:"numeric",month:"long",day:"numeric"}):"sending",a.className="review__date",t.appendChild(a),r.textContent=`Rating: ${e.rating}`,r.className="review__rating",t.appendChild(r),o.textContent=e.comments,o.className="review__comment",t.appendChild(o),t}),createReviewForm=(()=>{const e=document.createElement("li");return e.className="review__form-container",e.innerHTML='<h2 id="review__form--header">Submit your review</h2>\n  <form class="review__form">\n    <label class="review__form--name-label" for="review__form--name">Name</label>\n    <input type="text" name="name" id="review__form--name">\n    <label class="review__form--rating-label" for="review__form--rating">Rating</label>\n    <select id="review__form--rating" name="rating">\n      <option value="1">Rating: 1</option>\n      <option value="2">Rating: 2</option>\n      <option value="3">Rating: 3</option>\n      <option value="4">Rating: 4</option>\n      <option value="5">Rating: 5</option>\n    </select>\n    <label class="review__form--comment-label" for="review__form--comment">Comments</label>\n    <textarea name="comments" id="review__form--comment"></textarea>\n    <button id="review__form--submit" type="submit">Submit</button>\n  </form>',e}),handleAddReview=((e,t)=>{const n=convertFormData(e.elements);Object.assign(n,{restaurant_id:self.restaurant.id});const a=createReviewHTML(n),r=document.getElementById("reviews-list");r.insertBefore(a,r.lastChild),DBHelper.onSendReview(n,()=>DBHelper.fetchReviews(e=>fillReviewsHTML(e),self.restaurant.id))}),convertFormData=(e=>[].reduce.call(e,(e,t)=>(e[t.name]=t.value,e),{})),fillBreadcrumb=((e=self.restaurant)=>{const t=document.getElementById("breadcrumb"),n=document.createElement("li");n.textContent=e.name,t.appendChild(n)}),getParameterByName=((e,t)=>{t||(t=window.location.href),e=e.replace(/[\[\]]/g,"\\$&");const n=new RegExp(`[?&]${e}(=([^&#]*)|&|#|$)`).exec(t);return n?n[2]?decodeURIComponent(n[2].replace(/\+/g," ")):"":null});