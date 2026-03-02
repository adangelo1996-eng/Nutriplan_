/*
   DISPENSA.JS — v5
   + Modifica categoria ingrediente
   + Notifiche deficit ingredienti
*/

var pantrySearchQuery = '';

/* ══════════════════════════════════════════════════
   SCADENZE SUGGERITE PER CATEGORIA (giorni da oggi)
══════════════════════════════════════════════════ */
var FRESH_EXPIRY_DAYS = {
  '🥩 Carne':               3,
  '🥩 Carne e Pesce':        3,
  '🐟 Pesce':                2,
  '🥛 Latticini e Uova':     7,
  '🥦 Verdure':              5,
  '🍎 Frutta':               7,
  '🥑 Grassi e Condimenti':  30,
  '🌾 Cereali e Legumi':     180,
  '🍫 Dolci e Snack':        90,
  '🧂 Cucina':               365,
  '🧂 Altro':                90
};

var FREEZER_EXTRA_DAYS = {
  '🥩 Carne':               150,
  '🥩 Carne e Pesce':        150,
  '🐟 Pesce':                150,
  '🥛 Latticini e Uova':     90,
  '🥦 Verdure':              300,
  '🍎 Frutta':               300,
  '🌾 Cereali e Legumi':     90,
  '🍫 Dolci e Snack':        90
};

function _suggestExpiry(category, frozen) {
  var freshDays = FRESH_EXPIRY_DAYS[category] || 30;
  var extraDays = frozen ? (FREEZER_EXTRA_DAYS[category] || 90) : 0;
  var totalDays = freshDays + extraDays;
  var d = new Date();
  d.setDate(d.getDate() + totalDays);
  return d.getFullYear() + '-' +
         String(d.getMonth()+1).padStart(2,'0') + '-' +
         String(d.getDate()).padStart(2,'0');
}

/* ══════════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════════ */
var CATEGORY_ORDER = [
  '🥩 Carne',
  '🐟 Pesce',
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

var CATEGORY_COLORS = {
  '🥩 Carne':                '#ef4444',
  '🐟 Pesce':                '#0ea5e9',
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

function getCategoryIcon(cat) {
  var map = {
    '🥩 Carne':'🥩','🐟 Pesce':'🐟','🥩 Carne e Pesce':'🥩',
    '🥛 Latticini e Uova':'🥛','🌾 Cereali e Legumi':'🌾',
    '🥦 Verdure':'🥦','🍎 Frutta':'🍎','🥑 Grassi e Condimenti':'🥑',
    '🍫 Dolci e Snack':'🍫','🧂 Cucina':'🧂','🧂 Altro':'🧂'
  };
  return (cat && map[cat]) ? map[cat] : '🧂';
}

function resolveDisplayCategory(item) {
  var cat = item.category || '🧂 Altro';
  if (cat !== '🥩 Carne e Pesce') return cat;
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    var defIng = defaultIngredients.find(function(d) {
      return d && d.name && d.name.toLowerCase() === (item.name || '').toLowerCase();
    });
    if (defIng && defIng.category && defIng.category !== '🥩 Carne e Pesce') {
      return defIng.category;
    }
  }
  if (['🐟','🦑','🐙'].indexOf(item.icon || '') !== -1) return '🐟 Pesce';
  return '🥩 Carne';
}

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#64748b';
}

function safeid(name) {
  return String(name).replace(/[^a-zA-Z0-9]/g, '_');
}

function getStep(unit) {
  if (['kg', 'l'].indexOf(unit) !== -1) return 0.1;
  if (['pz', 'fette', 'cucchiai', 'cucchiaini', 'porzione'].indexOf(unit) !== -1) return 1;
  return 10;
}

function isValidPantryKey(k) {
  return k && typeof k === 'string' && k.trim() !== '' && k !== 'undefined' && k !== 'null';
}

function isValidItem(item) {
  return item && typeof item === 'object' &&
    item.name && typeof item.name === 'string' && item.name.trim() !== '';
}

/* ══════════════════════════════════════════════════
   CALCOLO DEFICIT INGREDIENTI
══════════════════════════════════════════════════ */
function getDeficitIngredients() {
  var deficits = [];
  if (!pianoAlimentare || !pantryItems) return deficits;
  
  var mealKeys = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
  var needed = {};
  
  /* Calcola fabbisogno totale dal piano */
  mealKeys.forEach(function(mk) {
    var mp = pianoAlimentare[mk] || {};
    Object.keys(mp).forEach(function(cat) {
      var arr = mp[cat];
      if (!Array.isArray(arr)) return;
      arr.forEach(function(item) {
        if (!isValidItem(item) || !item.quantity) return;
        var name = item.name.trim();
        var qty = parseFloat(item.quantity) || 0;
        if (!needed[name]) needed[name] = { total: 0, unit: item.unit || 'g' };
        needed[name].total += qty;
      });
    });
  });
  
  /* Confronta con disponibilità in dispensa (ingredienti base = sempre disponibili, esclusi da deficit) */
  Object.keys(needed).forEach(function(name) {
    if (typeof isIngredienteBase === 'function' && isIngredienteBase(name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(name))) return;
    var required = needed[name].total;
    var available = (pantryItems[name] && pantryItems[name].quantity) || 0;
    var remaining = Math.max(0, available - required);

    if (available < required * 1.5) {
      deficits.push({
        name: name,
        required: required,
        available: available,
        remaining: remaining,
        unit: needed[name].unit,
        severity: available <= 0 ? 'critical' : available < required ? 'warning' : 'low'
      });
    }
  });
  
  deficits.sort(function(a, b) {
    var severityOrder = { critical: 0, warning: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  return deficits;
}

/* Restituisce i deficit raggruppati per categoria (per inserirli sotto ogni fi-group). */
function getDeficitByCategory() {
  var deficits = getDeficitIngredients();
  if (!deficits.length) return {};
  var byCat = {};
  deficits.forEach(function(d) {
    var pd = (pantryItems && pantryItems[d.name]) ? pantryItems[d.name] : {};
    var cat = resolveDisplayCategory({ name: d.name, category: pd.category, icon: pd.icon });
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(d);
  });
  return byCat;
}

function buildDeficitRow(d) {
  var icon = d.severity === 'critical' ? '🔴' : d.severity === 'warning' ? '🟠' : '🟡';
  var label = d.available <= 0
    ? 'Esaurito'
    : 'Rimangono ' + d.remaining.toFixed(0) + ' ' + d.unit;
  return '<div class="deficit-row" onclick="openQtyModal(\'' + escForAttr(d.name) + '\')">' +
    '<span class="deficit-icon">' + icon + '</span>' +
    '<div class="deficit-info">' +
      '<div class="deficit-name">' + d.name + '</div>' +
      '<div class="deficit-label">' + label + '</div>' +
    '</div>' +
    '<button class="rc-btn rc-btn-primary rc-btn-sm" onclick="event.stopPropagation();pianoAddToSpesa(\'' + escForAttr(d.name) + '\',\'' + d.required + '\',\'' + escForAttr(d.unit) + '\')" title="Aggiungi alla lista della spesa">+ spesa</button>' +
  '</div>';
}

/* ══════════════════════════════════════════════════
   CATALOGO COMPLETO
══════════════════════════════════════════════════ */
function getAllPantryItems() {
  var result = [];
  var seen   = {};

  var mealKeys = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
  mealKeys.forEach(function(mk) {
    var mp = (typeof pianoAlimentare !== 'undefined' && pianoAlimentare && pianoAlimentare[mk]) ? pianoAlimentare[mk] : {};
    Object.keys(mp).forEach(function(cat) {
      var arr = mp[cat];
      if (!Array.isArray(arr)) return;
      arr.forEach(function(item) {
        if (!isValidItem(item)) return;
        var name = item.name.trim();
        if (seen[name]) return;
        seen[name] = true;
        var pd = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
        var isBase = typeof isIngredienteBase === 'function' && isIngredienteBase(name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(name));
        var qty = typeof pd.quantity === 'number' ? pd.quantity : (isBase ? undefined : 0);
        result.push({
          name:     name,
          quantity: qty,
          unit:     pd.unit || item.unit || 'g',
          category: pd.category || '🧂 Altro',
          icon:     pd.icon || getCategoryIcon(pd.category || '🧂 Altro'),
          isCustom: false
        });
      });
    });
  });

  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function(item) {
      if (!isValidItem(item)) return;
      var name = item.name.trim();
      if (seen[name]) return;
      seen[name] = true;
      var pd = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
      var isBase = typeof isIngredienteBase === 'function' && isIngredienteBase(name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(name));
      var qty = typeof pd.quantity === 'number' ? pd.quantity : (isBase ? undefined : 0);
      result.push({
        name:     name,
        quantity: qty,
        unit:     pd.unit || item.unit || 'g',
        category: item.category || '🧂 Altro',
        icon:     item.icon || getCategoryIcon(item.category),
        isCustom: false
      });
    });
  }

  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    customIngredients.forEach(function(item) {
      if (!isValidItem(item)) return;
      var name = item.name.trim();
      if (seen[name]) return;
      seen[name] = true;
      var pd = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
      var catUsed = (pd && pd.category) ? pd.category : (item.category || '🧂 Altro');
      var isBase = typeof isIngredienteBase === 'function' && isIngredienteBase(name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(name));
      var qty = typeof pd.quantity === 'number' ? pd.quantity : (isBase ? undefined : 0);
      result.push({
        name:     name,
        quantity: qty,
        unit:     pd.unit || item.unit || 'g',
        category: catUsed,
        icon:     (pd && pd.icon) ? pd.icon : (item.icon || getCategoryIcon(catUsed)),
        isCustom: true
      });
    });
  }

  if (typeof pantryItems !== 'undefined' && pantryItems && typeof pantryItems === 'object') {
    Object.keys(pantryItems).forEach(function(name) {
      if (!isValidPantryKey(name) || seen[name]) return;
      seen[name] = true;
      var pd = pantryItems[name];
      if (!pd || typeof pd !== 'object') return;
      var isBase = typeof isIngredienteBase === 'function' && isIngredienteBase(name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(name));
      var qty = typeof pd.quantity === 'number' ? pd.quantity : (isBase ? undefined : 0);
      result.push({
        name:     name,
        quantity: qty,
        unit:     pd.unit || 'g',
        category: pd.category || '🧂 Altro',
        icon:     pd.icon || '🧂',
        isCustom: pd.isCustom || false
      });
    });
  }

  /* Ingredienti base sempre disponibili: aggiungi in dispensa con quantità non definita se non già presenti */
  if (typeof INGREDIENTI_BASE_KEYS !== 'undefined' && Array.isArray(INGREDIENTI_BASE_KEYS)) {
    var seenLower = {};
    result.forEach(function(r) { if (r && r.name) seenLower[r.name.toLowerCase()] = true; });
    INGREDIENTI_BASE_KEYS.forEach(function(key) {
      if (typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(key)) return;
      var displayName = key.charAt(0).toUpperCase() + key.slice(1);
      if (seenLower[key] || seen[displayName]) return;
      seen[displayName] = true;
      seenLower[key] = true;
      result.push({
        name:     displayName,
        quantity: undefined,
        unit:     'g',
        category: '🧂 Cucina',
        icon:     getCategoryIcon('🧂 Cucina'),
        isCustom: false
      });
    });
  }

  result.sort(function(a, b) {
    return a.name.localeCompare(b.name, 'it');
  });
  return result;
}

/* ══════════════════════════════════════════════════
   RENDER PRINCIPALE
══════════════════════════════════════════════════ */
function renderPantry() { renderFridge(); }

function buildExpiringSection() {
  var expiring = getExpiringSoon(7);
  if (!expiring.length) return '';
  var html = '<div class="expiring-section">' +
    '<div class="expiring-section-title">⏰ In scadenza presto</div>' +
    expiring.map(function(e) {
      var badge = buildExpiryBadge(e.data.scadenza);
      var allR = (typeof getAllRicette === 'function') ? getAllRicette() : [];
      var matchR = allR.filter(function(r) {
        return Array.isArray(r.ingredienti) && r.ingredienti.some(function(i){
          var n = (i.name||'').toLowerCase();
          return n.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(n);
        });
      });
      var recipeHint = matchR.length
        ? '<span class="expiring-recipe-hint" onclick="event.stopPropagation();setRicetteFilterExtra(\'disponibili\',null);if(typeof goToPage===\'function\')goToPage(\'ricette\')" title="Vedi ricette">'+
            '🍽 ' + matchR.length + ' ricett' + (matchR.length===1?'a':'e') +
          '</span>'
        : '';
      return '<div class="expiring-row" onclick="openQtyModal(\''+escForAttr(e.name)+'\')">' +
        '<div class="expiring-name">' + e.name + '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;">' + badge + recipeHint + '</div>' +
      '</div>';
    }).join('') +
  '</div>';
  return html;
}

function renderFridge(targetId) {
  var el = document.getElementById(targetId || 'pantryContent');
  if (!el) return;

  var allItems = getAllPantryItems();
  var active = allItems.filter(function(i) {
    if (!isValidItem(i)) return false;
    var isBase = typeof isIngredienteBase === 'function' && isIngredienteBase(i.name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(i.name));
    if (isBase && (i.quantity === undefined || i.quantity === null)) return true;
    return (i.quantity || 0) > 0;
  });

  /* Fallback: se la dispensa ha ingredienti salvati ma tutte le quantità sono 0,
     mostra comunque gli elementi presenti in pantryItems (evita pagina \"vuota\"). */
  if (!pantrySearchQuery && !active.length &&
      typeof pantryItems !== 'undefined' && pantryItems &&
      Object.keys(pantryItems).some(isValidPantryKey)) {
    active = allItems.filter(function(i) {
      return isValidItem(i) && (pantryItems[i.name] || (typeof isIngredienteBase === 'function' && isIngredienteBase(i.name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(i.name))));
    });
  }

  var searchActive = false;
  if (pantrySearchQuery) {
    searchActive = true;
    var q = pantrySearchQuery.toLowerCase();
    active = active.filter(function(i) {
      return i.name.toLowerCase().includes(q) ||
             (i.category || '').toLowerCase().includes(q);
    });
  }

  if (searchActive) {
    if (!active.length) {
      el.innerHTML =
        '<div class="rc-empty">' +
          '<div style="font-size:2.5rem;">🔍</div>' +
          '<p>Nessun ingrediente corrisponde a "<strong>' + pantrySearchQuery + '</strong>".</p>' +
        '</div>';
    } else {
      var sGroups = {};
      active.forEach(function(item) {
        var cat = item.category || '🧂 Altro';
        if (!sGroups[cat]) sGroups[cat] = [];
        sGroups[cat].push(item);
      });
      var sOrdered = CATEGORY_ORDER.filter(function(c) { return sGroups[c]; });
      Object.keys(sGroups).forEach(function(c) {
        if (sOrdered.indexOf(c) === -1) sOrdered.push(c);
      });
      var sHtml = '';
      sOrdered.forEach(function(cat) {
        var items = sGroups[cat];
        var color = getCategoryColor(cat);
        var icon  = getCategoryIcon(cat);
        sHtml +=
          '<div class="fi-group" style="--gc:' + color + ';">' +
            '<div class="fi-group-header">' +
              '<span class="fi-group-icon">' + icon + '</span>' +
              '<span class="fi-group-name">' + cat.replace(/^[^\s]+\s/, '') + '</span>' +
              '<span class="fi-group-count">' + items.length + '</span>' +
            '</div>' +
            '<div class="fi-list">' +
              items.map(function(item) { return buildFridgeRow(item); }).join('') +
            '</div>' +
          '</div>';
      });
      el.innerHTML = sHtml;
    }
    return;
  }

  var groups = {};
  active.forEach(function(item) {
    var cat = resolveDisplayCategory(item);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  var allCats = CATEGORY_ORDER.slice();
  Object.keys(groups).forEach(function(c) {
    if (allCats.indexOf(c) === -1) allCats.push(c);
  });

  var deficitByCat = !targetId ? getDeficitByCategory() : {};

  var html = '';
  if (typeof householdId !== 'undefined' && householdId) {
    html += '<div class="fi-shared-badge" style="display:flex;align-items:center;gap:6px;padding:8px 12px;margin-bottom:12px;background:var(--primary-xl);border:1px solid var(--primary-mid);border-radius:var(--r-md);font-size:.85em;color:var(--primary);font-weight:600;">' +
      '🏠 Dispensa condivisa' +
    '</div>';
  }
  allCats.forEach(function(cat) {
    if (cat === '🧂 Altro') return;
    if (cat === '🥩 Carne e Pesce' && (groups['🥩 Carne'] || groups['🐟 Pesce'] || !groups[cat])) return;
    var items = groups[cat] || [];
    var color = getCategoryColor(cat);
    var icon  = getCategoryIcon(cat);
    var catName = cat.replace(/^[^\s]+\s/, '');
    var catEsc  = cat.replace(/'/g, "\\'");
    var deficitItems = deficitByCat[cat] || [];
    var deficitHtml = '';
    if (deficitItems.length) {
      deficitHtml =
        '<details class="fi-deficit-details">' +
          '<summary class="fi-deficit-summary">📬 In esaurimento (' + deficitItems.length + ')</summary>' +
          '<div class="fi-deficit-list">' +
            deficitItems.map(function(d) { return buildDeficitRow(d); }).join('') +
          '</div>' +
        '</details>';
    }

    html +=
      '<details class="fi-group fi-group-collapsible" style="--gc:' + color + ';">' +
        '<summary class="fi-group-header">' +
          '<span class="fi-group-icon">' + icon + '</span>' +
          '<span class="fi-group-name">' + catName + '</span>' +
          '<span class="fi-group-count">' + (items.length || '') + '</span>' +
        '</summary>' +
        '<div class="fi-list">' +
          (items.length
            ? items.map(function(item) { return buildFridgeRow(item); }).join('') +
              deficitHtml +
              '<button class="fi-add-inline-btn fi-add-existing" ' +
                      'onclick="openAddByCatModal(\'' + catEsc + '\')">' +
                '＋ Aggiungi ' + catName +
              '</button>'
            : '<div class="fi-empty-cat">' +
                '<span class="fi-empty-cat-text">Nessun ingrediente in dispensa per questa categoria</span>' +
                deficitHtml +
                '<button class="fi-add-inline-btn" ' +
                        'onclick="openAddByCatModal(\'' + catEsc + '\')">' +
                  '＋ Aggiungi ' + catName +
                '</button>' +
              '</div>'
          ) +
        '</div>' +
      '</details>';
  });

  if (groups['🧂 Altro'] && groups['🧂 Altro'].length) {
    var altroItems = groups['🧂 Altro'];
    html +=
      '<details class="fi-group fi-group-collapsible" style="--gc:#64748b;">' +
        '<summary class="fi-group-header">' +
          '<span class="fi-group-icon">🧂</span>' +
          '<span class="fi-group-name">Altro</span>' +
          '<span class="fi-group-count">' + altroItems.length + '</span>' +
        '</summary>' +
        '<div class="fi-list">' +
          altroItems.map(function(item) { return buildFridgeRow(item); }).join('') +
          '<button class="fi-add-inline-btn" ' +
                  'onclick="openAddByCatModal(\'🧂 Altro\')">＋ Aggiungi</button>' +
        '</div>' +
      '</details>';
  }

  if (!targetId) {
    var freezerItems = active.filter(function(i) { return i.freezer; });
    if (freezerItems.length) {
      var freezerHtml =
        '<details class="fi-group fi-group-collapsible" style="--gc:#3b82f6;margin-bottom:16px;">' +
          '<summary class="fi-group-header" style="background:rgba(59,130,246,.12);">' +
            '<span class="fi-group-icon">❄️</span>' +
            '<span class="fi-group-name" style="color:#3b82f6;">Congelatore</span>' +
            '<span class="fi-group-count">' + freezerItems.length + '</span>' +
          '</summary>' +
          '<div class="fi-list">' +
            freezerItems.map(function(item) {
              return buildFridgeRow(item);
            }).join('') +
          '</div>' +
        '</details>';
      html = freezerHtml + html;
    }
  }

  if (!targetId) {
    var expSection = buildExpiringSection();
    if (expSection) html = expSection + html;
    if (typeof openAIRecipeModal === 'function') {
      var aiHtml =
        '<div style="margin-bottom:14px;">' +
          '<button class="ai-recipe-btn" onclick="openAIRecipeModal(\'dispensa\')">' +
            'Genera ricetta AI con gli ingredienti disponibili' +
            '<span class="ai-powered-label">Powered by Gemini</span>' +
          '</button>' +
        '</div>';
      html = aiHtml + html;
    }
  }

  el.innerHTML = html;
}

/* ══════════════════════════════════════════════════
   MODAL: AGGIUNGI INGREDIENTE PER CATEGORIA
══════════════════════════════════════════════════ */
var _addByCatCurrent = '';
var _addByCatQuery   = '';

function openAddByCatModal(cat) {
  _addByCatCurrent = cat;
  _addByCatQuery   = '';

  var modal = document.getElementById('addByCatModal');
  if (!modal) return;

  var titleEl = document.getElementById('addByCatTitle');
  if (titleEl) titleEl.textContent = '➕ Aggiungi a ' + cat.replace(/^[^\s]+\s/, '');

  var searchEl = document.getElementById('addByCatSearch');
  if (searchEl) { searchEl.value = ''; }

  _renderAddByCatList('');

  modal.classList.add('active');
  setTimeout(function() {
    if (searchEl) searchEl.focus();
  }, 120);
}

function closeAddByCatModal() {
  var modal = document.getElementById('addByCatModal');
  if (modal) modal.classList.remove('active');
  _addByCatCurrent = '';
  _addByCatQuery   = '';
}

function filterAddByCat(query) {
  _addByCatQuery = (query || '').trim().toLowerCase();
  _renderAddByCatList(_addByCatQuery);
}

function _renderAddByCatList(query) {
  var listEl = document.getElementById('addByCatList');
  if (!listEl) return;

  var cat = _addByCatCurrent;
  var candidates = [];
  var seen = {};
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
        if (matchCat) {
          seen[i.name] = true;
          candidates.push(i.name);
        }
      }
    });
  }
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    customIngredients.forEach(function(i) {
      if (i && i.name && catCompat.indexOf(i.category) !== -1 && !seen[i.name]) {
        seen[i.name] = true;
        candidates.push(i.name);
      }
    });
  }

  if (!candidates.length) {
    if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
      defaultIngredients.forEach(function(i) {
        if (i && i.name && !seen[i.name]) {
          seen[i.name] = true;
          candidates.push(i.name);
        }
      });
    }
  }

  if (query) {
    candidates = candidates.filter(function(n) {
      return n.toLowerCase().includes(query);
    });
  }

  var alreadyIn = (typeof pantryItems !== 'undefined' && pantryItems)
    ? Object.keys(pantryItems).filter(function(k) {
        return pantryItems[k] && (pantryItems[k].quantity || 0) > 0;
      })
    : [];

  candidates.sort(function(a, b) { return a.localeCompare(b, 'it'); });

  if (!candidates.length) {
    listEl.innerHTML = '<p style="color:var(--text-3);font-size:.9em;padding:12px 0;">Nessun ingrediente trovato.</p>';
    return;
  }

  var catEscModal = (_addByCatCurrent || '🧂 Altro').replace(/'/g, "\\'");
  var addNewBtn =
    '<button class="add-by-cat-new-btn" ' +
            'onclick="openAddFridgeFromCat(\'' + catEscModal + '\')">' +
      '＋ Aggiungi ingrediente personalizzato' +
    '</button>';

  listEl.innerHTML = addNewBtn + candidates.slice(0, 50).map(function(name) {
    var inFridge = alreadyIn.indexOf(name) !== -1;
    var escName  = name.replace(/'/g, "\\'");
    return (
      '<div class="add-by-cat-item' + (inFridge ? ' in-fridge' : '') + '" ' +
           'onclick="selectAddByCatItem(\'' + escName + '\')">' +
        '<span>' + name + '</span>' +
        (inFridge ? '<span class="fi-in-fridge-badge">✔ in dispensa</span>' : '') +
      '</div>'
    );
  }).join('');
}

function openAddFridgeFromCat(cat) {
  closeAddByCatModal();
  var modal = document.getElementById('addFridgeModal');
  if (!modal) return;
  var nameEl = document.getElementById('newFridgeItem');
  var catEl  = document.getElementById('newFridgeCategory');
  var qtyEl  = document.getElementById('newFridgeQty');
  if (nameEl) nameEl.value = '';
  if (catEl)  catEl.value  = cat || '🧂 Altro';
  if (qtyEl)  qtyEl.value  = '';
  modal.classList.add('active');
  if (typeof populateIngAutocomplete === 'function') populateIngAutocomplete();
  setTimeout(function() {
    if (nameEl) { nameEl.focus(); }
  }, 120);
}

function selectAddByCatItem(name) {
  var cat = _addByCatCurrent || '🧂 Altro';
  closeAddByCatModal();
  var modal = document.getElementById('addFridgeModal');
  if (!modal) { openAddFridgeModal(); return; }

  var nameEl = document.getElementById('newFridgeItem');
  var catEl  = document.getElementById('newFridgeCategory');
  var qtyEl  = document.getElementById('newFridgeQty');

  if (nameEl) nameEl.value = name;
  if (catEl)  catEl.value  = cat;
  if (qtyEl)  { qtyEl.value = ''; }

  modal.classList.add('active');

  if (typeof populateIngAutocomplete === 'function') populateIngAutocomplete();

  setTimeout(function() {
    if (qtyEl) { qtyEl.focus(); qtyEl.select(); }
  }, 120);
}

/* ══════════════════════════════════════════════════
   SCADENZE
══════════════════════════════════════════════════ */
function getDaysToExpiry(scadenza) {
  if (!scadenza) return null;
  var today = new Date(); today.setHours(0,0,0,0);
  var exp   = new Date(scadenza + 'T00:00:00');
  return Math.round((exp - today) / 86400000);
}

function buildExpiryBadge(scadenza) {
  var d = getDaysToExpiry(scadenza);
  if (d === null) return '';
  if (d < 0)  return '<span class="expiry-badge expiry-expired">⛔ Scaduto</span>';
  if (d === 0) return '<span class="expiry-badge expiry-today">🔴 Scade oggi</span>';
  if (d === 1) return '<span class="expiry-badge expiry-soon">🟠 Scade domani</span>';
  if (d <= 4)  return '<span class="expiry-badge expiry-soon">🟡 Scade in '+d+'gg</span>';
  if (d <= 7)  return '<span class="expiry-badge expiry-ok">🟢 '+d+'gg</span>';
  return '<span class="expiry-badge expiry-ok">📅 '+d+'gg</span>';
}

function getExpiringSoon(maxDays) {
  maxDays = maxDays || 4;
  var result = [];
  if (!pantryItems) return result;
  Object.keys(pantryItems).forEach(function(name) {
    var pd = pantryItems[name];
    if (!pd || !pd.scadenza || (pd.quantity||0) <= 0) return;
    var d = getDaysToExpiry(pd.scadenza);
    if (d !== null && d <= maxDays) result.push({ name: name, days: d, data: pd });
  });
  result.sort(function(a,b){ return a.days - b.days; });
  return result;
}

function buildFridgeRow(item) {
  var sid   = safeid(item.name);
  var name  = item.name;
  var isBaseUndef = typeof isIngredienteBase === 'function' && isIngredienteBase(name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(name)) && (item.quantity === undefined || item.quantity === null);
  var qty   = typeof item.quantity === 'number' ? item.quantity : 0;
  var unit  = item.unit || 'g';
  var icon  = item.icon || getCategoryIcon(item.category);
  var color = getCategoryColor(item.category);

  var qtyDisplay = isBaseUndef ? '—' : ((qty % 1 === 0) ? qty : parseFloat(qty.toFixed(2)));
  var expiryBadge = buildExpiryBadge(item.scadenza);

  var daysToExp = getDaysToExpiry(item.scadenza);
  var expiryRowStyle = '';
  if (daysToExp !== null) {
    if (daysToExp < 0) {
      expiryRowStyle = 'border-left:3px solid #ef4444;background:rgba(239,68,68,.05);';
    } else if (daysToExp <= 1) {
      expiryRowStyle = 'border-left:3px solid #ef4444;background:rgba(239,68,68,.05);';
    } else if (daysToExp <= 3) {
      expiryRowStyle = 'border-left:3px solid #f97316;background:rgba(249,115,22,.04);';
    } else if (daysToExp <= 7) {
      expiryRowStyle = 'border-left:3px solid #eab308;background:rgba(234,179,8,.03);';
    }
  }
  if (item.freezer) {
    expiryRowStyle += 'border-left:3px solid #3b82f6;';
  }

  var qtyBlock = '<div class="fi-row-right" onclick="event.stopPropagation();">' +
    (isBaseUndef
      ? '<span class="fi-qty fi-qty-undefined" id="fi-qty-' + sid + '">—</span>'
      : '<button class="fi-btn fi-btn-minus" onclick="fridgeAdjust(\'' + escForAttr(name) + '\',-1)" aria-label="Riduci">−</button>' +
        '<span class="fi-qty" id="fi-qty-' + sid + '">' + qtyDisplay + '</span>' +
        '<button class="fi-btn fi-btn-plus" onclick="fridgeAdjust(\'' + escForAttr(name) + '\',1)" aria-label="Aumenta">+</button>') +
    '</div>';

  return (
    '<div class="fi-row" id="fi-row-' + sid + '" ' +
         'onclick="openQtyModal(\'' + escForAttr(name) + '\')" ' +
         'style="--rc:' + color + ';' + expiryRowStyle + '">' +
      '<div class="fi-row-icon">' + icon + '</div>' +
      '<div class="fi-row-info">' +
        '<div class="fi-row-name">' + name + '</div>' +
        '<div class="fi-row-unit">' + unit +
          (expiryBadge ? ' ' + expiryBadge : '') +
        '</div>' +
      '</div>' +
      qtyBlock +
      '<button class="fi-row-del" onclick="event.stopPropagation();fridgeRemove(\'' + escForAttr(name) + '\')" ' +
              'aria-label="Rimuovi">✕</button>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════════════
   AZIONI QUANTITÀ
══════════════════════════════════════════════════ */
function fridgeAdjust(name, direction) {
  if (!pantryItems) pantryItems = {};
  var pd   = pantryItems[name] || {};
  var unit = pd.unit || 'g';
  var step = getStep(unit);
  var curr = typeof pd.quantity === 'number' ? pd.quantity : 0;
  var next = Math.max(0, parseFloat((curr + direction * step).toFixed(3)));

  pantryItems[name] = Object.assign({}, pd, { quantity: next });
  saveData();

  var sid  = safeid(name);
  var span = document.getElementById('fi-qty-' + sid);
  if (span) {
    var disp = (next % 1 === 0) ? next : parseFloat(next.toFixed(2));
    span.textContent = disp;
    span.classList.remove('fi-qty-flash');
    void span.offsetWidth;
    span.classList.add('fi-qty-flash');
    setTimeout(function() { span.classList.remove('fi-qty-flash'); }, 400);
  }

  if (next <= 0) {
    setTimeout(function() { renderFridge(); }, 300);
  }

  if (typeof updateAllUI === 'function') updateAllUI();
}

function fridgeRemove(name) {
  if (!pantryItems) return;
  var isBase = typeof isIngredienteBase === 'function' && isIngredienteBase(name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(name));
  var pd = pantryItems[name];
  if (isBase && (!pd || pd.quantity === undefined || pd.quantity === null)) {
    if (typeof showToast === 'function') showToast('🧂 ' + name + ' è un ingrediente sempre disponibile', 'info');
    return;
  }
  if (isBase && pd) {
    delete pd.quantity;
    if (Object.keys(pd).length <= 0) delete pantryItems[name];
  } else if (pd) {
    pd.quantity = 0;
  } else {
    return;
  }
  saveData();
  renderFridge();
  renderFridge('pianoFridgeContent');
  if (typeof updateAllUI === 'function') updateAllUI();
  if (typeof showToast === 'function') showToast('🗑 ' + name + ' rimosso dal frigo', 'info');
}

/* ══════════════════════════════════════════════════
   MODAL INSERIMENTO MANUALE QUANTITÀ - CON MODIFICA CATEGORIA
══════════════════════════════════════════════════ */
function openQtyModal(name) {
  var pd   = (pantryItems && pantryItems[name]) ? pantryItems[name] : {};
  var isBase = typeof isIngredienteBase === 'function' && isIngredienteBase(name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(name));
  var qty  = typeof pd.quantity === 'number' ? pd.quantity : (isBase ? undefined : 0);
  var unit = pd.unit || 'g';
  var icon = pd.icon || getCategoryIcon(pd.category);
  var cat  = pd.category || '🧂 Altro';

  var modal = document.getElementById('editQtyModal');
  if (!modal) return;

  document.getElementById('eqmIcon').textContent   = icon;
  document.getElementById('eqmName').textContent   = name;
  document.getElementById('eqmUnit').textContent   = unit;
  var inp = document.getElementById('eqmInput');
  inp.dataset.name = name;
  if (isBase && (qty === undefined || qty === null)) {
    inp.placeholder = '—';
    inp.value = '';
  } else {
    inp.placeholder = '0';
    inp.value = (qty % 1 === 0) ? qty : parseFloat(Number(qty).toFixed(2));
  }

  var nutEl = document.getElementById('eqmNutriments');
  if (nutEl) {
    if (pd.nutriments && (pd.nutriments.kcal != null || pd.nutriments.proteins != null || pd.nutriments.carbs != null || pd.nutriments.fat != null || pd.nutriments.fiber != null)) {
      var n = pd.nutriments;
      var chips = '';
      if (n.kcal != null) chips += '<div class="barcode-macro-chip"><span>Energia</span><strong>' + n.kcal + ' kcal</strong></div>';
      if (n.proteins != null) chips += '<div class="barcode-macro-chip"><span>Proteine</span><strong>' + n.proteins + 'g</strong></div>';
      if (n.carbs != null) chips += '<div class="barcode-macro-chip"><span>Carboidrati</span><strong>' + n.carbs + 'g</strong></div>';
      if (n.fat != null) chips += '<div class="barcode-macro-chip"><span>Grassi</span><strong>' + n.fat + 'g</strong></div>';
      if (n.fiber != null) chips += '<div class="barcode-macro-chip"><span>Fibre</span><strong>' + n.fiber + 'g</strong></div>';
      nutEl.innerHTML = '<div class="eqm-nutri-label">Valori nutrizionali (per 100g)</div><div class="barcode-macro-grid">' + chips + '</div>';
      nutEl.style.display = 'block';
    } else {
      nutEl.innerHTML = '';
      nutEl.style.display = 'none';
    }
  }
  
  /* Aggiungi select per categoria */
  var catSelect = document.getElementById('eqmCategory');
  if (catSelect) {
    catSelect.value = cat;
  }
  
  var scadEl = document.getElementById('eqmScadenza');
  if (scadEl) scadEl.value = pd.scadenza || '';
  var suggLabel = document.getElementById('eqmSuggLabel');
  if (suggLabel) {
    if (!pd.scadenza && pd.category) {
      var freshDays = FRESH_EXPIRY_DAYS[pd.category];
      if (freshDays && freshDays < 30) {
        suggLabel.textContent = '💡 Suggerita: ' + _suggestExpiry(pd.category, false) + ' (' + freshDays + 'gg)';
      } else {
        suggLabel.textContent = '';
      }
    } else {
      suggLabel.textContent = '';
    }
  }
  var freezerEl = document.getElementById('eqmFreezer');
  if (freezerEl) freezerEl.checked = !!pd.freezer;

  modal.classList.add('active');
  setTimeout(function() {
    var inp = document.getElementById('eqmInput');
    if (inp) { inp.focus(); inp.select(); }
  }, 120);
}

function _updateEqmSuggestion() {
  var inp       = document.getElementById('eqmInput');
  var scadEl    = document.getElementById('eqmScadenza');
  var freezerEl = document.getElementById('eqmFreezer');
  var catSelect = document.getElementById('eqmCategory');
  var suggLabel = document.getElementById('eqmSuggLabel');
  if (!inp) return;
  var name = inp.dataset.name;
  var pd   = (pantryItems && pantryItems[name]) ? pantryItems[name] : {};
  var cat  = catSelect ? catSelect.value : (pd.category || '🧂 Altro');
  var frozen = freezerEl ? freezerEl.checked : false;
  if (scadEl) scadEl.value = _suggestExpiry(cat, frozen);
  if (suggLabel) {
    suggLabel.textContent = frozen ? '❄️ Scadenza estesa per congelatore' : '';
  }
}

function closeQtyModal() {
  var modal = document.getElementById('editQtyModal');
  if (modal) modal.classList.remove('active');
}

function confirmQtyModal() {
  var inp  = document.getElementById('eqmInput');
  if (!inp) return;
  var name = inp.dataset.name;
  if (!name) return;
  var isBase = typeof isIngredienteBase === 'function' && isIngredienteBase(name) && !(typeof isIngredienteBaseEsclusoDaProfilo === 'function' && isIngredienteBaseEsclusoDaProfilo(name));
  var rawVal = (inp.value || '').trim();
  var val = parseFloat(rawVal);
  var quantitySet = !isNaN(val) && val >= 0;
  if (!isBase && (!quantitySet || val < 0)) {
    if (typeof showToast === 'function') showToast('⚠️ Quantità non valida', 'warning');
    return;
  }
  if (!pantryItems) pantryItems = {};
  var pd = pantryItems[name] || {};
  var scadEl    = document.getElementById('eqmScadenza');
  var freezerEl = document.getElementById('eqmFreezer');
  var catSelect = document.getElementById('eqmCategory');
  var scadenza  = scadEl ? (scadEl.value || '') : (pd.scadenza || '');
  var frozen    = freezerEl ? freezerEl.checked : (pd.freezer || false);
  var newCat    = catSelect ? catSelect.value : (pd.category || '🧂 Altro');
  var newIcon   = getCategoryIcon(newCat);

  var updated   = Object.assign({}, pd, { category: newCat, icon: newIcon });
  if (quantitySet) updated.quantity = val; else if (isBase) delete updated.quantity;
  if (scadenza) { updated.scadenza = scadenza; } else { delete updated.scadenza; }
  if (frozen)   { updated.freezer = true; }     else { delete updated.freezer; }
  pantryItems[name] = updated;
  /* Aggiorna anche customIngredients così la lista dispensa usa la nuova categoria */
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    var ciEntry = customIngredients.find(function(i) { return i && i.name === name; });
    if (ciEntry) {
      ciEntry.category = newCat;
      ciEntry.icon = newIcon;
    }
  }
  saveData();
  closeQtyModal();
  renderFridge();
  renderFridge('pianoFridgeContent');
  if (typeof updateAllUI === 'function') updateAllUI();
  var msg = quantitySet ? ('✅ ' + name + ': ' + val + ' ' + (pd.unit || 'g')) : ('✅ ' + name + ' aggiornato');
  if (typeof showToast === 'function') showToast(msg, 'success');
}

document.addEventListener('DOMContentLoaded', function() {
  var modal = document.getElementById('editQtyModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeQtyModal();
    });
  }
  var inp = document.getElementById('eqmInput');
  if (inp) {
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') confirmQtyModal();
      if (e.key === 'Escape') closeQtyModal();
    });
  }
});

/* ══════════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════════ */
function filterPantry(query) {
  pantrySearchQuery = (query || '').toLowerCase().trim();
  renderFridge();
}

/* confirmBarcodeAdd usa _barcodeResult da dispensa-barcode.js */
function confirmBarcodeAdd() {
  var nameEl     = document.getElementById('barcodeIngName');
  var catEl      = document.getElementById('barcodeIngCategory');
  var qtyEl      = document.getElementById('barcodeIngQty');
  var unitEl     = document.getElementById('barcodeIngUnit');
  var scadEl     = document.getElementById('barcodeIngScadenza');
  var freezerEl  = document.getElementById('barcodeIngFreezer');

  if (!nameEl || !catEl) return;

  var name = (nameEl.value || '').trim();
  if (!name) {
    if (typeof showToast === 'function') showToast('⚠️ Inserisci un nome per l\'ingrediente', 'warning');
    return;
  }

  var qty      = parseFloat(qtyEl ? qtyEl.value : 0);
  if (!qty || qty < 0) qty = 1;
  var unit     = unitEl ? unitEl.value : 'pz';
  var cat      = catEl.value || '🧂 Altro';
  var icon     = getCategoryIcon(cat);
  var scadenza = scadEl ? scadEl.value : '';
  var frozen   = freezerEl ? freezerEl.checked : false;

  if (!pantryItems) pantryItems = {};
  var existing = pantryItems[name] || {};
  var entry = Object.assign({}, existing, {
    name:     name,
    quantity: qty,
    unit:     unit,
    category: cat,
    icon:     icon,
    isCustom: true
  });
  if (scadenza) entry.scadenza = scadenza;
  if (frozen)   entry.freezer  = true;
  if (_barcodeResult && _barcodeResult.nutriments) entry.nutriments = _barcodeResult.nutriments;

  pantryItems[name] = entry;

  if (!customIngredients) customIngredients = [];
  var alreadyCustom = customIngredients.some(function(i) { return i && i.name === name; });
  if (!alreadyCustom) {
    customIngredients.push({ name: name, category: cat, unit: unit, icon: icon });
  }

  try { localStorage.removeItem('nutriplan_cleared'); } catch(e) {}

  saveData();
  closeBarcodeResult();
  renderFridge();
  if (typeof renderFridge === 'function') renderFridge('pianoFridgeContent');
  if (typeof updateAllUI  === 'function') updateAllUI();
  var msg = '✅ ' + name + ' aggiunto' + (frozen ? ' ❄️ al congelatore' : ' alla dispensa');
  if (typeof showToast === 'function') showToast(msg, 'success');
}
