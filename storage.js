/* ============================================================
   STORAGE.JS — salvataggio, caricamento, Firebase sync,
                disponibilità ingredienti
   ============================================================ */

var STORAGE_KEY = 'nutriplan_v2';

/* ---- Variabili globali ---- */
var pantryItems       = {};
var savedFridges      = {};
var appHistory        = {};
var customRecipes     = [];
var aiRecipes         = [];   /* ricette generate dall'AI e accettate dall'utente */
var customIngredients = [];
var spesaItems        = [];
var spesaLastGenerated = null;
var selectedDateKey   = null; /* inizializzato da enterApp() */
var pianoAlimentare   = {};   /* piano strutturato per categoria ingrediente */
var weeklyLimitsCustom = {};  /* limiti personalizzati nel piano alimentare */
var preferiti         = [];   /* nomi ricette preferite */
var dietProfile       = {};   /* vincoli dieta: { vegetariano, vegano, senzaLattosio, senzaGlutine, allergenici:[] } */
var householdId       = null; /* id casa condivisa: se impostato, dispensa e spesa si leggono/scrivono da households/{hid} */

function isReadOnlyMode() {
  return typeof window !== 'undefined' && window.NP_READONLY;
}

/* ============================================================
   INIT STORAGE (chiamata da enterApp prima di tutto)
   ============================================================ */
function initStorage() {
  loadData();
  /* Ripristina il piano di default solo se:
     - il piano è completamente vuoto (nessun pasto configurato)
     - NON c'è un clear esplicito (che indica reset volontario) */
  if (localStorage.getItem('nutriplan_cleared') !== '1') {
    var isEmpty = !pianoAlimentare || 
                  Object.keys(pianoAlimentare).length === 0 ||
                  !Object.keys(pianoAlimentare).some(function(mk) {
                    var meal = pianoAlimentare[mk];
                    if (!meal || typeof meal !== 'object') return false;
                    return Object.keys(meal).some(function(cat) {
                      return Array.isArray(meal[cat]) && meal[cat].length > 0;
                    });
                  });
    if (isEmpty && typeof defaultMealPlan !== 'undefined' && defaultMealPlan) {
      console.log('[Storage] Piano vuoto, carico defaultMealPlan');
      pianoAlimentare = JSON.parse(JSON.stringify(defaultMealPlan));
    }
  }
  ensurePlanStructure();
  Object.keys(weeklyLimits || {}).forEach(function (k) {
    if (weeklyLimits[k].current === undefined) weeklyLimits[k].current = 0;
  });
}

function ensurePlanStructure() {
  /* Tutte le categorie nutrizionali utilizzate nell'app */
  var allCategories = [
    '🥩 Carne',
    '🐟 Pesce', 
    '🥩 Carne e Pesce',
    '🥛 Latticini e Uova',
    '🌾 Cereali e Legumi',
    '🥦 Verdure',
    '🍎 Frutta',
    '🥑 Grassi e Condimenti',
    '🍫 Dolci e Snack',
    '🧂 Cucina',
    '🧂 Altro',
    /* Categorie legacy/compatibilità */
    'principale', 'contorno', 'frutta', 'extra'
  ];
  
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
    if (!pianoAlimentare[mk] || typeof pianoAlimentare[mk] !== 'object') 
      pianoAlimentare[mk] = {};
    
    allCategories.forEach(function (cat) {
      if (!Array.isArray(pianoAlimentare[mk][cat])) 
        pianoAlimentare[mk][cat] = [];
    });
  });
}

/* ============================================================
   LOAD / SAVE
   ============================================================ */
function loadData() {
  if (isReadOnlyMode()) {
    ensurePlanStructure();
    return;
  }
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    applyLoadedData(JSON.parse(raw));
  } catch (e) { console.warn('Errore caricamento locale:', e); }
}

function applyLoadedData(data) {
  if (!data) return;

  /* --- pantryItems: pulisce chiavi non valide --- */
  if (data.pantryItems && typeof data.pantryItems === 'object') {
    pantryItems = data.pantryItems;
    Object.keys(pantryItems).forEach(function (k) {
      if (!k || k === 'undefined' || k === 'null' || k.trim() === '') {
        delete pantryItems[k];
      }
    });
  }

  if (data.savedFridges    && typeof data.savedFridges    === 'object') savedFridges    = data.savedFridges;
  if (Array.isArray(data.appHistory) || typeof data.appHistory === 'object') {
    if (data.appHistory) appHistory = data.appHistory;
  }
  if (Array.isArray(data.customRecipes))     customRecipes     = data.customRecipes;
  if (Array.isArray(data.aiRecipes))         aiRecipes         = data.aiRecipes;
  if (Array.isArray(data.customIngredients)) customIngredients = data.customIngredients;
  if (Array.isArray(data.spesaItems))        spesaItems        = data.spesaItems;
  if (data.spesaLastGenerated)               spesaLastGenerated = data.spesaLastGenerated;

  if (data.weeklyLimits && typeof data.weeklyLimits === 'object') {
    Object.keys(data.weeklyLimits).forEach(function (k) {
      if (weeklyLimits && weeklyLimits[k]) {
        weeklyLimits[k].current = data.weeklyLimits[k].current || 0;
      }
    });
  }
  
  /* pianoAlimentare: merge intelligente preserva dati esistenti */
  if (data.pianoAlimentare && typeof data.pianoAlimentare === 'object') {
    var hasData = Object.keys(data.pianoAlimentare).some(function(mk) {
      var meal = data.pianoAlimentare[mk];
      if (!meal || typeof meal !== 'object') return false;
      return Object.keys(meal).some(function(cat) {
        return Array.isArray(meal[cat]) && meal[cat].length > 0;
      });
    });
    /* Sovrascrivi solo se ci sono dati validi da caricare */
    if (hasData) {
      pianoAlimentare = data.pianoAlimentare;
    }
  }
  
  if (data.weeklyLimitsCustom && typeof data.weeklyLimitsCustom === 'object')
    weeklyLimitsCustom = data.weeklyLimitsCustom;
  if (Array.isArray(data.preferiti))
    preferiti = data.preferiti;
  if (data.dietProfile && typeof data.dietProfile === 'object')
    dietProfile = data.dietProfile;
  /* householdId: non sovrascrivere un valore locale valido con null dal cloud (sync in ritardo dopo crea/unisciti) */
  if (data.hasOwnProperty('householdId')) {
    if (data.householdId && typeof data.householdId === 'string' && data.householdId.trim())
      householdId = data.householdId.trim();
    else if (!householdId)
      householdId = null;
  }
}

function buildSaveObject() {
  var limitsToSave = {};
  Object.keys(weeklyLimits || {}).forEach(function (k) {
    limitsToSave[k] = { current: weeklyLimits[k].current || 0 };
  });
  var obj = {
    pantryItems:        pantryItems,
    savedFridges:       savedFridges,
    appHistory:         appHistory,
    customRecipes:      customRecipes,
    aiRecipes:          aiRecipes,
    customIngredients:  customIngredients,
    spesaItems:         spesaItems,
    spesaLastGenerated: spesaLastGenerated,
    weeklyLimits:       limitsToSave,
    pianoAlimentare:    pianoAlimentare,
    weeklyLimitsCustom: weeklyLimitsCustom,
    preferiti:          preferiti,
    dietProfile:        dietProfile,
    householdId:        householdId || null
  };
  return obj;
}

/* Per sync cloud: se l'utente è in una casa, il blob utente non include dispensa/spesa (stanno in households). */
function buildUserSaveObject() {
  var full = buildSaveObject();
  if (householdId) {
    full.pantryItems = {};
    full.spesaItems = [];
    full.spesaLastGenerated = null;
  }
  return full;
}

function saveData() {
  if (isReadOnlyMode()) return;
  try {
    /* SEMPRE salva anche su localStorage come backup, anche per utenti loggati.
       Questo previene perdita dati se Firebase fallisce. */
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSaveObject()));
    
    /* Sync cloud solo se loggato; se in casa condivisa sync subito così tutti i membri vedono le modifiche */
    var isLoggedIn = (typeof currentUser !== 'undefined') && currentUser;
    if (isLoggedIn) {
      syncToCloud(!!(typeof householdId !== 'undefined' && householdId));
    }
  } catch (e) { console.warn('Errore salvataggio:', e); }
}

/* ============================================================
   HOUSEHOLD (dispensa e spesa condivise)
   ============================================================ */
function loadHouseholdData(hid) {
  if (!hid || !firebaseReady) return Promise.resolve();
  return firebase.database()
    .ref('households/' + hid)
    .once('value')
    .then(function (snap) {
      var h = snap.val();
      if (!h) return;
      if (h.pantryItems && typeof h.pantryItems === 'object') {
        pantryItems = h.pantryItems;
        Object.keys(pantryItems).forEach(function (k) {
          if (!k || k === 'undefined' || k === 'null' || k.trim() === '') delete pantryItems[k];
        });
      }
      if (Array.isArray(h.spesaItems)) spesaItems = h.spesaItems;
      if (h.spesaLastGenerated != null) spesaLastGenerated = h.spesaLastGenerated;
      console.log('[Storage] Dati casa caricati:', hid);
    })
    .catch(function (e) {
      console.warn('[Storage] Errore caricamento casa:', e);
    });
}

/* ============================================================
   FIREBASE SYNC
   ============================================================ */
var syncTimeout = null;

function syncToCloud(immediate) {
  if (!firebaseReady || !currentUser) { showCloudStatus('local'); return; }
  showCloudStatus('saving');
  clearTimeout(syncTimeout);
  syncTimeout = null;
  function doSync() {
    var userBlob = buildUserSaveObject();
    /* Cattura snapshot per la casa: evita che il listener in tempo reale sovrascriva
       pantryItems prima che l'update su households venga inviato (race condition). */
    var hid = householdId;
    var pantrySnapshot = (hid && typeof pantryItems === 'object') ? JSON.parse(JSON.stringify(pantryItems || {})) : null;
    var spesaSnapshot = (hid && Array.isArray(spesaItems)) ? spesaItems.slice() : null;
    var spesaLastSnap = hid ? spesaLastGenerated : null;

    firebase.database()
      .ref('users/' + currentUser.uid + '/nutriplan')
      .set(userBlob)
      .then(function () {
        if (hid && pantrySnapshot) {
          var lastActivity = {
            type: 'dispensa',
            by: currentUser.uid,
            byDisplayName: (currentUser.displayName || currentUser.email || 'Utente').trim(),
            at: Date.now()
          };
          return firebase.database()
            .ref('households/' + hid)
            .update({
              pantryItems: pantrySnapshot,
              spesaItems: spesaSnapshot !== null ? spesaSnapshot : (spesaItems || []),
              spesaLastGenerated: spesaLastSnap,
              lastActivity: lastActivity
            });
        }
      })
      .then(function ()  { showCloudStatus('synced'); })
      .catch(function (err) {
        showCloudStatus('error');
        if (householdId && err && (err.code === 'PERMISSION_DENIED' || err.message)) {
          console.warn('[Storage] Sync household fallito:', err.code || err.message);
        }
      });
  }
  if (immediate) doSync();
  else syncTimeout = setTimeout(doSync, 1500);
}

function loadFromCloud(uid) {
  if (!uid) return;
  
  console.log('[Storage] Caricamento da Firebase per uid:', uid);
  
  return firebase.database()
    .ref('users/' + uid + '/nutriplan')
    .once('value')
    .then(function (snap) {
      var data = snap.val();
      
      if (data && Object.keys(data).length > 0) {
        console.log('[Storage] Dati trovati su Firebase, applico...');
        applyLoadedData(data);
        ensurePlanStructure();
        /* Se in una casa, carica dispensa e spesa dalla casa */
        if (data.householdId && typeof data.householdId === 'string' && data.householdId.trim()) {
          return loadHouseholdData(data.householdId.trim()).then(function () {
            return null;
          });
        }
      } else {
        console.log('[Storage] Firebase vuoto, preservo dati locali esistenti');
        /* Firebase vuoto: primo login.
           NON azzeriamo MAI i dati esistenti automaticamente.
           L'utente potrebbe aver costruito il piano offline.
           Usiamo i dati già in memoria (caricati da localStorage). */
        
        /* Reset SOLO se l'utente ha esplicitamente richiesto cancellazione dati */
        if (localStorage.getItem('nutriplan_cleared') === '1') {
          console.log('[Storage] Flag nutriplan_cleared attivo, reset dati');
          pantryItems        = {};
          appHistory         = {};
          spesaItems         = [];
          customRecipes      = [];
          aiRecipes          = [];
          customIngredients  = [];
          pianoAlimentare    = {};
          weeklyLimitsCustom = {};
          preferiti          = [];
          dietProfile        = {};
          /* Rimuovi il flag dopo averlo usato */
          localStorage.removeItem('nutriplan_cleared');
        }
        
        ensurePlanStructure();
        
        /* Salva i dati locali esistenti su Firebase (primo sync) */
        console.log('[Storage] Sincronizzazione iniziale su Firebase...');
        syncToCloud();
      }

      return null;
    })
    .then(function () {
      /* Se il piano ha ingredienti, nascondi onboarding; altrimenti mostra scelta iniziale (utente loggato) */
      if (typeof hideOnboardingIfPlanExists === 'function') hideOnboardingIfPlanExists();
      if (typeof checkOnboarding === 'function') checkOnboarding();

      if (householdId && typeof startHouseholdRealtimeListener === 'function') startHouseholdRealtimeListener();
      refreshAllAppViews();
      if (typeof currentPage !== 'undefined' && currentPage === 'casa' && typeof renderCasa === 'function') renderCasa();
      showCloudStatus('synced');
      return null;
    })
    .catch(function (e) {
      console.warn('[Storage] Errore caricamento cloud:', e);
      /* In caso di errore, usa i dati locali */
      ensurePlanStructure();
      refreshAllAppViews();
      if (typeof currentPage !== 'undefined' && currentPage === 'casa' && typeof renderCasa === 'function') renderCasa();
      showCloudStatus('error');
    });
}

/* ============================================================
   STORICO GIORNALIERO
   ============================================================ */
function getCurrentDateKey() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getDayData(dateKey) {
  if (!dateKey) dateKey = getCurrentDateKey();
  if (!appHistory[dateKey]) {
    appHistory[dateKey] = { usedItems: {}, substitutions: {} };
  }
  if (!appHistory[dateKey].usedItems)     appHistory[dateKey].usedItems = {};
  if (!appHistory[dateKey].substitutions) appHistory[dateKey].substitutions = {};
  return appHistory[dateKey];
}

/* ============================================================
   CHECK DISPONIBILITÀ INGREDIENTE
   ============================================================ */
var AVAIL_NONE = { matched: false, sufficient: false, available: 0,
                   availableUnit: '', pantryName: '', incompatibleUnits: false };

function checkIngredientAvailability(item) {
  if (!item || typeof item !== 'object') return AVAIL_NONE;
  if (!item.name || typeof item.name !== 'string' || !item.name.trim()) return AVAIL_NONE;

  var nl  = item.name.toLowerCase().trim();
  var keys = Object.keys(pantryItems);
  var matchedKey = null;

  for (var i = 0; i < keys.length; i++) {
    var k  = keys[i];
    if (!k || k === 'undefined' || k === 'null') continue; /* salta chiavi invalide */
    var kl = k.toLowerCase().trim();
    if (!kl) continue;
    if (kl === nl || kl.includes(nl) || nl.includes(kl)) { matchedKey = k; break; }
  }

  if (!matchedKey) return AVAIL_NONE;

  var pd  = pantryItems[matchedKey] || {};
  var qty = typeof pd.quantity === 'number' ? pd.quantity : 0;
  var pu  = ((pd.unit || 'g') + '').trim();

  if (!item.quantity || !item.unit) {
    return { matched: true, sufficient: qty > 0, available: qty,
             availableUnit: pu, pantryName: matchedKey, incompatibleUnits: false };
  }

  var reqQty  = parseFloat(item.quantity) || 0;
  var reqUnit = ((item.unit || 'g') + '').trim();

  if (pu.toLowerCase() === reqUnit.toLowerCase()) {
    return { matched: true, sufficient: qty >= reqQty, available: qty,
             availableUnit: pu, pantryName: matchedKey, incompatibleUnits: false };
  }

  var converted = convertUnit(reqQty, reqUnit, pu);
  if (converted !== null) {
    return { matched: true, sufficient: qty >= converted, available: qty,
             availableUnit: pu, pantryName: matchedKey, incompatibleUnits: false };
  }

  return { matched: true, sufficient: qty > 0, available: qty,
           availableUnit: pu, pantryName: matchedKey, incompatibleUnits: true };
}

/* ============================================================
   CONVERSIONI UNITÀ
   ============================================================ */
function convertUnit(value, fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return null;
  var f = (fromUnit + '').toLowerCase().trim();
  var t = (toUnit   + '').toLowerCase().trim();
  if (f === t) return value;
  var c = (typeof unitConversions !== 'undefined') ? unitConversions : {};
  if (c[f] && c[f][t] !== undefined) return value * c[f][t];
  return null;
}

/* ============================================================
   ADD FROM SPESA → aggiunge articolo acquistato alla dispensa
   ============================================================ */
function addFromSpesa(name, quantity, unit) {
  if (!name || typeof name !== 'string' || !name.trim()) return;
  if (!pantryItems) pantryItems = {};
  var existing = pantryItems[name] || {};
  var prev = typeof existing.quantity === 'number' ? existing.quantity : 0;
  pantryItems[name] = Object.assign({}, existing, {
    quantity: parseFloat((prev + (parseFloat(quantity) || 0)).toFixed(3)),
    unit:     unit || existing.unit || 'g'
  });
  saveData();
  if (typeof renderFridge  === 'function') renderFridge();
  if (typeof renderPantry  === 'function') renderPantry();
}

/* ============================================================
   REFRESH TUTTE LE VISTE (robusta: non crasha se un modulo
   non è ancora caricato)
   ============================================================ */
function refreshAllAppViews() {
  var fns = [
    'renderCasa', 'renderMealPlan', 'renderPantry', 'renderFridge',
    'renderRicettePage', 'renderStorico', 'renderSpesa',
    'renderStatistiche', 'renderProfilo', 'updateSavedFridges',
    'updateLimits', 'renderPianoAlimentare'
  ];
  fns.forEach(function (name) {
    try {
      if (typeof window[name] === 'function') window[name]();
    } catch (e) { console.warn(name + ':', e); }
  });
}
