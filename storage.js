var pantryItems = {};
var savedFridges = {};
var selectedDayIngredients = [];
var currentModalRecipe = null;
var appHistory = {};
var selectedDateKey = '';
var customRecipes = [];
var customIngredients = [];
var mealPlan = {};
var currentUser = null;
var firebaseReady = false;
var spesaItems = [];
var spesaLastGenerated = null;

var STORAGE_KEY = 'nutriplanDataV8';

/* ---- FIREBASE ---- */
function initFirebase() {
    try {
        if (typeof firebase === 'undefined') return;
        if (typeof firebaseConfig === 'undefined' || !firebaseConfig.apiKey) return;
        firebase.initializeApp(firebaseConfig);
        firebaseReady = true;
        firebase.auth().onAuthStateChanged(function (user) {
            currentUser = user;
            if (user) {
                loadFromCloud(function () {
                    refreshAllAppViews();
                });
                updateAuthUI(true, user.displayName, user.photoURL);
            } else {
                updateAuthUI(false, null, null);
            }
        });
    } catch (e) {
        console.warn('Firebase init failed:', e);
    }
}

function signInWithGoogle() {
    if (!firebaseReady) {
        alert('Firebase non configurato. Vedi firebase-config.js');
        return;
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(function (err) {
        alert('Errore login: ' + err.message);
    });
}

function signOutUser() {
    if (!firebaseReady) return;
    firebase.auth().signOut();
}

function saveToCloud() {
    if (!firebaseReady || !currentUser) return;
    var ref = firebase.database().ref('users/' + currentUser.uid + '/nutriplan');
    ref.set(buildSaveObject()).catch(function (e) {
        console.warn('Cloud save error:', e);
    });
}

function loadFromCloud(cb) {
    if (!firebaseReady || !currentUser) { if (cb) cb(); return; }
    var ref = firebase.database().ref('users/' + currentUser.uid + '/nutriplan');
    ref.once('value').then(function (snap) {
        var data = snap.val();
        if (data) applyLoadedData(data);
        if (cb) cb();
    }).catch(function (e) {
        console.warn('Cloud load error:', e);
        if (cb) cb();
    });
}

function updateAuthUI(loggedIn, name, photo) {
    var btn    = document.getElementById('authBtn');
    var info   = document.getElementById('authInfo');
    var avatar = document.getElementById('authAvatar');
    if (!btn) return;
    if (loggedIn) {
        btn.textContent = 'Disconnetti';
        btn.onclick = signOutUser;
        if (info) info.textContent = name || 'Utente';
        if (avatar && photo) { avatar.src = photo; avatar.style.display = 'block'; }
        showCloudStatus('synced');
    } else {
        btn.textContent = 'Accedi con Google';
        btn.onclick = signInWithGoogle;
        if (info) info.textContent = 'Non connesso — dati salvati solo su questo dispositivo';
        if (avatar) avatar.style.display = 'none';
        showCloudStatus('local');
    }
}

function showCloudStatus(status) {
    var el = document.getElementById('cloudStatus');
    if (!el) return;
    if (status === 'synced') {
        el.textContent = '☁️ Sincronizzato';
        el.className = 'cloud-status synced';
    } else if (status === 'saving') {
        el.textContent = '⏳ Salvataggio...';
        el.className = 'cloud-status saving';
    } else {
        el.textContent = '💾 Locale';
        el.className = 'cloud-status local';
    }
}

function refreshAllAppViews() {
    if (typeof renderMealPlan === 'function') renderMealPlan();
    if (typeof renderPantry === 'function') renderPantry();
    if (typeof renderFridge === 'function') renderFridge();
    if (typeof updateLimits === 'function') updateLimits();
    if (typeof buildCalendarBar === 'function') buildCalendarBar();
}

/* ---- LOCALE ---- */
function getCurrentDateKey() {
    var d = new Date();
    return d.getFullYear() + '-'
        + String(d.getMonth() + 1).padStart(2, '0') + '-'
        + String(d.getDate()).padStart(2, '0');
}

function getDayData(dateKey) {
    if (!appHistory[dateKey]) {
        appHistory[dateKey] = { usedItems: {}, substitutions: {} };
    }
    return appHistory[dateKey];
}

/* ---- BUILD / APPLY ---- */
function buildSaveObject() {
    return {
        limits:             weeklyLimits,
        pantry:             pantryItems,
        savedFridges:       savedFridges,
        history:            appHistory,
        customRecipes:      customRecipes,
        customIngredients:  customIngredients,
        mealPlan:           mealPlan,
        spesaItems:         spesaItems,
        spesaLastGenerated: spesaLastGenerated
    };
}

function applyLoadedData(data) {
    if (data.limits) {
        Object.keys(data.limits).forEach(function (k) {
            if (weeklyLimits[k]) Object.assign(weeklyLimits[k], data.limits[k]);
        });
    }
    pantryItems         = data.pantry            || {};
    savedFridges        = data.savedFridges      || {};
    appHistory          = data.history           || {};
    customRecipes       = data.customRecipes     || [];
    customIngredients   = data.customIngredients || [];
    spesaItems          = data.spesaItems        || [];
    spesaLastGenerated  = data.spesaLastGenerated || null;
    mealPlan = data.mealPlan
        ? data.mealPlan
        : JSON.parse(JSON.stringify(defaultMealPlan));

    // Pulisci storico più vecchio di 1 anno
    var cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    Object.keys(appHistory).forEach(function (dk) {
        if (new Date(dk) < cutoff) delete appHistory[dk];
    });
}

function loadData() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try { applyLoadedData(JSON.parse(raw)); } catch (e) {
            mealPlan = JSON.parse(JSON.stringify(defaultMealPlan));
        }
    } else {
        mealPlan = JSON.parse(JSON.stringify(defaultMealPlan));
    }
}

function saveData() {
    var obj = buildSaveObject();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    localStorage.setItem('nutriplanLastMod', new Date().toLocaleString('it-IT'));
    if (firebaseReady && currentUser) {
        showCloudStatus('saving');
        var ref = firebase.database().ref('users/' + currentUser.uid + '/nutriplan');
        ref.set(obj).then(function () {
            showCloudStatus('synced');
        }).catch(function () {
            showCloudStatus('local');
        });
    }
}

function saveMealPlan() { saveData(); }

function resetMealPlanToDefault() {
    mealPlan = JSON.parse(JSON.stringify(defaultMealPlan));
    saveData();
}

/* ---- UTILITY ---- */
function convertUnit(v, from, to) {
    if (from === to) return v;
    if (unitConversions[from] && unitConversions[from][to])
        return v * unitConversions[from][to];
    return null;
}

function checkIngredientAvailability(ing) {
    var nl = ing.name.toLowerCase();
    var result = { matched: false, sufficient: false };
    Object.keys(pantryItems).forEach(function (pName) {
        var pData = pantryItems[pName];
        var pnl   = pName.toLowerCase();
        var match = pnl === nl || pnl.includes(nl) || nl.includes(pnl) ||
            pnl.split(' ').some(function (w) { return w.length > 2 && nl.includes(w); }) ||
            nl.split(' ').some(function (w) { return w.length > 2 && pnl.includes(w); });
        if (!match) return;
        var pQty       = pData.quantity || 0;
        var converted  = convertUnit(pQty, pData.unit, ing.unit);
        var available  = converted !== null ? converted : pQty;
        var sameFamily = converted !== null || pData.unit === ing.unit;
        result = {
            matched: true, pantryName: pName, available: available,
            availableUnit: ing.unit, required: ing.quantity, requiredUnit: ing.unit,
            sufficient: sameFamily && available >= ing.quantity,
            incompatibleUnits: !sameFamily
        };
    });
    return result;
}

function checkAvailByName(name) {
    var nl = name.toLowerCase();
    var found = false;
    Object.keys(pantryItems).forEach(function (pName) {
        var pData = pantryItems[pName];
        var pnl   = pName.toLowerCase();
        var match = pnl === nl || pnl.includes(nl) || nl.includes(pnl) ||
            pnl.split(' ').some(function (w) { return w.length > 2 && nl.includes(w); }) ||
            nl.split(' ').some(function (w) { return w.length > 2 && pnl.includes(w); });
        if (match && (pData.quantity || 0) > 0) found = true;
    });
    return found;
}
