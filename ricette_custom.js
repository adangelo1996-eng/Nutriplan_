/* ============================================================
   RICETTE_CUSTOM.JS — gestione ricette personalizzate
   v2 — Grid style matching catalogo
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

    /* Grid layout come il catalogo */
    var html = '<div class="rc-grid">';
    customRecipes.forEach(function(r, idx) {
        html += buildCustomRicettaCard(r, idx);
    });
    html += '</div>';
    el.innerHTML = html;
}

/* ---- BUILD CARD (stile catalogo) ---- */
function buildCustomRicettaCard(r, idx) {
    if (!r) return '';
    var name       = safeStr(r.nome || r.name || 'Ricetta');
    var icon       = safeStr(r.icon || r.icona || '⭐');
    var ings       = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    var prep       = safeStr(r.preparazione || '');
    var pLabel     = pastoLabel(r.pasto);
    var color      = pastoColor(r.pasto);
    var tot        = ings.length;
    var avail      = countAvailable(ings);
    var pct        = tot ? Math.round((avail/tot)*100) : 0;
    var isFav      = isFavorito(name);
    var fridgeKeys = getFridgeKeys();
    var pianoNames = getPianoAlimentareIngNames();
    var hasExtraCheck = pianoNames.length > 0;
    var extraCount = countExtraPiano(ings);

    /* stato badge */
    var stateCls = pct >= 80 ? 'badge-ok' : pct >= 40 ? 'badge-warn' : 'badge-grey';
    var stateTxt = pct >= 80 ? '✔ Disponibile' : pct >= 40 ? '◑ Parziale' : '○ Da acquistare';

    /* badge extra piano */
    var extraBadge = '';
    if (hasExtraCheck && extraCount > 0) {
        extraBadge = '<span class="rc-badge badge-extra">⚠ ' + extraCount + ' extra piano</span>';
    } else if (hasExtraCheck && extraCount === 0 && tot > 0) {
        extraBadge = '<span class="rc-badge badge-inpiano">✓ Nel piano</span>';
    }

    /* accordion ingredienti */
    var accHtml = '';
    if (ings.length) {
        accHtml += '<ul class="rc-acc-list">';
        ings.forEach(function(ing) {
            var n       = safeStr(ing.name || ing.nome);
            var nl      = n.toLowerCase().trim();
            var ok      = fridgeKeys.some(function(k) {
                var kl = k.toLowerCase().trim();
                return kl === nl || kl.includes(nl) || nl.includes(kl);
            });
            var extra   = hasExtraCheck && isIngExtraPiano(n);
            var qty = (ing.quantity || ing.quantita)
                ? '<span class="rc-acc-qty">' + safeStr(ing.quantity || ing.quantita) +
                  '\u00a0' + safeStr(ing.unit || ing.unita) + '</span>'
                : '';
            accHtml += '<li class="rc-acc-item' + (ok ? ' ok' : '') + (extra ? ' extra-piano' : '') + '">' +
                '<span class="rc-acc-dot"></span>' +
                '<span class="rc-acc-name">' + n + '</span>' +
                qty +
                (extra ? '<span class="rc-acc-extra-tag">extra</span>' : '') +
                '</li>';
        });
        accHtml += '</ul>';
        accHtml += '<div style="display:flex;gap:8px;margin-top:2px;">' +
            '<button class="rc-detail-btn" style="flex:1;" ' +
            'onclick="event.stopPropagation();openRecipeModal(\'' + esc(name) + '\')">Preparazione →</button>' +
            '<button class="rc-detail-btn" style="background:#fde8e8;color:#dc2626;white-space:nowrap;" ' +
            'onclick="event.stopPropagation();deleteCustomRicetta(' + idx + ')">🗑 Elimina</button>' +
            '<button class="rc-detail-btn" style="background:#e0f2fe;color:#0369a1;white-space:nowrap;" ' +
            'onclick="event.stopPropagation();editCustomRicetta(' + idx + ')">✏️ Modifica</button>' +
            '</div>';
    }

    return (
        '<div class="rc-card rc-custom" ' +
        'style="--cc:' + color + '" ' +
        'onclick="toggleRicettaCard(this,\'' + esc(name) + '\')" ' +
        'data-name="' + esc(name) + '">' +

        /* Header card */
        '<div class="rc-card-head">' +
            '<div class="rc-icon-wrap">' + icon + '</div>' +
            '<div class="rc-info">' +
                '<div class="rc-name">' + name + '</div>' +
                '<div class="rc-meta">' +
                    (pLabel ? '<span class="rc-pasto" style="color:' + color + '">' + pLabel + '</span>' : '') +
                    '<span class="rc-badge">⭐ Mia</span>' +
                    '<span class="rc-badge ' + stateCls + '">' + stateTxt + '</span>' +
                    extraBadge +
                '</div>' +
            '</div>' +
            /* Stella preferiti */
            '<button class="fav-btn' + (isFav ? ' fav-on' : '') + '" ' +
                'onclick="toggleFavorito(\'' + esc(name) + '\',event)" ' +
                'title="' + (isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti') + '" ' +
                'aria-label="' + (isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti') + '">' +
                (isFav ? '★' : '☆') +
            '</button>' +
            '<span class="rc-chevron">' +
                '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
                    '<path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
                '</svg>' +
            '</span>' +
        '</div>' +

        /* Accordion */
        (accHtml ? '<div class="rc-accordion"><div class="rc-accordion-inner">' + accHtml + '</div></div>' : '') +

        '</div>'
    );
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
    if (typeof renderRicetteGrid === 'function') renderRicetteGrid();
    alert('✅ Ricetta "' + nome + '" salvata!');
}

/* ---- EDIT / DELETE ---- */
function editCustomRicetta(idx) {
    openRicettaForm(idx);
}

function deleteCustomRicetta(idx) {
    var name = customRecipes[idx]
        ? (customRecipes[idx].nome || customRecipes[idx].name || 'questa ricetta')
        : 'questa ricetta';
    if (!confirm('Eliminare la ricetta "' + name + '"?')) return;
    customRecipes.splice(idx, 1);
    saveData();
    renderCustomRicette();
    if (typeof renderRicetteGrid === 'function') renderRicetteGrid();
}

/* ---- UTILITY ---- */
function safeStr(v) { return v == null ? '' : String(v); }
function truncate(str, max) {
    if (!str) return '';
    return str.length <= max ? str : str.slice(0, max) + '…';
}
function capFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
function esc(v) {
    return String(v == null ? '' : v)
        .replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
function escHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/* Helper functions from ricette.js (needed for rendering) */
function pastoLabel(p) {
    var map = { colazione:'☀️ Colazione', spuntino:'🍎 Spuntino',
                pranzo:'🍽 Pranzo', merenda:'🥪 Merenda', cena:'🌙 Cena' };
    if (!p) return '';
    if (Array.isArray(p)) return p.filter(Boolean).map(function(k){ return map[k]||k; }).join(' · ');
    return map[p] || p;
}

function pastoColor(p) {
    var first = Array.isArray(p) ? p[0] : p;
    return { colazione:'#f59e0b', spuntino:'#10b981', pranzo:'#3d8b6f',
             merenda:'#8b5cf6', cena:'#3b82f6' }[first] || 'var(--primary)';
}

function getFridgeKeys() {
    if (typeof pantryItems === 'undefined' || !pantryItems) return [];
    return Object.keys(pantryItems).filter(function(k){
        return k && k !== 'undefined' && pantryItems[k] && (pantryItems[k].quantity||0) > 0;
    });
}

function countAvailable(ings) {
    var keys = getFridgeKeys();
    if (!keys.length || !Array.isArray(ings)) return 0;
    return ings.filter(function(ing){
        var n = safeStr(ing.name||ing.nome).toLowerCase().trim();
        return n && keys.some(function(k){
            var kl = k.toLowerCase().trim();
            return kl===n || kl.includes(n) || n.includes(kl);
        });
    }).length;
}

function getPianoAlimentareIngNames() {
    if (typeof pianoAlimentare === 'undefined' || !pianoAlimentare) return [];
    var names = [];
    var seen  = {};
    Object.keys(pianoAlimentare).forEach(function(mealKey) {
        var meal = pianoAlimentare[mealKey];
        if (!meal || typeof meal !== 'object') return;
        Object.keys(meal).forEach(function(catKey) {
            var arr = meal[catKey];
            if (!Array.isArray(arr)) return;
            arr.forEach(function(item) {
                if (item && item.name && !seen[item.name]) {
                    seen[item.name] = true;
                    names.push(item.name.toLowerCase().trim());
                }
                if (Array.isArray(item.alternatives)) {
                    item.alternatives.forEach(function(alt) {
                        if (alt && alt.name && !seen[alt.name]) {
                            seen[alt.name] = true;
                            names.push(alt.name.toLowerCase().trim());
                        }
                    });
                }
            });
        });
    });
    return names;
}

function isIngExtraPiano(ingName) {
    if (!ingName) return false;
    var pianoNames = getPianoAlimentareIngNames();
    if (!pianoNames.length) return false;
    var nl = ingName.toLowerCase().trim();
    return !pianoNames.some(function(pn) {
        return pn === nl || pn.includes(nl) || nl.includes(pn);
    });
}

function countExtraPiano(ings) {
    if (!Array.isArray(ings)) return 0;
    var pianoNames = getPianoAlimentareIngNames();
    if (!pianoNames.length) return 0;
    return ings.filter(function(ing) {
        return isIngExtraPiano(safeStr(ing.name || ing.nome));
    }).length;
}

function isFavorito(name) {
    return Array.isArray(preferiti) && preferiti.indexOf(name) !== -1;
}

function toggleFavorito(name, event) {
    if (event) event.stopPropagation();
    if (!Array.isArray(preferiti)) preferiti = [];
    var idx = preferiti.indexOf(name);
    if (idx === -1) {
        preferiti.push(name);
        if (typeof showToast === 'function') showToast('⭐ "' + name + '" aggiunta ai preferiti', 'success');
    } else {
        preferiti.splice(idx, 1);
        if (typeof showToast === 'function') showToast('☆ "' + name + '" rimossa dai preferiti', 'info');
    }
    if (typeof saveData === 'function') saveData();
    if (typeof renderRicetteGrid === 'function') renderRicetteGrid();
    if (typeof renderAIRicetteTab === 'function') renderAIRicetteTab();
}
