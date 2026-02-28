/*
   SPESA.JS — v5  stile rc-card unificato
*/

/* ── Stato selezione ricette ── */
var selectedSpesaRecipes    = {};
var spesaGenerateDays       = 1;
var spesaRecipeSelectorOpen = false;
var _spesaRecipeFilter      = 'pasto'; /* 'pasto' | 'preferiti' | 'ai' */

/* ══════════════════════════════════════════════
   PANNELLO GENERA
══════════════════════════════════════════════ */
function buildSpesaGeneratePanel() {
  var allRicette = (typeof getAllRicette === 'function') ? getAllRicette() : [];
  var selCount   = Object.keys(selectedSpesaRecipes).filter(function(k){ return selectedSpesaRecipes[k]; }).length;

  /* ── Filtra le ricette in base al tab selezionato ── */
  var filteredRicette;
  if (_spesaRecipeFilter === 'preferiti') {
    var favList = (typeof preferiti !== 'undefined' && Array.isArray(preferiti)) ? preferiti : [];
    filteredRicette = allRicette.filter(function(r){ return favList.indexOf(r.name || r.nome || '') !== -1; });
  } else if (_spesaRecipeFilter === 'ai') {
    var aiList = (typeof aiRecipes !== 'undefined' && Array.isArray(aiRecipes)) ? aiRecipes : [];
    filteredRicette = aiList;
  } else {
    filteredRicette = allRicette;
  }

  /* ── Costruisce le righe ricette ── */
  function _buildRecipeLabel(r) {
    var name    = r.name || r.nome || '';
    var icon    = r.icon || r.icona || '🍽';
    var count   = selectedSpesaRecipes[name] || 0;
    var checked = count > 0;
    var esc     = _escSpesa(name);
    var counterHtml = checked
      ? '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;" onclick="event.stopPropagation();event.preventDefault();">' +
          '<button onclick="decrementSpesaRecipe(\''+esc+'\')" style="width:22px;height:22px;border:1.5px solid var(--primary-mid);border-radius:50%;background:var(--bg-card);color:var(--primary);font-size:.9em;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;">−</button>' +
          '<span style="min-width:18px;text-align:center;font-size:.85em;font-weight:700;color:var(--primary);">'+count+'×</span>' +
          '<button onclick="incrementSpesaRecipe(\''+esc+'\')" style="width:22px;height:22px;border:1.5px solid var(--primary-mid);border-radius:50%;background:var(--bg-card);color:var(--primary);font-size:.9em;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;">+</button>' +
        '</div>'
      : '';
    return '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--r-sm);cursor:pointer;margin-bottom:3px;background:'+(checked?'var(--primary-xl)':'var(--bg-subtle)')+';border:1.5px solid '+(checked?'var(--primary-mid)':'transparent')+';">' +
      '<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleSpesaRecipe(\''+esc+'\')" style="width:16px;height:16px;accent-color:var(--primary);">' +
      '<span style="font-size:1em;">'+icon+'</span>' +
      '<span style="flex:1;font-size:.86em;font-weight:500;">'+name+'</span>' +
      counterHtml +
    '</label>';
  }

  var recipeRows = '';
  if (_spesaRecipeFilter === 'pasto') {
    /* Raggruppa per pasto */
    var PASTO_LABELS = { colazione:'☀️ Colazione', spuntino:'🍎 Spuntino', pranzo:'🍽 Pranzo', merenda:'🥪 Merenda', cena:'🌙 Cena' };
    var PASTO_ORDER  = ['colazione','spuntino','pranzo','merenda','cena'];
    var byPasto = {};
    filteredRicette.forEach(function(r){
      var p = Array.isArray(r.pasto) ? r.pasto[0] : (r.pasto || 'altro');
      if (!byPasto[p]) byPasto[p] = [];
      byPasto[p].push(r);
    });
    PASTO_ORDER.forEach(function(pk){
      if (!byPasto[pk] || !byPasto[pk].length) return;
      recipeRows += '<div style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-light);padding:8px 0 4px;">'+(PASTO_LABELS[pk]||pk)+'</div>';
      recipeRows += byPasto[pk].map(_buildRecipeLabel).join('');
    });
    Object.keys(byPasto).forEach(function(pk){
      if (PASTO_ORDER.indexOf(pk) !== -1) return;
      recipeRows += '<div style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-light);padding:8px 0 4px;">'+pk+'</div>';
      recipeRows += byPasto[pk].map(_buildRecipeLabel).join('');
    });
  } else {
    recipeRows = filteredRicette.map(_buildRecipeLabel).join('');
  }

  /* ── Tab di filtro ── */
  function _tabStyle(key) {
    var active = _spesaRecipeFilter === key;
    return 'padding:5px 12px;border-radius:99px;font-size:.78em;font-weight:600;cursor:pointer;border:1.5px solid ' +
      (active ? 'var(--primary);background:var(--primary);color:#fff;' : 'var(--border);background:var(--bg-card);color:var(--text-2);');
  }
  var tabsHtml =
    '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">' +
      '<button style="'+_tabStyle('pasto')+'" onclick="_spesaRecipeFilter=\'pasto\';renderSpesa()">Per pasto</button>' +
      '<button style="'+_tabStyle('preferiti')+'" onclick="_spesaRecipeFilter=\'preferiti\';renderSpesa()">Preferiti</button>' +
      '<button style="'+_tabStyle('ai')+'" onclick="_spesaRecipeFilter=\'ai\';renderSpesa()">AI</button>' +
    '</div>';

  var selectorHtml = spesaRecipeSelectorOpen
    ? '<div style="background:var(--bg-card);border:1.5px solid var(--border);border-radius:var(--r-md);padding:12px;margin-bottom:10px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<span style="font-weight:700;font-size:.9em;">Seleziona ricette</span>' +
          '<button class="rc-btn-icon" onclick="spesaRecipeSelectorOpen=false;renderSpesa()">✕</button>' +
        '</div>' +
        tabsHtml +
        '<div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">' +
          (recipeRows || '<p style="color:var(--text-3);font-size:.85em;">Nessuna ricetta in questa categoria.</p>') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap;">' +
          '<button class="rc-btn rc-btn-primary rc-btn-sm" onclick="generateFromSelectedRecipes()" '+(selCount?'':'disabled style="opacity:.5;"')+'>'+
            '📋 Genera da ricette selezionate ('+selCount+')'+
          '</button>' +
          '<button class="rc-btn rc-btn-outline rc-btn-sm" onclick="toggleAllSpesaRecipes()">'+
            (selCount===filteredRicette.length && filteredRicette.length > 0 ? '☐ Deseleziona tutte' : '☑ Seleziona tutte') +
          '</button>' +
        '</div>' +
      '</div>'
    : '';

  return (
    '<div style="background:var(--bg-subtle);border:1.5px solid var(--border);border-radius:var(--r-md);padding:12px;margin-bottom:16px;">' +
      '<div style="font-weight:700;font-size:.85em;text-transform:uppercase;letter-spacing:.07em;color:var(--text-light);margin-bottom:10px;">⚡ Genera lista</div>' +

      /* Genera da piano */
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
        '<button class="rc-btn rc-btn-primary rc-btn-sm" onclick="generateShoppingList()">🗓 Da piano alimentare</button>' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<label style="font-size:.82em;color:var(--text-2);">×</label>' +
          '<input type="number" min="1" max="14" value="'+spesaGenerateDays+'" ' +
                 'onchange="spesaGenerateDays=Math.max(1,parseInt(this.value)||1);this.value=spesaGenerateDays" ' +
                 'style="width:52px;padding:4px 6px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg-card);color:var(--text-1);font-size:.88em;text-align:center;">' +
          '<label style="font-size:.82em;color:var(--text-2);">giorni</label>' +
        '</div>' +
      '</div>' +

      /* Genera da ricette */
      '<button class="rc-btn rc-btn-outline rc-btn-sm" onclick="spesaRecipeSelectorOpen=!spesaRecipeSelectorOpen;renderSpesa()">'+
        'Da ricette selezionate'+(selCount?' ('+selCount+')':'')+' ▾' +
      '</button>' +
      selectorHtml +
    '</div>'
  );
}

function _escSpesa(str) {
  return String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

function toggleSpesaRecipe(name) {
  /* selectedSpesaRecipes ora memorizza il numero di volte (0 = non selezionata, N≥1 = selezionata) */
  selectedSpesaRecipes[name] = selectedSpesaRecipes[name] ? 0 : 1;
  renderSpesa();
}

function incrementSpesaRecipe(name) {
  selectedSpesaRecipes[name] = (selectedSpesaRecipes[name] || 0) + 1;
  renderSpesa();
}

function decrementSpesaRecipe(name) {
  var cur = selectedSpesaRecipes[name] || 0;
  selectedSpesaRecipes[name] = Math.max(0, cur - 1);
  renderSpesa();
}

function toggleAllSpesaRecipes() {
  var all = (typeof getAllRicette === 'function') ? getAllRicette() : [];
  var selCount = Object.keys(selectedSpesaRecipes).filter(function(k){ return selectedSpesaRecipes[k]; }).length;
  selectedSpesaRecipes = {};
  if (selCount < all.length) {
    all.forEach(function(r){ selectedSpesaRecipes[r.name||r.nome||''] = 1; });
  }
  renderSpesa();
}

function generateFromSelectedRecipes() {
  var selected = Object.keys(selectedSpesaRecipes).filter(function(k){ return selectedSpesaRecipes[k]; });
  if (!selected.length) { if (typeof showToast==='function') showToast('⚠️ Seleziona almeno una ricetta','warning'); return; }
  var needed = {};
  selected.forEach(function(name){
    var r = (typeof findRicetta === 'function') ? findRicetta(name) : null;
    if (!r) return;
    var times = selectedSpesaRecipes[name] || 1; /* numero di volte che si vuole preparare la ricetta */
    var ings = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    ings.forEach(function(ing){
      var iname = (ing.name||ing.nome||'').trim();
      if (!iname) return;
      var qty   = (parseFloat(ing.quantity) || 0) * times;
      var unit  = ing.unit || 'g';
      if (!needed[iname]) needed[iname] = { name:iname, quantity:0, unit:unit, manual:false, bought:false };
      needed[iname].quantity += qty;
    });
  });
  var manual = (typeof spesaItems !== 'undefined' ? spesaItems : []).filter(function(i){ return i.manual; });
  spesaItems = manual.concat(Object.values(needed).map(function(i){
    return Object.assign({}, i, { quantity: i.quantity > 0 ? i.quantity : null });
  }));
  saveData();
  spesaRecipeSelectorOpen = false;
  renderSpesa();
  if (typeof showToast==='function') showToast('✅ Lista generata da '+selected.length+' ricett'+(selected.length===1?'a':'e'),'success');
}

/* Restituisce la categoria di display per un item della spesa (stile dispensa). */
function getSpesaItemCategory(item) {
  var name = (item && item.name) ? item.name : '';
  var pd = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : null;
  var cat = pd ? (pd.category || '🧂 Altro') : (typeof paGetIngCat === 'function' ? paGetIngCat(name) : '🧂 Altro');
  if (typeof resolveDisplayCategory === 'function') {
    return resolveDisplayCategory({ name: name, category: cat, icon: pd ? pd.icon : null });
  }
  return cat || '🧂 Altro';
}

/* ══════════════════════════════════════════════
   RENDER PRINCIPALE
══════════════════════════════════════════════ */
function renderSpesa() {
  var el = document.getElementById('spesaContent');
  if (!el) return;

  var items  = typeof spesaItems !== 'undefined' ? spesaItems : [];

  /* ── toolbar ── */
  var toolbar =
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
      '<button class="rc-btn rc-btn-outline" onclick="openSpesaItemModal()">＋ Aggiungi</button>' +
      '<button class="rc-btn rc-btn-outline" onclick="clearBoughtItems()">Rimuovi acquistati</button>' +
      '<button class="rc-btn rc-btn-outline" onclick="clearEntireSpesaList()">Svuota tutta la lista</button>' +
    '</div>' +
    buildSpesaGeneratePanel();

  if (!items.length) {
    el.innerHTML =
      toolbar +
      '<div class="rc-empty">' +
        '<div style="font-size:2.5rem;">🛒</div>' +
        '<p>Premi <strong>⚡ Genera</strong> per creare automaticamente la lista dagli ingredienti mancanti nel tuo piano.</p>' +
      '</div>';
    return;
  }

  /* Raggruppa per categoria (stesso ordine della dispensa) */
  var groups = {};
  items.forEach(function(item) {
    var cat = getSpesaItemCategory(item);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  var catOrder = (typeof CATEGORY_ORDER !== 'undefined' && Array.isArray(CATEGORY_ORDER)) ? CATEGORY_ORDER.slice() : [];
  Object.keys(groups).forEach(function(c) {
    if (catOrder.indexOf(c) === -1) catOrder.push(c);
  });

  var html = toolbar;
  catOrder.forEach(function(cat) {
    var catItems = groups[cat];
    if (!catItems || !catItems.length) return;
    if (cat === '🥩 Carne e Pesce' && (groups['🥩 Carne'] || groups['🐟 Pesce'])) return;
    var color = (typeof getCategoryColor === 'function') ? getCategoryColor(cat) : '#64748b';
    var icon  = (typeof getCategoryIcon === 'function') ? getCategoryIcon(cat) : '🧂';
    var catName = (cat && cat.replace) ? cat.replace(/^[^\s]+\s/, '') : cat;
    html +=
      '<details class="fi-group fi-group-collapsible" style="--gc:' + color + ';">' +
        '<summary class="fi-group-header">' +
          '<span class="fi-group-icon">' + icon + '</span>' +
          '<span class="fi-group-name">' + catName + '</span>' +
          '<span class="fi-group-count">' + catItems.length + '</span>' +
        '</summary>' +
        '<div class="fi-list">' +
          catItems.map(function(item) { return buildSpesaCard(item, items.indexOf(item)); }).join('') +
        '</div>' +
      '</details>';
  });

  el.innerHTML = html;
}

/* ── CARD SINGOLO ITEM ── */
function buildSpesaCard(item, idx) {
  var bought  = item.bought ? true : false;
  var opacity = bought ? 'opacity:.45;' : '';
  var strike  = bought ? 'text-decoration:line-through;color:var(--text-3);' : '';
  var qty     = item.quantity ? item.quantity + ' ' + (item.unit||'g') : '';

  return (
    '<div class="rc-card" style="display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:8px;'+opacity+'" data-idx="'+idx+'">' +
      '<button onclick="toggleBought('+idx+')" style="background:none;border:none;cursor:pointer;font-size:1.3em;padding:0;flex-shrink:0;">' +
        (bought ? '✅' : '<span style="width:22px;height:22px;border:2px solid var(--border);border-radius:50%;display:inline-block;"></span>') +
      '</button>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:500;'+strike+'">'+item.name+'</div>' +
        (qty ? '<div style="font-size:.82em;color:var(--text-3);">'+qty+'</div>' : '') +
      '</div>' +
      (item.manual
        ? '<span class="rc-badge" style="background:var(--bg2);color:var(--text-3);">manuale</span>'
        : '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">piano</span>') +
      '<button class="rc-btn-icon" onclick="removeSpesaItem('+idx+')" title="Rimuovi">🗑️</button>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════════
   AZIONI
══════════════════════════════════════════════ */
function toggleBought(idx) {
  var items = typeof spesaItems !== 'undefined' ? spesaItems : [];
  if (!items[idx]) return;
  items[idx].bought = !items[idx].bought;

  /* se appena acquistato → apri modal quantità e gamification */
  if (items[idx].bought) {
    if (typeof showCompletionCelebration === 'function') showCompletionCelebration();
    openSpesaQtyModal(idx);
  }
  saveData();
  renderSpesa();
}

function removeSpesaItem(idx) {
  var items = typeof spesaItems !== 'undefined' ? spesaItems : [];
  items.splice(idx, 1);
  saveData();
  renderSpesa();
}

function clearBoughtItems() {
  if (!confirm('Rimuovere tutti gli articoli acquistati?')) return;
  spesaItems = (typeof spesaItems !== 'undefined' ? spesaItems : [])
    .filter(function(i){ return !i.bought; });
  saveData();
  renderSpesa();
}

function clearEntireSpesaList() {
  if (!confirm('Vuoi svuotare tutta la lista della spesa? Tutti gli articoli (anche non ancora acquistati) verranno rimossi.')) return;
  spesaItems = [];
  if (typeof saveData === 'function') saveData();
  if (typeof renderSpesa === 'function') renderSpesa();
  if (typeof showToast === 'function') showToast('Lista della spesa svuotata', 'info');
}

/* ── GENERA DA PIANO (× giorni) ── */
function generateShoppingList() {
  var days   = typeof spesaGenerateDays !== 'undefined' ? (parseInt(spesaGenerateDays)||1) : 1;
  var needed = {};

  /* Conversioni unità per sottrazione quantità */
  var _unitToBase = { 'g':1, 'kg':1000, 'ml':1, 'l':1000 };

  function _convertToBase(qty, unit) {
    return qty * (_unitToBase[unit] || 1);
  }

  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk){
    var planMeal = (typeof pianoAlimentare !== 'undefined' && pianoAlimentare && pianoAlimentare[mk])
                   ? pianoAlimentare[mk] : {};
    Object.keys(planMeal).forEach(function(cat){
      var arr = planMeal[cat];
      if (!Array.isArray(arr)) return;
      arr.forEach(function(item){
        if (!item || !item.name) return;
        var name    = item.name.trim();
        var baseQty = parseFloat(item.quantity) || 0;
        var unit    = item.unit || 'g';
        var totalQty = baseQty * days;
        var hasQty  = baseQty > 0;

        /* Ricerca in dispensa case-insensitive (confronto esatto lowercase) */
        var nameLower = name.toLowerCase().trim();
        var matchedKey = (typeof pantryItems !== 'undefined' && pantryItems)
          ? (Object.keys(pantryItems).find(function(k) {
              return k.toLowerCase().trim() === nameLower;
            }) || null)
          : null;
        var pd = matchedKey ? pantryItems[matchedKey] : null;

        /* Sottrae la quantità già disponibile in dispensa */
        if (pd && hasQty) {
          var pQty = pd.quantity || 0;
          var pUnit = pd.unit || unit;
          /* Converti in unità base per confronto, solo se compatibili (peso o volume) */
          var baseCompatible = (_unitToBase[unit] !== undefined) && (_unitToBase[pUnit] !== undefined);
          if (baseCompatible) {
            /* Converti tutto in base comune (g o ml) */
            var totalBase  = _convertToBase(totalQty, unit);
            var pantryBase = _convertToBase(pQty, pUnit);
            var toShopBase = totalBase - pantryBase;
            if (toShopBase <= 0) return; /* dispensa copre tutto */
            /* Riconverti in unità originale per visualizzazione */
            totalQty = toShopBase / (_unitToBase[unit] || 1);
          } else {
            /* Unità incompatibili (es. g vs pz): comportamento conservativo */
            if ((pQty || 0) > 0) return; /* se c'è qualcosa in dispensa, skip */
          }
        } else if (pd && !hasQty) {
          /* Ingrediente senza quantità nel piano ma presente in dispensa: skip */
          return;
        }

        /* Aggiunge all'elenco (anche se senza quantità, per non perderlo) */
        if (!needed[name]) {
          needed[name] = { name:name, quantity: totalQty > 0 ? parseFloat(totalQty.toFixed(3)) : null, unit:unit, manual:false, bought:false };
        } else if (totalQty > 0) {
          needed[name].quantity = parseFloat(((needed[name].quantity||0) + totalQty).toFixed(3));
        }
      });
    });
  });

  /* mantieni i manuali, sostituisci gli auto */
  var manual = (typeof spesaItems !== 'undefined' ? spesaItems : []).filter(function(i){ return i.manual; });
  var autoItems = Object.values(needed);
  if (!autoItems.length) {
    if (typeof showToast==='function') showToast('ℹ️ Nessun ingrediente da aggiungere: il piano è vuoto o tutto già coperto dalla dispensa', 'info');
    /* mantieni comunque i manuali */
    spesaItems = manual;
    saveData();
    renderSpesa();
    return;
  }
  spesaItems = manual.concat(autoItems);
  saveData();
  renderSpesa();
  if (typeof showToast==='function') showToast('✅ Lista generata per '+days+' giorn'+(days===1?'o':'i')+' ('+autoItems.length+' ingredienti)','success');
}

/* ══════════════════════════════════════════════
   SUPPORTO PIANO → SPESA (singolo ingrediente)
   Usato da pagina Oggi e Dispensa (pianoAddToSpesa)
══════════════════════════════════════════════ */
function pianoAddToSpesa(name, quantity, unit, silent) {
  if (!name) return;
  if (typeof spesaItems === 'undefined' || !Array.isArray(spesaItems)) spesaItems = [];
  var q = parseFloat(quantity);
  if (isNaN(q) || q <= 0) q = null;
  unit = unit || 'g';

  var nl = name.toLowerCase().trim();
  var existing = spesaItems.find(function(item) {
    if (!item || !item.name) return false;
    return !item.bought &&
      item.name.toLowerCase().trim() === nl &&
      (item.unit || 'g') === unit &&
      !item.manual;
  });

  if (existing) {
    if (q !== null) {
      var cur = parseFloat(existing.quantity) || 0;
      existing.quantity = parseFloat((cur + q).toFixed(3));
    }
  } else {
    spesaItems.push({
      name: name,
      quantity: q,
      unit: unit,
      manual: false,
      bought: false
    });
  }

  if (typeof saveData === 'function') saveData();
  if (typeof renderSpesa === 'function') renderSpesa();
  if (!silent && typeof showToast === 'function') {
    var label = q ? (q + ' ' + unit) : '';
    showToast('🛒 ' + name + (label ? ' (' + label + ')' : '') + ' aggiunto alla lista della spesa', 'success');
  }
}

/* ── MODAL AGGIUNGI MANUALE ── */
function openSpesaItemModal() {
  var modal = document.getElementById('spesaItemModal');
  if (modal) modal.classList.add('active');
  var inp = document.getElementById('spesaItemName');
  if (inp) { inp.value=''; setTimeout(function(){ inp.focus(); },100); }
  var qtyInp = document.getElementById('spesaItemQty');
  if (qtyInp) qtyInp.value = '';
}

function closeSpesaItemModal() {
  var modal = document.getElementById('spesaItemModal');
  if (modal) modal.classList.remove('active');
}

function confirmSpesaItem() {
  var nameEl = document.getElementById('spesaItemName');
  var qtyEl  = document.getElementById('spesaItemQty');
  var unitEl = document.getElementById('spesaItemUnit');
  if (!nameEl) return;
  var name = nameEl.value.trim();
  if (!name) return;
  var qty  = parseFloat(qtyEl ? qtyEl.value : '') || null;
  var unit = unitEl ? unitEl.value : 'g';
  if (typeof spesaItems === 'undefined') spesaItems = [];
  spesaItems.push({ name:name, quantity:qty, unit:unit, manual:true, bought:false });
  saveData();
  closeSpesaItemModal();
  renderSpesa();
}

/* ── MODAL QUANTITÀ ACQUISTATA ── */
function openSpesaQtyModal(idx) {
  var modal   = document.getElementById('spesaQtyModal');
  var label   = document.getElementById('spesaQtyLabel');
  var inp     = document.getElementById('spesaQtyInput');
  var unitSel = document.getElementById('spesaQtyUnit');
  if (!modal) return;
  var item = (typeof spesaItems !== 'undefined' && spesaItems[idx]) ? spesaItems[idx] : null;
  if (!item) return;
  if (label)   label.textContent = item.name;
  if (inp)     inp.value = item.quantity || '';
  if (unitSel) unitSel.value = item.unit || 'g';
  inp && (inp.dataset.idx = idx);
  modal.classList.add('active');
  setTimeout(function(){ if(inp){ inp.focus(); inp.select(); } },100);
}

function closeSpesaQtyModal() {
  var modal = document.getElementById('spesaQtyModal');
  if (modal) modal.classList.remove('active');
}

function confirmSpesaQty() {
  var inp     = document.getElementById('spesaQtyInput');
  var unitSel = document.getElementById('spesaQtyUnit');
  var modal   = document.getElementById('spesaQtyModal');
  if (!inp) return;
  var idx  = parseInt(inp.dataset.idx);
  var val  = parseFloat(inp.value);
  var unit = unitSel ? unitSel.value : 'g';
  if (!isNaN(idx) && !isNaN(val) && val > 0) {
    var item = spesaItems[idx];
    if (item && typeof addFromSpesa === 'function') {
      addFromSpesa(item.name, val, unit);
    }
  }
  if (modal) modal.classList.remove('active');
  renderSpesa();
}

function skipSpesaQty() {
  closeSpesaQtyModal();
  renderSpesa();
}
