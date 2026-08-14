/* Register the service worker (progressive enhancement only) */
if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {
      /* offline support unavailable; page still works normally */
    });
  });
}
