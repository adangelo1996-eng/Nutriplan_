/* ============================================================
   FIREBASE-CONFIG.JS — inizializzazione, auth, status cloud
   ============================================================ */

var firebaseConfig = {
  apiKey:            "AIzaSyBitbmjthQUvKyrHmADVLkvwENoVrXYxNY",
  authDomain:        "nutriplan-100f9.firebaseapp.com",
  databaseURL:       "https://nutriplan-100f9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "nutriplan-100f9",
  storageBucket:     "nutriplan-100f9.firebasestorage.app",
  messagingSenderId: "371119799995",
  appId:             "1:371119799995:web:309e59696041f3bbc9739e",
  measurementId:     "G-VELZ8ZZYQ3"
};

/* ---- Variabili globali Firebase (usate da storage.js) ---- */
var firebaseReady = false;
var currentUser   = null;

/* ============================================================
   INIT — chiamata da enterApp() in app.js
   ============================================================ */
function initFirebase() {
  try {
    /* Evita doppia inizializzazione */
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firebaseReady = true;

firebase.auth().onAuthStateChanged(function (user) {
  currentUser = user;
  if (user) {
    showCloudStatus('saving');
    updateAuthUI(user);
    /* Aggiorna il profilo subito dopo il login */
    if (typeof renderProfilo === 'function') renderProfilo();
    if (typeof loadFromCloud === 'function') loadFromCloud(user.uid);
  } else {
    currentUser = null;
    updateAuthUI(null);
    showCloudStatus('local');
    /* Aggiorna il profilo per mostrare il pulsante "Accedi" */
    if (typeof renderProfilo === 'function') renderProfilo();
  }
});


  } catch (e) {
    console.warn('Firebase init error:', e);
    firebaseReady = false;
    showCloudStatus('local');
  }
}

/* ============================================================
   AUTH — accesso e uscita
   ============================================================ */
function signInWithGoogle() {
  if (!firebaseReady) {
    alert('Firebase non disponibile. Ricarica la pagina.');
    return;
  }
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth()
    .signInWithPopup(provider)
    .catch(function (e) {
      console.warn('Errore login:', e);
      alert('Errore di accesso: ' + (e.message || e));
    });
}

function signOut() {
  if (!firebaseReady) return;
  if (!confirm('Disconnettersi? I dati locali rimarranno salvati.')) return;
  firebase.auth().signOut().then(function () {
    currentUser = null;
    updateAuthUI(null);
    showCloudStatus('local');
  }).catch(function (e) {
    console.warn('Errore logout:', e);
  });
}

/* ============================================================
   UI — aggiorna bottoni login/logout e stato cloud
   ============================================================ */
function updateAuthUI(user) {
  var loginBtn  = document.getElementById('loginBtn');
  var logoutBtn = document.getElementById('logoutBtn');

  if (!loginBtn || !logoutBtn) return;

  if (user) {
    loginBtn.style.display  = 'none';
    logoutBtn.style.display = '';
    logoutBtn.title = 'Connesso come ' + (user.displayName || user.email || '');
  } else {
    loginBtn.style.display  = '';
    logoutBtn.style.display = 'none';
  }
}

function showCloudStatus(status) {
  var el = document.getElementById('cloudStatus');
  if (!el) return;

  var cfg = {
    local:   { text: '💾 Locale',          cls: 'cloud-local'   },
    saving:  { text: '⏳ Salvataggio...',   cls: 'cloud-saving'  },
    synced:  { text: '☁️ Sincronizzato',   cls: 'cloud-synced'  },
    error:   { text: '⚠️ Errore sync',     cls: 'cloud-error'   }
  };

  var c = cfg[status] || cfg.local;
  el.textContent = c.text;
  el.className   = 'cloud-status ' + c.cls;
}
