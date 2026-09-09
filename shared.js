const DISPLAY_CONFIG = {
  timeZone: "Australia/Sydney",

  // Black screen starts at 9:00 PM
  blackFromHour: 21,
  blackFromMinute: 0,

  // Menu returns at 9:00 AM
  blackUntilHour: 9,
  blackUntilMinute: 0,

  // Recheck every 30 seconds
  checkIntervalMs: 30000
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
    hour,
    minute
  };
}


function updateScreensaver() {

  const now =
    getSydneyTimeParts();


  const currentMinutes =
    now.hour * 60 +
    now.minute;


  const blackFromMinutes =
    DISPLAY_CONFIG.blackFromHour * 60 +
    DISPLAY_CONFIG.blackFromMinute;


  const blackUntilMinutes =
    DISPLAY_CONFIG.blackUntilHour * 60 +
    DISPLAY_CONFIG.blackUntilMinute;


  /*
    This handles schedules that cross midnight.

    Example:
    black from 21:00
    until 09:00
  */

  let shouldBeBlack;


  if (
    blackFromMinutes >
    blackUntilMinutes
  ) {

    shouldBeBlack =
      currentMinutes >=
        blackFromMinutes
      ||
      currentMinutes <
        blackUntilMinutes;

  }

  else {

    shouldBeBlack =
      currentMinutes >=
        blackFromMinutes
      &&
      currentMinutes <
        blackUntilMinutes;

  }


  document.body.classList.toggle(
    "screensaver-active",
    shouldBeBlack
  );

}


updateScreensaver();


setInterval(
  updateScreensaver,
  DISPLAY_CONFIG.checkIntervalMs
);
