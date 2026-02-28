/* ============================================================
   SW.JS — Service Worker NutriPlan
   Cache-first per asset statici, network-first per dati.
   CACHE_NAME ora include timestamp per invalidare cache ad ogni deploy.
============================================================ */

var CACHE_VERSION = '20260224-0815'; /* aggiornato automaticamente ad ogni deploy */
var CACHE_NAME = 'nutriplan-v' + CACHE_VERSION;

/* Calcola il base path dinamicamente: funziona sia a root (/sw.js)
   che in sottocartella (/Nutriplan_/sw.js → base '/Nutriplan_') */
var BASE_PATH = self.location.pathname.replace(/\/sw\.js$/, '');

var STATIC_ASSETS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/icon.svg',
  BASE_PATH + '/icon-n.svg',
  BASE_PATH + '/base.css',
  BASE_PATH + '/nav.css',
  BASE_PATH + '/layout.css',
  BASE_PATH + '/components.css',
  BASE_PATH + '/utils.css',
  BASE_PATH + '/style.css',
  BASE_PATH + '/app.js',
  BASE_PATH + '/data.js',
  BASE_PATH + '/storage.js',
  BASE_PATH + '/piano.js',
  BASE_PATH + '/piano_alimentare.js',
  BASE_PATH + '/dispensa.js',
  BASE_PATH + '/ricette.js',
  BASE_PATH + '/ricette_custom.js',
  BASE_PATH + '/spesa.js',
  BASE_PATH + '/storico.js',
  BASE_PATH + '/statistiche.js',
  BASE_PATH + '/profilo.js',
  BASE_PATH + '/pdf.js',
  BASE_PATH + '/tutorial.js',
  BASE_PATH + '/onboarding.js',
  BASE_PATH + '/firebase-config.js',
  BASE_PATH + '/gemini.js'
  /* config.js escluso: generato a runtime da GitHub Actions, non sempre presente */
];

self.addEventListener('install', function(e) {
  console.log('[SW] Install, cache version:', CACHE_NAME);
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(
        STATIC_ASSETS.map(function(url) {
          return cache.add(url).catch(function() { /* ignora errori singoli */ });
        })
      );
    }).then(function() { self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  console.log('[SW] Activate, cleaning old caches (keeping ' + CACHE_NAME + ')');
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME && k.startsWith('nutriplan-v'); })
            .map(function(k) { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
      .then(function() {
        /* Forza reload di tutte le tab aperte per caricare la nuova versione */
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then(function(clients) {
        clients.forEach(function(client) {
          if (client.url && client.navigate) client.navigate(client.url);
        });
      })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;

  /* Bypassa: Firebase, Gemini, Google Fonts, CDN, blob: */
  if (url.includes('firebase') || url.includes('generativelanguage') ||
      url.includes('fonts.googleapis') || url.includes('fonts.gstatic') ||
      url.includes('unpkg.com') || url.startsWith('blob:') ||
      url.includes('gstatic.com/firebasejs')) {
    return;
  }

  /* index.html e gemini.js sempre dalla rete (con fallback cache se offline) */
  if (url.includes('/index.html') || url.includes('/gemini.js')) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  /* Resto: cache-first con update in background */
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetchPromise = fetch(e.request).then(function(res) {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      });
      return cached || fetchPromise.catch(function() {
        /* Offline fallback: ritorna index.html per navigazione */
        if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
          return caches.match(BASE_PATH + '/index.html');
        }
      });
    })
  );
});
