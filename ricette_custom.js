var ricettaEditId = null;
var ricettaMealFilter = 'tutti';
var ricetteSearchQuery = '';
var rfIngCount = 0;

function initIngredientiDatalist() {
    var dl = document.getElementById('ingredientiSuggeriti');
    if (!dl) return;
    var allIngs = typeof getAllIngredients === 'function' ? getAllIngredients() : (allPantryItems || []);
    dl.innerHTML = allIngs.map(function (i) {
        return '<option value="' + i.name + '">';
    }).join('');
}

/* ---- FONTE UNICA DI TUTTE LE RICETTE ---- */
function getAllRecipesFlat() {
    var all = [];
    if (typeof ricette !== 'undefined') {
        Object.keys(ricette).forEach(function (key) {
            var r = ricette[key];
            all.push({
                _id: key, _source: 'builtin',
                nome: r.nome || r.name || key,
                pasto: r.pasto || r.meal || '',
                ingredienti: normalizeIngredients(r.ingredienti || r.ingredients || []),
                istruzioni: r.istruzioni || r.instructions || r.preparazione || '',
                limiti: r.limiti || []
            });
        });
    }
    customRecipes.forEach(function (r) {
        all.push({
            _id: r.id, _source: 'custom',
            nome: r.nome || '',
            pasto: r.pasto || '',
            ingredienti: normalizeIngredients(r.ingredienti || []),
            istruzioni: r.istruzioni || '',
            limiti: r.limiti || []
        });
    });
    return all;
}

function normalizeIngredients(ings) {
    return ings.map(function (i) {
        return {
            nome: i.nome || i.name || i.label || '',
            quantita: i.quantita || i.quantity || i.qty || 0,
            unita: i.unita || i.unit || 'g'
        };
    });
}

/* ---- RENDER PAGINA ---- */
function renderRicettePage() {
    renderCatalogoRicette();
    renderCustomRicette();
    initIngredientiDatalist();
}

function showRicetteTab(tab, btn) {
    document.querySelectorAll('#ricettePage .page-tab-content').forEach(function (c) {
        c.classList.remove('active');
    });
    document.querySelectorAll('#ricettePage .page-tab').forEach(function (t) {
        t.classList.remove('active');
    });
    document.getElementById('ricetteTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    if (btn) btn.classList.add('active');
    if (tab === 'catalogo') renderCatalogoRicette();
    if (tab === 'custom') renderCustomRicette();
}

/* ---- CATALOGO ---- */
function filterRicette(val) {
    ricetteSearchQuery = val;
    var clearBtn = document.getElementById('ricetteClearBtn');
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
    renderCatalogoRicette();
}
function clearRicetteSearch() {
    var input = document.getElementById('ricetteSearch');
    if (input) input.value = '';
    ricetteSearchQuery = '';
    var clearBtn = document.getElementById('ricetteClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    renderCatalogoRicette();
    if (input) input.focus();
}
function setRicetteMealFilter(val, btn) {
    ricettaMealFilter = val;
    document.querySelectorAll('.ricette-filter-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    renderCatalogoRicette();
}

function renderCatalogoRicette() {
    var container = document.getElementById('ricetteCatalogoContent');
    if (!container) return;
    var all = getAllRecipesFlat();
    if (ricettaMealFilter !== 'tutti') {
        all = all.filter(function (r) { return r.pasto === ricettaMealFilter; });
    }
    if (ricetteSearchQuery) {
        var q = ricetteSearchQuery.toLowerCase();
        all = all.filter(function (r) {
            var name = (r.nome || '').toLowerCase();
            var ings = r.ingredienti.map(function (i) { return i.nome.toLowerCase(); }).join(' ');
            return name.includes(q) || ings.includes(q);
        });
    }
    if (!all.length) {
        container.innerHTML = '<div class="ricette-empty"><div style="font-size:2.5em;">🔍</div><p>Nessuna ricetta trovata.</p></div>';
        return;
    }
    container.innerHTML = '<div class="ricette-grid">' + all.map(buildRicettaCard).join('') + '</div>';
}

function buildRicettaCard(r) {
    var name = r.nome || 'Ricetta';
    var pasto = r.pasto || '';
    var ings = r.ingredienti || [];
    var isCustom = r._source === 'custom';
    var pastoLabels = {
        colazione: '☕ Colazione', spuntino: '🍎 Spuntino',
        pranzo: '🍽️ Pranzo', merenda: '🥪 Merenda', cena: '🌙 Cena'
    };
    var pastoLabel = pastoLabels[pasto] || pasto;
    var availCount = 0;
    ings.forEach(function (ing) { if (checkAvailByName(ing.nome)) availCount++; });
    var total = ings.length || 1;
    var pct = Math.round((availCount / total) * 100);
    var availBadge = pct === 100
        ? '<span class="rcb rcb-avail">✓ disponibile</span>'
        : pct >= 50
        ? '<span class="rcb rcb-partial">⚠ ' + pct + '% disponibile</span>'
        : '<span class="rcb rcb-missing">✗ mancanti</span>';
    var ingPreview = ings.slice(0, 4).map(function (i) { return i.nome; }).filter(Boolean).join(', ');
    if (ings.length > 4) ingPreview += ' +' + (ings.length - 4);
    var idEsc = (r._id || '').replace(/'/g, "\\'");

    return '<div class="ricetta-card ' + (isCustom ? 'custom-card' : '') + '" '
        + 'onclick="openRicettaDetail(\'' + idEsc + '\',\'' + r._source + '\')">'
        + '<div class="ricetta-card-head">'
        + '<div class="ricetta-card-icon">' + (isCustom ? '⭐' : '🍽️') + '</div>'
        + '<div class="ricetta-card-info">'
        + '<div class="ricetta-card-name">' + name + '</div>'
        + '<div class="ricetta-card-badges">'
        + '<span class="rcb rcb-pasto">' + pastoLabel + '</span>'
        + (isCustom ? '<span class="rcb rcb-custom">Mia ricetta</span>' : '')
        + availBadge
        + '</div></div></div>'
        + '<div class="ricetta-card-ings">🥦 ' + (ingPreview || 'Nessun ingrediente') + '</div>'
        + '<div class="ricetta-card-footer">'
        + '<span style="font-size:.75em;color:var(--text-light);">'
        + ings.length + ' ingredient' + (ings.length === 1 ? 'e' : 'i') + '</span>'
        + '<div class="ricetta-card-footer-actions">'
        + (isCustom
            ? '<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();editRicettaCustom(\'' + idEsc + '\')">✏️</button>'
            + '<button class="btn btn-warning btn-small" onclick="event.stopPropagation();deleteRicettaCustom(\'' + idEsc + '\')">🗑️</button>'
            : '')
        + '</div></div></div>';
}

function openRicettaDetail(id, source) {
    var r = null;
    if (source === 'custom') {
        r = customRecipes.find(function (x) { return x.id === id; });
    } else if (typeof ricette !== 'undefined') {
        r = ricette[id];
    }
    if (!r) return;
    var norm = {
        nome: r.nome || r.name || 'Ricetta',
        pasto: r.pasto || r.meal || '',
        ingredienti: normalizeIngredients(r.ingredienti || r.ingredients || []),
        istruzioni: r.istruzioni || r.instructions || r.preparazione || ''
    };
    var pastoLabels = {
        colazione: '☕ Colazione', spuntino: '🍎 Spuntino',
        pranzo: '🍽️ Pranzo', merenda: '🥪 Merenda', cena: '🌙 Cena'
    };
    var ingHtml = norm.ingredienti.map(function (ing) {
        var avail = checkAvailByName(ing.nome);
        return '<div class="ingredient-item ' + (avail ? 'ing-available' : 'ing-missing') + '">'
            + '<span class="ingredient-name">' + ing.nome + '</span>'
            + '<span class="ingredient-qty-label ' + (avail ? 'ok' : 'ko') + '">'
            + ing.quantita + ' ' + ing.unita + '</span>'
            + '</div>';
    }).join('');
    document.getElementById('recipeModalTitle').textContent =
        (source === 'custom' ? '⭐' : '🍽️') + ' ' + norm.nome +
        ' — ' + (pastoLabels[norm.pasto] || norm.pasto);
    document.getElementById('recipeModalBody').innerHTML = ingHtml
        + (norm.istruzioni
            ? '<div style="margin-top:14px;padding:12px;background:var(--bg-light);border-radius:10px;'
            + 'font-size:.87em;line-height:1.7;white-space:pre-wrap;">' + norm.istruzioni + '</div>'
            : '');
    document.getElementById('recipeModalSelectBtn').style.display = 'none';
    document.getElementById('recipeModal').classList.add('active');
}

function closeRecipeModal() {
    document.getElementById('recipeModal').classList.remove('active');
}
function selectRecipeFromModal() {}

/* ---- LE MIE RICETTE ---- */
function renderCustomRicette() {
    var container = document.getElementById('ricetteCustomContent');
    if (!container) return;
    if (!customRecipes.length) {
        container.innerHTML = '<div class="custom-ricette-empty">'
            + '<div style="font-size:3em;">📖</div>'
            + '<h3>Nessuna ricetta personalizzata</h3>'
            + '<p>Clicca "➕ Nuova Ricetta" per aggiungerne una.</p></div>';
        return;
    }
    var pastoLabels = {
        colazione: '☕ Colazione', spuntino: '🍎 Spuntino',
        pranzo: '🍽️ Pranzo', merenda: '🥪 Merenda', cena: '🌙 Cena'
    };
    container.innerHTML = customRecipes.map(function (r) {
        var ings = r.ingredienti || [];
        var idEsc = r.id.replace(/'/g, "\\'");
        return '<div class="custom-ricetta-item">'
            + '<div class="custom-ricetta-header">'
            + '<div>'
            + '<div class="custom-ricetta-name">⭐ ' + r.nome + '</div>'
            + '<div class="custom-ricetta-meta">'
            + '<span class="rcb rcb-pasto">' + (pastoLabels[r.pasto] || r.pasto) + '</span>'
            + '</div></div>'
            + '<div class="custom-ricetta-actions">'
            + '<button class="btn btn-secondary btn-small" onclick="editRicettaCustom(\'' + idEsc + '\')">✏️</button>'
            + '<button class="btn btn-warning btn-small" onclick="deleteRicettaCustom(\'' + idEsc + '\')">🗑️</button>'
            + '</div></div>'
            + '<div class="custom-ricetta-ings">🥦 '
            + ings.map(function (i) { return i.nome + ' ' + i.quantita + i.unita; }).join(' · ')
            + '</div>'
            + (r.istruzioni
                ? '<div class="custom-ricetta-prep">' + r.istruzioni + '</div>'
                : '')
            + '</div>';
    }).join('');
}

/* ---- FORM RICETTA ---- */
function openRicettaForm(id) {
    id = id || null;
    ricettaEditId = id;
    rfIngCount = 0;
    document.getElementById('ricettaFormTitle').textContent = id ? '✏️ Modifica Ricetta' : '🍳 Nuova Ricetta';
    document.getElementById('rfNome').value = '';
    document.getElementById('rfPasto').value = 'pranzo';
    document.getElementById('rfIstruzioni').value = '';
    document.getElementById('rfIngList').innerHTML = '';

    if (id) {
        var r = customRecipes.find(function (x) { return x.id === id; });
        if (r) {
            document.getElementById('rfNome').value = r.nome || '';
            document.getElementById('rfPasto').value = r.pasto || 'pranzo';
            document.getElementById('rfIstruzioni').value = r.istruzioni || '';
            (r.ingredienti || []).forEach(function (ing) {
                addRfIng(ing.nome, ing.quantita, ing.unita);
            });
        }
    } else {
        addRfIng();
    }

    document.getElementById('ricettaFormModal').classList.add('active');
    setTimeout(function () { document.getElementById('rfNome').focus(); }, 100);
}

function addRfIng(nome, quantita, unita) {
    var idx = rfIngCount++;
    var units = ['g', 'ml', 'pz', 'cucchiai', 'cucchiaini', 'tazze', 'fette'];
    var div = document.createElement('div');
    div.className = 'rf-ing-row';
    div.id = 'rfIng_' + idx;
    div.innerHTML = '<input type="text" class="form-input rf-ing-name" placeholder="Ingrediente" '
        + 'value="' + (nome || '') + '" list="ingredientiSuggeriti">'
        + '<input type="number" class="form-input rf-ing-qty" placeholder="Qtà" '
        + 'value="' + (quantita || '') + '" min="0" step="any" style="width:80px;">'
        + '<select class="form-input rf-ing-unit">'
        + units.map(function (u) {
            return '<option value="' + u + '"' + (u === (unita || 'g') ? ' selected' : '') + '>' + u + '</option>';
        }).join('')
        + '</select>'
        + '<button class="btn btn-warning btn-small" onclick="removeRfIng(' + idx + ')">✕</button>';
    document.getElementById('rfIngList').appendChild(div);
}

function removeRfIng(idx) {
    var el = document.getElementById('rfIng_' + idx);
    if (el) el.remove();
}

function saveRicettaCustom() {
    var nome = document.getElementById('rfNome').value.trim();
    var pasto = document.getElementById('rfPasto').value;
    var istruzioni = document.getElementById('rfIstruzioni').value.trim();
    if (!nome) { alert('Inserisci il nome della ricetta.'); return; }

    var ingredienti = [];
    document.querySelectorAll('#rfIngList .rf-ing-row').forEach(function (row) {
        var n = row.querySelector('.rf-ing-name').value.trim();
        var q = parseFloat(row.querySelector('.rf-ing-qty').value) || 0;
        var u = row.querySelector('.rf-ing-unit').value;
        if (n) ingredienti.push({ nome: n, quantita: q, unita: u });
    });

    if (ricettaEditId) {
        var idx = customRecipes.findIndex(function (r) { return r.id === ricettaEditId; });
        if (idx >= 0) {
            customRecipes[idx] = {
                id: ricettaEditId, nome: nome, pasto: pasto,
                ingredienti: ingredienti, istruzioni: istruzioni
            };
        }
    } else {
        customRecipes.push({
            id: 'cr_' + Date.now(), nome: nome, pasto: pasto,
            ingredienti: ingredienti, istruzioni: istruzioni
        });
    }

    saveData();
    closeRicettaForm();
    renderCustomRicette();
    renderCatalogoRicette(); // FIX: la ricetta appare subito anche nel catalogo
    alert('Ricetta "' + nome + '" salvata! ✅');
}

function editRicettaCustom(id) {
    openRicettaForm(id);
}

function deleteRicettaCustom(id) {
    var r = customRecipes.find(function (x) { return x.id === id; });
    if (!r) return;
    if (!confirm('Eliminare "' + r.nome + '"?')) return;
    customRecipes = customRecipes.filter(function (x) { return x.id !== id; });
    saveData();
    renderCustomRicette();
    renderCatalogoRicette();
}

function closeRicettaForm() {
    document.getElementById('ricettaFormModal').classList.remove('active');
    ricettaEditId = null;
}
