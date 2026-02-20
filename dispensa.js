/* ============================================================
   DISPENSA.JS — v3  FRIGO-ONLY
   Una sola vista: card stile frigo per tutto ciò che hai.
   Gli ingredienti appaiono solo quando qty > 0 (aggiunti
   manualmente o dalla spesa). La dispensa "a lista" è rimossa.
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

function safeid(name) {
  return String(name).replace(/[^a-zA-Z0-9]/g, '_');
}

function escQ(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function getStep(unit) {
  if (['kg','l'].indexOf(unit) !== -1) return 0.1;
  if (['pz','fette','cucchiai','cucchiaini','porzione'].indexOf(unit) !== -1) return 1;
  return 10;
}

function isValidPantryKey(k) {
  return k && typeof k === 'string' && k.trim() !== '' && k !== 'undefined' && k !== 'null';
}

function isValidItem(item) {
  return item && typeof item === 'object' &&
    item.name && typeof item.name === 'string' && item.name.trim() !== '';
}

/* ============================================================
   CATALOGO COMPLETO (per autocomplete, ricette, disponibilità)
   Usato internamente — non più visualizzato come lista
   ============================================================ */
function getAllPantryItems() {
  var result = [];
  var seen   = {};

  /* 1. Dal piano */
  var mealKeys = ['colazione','spuntino','pranzo','merenda','cena'];
  mealKeys.forEach(function (mk) {
    var mp = (typeof mealPlan !== 'undefined' && mealPlan && mealPlan[mk]) ? mealPlan[mk] : {};
    ['principale','contorno','frutta','extra'].forEach(function (cat) {
      var arr = mp[cat];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (item) {
        if (!isValidItem(item)) return;
        var name = item.name.trim();
        if (seen[name]) return;
        seen[name] = true;
        var pd = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
        result.push({
          name:     name,
          quantity: typeof pd.quantity === 'number' ? pd.quantity : 0,
          unit:     pd.unit || item.unit || 'g',
          category: pd.category || '🧂 Altro',
          icon:     pd.icon     || getCategoryIcon(pd.category || '🧂 Altro'),
          isCustom: false
        });
      });
    });
  });

  /* 2. Default */
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function (item) {
      if (!isValidItem(item)) return;
      var name = item.name.trim();
      if (seen[name]) return;
      seen[name] = true;
      var pd = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
      result.push({
        name:     name,
        quantity: typeof pd.quantity === 'number' ? pd.quantity : 0,
        unit:     pd.unit || item.unit || 'g',
        category: item.category || '🧂 Altro',
        icon:     item.icon     || getCategoryIcon(item.category),
        isCustom: false
      });
    });
  }

  /* 3. Custom */
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    customIngredients.forEach(function (item) {
      if (!isValidItem(item)) return;
      var name = item.name.trim();
      if (seen[name]) return;
      seen[name] = true;
      var pd = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
      result.push({
        name:     name,
        quantity: typeof pd.quantity === 'number' ? pd.quantity : 0,
        unit:     pd.unit || item.unit || 'g',
        category: item.category || '🧂 Altro',
        icon:     item.icon     || getCategoryIcon(item.category),
        isCustom: true
      });
    });
  }

  /* 4. Qualsiasi altro in pantryItems con qty > 0 */
  if (typeof pantryItems !== 'undefined' && pantryItems && typeof pantryItems === 'object') {
    Object.keys(pantryItems).forEach(function (name) {
      if (!isValidPantryKey(name) || seen[name]) return;
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

  result.sort(function (a, b) {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    return a.name.localeCompare(b.name, 'it');
  });
  return result;
}

/* ============================================================
   RENDER FRIGO  (unica vista — ex renderPantry)
   ============================================================ */
function renderPantry() { renderFridge(); }

function renderFridge() {
  var el = document.getElementById('pantryContent');
  if (!el) return;

  /* Solo elementi con qty > 0 */
  var active = getAllPantryItems().filter(function (i) {
    return isValidItem(i) && (i.quantity || 0) > 0;
  });

  /* Filtro ricerca */
  if (pantrySearchQuery) {
    var q = pantrySearchQuery;
    active = active.filter(function (i) {
      return i.name.toLowerCase().includes(q) ||
             (i.category || '').toLowerCase().includes(q);
    });
  }

  /* ── STATO VUOTO ── */
  if (!active.length) {
    el.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">❄️</div>' +
        '<h3>' + (pantrySearchQuery ? 'Nessun risultato' : 'Frigo vuoto') + '</h3>' +
        '<p>' + (pantrySearchQuery
          ? 'Nessun ingrediente corrisponde a &ldquo;' + pantrySearchQuery + '&rdquo;.'
          : 'Aggiungi ingredienti con <b>＋</b> oppure segna acquisti nella&nbsp;<b>Spesa</b>.') +
        '</p>' +
        (!pantrySearchQuery
          ? '<button class="btn btn-primary" style="margin-top:14px" onclick="openCustomIngModal()">＋ Aggiungi ingrediente</button>'
          : '') +
      '</div>';
    return;
  }

  /* ── RAGGRUPPA PER CATEGORIA ── */
  var byCategory = {};
  active.forEach(function (item) {
    var cat = item.category || '🧂 Altro';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  var catOrder = [
    '🥩 Carne e Pesce','🥛 Latticini e Uova','🌾 Cereali e Legumi',
    '🥦 Verdure','🍎 Frutta','🥑 Grassi e Condimenti',
    '🍫 Dolci e Snack','🧂 Cucina','🧂 Altro'
  ];

  var sortedCats = Object.keys(byCategory).sort(function (a, b) {
    var ia = catOrder.indexOf(a); if (ia < 0) ia = 999;
    var ib = catOrder.indexOf(b); if (ib < 0) ib = 999;
    return ia - ib;
  });

  var html = '';
  sortedCats.forEach(function (cat) {
    var items = byCategory[cat];
    var count = items.length;
    html +=
      '<div class="fridge-category-section">' +
        '<div class="category-title">' +
          cat +
          '<span class="cat-count-badge">' + count + '</span>' +
        '</div>' +
        '<div class="fridge-items">';
    items.forEach(function (item) {
      html += buildFridgeCard(item);
    });
    html += '</div></div>';
  });

  el.innerHTML = html;
}

/* ============================================================
   CARD FRIGO
   ============================================================ */
function buildFridgeCard(item) {
  if (!isValidItem(item)) return '';
  var name     = item.name;
  var qty      = typeof item.quantity === 'number' ? item.quantity : 0;
  var unit     = item.unit || 'g';
  var icon     = item.icon || getCategoryIcon(item.category);
  var isCustom = item.isCustom || false;
  var sid      = safeid(name);
  var en       = escQ(name);

  return (
    '<div class="fridge-item" id="fc_' + sid + '">' +
      /* Icona categoria */
      '<div class="fridge-item-icon">' + icon + '</div>' +
      /* Nome + delete (solo custom) */
      '<div class="fridge-item-name">' +
        name +
        (isCustom
          ? ' <button class="fridge-delete-btn" onclick="deleteFridgeItem(event,\'' + en + '\')" title="Rimuovi">✕</button>'
          : '') +
      '</div>' +
      /* Quantità — cliccabile per input diretto */
      '<div class="fridge-item-qty" ' +
           'onclick="openQtyEditor(\'' + en + '\')" ' +
           'title="Tocca per modificare" ' +
           'style="cursor:pointer">' +
        '<span id="fqty_' + sid + '">' + qty + '</span> ' + unit +
      '</div>' +
      /* Bottoni +/- */
      '<div class="fridge-qty-btns">' +
        '<button class="qty-btn" onclick="adjustQty(\'' + en + '\',-1)">−</button>' +
        '<button class="qty-btn" onclick="adjustQty(\'' + en + '\',1)">＋</button>' +
      '</div>' +
    '</div>'
  );
}

/* ============================================================
   AZIONI QUANTITÀ
   ============================================================ */
function adjustQty(name, delta) {
  if (!isValidPantryKey(name)) return;
  initPantryItem(name);
  var step = getStep(pantryItems[name].unit || 'g');
  pantryItems[name].quantity = Math.max(
    0,
    Math.round(((pantryItems[name].quantity || 0) + delta * step) * 100) / 100
  );
  saveData();
  /* Aggiorna card in-place; se qty = 0 ri-renderizza tutto */
  if (pantryItems[name].quantity <= 0) {
    renderFridge();
  } else {
    updateFridgeCardInPlace(name);
  }
  /* Aggiorna suggerimenti frigo nel tab Piano se aperto */
  if (typeof updateFridgeSuggestions === 'function') updateFridgeSuggestions();
}

function setQty(name, val) {
  if (!isValidPantryKey(name)) return;
  initPantryItem(name);
  var qty = Math.max(0, parseFloat(val) || 0);
  pantryItems[name].quantity = Math.round(qty * 100) / 100;
  saveData();
  if (pantryItems[name].quantity <= 0) {
    renderFridge();
  } else {
    updateFridgeCardInPlace(name);
  }
}

function setUnit(name, unit) {
  if (!isValidPantryKey(name)) return;
  initPantryItem(name);
  pantryItems[name].unit = unit;
  saveData();
}

function initPantryItem(name) {
  if (!isValidPantryKey(name)) return;
  if (typeof pantryItems === 'undefined') return;
  if (!pantryItems[name]) {
    var found = getAllPantryItems().find(function (i) { return i.name === name; });
    pantryItems[name] = {
      quantity: 0,
      unit:     found ? found.unit     : 'g',
      category: found ? found.category : '🧂 Altro',
      icon:     found ? found.icon     : '🧂',
      isCustom: false
    };
  }
}

/* Aggiorna solo il display della quantità nella card esistente */
function updateFridgeCardInPlace(name) {
  var sid  = safeid(name);
  var el   = document.getElementById('fqty_' + sid);
  if (!el) { renderFridge(); return; }
  var pd   = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
  var qty  = typeof pd.quantity === 'number' ? pd.quantity : 0;
  el.textContent = qty;
}

/* Compatibilità con il vecchio nome usato in app.js */
function updatePantryCardInPlace(name) { updateFridgeCardInPlace(name); }

/* ============================================================
   EDITOR QUANTITÀ (tap sulla qty)
   ============================================================ */
var _qtyEditorTarget = null;

function openQtyEditor(name) {
  _qtyEditorTarget = name;
  var pd   = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
  var qty  = typeof pd.quantity === 'number' ? pd.quantity : 0;
  var unit = pd.unit || 'g';

  var titleEl = document.getElementById('qtyEditorTitle');
  var qtyEl   = document.getElementById('qtyEditorValue');
  var unitEl  = document.getElementById('qtyEditorUnit');

  if (titleEl) titleEl.textContent = '✏️ ' + name;
  if (qtyEl)   qtyEl.value  = qty;

  if (unitEl) {
    var units = ['g','ml','pz','fette','cucchiai','cucchiaini','porzione','kg','l'];
    unitEl.innerHTML = units.map(function (u) {
      return '<option value="' + u + '"' + (unit === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');
  }

  var m = document.getElementById('qtyEditorModal');
  if (m) {
    m.classList.add('active');
    setTimeout(function() { if (qtyEl) { qtyEl.select(); } }, 80);
  }
}

function closeQtyEditor() {
  var m = document.getElementById('qtyEditorModal');
  if (m) m.classList.remove('active');
  _qtyEditorTarget = null;
}

function confirmQtyEditor() {
  var name  = _qtyEditorTarget;
  var qtyEl = document.getElementById('qtyEditorValue');
  var unitEl= document.getElementById('qtyEditorUnit');
  if (!name) { closeQtyEditor(); return; }
  var qty  = parseFloat(qtyEl  ? qtyEl.value  : 0) || 0;
  var unit = unitEl ? unitEl.value : 'g';
  initPantryItem(name);
  pantryItems[name].quantity = Math.max(0, Math.round(qty * 100) / 100);
  pantryItems[name].unit     = unit;
  saveData();
  closeQtyEditor();
  if (pantryItems[name].quantity <= 0) {
    renderFridge();
  } else {
    updateFridgeCardInPlace(name);
  }
}

/* ============================================================
   RIMOZIONE INGREDIENTE
   ============================================================ */
function deleteFridgeItem(e, name) {
  e.stopPropagation();
  if (!confirm('Rimuovere "' + name + '" dal frigo?')) return;
  if (typeof pantryItems !== 'undefined' && pantryItems[name]) {
    delete pantryItems[name];
  }
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    customIngredients = customIngredients.filter(function (i) { return i.name !== name; });
  }
  saveData();
  renderFridge();
  if (typeof initIngredientiDatalist === 'function') initIngredientiDatalist();
}

/* Compatibilità vecchio nome */
function deleteCustomIng(name) {
  deleteFridgeItem({ stopPropagation: function(){} }, name);
}

/* ============================================================
   AGGIUNGI INGREDIENTE
   ============================================================ */
function openCustomIngModal() {
  var m = document.getElementById('customIngModal');
  if (!m) return;
  var nameEl = document.getElementById('customIngName');
  var catEl  = document.getElementById('customIngCategory');
  var unitEl = document.getElementById('customIngUnit');
  var qtyEl  = document.getElementById('customIngQty');
  if (nameEl) { nameEl.value = ''; nameEl.focus(); }
  if (catEl)  catEl.value  = '';
  if (unitEl) unitEl.value = 'g';
  if (qtyEl)  qtyEl.value  = '';
  m.classList.add('active');
}

function closeCustomIngModal() {
  var m = document.getElementById('customIngModal');
  if (m) m.classList.remove('active');
}

function addCustomIngredient() {
  var nameEl = document.getElementById('customIngName');
  var catEl  = document.getElementById('customIngCategory');
  var unitEl = document.getElementById('customIngUnit');
  var qtyEl  = document.getElementById('customIngQty');

  var name = (nameEl ? nameEl.value : '').trim();
  var cat  = catEl  ? catEl.value  : '🧂 Altro';
  var unit = unitEl ? unitEl.value : 'g';
  var qty  = parseFloat(qtyEl ? qtyEl.value : 0) || 0;

  if (!name) { alert("Inserisci il nome dell'ingrediente."); return; }
  if (!cat)  { alert("Seleziona una categoria."); return; }

  var icon = getCategoryIcon(cat);

  /* Verifica duplicato */
  var nl   = name.toLowerCase();
  var dup  = getAllPantryItems().some(function (i) {
    return isValidItem(i) && i.name.toLowerCase() === nl;
  });
  if (dup && qty === 0) {
    /* Esiste già ma qty = 0: porta qty a 1 */
    var existing = getAllPantryItems().find(function (i) { return i.name.toLowerCase() === nl; });
    if (existing) {
      initPantryItem(existing.name);
      pantryItems[existing.name].quantity = 1;
      saveData();
      closeCustomIngModal();
      renderFridge();
      return;
    }
  }

  /* Crea nuovo */
  if (!dup) {
    if (!Array.isArray(customIngredients)) customIngredients = [];
    customIngredients.push({ name: name, category: cat, unit: unit, icon: icon });
  }
  if (typeof pantryItems !== 'undefined') {
    if (!pantryItems[name]) {
      pantryItems[name] = { quantity: qty, unit: unit, category: cat, icon: icon, isCustom: true };
    } else {
      pantryItems[name].quantity = (pantryItems[name].quantity || 0) + qty;
      if (qty > 0) pantryItems[name].unit = unit;
    }
  }

  saveData();
  closeCustomIngModal();
  renderFridge();
  if (typeof initIngredientiDatalist === 'function') initIngredientiDatalist();
}

/* ============================================================
   FILTRO RICERCA
   ============================================================ */
function filterPantry(query) {
  pantrySearchQuery = (query || '').trim().toLowerCase();
  renderFridge();
}

function clearPantrySearch() {
  var inp = document.getElementById('pantrySearch');
  if (inp) inp.value = '';
  filterPantry('');
}

/* ============================================================
   FRIGO SALVATI  (config complete)
   ============================================================ */
function openSaveFridgeModal() {
  var m = document.getElementById('saveFridgeModal');
  if (!m) return;
  var inp = document.getElementById('fridgeName');
  if (inp) inp.value = '';
  m.classList.add('active');
  setTimeout(function() { if (inp) inp.focus(); }, 80);
}

function closeSaveFridgeModal() {
  var m = document.getElementById('saveFridgeModal');
  if (m) m.classList.remove('active');
}

function saveFridge() {
  var name = (document.getElementById('fridgeName').value || '').trim();
  if (!name) { alert('Inserisci un nome.'); return; }
  if (typeof savedFridges === 'undefined') return;
  savedFridges[name] = {
    items: JSON.parse(JSON.stringify(typeof pantryItems !== 'undefined' ? pantryItems : {})),
    date:  new Date().toLocaleDateString('it-IT')
  };
  saveData();
  closeSaveFridgeModal();
  updateSavedFridges();
}

function loadFridge(name) {
  if (typeof savedFridges === 'undefined' || !savedFridges[name]) return;
  if (!confirm('Caricare "' + name + '"? Il frigo attuale sarà sovrascritto.')) return;
  if (typeof pantryItems !== 'undefined') {
    pantryItems = JSON.parse(JSON.stringify(savedFridges[name].items || {}));
  }
  saveData();
  renderFridge();
  if (typeof updateFridgeSuggestions === 'function') updateFridgeSuggestions();
  updateSavedFridges();
}

function deleteFridge(name) {
  if (!confirm('Eliminare "' + name + '"?')) return;
  if (typeof savedFridges !== 'undefined') delete savedFridges[name];
  saveData();
  updateSavedFridges();
}

/* ============================================================
   DATALIST AUTOCOMPLETE
   ============================================================ */
function initIngredientiDatalist() {
  var dl = document.getElementById('ingredientiDatalist');
  if (!dl) return;
  dl.innerHTML = getAllPantryItems()
    .filter(function (i) { return isValidItem(i); })
    .map(function (i) {
      return '<option value="' + i.name.replace(/"/g,'&quot;') + '">';
    }).join('');
}

/* ============================================================
   DISPONIBILITÀ INGREDIENTE (usata da piano.js)
   ============================================================ */
function checkIngredientAvailability(item) {
  if (!isValidItem(item)) return { sufficient: false, matched: false, available: 0, availableUnit: 'g' };
  var name  = item.name.toLowerCase().trim();
  var reqQty  = item.quantity || 0;
  var reqUnit = item.unit || 'g';

  /* Cerca corrispondenza */
  var matchKey = null;
  if (typeof pantryItems !== 'undefined' && pantryItems) {
    Object.keys(pantryItems).forEach(function (k) {
      if (!isValidPantryKey(k)) return;
      var kl = k.toLowerCase().trim();
      if (kl === name || kl.includes(name) || name.includes(kl)) {
        if (!matchKey || k.toLowerCase() === name) matchKey = k;
      }
    });
  }

  if (!matchKey) return { sufficient: false, matched: false, available: 0, availableUnit: reqUnit };

  var pd  = pantryItems[matchKey];
  var avail = typeof pd.quantity === 'number' ? pd.quantity : 0;
  var availUnit = pd.unit || reqUnit;

  if (reqQty <= 0) return { sufficient: avail > 0, matched: avail > 0, available: avail, availableUnit: availUnit };

  var conv = convertUnit(avail, availUnit, reqUnit);
  var avComparable = conv !== null ? conv : avail;
  return {
    sufficient:    avComparable >= reqQty,
    matched:       avail > 0,
    available:     avail,
    availableUnit: availUnit
  };
}

/* ============================================================
   CONVERSIONE UNITÀ
   ============================================================ */
function convertUnit(value, fromUnit, toUnit) {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return value;
  var conv = { kg: { g: 1000 }, g: { kg: 0.001 }, l: { ml: 1000 }, ml: { l: 0.001 } };
  if (conv[fromUnit] && conv[fromUnit][toUnit] !== undefined) {
    return Math.round(value * conv[fromUnit][toUnit] * 10000) / 10000;
  }
  return null;
}
