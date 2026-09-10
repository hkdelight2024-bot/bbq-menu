/* =========================================================
   HK DELIGHT SHARED DISPLAY ENGINE
   ========================================================= */


/* =========================================================
   DEFAULT SETTINGS

   Used until display-config.json is successfully loaded.
   ========================================================= */

var DISPLAY_CONFIG = {

  timeZone:
    "Australia/Sydney",

  blackFromHour:
    21,

  blackFromMinute:
    0,

  blackUntilHour:
    9,

  blackUntilMinute:
    0,

  configRefreshMs:
    60000,

  timeCheckMs:
    10000,

  siteVersionRefreshMs:
    60000

};


/* =========================================================
   STATE
   ========================================================= */

var configTimer = null;

var clockTimer = null;

var versionTimer = null;

var reloadInProgress = false;


/* =========================================================
   VALIDATION HELPERS
   ========================================================= */

function validNumber(
  value,
  minimum,
  maximum
) {

  return (
    typeof value === "number" &&
    isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );

}


function validateConfig(
  config
) {

  if (
    !config ||
    typeof config !== "object"
  ) {

    return false;

  }


  if (
    typeof config.timeZone !==
    "string"
  ) {

    return false;

  }


  if (
    !validNumber(
      config.blackFromHour,
      0,
      23
    )
  ) {

    return false;

  }


  if (
    !validNumber(
      config.blackFromMinute,
      0,
      59
    )
  ) {

    return false;

  }


  if (
    !validNumber(
      config.blackUntilHour,
      0,
      23
    )
  ) {

    return false;

  }


  if (
    !validNumber(
      config.blackUntilMinute,
      0,
      59
    )
  ) {

    return false;

  }


  return true;

}


/* =========================================================
   GET DISPLAY TIME

   Australia/Sydney handles daylight saving automatically.

   If the TV browser doesn't support timezone formatting,
   fall back to the TV's own local clock.
   ========================================================= */

function getDisplayTime() {

  try {

    var parts =
      new Intl.DateTimeFormat(
        "en-AU",
        {
          timeZone:
            DISPLAY_CONFIG.timeZone,

          hour:
            "2-digit",

          minute:
            "2-digit",

          hourCycle:
            "h23"
        }
      )
      .formatToParts(
        new Date()
      );


    var hour = 0;

    var minute = 0;


    for (
      var i = 0;
      i < parts.length;
      i++
    ) {

      if (
        parts[i].type ===
        "hour"
      ) {

        hour =
          Number(
            parts[i].value
          );

      }


      if (
        parts[i].type ===
        "minute"
      ) {

        minute =
          Number(
            parts[i].value
          );

      }

    }


    return {

      hour:
        hour,

      minute:
        minute

    };

  }

  catch (error) {

    var now =
      new Date();


    return {

      hour:
        now.getHours(),

      minute:
        now.getMinutes()

    };

  }

}


/* =========================================================
   SHOULD THE SCREEN BE BLACK?
   ========================================================= */

function shouldScreenBeBlack() {

  var now =
    getDisplayTime();


  var currentMinutes =
    now.hour * 60 +
    now.minute;


  var startMinutes =
    DISPLAY_CONFIG.blackFromHour * 60 +
    DISPLAY_CONFIG.blackFromMinute;


  var endMinutes =
    DISPLAY_CONFIG.blackUntilHour * 60 +
    DISPLAY_CONFIG.blackUntilMinute;


  /*
    Same-day window.

    Example:
    14:00 -> 16:00
  */

  if (
    startMinutes <
    endMinutes
  ) {

    return (
      currentMinutes >= startMinutes &&
      currentMinutes < endMinutes
    );

  }


  /*
    Overnight window.

    Example:
    21:00 -> 09:00
  */

  if (
    startMinutes >
    endMinutes
  ) {

    return (
      currentMinutes >= startMinutes ||
      currentMinutes < endMinutes
    );

  }


  /*
    Same start/end means blackout disabled.
  */

  return false;

}


/* =========================================================
   APPLY BLACKOUT STATE
   ========================================================= */

function updateScreensaver() {

  var black =
    shouldScreenBeBlack();


  if (black) {

    document.body.classList.add(
      "screensaver-active"
    );

  }

  else {

    document.body.classList.remove(
      "screensaver-active"
    );

  }

}


/* =========================================================
   CLOCK TIMER
   ========================================================= */

function restartClockTimer() {

  if (
    clockTimer
  ) {

    clearInterval(
      clockTimer
    );

  }


  updateScreensaver();


  clockTimer =
    setInterval(
      updateScreensaver,
      DISPLAY_CONFIG.timeCheckMs ||
      10000
    );

}


/* =========================================================
   CONFIG TIMER
   ========================================================= */

function restartConfigTimer() {

  if (
    configTimer
  ) {

    clearInterval(
      configTimer
    );

  }


  configTimer =
    setInterval(
      loadDisplayConfig,
      DISPLAY_CONFIG.configRefreshMs ||
      60000
    );

}


/* =========================================================
   VERSION TIMER
   ========================================================= */

function restartVersionTimer() {

  if (
    versionTimer
  ) {

    clearInterval(
      versionTimer
    );

  }


  versionTimer =
    setInterval(
      checkSiteVersion,
      DISPLAY_CONFIG.siteVersionRefreshMs ||
      60000
    );

}


/* =========================================================
   APPLY REMOTE DISPLAY CONFIG
   ========================================================= */

function applyDisplayConfig(
  config
) {

  if (
    !validateConfig(
      config
    )
  ) {

    console.log(
      "Invalid display-config.json; keeping previous settings."
    );

    return;

  }


  var oldConfigRefresh =
    DISPLAY_CONFIG.configRefreshMs;


  var oldTimeCheck =
    DISPLAY_CONFIG.timeCheckMs;


  var oldVersionRefresh =
    DISPLAY_CONFIG.siteVersionRefreshMs;


  DISPLAY_CONFIG = {

    timeZone:
      config.timeZone,

    blackFromHour:
      config.blackFromHour,

    blackFromMinute:
      config.blackFromMinute,

    blackUntilHour:
      config.blackUntilHour,

    blackUntilMinute:
      config.blackUntilMinute,

    configRefreshMs:
      config.configRefreshMs ||
      60000,

    timeCheckMs:
      config.timeCheckMs ||
      10000,

    siteVersionRefreshMs:
      config.siteVersionRefreshMs ||
      60000

  };


  /*
    Apply changed hours immediately.
  */

  updateScreensaver();


  /*
    Restart clock timer only if its interval changed.
  */

  if (
    oldTimeCheck !==
    DISPLAY_CONFIG.timeCheckMs
  ) {

    restartClockTimer();

  }


  /*
    Restart config polling if its interval changed.
  */

  if (
    oldConfigRefresh !==
    DISPLAY_CONFIG.configRefreshMs
  ) {

    restartConfigTimer();

  }


  /*
    Restart version polling if its interval changed.
  */

  if (
    oldVersionRefresh !==
    DISPLAY_CONFIG.siteVersionRefreshMs
  ) {

    restartVersionTimer();

  }

}


/* =========================================================
   LOAD display-config.json
   ========================================================= */

function loadDisplayConfig() {

  fetch(
    "display-config.json?t=" +
    Date.now(),
    {
      cache:
        "no-store"
    }
  )

  .then(
    function(response) {

      if (
        !response.ok
      ) {

        throw new Error(
          "HTTP " +
          response.status
        );

      }


      return response.json();

    }
  )

  .then(
    function(config) {

      applyDisplayConfig(
        config
      );

    }
  )

  .catch(
    function() {

      /*
        Internet unavailable:
        leave the current configuration running.
      */

      console.log(
        "Display config unavailable; using last-known settings."
      );

    }
  );

}


/* =========================================================
   SITE VERSION STORAGE
   ========================================================= */

function getStoredSiteVersion() {

  try {

    var value =
      localStorage.getItem(
        "hkDelightSiteVersion"
      );


    if (
      value === null
    ) {

      return null;

    }


    var number =
      Number(value);


    if (
      !isFinite(number)
    ) {

      return null;

    }


    return number;

  }

  catch (error) {

    return null;

  }

}


function storeSiteVersion(
  version
) {

  try {

    localStorage.setItem(
      "hkDelightSiteVersion",
      String(version)
    );

  }

  catch (error) {

    /*
      Page still works if storage is unavailable.
    */

  }

}


/* =========================================================
   REMOTE PAGE RELOAD
   ========================================================= */

function reloadWithVersion(
  version
) {

  if (
    reloadInProgress
  ) {

    return;

  }


  reloadInProgress =
    true;


  /*
    Store the new version before reload so
    the page cannot get stuck in a reload loop.
  */

  storeSiteVersion(
    version
  );


  /*
    Give GitHub Pages/CDN 15 seconds to settle
    after site-version.json becomes visible.
  */

  setTimeout(
    function() {

      var url =
        new URL(
          window.location.href
        );


      url.searchParams.set(
        "siteVersion",
        String(version)
      );


      url.searchParams.set(
        "reloadTime",
        String(
          Date.now()
        )
      );


      window.location.replace(
        url.toString()
      );

    },
    15000
  );

}


/* =========================================================
   CHECK site-version.json
   ========================================================= */

function checkSiteVersion() {

  fetch(
    "site-version.json?t=" +
    Date.now(),
    {
      cache:
        "no-store"
    }
  )

  .then(
    function(response) {

      if (
        !response.ok
      ) {

        throw new Error(
          "HTTP " +
          response.status
        );

      }


      return response.json();

    }
  )

  .then(
    function(data) {

      var remoteVersion =
        Number(
          data.version
        );


      if (
        !isFinite(
          remoteVersion
        )
      ) {

        return;

      }


      var storedVersion =
        getStoredSiteVersion();


      /*
        First run on this TV:
        establish baseline without reloading.
      */

      if (
        storedVersion === null
      ) {

        storeSiteVersion(
          remoteVersion
        );

        return;

      }


      /*
        Only reload for a NEWER version.

        This prevents an old cached version file
        from causing the TV to "downgrade" itself
        while offline.
      */

      if (
        remoteVersion >
        storedVersion
      ) {

        reloadWithVersion(
          remoteVersion
        );

      }

    }
  )

  .catch(
    function() {

      /*
        No network / no version file:
        do absolutely nothing.
      */

      console.log(
        "Site version unavailable; keeping current page."
      );

    }
  );

}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

function registerOfflineSupport() {

  if (
    !(
      "serviceWorker" in
      navigator
    )
  ) {

    console.log(
      "Service workers not supported by this browser."
    );

    return;

  }


  navigator.serviceWorker
    .register(
      "service-worker.js"
    )

    .then(
      function() {

        console.log(
          "Offline service worker registered."
        );

      }
    )

    .catch(
      function(error) {

        console.log(
          "Service worker registration failed:",
          error
        );

      }
    );

}


/* =========================================================
   START EVERYTHING
   ========================================================= */

restartClockTimer();


loadDisplayConfig();

restartConfigTimer();


checkSiteVersion();

restartVersionTimer();


registerOfflineSupport();
