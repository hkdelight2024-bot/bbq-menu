const CACHE_NAME = "hk-delight-menu-v1";

const CORE_FILES = [
  "./bbq.html",
  "./lunchbox.html",
  "./promo.html",
  "./shared.css",
  "./shared.js",
  "./menu-data.json",
  "./promo-list.js"
];


/* =========================================================
   NORMALISE CACHE KEYS

   shared.js?t=12345
   shared.js?t=67890

   both cache as:

   shared.js
   ========================================================= */

function getCacheKey(request) {

  const url =
    new URL(request.url);

  url.search = "";

  return new Request(
    url.toString(),
    {
      method: "GET"
    }
  );

}


/* =========================================================
   INSTALL
   Cache the basic application files.

   Individual failures do not stop installation.
   ========================================================= */

self.addEventListener(
  "install",
  function(event) {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(
          async function(cache) {

            for (
              let i = 0;
              i < CORE_FILES.length;
              i++
            ) {

              try {

                const response =
                  await fetch(
                    CORE_FILES[i],
                    {
                      cache: "no-store"
                    }
                  );

                if (response.ok) {

                  await cache.put(
                    CORE_FILES[i],
                    response
                  );

                }

              }

              catch (error) {

                console.log(
                  "Precache failed:",
                  CORE_FILES[i]
                );

              }

            }

          }
        )

    );


    self.skipWaiting();

  }
);


/* =========================================================
   ACTIVATE
   Delete older cache versions.
   ========================================================= */

self.addEventListener(
  "activate",
  function(event) {

    event.waitUntil(

      caches
        .keys()
        .then(
          function(keys) {

            return Promise.all(

              keys.map(
                function(key) {

                  if (
                    key !== CACHE_NAME
                  ) {

                    return caches.delete(
                      key
                    );

                  }

                }
              )

            );

          }
        )
        .then(
          function() {

            return self.clients.claim();

          }
        )

    );

  }
);


/* =========================================================
   FETCH

   Strategy:

   ONLINE:
   1. Get newest GitHub version.
   2. Save it locally.
   3. Return it.

   OFFLINE:
   1. Return last cached successful version.

   This applies to HTML, CSS, JS, JSON and images.
   ========================================================= */

self.addEventListener(
  "fetch",
  function(event) {

    const request =
      event.request;


    if (
      request.method !== "GET"
    ) {

      return;

    }


    const url =
      new URL(request.url);


    /*
      Only handle files belonging to this
      GitHub Pages site.
    */

    if (
      url.origin !==
      self.location.origin
    ) {

      return;

    }


    const cacheKey =
      getCacheKey(request);


    event.respondWith(

      fetch(
        new Request(
          request,
          {
            cache: "no-store"
          }
        )
      )

        .then(
          function(networkResponse) {

            if (
              networkResponse &&
              networkResponse.ok
            ) {

              const responseCopy =
                networkResponse.clone();


              caches
                .open(CACHE_NAME)
                .then(
                  function(cache) {

                    cache.put(
                      cacheKey,
                      responseCopy
                    );

                  }
                );

            }


            return networkResponse;

          }
        )

        .catch(
          async function() {

            const cached =
              await caches.match(
                cacheKey
              );


            if (cached) {

              return cached;

            }


            /*
              If an HTML navigation somehow
              has not been cached yet, return
              a simple black offline page.
            */

            if (
              request.mode ===
              "navigate"
            ) {

              return new Response(
                `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <style>
                    html, body {
                      margin: 0;
                      width: 100%;
                      height: 100%;
                      background: black;
                    }
                  </style>
                </head>
                <body></body>
                </html>
                `,
                {
                  headers: {
                    "Content-Type":
                      "text/html"
                  }
                }
              );

            }


            return new Response(
              "",
              {
                status: 503,
                statusText: "Offline"
              }
            );

          }
        )

    );

  }
);
