/* ============================================================
   STORAGE.JS — salvataggio, caricamento, Firebase sync,
                disponibilità ingredienti
   ============================================================ */

var STORAGE_KEY = 'nutriplan_v2';

/* ---- Variabili globali ---- */
var mealPlan          = {};
var pantryItems       = {};
var savedFridges      = {};
var appHistory        = {};
var customRecipes     = [];
var customIngredients = [];
var spesaItems        = [];
var spesaLastGenerated = null;
var selectedDateKey   = null; /* inizializzato da enterApp() */
var pianoAlimentare   = {};   /* piano strutturato per categoria ingrediente */
var weeklyLimitsCustom = {};  /* limiti personalizzati nel piano alimentare */

/* ============================================================
   INIT STORAGE (chiamata da enterApp prima di tutto)
   ============================================================ */
function initStorage() {
  loadData();
  /* Ripristina il piano di default solo se:
     - l'utente non è loggato (loggato => dati da Firebase, non da default)
     - non c'è un clear esplicito
     - il piano è vuoto */
  var isLoggedIn = (typeof currentUser !== 'undefined') && currentUser;
  if (!isLoggedIn && localStorage.getItem('nutriplan_cleared') !== '1') {
    if (!mealPlan || !Object.keys(mealPlan).length) {
      mealPlan = JSON.parse(JSON.stringify(defaultMealPlan || {}));
    }
  }
  ensurePlanStructure();
  Object.keys(weeklyLimits || {}).forEach(function (k) {
    if (weeklyLimits[k].current === undefined) weeklyLimits[k].current = 0;
  });
}

function ensurePlanStructure() {
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
    if (!mealPlan[mk] || typeof mealPlan[mk] !== 'object') mealPlan[mk] = {};
    ['principale','contorno','frutta','extra'].forEach(function (cat) {
      if (!Array.isArray(mealPlan[mk][cat])) mealPlan[mk][cat] = [];
    });
  });
}

/* ============================================================
   LOAD / SAVE
   ============================================================ */
function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    applyLoadedData(JSON.parse(raw));
  } catch (e) { console.warn('Errore caricamento locale:', e); }
}

function applyLoadedData(data) {
  if (!data) return;

  /* --- mealPlan con sanitizzazione --- */
  if (data.mealPlan && typeof data.mealPlan === 'object') {
    mealPlan = data.mealPlan;
    ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
      if (!mealPlan[mk] || typeof mealPlan[mk] !== 'object') {
        mealPlan[mk] = {};
        return;
      }
      ['principale','contorno','frutta','extra'].forEach(function (cat) {
        if (!Array.isArray(mealPlan[mk][cat])) {
          mealPlan[mk][cat] = [];
        } else {
          /* Filtra item null / senza name valido */
          mealPlan[mk][cat] = mealPlan[mk][cat].filter(function (item) {
            return item &&
                   typeof item === 'object' &&
                   item.name &&
                   typeof item.name === 'string' &&
                   item.name.trim() !== '';
          });
        }
      });
    });
  }

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
  if (data.pianoAlimentare && typeof data.pianoAlimentare === 'object')
    pianoAlimentare = data.pianoAlimentare;
  if (data.weeklyLimitsCustom && typeof data.weeklyLimitsCustom === 'object')
    weeklyLimitsCustom = data.weeklyLimitsCustom;
}

function buildSaveObject() {
  var limitsToSave = {};
  Object.keys(weeklyLimits || {}).forEach(function (k) {
    limitsToSave[k] = { current: weeklyLimits[k].current || 0 };
  });
  return {
    mealPlan:           mealPlan,
    pantryItems:        pantryItems,
    savedFridges:       savedFridges,
    appHistory:         appHistory,
    customRecipes:      customRecipes,
    customIngredients:  customIngredients,
    spesaItems:         spesaItems,
    spesaLastGenerated: spesaLastGenerated,
    weeklyLimits:       limitsToSave,
    pianoAlimentare:    pianoAlimentare,
    weeklyLimitsCustom: weeklyLimitsCustom
  };
}

function saveData() {
  try {
    /* Quando l'utente è loggato, i dati vivono SOLO su Firebase (non localStorage) */
    var isLoggedIn = (typeof currentUser !== 'undefined') && currentUser;
    if (!isLoggedIn) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSaveObject()));
    }
    syncToCloud();
  } catch (e) { console.warn('Errore salvataggio:', e); }
}

/* ============================================================
   FIREBASE SYNC
   ============================================================ */
var syncTimeout = null;

function syncToCloud() {
  if (!firebaseReady || !currentUser) { showCloudStatus('local'); return; }
  showCloudStatus('saving');
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(function () {
    firebase.database()
      .ref('users/' + currentUser.uid + '/nutriplan')
      .set(buildSaveObject())
      .then(function ()  { showCloudStatus('synced'); })
      .catch(function () { showCloudStatus('error');  });
  }, 1500);
}

function loadFromCloud(uid) {
  if (!uid) return;
  firebase.database()
    .ref('users/' + uid + '/nutriplan')
    .once('value')
    .then(function (snap) {
      var data = snap.val();
      if (data) {
        applyLoadedData(data);
        ensurePlanStructure();
      } else {
        /* Nuovo utente: azzera qualsiasi default caricato dal localStorage */
        mealPlan = {};
        pantryItems = {};
        appHistory = {};
        spesaItems = [];
        customRecipes = [];
        customIngredients = [];
        pianoAlimentare = {};
        weeklyLimitsCustom = {};
        ensurePlanStructure();
      }
      /* Non salvare su localStorage: utente loggato, dati solo su Firebase */
      syncToCloud();
      refreshAllAppViews();
      showCloudStatus('synced');
    })
    .catch(function (e) {
      console.warn('Errore caricamento cloud:', e);
      showCloudStatus('local');
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
    'renderMealPlan', 'renderPantry', 'renderFridge',
    'renderRicettePage', 'renderStorico', 'renderSpesa',
    'renderStatistiche', 'renderProfilo', 'updateSavedFridges',
    'updateLimits'   /* non renderLimitsGrid — usa il nome di app.js */
  ];
  fns.forEach(function (name) {
    try {
      if (typeof window[name] === 'function') window[name]();
    } catch (e) { console.warn(name + ':', e); }
  });
}
