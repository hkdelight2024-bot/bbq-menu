/* =========================================================
   HK DELIGHT SHARED DISPLAY ENGINE
   ========================================================= */


/* ---------------------------------------------------------
   SAFE DEFAULTS

   These are only used before display-config.json loads
   or if it has never successfully loaded.
   --------------------------------------------------------- */

let DISPLAY_CONFIG = {

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
    10000

};



let configTimer = null;

let clockTimer = null;



/* =========================================================
   VALIDATION
   ========================================================= */

function validNumber(
  value,
  minimum,
  maximum
) {

  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );

}



function validateConfig(
  incoming
) {

  if (
    !incoming ||
    typeof incoming !== "object"
  ) {

    return false;

  }


  if (
    typeof incoming.timeZone
    !== "string"
  ) {

    return false;

  }


  if (
    !validNumber(
      incoming.blackFromHour,
      0,
      23
    )
  ) {

    return false;

  }


  if (
    !validNumber(
      incoming.blackFromMinute,
      0,
      59
    )
  ) {

    return false;

  }


  if (
    !validNumber(
      incoming.blackUntilHour,
      0,
      23
    )
  ) {

    return false;

  }


  if (
    !validNumber(
      incoming.blackUntilMinute,
      0,
      59
    )
  ) {

    return false;

  }


  return true;

}



/* =========================================================
   GET SYDNEY / CONFIGURED LOCAL TIME
   ========================================================= */

function getDisplayTime() {

  try {

    const parts =
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


    let hour = 0;

    let minute = 0;


    for (
      let i = 0;
      i < parts.length;
      i++
    ) {

      if (
        parts[i].type === "hour"
      ) {

        hour =
          Number(
            parts[i].value
          );

      }


      if (
        parts[i].type === "minute"
      ) {

        minute =
          Number(
            parts[i].value
          );

      }

    }


    return {
      hour: hour,
      minute: minute
    };

  }

  catch (error) {

    /*
      Very old browser fallback:
      use the device's local clock.
    */

    const now =
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
   DETERMINE WHETHER SCREEN SHOULD BE BLACK
   ========================================================= */

function shouldScreenBeBlack() {

  const now =
    getDisplayTime();


  const currentMinutes =
    now.hour * 60 +
    now.minute;


  const startMinutes =
    DISPLAY_CONFIG.blackFromHour * 60 +
    DISPLAY_CONFIG.blackFromMinute;


  const endMinutes =
    DISPLAY_CONFIG.blackUntilHour * 60 +
    DISPLAY_CONFIG.blackUntilMinute;



  /*
    Example:

    14:00 -> 16:00

    same-day window
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
    Example:

    21:00 -> 09:00

    crosses midnight
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
    Same start and finish means
    screensaver is disabled.
  */

  return false;

}



/* =========================================================
   APPLY SCREENSAVER STATE
   ========================================================= */

function updateScreensaver() {

  const black =
    shouldScreenBeBlack();


  document.body.classList.toggle(
    "screensaver-active",
    black
  );

}



/* =========================================================
   CLOCK TIMER
   ========================================================= */

function restartClockTimer() {

  if (clockTimer) {

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
   APPLY NEW CONFIG
   ========================================================= */

function applyConfig(
  incoming
) {

  if (
    !validateConfig(
      incoming
    )
  ) {

    console.log(
      "Invalid display-config.json; keeping previous config."
    );

    return;

  }


  DISPLAY_CONFIG = {

    timeZone:
      incoming.timeZone,


    blackFromHour:
      incoming.blackFromHour,


    blackFromMinute:
      incoming.blackFromMinute,


    blackUntilHour:
      incoming.blackUntilHour,


    blackUntilMinute:
      incoming.blackUntilMinute,


    configRefreshMs:
      incoming.configRefreshMs ||
      60000,


    timeCheckMs:
      incoming.timeCheckMs ||
      10000

  };


  restartClockTimer();

}



/* =========================================================
   LOAD LATEST CONFIG

   Timestamp defeats normal browser/CDN caching.

   If offline, the service worker returns the
   last successfully cached version instead.
   ========================================================= */

async function loadDisplayConfig() {

  try {

    const response =
      await fetch(
        "display-config.json?t=" +
        Date.now(),
        {
          cache:
            "no-store"
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    const config =
      await response.json();


    applyConfig(
      config
    );

  }

  catch (error) {

    /*
      Keep using whatever config is already
      loaded if internet disappears.
    */

    console.log(
      "Display config unavailable; using last-known config."
    );

  }

}



/* =========================================================
   CONFIG REFRESH LOOP
   ========================================================= */

function startConfigRefresh() {

  loadDisplayConfig();


  if (configTimer) {

    clearInterval(
      configTimer
    );

  }


  /*
    Use 60 seconds as the stable polling
    interval. The JSON can change its own
    timeCheckMs independently.
  */

  configTimer =
    setInterval(
      loadDisplayConfig,
      60000
    );

}



/* =========================================================
   REGISTER SERVICE WORKER
   ========================================================= */

function registerOfflineSupport() {

  if (
    !(
      "serviceWorker"
      in navigator
    )
  ) {

    return;

  }


  navigator
    .serviceWorker
    .register(
      "service-worker.js"
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
   START
   ========================================================= */

updateScreensaver();

startConfigRefresh();

registerOfflineSupport();
