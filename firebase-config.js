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

/* ── CONFIGURAZIONE — caricata da config.js (gitignored) ── */
var firebaseConfig = (window.APP_CONFIG && window.APP_CONFIG.firebase) || {};

/* ── VARIABILI GLOBALI (usate da storage.js e app.js) ───── */
var firebaseReady = false;
var currentUser   = null;

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
    return;
  }

  try {
    /* Evita doppia inizializzazione */
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }

    firebaseReady = true;

    /* Listener auth state — si attiva ad ogni cambio utente */
    firebase.auth().onAuthStateChanged(function(user) {
      currentUser = user || null;

      if (user) {
        showCloudStatus('saving');
        updateAuthUI(user);
        if (typeof renderProfilo === 'function')  renderProfilo();
        if (typeof loadFromCloud === 'function')  loadFromCloud(user.uid);

        /* Auto-redirect: se la landing è visibile, entra nell'app dopo breve pausa */
        var landing = document.getElementById('landingPage');
        if (landing && landing.style.display !== 'none') {
          /* Mostra spinner di caricamento e poi entra automaticamente */
          var loadEl = document.getElementById('landingAuthLoading');
          if (loadEl) {
            loadEl.style.display = 'flex';
            loadEl.innerHTML = '<span class="landing-auth-spinner"></span> Accesso rilevato, entro…';
          }
          setTimeout(function() {
            var stillOnLanding = document.getElementById('landingPage');
            if (stillOnLanding && stillOnLanding.style.display !== 'none') {
              if (typeof enterApp === 'function') enterApp();
            }
          }, 1500);
        }
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
  var logoutBtn  = document.getElementById('logoutBtn');
  var pill       = document.getElementById('authUserPill');
  var avatar     = document.getElementById('authAvatar');
  var nameEl     = document.getElementById('authName');

  if (loginBtn && logoutBtn) {
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
      loginBtn.style.display  = 'none';
      logoutBtn.style.display = '';
      logoutBtn.title = 'Disconnetti (' + (user.displayName || user.email || '') + ')';
    } else {
      if (pill) pill.style.display = 'none';
      loginBtn.style.display  = '';
      logoutBtn.style.display = 'none';
      loginBtn.title = 'Accedi';
    }
  }

  /* Aggiorna CTA della landing in base allo stato auth */
  var landingLoading = document.getElementById('landingAuthLoading');
  var landingGoogle  = document.getElementById('landingGoogleBtn');
  var landingEnter   = document.getElementById('landingEnterBtn');
  var landingOffline = document.getElementById('landingOfflineBtn');

  if (user) {
    /* Con auto-redirect, nasconde tutti i bottoni e mostra solo lo spinner */
    if (landingLoading) {
      landingLoading.style.display = 'flex';
      /* Il testo verrà aggiornato dal listener onAuthStateChanged */
    }
    if (landingGoogle)  landingGoogle.style.display  = 'none';
    if (landingEnter)   landingEnter.style.display   = 'none';
    if (landingOffline) landingOffline.style.display = 'none';
  } else {
    if (landingLoading) landingLoading.style.display = 'none';
    if (landingGoogle)  landingGoogle.style.display  = '';
    if (landingEnter)   landingEnter.style.display   = 'none';
    if (landingOffline) landingOffline.style.display = '';
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
