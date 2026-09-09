const DISPLAY_CONFIG = {

  timeZone:
    "Australia/Sydney",

  /*
    TEST:
    black from 14:25 until 14:40

    Later restore to:
    21:00 -> 09:00
  */

  blackFromHour: 14,
  blackFromMinute: 25,

  blackUntilHour: 14,
  blackUntilMinute: 40,

  /*
    Check every 10 seconds.
  */

  checkIntervalMs: 10000
};


function getSydneyTimeParts() {

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
    ).formatToParts(
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


function updateScreensaver() {

  const now =
    getSydneyTimeParts();


  const currentMinutes =
    now.hour * 60 +
    now.minute;


  const startMinutes =
    DISPLAY_CONFIG.blackFromHour * 60 +
    DISPLAY_CONFIG.blackFromMinute;


  const endMinutes =
    DISPLAY_CONFIG.blackUntilHour * 60 +
    DISPLAY_CONFIG.blackUntilMinute;


  let shouldBeBlack = false;


  /*
    Same-day window.

    Example:
    14:25 -> 14:40
  */

  if (
    startMinutes <
    endMinutes
  ) {

    shouldBeBlack =
      currentMinutes >= startMinutes &&
      currentMinutes < endMinutes;

  }


  /*
    Overnight window.

    Example:
    21:00 -> 09:00
  */

  else if (
    startMinutes >
    endMinutes
  ) {

    shouldBeBlack =
      currentMinutes >= startMinutes ||
      currentMinutes < endMinutes;

  }


  /*
    Same start/end means disabled rather
    than blacking out for 24 hours.
  */

  else {

    shouldBeBlack = false;

  }


  document.body.classList.toggle(
    "screensaver-active",
    shouldBeBlack
  );


  console.log(
    "Sydney:",
    now.hour + ":" +
    String(now.minute).padStart(2, "0"),
    "Screensaver:",
    shouldBeBlack
  );

}


updateScreensaver();


setInterval(
  updateScreensaver,
  DISPLAY_CONFIG.checkIntervalMs
);
