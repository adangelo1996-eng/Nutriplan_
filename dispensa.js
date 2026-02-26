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

function escQ(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
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
  
  /* Confronta con disponibilità in dispensa */
  Object.keys(needed).forEach(function(name) {
    var required = needed[name].total;
    var available = (pantryItems[name] && pantryItems[name].quantity) || 0;
    var remaining = Math.max(0, available - required);
    
    /* Se rimane meno di una porzione, segnala deficit */
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

function buildDeficitSection() {
  var deficits = getDeficitIngredients();
  if (!deficits.length) return '';
  
  var html = '<div class="deficit-section">' +
    '<div class="deficit-section-title">📬 Ingredienti in esaurimento</div>' +
    deficits.map(function(d) {
      var icon = d.severity === 'critical' ? '🔴' : d.severity === 'warning' ? '🟠' : '🟡';
      var label = d.available <= 0 
        ? 'Esaurito'
        : 'Rimangono ' + d.remaining.toFixed(0) + ' ' + d.unit;
      return '<div class="deficit-row" onclick="openQtyModal(\'' + escQ(d.name) + '\')">' +
        '<span class="deficit-icon">' + icon + '</span>' +
        '<div class="deficit-info">' +
          '<div class="deficit-name">' + d.name + '</div>' +
          '<div class="deficit-label">' + label + '</div>' +
        '</div>' +
        '<button class="rc-btn rc-btn-primary rc-btn-sm" onclick="event.stopPropagation();pianoAddToSpesa(\'' + escQ(d.name) + '\',\'' + d.required + '\',\'' + escQ(d.unit) + '\')" title="Aggiungi alla lista della spesa">Aggiungi alla lista della spesa</button>' +
      '</div>';
    }).join('') +
  '</div>';
  return html;
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
        result.push({
          name:     name,
          quantity: typeof pd.quantity === 'number' ? pd.quantity : 0,
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

  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    customIngredients.forEach(function(item) {
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
        icon:     item.icon || getCategoryIcon(item.category),
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
      result.push({
        name:     name,
        quantity: typeof pd.quantity === 'number' ? pd.quantity : 0,
        unit:     pd.unit || 'g',
        category: pd.category || '🧂 Altro',
        icon:     pd.icon || '🧂',
        isCustom: pd.isCustom || false
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
      return '<div class="expiring-row" onclick="openQtyModal(\''+escQ(e.name)+'\')">' +
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
    return isValidItem(i) && (i.quantity || 0) > 0;
  });

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

  var html = '';
  allCats.forEach(function(cat) {
    if (cat === '🧂 Altro') return;
    if (cat === '🥩 Carne e Pesce' && (groups['🥩 Carne'] || groups['🐟 Pesce'] || !groups[cat])) return;
    var items = groups[cat] || [];
    var color = getCategoryColor(cat);
    var icon  = getCategoryIcon(cat);
    var catName = cat.replace(/^[^\s]+\s/, '');
    var catEsc  = cat.replace(/'/g, "\\'");

    html +=
      '<div class="fi-group" style="--gc:' + color + ';">' +
        '<div class="fi-group-header">' +
          '<span class="fi-group-icon">' + icon + '</span>' +
          '<span class="fi-group-name">' + catName + '</span>' +
          '<span class="fi-group-count">' + (items.length || '') + '</span>' +
        '</div>' +
        '<div class="fi-list">' +
          (items.length
            ? items.map(function(item) { return buildFridgeRow(item); }).join('') +
              '<button class="fi-add-inline-btn fi-add-existing" ' +
                      'onclick="openAddByCatModal(\'' + catEsc + '\')">' +
                '＋ Aggiungi ' + catName +
              '</button>'
            : '<div class="fi-empty-cat">' +
                '<span class="fi-empty-cat-text">Nessun ingrediente in dispensa per questa categoria</span>' +
                '<button class="fi-add-inline-btn" ' +
                        'onclick="openAddByCatModal(\'' + catEsc + '\')">' +
                  '＋ Aggiungi ' + catName +
                '</button>' +
              '</div>'
          ) +
        '</div>' +
      '</div>';
  });

  if (groups['🧂 Altro'] && groups['🧂 Altro'].length) {
    var altroItems = groups['🧂 Altro'];
    html +=
      '<div class="fi-group" style="--gc:#64748b;">' +
        '<div class="fi-group-header">' +
          '<span class="fi-group-icon">🧂</span>' +
          '<span class="fi-group-name">Altro</span>' +
          '<span class="fi-group-count">' + altroItems.length + '</span>' +
        '</div>' +
        '<div class="fi-list">' +
          altroItems.map(function(item) { return buildFridgeRow(item); }).join('') +
          '<button class="fi-add-inline-btn" ' +
                  'onclick="openAddByCatModal(\'🧂 Altro\')">＋ Aggiungi</button>' +
        '</div>' +
      '</div>';
  }

  if (!targetId) {
    var freezerItems = active.filter(function(i) { return i.freezer; });
    if (freezerItems.length) {
      var freezerHtml =
        '<div class="fi-group" style="--gc:#3b82f6;margin-bottom:16px;">' +
          '<div class="fi-group-header" style="background:rgba(59,130,246,.12);">' +
            '<span class="fi-group-icon">❄️</span>' +
            '<span class="fi-group-name" style="color:#3b82f6;">Congelatore</span>' +
            '<span class="fi-group-count">' + freezerItems.length + '</span>' +
          '</div>' +
          '<div class="fi-list">' +
            freezerItems.map(function(item) {
              return buildFridgeRow(item);
            }).join('') +
          '</div>' +
        '</div>';
      html = freezerHtml + html;
    }
  }

  if (!targetId) {
    var deficitSection = buildDeficitSection();
    var expSection = buildExpiringSection();
    if (deficitSection) html = deficitSection + html;
    if (expSection) html = expSection + html;
    if (typeof openAIRecipeModal === 'function') {
      var aiHtml =
        '<div style="margin-bottom:14px;">' +
          '<button class="ai-recipe-btn" onclick="openAIRecipeModal(\'dispensa\')">' +
            '🤖 Genera ricetta AI con gli ingredienti disponibili' +
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
  closeAddByCatModal();
  var cat = _addByCatCurrent || '🧂 Altro';
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
  var qty   = typeof item.quantity === 'number' ? item.quantity : 0;
  var unit  = item.unit || 'g';
  var icon  = item.icon || getCategoryIcon(item.category);
  var name  = item.name;
  var color = getCategoryColor(item.category);

  var qtyDisplay = (qty % 1 === 0) ? qty : parseFloat(qty.toFixed(2));
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

  return (
    '<div class="fi-row" id="fi-row-' + sid + '" ' +
         'onclick="openQtyModal(\'' + escQ(name) + '\')" ' +
         'style="--rc:' + color + ';' + expiryRowStyle + '">' +
      '<div class="fi-row-icon">' + icon + '</div>' +
      '<div class="fi-row-info">' +
        '<div class="fi-row-name">' + name + '</div>' +
        '<div class="fi-row-unit">' + unit +
          (expiryBadge ? ' ' + expiryBadge : '') +
        '</div>' +
      '</div>' +
      '<div class="fi-row-right" onclick="event.stopPropagation();">' +
        '<button class="fi-btn fi-btn-minus" onclick="fridgeAdjust(\'' + escQ(name) + '\',-1)"' +
                ' aria-label="Riduci">−</button>' +
        '<span class="fi-qty" id="fi-qty-' + sid + '">' + qtyDisplay + '</span>' +
        '<button class="fi-btn fi-btn-plus" onclick="fridgeAdjust(\'' + escQ(name) + '\',1)"' +
                ' aria-label="Aumenta">+</button>' +
      '</div>' +
      '<button class="fi-row-del" onclick="event.stopPropagation();fridgeRemove(\'' + escQ(name) + '\')" ' +
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
  if (!pantryItems || !pantryItems[name]) return;
  pantryItems[name].quantity = 0;
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
  var qty  = typeof pd.quantity === 'number' ? pd.quantity : 0;
  var unit = pd.unit || 'g';
  var icon = pd.icon || getCategoryIcon(pd.category);
  var cat  = pd.category || '🧂 Altro';

  var modal = document.getElementById('editQtyModal');
  if (!modal) return;

  document.getElementById('eqmIcon').textContent   = icon;
  document.getElementById('eqmName').textContent   = name;
  document.getElementById('eqmUnit').textContent   = unit;
  document.getElementById('eqmInput').value        = (qty % 1 === 0) ? qty : parseFloat(qty.toFixed(2));
  document.getElementById('eqmInput').dataset.name = name;
  
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
  var val  = parseFloat(inp.value);
  if (!name || isNaN(val) || val < 0) {
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
  
  var updated   = Object.assign({}, pd, { 
    quantity: val,
    category: newCat,
    icon: newIcon
  });
  if (scadenza) { updated.scadenza = scadenza; } else { delete updated.scadenza; }
  if (frozen)   { updated.freezer = true; }     else { delete updated.freezer; }
  pantryItems[name] = updated;
  saveData();
  closeQtyModal();
  renderFridge();
  renderFridge('pianoFridgeContent');
  if (typeof updateAllUI === 'function') updateAllUI();
  if (typeof showToast === 'function') showToast('✅ ' + name + ': ' + val + ' ' + (pd.unit || 'g'), 'success');
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

/* ══════════════════════════════════════════════════
   BARCODE SCANNER
══════════════════════════════════════════════════ */
var _barcodeScanner  = null;
var _barcodeResult   = null;
var _barcodeScanLock = false;

function openBarcodeScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    if (typeof showToast === 'function')
      showToast('Libreria scanner non disponibile. Ricarica la pagina.', 'error');
    return;
  }

  var modal    = document.getElementById('barcodeScannerModal');
  var statusEl = document.getElementById('barcodeScanStatus');
  if (!modal) return;

  _barcodeScanLock = false;
  modal.classList.add('active');
  if (statusEl) statusEl.textContent = 'Avvio fotocamera…';

  setTimeout(function() {
    var container = document.getElementById('barcode-reader-container');
    if (container) container.innerHTML = '';

    try {
      _barcodeScanner = new Html5Qrcode('barcode-reader-container');
      _barcodeScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 130 } },
        function(decodedText) {
          if (_barcodeScanLock) return;
          _barcodeScanLock = true;
          if (statusEl) statusEl.textContent = '✅ Codice: ' + decodedText;
          _stopBarcodeScanner(function() {
            modal.classList.remove('active');
            _lookupBarcode(decodedText);
          });
        },
        function() { }
      ).then(function() {
        if (statusEl) statusEl.textContent = 'Inquadra il codice a barre del prodotto…';
      }).catch(function(err) {
        if (statusEl) statusEl.textContent = '⚠️ ' + (err.message || err);
        if (typeof showToast === 'function')
          showToast('Impossibile accedere alla fotocamera. Controlla i permessi.', 'error');
      });
    } catch (e) {
      if (typeof showToast === 'function')
        showToast('Errore avvio scanner: ' + (e.message || e), 'error');
    }
  }, 250);
}

function closeBarcodeScanner() {
  _stopBarcodeScanner(function() {
    var modal = document.getElementById('barcodeScannerModal');
    if (modal) modal.classList.remove('active');
    _barcodeScanLock = false;
  });
}

function _stopBarcodeScanner(callback) {
  if (_barcodeScanner) {
    _barcodeScanner.stop().then(function() {
      _barcodeScanner = null;
      if (callback) callback();
    }).catch(function() {
      _barcodeScanner = null;
      if (callback) callback();
    });
  } else {
    if (callback) callback();
  }
}

function _lookupBarcode(barcode) {
  if (typeof showToast === 'function') showToast('🔍 Ricerca prodotto…', 'info');

  var url = 'https://world.openfoodfacts.org/api/v2/product/' +
            encodeURIComponent(barcode) +
            '.json?fields=product_name,product_name_it,brands,categories_tags,nutriments';

  fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      if (data.status === 1 && data.product) {
        _showBarcodeResult(data.product, barcode);
      } else {
        if (typeof showToast === 'function')
          showToast('Prodotto non trovato nel database OpenFoodFacts.', 'warning');
      }
    })
    .catch(function(err) {
      console.warn('[NutriPlan] OpenFoodFacts error:', err);
      if (typeof showToast === 'function')
        showToast('Errore ricerca prodotto. Verifica la connessione.', 'error');
    });
}

function _mapOFFCategory(categories_tags) {
  if (!Array.isArray(categories_tags) || !categories_tags.length) return '🧂 Altro';
  var s = categories_tags.join(' ').toLowerCase();

  if (/en:meats|en:poultry|en:beef|en:pork|en:lamb|en:chicken|en:turkey|en:veal|it:carni|it:salumi/.test(s))
    return '🥩 Carne';
  if (/en:fish|en:seafood|en:tuna|en:salmon|en:anchovies|it:pesce|it:frutti-di-mare/.test(s))
    return '🐟 Pesce';
  if (/en:dairy|en:milk|en:cheeses|en:yogurts|en:cream|en:butter|en:eggs|it:latticini|it:uova|it:formaggi/.test(s))
    return '🥛 Latticini e Uova';
  if (/en:pastas|en:cereals|en:breads|en:rice|en:legumes|en:flours|en:oats|en:lentils|en:beans|en:chickpeas|en:grains|it:pasta|it:cereali|it:legumi|it:pane/.test(s))
    return '🌾 Cereali e Legumi';
  if (/en:vegetables|en:salads|en:leafy-vegetables|en:tomatoes|en:potatoes|en:carrots|en:onions|en:mushrooms|it:verdure|it:ortaggi/.test(s))
    return '🥦 Verdure';
  if (/en:fruits|en:berries|en:apples|en:bananas|en:citrus|en:oranges|it:frutta|it:frutta-fresca/.test(s))
    return '🍎 Frutta';
  if (/en:fats|en:oils|en:olive-oils|en:dressings|en:sauces|en:vinegars|it:condimenti|it:oli|it:sughi/.test(s))
    return '🥑 Grassi e Condimenti';
  if (/en:sweets|en:chocolates|en:biscuits|en:cookies|en:snacks|en:candies|en:ice-creams|en:pastries|en:cakes|en:chips|it:dolci|it:snack|it:biscotti/.test(s))
    return '🍫 Dolci e Snack';
  if (/en:spices|en:seasonings|en:condiments|en:broths|en:herbs|en:salt|en:sugars|it:spezie|it:aromi|it:brodi/.test(s))
    return '🧂 Cucina';

  return '🧂 Altro';
}

function _showBarcodeResult(product, barcode) {
  var name = (product.product_name_it || product.product_name || '').trim();
  if (!name) name = 'Prodotto ' + barcode;

  var category  = _mapOFFCategory(product.categories_tags);
  var brand     = (product.brands || '').trim();
  var n         = product.nutriments || {};

  _barcodeResult = { name: name, category: category, brand: brand, barcode: barcode };

  var kcal     = n['energy-kcal_100g']    != null ? Math.round(n['energy-kcal_100g'])            : null;
  var proteins = n['proteins_100g']       != null ? parseFloat(n['proteins_100g']).toFixed(1)     : null;
  var carbs    = n['carbohydrates_100g']  != null ? parseFloat(n['carbohydrates_100g']).toFixed(1): null;
  var fat      = n['fat_100g']            != null ? parseFloat(n['fat_100g']).toFixed(1)          : null;
  var fiber    = n['fiber_100g']          != null ? parseFloat(n['fiber_100g']).toFixed(1)        : null;

  var hasDetails = brand || kcal !== null || proteins !== null || carbs !== null || fat !== null;
  var detailsHtml = '';
  if (hasDetails) {
    var macroChips = '';
    if (kcal     !== null) macroChips += '<div class="barcode-macro-chip"><span>Energia</span><strong>' + kcal + ' kcal</strong></div>';
    if (proteins !== null) macroChips += '<div class="barcode-macro-chip"><span>Proteine</span><strong>' + proteins + 'g</strong></div>';
    if (carbs    !== null) macroChips += '<div class="barcode-macro-chip"><span>Carboidrati</span><strong>' + carbs + 'g</strong></div>';
    if (fat      !== null) macroChips += '<div class="barcode-macro-chip"><span>Grassi</span><strong>' + fat + 'g</strong></div>';
    if (fiber    !== null) macroChips += '<div class="barcode-macro-chip"><span>Fibre</span><strong>' + fiber + 'g</strong></div>';

    detailsHtml =
      '<details class="barcode-details">' +
        '<summary>↕ Dettagli (marca e valori nutrizionali per 100g)</summary>' +
        '<div class="barcode-details-body">' +
          (brand ? '<div class="barcode-brand"><strong>Marca:</strong> ' + brand + '</div>' : '') +
          (macroChips ? '<div class="barcode-macro-label">Valori per 100g</div><div class="barcode-macro-grid">' + macroChips + '</div>' : '') +
        '</div>' +
      '</details>';
  }

  var catIcon = getCategoryIcon(category);
  var catName = category.replace(/^[^\s]+\s/, '');

  var catOptions = [
    '🥩 Carne', '🐟 Pesce', '🥛 Latticini e Uova', '🌾 Cereali e Legumi',
    '🥦 Verdure', '🍎 Frutta', '🥑 Grassi e Condimenti',
    '🍫 Dolci e Snack', '🧂 Cucina', '🧂 Altro'
  ].map(function(c) {
    return '<option value="' + c + '"' + (c === category ? ' selected' : '') + '>' + c + '</option>';
  }).join('');

  var suggestedExpiry = _suggestExpiry(category, false);
  var todayIso = new Date().toISOString().slice(0, 10);
  var hasFreshSuggestion = FRESH_EXPIRY_DAYS[category] && FRESH_EXPIRY_DAYS[category] < 30;
  var hasFreezerExtra = !!FREEZER_EXTRA_DAYS[category];

  var html =
    '<div class="barcode-result-header">' +
      '<div class="barcode-result-icon">' + catIcon + '</div>' +
      '<div>' +
        '<div class="barcode-result-name">' + name + '</div>' +
        '<div class="barcode-result-cat">Categoria rilevata: ' + catName + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Nome ingrediente</label>' +
      '<input type="text" id="barcodeIngName" value="' + escQ(name) + '" ' +
             'onchange="_updateBarcodeSuggestion()">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Categoria</label>' +
      '<select id="barcodeIngCategory" onchange="_updateBarcodeSuggestion()">' + catOptions + '</select>' +
    '</div>' +
    '<div class="row gap-8">' +
      '<div class="form-group flex1">' +
        '<label>Quantità</label>' +
        '<input type="number" id="barcodeIngQty" min="0" step="any" placeholder="0">' +
      '</div>' +
      '<div class="form-group" style="width:110px;">' +
        '<label>Unità</label>' +
        '<select id="barcodeIngUnit">' +
          '<option value="g" selected>g</option>' +
          '<option value="ml">ml</option>' +
          '<option value="pz">pz</option>' +
          '<option value="fette">fette</option>' +
          '<option value="cucchiai">cucchiai</option>' +
          '<option value="cucchiaini">cucchiaini</option>' +
          '<option value="porzione">porzione</option>' +
          '<option value="kg">kg</option>' +
          '<option value="l">l</option>' +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>📅 Data di scadenza <span style="font-size:.78em;color:var(--text-3);">(opzionale)</span></label>' +
      '<input type="date" id="barcodeIngScadenza" min="' + todayIso + '" ' +
             'value="' + (hasFreshSuggestion ? suggestedExpiry : '') + '" ' +
             'style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg-card);color:var(--text-1);font-size:.9em;">' +
      (hasFreshSuggestion
        ? '<small id="barcodeSuggLabel" style="color:var(--text-3);font-size:.76em;">💡 Suggerita in base alla categoria (modifica se necessario)</small>'
        : '<small id="barcodeSuggLabel" style="color:var(--text-3);font-size:.76em;">Lascia vuoto se non applicabile</small>') +
    '</div>' +
    (hasFreezerExtra
      ? '<label style="display:flex;align-items:center;gap:9px;padding:8px 0;cursor:pointer;font-size:.88em;">' +
          '<input type="checkbox" id="barcodeIngFreezer" style="width:16px;height:16px;accent-color:#3b82f6;" ' +
                 'onchange="_updateBarcodeSuggestion()">' +
          '<span>❄️ <strong>In congelatore</strong> — scadenza estesa automaticamente</span>' +
        '</label>'
      : '') +
    detailsHtml;

  var contentEl = document.getElementById('barcodeResultContent');
  if (contentEl) contentEl.innerHTML = html;

  var modal = document.getElementById('barcodeResultModal');
  if (modal) modal.classList.add('active');
}

function _updateBarcodeSuggestion() {
  var catEl      = document.getElementById('barcodeIngCategory');
  var scadEl     = document.getElementById('barcodeIngScadenza');
  var freezerEl  = document.getElementById('barcodeIngFreezer');
  var suggLabel  = document.getElementById('barcodeSuggLabel');
  if (!catEl || !scadEl) return;
  var cat    = catEl.value || '🧂 Altro';
  var frozen = freezerEl ? freezerEl.checked : false;
  var suggested = _suggestExpiry(cat, frozen);
  scadEl.value = suggested;
  if (suggLabel) {
    if (frozen) {
      suggLabel.textContent = '❄️ Scadenza estesa per congelatore (modifica se necessario)';
    } else {
      var freshDays = FRESH_EXPIRY_DAYS[cat];
      if (freshDays && freshDays < 30) {
        suggLabel.textContent = '💡 Suggerita per prodotti freschi (' + freshDays + ' giorni) — modifica se necessario';
      } else {
        suggLabel.textContent = 'Lascia vuoto se non applicabile';
      }
    }
  }
}

function closeBarcodeResult() {
  var modal = document.getElementById('barcodeResultModal');
  if (modal) modal.classList.remove('active');
  _barcodeResult = null;
}

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

  var qty      = parseFloat(qtyEl ? qtyEl.value : 0) || 0;
  var unit     = unitEl ? unitEl.value : 'g';
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
