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
    if (!snap || typeof snap.val !== 'function') return;
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

/**
 * Unisce la dispensa personale (myPantry) in quella della casa (pantryItems).
 * Per ogni ingrediente: se non c'è nella casa lo aggiunge; se c'è già somma le quantità.
 */
function mergePantryIntoHousehold(myPantry) {
  if (!myPantry || typeof myPantry !== 'object') return;
  if (typeof pantryItems === 'undefined') return;
  if (!pantryItems) pantryItems = {};
  Object.keys(myPantry).forEach(function (name) {
    if (!name || String(name).trim() === '') return;
    var mine = myPantry[name];
    var existing = pantryItems[name];
    if (!existing) {
      pantryItems[name] = mine && typeof mine === 'object' ? Object.assign({}, mine) : { quantity: mine, category: '' };
      return;
    }
    var myQ = mine && typeof mine === 'object' && typeof mine.quantity !== 'undefined' ? Number(mine.quantity) : Number(mine);
    var exQ = typeof existing.quantity !== 'undefined' ? Number(existing.quantity) : Number(existing);
    if (isNaN(myQ)) myQ = 0;
    if (isNaN(exQ)) exQ = 0;
    pantryItems[name] = Object.assign({}, existing, { quantity: exQ + myQ });
  });
}

function getHouseholdInviteLink(hid) {
  if (!hid) return '';
  var base = '';
  if (typeof location !== 'undefined' && location.origin && String(location.origin).indexOf('http') === 0) {
    base = location.origin + (location.pathname || '/');
  }
  if (!base) return '';
  var sep = base.indexOf('?') !== -1 ? '&' : '?';
  return base + sep + 'join=' + encodeURIComponent(hid);
}

/**
 * Hash della password per accesso con nome casa (SHA-256 in hex).
 * @param {string} password
 * @returns {Promise<string>}
 */
function hashPasswordForHousehold(password) {
  var str = (password || '').trim();
  if (!str) return Promise.resolve('');
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      var arr = new Uint8Array(buf);
      var hex = '';
      for (var i = 0; i < arr.length; i++) hex += ('0' + arr[i].toString(16)).slice(-2);
      return hex;
    });
  }
  return Promise.resolve(str);
}

/**
 * Salva nome e password per permettere accesso alla casa senza link (householdJoin).
 * @param {string} hid
 * @param {string} name nome della casa
 * @param {string} password
 */
function setHouseholdJoinCredentials(hid, name, password) {
  if (!hid || typeof firebase === 'undefined') return Promise.resolve();
  var n = (name || '').trim();
  if (!n) return Promise.resolve();
  return hashPasswordForHousehold(password).then(function (passwordHash) {
    if (!passwordHash) return;
    return firebase.database().ref('householdJoin/' + hid).set({
      name: n,
      nameLower: n.toLowerCase(),
      passwordHash: passwordHash
    });
  }).catch(function (e) {
    console.warn('[Household] setHouseholdJoinCredentials error:', e);
  });
}

/**
 * Unisciti a una casa tramite nome e password. Cerca in householdJoin e verifica la password.
 * @param {string} name nome della casa
 * @param {string} password
 * @returns {Promise<boolean>}
 */
function joinHouseholdByNameAndPassword(name, password) {
  var n = (name || '').trim().toLowerCase();
  if (!n || typeof firebase === 'undefined') return Promise.resolve(false);
  return hashPasswordForHousehold(password).then(function (inputHash) {
    if (!inputHash) return false;
    return firebase.database().ref('householdJoin').orderByChild('nameLower').equalTo(n).once('value').then(function (snap) {
      if (!snap.exists()) return false;
      var val = snap.val();
      var hid = null;
      var storedHash = null;
      for (var key in val) {
        if (val[key] && val[key].passwordHash) {
          hid = key;
          storedHash = val[key].passwordHash;
          break;
        }
      }
      if (!hid || storedHash !== inputHash) return false;
      return typeof joinHousehold === 'function' ? joinHousehold(hid) : Promise.resolve(false);
    });
  }).catch(function (e) {
    console.warn('[Household] joinHouseholdByNameAndPassword error:', e);
    return false;
  });
}

/**
 * Crea una nuova casa: dispensa e spesa correnti vengono migrate nella casa.
 * Richiede utente loggato e Firebase pronto.
 * @param {boolean} [includeMyPantry=true] se true unisce la dispensa personale alla casa
 * @returns {Promise<string|null>} householdId o null in caso di errore
 */
function createHousehold(includeMyPantry) {
  if (typeof firebase === 'undefined') {
    if (typeof showToast === 'function') showToast('Firebase non disponibile. Ricarica la pagina.', 'error');
    return Promise.resolve(null);
  }
  if (!firebaseReady) {
    if (typeof showToast === 'function') showToast('Connessione in corso... Riprova tra qualche secondo.', 'warning');
    return Promise.resolve(null);
  }
  if (!currentUser) {
    if (typeof showToast === 'function') showToast('Accedi con Google per creare una casa condivisa.', 'warning');
    return Promise.resolve(null);
  }
  if (includeMyPantry !== false) includeMyPantry = true;
  var uid = currentUser.uid;
  var displayName = (currentUser.displayName || currentUser.email || 'Utente').trim();
  var email = currentUser.email || null;
  var ref = firebase.database().ref('households');
  var hid = ref.push().key;
  var now = Date.now();
  var payload = {
    members: {}
  };
  payload.members[uid] = {
    displayName: displayName,
    email: email,
    role: 'owner',
    joinedAt: now
  };
  payload.pantryItems = includeMyPantry && typeof pantryItems !== 'undefined' && pantryItems ? pantryItems : {};
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
      if (typeof syncToCloud === 'function') syncToCloud(true);
      if (typeof showToast === 'function') showToast('Casa creata. Condividi il link per invitare.', 'success');
      if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
      return hid;
    })
    .catch(function (e) {
      console.warn('[Household] createHousehold error:', e);
      var msg = 'Errore creazione casa';
      if (e && e.code === 'PERMISSION_DENIED') {
        msg = 'Permesso negato. Assicurati di aver deployato le regole Firebase per households.';
      } else if (e && e.message) {
        msg = 'Errore: ' + (e.message || '').slice(0, 80);
      }
      if (typeof showToast === 'function') showToast(msg, 'error');
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

  var myPantryBeforeJoin = null;
  try {
    myPantryBeforeJoin = (typeof pantryItems !== 'undefined' && pantryItems && Object.keys(pantryItems).length > 0)
      ? JSON.parse(JSON.stringify(pantryItems)) : null;
  } catch (e) { myPantryBeforeJoin = null; }

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
      if (typeof syncToCloud === 'function') syncToCloud(true);
      startHouseholdRealtimeListener();
      if (typeof showToast === 'function') showToast('Ti sei unito alla casa. Dispensa e spesa sono condivise.', 'success');
      if (typeof refreshAllAppViews === 'function') refreshAllAppViews();

      var hasMyPantry = myPantryBeforeJoin && Object.keys(myPantryBeforeJoin).length > 0;
      function showJoinPantryDialog() {
        if (hasMyPantry && typeof showAppConfirm === 'function') {
          showAppConfirm({
            title: 'Quale dispensa usare?',
            message: 'Puoi sostituire la dispensa della casa con la tua (tutti i membri vedranno la tua dispensa) oppure tenere quella già presente nella casa.',
            primaryText: 'Usa la mia dispensa',
            secondaryText: 'Usa quella della casa',
            primaryAction: function () {
              if (typeof showAppConfirm === 'function') {
                showAppConfirm({
                  title: 'Conferma sostituzione',
                  message: 'Sei sicuro? La dispensa attuale della casa verrà sostituita con la tua. Tutti i membri vedranno la nuova dispensa.',
                  primaryText: 'Sì, sostituisci',
                  secondaryText: 'Annulla',
                  primaryAction: function () {
                    pantryItems = JSON.parse(JSON.stringify(myPantryBeforeJoin));
                    if (typeof syncToCloud === 'function') syncToCloud(true);
                    if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
                    if (typeof showToast === 'function') showToast('Dispensa della casa aggiornata con la tua.', 'success');
                  }
                });
              } else if (typeof confirm === 'function' && confirm('Sei sicuro? La dispensa della casa verrà sostituita con la tua.')) {
                pantryItems = JSON.parse(JSON.stringify(myPantryBeforeJoin));
                if (typeof syncToCloud === 'function') syncToCloud(true);
                if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
                if (typeof showToast === 'function') showToast('Dispensa della casa aggiornata con la tua.', 'success');
              }
            }
          });
        } else if (hasMyPantry && typeof confirm === 'function') {
          if (confirm('Usa la tua dispensa come dispensa della casa? (sostituirà quella attuale)\n\nClicca Annulla per tenere la dispensa già presente nella casa.')) {
            if (confirm('Sei sicuro? La dispensa della casa verrà sostituita con la tua.')) {
              pantryItems = JSON.parse(JSON.stringify(myPantryBeforeJoin));
              if (typeof syncToCloud === 'function') syncToCloud(true);
              if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
              if (typeof showToast === 'function') showToast('Dispensa della casa aggiornata con la tua.', 'success');
            }
          }
        }
      }
      setTimeout(showJoinPantryDialog, 150);
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
 * Elimina definitivamente la casa da Firebase (solo se chiamato dopo aver verificato di essere l'ultimo membro).
 */
function deleteHouseholdPermanently(hid) {
  if (!hid || typeof firebase === 'undefined') return Promise.resolve();
  return firebase.database()
    .ref('households/' + hid)
    .remove()
    .then(function () {
      if (householdId === hid) {
        stopHouseholdRealtimeListener();
        householdId = null;
        saveData();
      }
      if (typeof showToast === 'function') showToast('Casa eliminata definitivamente.', 'info');
      if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
    })
    .catch(function (e) {
      console.warn('[Household] deleteHouseholdPermanently error:', e);
      if (typeof showToast === 'function') showToast('Errore eliminazione casa', 'error');
    });
}

/**
 * Elimina casa per l'utente: se è l'ultimo membro elimina la casa definitivamente (con conferma), altrimenti esce solo lui.
 */
function confirmDeleteHousehold() {
  if (!householdId || !currentUser) return;
  var hid = householdId;
  var uid = currentUser.uid;

  if (typeof getHouseholdMembers !== 'function') return;
  getHouseholdMembers(hid).then(function (members) {
    var list = members && typeof members === 'object' ? Object.keys(members) : [];
    var isLast = list.length === 1 && list[0] === uid;

    if (isLast) {
      if (typeof showAppConfirm === 'function') {
        showAppConfirm({
          title: 'Elimina casa definitivamente',
          message: 'Sei l\'ultimo membro. Eliminando la casa verrà rimossa definitivamente per tutti. Vuoi continuare?',
          primaryText: 'Elimina definitivamente',
          secondaryText: 'Annulla',
          primaryAction: function () { deleteHouseholdPermanently(hid); }
        });
      } else if (confirm('Sei l\'ultimo membro. Eliminando la casa verrà rimossa definitivamente. Continuare?')) {
        deleteHouseholdPermanently(hid);
      }
    } else {
      if (typeof showAppConfirm === 'function') {
        showAppConfirm({
          title: 'Elimina casa per te',
          message: 'Uscirai dalla casa. La casa resterà attiva per gli altri membri.',
          primaryText: 'Esci dalla casa',
          secondaryText: 'Annulla',
          primaryAction: function () { leaveHousehold(); }
        });
      } else if (confirm('Vuoi uscire dalla casa? La casa resterà attiva per gli altri membri.')) {
        leaveHousehold();
      }
    }
  }).catch(function () {
    if (typeof showToast === 'function') showToast('Impossibile verificare i membri. Riprova.', 'error');
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

/**
 * Formatta timestamp in tempo relativo (es. "5 min fa", "2 ore fa").
 */
function formatRelativeTime(ts) {
  if (ts == null || isNaN(ts)) return '';
  var now = Date.now();
  var diff = now - ts;
  if (diff < 60000) return 'adesso';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min fa';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' ore fa';
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' giorni fa';
  if (diff < 2592000000) return Math.floor(diff / 604800000) + ' settimane fa';
  return Math.floor(diff / 2592000000) + ' mesi fa';
}

/**
 * Legge lastActivity dalla casa e ritorna stringa formattata per la UI.
 * @param {string} hid
 * @returns {Promise<string>} es. "Dispensa aggiornata da Mario, 2 ore fa" o ""
 */
function getHouseholdLastActivity(hid) {
  if (!hid || typeof firebase === 'undefined') return Promise.resolve('');
  return firebase.database()
    .ref('households/' + hid + '/lastActivity')
    .once('value')
    .then(function (snap) {
      var la = snap.val();
      if (!la || !la.at) return '';
      var who = (la.byDisplayName || la.by || '').toString().trim() || 'un membro';
      var typeLabel = la.type === 'spesa' ? 'Lista spesa' : 'Dispensa';
      var when = formatRelativeTime(la.at);
      return typeLabel + ' aggiornata da ' + who + ', ' + when;
    })
    .catch(function () { return ''; });
}
