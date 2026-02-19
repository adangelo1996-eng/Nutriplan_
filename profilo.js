function renderProfilo() {
    var container = document.getElementById('profiloContent');
    if (!container) return;
    container.innerHTML = renderProfiloAuthSection() + renderProfiloPlanSection();
    if (typeof initIngredientiDatalist === 'function') initIngredientiDatalist();
}

/* ---- SEZIONE AUTH ---- */
function renderProfiloAuthSection() {
    var loggedIn = currentUser !== null;
    var html = '<div class="profilo-section">';
    html += '<h2 class="profilo-title">👤 Account</h2>';

    if (loggedIn) {
        html += '<div class="profilo-user-card">';
        if (currentUser.photoURL) {
            html += '<img class="profilo-avatar" src="' + currentUser.photoURL + '" alt="avatar">';
        } else {
            html += '<div class="profilo-avatar-placeholder">👤</div>';
        }
        html += '<div class="profilo-user-info">';
        html += '<div class="profilo-user-name">' + (currentUser.displayName || 'Utente') + '</div>';
        html += '<div class="profilo-user-email">' + (currentUser.email || '') + '</div>';
        html += '<div class="profilo-sync-info">☁️ Dati sincronizzati su tutti i dispositivi</div>';
        html += '</div></div>';
        html += '<button class="btn btn-secondary" onclick="signOutUser()" style="margin-top:12px;width:100%;">🚪 Disconnetti</button>';
    } else {
        html += '<div class="profilo-noauth-card">';
        html += '<div style="font-size:2.5em;margin-bottom:8px;">🔐</div>';
        html += '<p><strong>Accedi con Google</strong> per sincronizzare i dati su tutti i dispositivi.</p>';
        html += '<p style="font-size:.85em;color:var(--text-light);">Senza accesso i dati sono salvati solo su questo dispositivo.</p>';
        html += '</div>';
        html += '<button class="btn btn-primary" onclick="signInWithGoogle()" style="margin-top:12px;width:100%;">';
        html += '🔑 Accedi con Google</button>';
    }

    html += '</div>';
    return html;
}

/* ---- SEZIONE PIANO ---- */
function renderProfiloPlanSection() {
    var MEAL_LABELS = {
        colazione: '☕ Colazione', spuntino: '🍎 Spuntino',
        pranzo: '🍽️ Pranzo', merenda: '🥪 Merenda', cena: '🌙 Cena'
    };
    var MEALS_ORDER = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
    var UNITS = ['g', 'ml', 'pz', 'cucchiai', 'cucchiaini', 'tazze', 'fette'];

    var html = '<div class="profilo-section">';
    html += '<div class="profilo-section-header">';
    html += '<h2 class="profilo-title">🥗 Piano alimentare</h2>';
    html += '<button class="btn btn-warning btn-small" onclick="confirmResetPlan()">↺ Default</button>';
    html += '</div>';
    html += '<p style="font-size:.85em;color:var(--text-light);margin-bottom:16px;">'
        + 'Modifica gli alimenti e le quantità per ogni pasto. Ricorda di salvare.</p>';

    MEALS_ORDER.forEach(function (meal) {
        var items = (mealPlan[meal] && mealPlan[meal].principale) || [];
        html += '<div class="profilo-meal-section">';
        html += '<div class="profilo-meal-header">';
        html += '<div class="profilo-meal-title">' + MEAL_LABELS[meal] + '</div>';
        html += '<button class="btn btn-secondary btn-small" '
            + 'onclick="addProfiloItem(\'' + meal + '\')">➕</button>';
        html += '</div>';

        if (!items.length) {
            html += '<div class="profilo-empty-meal">Nessun alimento configurato.</div>';
        } else {
            items.forEach(function (item, idx) {
                var esc = (item.label || '').replace(/'/g, "\\'");
                html += '<div class="profilo-item-row" id="profiloItem_' + meal + '_' + idx + '">';
                html += '<input type="text" class="form-input profilo-item-name" value="' + esc + '" '
                    + 'placeholder="Nome alimento" list="ingredientiSuggeriti" '
                    + 'onchange="updateProfiloItem(\'' + meal + '\',' + idx + ',\'label\',this.value)">';
                html += '<input type="number" class="form-input profilo-item-qty" '
                    + 'value="' + (item.qty || 0) + '" min="0" step="any" style="width:70px;" '
                    + 'onchange="updateProfiloItem(\'' + meal + '\',' + idx + ',\'qty\',this.value)">';
                html += '<select class="form-input profilo-item-unit" style="width:70px;" '
                    + 'onchange="updateProfiloItem(\'' + meal + '\',' + idx + ',\'unit\',this.value)">';
                UNITS.forEach(function (u) {
                    html += '<option value="' + u + '"' + (u === (item.unit || 'g') ? ' selected' : '') + '>' + u + '</option>';
                });
                html += '</select>';
                html += '<button class="btn btn-warning btn-small" '
                    + 'onclick="removeProfiloItem(\'' + meal + '\',' + idx + '\')">✕</button>';
                html += '</div>';
            });
        }
        html += '</div>';
    });

    html += '<datalist id="ingredientiSuggeriti"></datalist>';
    html += '<button class="btn btn-primary" onclick="saveProfiloPlan()" '
        + 'style="width:100%;margin-top:16px;font-size:1em;">💾 Salva piano</button>';
    html += '</div>';
    return html;
}

/* ---- AZIONI ---- */
function updateProfiloItem(meal, idx, field, value) {
    if (!mealPlan[meal] || !mealPlan[meal].principale) return;
    var item = mealPlan[meal].principale[idx];
    if (!item) return;
    if (field === 'qty') item.qty = parseFloat(value) || 0;
    else item[field] = value;
}

function addProfiloItem(meal) {
    if (!mealPlan[meal]) mealPlan[meal] = { principale: [] };
    if (!mealPlan[meal].principale) mealPlan[meal].principale = [];
    mealPlan[meal].principale.push({ label: '', qty: 0, unit: 'g' });
    renderProfilo();
    // Scrolla all'ultimo campo aggiunto
    setTimeout(function () {
        var idx = mealPlan[meal].principale.length - 1;
        var el = document.getElementById('profiloItem_' + meal + '_' + idx);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function removeProfiloItem(meal, idx) {
    if (!mealPlan[meal] || !mealPlan[meal].principale) return;
    mealPlan[meal].principale.splice(idx, 1);
    saveData();
    renderProfilo();
    if (typeof renderMealPlan === 'function') renderMealPlan();
}

function saveProfiloPlan() {
    var MEALS_ORDER = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
    MEALS_ORDER.forEach(function (meal) {
        var items = mealPlan[meal] && mealPlan[meal].principale;
        if (!items) return;
        items.forEach(function (item, idx) {
            var nameEl = document.querySelector('#profiloItem_' + meal + '_' + idx + ' .profilo-item-name');
            var qtyEl  = document.querySelector('#profiloItem_' + meal + '_' + idx + ' .profilo-item-qty');
            var unitEl = document.querySelector('#profiloItem_' + meal + '_' + idx + ' .profilo-item-unit');
            if (nameEl) item.label = nameEl.value.trim();
            if (qtyEl)  item.qty   = parseFloat(qtyEl.value) || 0;
            if (unitEl) item.unit  = unitEl.value;
        });
        // Rimuovi righe senza nome
        mealPlan[meal].principale = items.filter(function (i) { return i.label && i.label.trim(); });
    });
    saveData();
    if (typeof renderMealPlan === 'function') renderMealPlan();
    renderProfilo();
    alert('Piano salvato! ✅');
}

function confirmResetPlan() {
    if (!confirm('Ripristinare il piano alimentare predefinito? Le modifiche andranno perse.')) return;
    resetMealPlanToDefault();
    renderProfilo();
    if (typeof renderMealPlan === 'function') renderMealPlan();
    alert('Piano ripristinato al default.');
}

