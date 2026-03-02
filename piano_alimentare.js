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
  { key: 'colazione', label: 'Colazione' },
  { key: 'spuntino',  label: 'Spuntino'  },
  { key: 'pranzo',    label: 'Pranzo'    },
  { key: 'merenda',   label: 'Merenda'   },
  { key: 'cena',      label: 'Cena'      }
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

/* ── edit mode state ── */
var _paEditMode   = false;  // true = modifica, false = aggiungi
var _paEditIngIdx = -1;     // indice ingrediente in modifica
var _paEditAltIdx = -1;     // indice alternativa in modifica (-1 = modifica ingrediente principale)

/* ──────────────────────────────────────────────────────────
   UTILITY
────────────────────────────────────────────────────────── */
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

  /* Verifica se il piano è vuoto */
  var totalCount = 0;
  PA_MEALS.forEach(function(m) { totalCount += paGetMealCount(m.key); });
  var isEmpty = totalCount === 0;

  /* Nome utente se loggato (es. "il tuo piano alimentare, Mario") — con formattazione n come nel titolo */
  var userNameSuffix = '';
  if (typeof currentUser !== 'undefined' && currentUser) {
    var name = (currentUser.displayName && currentUser.displayName.split(' ')[0]) || currentUser.email || 'Utente';
    var suffix = ', ' + name;
    userNameSuffix = suffix.replace(/n/g, '<span class="page-title-n">n</span>');
  }

  /* Card invito wizard */
  var wizardCard =
    '<div class="pa-wizard-invite' + (isEmpty ? ' pa-wizard-invite-empty' : '') + '">' +
      '<div class="pa-wizard-invite-body">' +
        '<div class="pa-wizard-invite-title">' +
          (isEmpty
            ? 'Configura il tuo pia<span class=\"page-title-n\">n</span>o alime<span class=\"page-title-n\">n</span>tare' + userNameSuffix
            : 'Modifica il tuo pia<span class=\"page-title-n\">n</span>o alime<span class=\"page-title-n\">n</span>tare' + userNameSuffix) +
        '</div>' +
        '<div class="pa-wizard-invite-sub">' +
          (isEmpty
            ? 'Inserisci gli ingredienti pasto per pasto con la configurazione guidata'
            : 'Rivedi e modifica gli ingredienti di ogni pasto') +
        '</div>' +
        '<div class="pa-wizard-invite-actions">' +
          '<button class="pa-wizard-invite-btn" onclick="openPAWizard()">' +
            (isEmpty ? 'Configurazione guidata' : 'Modifica guidata') +
          '</button>' +
          '<button class="pa-wizard-invite-btn pa-wizard-invite-btn-secondary" onclick="goToPianoGenFromPianoPage()">' +
            (totalCount > 0 ? 'Genera piano sostitutivo' : 'Genera piano') +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  /* Popup redirect se piano vuoto */
  if (isEmpty) {
    setTimeout(function() { _showPAEmptyPrompt(); }, 300);
  }

  var html = wizardCard;

  PA_MEALS.forEach(function(meal) {
    html += buildPAMealSection(meal);
  });

  html += buildPALimitiSection();

  el.innerHTML = html;
}

function _showPAEmptyPrompt() {
  /* Evidenzia la card wizard con animazione */
  var card = document.querySelector('.pa-wizard-invite-empty');
  if (card) {
    card.classList.add('pa-wizard-invite-pulse');
    setTimeout(function() { card.classList.remove('pa-wizard-invite-pulse'); }, 1200);
  }
}

/* Apre il generatore piano (piano-gen: sesso, peso, età, ecc.). Se esiste già un piano chiede conferma. */
function goToPianoGenFromPianoPage() {
  var hasPlan = false;
  if (pianoAlimentare && typeof pianoAlimentare === 'object') {
    hasPlan = Object.keys(pianoAlimentare).some(function(mk) {
      var meal = pianoAlimentare[mk];
      if (!meal || typeof meal !== 'object') return false;
      return Object.keys(meal).some(function(cat) {
        return Array.isArray(meal[cat]) && meal[cat].length > 0;
      });
    });
  }
  if (hasPlan) {
    var msg = 'Esiste già un piano alimentare.\nVuoi generarne uno nuovo che potrebbe sostituire quello attuale?';
    if (typeof showAppConfirm === 'function') {
      showAppConfirm({
        title: 'Genera piano',
        message: msg,
        primaryText: 'Sì',
        primaryAction: function() { if (typeof goToPage === 'function') goToPage('piano-gen'); }
      });
      return;
    }
  }
  if (typeof goToPage === 'function') goToPage('piano-gen');
}

/* ──────────────────────────────────────────────────────────
   SEZIONE PASTO
────────────────────────────────────────────────────────── */
function buildPAMealSection(meal) {
  var count   = paGetMealCount(meal.key);
  var mealEsc = escForAttr(meal.key);

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
  var mealEsc = escForAttr(mealKey);
  var catEsc  = escForAttr(catName);
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
  var mealEsc = escForAttr(mealKey);
  var catEsc  = escForAttr(catName);
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
        '<button class="pa-alt-edit" title="Modifica" ' +
                'onclick="editPAAlt(\'' + mealEsc + '\',\'' + catEsc + '\',' + idx + ',' + ai + ')">' +
          '✏️' +
        '</button>' +
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
          '<button class="pa-ing-edit" title="Modifica" ' +
                  'onclick="editPAIng(\'' + mealEsc + '\',\'' + catEsc + '\',' + idx + ')">' +
            '✏️' +
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
  saveData();
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
  saveData();
  renderPianoAlimentare();
}

/* ✏️ MODIFICA INGREDIENTE PRINCIPALE */
function editPAIng(mealKey, catName, idx) {
  paEnsureStructure();
  var arr = pianoAlimentare[mealKey] && pianoAlimentare[mealKey][catName];
  if (!Array.isArray(arr) || !arr[idx]) return;
  
  var item = arr[idx];
  
  /* Imposta modalità edit */
  _paEditMode   = true;
  _paEditIngIdx = idx;
  _paEditAltIdx = -1;
  _paQtyName    = item.name;
  _paQtyMeal    = mealKey;
  _paQtyCat     = catName;
  _paQtyAltIdx  = -1;
  _paQtyUnit    = item.unit || 'g';
  
  openPAQtyModal(item.quantity, item.unit);
}

/* ✏️ MODIFICA ALTERNATIVA */
function editPAAlt(mealKey, catName, ingIdx, altIdx) {
  paEnsureStructure();
  var arr = pianoAlimentare[mealKey] && pianoAlimentare[mealKey][catName];
  if (!Array.isArray(arr) || !arr[ingIdx]) return;
  
  var alts = arr[ingIdx].alternatives;
  if (!Array.isArray(alts) || !alts[altIdx]) return;
  
  var alt = alts[altIdx];
  
  /* Imposta modalità edit */
  _paEditMode   = true;
  _paEditIngIdx = ingIdx;
  _paEditAltIdx = altIdx;
  _paQtyName    = alt.name;
  _paQtyMeal    = mealKey;
  _paQtyCat     = catName;
  _paQtyAltIdx  = ingIdx;
  _paQtyUnit    = alt.unit || 'g';
  
  openPAQtyModal(alt.quantity, alt.unit);
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
    var escName = escForAttr(name);
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

  /* Passa al modal quantità - MODALITÀ AGGIUNGI */
  _paEditMode   = false;
  _paEditIngIdx = -1;
  _paEditAltIdx = -1;
  _paQtyName    = name;
  _paQtyMeal    = mealKey;
  _paQtyCat     = catName;
  _paQtyAltIdx  = altIdx;
  _paQtyUnit    = paGetIngUnit(name);

  openPAQtyModal();
}

/* ── Modal quantità ── */
function openPAQtyModal(existingQty, existingUnit) {
  var modal = document.getElementById('paQtyModal');
  if (!modal) return;

  var nameEl = document.getElementById('paQtyIngName');
  var qtyEl  = document.getElementById('paQtyInput');
  var unitEl = document.getElementById('paQtyUnit');

  if (nameEl) nameEl.textContent = _paQtyName;
  
  /* Pre-popola valori se in modalità edit */
  if (qtyEl) {
    qtyEl.value = (_paEditMode && existingQty !== undefined && existingQty !== null) 
      ? existingQty 
      : '';
  }
  
  if (unitEl) {
    var targetUnit = (_paEditMode && existingUnit) ? existingUnit : _paQtyUnit;
    unitEl.value = targetUnit;
    /* Seleziona l'unità corretta se c'è */
    var opts = unitEl.options;
    var matched = false;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === targetUnit) { unitEl.selectedIndex = i; matched = true; break; }
    }
    if (!matched) unitEl.value = 'g';
  }

  var titleEl = document.getElementById('paQtyTitle');
  if (titleEl) {
    if (_paEditMode) {
      titleEl.textContent = '✏️ Modifica quantità';
    } else {
      titleEl.textContent = _paQtyAltIdx >= 0 ? '↔ Alternativa' : '＋ Aggiungi ingrediente';
    }
  }

  modal.classList.add('active');
  setTimeout(function() { if (qtyEl) qtyEl.focus(); }, 120);
}

function closePAQtyModal() {
  var modal = document.getElementById('paQtyModal');
  if (modal) modal.classList.remove('active');
  /* Reset edit mode */
  _paEditMode   = false;
  _paEditIngIdx = -1;
  _paEditAltIdx = -1;
}

function confirmPAQty() {
  var qtyEl  = document.getElementById('paQtyInput');
  var unitEl = document.getElementById('paQtyUnit');

  var qty  = parseFloat(qtyEl ? qtyEl.value : '');
  var unit = (unitEl ? unitEl.value : '') || _paQtyUnit || 'g';
  
  /* ✅ VALIDAZIONE QUANTITÀ OBBLIGATORIA */
  if (isNaN(qty) || qty <= 0) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Inserisci una quantità valida (maggiore di 0)', 'warning');
    }
    return;
  }

  var name    = _paQtyName;
  var mealKey = _paQtyMeal;
  var catName = _paQtyCat;
  var altIdx  = _paQtyAltIdx;

  closePAQtyModal();

  if (!name || !mealKey || !catName) return;

  paEnsureStructure();

  /* MODALITÀ EDIT */
  if (_paEditMode) {
    var arr = pianoAlimentare[mealKey][catName];
    if (!Array.isArray(arr)) return;
    
    if (_paEditAltIdx >= 0) {
      /* Modifica alternativa */
      var ing = arr[_paEditIngIdx];
      if (!ing || !Array.isArray(ing.alternatives)) return;
      var alt = ing.alternatives[_paEditAltIdx];
      if (alt) {
        alt.quantity = qty;
        alt.unit = unit;
      }
    } else {
      /* Modifica ingrediente principale */
      var item = arr[_paEditIngIdx];
      if (item) {
        item.quantity = qty;
        item.unit = unit;
      }
    }
    
    saveData();
    renderPianoAlimentare();
    if (typeof showToast === 'function') showToast('✅ Quantità aggiornata', 'success');
    return;
  }

  /* MODALITÀ AGGIUNGI (comportamento originale) */
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

  saveData();
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
  
  /* ✅ VALIDAZIONE QUANTITÀ OBBLIGATORIA */
  if (isNaN(qty) || qty <= 0) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Inserisci una quantità valida (maggiore di 0)', 'warning');
    }
    return;
  }
  
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

  saveData();
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
  var wl  = (typeof weeklyLimits !== 'undefined' && weeklyLimits) ? weeklyLimits : {};
  var wlc = (typeof weeklyLimitsCustom !== 'undefined' && weeklyLimitsCustom) ? weeklyLimitsCustom : {};
  var baseKeys   = Object.keys(wl);
  var customKeys = Object.keys(wlc);
  var keys = baseKeys.concat(customKeys);

  if (!keys.length) {
    return (
      '<div class="pa-limiti-section">' +
        '<div class="pa-limiti-header">' +
          '<span class="pa-limiti-title">Limiti settimanali</span>' +
        '</div>' +
        '<div class="pa-limiti-body">' +
          '<p style="padding:16px 18px;color:var(--text-light);font-size:.85rem;">Nessun limite configurato.</p>' +
        '</div>' +
      '</div>'
    );
  }

  var rows = keys.map(function(key) {
    var lim   = wl[key] || wlc[key];
    if (!lim) return '';
    var icon  = lim.icon  || (wlc[key] ? '📌' : '📊');
    var label = lim.label || key;
    var unit  = lim.unit  || '';
    var max   = (lim.max !== undefined && lim.max !== null) ? lim.max : '';
    var keyEsc = escForAttr(key);
    var isCustom = Boolean(wlc[key]);
    return (
      '<div class="pa-limit-row' + (isCustom ? ' pa-limit-row-custom' : '') + '">' +
        '<span class="pa-limit-icon">' + icon + '</span>' +
        '<div class="pa-limit-info">' +
          '<span class="pa-limit-label">' + label + (isCustom ? ' (personalizzato)' : '') + '</span>' +
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
        '<span class="pa-limiti-title">Limiti settimanali</span>' +
      '</div>' +
      '<div class="pa-limiti-body">' +
        rows +
        '<div class="pa-limiti-custom-wrap">' +
          '<div style="font-size:.72rem;font-weight:700;color:var(--text-2);margin-bottom:6px;">➕ Limite personalizzato</div>' +
          '<div class="pa-limiti-custom-row">' +
            '<input id="paCustomLimitName" type="text" placeholder="Nome" class="pa-custom-inp pa-custom-name">' +
            '<input id="paCustomLimitMax" type="number" min="0" step="1" placeholder="Max" class="pa-custom-inp pa-custom-max">' +
            '<button class="rc-btn rc-btn-primary rc-btn-sm" onclick="addPACustomLimit()">Aggiungi</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function savePALimit(key, val) {
  var n = parseFloat(val);
  if (isNaN(n) || n < 0) n = 0;
  if (typeof weeklyLimits !== 'undefined' && weeklyLimits && weeklyLimits[key]) {
    weeklyLimits[key].max = n;
  } else if (typeof weeklyLimitsCustom !== 'undefined' && weeklyLimitsCustom && weeklyLimitsCustom[key]) {
    weeklyLimitsCustom[key].max = n;
  } else {
    return;
  }
  saveData();
}

function addPACustomLimit() {
  var nameEl = document.getElementById('paCustomLimitName');
  var maxEl  = document.getElementById('paCustomLimitMax');
  if (!nameEl || !maxEl) return;
  var name = (nameEl.value || '').trim();
  if (!name) {
    if (typeof showToast === 'function') showToast('⚠️ Inserisci un nome per il limite', 'warning');
    nameEl.focus();
    return;
  }
  var max = parseFloat(maxEl.value);
  if (isNaN(max) || max < 0) max = 0;

  if (typeof weeklyLimitsCustom === 'undefined' || !weeklyLimitsCustom) weeklyLimitsCustom = {};
  if (!weeklyLimitsCustom[name]) {
    weeklyLimitsCustom[name] = { icon:'📌', label:name, unit:'', current:0, max:max };
  } else {
    weeklyLimitsCustom[name].max = max;
  }
  saveData();
  if (typeof renderPianoAlimentare === 'function') renderPianoAlimentare();
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
   Steps: 0-4 = pasti, 5 = limiti, 6 = revisione
══════════════════════════════════════════════════════════ */

/* 0-4: pasti   5: limiti   6: revisione */
var _wizStep = 0;
var WIZ_STEP_LIMITS  = PA_MEALS.length;        /* 5 */
var WIZ_STEP_REVIEW  = PA_MEALS.length + 1;   /* 6 */

function openPAWizard() {
  _wizStep = 0;
  paEnsureStructure();
  if (!document.getElementById('paWizardOverlay')) { _createWizardOverlay(); }
  _renderWizardStep();
  var ov = document.getElementById('paWizardOverlay');
  if (ov) ov.style.display = 'flex';
}

function closePAWizard() {
  var ov = document.getElementById('paWizardOverlay');
  if (ov) ov.style.display = 'none';
  renderPianoAlimentare();
  saveData();
  if (typeof showToast === 'function') showToast('✅ Piano salvato', 'success');
}

function _createWizardOverlay() {
  var div = document.createElement('div');
  div.id        = 'paWizardOverlay';
  div.className = 'wizard-overlay';
  div.style.display = 'none';
  document.body.appendChild(div);
}

/* ── progress bar ── */
function _wizProgressBar() {
  var total = PA_MEALS.length + 2; /* pasti + limiti + revisione */
  var dots  = PA_MEALS.map(function(m, i) {
    var cls = i < _wizStep ? 'done' : (i === _wizStep ? 'active' : '');
    return '<div class="wizard-progress-dot ' + cls + '" title="' + m.label + '"></div>';
  }).join('');
  dots += '<div class="wizard-progress-dot ' + (_wizStep === WIZ_STEP_LIMITS ? 'active' : (_wizStep > WIZ_STEP_LIMITS ? 'done' : '')) + '" title="Limiti"></div>';
  dots += '<div class="wizard-progress-dot ' + (_wizStep === WIZ_STEP_REVIEW ? 'active' : '') + '" title="Revisione"></div>';
  return '<div class="wizard-progress">' + dots + '</div>';
}

function _renderWizardStep() {
  var ov = document.getElementById('paWizardOverlay');
  if (!ov) return;

  var isLimits = _wizStep === WIZ_STEP_LIMITS;
  var isReview = _wizStep === WIZ_STEP_REVIEW;
  var meal     = (!isLimits && !isReview) ? PA_MEALS[_wizStep] : null;

  /* header */
  var headerTitle, headerSub;
  if (isReview) {
    headerTitle = '👁 Revisione piano';
    headerSub   = 'Controlla i tuoi pasti prima di salvare';
  } else if (isLimits) {
    headerTitle = 'Limiti settimanali';
    headerSub   = 'Facoltativo — puoi saltare';
  } else {
    headerTitle = meal.label;
    headerSub   = 'Pasto ' + (_wizStep + 1) + ' di ' + PA_MEALS.length;
  }

  /* body */
  var body;
  if (isReview)      body = _buildWizardReviewBody();
  else if (isLimits) body = _buildWizardLimitsBody();
  else               body = _buildWizardMealBody(meal);

  /* footer */
  var prevBtn = _wizStep > 0
    ? '<button class="rc-btn rc-btn-outline" onclick="wizPrev()">← Indietro</button>'
    : '<button class="rc-btn rc-btn-outline" onclick="closePAWizard()">✕ Annulla</button>';

  var nextBtn;
  if (isReview) {
    nextBtn = '<button class="rc-btn rc-btn-primary" onclick="closePAWizard()">💾 Salva piano</button>';
  } else if (isLimits) {
    nextBtn = '<button class="rc-btn rc-btn-primary" onclick="wizNext()">👁 Revisione →</button>';
  } else if (_wizStep < PA_MEALS.length - 1) {
    nextBtn = '<button class="rc-btn rc-btn-primary" onclick="wizNext()">Prossimo pasto →</button>';
  } else {
    nextBtn = '<button class="rc-btn rc-btn-primary" onclick="wizNext()">📊 Limiti →</button>';
  }

  ov.innerHTML =
    '<div class="wizard-header">' +
      '<button class="rc-btn-icon" onclick="closePAWizard()" title="Chiudi" style="flex-shrink:0;">✕</button>' +
      '<div class="wizard-step-info">' +
        '<div>' + headerTitle + '</div>' +
        '<div class="wizard-step-sub">' + headerSub + '</div>' +
      '</div>' +
    '</div>' +
    _wizProgressBar() +
    '<div class="wizard-body">' + body + '</div>' +
    '<div class="wizard-footer">' + prevBtn + nextBtn + '</div>';
}

/* ── BODY: pasto ── */
function _buildWizardMealBody(meal) {
  var html = '<div class="wiz-meal-indicator">' + meal.label + '</div>';

  /* Categorie come sezioni espandibili (simili alla visualizzazione finale) */
  var allCats = PA_CATEGORIES.concat(['🧂 Altro']);
  allCats.forEach(function(cat) {
    var arr = (pianoAlimentare[meal.key] && Array.isArray(pianoAlimentare[meal.key][cat]))
      ? pianoAlimentare[meal.key][cat] : [];

    /* "Altro" solo se ha elementi */
    if (cat === '🧂 Altro' && !arr.length) return;

    var color   = paCatColor(cat);
    var icon    = paCatIcon(cat);
    var label   = cat.replace(/^[^\s]+\s/, '');
    var catE    = escForAttr(cat);
    var mealE   = escForAttr(meal.key);
    var safeId  = 'wiz-cat-' + meal.key + '-' + cat.replace(/[^a-z0-9]/gi, '_');

    /* Ingredienti della categoria */
    var ingsHtml = arr.length
      ? arr.map(function(ing, idx) {
          if (!ing || !ing.name) return '';
          var qty = ing.quantity ? ' ' + ing.quantity + (ing.unit || 'g') : '';
          return '<div class="wiz-ing-row">' +
            '<span class="wiz-ing-name">' + icon + ' ' + ing.name +
              (qty ? '<small class="wiz-ing-qty">' + qty + '</small>' : '') +
            '</span>' +
            '<button class="wiz-ing-del" title="Rimuovi" ' +
                    'onclick="wizRemoveIng(\'' + mealE + '\',\'' + catE + '\',' + idx + ')">' +
              '✕' +
            '</button>' +
          '</div>';
        }).join('')
      : '';

    var addBtn =
      '<button class="wiz-add-cat-btn" style="--wc:' + color + ';" ' +
              'onclick="wizOpenCat(\'' + mealE + '\',\'' + catE + '\')">' +
        '＋ Aggiungi ' + label +
      '</button>';

    var hasItems   = arr.length > 0;
    var isOpen     = hasItems; /* aperta se ha elementi */
    var bodyStyle  = isOpen ? '' : 'display:none;';

    html +=
      '<div class="wiz-cat-section" style="--pc:' + color + ';">' +
        '<div class="wiz-cat-header" onclick="wizToggleCat(\'' + safeId + '\')">' +
          '<span class="wiz-cat-icon">' + icon + '</span>' +
          '<span class="wiz-cat-label">' + label + '</span>' +
          (hasItems ? '<span class="wiz-cat-count">' + arr.length + '</span>' : '') +
          '<span class="wiz-cat-chev" id="' + safeId + '-chev">' + (isOpen ? '▴' : '▾') + '</span>' +
        '</div>' +
        '<div class="wiz-cat-body" id="' + safeId + '-body" style="' + bodyStyle + '">' +
          ingsHtml +
          addBtn +
        '</div>' +
      '</div>';
  });

  if (!html) {
    html = '<div class="wizard-empty-ings">Nessun ingrediente ancora. Aggiungi tramite le categorie qui sopra.</div>';
  }

  return html;
}

function wizToggleCat(safeId) {
  var body = document.getElementById(safeId + '-body');
  var chev = document.getElementById(safeId + '-chev');
  if (!body) return;
  var hidden = body.style.display === 'none';
  body.style.display = hidden ? '' : 'none';
  if (chev) chev.textContent = hidden ? '▴' : '▾';
}

/* ── BODY: limiti ── */
function _buildWizardLimitsBody() {
  var wl   = (typeof weeklyLimits !== 'undefined' && weeklyLimits) ? weeklyLimits : {};
  var keys = Object.keys(wl);
  if (!keys.length) {
    return '<p style="color:var(--text-3);font-size:.9rem;padding:12px 0;">Nessun limite configurato nel sistema.</p>';
  }

  var rows = keys.map(function(key) {
    var lim  = wl[key];
    var max  = (lim.max !== undefined && lim.max !== null) ? lim.max : '';
    var keyE = escForAttr(key);
    return (
      '<div class="wiz-limit-row">' +
        '<span class="wiz-limit-icon">' + (lim.icon || '📊') + '</span>' +
        '<span class="wiz-limit-label">' + key + '</span>' +
        '<span class="wiz-limit-unit">' + (lim.unit || '') + '</span>' +
        '<input type="number" min="0" step="1" value="' + max + '" placeholder="—" ' +
               'onchange="savePALimit(\'' + keyE + '\',this.value)" ' +
               'class="wiz-limit-input">' +
      '</div>'
    );
  }).join('');

  return '<div class="wizard-limits-form">' + rows + '</div>';
}

/* ── BODY: revisione ── */
function _buildWizardReviewBody() {
  var html = '<div class="wiz-review-intro">Ecco il riepilogo del tuo piano alimentare. Clicca "Salva piano" per confermare.</div>';

  PA_MEALS.forEach(function(meal) {
    var count = paGetMealCount(meal.key);
    var mealItems = [];
    var allCats = PA_CATEGORIES.concat(['🧂 Altro']);
    allCats.forEach(function(cat) {
      var arr = (pianoAlimentare[meal.key] && Array.isArray(pianoAlimentare[meal.key][cat]))
        ? pianoAlimentare[meal.key][cat] : [];
      arr.forEach(function(ing) {
        if (ing && ing.name) mealItems.push({ cat: cat, ing: ing });
      });
    });

    html +=
      '<div class="wiz-review-meal">' +
        '<div class="wiz-review-meal-header">' +
          '<span>' + meal.label + '</span>' +
          '<span class="wiz-review-count">' +
            (count > 0 ? count + ' ingredienti' : 'Vuoto') +
          '</span>' +
        '</div>';

    if (mealItems.length) {
      html += '<div class="wiz-review-ings">' +
        mealItems.map(function(it) {
          var qty = it.ing.quantity ? ' · ' + it.ing.quantity + (it.ing.unit || 'g') : '';
          return '<span class="wiz-review-ing-chip">' +
            paCatIcon(it.cat) + ' ' + it.ing.name + qty +
          '</span>';
        }).join('') +
      '</div>';
    } else {
      html += '<div style="color:var(--text-3);font-size:.83rem;padding:6px 0 4px;">Nessun ingrediente</div>';
    }

    html += '</div>';
  });

  return html;
}

function wizNext() {
  _wizStep = Math.min(_wizStep + 1, WIZ_STEP_REVIEW);
  _renderWizardStep();
}
function wizPrev() {
  _wizStep = Math.max(0, _wizStep - 1);
  _renderWizardStep();
}

function wizOpenCat(mealKey, catName) {
  /* Apre il modal ingredienti sovrapposto al wizard.
     Il modal ha z-index > wizard overlay, quindi viene mostrato correttamente. */
  _paIngModalMeal  = mealKey;
  _paIngModalCat   = catName;
  _paIngModalQuery = '';
  _paAltIngIdx     = -1;

  var modal = document.getElementById('paIngModal');
  if (!modal) return;

  var titleEl = document.getElementById('paIngModalTitle');
  if (titleEl) titleEl.textContent = '＋ Aggiungi a ' + catName.replace(/^[^\s]+\s/, '');

  var searchEl = document.getElementById('paIngSearch');
  if (searchEl) { searchEl.value = ''; }

  _renderPAIngList('');
  modal.classList.add('active');
  setTimeout(function() { if (searchEl) searchEl.focus(); }, 120);
}

function wizRemoveIng(mealKey, catName, idx) {
  paEnsureStructure();
  var arr = pianoAlimentare[mealKey] && pianoAlimentare[mealKey][catName];
  if (!Array.isArray(arr)) return;
  arr.splice(idx, 1);
  saveData();
  _renderWizardStep();
}

/* Hook: dopo confirmPAQty, se il wizard è aperto aggiorna la visualizzazione */
document.addEventListener('DOMContentLoaded', function() {
  var _origConfirm = window.confirmPAQty;
  window.confirmPAQty = function() {
    if (typeof _origConfirm === 'function') _origConfirm();
    var ov = document.getElementById('paWizardOverlay');
    if (ov && ov.style.display !== 'none') {
      setTimeout(function() { _renderWizardStep(); }, 100);
    }
  };
});
