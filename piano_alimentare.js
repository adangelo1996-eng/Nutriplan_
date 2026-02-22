/* ============================================================
   PIANO_ALIMENTARE.JS — v1
   Pagina dedicata all'impostazione del piano alimentare:
   - Struttura: pasto → categorie ingredienti → ingredienti + alternative
   - In fondo: limiti settimanali personalizzati
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

var PA_CATEGORIES = [
  '🥩 Carne e Pesce',
  '🥛 Latticini e Uova',
  '🌾 Cereali e Legumi',
  '🥦 Verdure',
  '🍎 Frutta',
  '🥑 Grassi e Condimenti',
  '🍫 Dolci e Snack',
  '🧂 Cucina',
  '🧂 Altro'
];

var PA_CAT_COLORS = {
  '🥩 Carne e Pesce':        '#ef4444',
  '🥛 Latticini e Uova':     '#f59e0b',
  '🌾 Cereali e Legumi':     '#a16207',
  '🥦 Verdure':              '#22c55e',
  '🍎 Frutta':               '#f97316',
  '🥑 Grassi e Condimenti':  '#84cc16',
  '🍫 Dolci e Snack':        '#a855f7',
  '🧂 Cucina':               '#64748b',
  '🧂 Altro':                '#64748b'
};

var PA_LIMITI_DEF = [
  { key: 'carne',     label: 'Carne rossa',  emoji: '🥩', unit: 'volte/sett.' },
  { key: 'pesce',     label: 'Pesce',         emoji: '🐟', unit: 'volte/sett.' },
  { key: 'uova',      label: 'Uova',          emoji: '🥚', unit: 'volte/sett.' },
  { key: 'latticini', label: 'Latticini',     emoji: '🥛', unit: 'volte/sett.' },
  { key: 'legumi',    label: 'Legumi',        emoji: '🌱', unit: 'volte/sett.' },
  { key: 'cereali',   label: 'Cereali',       emoji: '🌾', unit: 'porzioni/gg' },
  { key: 'frutta',    label: 'Frutta',        emoji: '🍎', unit: 'pz/gg'       },
  { key: 'verdura',   label: 'Verdura',       emoji: '🥦', unit: 'porzioni/gg' }
];

/* ── modal state ── */
var _paIngModalMeal = '';
var _paIngModalCat  = '';
var _paIngModalQuery = '';

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
  PA_MEALS.forEach(function(m) {
    if (!pianoAlimentare[m.key] || typeof pianoAlimentare[m.key] !== 'object')
      pianoAlimentare[m.key] = {};
    PA_CATEGORIES.forEach(function(cat) {
      if (!Array.isArray(pianoAlimentare[m.key][cat]))
        pianoAlimentare[m.key][cat] = [];
    });
  });
}

/* Controlla se un pasto nel pianoAlimentare ha almeno un ingrediente */
function paGetMealCount(mealKey) {
  if (!pianoAlimentare || !pianoAlimentare[mealKey]) return 0;
  var count = 0;
  PA_CATEGORIES.forEach(function(cat) {
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

  var html = '';

  /* Sezione per ogni pasto */
  PA_MEALS.forEach(function(meal) {
    html += buildPAMealSection(meal);
  });

  /* Sezione limiti */
  html += buildPALimitiSection();

  el.innerHTML = html;
}

/* ──────────────────────────────────────────────────────────
   SEZIONE PASTO
────────────────────────────────────────────────────────── */
function buildPAMealSection(meal) {
  var count = paGetMealCount(meal.key);
  var mealEsc = paEscQ(meal.key);

  var catSections = '';
  PA_CATEGORIES.forEach(function(cat) {
    catSections += buildPACatSection(meal.key, cat);
  });

  return (
    '<div class="pa-meal-block" id="pa-meal-' + meal.key + '">' +
      '<div class="pa-meal-header" onclick="togglePAMeal(\'' + mealEsc + '\')">' +
        '<span class="pa-meal-emoji">' + meal.emoji + '</span>' +
        '<span class="pa-meal-label">' + meal.label + '</span>' +
        '<span class="pa-meal-count">' + (count > 0 ? count + ' ing.' : '') + '</span>' +
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
      '<div class="pa-cat-items" id="pa-items-' + mealKey + '-' + catName.replace(/[^a-z0-9]/gi, '_') + '">' +
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
  var nameEsc = paEscQ(item.name);
  var alts    = Array.isArray(item.alternatives) ? item.alternatives : [];
  var hasAlts = alts.length > 0;
  var qty     = item.quantity ? item.quantity + ' ' + (item.unit || 'g') : '';
  var altId   = 'pa-alt-' + mealKey + '-' + catName.replace(/[^a-z0-9]/gi, '_') + '-' + idx;

  var altsHtml = alts.map(function(alt, ai) {
    var altEsc = paEscQ(alt.name || '');
    var altQty = alt.quantity ? alt.quantity + ' ' + (alt.unit || 'g') : '';
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
    '<div class="pa-ing-row" id="pa-ing-' + mealKey + '-' + catName.replace(/[^a-z0-9]/gi, '_') + '-' + idx + '">' +
      '<div class="pa-ing-main">' +
        '<div class="pa-ing-info">' +
          '<span class="pa-ing-name">' + item.name + '</span>' +
          (qty ? '<span class="pa-ing-qty">' + qty + '</span>' : '') +
        '</div>' +
        '<div class="pa-ing-actions">' +
          '<button class="pa-alt-toggle" title="Alternative" ' +
                  'onclick="togglePAAltSection(\'' + altId + '\',this)">' +
            (hasAlts ? '↔ ' + alts.length : '↔') +
          '</button>' +
          '<button class="pa-ing-del" title="Rimuovi" ' +
                  'onclick="removePAIng(\'' + mealEsc + '\',\'' + catEsc + '\',' + idx + ')">' +
            '✕' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="pa-alt-section" id="' + altId + '">' +
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
   altIngIdx >= 0 → stiamo aggiungendo un'alternativa all'ing idx
────────────────────────────────────────────────────────── */
var _paAltIngIdx = -1; /* -1 = aggiunta principale, >=0 = alternativa */

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
      ? '↔ Aggiungi alternativa — ' + label
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

  /* Ingredienti della categoria dal database */
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function(i) {
      if (i && i.name && i.category === cat && !seen[i.name]) {
        seen[i.name] = true;
        candidates.push(i.name);
      }
    });
  }
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    customIngredients.forEach(function(i) {
      if (i && i.name && i.category === cat && !seen[i.name]) {
        seen[i.name] = true;
        candidates.push(i.name);
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
  if (_paIngModalMeal && pianoAlimentare[_paIngModalMeal] && Array.isArray(pianoAlimentare[_paIngModalMeal][cat])) {
    alreadyIn = pianoAlimentare[_paIngModalMeal][cat].map(function(i) { return i.name; });
  }

  var catEsc  = paEscQ(cat);
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
   SELEZIONA INGREDIENTE DAL MODAL
────────────────────────────────────────────────────────── */
function selectPAIng(name) {
  closePAIngModal();
  paEnsureStructure();
  var mealKey = _paIngModalMeal;
  var catName = _paIngModalCat;
  var altIdx  = _paAltIngIdx;
  var unit    = paGetIngUnit(name);

  if (!mealKey || !catName) return;

  if (altIdx >= 0) {
    /* Aggiunge come alternativa */
    var arr = pianoAlimentare[mealKey][catName];
    if (!Array.isArray(arr) || !arr[altIdx]) return;
    if (!Array.isArray(arr[altIdx].alternatives)) arr[altIdx].alternatives = [];
    arr[altIdx].alternatives.push({ name: name, quantity: null, unit: unit });
  } else {
    /* Aggiunge come ingrediente principale */
    if (!Array.isArray(pianoAlimentare[mealKey][catName])) pianoAlimentare[mealKey][catName] = [];
    /* Evita duplicati */
    var exists = pianoAlimentare[mealKey][catName].some(function(i) {
      return i.name && i.name.toLowerCase() === name.toLowerCase();
    });
    if (exists) {
      if (typeof showToast === 'function') showToast('⚠️ Ingrediente già presente', 'warning');
      return;
    }
    pianoAlimentare[mealKey][catName].push({ name: name, quantity: null, unit: unit, alternatives: [] });
  }

  if (typeof saveData === 'function') saveData();
  renderPianoAlimentare();
  if (typeof showToast === 'function') showToast('✅ ' + name + ' aggiunto', 'success');

  /* Riapri il pasto per mostrare l'aggiunta */
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
────────────────────────────────────────────────────────── */
var _paCustomIngMeal = '';
var _paCustomIngCat  = '';
var _paCustomIngAlt  = -1;

function openPACustomIngModal() {
  closePAIngModal();
  _paCustomIngMeal = _paIngModalMeal;
  _paCustomIngCat  = _paIngModalCat;
  _paCustomIngAlt  = _paAltIngIdx;

  var modal = document.getElementById('paCustomIngModal');
  if (!modal) return;

  var catLabel = (_paIngModalCat || '').replace(/^[^\s]+\s/, '');
  var titleEl = document.getElementById('paCustomIngTitle');
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
  var qty  = parseFloat(qtyEl ? qtyEl.value : '') || null;
  var unit = (unitEl ? unitEl.value : '') || 'g';

  closePACustomIngModal();
  paEnsureStructure();

  var mealKey = _paCustomIngMeal;
  var catName = _paCustomIngCat;
  var altIdx  = _paCustomIngAlt;

  if (!mealKey || !catName) return;

  /* Salva anche come ingrediente personalizzato nel database */
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    var already = customIngredients.some(function(i) { return i && i.name && i.name.toLowerCase() === name.toLowerCase(); });
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
   SEZIONE LIMITI
────────────────────────────────────────────────────────── */
function buildPALimitiSection() {
  var limiti = (typeof weeklyLimitsCustom !== 'undefined') ? weeklyLimitsCustom : {};

  var rows = PA_LIMITI_DEF.map(function(it) {
    var val = (limiti[it.key] !== undefined && limiti[it.key] !== null) ? limiti[it.key] : '';
    return (
      '<div class="pa-limit-row">' +
        '<span class="pa-limit-icon">' + it.emoji + '</span>' +
        '<span class="pa-limit-label">' + it.label + '</span>' +
        '<span class="pa-limit-unit">' + it.unit + '</span>' +
        '<input type="number" min="0" step="0.5" value="' + val + '" ' +
               'placeholder="—" ' +
               'onchange="savePALimit(\'' + it.key + '\',this.value)" ' +
               'class="pa-limit-input">' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="pa-limiti-section">' +
      '<div class="pa-limiti-header">' +
        '<span class="pa-limiti-icon">📊</span>' +
        '<span class="pa-limiti-title">Limiti settimanali</span>' +
      '</div>' +
      '<div class="pa-limiti-body">' + rows + '</div>' +
    '</div>'
  );
}

function savePALimit(key, val) {
  if (typeof weeklyLimitsCustom === 'undefined') window.weeklyLimitsCustom = {};
  var n = parseFloat(val);
  if (isNaN(n) || val === '') {
    delete weeklyLimitsCustom[key];
  } else {
    weeklyLimitsCustom[key] = n;
  }
  if (typeof saveData === 'function') saveData();
}

/* ──────────────────────────────────────────────────────────
   INIT MODAL LISTENERS
────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  /* Chiudi modal cliccando sfondo */
  ['paIngModal', 'paCustomIngModal'].forEach(function(id) {
    var m = document.getElementById(id);
    if (m) m.addEventListener('click', function(e) {
      if (e.target === m) {
        if (id === 'paIngModal') closePAIngModal();
        if (id === 'paCustomIngModal') closePACustomIngModal();
      }
    });
  });

  /* Enter su custom ing name */
  var nameEl = document.getElementById('paCustomIngName');
  if (nameEl) {
    nameEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') confirmPACustomIng();
      if (e.key === 'Escape') closePACustomIngModal();
    });
  }
});
