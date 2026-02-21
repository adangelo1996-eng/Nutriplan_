/* ============================================================
   RICETTE_CUSTOM.JS — gestione ricette personalizzate
   ============================================================ */

var editingRecipeIdx = null;

/* ---- RENDER LISTA ---- */
function renderCustomRicette() {
    var el = document.getElementById('customRicetteList');
    if (!el) return;

    if (!customRecipes || !customRecipes.length) {
        el.innerHTML = '<div class="empty-state">'
            + '<div class="empty-state-icon">⭐</div>'
            + '<h3>Nessuna ricetta personale</h3>'
            + '<p>Crea la tua prima ricetta con il tasto <b>＋ Nuova</b>.</p>'
            + '</div>';
        return;
    }

    el.innerHTML = customRecipes.map(function (r, idx) {
        return buildCustomRicettaItem(r, idx);
    }).join('');
}

/* ---- BUILD ITEM ---- */
function buildCustomRicettaItem(r, idx) {
    var name  = r.nome || r.name || 'Ricetta';
    var icon  = r.icon || r.icona || '⭐';
    var pasto = r.pasto || '';
    var ings  = r.ingredienti || [];
    var prep  = r.preparazione || '';

    var ingList = ings.map(function (i) {
        var qty = i.quantity ? i.quantity + ' ' + (i.unit || '') : '';
        return (i.name || '') + (qty ? ' (' + qty + ')' : '');
    }).join(', ');

    return '<div class="custom-ricetta-item">'
        + '<div class="custom-ricetta-header">'
        + '<div>'
        + '<div class="custom-ricetta-name">' + icon + ' ' + name + '</div>'
        + '<div class="custom-ricetta-meta" style="margin-top:3px;">'
        + (pasto ? '<span class="rcb rcb-pasto" style="font-size:.7em;">' + capFirst(pasto) + '</span>' : '')
        + '<span class="rcb rcb-custom" style="font-size:.7em;margin-left:4px;">'
        + ings.length + ' ingredienti</span>'
        + '</div>'
        + '</div>'
        + '<div class="custom-ricetta-actions">'
        + '<button class="btn btn-small btn-secondary"'
        + ' onclick="openRecipeModal(\'' + escRQ2(name) + '\')">👁 Vedi</button>'
        + '<button class="btn btn-small btn-secondary"'
        + ' onclick="editRicettaCustom(' + idx + ')">✏️</button>'
        + '<button class="btn btn-small btn-warning"'
        + ' onclick="deleteRicettaCustom(' + idx + ')">🗑</button>'
        + '</div></div>'
        + (ingList
            ? '<div class="custom-ricetta-ings">🥗 ' + ingList + '</div>'
            : '')
        + (prep
            ? '<div class="custom-ricetta-prep">'
            + truncate(prep, 120) + '</div>'
            : '')
        + '</div>';
}

/* ---- FORM NUOVA / MODIFICA ---- */
function openRicettaForm(idx) {
    editingRecipeIdx = (idx !== undefined && idx !== null) ? idx : null;
    var modal  = document.getElementById('ricettaFormModal');
    var title  = document.getElementById('ricettaFormTitle');
    var nome   = document.getElementById('rfNome');
    var pasto  = document.getElementById('rfPasto');
    var prep   = document.getElementById('rfPreparazione');
    var ingList = document.getElementById('rfIngredientiList');
    if (!modal) return;

    /* Reset */
    if (nome)    nome.value  = '';
    if (pasto)   pasto.value = 'pranzo';
    if (prep)    prep.value  = '';
    if (ingList) ingList.innerHTML = '';

    if (editingRecipeIdx !== null && customRecipes[editingRecipeIdx]) {
        var r = customRecipes[editingRecipeIdx];
        if (title)  title.textContent  = '✏️ Modifica ricetta';
        if (nome)   nome.value  = r.nome  || r.name  || '';
        if (pasto)  pasto.value = r.pasto || 'pranzo';
        if (prep)   prep.value  = r.preparazione || '';
        /* Carica ingredienti */
        (r.ingredienti || []).forEach(function (ing) {
            appendRfIngRow(ing.name || '', ing.quantity || '', ing.unit || 'g');
        });
    } else {
        if (title) title.textContent = '⭐ Nuova ricetta';
        appendRfIngRow('', '', 'g');
    }

    modal.classList.add('active');
}

function closeRicettaForm() {
    var m = document.getElementById('ricettaFormModal');
    if (m) m.classList.remove('active');
    editingRecipeIdx = null;
}

/* ---- RIGA INGREDIENTE NEL FORM ---- */
function addRfIngrediente() {
    appendRfIngRow('', '', 'g');
}

function appendRfIngRow(name, qty, unit) {
    var list = document.getElementById('rfIngredientiList');
    if (!list) return;

    var units = ['g','ml','pz','fette','cucchiai','cucchiaini','porzione','kg','l'];
    var unitOpts = units.map(function (u) {
        return '<option value="' + u + '"' + (unit === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');

    var idx = list.children.length;
    var div = document.createElement('div');
    div.className = 'rf-ing-row';
    div.id = 'rfrow_' + idx;
    div.innerHTML =
        '<input type="text" class="form-input rf-ing-name" placeholder="Ingrediente"'
        + ' list="ingredientiAutocomplete" autocomplete="off"'
        + ' oninput="if(typeof populateIngAutocomplete===\'function\')populateIngAutocomplete()"'
        + ' value="' + escHTML(name) + '" id="rfname_' + idx + '">'
        + '<input type="number" class="form-input rf-ing-qty" placeholder="Qtà" min="0" step="any"'
        + ' value="' + (qty || '') + '" id="rfqty_' + idx + '">'
        + '<select class="form-input rf-ing-unit" id="rfunit_' + idx + '">'
        + unitOpts + '</select>'
        + '<button class="btn btn-warning btn-small" style="flex:none;padding:6px 9px;"'
        + ' onclick="removeRfRow(' + idx + ')">🗑</button>';
    list.appendChild(div);

    /* Focus sul nuovo campo nome */
    setTimeout(function () {
        var inp = document.getElementById('rfname_' + idx);
        if (inp) inp.focus();
    }, 40);
}

function removeRfRow(idx) {
    var row = document.getElementById('rfrow_' + idx);
    if (row) row.remove();
}

/* ---- SALVA RICETTA CUSTOM ---- */
function saveRicettaCustom() {
    var nome  = (document.getElementById('rfNome')  || {}).value || '';
    var pasto = (document.getElementById('rfPasto') || {}).value || 'pranzo';
    var prep  = (document.getElementById('rfPreparazione') || {}).value || '';
    nome = nome.trim();

    if (!nome) {
        alert('Inserisci il nome della ricetta.');
        document.getElementById('rfNome').focus();
        return;
    }

    /* Raccogli ingredienti */
    var ingList = document.getElementById('rfIngredientiList');
    var ings    = [];
    if (ingList) {
        var rows = ingList.querySelectorAll('.rf-ing-row');
        rows.forEach(function (row) {
            var idParts = row.id.split('_');
            var idx     = idParts[idParts.length - 1];
            var nameEl  = document.getElementById('rfname_' + idx);
            var qtyEl   = document.getElementById('rfqty_'  + idx);
            var unitEl  = document.getElementById('rfunit_' + idx);
            if (!nameEl) return;
            var n = (nameEl.value || '').trim();
            if (!n) return;
            ings.push({
                name:     n,
                quantity: qtyEl  ? (parseFloat(qtyEl.value) || null) : null,
                unit:     unitEl ? unitEl.value : 'g'
            });
        });
    }

    /* Genera icona automatica dal pasto */
    var iconMap = {
        colazione: '☕', spuntino: '🍎',
        pranzo: '🍽', merenda: '🥪', cena: '🌙'
    };
    var icon = iconMap[pasto] || '⭐';

    var ricetta = {
        nome:          nome,
        name:          nome,
        icon:          icon,
        pasto:         pasto,
        ingredienti:   ings,
        preparazione:  prep.trim(),
        isCustom:      true
    };

    if (!customRecipes) customRecipes = [];

    if (editingRecipeIdx !== null && editingRecipeIdx >= 0) {
        customRecipes[editingRecipeIdx] = ricetta;
    } else {
        /* Controlla duplicato */
        var dup = customRecipes.findIndex(function (r) {
            return (r.nome || r.name || '').toLowerCase() === nome.toLowerCase();
        });
        if (dup !== -1) {
            if (!confirm('Esiste già una ricetta con questo nome. Sovrascrivere?')) return;
            customRecipes[dup] = ricetta;
        } else {
            customRecipes.push(ricetta);
        }
    }

    saveData();
    closeRicettaForm();
    renderCustomRicette();
    /* Aggiorna anche il catalogo se visibile */
    renderRicetteGrid();
    alert('✅ Ricetta "' + nome + '" salvata!');
}

/* ---- EDIT / DELETE ---- */
function editRicettaCustom(idx) {
    openRicettaForm(idx);
}

function deleteRicettaCustom(idx) {
    var name = customRecipes[idx]
        ? (customRecipes[idx].nome || customRecipes[idx].name || 'questa ricetta')
        : 'questa ricetta';
    if (!confirm('Eliminare la ricetta "' + name + '"?')) return;
    customRecipes.splice(idx, 1);
    saveData();
    renderCustomRicette();
    renderRicetteGrid();
}

/* ---- UTILITY ---- */
function truncate(str, max) {
    if (!str) return '';
    return str.length <= max ? str : str.slice(0, max) + '…';
}

function capFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function escRQ2(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function escHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
