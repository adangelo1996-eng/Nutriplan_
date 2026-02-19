/* ============================================================
   RICETTE.JS — catalogo ricette e dettaglio
   ============================================================ */

var ricetteSearchQuery  = '';
var ricetteFilterPasto  = 'all';
var currentRecipeName   = null;

/* ---- INIT TAB ---- */
function showRicetteTab(tab, btn) {
    document.querySelectorAll('#ricettePage .page-tab-content').forEach(function (c) {
        c.classList.remove('active');
    });
    document.querySelectorAll('#ricettePage .page-tab').forEach(function (t) {
        t.classList.remove('active');
    });
    var id = tab === 'catalogo' ? 'ricetteTabCatalogo' : 'ricetteTabMie';
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
    if (tab === 'catalogo') renderRicettePage();
    if (tab === 'mie')      renderCustomRicette();
}

/* ---- RENDER PAGINA ---- */
function renderRicettePage() {
    buildFilterRow();
    renderRicetteGrid();
}

/* ---- FILTER ROW ---- */
function buildFilterRow() {
    var row = document.getElementById('ricetteFilterRow');
    if (!row) return;

    var filters = [
        { key: 'all',       label: '🍽 Tutti'     },
        { key: 'colazione', label: '☕ Colazione'  },
        { key: 'spuntino',  label: '🍎 Spuntino'   },
        { key: 'pranzo',    label: '🍽 Pranzo'     },
        { key: 'merenda',   label: '🥪 Merenda'    },
        { key: 'cena',      label: '🌙 Cena'       }
    ];

    row.innerHTML = filters.map(function (f) {
        var active = f.key === ricetteFilterPasto ? ' active' : '';
        return '<button class="ricette-filter-btn' + active + '"'
            + ' onclick="setRicetteFilter(\'' + f.key + '\', this)">'
            + f.label + '</button>';
    }).join('');
}

function setRicetteFilter(key, btn) {
    ricetteFilterPasto = key;
    document.querySelectorAll('.ricette-filter-btn').forEach(function (b) {
        b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
    renderRicetteGrid();
}

function filterRicette(query) {
    ricetteSearchQuery = (query || '').trim().toLowerCase();
    renderRicetteGrid();
}

/* ---- GRID ---- */
function renderRicetteGrid() {
    var grid = document.getElementById('ricetteGrid');
    if (!grid) return;

    var all = getAllRicette();
    var filtered = all.filter(function (r) {
        /* Filtro pasto */
        if (ricetteFilterPasto !== 'all' && r.pasto !== ricetteFilterPasto) return false;
        /* Filtro ricerca */
        if (ricetteSearchQuery) {
            var name  = (r.nome || r.name || '').toLowerCase();
            var ings  = (r.ingredienti || r.ingredients || []).map(function (i) {
                return (i.name || i.nome || '').toLowerCase();
            }).join(' ');
            return name.includes(ricetteSearchQuery) || ings.includes(ricetteSearchQuery);
        }
        return true;
    });

    if (!filtered.length) {
        grid.innerHTML = '<div class="ricette-empty" style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text-light);">'
            + '<div style="font-size:2.5em;margin-bottom:10px;">🔍</div>'
            + '<div style="font-weight:700;">Nessuna ricetta trovata</div>'
            + '<div style="font-size:.82em;margin-top:4px;">Prova a cercare con parole diverse</div>'
            + '</div>';
        return;
    }

    grid.innerHTML = filtered.map(function (r) {
        return buildRicettaCard(r);
    }).join('');
}

/* ---- BUILD CARD ---- */
function buildRicettaCard(r) {
    var name     = r.nome || r.name || 'Ricetta';
    var icon     = r.icon || r.icona || '🍽';
    var pasto    = r.pasto || '';
    var isCustom = r.isCustom || false;
    var ings     = r.ingredienti || r.ingredients || [];

    /* Disponibilità */
  var available = Object.keys(pantryItems).filter(function (p) {
  /* GUARD: salta chiavi non valide */
  if (!p || p === 'undefined' || p === 'null' || !p.trim()) return false;
  return (pantryItems[p].quantity || 0) > 0;
});

    var availCount = ings.filter(function (ing) {
        var n = (ing.name || ing.nome || '').toLowerCase();
        return available.some(function (av) {
            var al = av.toLowerCase();
            return al === n || al.includes(n) || n.includes(al);
        });
    }).length;

    var pct      = ings.length ? Math.round((availCount / ings.length) * 100) : 0;
    var availCls = pct >= 80 ? 'rcb-avail' : pct >= 40 ? 'rcb-partial' : 'rcb-missing';
    var availTxt = pct >= 80 ? '✔ Disponibile' : pct >= 40 ? '⚠ Parziale' : '✖ Mancante';

    var ingPreview = ings.slice(0, 3).map(function (i) {
        return i.name || i.nome || '';
    }).filter(Boolean).join(', ');
    if (ings.length > 3) ingPreview += ' +' + (ings.length - 3);

    return '<div class="ricetta-card' + (isCustom ? ' custom-card' : '') + '"'
        + ' onclick="openRecipeModal(\'' + escRQ(name) + '\')">'
        + '<div class="ricetta-card-head">'
        + '<div class="ricetta-card-icon">' + icon + '</div>'
        + '<div class="ricetta-card-info">'
        + '<div class="ricetta-card-name">' + name + '</div>'
        + '<div class="ricetta-card-badges">'
        + (pasto    ? '<span class="rcb rcb-pasto">' + capFirst(pasto) + '</span>' : '')
        + (isCustom ? '<span class="rcb rcb-custom">⭐ Mia</span>' : '')
        + '<span class="rcb ' + availCls + '">' + availTxt + '</span>'
        + '</div></div></div>'
        + (ingPreview
            ? '<div class="ricetta-card-ings">' + ingPreview + '</div>'
            : '')
        + '</div>';
}

/* ---- MODAL RICETTA ---- */
function openRecipeModal(name) {
    currentRecipeName = name;
    var r = findRicetta(name);
    if (!r) return;

    var modal = document.getElementById('recipeModal');
    var title = document.getElementById('recipeModalTitle');
    var body  = document.getElementById('recipeModalBody');
    if (!modal || !body) return;

    var icon  = r.icon || r.icona || '🍽';
    var ings  = r.ingredienti || r.ingredients || [];
    var prep  = r.preparazione || r.preparation || '';
    var pasto = r.pasto || '';
    var note  = r.note || '';

    /* Disponibilità ingredienti */
    var available = Object.keys(pantryItems).filter(function (p) {
        return (pantryItems[p].quantity || 0) > 0;
    });

    var availCount = 0;
    var html = '';

    /* Header icona + info */
    html += '<div style="display:flex;gap:14px;align-items:center;margin-bottom:18px;">'
        + '<div style="width:56px;height:56px;background:var(--primary-light);'
        + 'border-radius:var(--radius);display:flex;align-items:center;'
        + 'justify-content:center;font-size:2em;flex-shrink:0;">' + icon + '</div>'
        + '<div>'
        + '<div style="font-size:1.05em;font-weight:800;">' + (r.nome || r.name) + '</div>'
        + (pasto ? '<div style="font-size:.8em;color:var(--text-light);margin-top:3px;">' + capFirst(pasto) + '</div>' : '')
        + '</div></div>';

    /* Ingredienti */
    if (ings.length) {
        html += '<div style="font-size:.78em;font-weight:800;color:var(--text-light);'
            + 'text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Ingredienti</div>';

        ings.forEach(function (ing) {
            var n     = (ing.name || ing.nome || '').toLowerCase();
            var qtyTx = (ing.quantity || ing.quantita)
                ? (ing.quantity || ing.quantita) + ' ' + (ing.unit || ing.unita || '')
                : '';
            var found = available.some(function (av) {
                var al = av.toLowerCase();
                return al === n || al.includes(n) || n.includes(al);
            });
            if (found) availCount++;
            var cls  = found ? 'ing-available' : 'ing-missing';
            var icon2 = found ? '✔' : '✖';
            var icls = found ? 'ok' : 'ko';

            html += '<div class="ingredient-item ' + cls + '">'
                + '<span style="font-size:.88em;font-weight:600;">'
                + (ing.name || ing.nome) + '</span>'
                + '<div style="display:flex;align-items:center;gap:8px;">'
                + (qtyTx ? '<span style="font-size:.8em;color:var(--text-light);">' + qtyTx + '</span>' : '')
                + '<span class="ingredient-qty-label ' + icls + '" style="font-size:.8em;">' + icon2 + '</span>'
                + '</div></div>';
        });

        /* Riepilogo disponibilità */
        var pct  = Math.round((availCount / ings.length) * 100);
        var pCls = pct >= 80 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
        html += '<div style="margin-top:10px;padding:10px 12px;background:var(--bg-light);'
            + 'border-radius:var(--radius-sm);font-size:.82em;">'
            + '<b style="color:' + pCls + ';">' + availCount + '/' + ings.length + ' ingredienti disponibili</b>'
            + ' · ' + pct + '%'
            + '<div style="margin-top:6px;height:5px;background:var(--border);border-radius:3px;overflow:hidden;">'
            + '<div style="height:100%;width:' + pct + '%;background:' + pCls + ';border-radius:3px;"></div>'
            + '</div></div>';
    }

    /* Preparazione */
    if (prep) {
        html += '<div style="margin-top:18px;">'
            + '<div style="font-size:.78em;font-weight:800;color:var(--text-light);'
            + 'text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Preparazione</div>'
            + '<div style="font-size:.85em;line-height:1.7;color:var(--text-mid);'
            + 'background:var(--bg-light);border-radius:var(--radius-sm);padding:12px;">'
            + prep.replace(/\n/g, '<br>') + '</div></div>';
    }

    /* Note */
    if (note) {
        html += '<div style="margin-top:12px;padding:10px 12px;'
            + 'background:#fff8e6;border-radius:var(--radius-sm);'
            + 'font-size:.82em;color:#7a5500;border-left:3px solid var(--secondary);">'
            + '💡 ' + note + '</div>';
    }

    if (title) title.textContent = icon + ' ' + (r.nome || r.name || 'Ricetta');
    body.innerHTML = html;
    modal.classList.add('active');
}

function closeRecipeModal() {
    var m = document.getElementById('recipeModal');
    if (m) m.classList.remove('active');
    currentRecipeName = null;
}

/* ---- APPLICA AL PIANO ---- */
function applyRecipeToMeal() {
    if (!currentRecipeName) return;
    var r = findRicetta(currentRecipeName);
    if (!r) return;

    var pasto = r.pasto || 'pranzo';
    if (!mealPlan[pasto]) mealPlan[pasto] = {};

    var ings = r.ingredienti || r.ingredients || [];
    if (!ings.length) {
        alert('Questa ricetta non ha ingredienti definiti.');
        return;
    }

    /* Aggiungi ingredienti come "principale" */
    if (!mealPlan[pasto].principale) mealPlan[pasto].principale = [];

    var added = 0;
    ings.forEach(function (ing) {
        var name = ing.name || ing.nome || '';
        if (!name) return;
        var exists = mealPlan[pasto].principale.some(function (i) {
            return i.name.toLowerCase() === name.toLowerCase();
        });
        if (!exists) {
            mealPlan[pasto].principale.push({
                name:     name,
                quantity: ing.quantity || ing.quantita || null,
                unit:     ing.unit     || ing.unita    || 'g'
            });
            added++;
        }
    });

    saveData();
    closeRecipeModal();
    renderMealPlan();
    renderProfilo();
    alert('✅ ' + added + ' ingredient' + (added === 1 ? 'e aggiunto' : 'i aggiunti')
        + ' al piano per ' + capFirst(pasto) + '!');
}

/* ---- UTILITY ---- */
function getAllRicette() {
    var result = [];
    /* Default */
    if (typeof defaultRecipes !== 'undefined') {
        defaultRecipes.forEach(function (r) { result.push(r); });
    }
    /* Custom */
    (customRecipes || []).forEach(function (r) {
        result.push(Object.assign({}, r, { isCustom: true }));
    });
    return result;
}

function findRicetta(name) {
    return getAllRicette().find(function (r) {
        return (r.nome || r.name || '') === name;
    }) || null;
}

function capFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function escRQ(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
