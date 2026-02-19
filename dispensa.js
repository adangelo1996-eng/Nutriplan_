/* ============================================================
   DISPENSA.JS — gestione dispensa e frigo
   ============================================================ */

var pantrySearchQuery = '';

/* ============================================================
   UTILITY
   ============================================================ */
function getCategoryIcon(cat) {
  var map = {
    '🥩 Carne e Pesce':       '🥩',
    '🥛 Latticini e Uova':    '🥛',
    '🌾 Cereali e Legumi':    '🌾',
    '🥦 Verdure':             '🥦',
    '🍎 Frutta':              '🍎',
    '🥑 Grassi e Condimenti': '🥑',
    '🍫 Dolci e Snack':       '🍫',
    '🧂 Cucina':              '🧂',
    '🧂 Altro':               '🧂'
  };
  return (cat && map[cat]) ? map[cat] : '🧂';
}

function guessCategoryFromMeal(mealKey) {
  var map = {
    colazione: '🌾 Cereali e Legumi',
    spuntino:  '🍎 Frutta',
    pranzo:    '🌾 Cereali e Legumi',
    merenda:   '🍎 Frutta',
    cena:      '🥩 Carne e Pesce'
  };
  return map[mealKey] || '🧂 Altro';
}

function safeid(name) {
  return String(name).replace(/[^a-zA-Z0-9]/g, '_');
}

function escQ(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function getStep(unit) {
  if (['kg', 'l'].indexOf(unit) !== -1) return 0.1;
  if (['cucchiai', 'cucchiaini', 'fette', 'pz', 'porzione'].indexOf(unit) !== -1) return 1;
  return 10;
}

/* Restituisce true se la chiave è valida per pantryItems */
function isValidPantryKey(k) {
  return k &&
         typeof k === 'string' &&
         k.trim() !== '' &&
         k !== 'undefined' &&
         k !== 'null';
}

/* Restituisce true se l'item ha un name valido */
function isValidItem(item) {
  return item &&
         typeof item === 'object' &&
         item.name &&
         typeof item.name === 'string' &&
         item.name.trim() !== '';
}

/* ============================================================
   GET TUTTI GLI ITEM (default + custom) — con sanitizzazione
   ============================================================ */
function getAllPantryItems() {
  var result = [];
  var seen   = {};

  /* 1. Ingredienti dal piano alimentare */
  var mealKeys = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
  mealKeys.forEach(function (mk) {
    var mp = (mealPlan && mealPlan[mk]) ? mealPlan[mk] : {};
    ['principale', 'contorno', 'frutta', 'extra'].forEach(function (cat) {
      var arr = mp[cat];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (item) {
        /* GUARD: salta qualsiasi item senza name valido */
        if (!isValidItem(item)) return;
        var name = item.name.trim();
        if (seen[name]) return;
        seen[name] = true;
        var pd = (pantryItems && pantryItems[name]) ? pantryItems[name] : {};
        result.push({
          name:     name,
          quantity: typeof pd.quantity === 'number' ? pd.quantity : 0,
          unit:     pd.unit     || item.unit || 'g',
          category: pd.category || guessCategoryFromMeal(mk),
          icon:     pd.icon     || getCategoryIcon(pd.category || guessCategoryFromMeal(mk)),
          isCustom: false
        });
      });
    });
  });

  /* 2. Ingredienti default (data.js) */
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function (item) {
      if (!isValidItem(item)) return;
      var name = item.name.trim();
      if (seen[name]) return;
      seen[name] = true;
      var pd = (pantryItems && pantryItems[name]) ? pantryItems[name] : {};
      result.push({
        name:     name,
        quantity: typeof pd.quantity === 'number' ? pd.quantity : 0,
        unit:     pd.unit || item.unit || 'g',
        category: item.category || '🧂 Altro',
        icon:     item.icon || getCategoryIcon(item.category),
        isCustom: false
      });
    });
  }

  /* 3. Ingredienti custom */
  if (Array.isArray(customIngredients)) {
    customIngredients.forEach(function (item) {
      if (!isValidItem(item)) return;
      var name = item.name.trim();
      if (seen[name]) return;
      seen[name] = true;
      var pd = (pantryItems && pantryItems[name]) ? pantryItems[name] : {};
      result.push({
        name:     name,
        quantity: typeof pd.quantity === 'number' ? pd.quantity : 0,
        unit:     pd.unit || item.unit || 'g',
        category: item.category || '🧂 Altro',
        icon:     item.icon || getCategoryIcon(item.category),
        isCustom: true
      });
    });
  }

  /* 4. Qualsiasi altro item in pantryItems non ancora visto
        (GUARD: salta chiavi non valide come "undefined", "null", "") */
  if (pantryItems && typeof pantryItems === 'object') {
    Object.keys(pantryItems).forEach(function (name) {
      if (!isValidPantryKey(name)) return;   /* <-- fix chiave "undefined" */
      if (seen[name]) return;
      seen[name] = true;
      var pd = pantryItems[name];
      if (!pd || typeof pd !== 'object') return;
      result.push({
        name:     name,
        quantity: typeof pd.quantity === 'number' ? pd.quantity : 0,
        unit:     pd.unit     || 'g',
        category: pd.category || '🧂 Altro',
        icon:     pd.icon     || '🧂',
        isCustom: pd.isCustom || false
      });
    });
  }

  /* Ordina: prima quelli con quantità > 0, poi alfabetico */
  result.sort(function (a, b) {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    return a.name.localeCompare(b.name, 'it');
  });

  return result;
}

/* ============================================================
   RENDER DISPENSA
   ============================================================ */
function renderPantry() {
  var el = document.getElementById('pantryContent');
  if (!el) return;

  var allItems = getAllPantryItems();
  var filtered = filterItems(allItems, pantrySearchQuery);

  if (!filtered.length) {
    el.innerHTML = pantrySearchQuery
      ? '<div class="empty-state"><div class="empty-state-icon">🔍</div>' +
        '<p>Nessun risultato per "<strong>' + pantrySearchQuery + '</strong>"</p></div>'
      : '<div class="empty-state">' +
        '<div class="empty-state-icon">🧺</div>' +
        '<h3>Dispensa vuota</h3>' +
        '<p>Aggiungi ingredienti con il tasto ＋ oppure selezionali dalle categorie del piano.</p>' +
        '</div>';
    return;
  }

  /* Raggruppa per categoria */
  var byCategory = {};
  filtered.forEach(function (item) {
    var cat = item.category || '🧂 Altro';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  /* Ordine fisso categorie */
  var catOrder = [
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
  var sortedCats = Object.keys(byCategory).sort(function (a, b) {
    var ia = catOrder.indexOf(a); if (ia === -1) ia = 999;
    var ib = catOrder.indexOf(b); if (ib === -1) ib = 999;
    return ia - ib;
  });

  var html = '';
  sortedCats.forEach(function (cat) {
    html += '<div class="pantry-category">';
    html += '<div class="category-header">' + cat + '</div>';
    html += '<div class="category-items">';
    byCategory[cat].forEach(function (item) {
      html += buildPantryItemCard(item);
    });
    html += '</div></div>';
  });

  el.innerHTML = html;
}

/* ---- CARD SINGOLO INGREDIENTE ---- */
function buildPantryItemCard(item) {
  if (!isValidItem(item)) return '';

  var name    = item.name;
  var qty     = typeof item.quantity === 'number' ? item.quantity : 0;
  var unit    = item.unit || 'g';
  var icon    = item.icon || getCategoryIcon(item.category);
  var isActive = qty > 0;
  var isCustom = item.isCustom || false;

  var units    = ['g', 'ml', 'pz', 'fette', 'cucchiai', 'cucchiaini', 'porzione', 'kg', 'l'];
  var unitOpts = units.map(function (u) {
    return '<option value="' + u + '"' + (unit === u ? ' selected' : '') + '>' + u + '</option>';
  }).join('');

  return (
    '<div class="pantry-item' + (isActive ? ' active' : '') + '" id="pi_' + safeid(name) + '">' +
      '<div class="item-header">' +
        '<span class="item-icon">' + icon + '</span>' +
        '<span class="item-name">' + name + '</span>' +
        (isCustom
          ? '<button class="delete-btn" onclick="deleteCustomIng(\'' + escQ(name) + '\')" title="Elimina">🗑</button>'
          : '') +
      '</div>' +
      '<div class="item-controls">' +
        '<button class="qty-btn" onclick="adjustQty(\'' + escQ(name) + '\',-1)">−</button>' +
        '<input type="number" class="quantity-input" min="0" step="any" ' +
          'value="' + qty + '" id="qty_' + safeid(name) + '" ' +
          'onchange="setQty(\'' + escQ(name) + '\', this.value)">' +
        '<select class="unit-select" id="unit_' + safeid(name) + '" ' +
          'onchange="setUnit(\'' + escQ(name) + '\', this.value)">' +
          unitOpts +
        '</select>' +
        '<button class="qty-btn" onclick="adjustQty(\'' + escQ(name) + '\',1)">＋</button>' +
      '</div>' +
      (isActive
        ? '<div class="item-available">✔ ' + qty + ' ' + unit + ' disponibili</div>'
        : '') +
    '</div>'
  );
}

/* ============================================================
   AZIONI QUANTITÀ
   ============================================================ */
function adjustQty(name, delta) {
  if (!isValidPantryKey(name)) return;
  initPantryItem(name);
  var step = getStep(pantryItems[name].unit);
  pantryItems[name].quantity = Math.max(
    0,
    Math.round(((pantryItems[name].quantity || 0) + delta * step) * 100) / 100
  );
  saveData();
  updatePantryCardInPlace(name);
}

function setQty(name, val) {
  if (!isValidPantryKey(name)) return;
  initPantryItem(name);
  pantryItems[name].quantity = Math.max(0, parseFloat(val) || 0);
  saveData();
  updatePantryCardInPlace(name);
}

function setUnit(name, unit) {
  if (!isValidPantryKey(name)) return;
  initPantryItem(name);
  pantryItems[name].unit = unit;
  saveData();
}

function initPantryItem(name) {
  if (!isValidPantryKey(name)) return;
  if (!pantryItems[name]) {
    var allItems = getAllPantryItems();
    var found    = allItems.find(function (i) { return i.name === name; });
    pantryItems[name] = {
      quantity: 0,
      unit:     found ? found.unit     : 'g',
      category: found ? found.category : '🧂 Altro',
      icon:     found ? found.icon     : '🧂',
      isCustom: false
    };
  }
}

function updatePantryCardInPlace(name) {
  if (!isValidPantryKey(name)) return;
  var card = document.getElementById('pi_' + safeid(name));
  if (!card) return;
  var allItems = getAllPantryItems();
  var base     = allItems.find(function (i) { return i.name === name; });
  var pd       = pantryItems[name] || {};
  var item     = Object.assign({ name: name }, pd, base ? { icon: base.icon, category: base.category } : {});
  card.outerHTML = buildPantryItemCard(item);
}

/* ============================================================
   FILTRO RICERCA
   ============================================================ */
function filterPantry(query) {
  pantrySearchQuery = (query || '').trim().toLowerCase();
  renderPantry();
}

function clearPantrySearch() {
  var inp = document.getElementById('pantrySearch');
  if (inp) inp.value = '';
  filterPantry('');
}

function filterItems(items, query) {
  if (!query) return items;
  return items.filter(function (item) {
    if (!isValidItem(item)) return false;
    return item.name.toLowerCase().includes(query) ||
           (item.category || '').toLowerCase().includes(query);
  });
}

/* ============================================================
   INGREDIENTE CUSTOM
   ============================================================ */
function openCustomIngModal() {
  var m = document.getElementById('customIngModal');
  if (!m) return;
  m.classList.add('active');
  var inp = document.getElementById('customIngName');
  if (inp) { inp.value = ''; inp.focus(); }
}

function closeCustomIngModal() {
  var m = document.getElementById('customIngModal');
  if (m) m.classList.remove('active');
}

function addCustomIngredient() {
  var nameEl = document.getElementById('customIngName');
  var catEl  = document.getElementById('customIngCategory');
  var unitEl = document.getElementById('customIngUnit');

  var name = (nameEl ? nameEl.value : '').trim();
  if (!name) { alert("Inserisci il nome dell'ingrediente."); return; }

  var cat  = catEl  ? catEl.value  : '🧂 Altro';
  var unit = unitEl ? unitEl.value : 'g';
  var icon = getCategoryIcon(cat);

  /* Verifica duplicati (case-insensitive) */
  var allItems = getAllPantryItems();
  var exists   = allItems.some(function (i) {
    return isValidItem(i) && i.name.toLowerCase() === name.toLowerCase();
  });
  if (exists) { alert('L\'ingrediente "' + name + '" esiste già nella dispensa.'); return; }

  if (!Array.isArray(customIngredients)) customIngredients = [];
  customIngredients.push({ name: name, category: cat, unit: unit, icon: icon });

  pantryItems[name] = { quantity: 0, unit: unit, category: cat, icon: icon, isCustom: true };

  saveData();
  closeCustomIngModal();
  renderPantry();
  if (typeof initIngredientiDatalist === 'function') initIngredientiDatalist();
}

function deleteCustomIng(name) {
  if (!name || !confirm('Eliminare "' + name + '" dalla dispensa?')) return;
  delete pantryItems[name];
  customIngredients = (Array.isArray(customIngredients) ? customIngredients : [])
    .filter(function (i) { return i.name !== name; });
  saveData();
  renderPantry();
}

/* ============================================================
   DATALIST AUTOCOMPLETE
   ============================================================ */
function initIngredientiDatalist() {
  var dl = document.getElementById('ingredientiDatalist');
  if (!dl) return;
  dl.innerHTML = getAllPantryItems()
    .filter(function (i) { return isValidItem(i); })
    .map(function (i) { return '<option value="' + i.name + '">'; })
    .join('');
}

/* ============================================================
   FRIGO
   ============================================================ */
function renderFridge() {
  var el = document.getElementById('fridgeContent');
  if (!el) return;

  var fridgeCats = ['🥩 Carne e Pesce', '🥛 Latticini e Uova', '🥦 Verdure', '🍎 Frutta'];
  var fridgeItems = getAllPantryItems().filter(function (item) {
    return isValidItem(item) && fridgeCats.indexOf(item.category) !== -1;
  });

  if (!fridgeItems.length) {
    el.innerHTML =
      '<div class="empty-state">' +
      '<div class="empty-state-icon">❄️</div>' +
      '<h3>Frigo vuoto</h3>' +
      '<p>Gli ingredienti deperibili (carne, verdure, latticini, frutta) appariranno qui una volta aggiunti alla dispensa.</p>' +
      '</div>';
    return;
  }

  var html = '<div class="fridge-items">';
  fridgeItems.forEach(function (item) {
    var qty = typeof item.quantity === 'number' ? item.quantity : 0;
    html +=
      '<div class="fridge-item">' +
        '<div class="fridge-item-icon">'  + item.icon + '</div>' +
        '<div class="fridge-item-name">'  + item.name + '</div>' +
        '<div class="fridge-item-qty">'   + qty + ' ' + item.unit + '</div>' +
        '<div class="fridge-qty-btns">' +
          '<button class="qty-btn" onclick="adjustQty(\'' + escQ(item.name) + '\',-1)">−</button>' +
          '<button class="qty-btn" onclick="adjustQty(\'' + escQ(item.name) + '\',1)">＋</button>' +
        '</div>' +
      '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}
