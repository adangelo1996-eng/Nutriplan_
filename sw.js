/* ============================================================
   SW.JS — Service Worker NutriPlan
   Cache-first per asset statici, network-first per dati.
============================================================ */

var CACHE_NAME = 'nutriplan-v2';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/base.css',
  '/nav.css',
  '/layout.css',
  '/components.css',
  '/utils.css',
  '/style.css',
  '/app.js',
  '/data.js',
  '/storage.js',
  '/piano.js',
  '/piano_alimentare.js',
  '/dispensa.js',
  '/ricette.js',
  '/ricette_custom.js',
  '/spesa.js',
  '/storico.js',
  '/statistiche.js',
  '/profilo.js',
  '/pdf.js',
  '/tutorial.js',
  '/onboarding.js',
  '/gemini.js',
  '/firebase-config.js',
  '/config.js'
];

self.addEventListener('install', function(e) {
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
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { self.clients.claim(); })
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

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        /* Offline fallback: ritorna index.html per navigazione */
        if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
