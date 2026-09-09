const CACHE_NAME =
  "hk-delight-menu-v2";


const CORE_FILES = [

  "./bbq.html",

  "./lunchbox.html",

  "./promo.html",

  "./shared.css",

  "./shared.js",

  "./display-config.json",

  "./menu-data.json",

  "./promo-list.js",

  "./images/bbq-strip.png",

  "./images/lunch-strip.png",

  "./images/curry.jpg"

];



/* =========================================================
   REMOVE CACHE-BUST QUERY PARAMETERS
   ========================================================= */

function getCacheKey(
  request
) {

  const url =
    new URL(
      request.url
    );


  url.search =
    "";


  return new Request(
    url.toString(),
    {
      method:
        "GET"
    }
  );

}



/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
  "install",
  function(event) {

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )
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
                      cache:
                        "no-store"
                    }
                  );


                if (
                  response.ok
                ) {

                  await cache.put(
                    CORE_FILES[i],
                    response
                  );

                }

              }

              catch (error) {

                /*
                  One missing optional asset
                  should not prevent the
                  service worker installing.
                */

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
                    key !==
                    CACHE_NAME
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
   NETWORK FIRST / CACHE FALLBACK
   ========================================================= */

self.addEventListener(
  "fetch",
  function(event) {

    const request =
      event.request;


    if (
      request.method !==
      "GET"
    ) {

      return;

    }


    const url =
      new URL(
        request.url
      );


    if (
      url.origin !==
      self.location.origin
    ) {

      return;

    }


    const cacheKey =
      getCacheKey(
        request
      );


    event.respondWith(

      fetch(
        new Request(
          request,
          {
            cache:
              "no-store"
          }
        )
      )

      .then(
        function(response) {

          if (
            response &&
            response.ok
          ) {

            const copy =
              response.clone();


            caches
              .open(
                CACHE_NAME
              )
              .then(
                function(cache) {

                  cache.put(
                    cacheKey,
                    copy
                  );

                }
              );

          }


          return response;

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
              html,
              body {
                width:100%;
                height:100%;
                margin:0;
                background:#000;
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
              status:
                503,

              statusText:
                "Offline"
            }
          );

        }
      )

    );

  }
);
