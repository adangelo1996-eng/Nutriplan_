/* ============================================================
   APP-MODALS.JS — Modali, auth, conferma, frigo, ricetta
============================================================ */

function handleAuthPillClick(e) {
  if (window.innerWidth < 768 || ('ontouchstart' in window)) {
    e.preventDefault();
    if (typeof goToPage === 'function') goToPage('profilo');
  } else {
    openAuthModal();
  }
}

function openAuthModal() {
  var modal = document.getElementById('authModal');
  if (!modal) return;
  var body  = document.getElementById('authModalBody');
  var title = document.getElementById('authModalTitle');
  var user  = (typeof currentUser !== 'undefined') ? currentUser : null;

  if (user) {
    if (title) title.textContent = 'Account';
    if (body) body.innerHTML =
      '<div style="text-align:center;padding:16px 0;">' +
        '<img src="' + (user.photoURL || '') + '" alt="Avatar" ' +
             'style="width:64px;height:64px;border-radius:50%;margin:0 auto 12px;' +
                    'border:3px solid var(--primary);display:block;" ' +
             'onerror="this.style.display=\'none\'" />' +
        '<div style="font-weight:800;font-size:1rem;">' + (user.displayName || '') + '</div>' +
        '<div style="font-size:.78rem;color:var(--text-light);margin:4px 0 20px;">' + (user.email || '') + '</div>' +
        '<button class="btn btn-danger btn-small" onclick="signOut()">Esci</button>' +
      '</div>';
  } else {
    if (title) title.textContent = 'Accedi';
    if (body) body.innerHTML =
      '<div style="padding:8px 0;">' +
        '<p style="font-size:.82rem;color:var(--text-light);text-align:center;margin-bottom:20px;">' +
          'Accedi per sincronizzare i dati su tutti i dispositivi.' +
        '</p>' +
        '<button class="btn-google" onclick="signInWithGoogle()">' +
          '<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>' +
          'Continua con Google' +
        '</button>' +
      '</div>';
  }
  modal.classList.add('active');
}

function closeAuthModal() {
  var m = document.getElementById('authModal');
  if (m) m.classList.remove('active');
}

function closeRecipeModal() {
  var m = document.getElementById('recipeModal');
  if (m) m.classList.remove('active');
}
function closeSaveFridgeModal() {
  var m = document.getElementById('saveFridgeModal');
  if (m) m.classList.remove('active');
}
function openSavedFridgeModal() {
  var m = document.getElementById('savedFridgeModal');
  if (!m) return;
  var list = document.getElementById('savedFridgeList');
  if (list && typeof renderSavedFridgeList === 'function') renderSavedFridgeList(list);
  m.classList.add('active');
}
function closeSavedFridgeModal() {
  var m = document.getElementById('savedFridgeModal');
  if (m) m.classList.remove('active');
}
function openAddFridgeModal() {
  var m = document.getElementById('addFridgeModal');
  if (!m) return;
  var inp = document.getElementById('newFridgeItem');
  if (inp) { inp.value = ''; inp.focus(); }
  var qty = document.getElementById('newFridgeQty');
  if (qty) qty.value = '';
  m.classList.add('active');
  if (typeof populateIngAutocomplete === 'function') populateIngAutocomplete();
}

function openAddFridgePrecompiled(name) {
  var modal = document.getElementById('addFridgeModal');
  if (!modal) return;
  modal.classList.add('active');
  var nameEl = document.getElementById('newFridgeItem');
  var qtyEl  = document.getElementById('newFridgeQty');
  var catEl  = document.getElementById('newFridgeCategory');
  if (nameEl) {
    nameEl.value = name || '';
    if (typeof populateIngAutocomplete === 'function') populateIngAutocomplete();
    if (typeof autoFillFridgeCategory === 'function' && name) autoFillFridgeCategory(name);
  }
  if (qtyEl) qtyEl.value = '';
  if (catEl && !catEl.value) catEl.value = '🧂 Altro';
  setTimeout(function() {
    if (qtyEl) { qtyEl.focus(); qtyEl.select(); }
  }, 100);
}
function closeAddFridgeModal() {
  var m = document.getElementById('addFridgeModal');
  if (m) m.classList.remove('active');
}
function openNewRicettaModal() {
  var m = document.getElementById('newRicettaModal');
  if (m) m.classList.add('active');
}
function closeNewRicettaModal() {
  var m = document.getElementById('newRicettaModal');
  if (m) m.classList.remove('active');
}
function closePurchasedQtyModal() {
  var m = document.getElementById('purchasedQtyModal');
  if (m) m.classList.remove('active');
}

function closeAppConfirmModal() {
  var m = document.getElementById('appConfirmModal');
  if (m) m.classList.remove('active');
}

function showAppConfirm(opts) {
  if (!opts) return;
  var titleEl = document.getElementById('appConfirmTitle');
  var msgEl = document.getElementById('appConfirmMessage');
  var primaryBtn = document.getElementById('appConfirmPrimaryBtn');
  var secondaryBtn = document.getElementById('appConfirmSecondaryBtn');
  var modal = document.getElementById('appConfirmModal');
  if (!titleEl || !msgEl || !primaryBtn || !secondaryBtn || !modal) return;
  titleEl.textContent = opts.title || 'Conferma';
  msgEl.textContent = opts.message || '';
  primaryBtn.textContent = opts.primaryText || 'Ok';
  secondaryBtn.textContent = opts.secondaryText || 'Annulla';
  secondaryBtn.style.display = (opts.alertMode === true) ? 'none' : '';
  primaryBtn.onclick = function() {
    closeAppConfirmModal();
    if (typeof opts.primaryAction === 'function') opts.primaryAction();
  };
  secondaryBtn.onclick = function() {
    closeAppConfirmModal();
    if (typeof opts.secondaryAction === 'function') opts.secondaryAction();
  };
  modal.classList.add('active');
}

function showAppAlert(title, message) {
  showAppConfirm({
    title: title || 'Avviso',
    message: message || '',
    primaryText: 'Ok',
    alertMode: true,
    primaryAction: function() {}
  });
}

function openPrivacyModal() {
  var m = document.getElementById('privacyModal');
  if (m) m.classList.add('active');
}
function closePrivacyModal() {
  var m = document.getElementById('privacyModal');
  if (m) m.classList.remove('active');
}

function openContattiModal() {
  var m = document.getElementById('contattiModal');
  if (m) m.classList.add('active');
}
function closeContattiModal() {
  var m = document.getElementById('contattiModal');
  if (m) m.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal').forEach(function(modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.classList.remove('active');
    });
  });
  var joinHid = typeof getJoinHidFromUrl === 'function' ? getJoinHidFromUrl() : null;
  if (joinHid && (typeof currentUser === 'undefined' || !currentUser) && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('nutriplan_join', joinHid);
    if (typeof clearJoinFromUrl === 'function') clearJoinFromUrl();
  }
});
