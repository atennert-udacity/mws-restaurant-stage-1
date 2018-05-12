let restaurants,neighborhoods,cuisines,map,markers=[];document.addEventListener("DOMContentLoaded",e=>{const t=document.getElementsByTagName("head")[0],n=t.insertBefore;t.insertBefore=function(e,a){e.href&&e.href.indexOf("//fonts.googleapis.com/css?family=Roboto")>-1||n.call(t,e,a)},DBHelper.database.then(()=>{DBHelper.fetchRestaurants((e,t)=>{e?console.error(e):(self.restaurants=t,fillRestaurantsHTML()),fetchNeighborhoods(),fetchCuisines(),map&&addMarkersToMap()})})}),fetchNeighborhoods=(()=>{DBHelper.fetchNeighborhoods((e,t)=>{e?console.error(e):(self.neighborhoods=t,fillNeighborhoodsHTML())})}),fillNeighborhoodsHTML=((e=self.neighborhoods)=>{const t=document.getElementById("neighborhoods-select");e.forEach(e=>{const n=document.createElement("option");n.textContent=e,n.value=e,t.appendChild(n)})}),fetchCuisines=(()=>{DBHelper.fetchCuisines((e,t)=>{e?console.error(e):(self.cuisines=t,fillCuisinesHTML())})}),fillCuisinesHTML=((e=self.cuisines)=>{const t=document.getElementById("cuisines-select");e.forEach(e=>{const n=document.createElement("option");n.textContent=e,n.value=e,t.appendChild(n)})}),window.initMap=(()=>{let e={lat:40.722216,lng:-73.987501};try{self.map=new google.maps.Map(document.getElementById("map"),{zoom:12,center:e,scrollwheel:!1})}catch(e){console.log(e)}self.restaurants&&addMarkersToMap(self.restaurants)}),updateRestaurants=(()=>{const e=document.getElementById("cuisines-select"),t=document.getElementById("neighborhoods-select"),n=e.selectedIndex,a=t.selectedIndex,s=e[n].value,r=t[a].value;DBHelper.fetchRestaurantByCuisineAndNeighborhood(s,r,(e,t)=>{e?console.error(e):(resetRestaurants(t),fillRestaurantsHTML(),addMarkersToMap())})}),resetRestaurants=(e=>{self.restaurants=[],document.getElementById("restaurants-list").innerHTML="",self.markers&&self.markers.forEach(e=>e.setMap(null)),self.markers=[],self.restaurants=e}),fillRestaurantsHTML=((e=self.restaurants)=>{const t=document.getElementById("restaurants-list"),n=document.createDocumentFragment();e.forEach(e=>{n.appendChild(createRestaurantHTML(e))}),t.appendChild(n)}),createRestaurantHTML=(e=>{const t=document.createElement("li"),n=document.createElement("figure"),a=document.createElement("figcaption"),s=document.createElement("picture");a.className="restaurant__image-caption",a.textContent=e.photo_title,fillRestaurantImages(e,s),n.className="restaurant-img",n.appendChild(s),n.appendChild(a),t.appendChild(n);const r=document.createElement("h1"),o=document.createElement("a");o.href=DBHelper.urlForRestaurant(e),o.setAttribute("aria-label",`Restaurant ${e.name}`),o.textContent=e.name,r.appendChild(o),t.appendChild(r);const l=document.createElement("p");l.textContent=e.neighborhood,t.appendChild(l);const c=document.createElement("address");return c.textContent=e.address,t.appendChild(c),t}),fillRestaurantImages=((e,t)=>{const n=DBHelper.imageUrlForRestaurant(e);if(!n.endsWith(".svg")){const e=document.createElement("source");e.srcset=n.replace(".","-200."),e.media="(max-width: 200px)";const a=document.createElement("source");a.srcset=n.replace(".","-320."),a.media="(max-width: 320px)";const s=document.createElement("source");s.srcset=n.replace(".","-420."),s.media="(max-width: 420px)";const r=document.createElement("source");r.srcset=n.replace(".","-500."),r.media="(max-width: 500px)",t.appendChild(e),t.appendChild(a),t.appendChild(s),t.appendChild(r)}const a=document.createElement("img");a.alt=e.photo_title,a.src=n.replace(".","-orig."),t.appendChild(a)}),addMarkersToMap=((e=window.restaurants)=>{e.forEach(e=>{const t=DBHelper.mapMarkerForRestaurant(e,window.map);google.maps.event.addListener(t,"click",()=>{window.location.href=t.url}),markers.push(t)})});