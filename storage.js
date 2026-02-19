/* ============================================================
   STORAGE.JS — salvataggio, caricamento, disponibilità
   ============================================================ */

var STORAGE_KEY = 'nutriplan_v2';

/* Variabili globali app */
var mealPlan          = {};
var pantryItems       = {};
var savedFridges      = {};
var appHistory        = {};
var customRecipes     = [];
var customIngredients = [];
var spesaItems        = [];
var spesaLastGenerated = null;
var selectedDateKey   = getCurrentDateKey();

/* ============================================================
   INIT
   ============================================================ */
function initStorage() {
    loadData();

    /* Se mealPlan è vuoto applica il default */
    if (!mealPlan || !Object.keys(mealPlan).length) {
        mealPlan = JSON.parse(JSON.stringify(defaultMealPlan));
    }
    /* Assicura che tutte le chiavi del piano esistano */
    ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
        if (!mealPlan[mk]) mealPlan[mk] = {};
        ['principale','contorno','frutta','extra'].forEach(function (cat) {
            if (!Array.isArray(mealPlan[mk][cat])) mealPlan[mk][cat] = [];
        });
    });

    /* Assicura limiti settimanali */
    Object.keys(weeklyLimits).forEach(function (k) {
        if (weeklyLimits[k].current === undefined) weeklyLimits[k].current = 0;
    });
}

/* ============================================================
   LOAD / SAVE
   ============================================================ */
function loadData() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        var data = JSON.parse(raw);
        applyLoadedData(data);
    } catch (e) {
        console.warn('Errore caricamento dati:', e);
    }
}

function applyLoadedData(data) {
    if (!data) return;
    if (data.mealPlan)          mealPlan          = data.mealPlan;
    if (data.pantryItems)       pantryItems       = data.pantryItems;
    if (data.savedFridges)      savedFridges      = data.savedFridges;
    if (data.appHistory)        appHistory        = data.appHistory;
    if (data.customRecipes)     customRecipes     = data.customRecipes;
    if (data.customIngredients) customIngredients = data.customIngredients;
    if (data.spesaItems)        spesaItems        = data.spesaItems;
    if (data.spesaLastGenerated) spesaLastGenerated = data.spesaLastGenerated;
    if (data.weeklyLimits) {
        Object.keys(data.weeklyLimits).forEach(function (k) {
            if (weeklyLimits[k]) {
                weeklyLimits[k].current = data.weeklyLimits[k].current || 0;
            }
        });
    }
}

function buildSaveObject() {
    var limitsToSave = {};
    Object.keys(weeklyLimits).forEach(function (k) {
        limitsToSave[k] = { current: weeklyLimits[k].current };
    });
    return {
        mealPlan:          mealPlan,
        pantryItems:       pantryItems,
        savedFridges:      savedFridges,
        appHistory:        appHistory,
        customRecipes:     customRecipes,
        customIngredients: customIngredients,
        spesaItems:        spesaItems,
        spesaLastGenerated: spesaLastGenerated,
        weeklyLimits:      limitsToSave
    };
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSaveObject()));
        syncToCloud();
    } catch (e) {
        console.warn('Errore salvataggio:', e);
    }
}

/* ============================================================
   SYNC FIREBASE
   ============================================================ */
var syncTimeout = null;
function syncToCloud() {
    if (!firebaseReady || !currentUser) {
        showCloudStatus('local');
        return;
    }
    showCloudStatus('saving');
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(function () {
        firebase.database()
            .ref('users/' + currentUser.uid + '/nutriplan')
            .set(buildSaveObject())
            .then(function () { showCloudStatus('synced'); })
            .catch(function ()  { showCloudStatus('local');  });
    }, 1500);
}

function loadFromCloud(uid) {
    firebase.database()
        .ref('users/' + uid + '/nutriplan')
        .once('value')
        .then(function (snap) {
            var data = snap.val();
            if (data) {
                applyLoadedData(data);
                /* Assicura struttura piano */
                ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
                    if (!mealPlan[mk]) mealPlan[mk] = {};
                    ['principale','contorno','frutta','extra'].forEach(function (cat) {
                        if (!Array.isArray(mealPlan[mk][cat])) mealPlan[mk][cat] = [];
                    });
                });
                saveData();
                refreshAllAppViews();
            }
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
function getDayData(dateKey) {
    if (!dateKey) dateKey = getCurrentDateKey();
    if (!appHistory[dateKey]) {
        appHistory[dateKey] = {
            usedItems:     {},
            substitutions: {}
        };
    }
    return appHistory[dateKey];
}

function getCurrentDateKey() {
    var d = new Date();
    return d.getFullYear() + '-'
        + String(d.getMonth() + 1).padStart(2, '0') + '-'
        + String(d.getDate()).padStart(2, '0');
}

function resetWeek() {
    if (!confirm('Resettare tutti i limiti settimanali?')) return;
    Object.keys(weeklyLimits).forEach(function (k) {
        weeklyLimits[k].current = 0;
    });
    saveData();
    renderLimitsGrid();
    alert('✅ Limiti settimanali resettati!');
}

function renderLimitsGrid() {
    var el = document.getElementById('limitsGrid');
    if (!el) return;

    if (!weeklyLimits || !Object.keys(weeklyLimits).length) {
        el.innerHTML = '<p style="color:var(--text-light);font-size:.85em;">Nessun limite configurato.</p>';
        return;
    }

    var html = '';
    Object.keys(weeklyLimits).forEach(function (key) {
        var data = weeklyLimits[key];
        var pct  = Math.min(Math.round(((data.current || 0) / data.max) * 100), 100);
        var cls  = pct >= 100 ? 'exceeded' : pct >= 70 ? 'warning' : '';
        html += '<div class="limit-card">'
            + '<div class="limit-card-icon">'  + (data.icon || '') + '</div>'
            + '<div class="limit-card-name">'  + key + '</div>'
            + '<div class="limit-progress-bar">'
            + '<div class="limit-progress-fill ' + cls + '" style="width:' + pct + '%"></div>'
            + '</div>'
            + '<div class="limit-text ' + cls + '">'
            + (data.current || 0) + '/' + data.max + ' ' + (data.unit || '') + '</div>'
            + '</div>';
    });
    el.innerHTML = html;
}

/* ============================================================
   CHECK DISPONIBILITÀ INGREDIENTE
   ============================================================ */
function checkIngredientAvailability(item) {
    var NONE = {
        matched:          false,
        sufficient:       false,
        available:        0,
        availableUnit:    '',
        pantryName:       '',
        incompatibleUnits: false
    };

    /* Guard: item o name mancante */
    if (!item || !item.name || typeof item.name !== 'string') return NONE;

    var nl = item.name.toLowerCase().trim();
    if (!nl) return NONE;

    /* Cerca in pantryItems */
    var matchedKey = null;
    var keys = Object.keys(pantryItems);
    for (var i = 0; i < keys.length; i++) {
        var k  = keys[i];
        var kl = (k || '').toLowerCase().trim();
        if (!kl) continue;
        if (kl === nl || kl.includes(nl) || nl.includes(kl)) {
            matchedKey = k;
            break;
        }
    }

    if (!matchedKey) return NONE;

    var pd  = pantryItems[matchedKey] || {};
    var qty = pd.quantity || 0;
    var pu  = (pd.unit || 'g').trim();

    /* Nessuna quantità richiesta: basta che esista */
    if (!item.quantity || !item.unit) {
        return {
            matched:          true,
            sufficient:       qty > 0,
            available:        qty,
            availableUnit:    pu,
            pantryName:       matchedKey,
            incompatibleUnits: false
        };
    }

    var reqQty  = parseFloat(item.quantity) || 0;
    var reqUnit = (item.unit || 'g').trim();

    /* Unità identiche */
    if (pu.toLowerCase() === reqUnit.toLowerCase()) {
        return {
            matched:          true,
            sufficient:       qty >= reqQty,
            available:        qty,
            availableUnit:    pu,
            pantryName:       matchedKey,
            incompatibleUnits: false
        };
    }

    /* Prova conversione */
    var converted = convertUnit(reqQty, reqUnit, pu);
    if (converted !== null) {
        return {
            matched:          true,
            sufficient:       qty >= converted,
            available:        qty,
            availableUnit:    pu,
            pantryName:       matchedKey,
            incompatibleUnits: false
        };
    }

    /* Unità incompatibili: considera disponibile se qty > 0 */
    return {
        matched:          true,
        sufficient:       qty > 0,
        available:        qty,
        availableUnit:    pu,
        pantryName:       matchedKey,
        incompatibleUnits: true
    };
}

/* ============================================================
   CONVERSIONI UNITÀ
   ============================================================ */
function convertUnit(value, fromUnit, toUnit) {
    if (!fromUnit || !toUnit) return null;
    var f = (fromUnit || '').toLowerCase().trim();
    var t = (toUnit   || '').toLowerCase().trim();
    if (f === t) return value;

    var conversions = unitConversions || {};
    if (conversions[f] && conversions[f][t] !== undefined) {
        return value * conversions[f][t];
    }
    return null;
}

/* ============================================================
   REFRESH VISTE
   ============================================================ */
function refreshAllAppViews() {
    try { renderMealPlan();      } catch(e) { console.warn('renderMealPlan:', e); }
    try { renderPantry();        } catch(e) { console.warn('renderPantry:', e); }
    try { renderFridge();        } catch(e) { console.warn('renderFridge:', e); }
    try { renderRicettePage();   } catch(e) { console.warn('renderRicettePage:', e); }
    try { renderStorico();       } catch(e) { console.warn('renderStorico:', e); }
    try { renderSpesa();         } catch(e) { console.warn('renderSpesa:', e); }
    try { renderStatistiche();   } catch(e) { console.warn('renderStatistiche:', e); }
    try { renderProfilo();       } catch(e) { console.warn('renderProfilo:', e); }
    try { updateSavedFridges();  } catch(e) { console.warn('updateSavedFridges:', e); }
    try { renderLimitsGrid();    } catch(e) { console.warn('renderLimitsGrid:', e); }
}
