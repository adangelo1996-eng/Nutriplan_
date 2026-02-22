/* ============================================================
   PIANO_ALIMENTARE.JS — v2
   Pagina dedicata all'impostazione del piano alimentare:
   - Struttura: pasto → categorie ingredienti → ingredienti + alternative
   - In fondo: limiti settimanali (usa weeklyLimits da data.js)
   ============================================================ */

/* ──────────────────────────────────────────────────────────
   COSTANTI
────────────────────────────────────────────────────────── */
var PA_MEALS = [
  { key: 'colazione', emoji: '☀️',  label: 'Colazione' },
  { key: 'spuntino',  emoji: '🍎',  label: 'Spuntino'  },
  { key: 'pranzo',    emoji: '🍽',  label: 'Pranzo'    },
  { key: 'merenda',   emoji: '🥪',  label: 'Merenda'   },
  { key: 'cena',      emoji: '🌙',  label: 'Cena'      }
];

/* "🧂 Altro" NON è inclusa — viene aggiunta solo se ci sono ingredienti */
var PA_CATEGORIES = [
  '🥩 Carne',
  '🐟 Pesce',
  '🥛 Latticini e Uova',
  '🌾 Cereali e Legumi',
  '🥦 Verdure',
  '🍎 Frutta',
  '🥑 Grassi e Condimenti',
  '🍫 Dolci e Snack',
  '🧂 Cucina'
];

var PA_CAT_COLORS = {
  '🥩 Carne':                '#ef4444',
  '🐟 Pesce':                '#0ea5e9',
  '🥩 Carne e Pesce':        '#ef4444', /* compat */
  '🥛 Latticini e Uova':     '#f59e0b',
  '🌾 Cereali e Legumi':     '#a16207',
  '🥦 Verdure':              '#22c55e',
  '🍎 Frutta':               '#f97316',
  '🥑 Grassi e Condimenti':  '#84cc16',
  '🍫 Dolci e Snack':        '#a855f7',
  '🧂 Cucina':               '#64748b',
  '🧂 Altro':                '#64748b'
};

/* ── modal state ── */
var _paIngModalMeal  = '';
var _paIngModalCat   = '';
var _paIngModalQuery = '';
var _paAltIngIdx     = -1;

/* ── quantity step state ── */
var _paQtyName   = '';
var _paQtyMeal   = '';
var _paQtyCat    = '';
var _paQtyAltIdx = -1;
var _paQtyUnit   = 'g';

/* ──────────────────────────────────────────────────────────
   UTILITY
────────────────────────────────────────────────────────── */
function paEscQ(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
function paCatColor(cat) {
  return PA_CAT_COLORS[cat] || '#64748b';
}
function paCatIcon(cat) {
  var m = {
    '🥩 Carne': '🥩', '🐟 Pesce': '🐟',
    '🥩 Carne e Pesce': '🥩', '🥛 Latticini e Uova': '🥛',
    '🌾 Cereali e Legumi': '🌾', '🥦 Verdure': '🥦',
    '🍎 Frutta': '🍎', '🥑 Grassi e Condimenti': '🥑',
    '🍫 Dolci e Snack': '🍫', '🧂 Cucina': '🧂', '🧂 Altro': '🧂'
  };
  return m[cat] || '🧂';
}

/* Restituisce la categoria dell'ingrediente dal database */
function paGetIngCat(name) {
  var nl = (name || '').toLowerCase().trim();
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    var found = defaultIngredients.find(function(i) {
      return i && i.name && i.name.toLowerCase() === nl;
    });
    if (found && found.category) return found.category;
  }
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    var fc = customIngredients.find(function(i) {
      return i && i.name && i.name.toLowerCase() === nl;
    });
    if (fc && fc.category) return fc.category;
  }
  return '🧂 Altro';
}

/* Restituisce l'unità default dell'ingrediente */
function paGetIngUnit(name) {
  var nl = (name || '').toLowerCase().trim();
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    var found = defaultIngredients.find(function(i) {
      return i && i.name && i.name.toLowerCase() === nl;
    });
    if (found && found.unit) return found.unit;
  }
  return 'g';
}

/* Assicura struttura pianoAlimentare */
function paEnsureStructure() {
  if (typeof pianoAlimentare === 'undefined') window.pianoAlimentare = {};
  var allCats = PA_CATEGORIES.concat(['🧂 Altro']);
  PA_MEALS.forEach(function(m) {
    if (!pianoAlimentare[m.key] || typeof pianoAlimentare[m.key] !== 'object')
      pianoAlimentare[m.key] = {};
    allCats.forEach(function(cat) {
      if (!Array.isArray(pianoAlimentare[m.key][cat]))
        pianoAlimentare[m.key][cat] = [];
    });
  });
}

/* Conta ingredienti totali in un pasto */
function paGetMealCount(mealKey) {
  if (!pianoAlimentare || !pianoAlimentare[mealKey]) return 0;
  var count = 0;
  var allCats = PA_CATEGORIES.concat(['🧂 Altro']);
  allCats.forEach(function(cat) {
    var arr = pianoAlimentare[mealKey][cat];
    if (Array.isArray(arr)) count += arr.length;
  });
  return count;
}

/* ──────────────────────────────────────────────────────────
   RENDER PRINCIPALE
────────────────────────────────────────────────────────── */
function renderPianoAlimentare() {
  var el = document.getElementById('pianoAlimentarePage');
  if (!el) return;

  paEnsureStructure();

  /* Pulsante wizard */
  var wizardBtn =
    '<div style="margin-bottom:16px;">' +
      '<button class="rc-btn rc-btn-primary" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;" ' +
              'onclick="openPAWizard()">' +
        '🧙 Configura piano pasto per pasto' +
      '</button>' +
    '</div>';

  var html = wizardBtn;

  PA_MEALS.forEach(function(meal) {
    html += buildPAMealSection(meal);
  });

  html += buildPALimitiSection();

  el.innerHTML = html;
}

/* ──────────────────────────────────────────────────────────
   SEZIONE PASTO
────────────────────────────────────────────────────────── */
function buildPAMealSection(meal) {
  var count   = paGetMealCount(meal.key);
  var mealEsc = paEscQ(meal.key);

  var catSections = '';
  PA_CATEGORIES.forEach(function(cat) {
    catSections += buildPACatSection(meal.key, cat);
  });

  /* "🧂 Altro" solo se ha ingredienti */
  var altroCat  = '🧂 Altro';
  var altroItems = (pianoAlimentare[meal.key] && Array.isArray(pianoAlimentare[meal.key][altroCat]))
    ? pianoAlimentare[meal.key][altroCat]
    : [];
  if (altroItems.length) {
    catSections += buildPACatSection(meal.key, altroCat);
  }

  return (
    '<div class="pa-meal-block" id="pa-meal-' + meal.key + '">' +
      '<div class="pa-meal-header" onclick="togglePAMeal(\'' + mealEsc + '\')">' +
        '<span class="pa-meal-emoji">' + meal.emoji + '</span>' +
        '<span class="pa-meal-label">' + meal.label + '</span>' +
        (count > 0
          ? '<span class="pa-meal-count">' + count + ' ing.</span>'
          : '<span class="pa-meal-count" style="opacity:.4">Vuoto</span>') +
        '<span class="pa-meal-chevron" id="pa-chev-' + meal.key + '">▾</span>' +
      '</div>' +
      '<div class="pa-meal-body" id="pa-body-' + meal.key + '">' +
        catSections +
      '</div>' +
    '</div>'
  );
}

function togglePAMeal(mealKey) {
  var body = document.getElementById('pa-body-' + mealKey);
  var chev = document.getElementById('pa-chev-' + mealKey);
  if (!body) return;
  var isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if (chev) chev.textContent = isOpen ? '▾' : '▴';
}

/* ──────────────────────────────────────────────────────────
   SEZIONE CATEGORIA
────────────────────────────────────────────────────────── */
function buildPACatSection(mealKey, catName) {
  var items = (pianoAlimentare[mealKey] && Array.isArray(pianoAlimentare[mealKey][catName]))
    ? pianoAlimentare[mealKey][catName]
    : [];
  var color   = paCatColor(catName);
  var icon    = paCatIcon(catName);
  var label   = catName.replace(/^[^\s]+\s/, '');
  var mealEsc = paEscQ(mealKey);
  var catEsc  = paEscQ(catName);
  var safeId  = mealKey + '-' + catName.replace(/[^a-z0-9]/gi, '_');

  var itemsHtml = items.map(function(item, idx) {
    return buildPAIngredientRow(mealKey, catName, item, idx);
  }).join('');

  return (
    '<div class="pa-cat-section" style="--pc:' + color + ';">' +
      '<div class="pa-cat-header">' +
        '<span class="pa-cat-icon">' + icon + '</span>' +
        '<span class="pa-cat-label">' + label + '</span>' +
        (items.length ? '<span class="pa-cat-count">' + items.length + '</span>' : '') +
        '<button class="pa-cat-add-btn" ' +
                'onclick="openPAIngModal(\'' + mealEsc + '\',\'' + catEsc + '\')">' +
          '＋ Aggiungi' +
        '</button>' +
      '</div>' +
      '<div class="pa-cat-items" id="pa-items-' + safeId + '">' +
        itemsHtml +
      '</div>' +
    '</div>'
  );
}

/* ──────────────────────────────────────────────────────────
   RIGA INGREDIENTE
────────────────────────────────────────────────────────── */
function buildPAIngredientRow(mealKey, catName, item, idx) {
  if (!item || !item.name) return '';
  var mealEsc = paEscQ(mealKey);
  var catEsc  = paEscQ(catName);
  var alts    = Array.isArray(item.alternatives) ? item.alternatives : [];
  var hasAlts = alts.length > 0;
  var qty     = (item.quantity !== null && item.quantity !== undefined)
    ? item.quantity + ' ' + (item.unit || 'g')
    : '';
  var safeId  = mealKey + '-' + catName.replace(/[^a-z0-9]/gi, '_');
  var altId   = 'pa-alt-' + safeId + '-' + idx;

  var altsHtml = alts.map(function(alt, ai) {
    var altQty = (alt.quantity !== null && alt.quantity !== undefined)
      ? alt.quantity + ' ' + (alt.unit || 'g')
      : '';
    return (
      '<div class="pa-alt-row">' +
        '<span class="pa-alt-bullet">↔</span>' +
        '<div class="pa-alt-info">' +
          '<span class="pa-alt-name">' + (alt.name || '') + '</span>' +
          (altQty ? '<span class="pa-alt-qty">' + altQty + '</span>' : '') +
        '</div>' +
        '<button class="pa-alt-del" title="Rimuovi alternativa" ' +
                'onclick="removePAAlt(\'' + mealEsc + '\',\'' + catEsc + '\',' + idx + ',' + ai + ')">' +
          '✕' +
        '</button>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="pa-ing-row" id="pa-ing-' + safeId + '-' + idx + '">' +
      '<div class="pa-ing-main">' +
        '<div class="pa-ing-info">' +
          '<span class="pa-ing-name">' + item.name + '</span>' +
          (qty ? '<span class="pa-ing-qty">' + qty + '</span>' : '') +
        '</div>' +
        '<div class="pa-ing-actions">' +
          '<button class="pa-alt-toggle' + (hasAlts ? ' active' : '') + '" ' +
                  'title="Mostra/Nascondi alternative" ' +
                  'onclick="togglePAAltSection(\'' + altId + '\',this)">' +
            '↔' + (hasAlts ? ' ' + alts.length : '') +
          '</button>' +
          '<button class="pa-ing-del" title="Rimuovi" ' +
                  'onclick="removePAIng(\'' + mealEsc + '\',\'' + catEsc + '\',' + idx + ')">' +
            '✕' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="pa-alt-section' + (hasAlts ? ' open' : '') + '" id="' + altId + '">' +
        altsHtml +
        '<button class="pa-add-alt-btn" ' +
                'onclick="openPAIngModal(\'' + mealEsc + '\',\'' + catEsc + '\',' + idx + ')">' +
          '＋ Aggiungi alternativa' +
        '</button>' +
      '</div>' +
    '</div>'
  );
}

function togglePAAltSection(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var isOpen = el.classList.contains('open');
  el.classList.toggle('open', !isOpen);
  if (btn) btn.classList.toggle('active', !isOpen);
}

/* ──────────────────────────────────────────────────────────
   AZIONI SU INGREDIENTI
────────────────────────────────────────────────────────── */
function removePAIng(mealKey, catName, idx) {
  paEnsureStructure();
  var arr = pianoAlimentare[mealKey] && pianoAlimentare[mealKey][catName];
  if (!Array.isArray(arr)) return;
  arr.splice(idx, 1);
  if (typeof saveData === 'function') saveData();
  renderPianoAlimentare();
  if (typeof showToast === 'function') showToast('Ingrediente rimosso', 'info');
}

function removePAAlt(mealKey, catName, ingIdx, altIdx) {
  paEnsureStructure();
  var arr = pianoAlimentare[mealKey] && pianoAlimentare[mealKey][catName];
  if (!Array.isArray(arr) || !arr[ingIdx]) return;
  var alts = arr[ingIdx].alternatives;
  if (!Array.isArray(alts)) return;
  alts.splice(altIdx, 1);
  if (typeof saveData === 'function') saveData();
  renderPianoAlimentare();
}

/* ──────────────────────────────────────────────────────────
   MODAL SELEZIONE INGREDIENTE
────────────────────────────────────────────────────────── */
function openPAIngModal(mealKey, catName, altIngIdx) {
  _paIngModalMeal  = mealKey;
  _paIngModalCat   = catName;
  _paIngModalQuery = '';
  _paAltIngIdx     = (typeof altIngIdx === 'number') ? altIngIdx : -1;

  var modal = document.getElementById('paIngModal');
  if (!modal) return;

  var titleEl = document.getElementById('paIngModalTitle');
  if (titleEl) {
    var label = catName.replace(/^[^\s]+\s/, '');
    titleEl.textContent = _paAltIngIdx >= 0
      ? '↔ Alternativa — ' + label
      : '＋ Aggiungi a ' + label;
  }

  var searchEl = document.getElementById('paIngSearch');
  if (searchEl) searchEl.value = '';

  _renderPAIngList('');

  modal.classList.add('active');
  setTimeout(function() {
    if (searchEl) searchEl.focus();
  }, 120);
}

function closePAIngModal() {
  var modal = document.getElementById('paIngModal');
  if (modal) modal.classList.remove('active');
  _paIngModalMeal  = '';
  _paIngModalCat   = '';
  _paIngModalQuery = '';
  _paAltIngIdx     = -1;
}

function filterPAIngList(query) {
  _paIngModalQuery = (query || '').trim().toLowerCase();
  _renderPAIngList(_paIngModalQuery);
}

function _renderPAIngList(query) {
  var listEl = document.getElementById('paIngList');
  if (!listEl) return;

  var cat = _paIngModalCat;
  var candidates = [];
  var seen = {};

  /* Ingredienti della categoria dal database (gestisce anche compat Carne/Pesce) */
  var catCompat = (cat === '🥩 Carne' || cat === '🐟 Pesce')
    ? [cat, '🥩 Carne e Pesce']
    : [cat];

  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function(i) {
      if (i && i.name && !seen[i.name]) {
        var matchCat = catCompat.indexOf(i.category) !== -1;
        if (matchCat && i.category === '🥩 Carne e Pesce') {
          var isFish = ['🐟','🦑','🐙'].indexOf(i.icon || '') !== -1;
          if (cat === '🐟 Pesce' && !isFish) matchCat = false;
          if (cat === '🥩 Carne' && isFish) matchCat = false;
        }
        if (matchCat) { seen[i.name] = true; candidates.push(i.name); }
      }
    });
  }
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    customIngredients.forEach(function(i) {
      if (i && i.name && catCompat.indexOf(i.category) !== -1 && !seen[i.name]) {
        seen[i.name] = true; candidates.push(i.name);
      }
    });
  }

  /* Se nessun ingrediente in categoria, mostra tutti */
  if (!candidates.length) {
    if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
      defaultIngredients.forEach(function(i) {
        if (i && i.name && !seen[i.name]) { seen[i.name] = true; candidates.push(i.name); }
      });
    }
  }

  /* Filtra per query */
  if (query) {
    candidates = candidates.filter(function(n) { return n.toLowerCase().includes(query); });
  }

  candidates.sort(function(a, b) { return a.localeCompare(b, 'it'); });

  /* Già presenti nel piano per questo pasto+categoria */
  var alreadyIn = [];
  if (_paIngModalMeal && pianoAlimentare[_paIngModalMeal] &&
      Array.isArray(pianoAlimentare[_paIngModalMeal][cat])) {
    alreadyIn = pianoAlimentare[_paIngModalMeal][cat].map(function(i) { return i.name; });
  }

  var addNewBtn =
    '<button class="add-by-cat-new-btn" ' +
            'onclick="openPACustomIngModal()">' +
      '＋ Aggiungi ingrediente personalizzato' +
    '</button>';

  if (!candidates.length) {
    listEl.innerHTML = addNewBtn +
      '<p style="color:var(--text-3);font-size:.9em;padding:12px 0;">Nessun ingrediente trovato.</p>';
    return;
  }

  listEl.innerHTML = addNewBtn + candidates.slice(0, 60).map(function(name) {
    var inPlan  = alreadyIn.indexOf(name) !== -1;
    var escName = paEscQ(name);
    return (
      '<div class="add-by-cat-item' + (inPlan ? ' in-fridge' : '') + '" ' +
           'onclick="selectPAIng(\'' + escName + '\')">' +
        '<span>' + name + '</span>' +
        (inPlan ? '<span class="fi-in-fridge-badge">✔ nel piano</span>' : '') +
      '</div>'
    );
  }).join('');
}

/* ──────────────────────────────────────────────────────────
   SELEZIONA INGREDIENTE — apre il modal quantità
   (variabili salvate PRIMA di closePAIngModal)
────────────────────────────────────────────────────────── */
function selectPAIng(name) {
  /* Salva stato PRIMA che closePAIngModal lo azzeri */
  var mealKey = _paIngModalMeal;
  var catName = _paIngModalCat;
  var altIdx  = _paAltIngIdx;

  closePAIngModal();

  if (!name || !mealKey || !catName) return;

  /* Passa al modal quantità */
  _paQtyName   = name;
  _paQtyMeal   = mealKey;
  _paQtyCat    = catName;
  _paQtyAltIdx = altIdx;
  _paQtyUnit   = paGetIngUnit(name);

  openPAQtyModal();
}

/* ── Modal quantità ── */
function openPAQtyModal() {
  var modal = document.getElementById('paQtyModal');
  if (!modal) return;

  var nameEl = document.getElementById('paQtyIngName');
  var qtyEl  = document.getElementById('paQtyInput');
  var unitEl = document.getElementById('paQtyUnit');

  if (nameEl) nameEl.textContent = _paQtyName;
  if (qtyEl)  { qtyEl.value = ''; }
  if (unitEl) {
    unitEl.value = _paQtyUnit;
    /* Seleziona l'unità corretta se c'è */
    var opts = unitEl.options;
    var matched = false;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === _paQtyUnit) { unitEl.selectedIndex = i; matched = true; break; }
    }
    if (!matched) unitEl.value = 'g';
  }

  var titleEl = document.getElementById('paQtyTitle');
  if (titleEl) {
    titleEl.textContent = _paQtyAltIdx >= 0 ? '↔ Alternativa' : '＋ Aggiungi ingrediente';
  }

  modal.classList.add('active');
  setTimeout(function() { if (qtyEl) qtyEl.focus(); }, 120);
}

function closePAQtyModal() {
  var modal = document.getElementById('paQtyModal');
  if (modal) modal.classList.remove('active');
}

function confirmPAQty() {
  var qtyEl  = document.getElementById('paQtyInput');
  var unitEl = document.getElementById('paQtyUnit');

  var qty  = parseFloat(qtyEl ? qtyEl.value : '');
  var unit = (unitEl ? unitEl.value : '') || _paQtyUnit || 'g';
  if (isNaN(qty)) qty = null;

  var name    = _paQtyName;
  var mealKey = _paQtyMeal;
  var catName = _paQtyCat;
  var altIdx  = _paQtyAltIdx;

  closePAQtyModal();

  if (!name || !mealKey || !catName) return;

  paEnsureStructure();

  if (altIdx >= 0) {
    var arr = pianoAlimentare[mealKey][catName];
    if (!Array.isArray(arr) || !arr[altIdx]) return;
    if (!Array.isArray(arr[altIdx].alternatives)) arr[altIdx].alternatives = [];
    arr[altIdx].alternatives.push({ name: name, quantity: qty, unit: unit });
  } else {
    if (!Array.isArray(pianoAlimentare[mealKey][catName])) pianoAlimentare[mealKey][catName] = [];
    var exists = pianoAlimentare[mealKey][catName].some(function(i) {
      return i.name && i.name.toLowerCase() === name.toLowerCase();
    });
    if (exists) {
      if (typeof showToast === 'function') showToast('⚠️ Ingrediente già presente', 'warning');
      return;
    }
    pianoAlimentare[mealKey][catName].push({ name: name, quantity: qty, unit: unit, alternatives: [] });
  }

  if (typeof saveData === 'function') saveData();
  renderPianoAlimentare();
  if (typeof showToast === 'function') showToast('✅ ' + name + ' aggiunto', 'success');

  setTimeout(function() {
    var body = document.getElementById('pa-body-' + mealKey);
    var chev = document.getElementById('pa-chev-' + mealKey);
    if (body && !body.classList.contains('open')) {
      body.classList.add('open');
      if (chev) chev.textContent = '▴';
    }
  }, 80);
}

/* ──────────────────────────────────────────────────────────
   MODAL INGREDIENTE PERSONALIZZATO
   (salva variabili PRIMA di closePAIngModal)
────────────────────────────────────────────────────────── */
var _paCustomIngMeal = '';
var _paCustomIngCat  = '';
var _paCustomIngAlt  = -1;

function openPACustomIngModal() {
  /* Salva PRIMA che closePAIngModal azzeri le variabili */
  var mealKey = _paIngModalMeal;
  var catName = _paIngModalCat;
  var altIdx  = _paAltIngIdx;

  closePAIngModal();

  _paCustomIngMeal = mealKey;
  _paCustomIngCat  = catName;
  _paCustomIngAlt  = altIdx;

  var modal = document.getElementById('paCustomIngModal');
  if (!modal) return;

  var catLabel = (catName || '').replace(/^[^\s]+\s/, '');
  var titleEl  = document.getElementById('paCustomIngTitle');
  if (titleEl) titleEl.textContent = '＋ Nuovo ingrediente — ' + catLabel;

  var nameEl = document.getElementById('paCustomIngName');
  var qtyEl  = document.getElementById('paCustomIngQty');
  var unitEl = document.getElementById('paCustomIngUnit');
  if (nameEl) nameEl.value = '';
  if (qtyEl)  qtyEl.value  = '';
  if (unitEl) unitEl.value = 'g';

  modal.classList.add('active');
  setTimeout(function() { if (nameEl) nameEl.focus(); }, 120);
}

function closePACustomIngModal() {
  var modal = document.getElementById('paCustomIngModal');
  if (modal) modal.classList.remove('active');
}

function confirmPACustomIng() {
  var nameEl = document.getElementById('paCustomIngName');
  var qtyEl  = document.getElementById('paCustomIngQty');
  var unitEl = document.getElementById('paCustomIngUnit');
  if (!nameEl) return;

  var name = nameEl.value.trim();
  if (!name) {
    if (typeof showToast === 'function') showToast('⚠️ Inserisci il nome dell\'ingrediente', 'warning');
    return;
  }
  var qty  = parseFloat(qtyEl ? qtyEl.value : '');
  if (isNaN(qty)) qty = null;
  var unit = (unitEl ? unitEl.value : '') || 'g';

  closePACustomIngModal();
  paEnsureStructure();

  var mealKey = _paCustomIngMeal;
  var catName = _paCustomIngCat;
  var altIdx  = _paCustomIngAlt;

  if (!mealKey || !catName) return;

  /* Salva anche come ingrediente personalizzato nel database */
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    var already = customIngredients.some(function(i) {
      return i && i.name && i.name.toLowerCase() === name.toLowerCase();
    });
    if (!already) {
      customIngredients.push({ name: name, category: catName, unit: unit, icon: '🧂', isCustom: true });
    }
  }

  if (altIdx >= 0) {
    var arr = pianoAlimentare[mealKey][catName];
    if (!Array.isArray(arr) || !arr[altIdx]) return;
    if (!Array.isArray(arr[altIdx].alternatives)) arr[altIdx].alternatives = [];
    arr[altIdx].alternatives.push({ name: name, quantity: qty, unit: unit });
  } else {
    if (!Array.isArray(pianoAlimentare[mealKey][catName])) pianoAlimentare[mealKey][catName] = [];
    pianoAlimentare[mealKey][catName].push({ name: name, quantity: qty, unit: unit, alternatives: [] });
  }

  if (typeof saveData === 'function') saveData();
  renderPianoAlimentare();
  if (typeof showToast === 'function') showToast('✅ ' + name + ' aggiunto', 'success');

  setTimeout(function() {
    var body = document.getElementById('pa-body-' + mealKey);
    var chev = document.getElementById('pa-chev-' + mealKey);
    if (body && !body.classList.contains('open')) {
      body.classList.add('open');
      if (chev) chev.textContent = '▴';
    }
  }, 80);
}

/* ──────────────────────────────────────────────────────────
   SEZIONE LIMITI — usa weeklyLimits da data.js
   Permette di modificare i valori MAX
────────────────────────────────────────────────────────── */
function buildPALimitiSection() {
  var wl = (typeof weeklyLimits !== 'undefined' && weeklyLimits) ? weeklyLimits : {};
  var keys = Object.keys(wl);

  if (!keys.length) {
    return (
      '<div class="pa-limiti-section">' +
        '<div class="pa-limiti-header">' +
          '<span class="pa-limiti-icon">📊</span>' +
          '<span class="pa-limiti-title">Limiti settimanali</span>' +
        '</div>' +
        '<div class="pa-limiti-body">' +
          '<p style="padding:16px 18px;color:var(--text-light);font-size:.85rem;">Nessun limite configurato.</p>' +
        '</div>' +
      '</div>'
    );
  }

  var rows = keys.map(function(key) {
    var lim   = wl[key];
    var icon  = lim.icon  || '📊';
    var label = key;
    var unit  = lim.unit  || '';
    var max   = (lim.max !== undefined && lim.max !== null) ? lim.max : '';
    var keyEsc = paEscQ(key);
    return (
      '<div class="pa-limit-row">' +
        '<span class="pa-limit-icon">' + icon + '</span>' +
        '<div class="pa-limit-info">' +
          '<span class="pa-limit-label">' + label + '</span>' +
          '<span class="pa-limit-unit">' + unit + '</span>' +
        '</div>' +
        '<div class="pa-limit-right">' +
          '<span class="pa-limit-cur">Attuale: ' + (lim.current || 0) + '</span>' +
          '<label class="pa-limit-max-label">Max</label>' +
          '<input type="number" min="0" step="1" value="' + max + '" ' +
                 'placeholder="—" ' +
                 'onchange="savePALimit(\'' + keyEsc + '\',this.value)" ' +
                 'class="pa-limit-input">' +
        '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="pa-limiti-section">' +
      '<div class="pa-limiti-header">' +
        '<span class="pa-limiti-icon">📊</span>' +
        '<span class="pa-limiti-title">Limiti settimanali</span>' +
        '<span class="pa-limiti-sub">Imposta i valori massimi</span>' +
      '</div>' +
      '<div class="pa-limiti-body">' + rows + '</div>' +
    '</div>'
  );
}

function savePALimit(key, val) {
  if (typeof weeklyLimits === 'undefined' || !weeklyLimits || !weeklyLimits[key]) return;
  var n = parseFloat(val);
  weeklyLimits[key].max = isNaN(n) ? 0 : n;
  if (typeof saveData === 'function') saveData();
}

/* ──────────────────────────────────────────────────────────
   INIT MODAL LISTENERS
────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  /* Chiudi modali cliccando sfondo */
  ['paIngModal', 'paCustomIngModal', 'paQtyModal'].forEach(function(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.addEventListener('click', function(e) {
      if (e.target !== m) return;
      if (id === 'paIngModal')        closePAIngModal();
      if (id === 'paCustomIngModal')  closePACustomIngModal();
      if (id === 'paQtyModal')        closePAQtyModal();
    });
  });

  /* Enter per confermare quantità */
  var qtyEl = document.getElementById('paQtyInput');
  if (qtyEl) {
    qtyEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter')  confirmPAQty();
      if (e.key === 'Escape') closePAQtyModal();
    });
  }

  /* Enter/Escape custom ing */
  var nameEl = document.getElementById('paCustomIngName');
  if (nameEl) {
    nameEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter')  confirmPACustomIng();
      if (e.key === 'Escape') closePACustomIngModal();
    });
  }
});

/* ══════════════════════════════════════════════════════════
   WIZARD — configurazione guidata pasto per pasto
══════════════════════════════════════════════════════════ */
var _wizStep = 0; /* 0-4 = pasti, 5 = limiti */

function openPAWizard() {
  _wizStep = 0;
  paEnsureStructure();
  var overlay = document.getElementById('paWizardOverlay');
  if (!overlay) { _createWizardOverlay(); }
  _renderWizardStep();
  var ov = document.getElementById('paWizardOverlay');
  if (ov) ov.style.display = 'flex';
}

function closePAWizard() {
  var ov = document.getElementById('paWizardOverlay');
  if (ov) ov.style.display = 'none';
  renderPianoAlimentare();
  if (typeof saveData === 'function') saveData();
  if (typeof showToast === 'function') showToast('✅ Piano salvato', 'success');
}

function _createWizardOverlay() {
  var div = document.createElement('div');
  div.id = 'paWizardOverlay';
  div.className = 'wizard-overlay';
  div.style.display = 'none';
  document.body.appendChild(div);
}

function _renderWizardStep() {
  var ov = document.getElementById('paWizardOverlay');
  if (!ov) return;

  var isLimits = (_wizStep >= PA_MEALS.length);
  var meal     = !isLimits ? PA_MEALS[_wizStep] : null;

  /* ── progress dots ── */
  var dots = PA_MEALS.map(function(m, i) {
    var cls = i < _wizStep ? 'done' : (i === _wizStep ? 'active' : '');
    return '<div class="wizard-progress-dot ' + cls + '" title="' + m.label + '"></div>';
  }).join('') + '<div class="wizard-progress-dot' + (isLimits ? ' active' : '') + '" title="Limiti">📊</div>';

  /* ── header ── */
  var headerTitle = isLimits
    ? '📊 Limiti settimanali (facoltativo)'
    : (meal.emoji + ' ' + meal.label);
  var headerSub = isLimits
    ? 'Imposta i valori massimi settimanali'
    : ('Pasto ' + (_wizStep + 1) + ' di ' + PA_MEALS.length);

  /* ── body ── */
  var body = isLimits ? _buildWizardLimitsBody() : _buildWizardMealBody(meal);

  /* ── footer ── */
  var prevBtn = _wizStep > 0
    ? '<button class="rc-btn rc-btn-outline" onclick="wizPrev()">← Indietro</button>'
    : '<button class="rc-btn rc-btn-outline" onclick="closePAWizard()">Annulla</button>';

  var nextBtn = isLimits
    ? '<button class="rc-btn rc-btn-primary" onclick="closePAWizard()">💾 Salva piano</button>'
    : '<button class="rc-btn rc-btn-primary" onclick="wizNext()">' +
        (_wizStep < PA_MEALS.length - 1 ? 'Prossimo pasto →' : 'Imposta limiti →') +
      '</button>';

  ov.innerHTML =
    '<div class="wizard-header">' +
      '<button class="rc-btn-icon" onclick="closePAWizard()" title="Chiudi" style="flex-shrink:0;">✕</button>' +
      '<div class="wizard-step-info">' +
        '<div>' + headerTitle + '</div>' +
        '<div class="wizard-step-sub">' + headerSub + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="wizard-progress">' + dots + '</div>' +
    '<div class="wizard-body">' + body + '</div>' +
    '<div class="wizard-footer">' + prevBtn + nextBtn + '</div>';
}

function _buildWizardMealBody(meal) {
  var items = [];
  var allCats = PA_CATEGORIES.concat(['🧂 Altro']);
  allCats.forEach(function(cat) {
    var arr = (pianoAlimentare[meal.key] && Array.isArray(pianoAlimentare[meal.key][cat]))
      ? pianoAlimentare[meal.key][cat] : [];
    arr.forEach(function(ing, idx) {
      if (ing && ing.name) items.push({ cat: cat, idx: idx, ing: ing });
    });
  });

  var ingChips = items.length
    ? items.map(function(it) {
        var qty = it.ing.quantity ? ' ' + it.ing.quantity + (it.ing.unit || 'g') : '';
        var catE = paEscQ(it.cat);
        return '<span class="wizard-ing-chip" onclick="wizRemoveIng(\'' + paEscQ(meal.key) + '\',\'' + catE + '\',' + it.idx + ')">' +
          paCatIcon(it.cat) + ' ' + it.ing.name + (qty ? '<small>' + qty + '</small>' : '') +
          '<span class="wizard-ing-chip-del">✕</span>' +
        '</span>';
      }).join('')
    : '<span class="wizard-empty-ings">Nessun ingrediente aggiunto ancora.</span>';

  /* Griglia categorie */
  var catBtns = PA_CATEGORIES.map(function(cat) {
    var catE = paEscQ(cat);
    var mealE = paEscQ(meal.key);
    return '<button class="wizard-cat-btn" onclick="wizOpenCat(\'' + mealE + '\',\'' + catE + '\')">' +
      paCatIcon(cat) + ' ' + cat.replace(/^[^\s]+\s/, '') +
    '</button>';
  }).join('');

  return (
    '<div class="wizard-current-ings">' +
      '<div class="wizard-ings-label">Ingredienti aggiunti</div>' +
      '<div>' + ingChips + '</div>' +
    '</div>' +
    '<div class="wizard-ings-label" style="margin-bottom:8px;">Aggiungi ingrediente per categoria</div>' +
    '<div class="wizard-cats-grid">' + catBtns + '</div>'
  );
}

function _buildWizardLimitsBody() {
  var wl = (typeof weeklyLimits !== 'undefined' && weeklyLimits) ? weeklyLimits : {};
  var keys = Object.keys(wl);
  if (!keys.length) return '<p style="color:var(--text-3);font-size:.9rem;padding:12px 0;">Nessun limite configurato nel sistema.</p>';

  var rows = keys.map(function(key) {
    var lim  = wl[key];
    var max  = (lim.max !== undefined && lim.max !== null) ? lim.max : '';
    var keyE = paEscQ(key);
    return (
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<span style="font-size:1.1rem;width:24px;">' + (lim.icon || '📊') + '</span>' +
        '<span style="flex:1;font-weight:600;font-size:.9rem;">' + key + '</span>' +
        '<span style="font-size:.75rem;color:var(--text-3);margin-right:4px;">' + (lim.unit || '') + '</span>' +
        '<label style="font-size:.72rem;font-weight:700;color:var(--text-3);">Max</label>' +
        '<input type="number" min="0" step="1" value="' + max + '" placeholder="—" ' +
               'onchange="savePALimit(\'' + keyE + '\',this.value)" ' +
               'style="width:60px;text-align:center;padding:5px;border:1.5px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);font-size:.9rem;">' +
      '</div>'
    );
  }).join('');

  return '<div class="wizard-limits-form" style="padding:0 12px;">' + rows + '</div>';
}

function wizNext() {
  _wizStep++;
  _renderWizardStep();
}
function wizPrev() {
  _wizStep = Math.max(0, _wizStep - 1);
  _renderWizardStep();
}

function wizOpenCat(mealKey, catName) {
  /* Salva stato wizard e apri il modal ingrediente (il wizard resta aperto sotto) */
  _paIngModalMeal  = mealKey;
  _paIngModalCat   = catName;
  _paIngModalQuery = '';
  _paAltIngIdx     = -1;

  var modal = document.getElementById('paIngModal');
  if (!modal) return;

  var titleEl = document.getElementById('paIngModalTitle');
  if (titleEl) titleEl.textContent = '＋ Aggiungi a ' + catName.replace(/^[^\s]+\s/, '');

  var searchEl = document.getElementById('paIngSearch');
  if (searchEl) searchEl.value = '';

  _renderPAIngList('');
  modal.classList.add('active');

  /* Override: dopo aver aggiunto, aggiorna il wizard */
  _wizardIngCallback = true;
  setTimeout(function() { if (searchEl) searchEl.focus(); }, 120);
}

var _wizardIngCallback = false;

function wizRemoveIng(mealKey, catName, idx) {
  paEnsureStructure();
  var arr = pianoAlimentare[mealKey] && pianoAlimentare[mealKey][catName];
  if (!Array.isArray(arr)) return;
  arr.splice(idx, 1);
  if (typeof saveData === 'function') saveData();
  _renderWizardStep();
}

/* Hook: dopo confirmPAQty, se siamo nel wizard, aggiorna la visualizzazione */
var _origConfirmPAQty = null;
document.addEventListener('DOMContentLoaded', function() {
  /* Patch confirmPAQty per aggiornare il wizard */
  var _origConfirm = window.confirmPAQty;
  window.confirmPAQty = function() {
    if (typeof _origConfirm === 'function') _origConfirm();
    var ov = document.getElementById('paWizardOverlay');
    if (ov && ov.style.display !== 'none') {
      setTimeout(function() { _renderWizardStep(); }, 80);
    }
  };
});
