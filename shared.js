/* =========================================================
   HK DELIGHT SHARED DISPLAY ENGINE
   ========================================================= */


/* ---------------------------------------------------------
   SAFE FALLBACK CONFIG

   Used until display-config.json successfully loads.
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
      Fallback for a very old TV browser.
      Uses the TV's local clock.
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
   SHOULD SCREEN BE BLACK?
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
    Same start/end = disabled.
  */

  return false;

}


/* =========================================================
   APPLY SCREENSAVER
   ========================================================= */

function updateScreensaver() {

  document.body.classList.toggle(
    "screensaver-active",
    shouldScreenBeBlack()
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
   APPLY CONFIG
   ========================================================= */

function applyConfig(
  config
) {

  if (
    !validateConfig(
      config
    )
  ) {

    console.log(
      "Invalid display config. Keeping last-known config."
    );

    return;

  }


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
      10000

  };


  restartClockTimer();

}


/* =========================================================
   LOAD CONFIG

   The timestamp prevents normal browser/CDN caching.

   When offline, the service worker returns the
   last successfully cached display-config.json.
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
      Keep using whatever configuration
      is already running.
    */

    console.log(
      "Display config unavailable. Using last-known config."
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


  configTimer =
    setInterval(
      loadDisplayConfig,
      60000
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

restartClockTimer();

startConfigRefresh();

registerOfflineSupport();
