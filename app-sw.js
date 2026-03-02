/* ============================================================
   APP-SW.JS — Registrazione Service Worker (PWA)
============================================================ */
if ('serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.protocol === 'http:')) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js?v=__BUILD_TIME__').then(function(reg) {
      function checkUpdate() {
        if (reg && typeof reg.update === 'function') reg.update();
      }
      checkUpdate();
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') checkUpdate();
      });
      setInterval(checkUpdate, 5 * 60 * 1000);
    }).catch(function(e) {
      console.warn('[NutriPlan] SW registration failed:', e);
    });
  });
} else {
  console.info('[NutriPlan] Service Worker disattivato (protocollo: ' + location.protocol + ')');
}
