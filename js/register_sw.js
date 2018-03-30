/**
 * Register the service worker.
 */
registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    // ServiceWorker is not available
    return;
  }

  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('installed ServiceWorker'));
};
