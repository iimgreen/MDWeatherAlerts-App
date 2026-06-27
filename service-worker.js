const MDWA_CACHE_NAME = "md-weather-alerts-v0-8";

const MDWA_FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/main.css",
  "./js/app.js",
  "./assets/app-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(MDWA_CACHE_NAME).then((cache) => {
      return cache.addAll(MDWA_FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== MDWA_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || caches.match("./index.html");
      });
    })
  );
});