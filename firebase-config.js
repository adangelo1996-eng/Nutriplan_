/* ============================================================
   NUTRIPLAN — firebase-config.js
   Responsabilità:
   - Inizializzazione Firebase (con guard doppia init)
   - Auth Google (login / logout)
   - Cloud status UI (classi CSS corrette)
   - Auth UI (pill utente, bottoni login/logout)
   - Espone: firebaseReady, currentUser, initFirebase,
             signInWithGoogle, signOut, showCloudStatus
============================================================ */

/* ── CONFIGURAZIONE ────────────────────────────────────────
   La config viene iniettata da config.js:
   - In produzione (GitHub Pages): generato da GitHub Actions via Secrets.
   - In sviluppo locale: copia config.example.js → config.js con le tue chiavi.
   Il SDK Firebase è caricato dal CDN pubblico gstatic.com (index.html).
────────────────────────────────────────────────────────── */
var _rawCfg = (window.APP_CONFIG && window.APP_CONFIG.firebase) || null;
/* Valida: scarta la config se apiKey è vuota o contiene placeholder */
var firebaseConfig = (_rawCfg && _rawCfg.apiKey &&
                      _rawCfg.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
                      _rawCfg.apiKey.length > 10)
                     ? _rawCfg : null;

/* ── VARIABILI GLOBALI (usate da storage.js e app.js) ───── */
var firebaseReady = false;
var currentUser   = null;

/* Guard: evita registrazioni multiple di onAuthStateChanged */
var _authListenerRegistered = false;
/* Timer fallback: mostra i bottoni landing se Firebase non risponde */
var _landingFallbackTimer   = null;

/* ============================================================
   INIT
   Chiamata da enterApp() in app.js dopo che l'utente
   clicca "Inizia" dalla landing page.
============================================================ */
function initFirebase() {

  /* Verifica che l'SDK sia caricato */
  if (typeof firebase === 'undefined') {
    console.warn('[NutriPlan] SDK Firebase non trovato. ' +
      'Verifica che gli <script> CDN siano nel <head>.');
    firebaseReady = false;
    showCloudStatus('local');
    /* FIX: sblocca i bottoni landing invece di restare bloccato sullo spinner */
    if (typeof updateAuthUI === 'function') updateAuthUI(null);
    return;
  }

  try {
    /* Evita doppia inizializzazione.
       /__/firebase/init.js (caricato in <head>) inizializza già l'app in produzione:
       firebase.apps.length > 0 → saltiamo initializeApp.
       In sviluppo locale con config.js presente, inizializziamo qui. */
    if (!firebase.apps || firebase.apps.length === 0) {
      if (!firebaseConfig) {
        /* Né /__/firebase/init.js né config.js hanno fornito la config */
        console.warn('[NutriPlan] Nessuna configurazione Firebase trovata. ' +
          'In produzione usa Firebase Hosting; in sviluppo crea config.js da config.example.js.');
        firebaseReady = false;
        showCloudStatus('local');
        if (typeof updateAuthUI === 'function') updateAuthUI(null);
        return;
      }
      firebase.initializeApp(firebaseConfig);
    }

    firebaseReady = true;

    /* FIX: registra il listener UNA SOLA VOLTA, evitando loop da chiamate multiple
       (DOMContentLoaded + landingSignIn + enterApp registravano listener duplicati) */
    if (_authListenerRegistered) return;
    _authListenerRegistered = true;

    /* Fallback: se onAuthStateChanged non risponde entro 8s, sblocca i bottoni */
    _landingFallbackTimer = setTimeout(function() {
      var landing = document.getElementById('landingPage');
      if (landing && landing.style.display !== 'none') {
        console.warn('[NutriPlan] Firebase timeout — mostro i bottoni landing.');
        if (typeof updateAuthUI === 'function') updateAuthUI(null);
      }
    }, 8000);

    /* Listener auth state — si attiva ad ogni cambio utente */
    firebase.auth().onAuthStateChanged(function(user) {
      clearTimeout(_landingFallbackTimer);
      currentUser = user || null;

      if (user) {
        showCloudStatus('saving');
        updateAuthUI(user);
        if (typeof renderProfilo === 'function')  renderProfilo();
        if (typeof loadFromCloud === 'function')  loadFromCloud(user.uid);

        /* Accesso rilevato: NON entrare automaticamente; resta sulla homepage con le card di selezione.
           Se l'utente ha fatto login esplicitamente (es. click su Google), enterApp() viene chiamata
           dal then() di signInWithPopup in signInWithGoogle(). */
      } else {
        currentUser = null;
        showCloudStatus('local');
        updateAuthUI(null);
        if (typeof renderProfilo === 'function')  renderProfilo();
      }
    });

    console.info('[NutriPlan] Firebase pronto.');

  } catch (e) {
    console.error('[NutriPlan] Firebase init error:', e);
    firebaseReady = false;
    showCloudStatus('local');
    /* FIX: sblocca i bottoni landing in caso di errore */
    if (typeof updateAuthUI === 'function') updateAuthUI(null);
  }
}

/* ============================================================
   AUTH — login con Google
============================================================ */
function signInWithGoogle() {
  if (!firebaseReady) {
    /* Usa showToast se disponibile, altrimenti fallback */
    if (typeof showToast === 'function') {
      showToast('⚠️ Firebase non disponibile. Ricarica la pagina.', 'warning');
    } else {
      alert('Firebase non disponibile. Ricarica la pagina.');
    }
    return;
  }

  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  firebase.auth()
    .signInWithPopup(provider)
    .then(function(result) {
      if (typeof closeAuthModal === 'function') closeAuthModal();

      var name = result.user.displayName || result.user.email || 'Utente';
      if (typeof showToast === 'function') showToast('👋 Benvenuto, ' + name + '!', 'success');

      /* Se la landing è ancora visibile, entra nell'app */
      var landing = document.getElementById('landingPage');
      if (landing && landing.style.display !== 'none' && typeof enterApp === 'function') {
        if (typeof window !== 'undefined') window.NP_READONLY = false;
        enterApp();
      }
    })
    .catch(function(e) {
      console.warn('[NutriPlan] Errore login:', e);

      /* Errori che l'utente ha causato intenzionalmente → ignora silenziosamente */
      if (e.code === 'auth/popup-closed-by-user' ||
          e.code === 'auth/cancelled-popup-request') {
        return;
      }

      if (typeof showToast === 'function') {
        showToast('✗ Errore di accesso: ' + (e.message || e), 'error');
      } else {
        alert('Errore di accesso: ' + (e.message || e));
      }
    });
}

/* ============================================================
   AUTH — logout
============================================================ */
function signOut() {
  if (!firebaseReady) return;
  /* Apre modal di conferma disconnessione invece del confirm nativo */
  var modal = document.getElementById('confirmLogoutModal');
  if (modal) {
    modal.classList.add('active');
  } else {
    /* Fallback se il modal non è in pagina */
    executeSignOut();
  }
}

function closeConfirmLogoutModal() {
  var modal = document.getElementById('confirmLogoutModal');
  if (modal) modal.classList.remove('active');
}

function executeSignOut() {
  closeConfirmLogoutModal();
  if (!firebaseReady) return;
  firebase.auth().signOut()
    .then(function() {
      currentUser = null;
      showCloudStatus('local');
      updateAuthUI(null);
      if (typeof closeAuthModal === 'function') closeAuthModal();
      if (typeof renderProfilo  === 'function') renderProfilo();
      if (typeof showToast      === 'function') showToast('👋 Disconnesso', 'info');
    })
    .catch(function(e) {
      console.warn('[NutriPlan] Errore logout:', e);
      if (typeof showToast === 'function') showToast('✗ Errore disconnessione', 'error');
    });
}

/* ============================================================
   UI — cloud status badge
   FIX: classi senza prefisso "cloud-" → coincidono con CSS
        .cloud-status.local / .saving / .synced / .error
============================================================ */
function showCloudStatus(status) {
  var el = document.getElementById('cloudStatus');
  if (!el) return;

  var cfg = {
    local:  { text: '☁ Locale',           cls: 'local'  },
    saving: { text: '⏳ Salvataggio...',   cls: 'saving' },
    synced: { text: '✓ Sincronizzato',     cls: 'synced' },
    error:  { text: '⚠️ Errore sync',      cls: 'error'  }
  };

  var c = cfg[status] || cfg.local;
  el.textContent = c.text;
  /* FIX chiave: "cloud-status local" invece di "cloud-status cloud-local" */
  el.className = 'cloud-status ' + c.cls;
}

/* ============================================================
   UI — pill utente + bottoni login/logout
============================================================ */
function updateAuthUI(user) {
  var loginBtn   = document.getElementById('loginBtn');
  var pill       = document.getElementById('authUserPill');
  var avatar     = document.getElementById('authAvatar');
  var nameEl     = document.getElementById('authName');

  if (loginBtn) {
    if (user) {
      if (pill) {
        pill.style.display = '';
        if (avatar) {
          if (user.photoURL) { avatar.src = user.photoURL; avatar.style.display = ''; }
          else { avatar.style.display = 'none'; }
        }
        if (nameEl) {
          nameEl.textContent = user.displayName
            ? user.displayName.split(' ')[0]
            : (user.email || 'Utente');
        }
      }
      loginBtn.style.display = 'none';
    } else {
      if (pill) pill.style.display = 'none';
      loginBtn.style.display = '';
      loginBtn.title = 'Accedi';
    }
  }

  /* Aggiorna CTA della landing in base allo stato auth (elementi nascosti per modale) */
  var landingLoading = document.getElementById('landingAuthLoading');
  var landingGoogle  = document.getElementById('landingGoogleBtn');
  var landingOffline = document.getElementById('landingOfflineBtn');
  var landingAccediWrap = document.getElementById('landingAccediWrap');

  if (user) {
    if (landingLoading)     landingLoading.style.display = 'none';
    if (landingGoogle)      landingGoogle.style.display  = 'none';
    if (landingOffline)     landingOffline.style.display = 'none';
    if (landingAccediWrap)  landingAccediWrap.style.display = 'none';
  } else {
    if (landingLoading)     landingLoading.style.display = 'none';
    if (landingGoogle)      landingGoogle.style.display  = 'none';
    if (landingOffline)     landingOffline.style.display = 'none';
    if (landingAccediWrap)  landingAccediWrap.style.display = '';
  }

  /* Aggiorna icona profilo nel nav (bottom + sidebar) quando loggato */
  _updateNavProfiloIcon(user);
}

function _updateNavProfiloIcon(user) {
  /* Aggiorna sia il tab del bottom nav che il sidebar */
  ['bn-profilo', 'st-profilo'].forEach(function(id) {
    var tab = document.getElementById(id);
    if (!tab) return;
    var iconEl = tab.querySelector('.nav-icon, .nav-tab-icon, [data-nav-icon]');
    if (!iconEl) {
      /* cerca il primo element figlio che contiene testo emoji */
      var spans = tab.querySelectorAll('span');
      for (var i = 0; i < spans.length; i++) {
        if (/👤/.test(spans[i].textContent)) { iconEl = spans[i]; break; }
      }
    }
    if (user && user.photoURL) {
      /* Sostituisce icona con foto */
      var img = tab.querySelector('.nav-avatar');
      if (!img) {
        img = document.createElement('img');
        img.className = 'nav-avatar';
        img.alt = 'Profilo';
        if (iconEl) iconEl.innerHTML = '';
        if (iconEl) iconEl.appendChild(img);
      }
      img.src = user.photoURL;
      img.onerror = function() { img.style.display = 'none'; };
    } else {
      /* Ripristina icona emoji */
      var existingImg = tab.querySelector('.nav-avatar');
      if (existingImg) existingImg.remove();
      if (iconEl && !iconEl.querySelector('.nav-avatar')) iconEl.textContent = '👤';
    }
  });
}

/* ============================================================
   HELPERS — aprire/chiudere modale auth
============================================================ */
function openAuthModal() {
  var m = document.getElementById('authModal');
  if (m) m.classList.add('active');
}

function closeAuthModal() {
  var m = document.getElementById('authModal');
  if (m) m.classList.remove('active');
}
