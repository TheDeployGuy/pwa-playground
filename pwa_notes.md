Service Workers:
SW are background processes that work on another thread, not the main thread.

SW live on, it manages all pages of the given scope.

SW do not have access to the html.

SW work in the backend they are great for listening to events.

SW are always running even if you close the app.

Listenable events:

- Fetch
- Push notifications
- Notification interaction
- Background sync
- Service worker lifecycle events

SW lifecycle:

- Install - This event is only triggered if your sw file has changed. If you revisit and it hasn't it wont install again and the event wont trigger
- Activation (activates as soon as they can, not right away)
- Idle (Sits in Background waiting for events)
- Terminated (Sleeping or Killed) - If a fetch events occurs, sw is woken up.

SW scope is related to the folder the SW file is in. If you add it to the root it can control all of your application.

```js
// Register a SW
if ("serviceWorker" in navigator) {
  // Supports Service worker
  navigator.serviceWorker
    .register("./sw.js", { scope: "THIS IS OPTIONAL" })
    .then(() => {
      console.log("Service worker registered!");
    });
}
```

SW workers only work on https and localhost.

```js sw.js
// Self refers to the SW itself.
self.addEventListener("install", event => {
  console.log("[Service worker] Installing SW...", event);
});

// This will only run when user closes or re-visits your website or the old sw is un-registered. Allows us to not break current user experience.
self.addEventListener("activate", event => {
  console.log("[Service worker] Activating SW...", event);
  // Ensure SW are processed correctly as sometimes they behave weird.
  return self.clients.claim();
});

// This gets triggered on every fetch event, this means a href resources as well as manual calling of fetch.
self.addEventListener("fetch", event => {
  console.log("[Service worker] Fetching something...", event);
  // Overwrite the fetch request.
  event.respondWith(fetch(event.request));
});

// beforeinstallprompt
```

Cache API is a simple key, value store. (Both SW and JS can access it)
What is cache-able:

- Everything around your dynamic content (the app shell, css, html, base images, static content).

Installation is the best place in the SW to cache frequently used assets.
The cache can store files, images etc.

```js sw.js cache

// These cache variables need to be "bumped" every-time we update or assets. (Not a SW)
const CACHE_STATIC_NAME = 'static';
const CACHE_DYNAMIC_NAME = 'dynamic';
// Self refers to the SW itself.
self.addEventListener("install", event => {
  console.log("[Service worker] Installing SW...", event);
  // Wait until makes sure the install event does finish until the function passed to it has returned.
  event.waitUntil(
    // Cache opens a cache store with a specific name or creates if doesn't exist. Pre-caching...
    caches.open(CACHE_STATIC_NAME).then(cache => {
      console.log("[Service worker] Pre-caching app shell");
      cache.add("/src/js/app.js");
      cache.addAll([
          '/', // We need to store / because that is the initial request.
          'index.html'
          '/src/css/app.css'
        //   You can also store external urls
          'https://some-external-url/mobile.css'
        //...more files here
      ])
    })
  );
});


// This will only run when user closes or re-visits your website or the old sw is un-registered. Allows us to not break current user experience. Since they are returned with the new assets we can delete the old cache.
self.addEventListener("activate", event => {
  console.log("[Service worker] Activating SW...", event);
  event.waitUntil(
      cache.keys()
        .then(keys => {
            return Promise.all(keys.map(key => {
                if(key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
                    console.log('[Service worker] Removing old cache.', key)
                    return caches.delete(key);
                }
            }))
        })
  )
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
        return response;
      } else {
        //   Dynamic caching as the user uses the app.
        return fetch(event.request)
            .then(res => {clear
                return caches.open(CACHE_DYNAMIC_NAME)
                    .then(cache => {
                        cache.put(event.request.url, res.clone())
                        return res;
                    })
            })
            .catch(e => console.log(e))
      }
    })
  );
});
```

You can provide on demand cache, you could provide the user with a button to save some articles or images offline. You can simple access the caches object in our JS just like in the SW.

You can also provide a fallback page instead of the default browser offline page.

```
  .catch(function(err) {
    return caches.open(CACHE_STATIC_NAME).then(function(cache) {
      return cache.match("/offline.html");
    });
  });
```

## Caching Strategies

- Cache with Network fallback, cache whatever you need even dynamically as the user goes, if they are on a page that is not cache show a fallback page.
- Cache only - Never go to the network for anything, no dynamic caching etc.
- Network only - Always go to the network, no service worker.
- Network with cache fallback - Only reach out to cache if network fails.
- Cache then Network - Get asset as quickly possible whilst trying to get a new version from the network.

Cache then network, involves access your cache in your js file, making the network request as well and only using the cache if the network doesn't come back before. Most of the time the cache should be quicker but it is possible the network could be quicker which is why we need this sort of flag.

Cache only is a good approach for app shell files, as everytime we update these files we push a new service worker.

## IndexDB and Dynamic Data

Dynamic Caching is storing assets(base images, pages and other things not relating to data), it is stored in browser cache.
Caching Dynamic content is storing dynamic usually json data, it is stored in IndexDb (which is a key-value database built into the browser).

### IndexDB

IndexDB is a tranactional Key-Value Database in the Browser. (Transational meaning if one action within a tractions fails none of the actions of that transaction are applied)
You can store files/blobs as well as json data. (Unstructured data)

The approach is usually to have one Database per app but multiple object stores (like a table)

##### Using IndexDB

The regular IndexDB API is very "callbacky" and can be hard to work with but there is a package called idb which allows us to use promises.

Service workers can import other packages via the `importScripts('path/to/script')` useful for the cas eof importing the idb package.

Storing a json object in indexDB:
```
// Setup a connect to idb
var dbPromise = idb.open('store-name', 1, function(db) {
  if(!db.objectStoreNames.contains('posts')) {
    // By specifing a keyPath we can later retrive our store object by id.
    db.createObjectStore('table-name', {keyPath: 'id'})
  }
})

......
// Later in fetch code;
var clonedRes = res.clone()

clonedRes.json()
  .then(function(data) {
    // Transform any data
    dbPromise
      .then(function(db) {
        // Create a transaction
        var tx = db.transaction('store-name', 'readwrite');
        // Open the store
        var store = tx.objectStore('store-name');
        store.put(entire object-or-loop-of-each-data);
        return tx.complete;
      })
  })

return res;
```

Getting data out of IndexDB

```
function readAllData(store) {
   return dbPromise
    .then(function(db) {
      // Create a transaction
      var tx = db.transaction(store, 'readwonly');
      // Open the store
      var store = tx.objectStore(store);
      // Do not need to return a transaction since we are only reading.
      return store.getAll();
    })
}


readAllData('store-name)
  .then(function(data) {
    if (!networkDataRecieved) {
      console.log('From cache', data);
      updateUi(data)
    }
  })
```

Handling when item are deleted from the network source. Since using put only overwrites if there you will have a flash of old data.
```
  // Once approach is clearing all the data just before you rewrite the data to indexDB
  function clearAllData(store) {
   return dbPromise
    .then(function(db) {
      // Create a transaction
      var tx = db.transaction(store, 'readwrite');
      // Open the store
      var store = tx.objectStore(store);
      store.clear();
      return tx.complete;
    })
  }
  
  // Deleting a single object.
  function clearAnItem(store, id) {
     return dbPromise
        .then(function(db) {
      // Create a transaction
      var tx = db.transaction(store, 'readwrite');
      // Open the store
      var store = tx.objectStore(store);
      store.delete(id);
      return tx.complete;
    })
  }
```

## Background Sync
Allow us to send information to the server even when we are offline. It even allows us to send data if the user cloese the app before the data is sent.

This is done as part of a sync task in the SW, e.g in an on click hander we can:
In the file where you are sending the data to the backend
```
  // Check for service worker availablity and for SyncManager available
  if('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(function(sw) {
        const dataObject { ...some_data_here };
        // Store our request data in indexDB.
        writeData('storeName', dataObject)
          .then(() => {
            sw.sync.register('ID-OF-SYNC-task');
          })
      });
  } else {
    // Fallback to send the data anyway incase we do not have access to syncmanager
    sendDataToBackend()
  }
```

In your service worker file
```
  // Sync event gets triggered if an internet connection is restablisted / also if we always had an internet connection.
  self.addEventListener('sync', () => {
    console.log('[Service Worker] Background Syncing', event);
    if(event.tag === 'ID-OF-SYNC-task'){
      console.log('[Service Worker] Syncing ID-OF-SYNC-task');
      event.waitUntil(
        readAllDataFromIndexDB('storeName')
        .then(res => {
          // Since there may be many posts queued offline, we have to loop
          for (var dt of data) {
              //  sendDataToBackend() is just a placeholder function for notes sake.
             sendDataToBackend()
              .then(res => {
                // clean up indexDB objects as we have no sent them.
                if(res.ok) {
                  deleteItemFromIndexDB('store-name', dt.id)
                }
              })
          }
        }) 
       )
    }
  })
```

Periodic Sync is coming in the future where you can periodic get data from the server.


## Push Notifications

Allows us to push a notification to be sent to the user, it seems like it only supported on android on the chrome browser.
This is done via a publish and subscription method.

Our backend server sends a push notification to the Browser Vendor push server, this browser server then sends a push event to our service worker which it can then react to.

### Notification API
Before we can use the notification API we need to request permission from the user:
```js
  	// When a button is clicked or on page load run this function:
    if( 'Notification' in window) {
        Notification.requestPermission(result => {
          console.log('User Choice', result);
          if (result !== 'granted') {
            console.log('Too bad cannot send notifications and cannot ask again');
          } else {
            // Have permission, show confirm notification.
            new Notification('Successfully allowed to show Notifications', {
              body: 'Some description text here'
            })
          }
        })
    }
```

#### Notifications from Service Worker and options.
```js
  // If service workers and notifications are enabled
  navigator.serviceWorker.ready
    .then(swreg => {
      swreg.showNotification('Successfully allowed to show Notifications', {
        body: 'Some description text here',
        icon: 'path/to/icon', // Show to right of notification
        image: 'path/to/img',
        dir: 'ltr', // Direction of text
        lang: 'en-US',
        vibrate: [100, 50, 200], // vibrate pattern
        badge: 'path/to/badge' // Android only badge for notifications,
        tag: 'id-of-tag', // Allows to stack notications
        renotify: true, // Allows to renotify the user of same notifications
        actions: [
          {action: 'confirm', title: 'OK', icon: 'icon/to/confirm' },
          {action: 'cancel', title: 'cancel', icon: 'icon/to/cancel' }
        ]
      })
    })
```

Since notifications can be clicked on when the user is not inside our app and since it is a system feature we can react to click events on our notifications inside our service worker file like so:

```
  self.addEventListener('notificationclick', (e) => {
    const { notification, action } = event;
    
    // Check which notification if they interact with it we can close it
    notification.close()
  })
  
  // This gets triggered when the user swipes away or closes the notification
  self.addEventListener('notificationclose', (e) => {
    // Do something...
  })
```

Creating a Push Subscription (Client side)
```
  let reg;
  navigator.serviceWorker.ready
    .then(swreg => {
      reg = swreg;
      swreg.pushManager.getSubscription()
      }
      );
    .then(sub => {
      if(sub === null) {
        // Create a new subscription
        // To send push notifications surucely you need a vapid key. This can used using web-push package from npm
        const vapidPublicKey = 'SOME-KEY-HERE'
        // Push manager expects an int 8 array so we need to convert it using an helper function which can be found online.
        const convertedVapidPublicKey = urlBase64ToUint8Array(validPublicKey)
        return reg.pushManager.subscribe({
          userVisibleOnly: true, // Only show the to the specific user
          applicationServerKey: convertedVapidPublicKey
        });
      } else {
        // We have a subscription
      }
    })
    .then(newSub => sendSubToBackend) // Helper (for notes purposes) to store the newSub data to your backend.
    .then(res => displayConfirmNotifcation) // Helper to show user success messages
```

Server Side
```
  // In some API handler
  webpush.setVapidDetails('mailto:email-client@company.com', 'PUBLIC-KEY-HERE', 'PRIVATE-KEY-HERE');
  const subscriptionsFromDB = someWayToGetSubFromDB()
  subscriptionsFromDB.forEach(val => {
    const pushConfig = {
      endpoint: val.endpoint,
      keys: {
        auth: val.auth,
        p256dh: val.p256dh
      }
    }
    
    webpush.sendNotification(pushConfig, JSON.stringify({ somedata: here })
  })
```

## Other:
- Picture element allows you to specify images for different screen sizes.
- Img srcset is a property on the img element which you can also specify the image size for certain sizes.
 


