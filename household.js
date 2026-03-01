/* ============================================================
   HOUSEHOLD.JS — casa condivisa: dispensa e spesa
   createHousehold, joinHousehold, leaveHousehold, getHouseholdInviteLink
   ============================================================ */
var _householdRealtimeUnsubscribe = null;

function startHouseholdRealtimeListener() {
  if (typeof householdId === 'undefined' || !householdId || typeof firebase === 'undefined') return;
  if (_householdRealtimeUnsubscribe) return;
  var ref = firebase.database().ref('households/' + householdId);
  _householdRealtimeUnsubscribe = ref.on('value', function (snap) {
    var h = snap.val();
    if (!h) return;
    if (h.pantryItems && typeof h.pantryItems === 'object') {
      pantryItems = h.pantryItems;
      Object.keys(pantryItems).forEach(function (k) {
        if (!k || k === 'undefined' || k.trim() === '') delete pantryItems[k];
      });
    }
    if (Array.isArray(h.spesaItems)) spesaItems = h.spesaItems;
    if (h.spesaLastGenerated != null) spesaLastGenerated = h.spesaLastGenerated;
    if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
  });
}

function stopHouseholdRealtimeListener() {
  if (_householdRealtimeUnsubscribe) {
    _householdRealtimeUnsubscribe();
    _householdRealtimeUnsubscribe = null;
  }
}

function getHouseholdInviteLink(hid) {
  if (!hid) return '';
  var base = (typeof location !== 'undefined' && location.origin)
    ? (location.origin + (location.pathname || '/'))
    : '';
  var sep = base.indexOf('?') !== -1 ? '&' : '?';
  return base + sep + 'join=' + encodeURIComponent(hid);
}

/**
 * Crea una nuova casa: dispensa e spesa correnti vengono migrate nella casa.
 * Richiede utente loggato e Firebase pronto.
 * @returns {Promise<string|null>} householdId o null in caso di errore
 */
function createHousehold() {
  if (typeof firebase === 'undefined' || !firebaseReady || !currentUser) {
    if (typeof showToast === 'function') showToast('Accedi per creare una casa', 'warning');
    return Promise.resolve(null);
  }
  var uid = currentUser.uid;
  var displayName = (currentUser.displayName || currentUser.email || 'Utente').trim();
  var email = currentUser.email || null;
  var ref = firebase.database().ref('households');
  var hid = ref.push().key;
  var now = Date.now();
  var payload = {
    members: {};
  };
  payload.members[uid] = {
    displayName: displayName,
    email: email,
    role: 'owner',
    joinedAt: now
  };
  payload.pantryItems = typeof pantryItems !== 'undefined' && pantryItems ? pantryItems : {};
  payload.spesaItems = Array.isArray(spesaItems) ? spesaItems : [];
  payload.spesaLastGenerated = spesaLastGenerated;
  payload.createdBy = uid;
  payload.createdAt = now;

  return firebase.database()
    .ref('households/' + hid)
    .set(payload)
    .then(function () {
      householdId = hid;
      saveData();
      if (typeof showToast === 'function') showToast('Casa creata. Condividi il link per invitare.', 'success');
      if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
      return hid;
    })
    .catch(function (e) {
      console.warn('[Household] createHousehold error:', e);
      if (typeof showToast === 'function') showToast('Errore creazione casa', 'error');
      return null;
    });
}

/**
 * Unisciti a una casa tramite id. Aggiunge l'utente ai membri e carica dispensa/spesa dalla casa.
 * @param {string} hid household id
 * @returns {Promise<boolean>}
 */
function joinHousehold(hid) {
  if (!hid || typeof hid !== 'string') return Promise.resolve(false);
  hid = hid.trim();
  if (!hid) return Promise.resolve(false);
  if (typeof firebase === 'undefined' || !firebaseReady || !currentUser) {
    if (typeof showToast === 'function') showToast('Accedi per unirti a una casa', 'warning');
    return Promise.resolve(false);
  }
  var uid = currentUser.uid;
  var displayName = (currentUser.displayName || currentUser.email || 'Utente').trim();
  var email = currentUser.email || null;

  return firebase.database()
    .ref('households/' + hid)
    .once('value')
    .then(function (snap) {
      if (!snap.exists()) {
        if (typeof showToast === 'function') showToast('Link invito non valido o casa non trovata', 'error');
        return false;
      }
      return firebase.database()
        .ref('households/' + hid + '/members/' + uid)
        .set({
          displayName: displayName,
          email: email,
          role: 'member',
          joinedAt: Date.now()
        });
    })
    .then(function (result) {
      if (result === false) return false;
      householdId = hid;
      return typeof loadHouseholdData === 'function' ? loadHouseholdData(hid) : Promise.resolve();
    })
    .then(function () {
      if (householdId !== hid) return false;
      saveData();
      startHouseholdRealtimeListener();
      if (typeof showToast === 'function') showToast('Ti sei unito alla casa. Dispensa e spesa sono condivise.', 'success');
      if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
      return true;
    })
    .catch(function (e) {
      console.warn('[Household] joinHousehold error:', e);
      if (typeof showToast === 'function') showToast('Errore unione alla casa', 'error');
      return false;
    });
}

/**
 * Esci dalla casa corrente. La dispensa e spesa in memoria restano come backup e vengono salvate nel profilo personale.
 */
function leaveHousehold() {
  if (!householdId || !currentUser) return Promise.resolve();
  var hid = householdId;
  var uid = currentUser.uid;

  return firebase.database()
    .ref('households/' + hid + '/members/' + uid)
    .remove()
    .then(function () {
      stopHouseholdRealtimeListener();
      householdId = null;
      saveData();
      if (typeof showToast === 'function') showToast('Sei uscito dalla casa. Dispensa e spesa sono ora personali.', 'info');
      if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
    })
    .catch(function (e) {
      console.warn('[Household] leaveHousehold error:', e);
      if (typeof showToast === 'function') showToast('Errore uscita dalla casa', 'error');
    });
}

/**
 * Legge i membri della casa (per UI). Ritorna una promise che risolve con l'oggetto members o null.
 * @param {string} hid
 * @returns {Promise<Object|null>}
 */
function getHouseholdMembers(hid) {
  if (!hid || typeof firebase === 'undefined') return Promise.resolve(null);
  return firebase.database()
    .ref('households/' + hid + '/members')
    .once('value')
    .then(function (snap) {
      return snap.val();
    })
    .catch(function () { return null; });
}
