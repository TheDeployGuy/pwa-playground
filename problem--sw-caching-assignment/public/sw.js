const CACHE_STATIC_NAME = "static-v3";
const CACHE_DYNAMIC_NAME = "dynamic-v3";
// Self refers to the SW itself.
self.addEventListener("install", event => {
  console.log("[Service worker] Installing SW...", event);
  // Wait until makes sure the install event does finish until the function passed to it has returned.
  event.waitUntil(
    // Cache opens a cache store with a specific name or creates if doesn't exist. Pre-caching...
    caches.open(CACHE_STATIC_NAME).then(cache => {
      console.log("[Service worker] Pre-caching app shell");
      cache.addAll([
        "/", // We need to store / because that is the initial request.
        "/index.html",
        "/src/css/app.css",
        "src/js/main.js",
        "src/js/material.min.js",
        "https://fonts.googleapis.com/css?family=Roboto:400,700",
        "https://fonts.googleapis.com/icon?family=Material+Icons",
        "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css"
      ]);
    })
  );
});

self.addEventListener("activate", event => {
  console.log("[Service worker] Activating SW...", event);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log("[Service worker] Removing old cache.", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Ensure SW are processed correctly as sometimes they behave weird.
  return self.clients.claim();
});

self.addEventListener("fetch", event => {
  console.log("[Service worker] Fetching something...", event);
  // Overwrite the fetch request.
  event.respondWith(
    // Urls are the keys to cache and event.request is the url
    caches.match(event.request).then(res => {
      // If it is cached get the cache version. otherwise fetch it
      if (res) {
        return res;
      } else {
        //   Dynamic caching as the user uses the app.
        return fetch(event.request)
          .then(res => {
            return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
              cache.put(event.request.url, res.clone());
              return res;
            });
          })
          .catch(e => console.log(e));
      }
    })
  );
});
