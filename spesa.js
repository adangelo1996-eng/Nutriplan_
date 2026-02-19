/* ============================================================
   SPESA.JS
   ============================================================ */

function renderSpesa() {
    var el = document.getElementById('spesaContent');
    if (!el) return;

    var html = '';

    /* ---- HEADER ---- */
    html += '<div style="margin-bottom:16px;">'
        + '<div class="spesa-header-row">'
        + '<div class="spesa-title">🛒 Lista della spesa</div>'
        + '<div style="display:flex;gap:6px;">'
        + '<button class="btn btn-small btn-primary" onclick="generateSpesa()">⚡ Genera</button>'
        + '<button class="btn btn-small btn-secondary" onclick="clearDoneSpesa()">🧹 Pulisci</button>'
        + '<button class="btn btn-small btn-warning" onclick="clearAllSpesa()">🗑 Svuota</button>'
        + '</div></div>'
        + '<div class="spesa-subtitle">Generata il: '
        + (spesaLastGenerated || '—') + '</div></div>';

    /* ---- AGGIUNGI MANUALE ---- */
    html += '<div class="spesa-add-row">'
        + '<input type="text" id="spesaManualInput" class="form-input"'
        + ' placeholder="Aggiungi articolo manuale..."'
        + ' onkeypress="spesaManualKeypress(event)">'
        + '<button class="btn btn-primary" onclick="addManualSpesaItem()">＋</button>'
        + '</div>';

    /* ---- PROGRESS ---- */
    if (spesaItems && spesaItems.length) {
        var done  = spesaItems.filter(function (i) { return i.done; }).length;
        var total = spesaItems.length;
        var pct   = Math.round((done / total) * 100);
        html += '<div class="spesa-progress-row">'
            + '<span class="spesa-progress-label">' + done + '/' + total + '</span>'
            + '<div class="spesa-progress-bar">'
            + '<div class="spesa-progress-fill" style="width:' + pct + '%"></div>'
            + '</div>'
            + '<span class="spesa-progress-label">' + pct + '%</span>'
            + '</div>';
    }

    if (!spesaItems || !spesaItems.length) {
        html += '<div class="empty-state">'
            + '<div class="empty-state-icon">🛒</div>'
            + '<h3>Lista vuota</h3>'
            + '<p>Premi <b>⚡ Genera</b> per creare automaticamente la lista '
            + 'dagli ingredienti mancanti nel tuo piano.</p>'
            + '</div>';
        el.innerHTML = html;
        return;
    }

    /* ---- SUDDIVISIONE DA FARE / FATTI ---- */
    var todo = spesaItems.filter(function (i) { return !i.done; });
    var done = spesaItems.filter(function (i) { return  i.done; });

    /* Raggruppa todo per categoria */
    var byCat = {};
    todo.forEach(function (item) {
        var cat = item.category || '🧂 Altro';
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(item);
    });

    var catOrder = [
        '🥩 Carne e Pesce', '🥛 Latticini e Uova', '🌾 Cereali e Legumi',
        '🥦 Verdure', '🍎 Frutta', '🥑 Grassi e Condimenti',
        '🍫 Dolci e Snack', '🧂 Cucina', '🧂 Altro'
    ];
    var sortedCats = Object.keys(byCat).sort(function (a, b) {
        var ia = catOrder.indexOf(a); var ib = catOrder.indexOf(b);
        if (ia === -1) ia = 999; if (ib === -1) ib = 999;
        return ia - ib;
    });

    if (todo.length) {
        sortedCats.forEach(function (cat) {
            html += '<div class="spesa-section-title">' + cat + '</div>';
            html += '<div class="spesa-list">';
            byCat[cat].forEach(function (item) {
                html += buildSpesaItemHtml(item, false);
            });
            html += '</div>';
        });
    }

    /* Fatti */
    if (done.length) {
        html += '<div class="spesa-section-title" style="margin-top:18px;">✅ Già acquistati</div>';
        html += '<div class="spesa-list spesa-list-done">';
        done.forEach(function (item) {
            html += buildSpesaItemHtml(item, true);
        });
        html += '</div>';
    }

    el.innerHTML = html;
}

/* ---- BUILD ITEM HTML ---- */
function buildSpesaItemHtml(item, isDone) {
    var idx    = spesaItems.indexOf(item);
    var typeB  = item.isAuto ? 'spesa-badge-auto' : 'spesa-badge-manual';
    var typeL  = item.isAuto ? 'Auto'             : 'Manuale';
    var qtyTxt = item.quantity
        ? item.quantity + (item.unit ? ' ' + item.unit : '')
        : '';

    return '<div class="spesa-item' + (isDone ? ' done' : '') + '"'
        + ' onclick="toggleSpesaItem(' + idx + ')">'
        + '<span class="spesa-item-check">' + (isDone ? '✅' : '⬜') + '</span>'
        + '<div class="spesa-item-info">'
        + '<div class="spesa-item-name">' + item.name + '</div>'
        + (qtyTxt ? '<div class="spesa-item-qty">' + qtyTxt + '</div>' : '')
        + '</div>'
        + '<div class="spesa-item-actions">'
        + '<span class="' + typeB + '">' + typeL + '</span>'
        + '<button class="spesa-delete-btn" onclick="deleteSpesaItem(event,' + idx + ')">🗑</button>'
        + '</div>'
        + '</div>';
}

/* ---- GENERA AUTOMATICA ---- */
function generateSpesa() {
    var newItems = [];
    var mealKeys = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];

    mealKeys.forEach(function (mk) {
        var mp = mealPlan[mk] || {};
        ['principale', 'contorno', 'frutta', 'extra'].forEach(function (cat) {
            (mp[cat] || []).forEach(function (item) {
                var avail = checkIngredientAvailability(item);
                if (!avail.sufficient) {
                    /* Già in lista? */
                    var exists = spesaItems.some(function (s) {
                        return s.name.toLowerCase() === item.name.toLowerCase() && s.isAuto;
                    });
                    if (!exists) {
                        var pd  = pantryItems[item.name] || {};
                        var cat2 = pd.category || guessCatFromName(item.name);
                        newItems.push({
                            name:     item.name,
                            quantity: item.quantity || null,
                            unit:     item.unit     || null,
                            category: cat2,
                            isAuto:   true,
                            done:     false
                        });
                    }
                }
            });
        });
    });

    if (!newItems.length) {
        alert('✅ Tutti gli ingredienti del piano sono già disponibili in dispensa!');
        return;
    }

    spesaItems = (spesaItems || []).filter(function (i) { return !i.isAuto; }).concat(newItems);
    spesaLastGenerated = new Date().toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    saveData();
    renderSpesa();
}

/* ---- AGGIUNGI MANUALE ---- */
function addManualSpesaItem() {
    var inp  = document.getElementById('spesaManualInput');
    var name = inp ? inp.value.trim() : '';
    if (!name) return;
    if (!spesaItems) spesaItems = [];
    spesaItems.push({
        name:     name,
        quantity: null,
        unit:     null,
        category: guessCatFromName(name),
        isAuto:   false,
        done:     false
    });
    if (inp) inp.value = '';
    saveData();
    renderSpesa();
}

function spesaManualKeypress(e) {
    if (e.key === 'Enter') addManualSpesaItem();
}

/* ---- TOGGLE / DELETE ---- */
function toggleSpesaItem(idx) {
    if (!spesaItems[idx]) return;
    spesaItems[idx].done = !spesaItems[idx].done;
    saveData();
    renderSpesa();
}

function deleteSpesaItem(e, idx) {
    e.stopPropagation();
    spesaItems.splice(idx, 1);
    saveData();
    renderSpesa();
}

function clearDoneSpesa() {
    spesaItems = (spesaItems || []).filter(function (i) { return !i.done; });
    saveData();
    renderSpesa();
}

function clearAllSpesa() {
    if (!confirm('Svuotare tutta la lista della spesa?')) return;
    spesaItems = [];
    spesaLastGenerated = null;
    saveData();
    renderSpesa();
}

/* ---- UTILITY ---- */
function guessCatFromName(name) {
    var nl = name.toLowerCase();
    var catMap = [
        { words: ['pollo','manzo','salmone','tonno','carne','pesce','prosciutto','salame','bresaola','pancetta'], cat: '🥩 Carne e Pesce' },
        { words: ['latte','yogurt','formaggio','ricotta','mozzarella','parmigiano','uovo','uova','burro','panna'], cat: '🥛 Latticini e Uova' },
        { words: ['pasta','riso','pane','farro','orzo','quinoa','avena','fagioli','ceci','lenticchie','legumi','cereali'], cat: '🌾 Cereali e Legumi' },
        { words: ['insalata','spinaci','broccoli','carote','pomodori','zucchine','melanzane','peperoni','verdure','cavolo','cetriolo','finocchio'], cat: '🥦 Verdure' },
        { words: ['mela','pera','banana','arancia','kiwi','fragole','uva','pesca','frutta','mango','ananas'], cat: '🍎 Frutta' },
        { words: ['olio','olive','avocado','noci','mandorle','semi','condimento'], cat: '🥑 Grassi e Condimenti' },
        { words: ['cioccolato','biscotti','snack','dolci','miele','marmellata','nutella'], cat: '🍫 Dolci e Snack' }
    ];
    for (var i = 0; i < catMap.length; i++) {
        if (catMap[i].words.some(function (w) { return nl.includes(w); })) {
            return catMap[i].cat;
        }
    }
    return '🧂 Cucina';
}
