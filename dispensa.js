/*
   DISPENSA.JS — v4
   Frigo con card stile rc-card accordion:
   - Raggruppato per categoria
   - Ogni item: icona · nome · qtà · unità · + −
   - Click sull'item → modal inserimento quantità manuale
*/

var pantrySearchQuery = '';

/* ══════════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════════ */
var CATEGORY_ORDER = [
  '🥩 Carne e Pesce',
  '🐟 Pesce',
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
   CATALOGO COMPLETO
══════════════════════════════════════════════════ */
function getAllPantryItems() {
  var result = [];
  var seen   = {};

  /* 1. Dal piano */
  var mealKeys = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
  mealKeys.forEach(function(mk) {
    var mp = (typeof mealPlan !== 'undefined' && mealPlan && mealPlan[mk]) ? mealPlan[mk] : {};
    ['principale', 'contorno', 'frutta', 'extra'].forEach(function(cat) {
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

  /* 2. Default */
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

  /* 3. Custom */
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

  /* 4. Extra in pantryItems con qty > 0 */
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

function renderFridge(targetId) {
  var el = document.getElementById(targetId || 'pantryContent');
  if (!el) return;

  /* Solo elementi con qty > 0 */
  var active = getAllPantryItems().filter(function(i) {
    return isValidItem(i) && (i.quantity || 0) > 0;
  });

  /* Filtro ricerca */
  if (pantrySearchQuery) {
    var q = pantrySearchQuery.toLowerCase();
    active = active.filter(function(i) {
      return i.name.toLowerCase().includes(q) ||
             (i.category || '').toLowerCase().includes(q);
    });
  }

  /* Stato vuoto */
  if (!active.length) {
    el.innerHTML =
      '<div class="rc-empty">' +
        '<div style="font-size:2.5rem;">❄️</div>' +
        '<p>' + (pantrySearchQuery
          ? 'Nessun ingrediente corrisponde a "<strong>' + pantrySearchQuery + '</strong>".'
          : 'Il frigo è vuoto.<br>Aggiungi ingredienti con <strong>＋</strong> oppure segna acquisti nella <strong>Spesa</strong>.') +
        '</p>' +
      '</div>';
    return;
  }

  /* Raggruppa per categoria */
  var groups = {};
  active.forEach(function(item) {
    var cat = item.category || '🧂 Altro';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  /* Ordine categorie */
  var orderedCats = CATEGORY_ORDER.filter(function(c) { return groups[c]; });
  Object.keys(groups).forEach(function(c) {
    if (orderedCats.indexOf(c) === -1) orderedCats.push(c);
  });

  var html = '';
  orderedCats.forEach(function(cat) {
    var items = groups[cat];
    var color = getCategoryColor(cat);
    var icon  = getCategoryIcon(cat);

    html +=
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

  el.innerHTML = html;
}

/* ══════════════════════════════════════════════════
   BUILD ROW INGREDIENTE
══════════════════════════════════════════════════ */
function buildFridgeRow(item) {
  var sid   = safeid(item.name);
  var qty   = typeof item.quantity === 'number' ? item.quantity : 0;
  var unit  = item.unit || 'g';
  var icon  = item.icon || getCategoryIcon(item.category);
  var name  = item.name;
  var color = getCategoryColor(item.category);

  /* Formatta numero: togli decimali se intero */
  var qtyDisplay = (qty % 1 === 0) ? qty : parseFloat(qty.toFixed(2));

  return (
    '<div class="fi-row" id="fi-row-' + sid + '" ' +
         'onclick="openQtyModal(\'' + escQ(name) + '\')" ' +
         'style="--rc:' + color + ';">' +

      /* Icona */
      '<div class="fi-row-icon">' + icon + '</div>' +

      /* Info */
      '<div class="fi-row-info">' +
        '<div class="fi-row-name">' + name + '</div>' +
        '<div class="fi-row-unit">' + unit + '</div>' +
      '</div>' +

      /* Quantità + pulsanti */
      '<div class="fi-row-right" onclick="event.stopPropagation();">' +
        '<button class="fi-btn fi-btn-minus" onclick="fridgeAdjust(\'' + escQ(name) + '\',-1)"' +
                ' aria-label="Riduci">−</button>' +
        '<span class="fi-qty" id="fi-qty-' + sid + '">' + qtyDisplay + '</span>' +
        '<button class="fi-btn fi-btn-plus" onclick="fridgeAdjust(\'' + escQ(name) + '\',1)"' +
                ' aria-label="Aumenta">+</button>' +
      '</div>' +

      /* Tasto elimina */
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

  /* Aggiorna solo la span senza re-render completo */
  var sid  = safeid(name);
  var span = document.getElementById('fi-qty-' + sid);
  if (span) {
    var disp = (next % 1 === 0) ? next : parseFloat(next.toFixed(2));
    span.textContent = disp;
    /* Animazione flash */
    span.classList.remove('fi-qty-flash');
    void span.offsetWidth;
    span.classList.add('fi-qty-flash');
    setTimeout(function() { span.classList.remove('fi-qty-flash'); }, 400);
  }

  /* Se qty arriva a 0 → rimuovi la riga dopo un attimo */
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
   MODAL INSERIMENTO MANUALE QUANTITÀ
══════════════════════════════════════════════════ */
function openQtyModal(name) {
  var pd   = (pantryItems && pantryItems[name]) ? pantryItems[name] : {};
  var qty  = typeof pd.quantity === 'number' ? pd.quantity : 0;
  var unit = pd.unit || 'g';
  var icon = pd.icon || getCategoryIcon(pd.category);

  var modal = document.getElementById('editQtyModal');
  if (!modal) return;

  document.getElementById('eqmIcon').textContent  = icon;
  document.getElementById('eqmName').textContent  = name;
  document.getElementById('eqmUnit').textContent  = unit;
  document.getElementById('eqmInput').value       = (qty % 1 === 0) ? qty : parseFloat(qty.toFixed(2));
  document.getElementById('eqmInput').dataset.name = name;

  modal.classList.add('active');
  setTimeout(function() {
    var inp = document.getElementById('eqmInput');
    if (inp) { inp.focus(); inp.select(); }
  }, 120);
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
  pantryItems[name] = Object.assign({}, pd, { quantity: val });
  saveData();
  closeQtyModal();
  renderFridge();
  renderFridge('pianoFridgeContent');
  if (typeof updateAllUI === 'function') updateAllUI();
  if (typeof showToast === 'function') showToast('✅ ' + name + ': ' + val + ' ' + (pd.unit || 'g'), 'success');
}

/* Chiudi modal su click sfondo */
document.addEventListener('DOMContentLoaded', function() {
  var modal = document.getElementById('editQtyModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeQtyModal();
    });
  }
  /* Enter nel campo */
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
