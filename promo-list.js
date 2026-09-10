/* =========================================================
   HK DELIGHT PROMOTION ROSTER
   =========================================================

   Using "var" deliberately.

   The currently-running promo page periodically reloads
   this file. "var" can be safely declared again, unlike
   a top-level "const".

   Missing image files are skipped by promo.html.
   ========================================================= */

var PROMO_CONFIG = {

  /* 30 seconds per promotion */
  slideDurationMs: 30000,

  /* Check this roster every 5 minutes */
  rosterRefreshMs: 300000,

  images: [

    "images/curry.jpg",

    "images/promo-02.png",

    "images/promo-03.png",

    "images/promo-04.png"

  ]

};
