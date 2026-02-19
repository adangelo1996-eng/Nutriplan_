/* ============================================================
   SPESA.JS
   ============================================================ */

function renderSpesa() {
  var el = document.getElementById('spesaContent');
  if (!el) return;

  var html =
    '<div class="spesa-header-row">' +
      '<div>' +
        '<div class="spesa-title">🛒 Lista della spesa</div>' +
        '<div class="spesa-subtitle">Generata il: ' + (spesaLastGenerated || '—') + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px">' +
        '<button class="btn btn-primary btn-small" onclick="generateSpesa()">⚡ Genera</button>' +
        '<button class="btn btn-secondary btn-small" onclick="clearDoneSpesa()">🧹 Pulisci</button>' +
        '<button class="btn btn-warning btn-small" onclick="clearAllSpesa()">🗑 Svuota</button>' +
      '</div>' +
    '</div>';

  /* Aggiungi manuale */
  html +=
    '<div class="spesa-add-row" style="margin:12px 0">' +
      '<input type="text" id="spesaManualInput" class="form-input" placeholder="Aggiungi articolo manuale..." onkeypress="spesaManualKeypress(event)" list="ingredientiDatalist">' +
      '<button class="btn btn-primary" onclick="addManualSpesaItem()">＋</button>' +
    '</div>';

  if (!spesaItems || !spesaItems.length) {
    html +=
      '<div class="empty-state"><div class="empty-state-icon">🛒</div>' +
      '<h3>Lista vuota</h3><p>Premi <b>⚡ Genera</b> per creare automaticamente la lista dagli ingredienti mancanti nel tuo piano.</p></div>';
    el.innerHTML = html;
    return;
  }

  /* Progress */
  var doneCount  = spesaItems.filter(function (i) { return i.done; }).length;
  var totalCount = spesaItems.length;
  var pct        = Math.round((doneCount / totalCount) * 100);
  html +=
    '<div class="spesa-progress-row">' +
      '<span class="spesa-progress-label">' + doneCount + '/' + totalCount + '</span>' +
      '<div class="spesa-progress-bar"><div class="spesa-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="spesa-progress-label">' + pct + '%</span>' +
    '</div>';

  /* Da fare — raggruppati per categoria */
  var todo = spesaItems.filter(function (i) { return !i.done; });
  var done = spesaItems.filter(function (i) { return i.done; });

  if (todo.length) {
    var byCat = {};
    todo.forEach(function (item) {
      var cat = item.category || '🧂 Altro';
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(item);
    });
    var catOrder = ['🥩 Carne e Pesce','🥛 Latticini e Uova','🌾 Cereali e Legumi','🥦 Verdure','🍎 Frutta','🥑 Grassi e Condimenti','🍫 Dolci e Snack','🧂 Cucina','🧂 Altro'];
    Object.keys(byCat).sort(function (a, b) {
      var ia = catOrder.indexOf(a); var ib = catOrder.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    }).forEach(function (cat) {
      html += '<div class="spesa-section-title">' + cat + '</div>';
      html += '<div class="spesa-list">';
      byCat[cat].forEach(function (item) { html += buildSpesaItemHtml(item, false); });
      html += '</div>';
    });
  }

  if (done.length) {
    html += '<div class="spesa-section-title" style="margin-top:10px">✅ Già acquistati</div>';
    html += '<div class="spesa-list spesa-list-done">';
    done.forEach(function (item) { html += buildSpesaItemHtml(item, true); });
    html += '</div>';
  }

  el.innerHTML = html;
}

/* ---- HTML SINGOLO ITEM ---- */
function buildSpesaItemHtml(item, isDone) {
  var idx    = spesaItems.indexOf(item);
  var badge  = item.isAuto
    ? '<span class="spesa-badge-auto">Auto</span>'
    : '<span class="spesa-badge-manual">Manuale</span>';
  var qtyTxt = item.purchasedQty
    ? item.purchasedQty + (item.unit ? ' ' + item.unit : '')
    : (item.quantity ? item.quantity + (item.unit ? ' ' + item.unit : '') : '');

  return (
    '<div class="spesa-item' + (isDone ? ' done' : '') + '" onclick="toggleSpesaItem(' + idx + ')">' +
      '<span class="spesa-item-check">' + (isDone ? '✅' : '⬜') + '</span>' +
      '<div class="spesa-item-info">' +
        '<div class="spesa-item-name">' + item.name + '</div>' +
        (qtyTxt ? '<div class="spesa-item-qty">' + qtyTxt + '</div>' : '') +
      '</div>' +
      '<div class="spesa-item-actions">' +
        badge +
        '<button class="spesa-delete-btn" onclick="deleteSpesaItem(event,' + idx + ')">🗑</button>' +
      '</div>' +
    '</div>'
  );
}

/* ---- TOGGLE CON QUANTITÀ ---- */
function toggleSpesaItem(idx) {
  var item = spesaItems[idx];
  if (!item) return;
  if (item.done) {
    /* Riattiva — toglila dall'acquistato e rimuovi dalla dispensa */
    item.done = false;
    if (item.purchasedQty && item.purchasedQty > 0 && pantryItems[item.name]) {
      pantryItems[item.name].quantity = Math.max(
        0,
        (pantryItems[item.name].quantity || 0) - item.purchasedQty
      );
    }
    item.purchasedQty = null;
    saveData();
    renderSpesa();
    if (typeof renderPantry === 'function') renderPantry();
    if (typeof renderFridge === 'function') renderFridge();
  } else {
    /* Segna come acquistato → mostra modale quantità */
    openSpesaQuantityModal(idx);
  }
}

/* ---- MODALE QUANTITÀ ACQUISTATA ---- */
var _pendingSpesaIdx = null;

function openSpesaQuantityModal(idx) {
  _pendingSpesaIdx = idx;
  var item = spesaItems[idx];
  if (!item) return;

  var modal = document.getElementById('spesaItemModal');
  if (!modal) {
    /* fallback prompt se il modal non esiste nell'HTML */
    var qInput = prompt('Quantità acquistata di ' + item.name + ' (' + (item.unit || 'g') + '):\n(Lascia vuoto per saltare)', item.quantity || '');
    confirmSpesaQuantity(qInput);
    return;
  }

  var titleEl = document.getElementById('spesaItemModalTitle');
  var qtyEl   = document.getElementById('spesaItemQty');
  var unitEl  = document.getElementById('spesaItemUnit');

  if (titleEl) titleEl.textContent = '✅ ' + item.name + ' — quantità acquistata';
  if (qtyEl)   qtyEl.value  = item.quantity || '';
  if (unitEl) {
    var units = ['g','ml','pz','fette','cucchiai','cucchiaini','porzione','kg','l'];
    unitEl.innerHTML = units.map(function (u) {
      return '<option value="' + u + '"' + ((item.unit || 'g') === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');
  }
  modal.classList.add('active');
}

function closeSpesaItemModal() {
  var m = document.getElementById('spesaItemModal');
  if (m) m.classList.remove('active');
  _pendingSpesaIdx = null;
}

function confirmSpesaQuantity(qtyOverride) {
  var idx  = _pendingSpesaIdx;
  var item = (idx !== null && spesaItems[idx]) ? spesaItems[idx] : null;

  var qty, unit;
  if (qtyOverride !== undefined) {
    qty  = parseFloat(qtyOverride) || 0;
    unit = (item && item.unit) ? item.unit : 'g';
  } else {
    var qtyEl  = document.getElementById('spesaItemQty');
    var unitEl = document.getElementById('spesaItemUnit');
    qty  = parseFloat(qtyEl  ? qtyEl.value  : 0) || 0;
    unit = (unitEl ? unitEl.value : null) || (item ? item.unit : 'g') || 'g';
  }

  if (item) {
    item.done         = true;
    item.purchasedQty = qty;
    item.unit         = unit;

    /* Aggiorna pantryItems */
    if (qty > 0) {
      var name = item.name;
      if (!pantryItems[name]) {
        var cat  = item.category || guessCatFromName(name);
        var icon = (typeof getCategoryIcon === 'function') ? getCategoryIcon(cat) : '🧂';
        pantryItems[name] = { quantity: qty, unit: unit, category: cat, icon: icon, isCustom: false };
      } else {
        pantryItems[name].quantity = Math.round(((pantryItems[name].quantity || 0) + qty) * 100) / 100;
        if (unit) pantryItems[name].unit = unit;
      }
    }
  }

  saveData();
  closeSpesaItemModal();
  renderSpesa();
  if (typeof renderPantry === 'function') renderPantry();
  if (typeof renderFridge === 'function') renderFridge();
}

/* ---- GENERA ---- */
function generateSpesa() {
  var newItems = [];
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
    var mp = mealPlan[mk] || {};
    ['principale','contorno','frutta','extra'].forEach(function (cat) {
      (mp[cat] || []).forEach(function (item) {
        if (!item || typeof item !== 'object' || !item.name || typeof item.name !== 'string' || !item.name.trim()) return;
        var avail = checkIngredientAvailability(item);
        if (!avail.sufficient) {
          var name   = item.name.trim();
          var exists = (spesaItems || []).some(function (s) { return s.name && s.name.toLowerCase() === name.toLowerCase() && s.isAuto; });
          if (!exists) {
            var pd  = pantryItems[name] || {};
            var cat2 = pd.category || guessCatFromName(name);
            newItems.push({ name: name, quantity: item.quantity || null, unit: item.unit || 'g', category: cat2, isAuto: true, done: false });
          }
        }
      });
    });
  });

  if (!newItems.length) { alert('✅ Tutti gli ingredienti del piano sono già disponibili in dispensa!'); return; }
  spesaItems = (spesaItems || []).filter(function (i) { return !i.isAuto; }).concat(newItems);
  spesaLastGenerated = new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  saveData();
  renderSpesa();
}

/* ---- MANUALE ---- */
function addManualSpesaItem() {
  var inp  = document.getElementById('spesaManualInput');
  var name = inp ? inp.value.trim() : '';
  if (!name) return;
  if (!spesaItems) spesaItems = [];
  spesaItems.push({ name: name, quantity: null, unit: 'g', category: guessCatFromName(name), isAuto: false, done: false });
  if (inp) inp.value = '';
  saveData();
  renderSpesa();
}
function spesaManualKeypress(e) { if (e.key === 'Enter') addManualSpesaItem(); }

/* ---- DELETE / PULISCI ---- */
function deleteSpesaItem(e, idx) {
  e.stopPropagation();
  spesaItems.splice(idx, 1);
  saveData(); renderSpesa();
}
function clearDoneSpesa() {
  spesaItems = (spesaItems || []).filter(function (i) { return !i.done; });
  saveData(); renderSpesa();
}
function clearAllSpesa() {
  if (!confirm('Svuotare tutta la lista della spesa?')) return;
  spesaItems = []; spesaLastGenerated = null;
  saveData(); renderSpesa();
}

/* ---- UTILITY ---- */
function guessCatFromName(name) {
  if (!name) return '🧂 Cucina';
  var nl  = name.toLowerCase();
  var map = [
    { words: ['pollo','manzo','salmone','tonno','carne','pesce','merluzzo','bresaola','prosciutto','tacchino','polpo','calamari','seppie','orata','spigola','branzino','tofu'], cat: '🥩 Carne e Pesce' },
    { words: ['latte','yogurt','formaggio','ricotta','mozzarella','parmigiano','uovo','uova','skyr','kefir','actimel'],                                                         cat: '🥛 Latticini e Uova' },
    { words: ['pasta','riso','pane','farro','orzo','quinoa','avena','fagioli','ceci','lenticchie','legumi','cereali','piadina','wasa','gallette','crackers','gnocchi','patate'], cat: '🌾 Cereali e Legumi' },
    { words: ['insalata','spinaci','broccoli','carote','pomodori','zucchine','melanzane','peperoni','verdure','cavolo','cetriolo','finocchio','lattuga','radicchio'],            cat: '🥦 Verdure' },
    { words: ['mela','pera','banana','arancia','kiwi','fragole','uva','pesca','frutta','mango','noci','mandorle','pistacchi','nocciole'],                                       cat: '🍎 Frutta' },
    { words: ['olio','olive','avocado','semi','condimento','pesto','miele','marmellata'],                                                                                        cat: '🥑 Grassi e Condimenti' },
    { words: ['cioccolato','biscotti','snack','dolci','nutella','barretta','cornetto','budino','cocco'],                                                                          cat: '🍫 Dolci e Snack' }
  ];
  for (var i = 0; i < map.length; i++) {
    if (map[i].words.some(function (w) { return nl.includes(w); })) return map[i].cat;
  }
  return '🧂 Cucina';
}
