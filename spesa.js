var spesaItems = [];          // array {id, name, qty, unit, done, manual}
var spesaLastGenerated = null;

/* ============================================================
   RENDER PRINCIPALE
   ============================================================ */
function renderSpesa() {
    var container = document.getElementById('spesaContent');
    if (!container) return;

    var html = '';

    // Header con pulsanti
    html += '<div class="spesa-header">';
    html += '<div class="spesa-header-row">';
    html += '<h2 class="spesa-title">🛒 Lista della Spesa</h2>';
    html += '<button class="btn btn-primary btn-small" onclick="generateSpesa()">⚡ Genera</button>';
    html += '</div>';
    if (spesaLastGenerated) {
        html += '<div class="spesa-subtitle">Aggiornata: ' + spesaLastGenerated + '</div>';
    }
    html += '</div>';

    // Aggiungi manuale
    html += '<div class="spesa-add-row">';
    html += '<input type="text" id="spesaManualName" class="form-input" placeholder="Aggiungi articolo..." '
        + 'onkeypress="if(event.key===\'Enter\')addSpesaManual()">';
    html += '<button class="btn btn-secondary btn-small" onclick="addSpesaManual()">➕</button>';
    html += '</div>';

    if (!spesaItems.length) {
        html += '<div class="empty-state">'
            + '<div style="font-size:3em;margin-bottom:12px;">🛒</div>'
            + '<h3>Lista vuota</h3>'
            + '<p>Clicca <b>⚡ Genera</b> per creare automaticamente la lista '
            + 'in base agli ingredienti mancanti dal tuo piano.</p>'
            + '</div>';
        container.innerHTML = html;
        return;
    }

    // Statistiche rapide
    var done  = spesaItems.filter(function (i) { return i.done; }).length;
    var total = spesaItems.length;
    var pct   = Math.round((done / total) * 100);
    html += '<div class="spesa-progress-row">';
    html += '<span class="spesa-progress-label">' + done + ' / ' + total + ' articoli</span>';
    html += '<div class="spesa-progress-bar">'
        + '<div class="spesa-progress-fill" style="width:' + pct + '%"></div></div>';
    html += '</div>';

    // Azioni bulk
    html += '<div class="spesa-bulk-row">';
    html += '<button class="btn btn-secondary btn-small" onclick="checkAllSpesa()">✓ Tutti</button>';
    html += '<button class="btn btn-secondary btn-small" onclick="uncheckAllSpesa()">↺ Deseleziona</button>';
    html += '<button class="btn btn-warning btn-small" onclick="clearDoneSpesa()">🗑 Rimuovi ✓</button>';
    html += '<button class="btn btn-warning btn-small" onclick="clearAllSpesa()">✕ Svuota</button>';
    html += '</div>';

    // Separa da fare / fatto
    var pending = spesaItems.filter(function (i) { return !i.done; });
    var done_items = spesaItems.filter(function (i) { return i.done; });

    if (pending.length) {
        html += '<div class="spesa-section-title">📋 Da comprare (' + pending.length + ')</div>';
        html += '<div class="spesa-list">';
        pending.forEach(function (item) { html += buildSpesaItemHTML(item); });
        html += '</div>';
    }
    if (done_items.length) {
        html += '<div class="spesa-section-title" style="margin-top:16px;">✅ Nel carrello (' + done_items.length + ')</div>';
        html += '<div class="spesa-list spesa-list-done">';
        done_items.forEach(function (item) { html += buildSpesaItemHTML(item); });
        html += '</div>';
    }

    container.innerHTML = html;
}

function buildSpesaItemHTML(item) {
    var esc = item.id;
    var nameEsc = (item.name || '').replace(/'/g, "\\'");
    return '<div class="spesa-item ' + (item.done ? 'done' : '') + '" id="spesaItem_' + esc + '">'
        + '<div class="spesa-item-check" onclick="toggleSpesaItem(\'' + esc + '\')">'
        + (item.done ? '✅' : '⬜') + '</div>'
        + '<div class="spesa-item-info" onclick="toggleSpesaItem(\'' + esc + '\')">'
        + '<div class="spesa-item-name">' + (item.name || '') + '</div>'
        + (item.qty ? '<div class="spesa-item-qty">' + item.qty + ' ' + (item.unit || '') + '</div>' : '')
        + '</div>'
        + '<div class="spesa-item-actions">'
        + (item.manual ? '<span class="spesa-badge-manual">custom</span>' : '<span class="spesa-badge-auto">auto</span>')
        + '<button class="spesa-delete-btn" onclick="deleteSpesaItem(\'' + esc + '\')">✕</button>'
        + '</div></div>';
}

/* ============================================================
   GENERA LISTA AUTOMATICA
   ============================================================ */
function generateSpesa() {
    var MEALS_ORDER = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
    var needed = {};

    MEALS_ORDER.forEach(function (meal) {
        var items = (mealPlan[meal] && mealPlan[meal].principale) || [];
        items.forEach(function (item) {
            var name = item.label;
            if (!name) return;
            var avail = checkIngredientAvailability({
                name: name, quantity: item.qty, unit: item.unit
            });
            if (!avail.sufficient) {
                if (!needed[name]) {
                    needed[name] = { qty: item.qty, unit: item.unit };
                }
            }
        });
    });

    // Mantieni gli item manuali già presenti
    var manualItems = spesaItems.filter(function (i) { return i.manual; });
    spesaItems = manualItems;

    Object.keys(needed).forEach(function (name) {
        var already = spesaItems.some(function (i) {
            return i.name.toLowerCase() === name.toLowerCase();
        });
        if (!already) {
            spesaItems.push({
                id: 'sp_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                name: name,
                qty: needed[name].qty,
                unit: needed[name].unit,
                done: false,
                manual: false
            });
        }
    });

    spesaLastGenerated = new Date().toLocaleString('it-IT');
    saveData();
    renderSpesa();

    if (!Object.keys(needed).length) {
        alert('✅ Hai tutto! Nessun ingrediente mancante dal piano.');
    }
}

/* ============================================================
   AZIONI ITEM
   ============================================================ */
function toggleSpesaItem(id) {
    var item = spesaItems.find(function (i) { return i.id === id; });
    if (item) { item.done = !item.done; saveData(); renderSpesa(); }
}

function deleteSpesaItem(id) {
    spesaItems = spesaItems.filter(function (i) { return i.id !== id; });
    saveData(); renderSpesa();
}

function addSpesaManual() {
    var input = document.getElementById('spesaManualName');
    if (!input) return;
    var name = input.value.trim();
    if (!name) return;
    spesaItems.push({
        id: 'sp_' + Date.now(),
        name: name, qty: 0, unit: '',
        done: false, manual: true
    });
    input.value = '';
    saveData(); renderSpesa();
}

function checkAllSpesa() {
    spesaItems.forEach(function (i) { i.done = true; });
    saveData(); renderSpesa();
}
function uncheckAllSpesa() {
    spesaItems.forEach(function (i) { i.done = false; });
    saveData(); renderSpesa();
}
function clearDoneSpesa() {
    spesaItems = spesaItems.filter(function (i) { return !i.done; });
    saveData(); renderSpesa();
}
function clearAllSpesa() {
    if (!confirm('Svuotare tutta la lista della spesa?')) return;
    spesaItems = []; spesaLastGenerated = null;
    saveData(); renderSpesa();
}

/* ============================================================
   MODAL SPESA (usato da app.js)
   ============================================================ */
function closeSpesaItemModal() {
    var m = document.getElementById('spesaItemModal');
    if (m) m.classList.remove('active');
}
