
/* =========================================================
   HK DELIGHT OFFLINE SERVICE WORKER
   LOW-DATA REVISION V6
   =========================================================

   Promotion images:
   - Cache first
   - Download once per filename
   - Reuse offline

   HTML / CSS / JS / JSON:
   - Network first
   - Cache successful responses
   - Fall back offline

   Videos:
   - Leave streaming and range requests to browser
   ========================================================= */

var CACHE_NAME = "hk-delight-menu-v6";
var MEDIA_CACHE = "hk-delight-media-v6";

var CORE_FILES = [
  "./bbq.html",
  "./lunchbox.html",
  "./promo.html",
  "./shared.css",
  "./shared.js",
  "./display-config.json",
  "./site-version.json",
  "./menu-data.json",
  "./promo-list.js",
  "./images/bbq-strip.png",
  "./images/lunch-strip.png",
  "./images/curry.jpg"
];

function getCacheKey(request) {
  var url = new URL(request.url);
  url.search = "";

  return new Request(url.toString(), {
    method: "GET"
  });
}

function isImage(url) {
  return /\.(png|jpg|jpeg|webp|gif|avif|bmp)$/i.test(
    url.pathname
  );
}

function isVideo(url) {
  return /\.(mp4|webm)$/i.test(url.pathname);
}

/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", function(event) {

  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {

      return Promise.all(
        CORE_FILES.map(function(file) {

          return fetch(file, {
            cache: "no-store"
          }).then(function(response) {

            if (response && response.ok) {
              return cache.put(file, response.clone());
            }

          }).catch(function() {
            /* Keep installing if one file is unavailable. */
          });

        })
      );

    }).then(function() {
      return self.skipWaiting();
    })
  );

});

/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", function(event) {

  event.waitUntil(
    caches.keys().then(function(keys) {

      return Promise.all(
        keys.filter(function(key) {

          return (
            key !== CACHE_NAME &&
            key !== MEDIA_CACHE &&
            (
              key.indexOf("hk-delight-") === 0
            )
          );

        }).map(function(key) {
          return caches.delete(key);
        })
      );

    }).then(function() {
      return self.clients.claim();
    })
  );

});

/* =========================================================
   IMAGE CACHE FIRST
   ========================================================= */

function cacheFirstImage(request) {

  var key = getCacheKey(request);

  return caches.open(MEDIA_CACHE).then(function(cache) {

    return cache.match(key).then(function(cached) {

      if (cached) {
        return cached;
      }

      return fetch(request, {
        cache: "default"
      }).then(function(response) {

        if (response && response.ok) {

          var copy = response.clone();

          return cache.put(key, copy).then(function() {
            return response;
          }).catch(function() {
            return response;
          });

        }

        return response;

      });

    });

  });

}

/* =========================================================
   NETWORK FIRST FOR SITE FILES
   ========================================================= */

function networkFirst(request) {

  var key = getCacheKey(request);

  return fetch(request, {
    cache: "no-store"
  }).then(function(response) {

    if (response && response.ok) {

      var copy = response.clone();

      caches.open(CACHE_NAME).then(function(cache) {
        return cache.put(key, copy);
      }).catch(function() {});

    }

    return response;

  }).catch(function() {

    return caches.match(key).then(function(cached) {

      if (cached) {
        return cached;
      }

      if (request.mode === "navigate") {

        return new Response(
          '<!DOCTYPE html><html><head>' +
          '<meta charset="UTF-8">' +
          '</head><body style="' +
          'margin:0;background:#000;' +
          '"></body></html>',
          {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=UTF-8"
            }
          }
        );

      }

      return new Response("", {
        status: 503,
        statusText: "Offline"
      });

    });

  });

}

/* =========================================================
   FETCH ROUTING
   ========================================================= */

self.addEventListener("fetch", function(event) {

  var request = event.request;

  if (request.method !== "GET") {
    return;
  }

  var url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  /*
    Do not interfere with video streaming
    or partial-content requests.
  */

  if (
    isVideo(url) ||
    request.headers.has("range")
  ) {
    return;
  }

  /*
    Cache all local image files.
    This includes menu strips and promotions.
  */

  if (isImage(url)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  /*
    Keep menu pages, shared.js, JSON and HTML
    network-first for remote updates.
  */

  event.respondWith(networkFirst(request));

});
