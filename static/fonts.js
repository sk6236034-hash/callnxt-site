// The DM Sans font, fetched after the page is on screen: on slow mobile data the page shows straight away
// in the phone's own font instead of waiting for Google Fonts, and switches over when the font arrives.
(function () {
  "use strict";
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap";
  document.head.appendChild(link);
})();
