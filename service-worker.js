/* =========================================================
   HK DELIGHT OFFLINE SERVICE WORKER
   ========================================================= */


/*
  Change this name when we deliberately make
  a major service-worker/cache revision.
*/

var CACHE_NAME =
  "hk-delight-menu-v4";


/*
  Essential files that should be cached as soon
  as this service worker installs.

  Extra promo images are cached automatically
  when promo.html requests them.
*/

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


/* =========================================================
   CACHE KEY

   Removes cache-busting query strings.

   Example:

   display-config.json?t=123
   display-config.json?t=456

   both use the same cached object.
   ========================================================= */

function getCacheKey(
  request
) {

  var url =
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
          function(cache) {

            var jobs = [];


            for (
              var i = 0;
              i < CORE_FILES.length;
              i++
            ) {

              (
                function(file) {

                  var job =
                    fetch(
                      file,
                      {
                        cache:
                          "no-store"
                      }
                    )

                    .then(
                      function(response) {

                        if (
                          response &&
                          response.ok
                        ) {

                          return cache.put(
                            file,
                            response.clone()
                          );

                        }

                      }
                    )

                    .catch(
                      function() {

                        /*
                          One unavailable file should not
                          prevent the service worker from
                          installing.
                        */

                      }
                    );


                  jobs.push(
                    job
                  );

                }
              )(
                CORE_FILES[i]
              );

            }


            return Promise.all(
              jobs
            );

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

            var deletions =
              [];


            for (
              var i = 0;
              i < keys.length;
              i++
            ) {

              if (
                keys[i] !==
                CACHE_NAME
              ) {

                deletions.push(
                  caches.delete(
                    keys[i]
                  )
                );

              }

            }


            return Promise.all(
              deletions
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
   FETCH STRATEGY

   NETWORK FIRST

   ONLINE:
   - request newest GitHub Pages resource
   - return it
   - save successful result to cache

   OFFLINE:
   - return last successfully cached resource

   This works for:
   - HTML
   - CSS
   - JS
   - JSON
   - footer images
   - newly-added promo PNGs
   ========================================================= */

self.addEventListener(
  "fetch",
  function(event) {

    var request =
      event.request;


    /*
      Only GET requests can be cached this way.
    */

    if (
      request.method !==
      "GET"
    ) {

      return;

    }


    var url =
      new URL(
        request.url
      );


    /*
      Do not interfere with other websites.
    */

    if (
      url.origin !==
      self.location.origin
    ) {

      return;

    }


    var cacheKey =
      getCacheKey(
        request
      );


    event.respondWith(

      fetch(
        request,
        {
          cache:
            "no-store"
        }
      )

      .then(
        function(networkResponse) {

          if (
            networkResponse &&
            networkResponse.ok
          ) {

            var copy =
              networkResponse.clone();


            caches
              .open(
                CACHE_NAME
              )

              .then(
                function(cache) {

                  return cache.put(
                    cacheKey,
                    copy
                  );

                }
              )

              .catch(
                function() {

                }
              );

          }


          return networkResponse;

        }
      )

      .catch(
        function() {

          return caches
            .match(
              cacheKey
            )

            .then(
              function(cachedResponse) {

                if (
                  cachedResponse
                ) {

                  return cachedResponse;

                }


                /*
                  If an HTML page has never been cached
                  and we're offline, show black rather
                  than a browser error page.
                */

                if (
                  request.mode ===
                  "navigate"
                ) {

                  return new Response(
                    [
                      "<!DOCTYPE html>",
                      "<html>",
                      "<head>",
                      '<meta charset="UTF-8">',
                      "<style>",
                      "html,body{",
                      "width:100%;",
                      "height:100%;",
                      "margin:0;",
                      "padding:0;",
                      "background:#000;",
                      "overflow:hidden;",
                      "}",
                      "</style>",
                      "</head>",
                      "<body></body>",
                      "</html>"
                    ].join(
                      ""
                    ),
                    {
                      status:
                        200,

                      headers: {
                        "Content-Type":
                          "text/html; charset=UTF-8"
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
            );

        }
      )

    );

  }
);
