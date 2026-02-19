/* ============================================================
   PROFILO.JS — gestione profilo utente e piano alimentare
   ============================================================ */

function renderProfilo() {
    var el = document.getElementById('profiloContent');
    if (!el) return;

    var html = '';

    /* ---- SEZIONE UTENTE ---- */
    html += '<div class="profilo-section">';
    html += '<div class="profilo-title">👤 Account</div>';

    if (currentUser) {
        html += '<div class="profilo-user-card">';
        if (currentUser.photoURL) {
            html += '<img class="profilo-avatar" src="' + currentUser.photoURL + '" alt="avatar">';
        } else {
            html += '<div class="profilo-avatar-placeholder">👤</div>';
        }
        html += '<div>'
            + '<div class="profilo-user-name">' + (currentUser.displayName || 'Utente') + '</div>'
            + '<div class="profilo-user-email">' + (currentUser.email || '') + '</div>'
            + '<div class="profilo-sync-info">☁️ Dati sincronizzati su cloud</div>'
            + '</div></div>';
        html += '<div style="margin-top:14px;display:flex;gap:8px;">'
            + '<button class="btn btn-warning btn-small" onclick="signOutUser()">🚪 Disconnetti</button>'
            + '<button class="btn btn-secondary btn-small" onclick="manualSync()">🔄 Sincronizza ora</button>'
            + '</div>';
    } else {
        html += '<div class="profilo-noauth-card">'
            + '<div style="font-size:2.5em;margin-bottom:10px;">🔒</div>'
            + '<div style="font-weight:800;font-size:.95em;margin-bottom:6px;">Non sei connesso</div>'
            + '<p style="font-size:.82em;color:var(--text-light);margin-bottom:14px;">Accedi per sincronizzare i dati su tutti i dispositivi</p>'
            + '<button class="btn btn-primary" onclick="signInWithGoogle()">🔑 Accedi con Google</button>'
            + '</div>';
    }
    html += '</div>';

    /* ---- SEZIONE PIANO ALIMENTARE ---- */
    html += '<div class="profilo-section">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
        + '<div class="profilo-title" style="margin:0;">🥗 Piano alimentare</div>'
        + '<div style="display:flex;gap:6px;">'
        + '<button class="btn btn-small btn-primary" onclick="importaPianoAlimentare()">📥 Importa PDF</button>'
        + '<button class="btn btn-small btn-secondary" onclick="resetMealPlanToDefault()">🔄 Reset</button>'
        + '</div></div>';

    var mealDefs = [
        { key: 'colazione', label: '☕ Colazione',  icon: '☕' },
        { key: 'spuntino',  label: '🍎 Spuntino',   icon: '🍎' },
        { key: 'pranzo',    label: '🍽 Pranzo',     icon: '🍽' },
        { key: 'merenda',   label: '🥪 Merenda',    icon: '🥪' },
        { key: 'cena',      label: '🌙 Cena',       icon: '🌙' }
    ];

    mealDefs.forEach(function (md) {
        var mp = mealPlan[md.key] || {};
        html += buildProfiloMealSection(md, mp);
    });

    html += '</div>';

    /* ---- SEZIONE DATI & PRIVACY ---- */
    html += '<div class="profilo-section">';
    html += '<div class="profilo-title">⚙️ Dati & Privacy</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    html += '<button class="btn btn-secondary" onclick="exportData()">'
        + '📤 Esporta dati (JSON)</button>';
    html += '<button class="btn btn-secondary" onclick="importDataPrompt()">'
        + '📥 Importa dati (JSON)</button>';
    html += '<button class="btn btn-warning" onclick="clearAllData()">'
        + '🗑 Cancella tutti i dati</button>';
    html += '</div></div>';

    /* ---- SEZIONE INFO APP ---- */
    html += '<div class="profilo-section">';
    html += '<div class="profilo-title">ℹ️ App</div>';
    html += '<div style="font-size:.82em;color:var(--text-light);line-height:1.8;">'
        + '<div>🍃 <b>NutriPlan</b> v1.0</div>'
        + '<div>📅 Piano: ' + (getCurrentDateKey()) + '</div>'
        + '<div>🧺 Ingredienti in dispensa: ' + Object.keys(pantryItems).length + '</div>'
        + '<div>📖 Ricette custom: ' + (customRecipes ? customRecipes.length : 0) + '</div>'
        + '<div>📅 Giorni nello storico: ' + Object.keys(appHistory).length + '</div>'
        + '</div></div>';

    el.innerHTML = html;
}

/* ---- BUILD SEZIONE PASTO ---- */
function buildProfiloMealSection(md, mp) {
    var cats = [
        { key: 'principale', label: 'Principale' },
        { key: 'contorno',   label: 'Contorno'   },
        { key: 'frutta',     label: 'Frutta'      },
        { key: 'extra',      label: 'Extra'       }
    ];

    var totalItems = 0;
    cats.forEach(function (c) {
        totalItems += ((mp[c.key] || []).length);
    });

    var html = '<div class="profilo-meal-section">';
    html += '<div class="profilo-meal-header">'
        + '<div class="profilo-meal-title">' + md.label + '</div>'
        + '<div style="display:flex;gap:5px;align-items:center;">'
        + '<span style="font-size:.74em;color:var(--text-light);">' + totalItems + ' alimenti</span>'
        + '<button class="btn btn-small btn-secondary" onclick="toggleMealEdit(\'' + md.key + '\')" id="editBtn_' + md.key + '">✏️ Modifica</button>'
        + '</div></div>';

    /* Vista lettura */
    html += '<div id="mealView_' + md.key + '">';
    cats.forEach(function (c) {
        var items = mp[c.key] || [];
        if (!items.length) return;
        html += '<div style="margin-bottom:8px;">';
        html += '<div style="font-size:.72em;font-weight:800;color:var(--text-light);'
            + 'text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">'
            + c.label + '</div>';
        items.forEach(function (item) {
            var avail   = checkIngredientAvailability(item);
            var dot     = avail.sufficient ? '🟢' : avail.matched ? '🟡' : '🔴';
            var qtyText = (item.quantity && item.unit)
                ? '<span style="color:var(--text-light);font-size:.85em;"> · ' + item.quantity + ' ' + item.unit + '</span>'
                : '';
            html += '<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;'
                + 'background:var(--bg-light);border-radius:8px;margin-bottom:3px;">'
                + '<span style="font-size:.85em;">' + dot + '</span>'
                + '<span style="font-size:.86em;font-weight:600;">' + item.name + '</span>'
                + qtyText
                + '</div>';
        });
        html += '</div>';
    });

    if (!totalItems) {
        html += '<div class="profilo-empty-meal">Nessun alimento impostato per questo pasto.</div>';
    }
    html += '</div>';

    /* Vista modifica (nascosta) */
    html += '<div id="mealEdit_' + md.key + '" style="display:none;">';
    cats.forEach(function (c) {
        html += '<div style="margin-bottom:12px;">';
        html += '<div style="font-size:.74em;font-weight:800;color:var(--text-mid);'
            + 'text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">'
            + c.label + '</div>';
        html += '<div id="editList_' + md.key + '_' + c.key + '">';
        (mp[c.key] || []).forEach(function (item, idx) {
            html += buildProfiloItemRow(md.key, c.key, item, idx);
        });
        html += '</div>';
        html += '<button class="btn btn-secondary btn-small" style="margin-top:4px;"'
            + ' onclick="addProfiloItem(\'' + md.key + '\',\'' + c.key + '\')">'
            + '＋ Aggiungi ' + c.label.toLowerCase() + '</button>';
        html += '</div>';
    });
    html += '<div style="display:flex;gap:6px;margin-top:8px;">'
        + '<button class="btn btn-primary btn-small" onclick="saveMealEdit(\'' + md.key + '\')">💾 Salva</button>'
        + '<button class="btn btn-secondary btn-small" onclick="cancelMealEdit(\'' + md.key + '\')">Annulla</button>'
        + '</div>';
    html += '</div>';

    html += '</div>';
    return html;
}

/* ---- RIGA ITEM MODIFICA ---- */
function buildProfiloItemRow(mealKey, catKey, item, idx) {
    var units = ['g','ml','pz','fette','cucchiai','cucchiaini','porzione'];
    var unitOpts = units.map(function (u) {
        return '<option value="' + u + '"' + (item.unit === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');

    return '<div class="profilo-item-row" id="prow_' + mealKey + '_' + catKey + '_' + idx + '">'
        + '<input type="text" class="form-input profilo-item-name"'
        + ' value="' + escQ2(item.name || '') + '"'
        + ' placeholder="Nome alimento"'
        + ' id="pname_' + mealKey + '_' + catKey + '_' + idx + '">'
        + '<input type="number" class="form-input" style="width:70px;flex:none;" min="0" step="any"'
        + ' value="' + (item.quantity || '') + '"'
        + ' placeholder="Qtà"'
        + ' id="pqty_' + mealKey + '_' + catKey + '_' + idx + '">'
        + '<select class="form-input" style="width:90px;flex:none;"'
        + ' id="punit_' + mealKey + '_' + catKey + '_' + idx + '">'
        + unitOpts + '</select>'
        + '<button class="btn btn-warning btn-small" style="flex:none;padding:6px 10px;"'
        + ' onclick="removeProfiloItem(\'' + mealKey + '\',\'' + catKey + '\',' + idx + ')">🗑</button>'
        + '</div>';
}

/* ---- TOGGLE MODIFICA ---- */
function toggleMealEdit(mealKey) {
    var viewEl = document.getElementById('mealView_' + mealKey);
    var editEl = document.getElementById('mealEdit_' + mealKey);
    var btnEl  = document.getElementById('editBtn_' + mealKey);
    if (!viewEl || !editEl) return;
    var isEditing = editEl.style.display !== 'none';
    if (isEditing) {
        cancelMealEdit(mealKey);
    } else {
        viewEl.style.display = 'none';
        editEl.style.display = 'block';
        if (btnEl) btnEl.textContent = '✕ Chiudi';
    }
}

function cancelMealEdit(mealKey) {
    var viewEl = document.getElementById('mealView_' + mealKey);
    var editEl = document.getElementById('mealEdit_' + mealKey);
    var btnEl  = document.getElementById('editBtn_' + mealKey);
    if (viewEl) viewEl.style.display = 'block';
    if (editEl) editEl.style.display = 'none';
    if (btnEl)  btnEl.textContent = '✏️ Modifica';
}

/* ---- AGGIUNGI / RIMUOVI ITEM ---- */
function addProfiloItem(mealKey, catKey) {
    if (!mealPlan[mealKey]) mealPlan[mealKey] = {};
    if (!mealPlan[mealKey][catKey]) mealPlan[mealKey][catKey] = [];
    var idx = mealPlan[mealKey][catKey].length;
    mealPlan[mealKey][catKey].push({ name: '', quantity: '', unit: 'g' });

    var listEl = document.getElementById('editList_' + mealKey + '_' + catKey);
    if (listEl) {
        var div = document.createElement('div');
        div.innerHTML = buildProfiloItemRow(mealKey, catKey, { name: '', quantity: '', unit: 'g' }, idx);
        listEl.appendChild(div.firstChild);
    }
    /* Focus sul nuovo campo */
    setTimeout(function () {
        var inp = document.getElementById('pname_' + mealKey + '_' + catKey + '_' + idx);
        if (inp) inp.focus();
    }, 50);
}

function removeProfiloItem(mealKey, catKey, idx) {
    var rowEl = document.getElementById('prow_' + mealKey + '_' + catKey + '_' + idx);
    if (rowEl) rowEl.remove();
}

/* ---- SALVA MODIFICA ---- */
function saveMealEdit(mealKey) {
    var cats = ['principale', 'contorno', 'frutta', 'extra'];
    if (!mealPlan[mealKey]) mealPlan[mealKey] = {};

    cats.forEach(function (catKey) {
        var listEl = document.getElementById('editList_' + mealKey + '_' + catKey);
        if (!listEl) return;

        var rows = listEl.querySelectorAll('.profilo-item-row');
        var items = [];
        rows.forEach(function (row) {
            var idParts = row.id.split('_'); // prow_mealKey_catKey_idx
            var idx = idParts[idParts.length - 1];
            var nameEl = document.getElementById('pname_' + mealKey + '_' + catKey + '_' + idx);
            var qtyEl  = document.getElementById('pqty_'  + mealKey + '_' + catKey + '_' + idx);
            var unitEl = document.getElementById('punit_' + mealKey + '_' + catKey + '_' + idx);
            if (!nameEl) return;
            var name = nameEl.value.trim();
            if (!name) return;
            items.push({
                name:     name,
                quantity: qtyEl  ? parseFloat(qtyEl.value)  || null : null,
                unit:     unitEl ? unitEl.value : 'g'
            });
        });
        mealPlan[mealKey][catKey] = items;
    });

    saveData();
    cancelMealEdit(mealKey);
    renderProfilo();
    renderMealPlan();
    alert('✅ Piano aggiornato!');
}

/* ---- IMPORTA PDF ---- */
function importaPianoAlimentare() {
    if (typeof importPianoPDF === 'function') {
        importPianoPDF();
    } else {
        alert('Funzione di importazione PDF non disponibile.\nAssicurati che il file pdf.js sia caricato.');
    }
}

/* ---- SYNC MANUALE ---- */
function manualSync() {
    if (!firebaseReady || !currentUser) {
        alert('Non sei connesso. Accedi prima con Google.');
        return;
    }
    showCloudStatus('saving');
    var ref = firebase.database().ref('users/' + currentUser.uid + '/nutriplan');
    ref.set(buildSaveObject()).then(function () {
        showCloudStatus('synced');
        alert('✅ Sincronizzazione completata!');
    }).catch(function (e) {
        showCloudStatus('local');
        alert('❌ Errore sincronizzazione: ' + e.message);
    });
}

/* ---- EXPORT / IMPORT / CLEAR ---- */
function exportData() {
    var obj  = buildSaveObject();
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'nutriplan_backup_' + getCurrentDateKey() + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importDataPrompt() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var data = JSON.parse(ev.target.result);
                applyLoadedData(data);
                saveData();
                refreshAllAppViews();
                renderProfilo();
                alert('✅ Dati importati correttamente!');
            } catch (err) {
                alert('❌ File non valido: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    if (!confirm('⚠️ Sei sicuro di voler cancellare TUTTI i dati?\nQuesta azione è irreversibile.')) return;
    if (!confirm('CONFERMA: cancellare tutto?')) return;
    localStorage.removeItem(STORAGE_KEY);
    pantryItems       = {};
    savedFridges      = {};
    appHistory        = {};
    customRecipes     = [];
    customIngredients = [];
    spesaItems        = [];
    mealPlan          = JSON.parse(JSON.stringify(defaultMealPlan));
    Object.keys(weeklyLimits).forEach(function (k) { weeklyLimits[k].current = 0; });
    saveData();
    refreshAllAppViews();
    renderProfilo();
    alert('✅ Dati cancellati.');
}

/* ---- UTILITY ---- */
function escQ2(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
