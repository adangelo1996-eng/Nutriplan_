/*
   PIANO.JS — v9  stile rc-card unificato + ordinamento Oggi + ricerca
*/

var selectedMeal = 'colazione';
var pianoSearchQuery = '';
var editDayActive = false;
var editDayDateKey = null;
var _savedDateKeyBeforeEdit = null;

/* ── INIT ── */
function initMealSelector() {
  var meals = [
    { key:'colazione', emoji:'☀️', label:'Colazione' },
    { key:'spuntino',  emoji:'🍎', label:'Spuntino'  },
    { key:'pranzo',    emoji:'🍽', label:'Pranzo'    },
    { key:'merenda',   emoji:'🥪', label:'Merenda'   },
    { key:'cena',      emoji:'🌙', label:'Cena'      }
  ];
  var wrap = document.getElementById('mealSelector');
  if (!wrap) return;
  wrap.innerHTML = meals.map(function(m){
    var a = m.key === selectedMeal ? ' active' : '';
    return '<button class="rf-pill'+a+'" onclick="selectMeal(\''+m.key+'\',this)">'+
           m.emoji+' '+m.label+'</button>';
  }).join('');
}

function selectMeal(meal, btn) {
  selectedMeal = meal;
  pianoSearchQuery = '';
  var searchInput = document.getElementById('pianoSearchInput');
  if (searchInput) searchInput.value = '';
  var sel = (editDayActive && document.getElementById('editDay_mealSelector'))
    ? '#editDay_mealSelector' : '#mealSelector';
  document.querySelectorAll(sel + ' .rf-pill, ' + sel + ' .meal-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  _pianoRicetteFilter = 'base';
  renderMealItems();
  if (typeof renderMealProgress === 'function') renderMealProgress();
  renderPianoRicette();
  if (typeof renderPianoMissingAlert === 'function') renderPianoMissingAlert();
}

function filterPianoToday(query) {
  pianoSearchQuery = (query || '').toLowerCase().trim();
  renderMealItems();
   renderPianoMissingAlert();
}

/* ── ENTRY POINT ── */
function renderMealPlan() {
  ensureDefaultPlan();
  initMealSelector();
  renderMealProgress();
  renderMealItems();
  renderPianoRicette();
   renderPianoMissingAlert();
}

function ensureDefaultPlan() {
  if (typeof defaultMealPlan === 'undefined') return;
  if (typeof currentUser !== 'undefined' && currentUser) return;
  if (localStorage.getItem('nutriplan_cleared') === '1') return;
  var isEmpty = !pianoAlimentare || !Object.keys(pianoAlimentare).some(function(mk){
    var m = pianoAlimentare[mk] || {};
    return ['principale','contorno','frutta','extra'].some(function(cat){
      return Array.isArray(m[cat]) && m[cat].length > 0;
    });
  });
  if (isEmpty) pianoAlimentare = JSON.parse(JSON.stringify(defaultMealPlan));
}

/* ── PROGRESS ── */
function renderMealProgress() {
  var wrap = document.getElementById('mealProgressWrap');
  if (!wrap) return;
  var dayData   = getDayData(selectedDateKey);
  var usedItems = (dayData && dayData.usedItems) ? dayData.usedItems : {};
  var total = 0, used = 0;
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk){
    var items = getMealItems(mk);
    total += items.length;
    var mUsed = usedItems[mk] || {};
    items.forEach(function(i){ if (mUsed[i.name]) used++; });
  });
  if (!total) { wrap.innerHTML = ''; return; }
  var pct = Math.round((used / total) * 100);
  wrap.innerHTML =
    '<div class="rc-card" style="padding:14px 18px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<span style="font-size:.85em;color:var(--text-2);">Pasti completati oggi</span>' +
        '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">'+used+' / '+total+'</span>' +
      '</div>' +
      '<div class="rc-progress-track">' +
        '<div class="rc-progress-fill" style="width:'+pct+'%;background:var(--primary);"></div>' +
      '</div>' +
    '</div>';
}

/* ── MEAL ITEMS ── */
function getMealItems(meal) {
  var out = [];
  if (pianoAlimentare && pianoAlimentare[meal]) {
    Object.keys(pianoAlimentare[meal]).forEach(function(cat) {
      var arr = pianoAlimentare[meal][cat];
      if (Array.isArray(arr)) arr.forEach(function(i) {
        if (i && i.name) out.push(Object.assign({}, i, { _cat: cat }));
      });
    });
  }
  return out;
}

function renderMealItems() {
  var el = document.getElementById((editDayActive ? 'editDay_mealItemsWrap' : 'mealItemsWrap'));
  if (!el) return;
  var items    = getMealItems(selectedMeal);
  var dayData  = getDayData(selectedDateKey);
  var usedMap  = (dayData && dayData.usedItems && dayData.usedItems[selectedMeal]) ? dayData.usedItems[selectedMeal] : {};
  var subsMap  = (dayData && dayData.substitutions && dayData.substitutions[selectedMeal]) ? dayData.substitutions[selectedMeal] : {};
  var mealColor = { colazione:'#f59e0b', spuntino:'#10b981', pranzo:'#3d8b6f', merenda:'#8b5cf6', cena:'#3b82f6' }[selectedMeal] || 'var(--primary)';

  /* Applica filtro ricerca */
  if (pianoSearchQuery) {
    items = items.filter(function(item) {
      var subName = subsMap[item.name] || null;
      var display = subName || item.name;
      return display.toLowerCase().includes(pianoSearchQuery);
    });
  }

  /* Ordina per disponibilità in dispensa */
  items.sort(function(a, b) {
    var aSubName = subsMap[a.name] || null;
    var bSubName = subsMap[b.name] || null;
    var aDisplay = aSubName || a.name;
    var bDisplay = bSubName || b.name;
    var aInFridge = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[aDisplay] && (pantryItems[aDisplay].quantity||0) > 0);
    var bInFridge = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[bDisplay] && (pantryItems[bDisplay].quantity||0) > 0);
    
    /* Prima gli ingredienti in dispensa */
    if (aInFridge && !bInFridge) return -1;
    if (!aInFridge && bInFridge) return 1;
    
    /* Poi per nome */
    return aDisplay.localeCompare(bDisplay, 'it');
  });

  if (!items.length) {
    if (pianoSearchQuery) {
      el.innerHTML =
        '<div class="rc-empty">' +
          '<div style="font-size:2rem;">🔍</div>' +
          '<p>Nessun alimento corrisponde a "<strong>' + pianoSearchQuery + '</strong>".</p>' +
        '</div>';
    } else {
      el.innerHTML =
        '<div class="rc-empty">' +
          '<div style="font-size:2rem;">🍽</div>' +
          '<p>Nessun alimento impostato per questo pasto.</p>' +
        '</div>';
    }
    return;
  }

  /* ── Sezione "già consumati" compatta ── */
  var dayData2  = getDayData(selectedDateKey);
  var ricetteMap = (dayData2 && dayData2.ricette && dayData2.ricette[selectedMeal]) ? dayData2.ricette[selectedMeal] : {};
  var consumedNames = Object.keys(usedMap).filter(function(k){ return usedMap[k]; });
  var ricetteNames  = Object.keys(ricetteMap).filter(function(k){ return ricetteMap[k]; });
  var consumedHtml = '';
  if (consumedNames.length || ricetteNames.length) {
    var chips = consumedNames.map(function(n){
      return '<span class="consumed-chip">✅ ' + n + '</span>';
    }).join('') + ricetteNames.map(function(n){
      return '<span class="consumed-chip consumed-chip-recipe">🍽 ' + n + '</span>';
    }).join('');
    consumedHtml =
      '<div class="consumed-bar">' +
        '<span class="consumed-bar-label">Già consumati:</span>' +
        chips +
      '</div>';
  }

  /* ── Pulsante Genera Ricetta AI ── */
  var aiBtn =
    '<div style="margin-bottom:10px;">' +
      '<button class="ai-recipe-btn" onclick="openAIRecipeModal(\'oggi\')">' +
        '🤖 Genera ricetta AI con questi ingredienti' +
        '<span class="ai-powered-label">Powered by Gemini</span>' +
      '</button>' +
    '</div>';

  function buildPianoItemCard(item) {
    var used    = usedMap[item.name] ? true : false;
    var subName = subsMap[item.name] || null;
    var display = subName || item.name;
    var qty     = item.quantity ? item.quantity + ' ' + (item.unit||'g') : '';
    var inFridge = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[display] && (pantryItems[display].quantity||0) > 0);
    var usedCls = used ? ' style="opacity:.45;text-decoration:line-through;"' : '';

    var alreadyBadge = '';
    var today = new Date();
    var todayKey = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    if (typeof appHistory !== 'undefined' && appHistory) {
      var checkNames = [item.name];
      if (subName) checkNames.push(subName);
      var recentDaysAgo = null;
      var recentWhat = '';
      Object.keys(appHistory).sort(function(a,b){ return b.localeCompare(a); }).slice(0, 14).forEach(function(dk){
        if (recentDaysAgo !== null) return;
        if (dk === todayKey) return;
        var hd = appHistory[dk];
        if (!hd) return;
        var d1 = new Date(dk.replace(/-/g,'/')), d2 = new Date(todayKey.replace(/-/g,'/'));
        var diffDays = Math.round((d2 - d1) / 86400000);
        ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk){
          if (recentDaysAgo !== null) return;
          var dayUsed = (hd.usedItems && hd.usedItems[mk]) ? hd.usedItems[mk] : {};
          var daySubs = (hd.substitutions && hd.substitutions[mk]) ? hd.substitutions[mk] : {};
          checkNames.forEach(function(nm){
            if (recentDaysAgo !== null) return;
            if (dayUsed[nm]) { recentDaysAgo = diffDays; recentWhat = nm; }
            Object.keys(daySubs).forEach(function(orig){
              if (recentDaysAgo !== null) return;
              if (daySubs[orig] === nm) { recentDaysAgo = diffDays; recentWhat = nm + ' (alt.)'; }
            });
          });
        });
      });
      if (recentDaysAgo !== null) {
        var label = recentDaysAgo === 1 ? 'ieri' : recentDaysAgo + ' gg fa';
        alreadyBadge = '<span class="already-selected-badge" title="Selezionato: ' + recentWhat + '">' +
          '⏱ ' + label + '</span>';
      }
    }

    var actionBtns;
    if (used) {
      actionBtns = '<button class="rc-btn-icon" title="Annulla" onclick="toggleUsedItem(\''+escQ(item.name)+'\')">↩</button>';
    } else if (inFridge) {
      actionBtns = '<button class="rc-btn-icon" title="Segna consumato" onclick="toggleUsedItem(\''+escQ(item.name)+'\')">✅</button>';
    } else {
      actionBtns =
        '<div class="piano-item-add-btns">' +
        '<button class="rc-btn rc-btn-outline rc-btn-sm" title="Aggiungi alla dispensa" ' +
                'onclick="openAddFridgePrecompiled(\''+escQ(display)+'\')">+ dispensa</button>' +
        '<button class="rc-btn rc-btn-primary rc-btn-sm" title="Aggiungi alla lista della spesa" ' +
                'onclick="pianoAddToSpesa(\''+escQ(display)+'\',\''+escQ(item.quantity||'')+'\',\''+escQ(item.unit||'g')+'\')">+ spesa</button>' +
        '</div>';
    }

    return '<div class="rc-card piano-item-card" style="margin-bottom:8px;">' +
      '<div class="piano-item-row">' +
        '<div class="piano-item-name-block">' +
          '<span'+usedCls+' class="piano-item-name">'+display+'</span>' +
          (qty ? '<span class="piano-item-qty-below">'+qty+'</span>' : '') +
        '</div>' +
        alreadyBadge +
        (subName ? '<span class="rc-badge piano-item-sub">↔</span>' : '') +
        '<div class="piano-item-actions">' +
          actionBtns +
          '<button class="rc-btn-icon" title="Sostituisci" onclick="openSubstituteModal(\''+escQ(item.name)+'\')">↔</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* Raggruppa per categoria alimento (stesso ordine dispensa) */
  var groups = {};
  items.forEach(function(item) {
    var cat = (typeof getSpesaItemCategory === 'function') ? getSpesaItemCategory(item) : '🧂 Altro';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  var catOrder = (typeof CATEGORY_ORDER !== 'undefined' && Array.isArray(CATEGORY_ORDER)) ? CATEGORY_ORDER.slice() : [];
  Object.keys(groups).forEach(function(c) {
    if (catOrder.indexOf(c) === -1) catOrder.push(c);
  });

  var listHtml = '';
  catOrder.forEach(function(cat) {
    if (cat === '🥩 Carne e Pesce' && (groups['🥩 Carne'] || groups['🐟 Pesce'])) return;
    var catItems = groups[cat];
    if (!catItems || !catItems.length) return;
    var color = (typeof getCategoryColor === 'function') ? getCategoryColor(cat) : '#64748b';
    var icon  = (typeof getCategoryIcon === 'function') ? getCategoryIcon(cat) : '🧂';
    var catName = (cat && cat.replace) ? cat.replace(/^[^\s]+\s/, '') : cat;
    listHtml +=
      '<details class="fi-group fi-group-collapsible" style="--gc:' + color + ';" open>' +
        '<summary class="fi-group-header">' +
          '<span class="fi-group-icon">' + icon + '</span>' +
          '<span class="fi-group-name">' + catName + '</span>' +
          '<span class="fi-group-count">' + catItems.length + '</span>' +
        '</summary>' +
        '<div class="fi-list">' +
          catItems.map(buildPianoItemCard).join('') +
        '</div>' +
      '</details>';
  });

  el.innerHTML = consumedHtml + aiBtn + listHtml;
}

/* ── USED / SUBSTITUTE ── */
function toggleUsedItem(name) {
  if (!selectedDateKey) return;
  if (typeof pushUndo === 'function') pushUndo('Segna ' + name);
  if (!appHistory[selectedDateKey]) appHistory[selectedDateKey] = { usedItems:{}, substitutions:{} };
  var day = appHistory[selectedDateKey];
  if (!day.usedItems) day.usedItems = {};
  if (!day.usedItems[selectedMeal]) day.usedItems[selectedMeal] = {};
  var cur = day.usedItems[selectedMeal][name];
  
  var today = new Date();
  var todayKey = formatDateKey(today);
  var isToday = selectedDateKey === todayKey;
  
  if (cur) {
    delete day.usedItems[selectedMeal][name];
  } else {
    day.usedItems[selectedMeal][name] = true;
    if (typeof showCompletionCelebration === 'function') showCompletionCelebration();
    if (isToday) {
      var subs = day.substitutions && day.substitutions[selectedMeal] && day.substitutions[selectedMeal][name];
      var consumed = subs || name;
      if (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[consumed]) {
        var item = getMealItems(selectedMeal).find(function(i){ return i.name === name; });
        if (item && item.quantity) {
          pantryItems[consumed].quantity = Math.max(0, (pantryItems[consumed].quantity||0) - parseFloat(item.quantity));
        }
      }
    }
  }
  saveData();
  renderMealItems();
  if (typeof renderMealProgress === 'function') renderMealProgress();
  if (typeof renderFridge === 'function') renderFridge();
}

/* Gruppi macro-compatibili per le sostituzioni */
var MACRO_COMPATIBLE_GROUPS = [
  ['🥩 Carne', '🐟 Pesce', '🥩 Carne e Pesce'],
  ['🥛 Latticini e Uova'],
  ['🌾 Cereali e Legumi'],
  ['🥦 Verdure'],
  ['🍎 Frutta'],
  ['🥑 Grassi e Condimenti'],
  ['🍫 Dolci e Snack']
];

function _getSameGroup(cat) {
  for (var i = 0; i < MACRO_COMPATIBLE_GROUPS.length; i++) {
    if (MACRO_COMPATIBLE_GROUPS[i].indexOf(cat) !== -1) return MACRO_COMPATIBLE_GROUPS[i];
  }
  return null;
}

var _subCurrentName = '';

function openSubstituteModal(name) {
  _subCurrentName = name;

  var origCat = null;
  if (typeof defaultIngredients !== 'undefined') {
    var def = defaultIngredients.find(function(d){ return d.name === name; });
    if (def) origCat = def.category || null;
  }
  if (!origCat && typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) {
    origCat = pantryItems[name].category || null;
  }
  var compatGroup = origCat ? _getSameGroup(origCat) : null;

  var inFridge = (typeof pantryItems !== 'undefined' && pantryItems)
    ? Object.keys(pantryItems).filter(function(k){
        if (!k || !pantryItems[k] || (pantryItems[k].quantity||0) <= 0 || k === name) return false;
        if (compatGroup) {
          var kCat = pantryItems[k].category || null;
          if (!kCat && typeof defaultIngredients !== 'undefined') {
            var kDef = defaultIngredients.find(function(d){ return d.name === k; });
            if (kDef) kCat = kDef.category || null;
          }
          return compatGroup.indexOf(kCat) !== -1;
        }
        return true;
      })
    : [];

  var planSuggestions = [];
  var seenPlan = {};
  seenPlan[name] = true;
  inFridge.forEach(function(k){ seenPlan[k] = true; });

  if (typeof pianoAlimentare !== 'undefined' && pianoAlimentare) {
    ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk){
      var mp = pianoAlimentare[mk] || {};
      Object.keys(mp).forEach(function(cat){
        var arr = mp[cat];
        if (!Array.isArray(arr)) return;
        arr.forEach(function(item){
          if (!item || !item.name || seenPlan[item.name]) return;
          var iCat = null;
          if (typeof defaultIngredients !== 'undefined') {
            var iDef = defaultIngredients.find(function(d){ return d.name === item.name; });
            if (iDef) iCat = iDef.category || null;
          }
          if (!iCat && typeof pantryItems !== 'undefined' && pantryItems && pantryItems[item.name]) {
            iCat = pantryItems[item.name].category || null;
          }
          var ok = compatGroup ? (iCat && compatGroup.indexOf(iCat) !== -1) : true;
          if (ok) {
            seenPlan[item.name] = true;
            planSuggestions.push(item.name);
          }
        });
      });
    });
  }

  var dbSuggestions = [];
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients) && origCat) {
    defaultIngredients.forEach(function(i){
      if (!i || !i.name || seenPlan[i.name]) return;
      var ok = compatGroup ? compatGroup.indexOf(i.category) !== -1 : i.category === origCat;
      if (ok) {
        seenPlan[i.name] = true;
        dbSuggestions.push(i.name);
      }
    });
  }

  var html = '<div style="margin-bottom:12px;font-weight:600;font-size:1em;">Sostituisci: <em>' + name + '</em></div>';
  if (origCat) {
    html += '<div style="font-size:.78em;color:var(--text-3);margin-bottom:14px;">Categoria: ' + origCat + '</div>';
  }

  if (inFridge.length) {
    html += '<div style="font-size:.82em;font-weight:700;color:var(--primary);margin-bottom:8px;">✔ Disponibili in dispensa</div>';
    html += inFridge.map(function(k){
      return '<button class="sub-opt-btn sub-opt-available" onclick="applySubstitute(\'' + escQ(name) + '\',\'' + escQ(k) + '\')">' +
               k + '<span class="rc-badge" style="margin-left:8px;background:var(--success-light,#dcfce7);color:var(--success,#16a34a);">in dispensa</span>' +
             '</button>';
    }).join('');
  }

  var allSuggestions = planSuggestions.concat(dbSuggestions).slice(0, 8);
  if (allSuggestions.length) {
    html += '<div style="font-size:.82em;font-weight:700;color:var(--text-2);margin:14px 0 8px;">💡 Suggerimenti compatibili</div>';
    html += allSuggestions.map(function(k){
      return '<button class="sub-opt-btn" onclick="applySubstitute(\'' + escQ(name) + '\',\'' + escQ(k) + '\')">' + k + '</button>';
    }).join('');
  }

  var contentEl = document.getElementById('substituteModalBody');
  if (contentEl) contentEl.innerHTML = html;

  var modal = document.getElementById('substituteModal');
  if (modal) modal.classList.add('active');
}

function closeSubstituteModal() {
  var modal = document.getElementById('substituteModal');
  if (modal) modal.classList.remove('active');
  _subCurrentName = '';
}

function applySubstitute(original, substitute) {
  if (!selectedDateKey || !original || !substitute) return;
  if (!appHistory[selectedDateKey]) appHistory[selectedDateKey] = { usedItems:{}, substitutions:{} };
  var day = appHistory[selectedDateKey];
  if (!day.substitutions) day.substitutions = {};
  if (!day.substitutions[selectedMeal]) day.substitutions[selectedMeal] = {};
  day.substitutions[selectedMeal][original] = substitute;
  saveData();
  closeSubstituteModal();
  renderMealItems();
  if (typeof showToast === 'function') showToast('↔ ' + original + ' → ' + substitute, 'success');
}

/* ── Ricette del piano (sezione sotto "Oggi") ── */
var _pianoRicetteFilter = 'base';

function renderPianoRicette() {
  var container = document.getElementById(editDayActive ? 'editDay_ricetteWrap' : 'pianoRicetteWrap');
  if (!container) return;

  /* Ottieni tutti gli ingredienti previsti per questo pasto */
  var mealItems = getMealItems(selectedMeal);
  var mealIngNames = mealItems.map(function(i) { return i.name.toLowerCase().trim(); });

  var allRicette = (typeof getAllRicette === 'function') ? getAllRicette() : [];

  /* Filtra ricette compatibili con il pasto corrente E che usano solo ingredienti previsti */
  var compatibleRicette = allRicette.filter(function(r) {
    if (!r || !r.name) return false;

    /* 1. La ricetta deve essere compatibile con il pasto */
    var ricettaPasti = Array.isArray(r.pasto) ? r.pasto : [r.pasto];
    if (!ricettaPasti.some(function(p) { return p === selectedMeal; })) return false;

    /* 2. TUTTI gli ingredienti della ricetta devono essere nel piano per questo pasto */
    var ricettaIngs = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    if (!ricettaIngs.length) return true; /* Ricetta senza ingredienti: accettata */

    var allInPlan = ricettaIngs.every(function(ing) {
      var ingName = (ing.name || ing.nome || '').toLowerCase().trim();
      return mealIngNames.some(function(planName) {
        return planName === ingName || planName.includes(ingName) || ingName.includes(planName);
      });
    });

    return allInPlan;
  });

  if (!compatibleRicette.length) {
    container.innerHTML =
      '<div class="rc-empty" style="padding:24px 16px;">' +
        '<div style="font-size:2rem;">🍽</div>' +
        '<p>Nessuna ricetta disponibile con gli ingredienti previsti per questo pasto.</p>' +
      '</div>';
    return;
  }

  /* Ordina per disponibilità */
  compatibleRicette.sort(function(a, b) {
    var aIngs = Array.isArray(a.ingredienti) ? a.ingredienti : [];
    var bIngs = Array.isArray(b.ingredienti) ? b.ingredienti : [];
    var aAvail = 0, bAvail = 0;

    if (typeof pantryItems !== 'undefined' && pantryItems) {
      aIngs.forEach(function(ing) {
        var name = (ing.name || ing.nome || '').toLowerCase().trim();
        if (Object.keys(pantryItems).some(function(k) {
          return k.toLowerCase().trim() === name && (pantryItems[k].quantity || 0) > 0;
        })) aAvail++;
      });
      bIngs.forEach(function(ing) {
        var name = (ing.name || ing.nome || '').toLowerCase().trim();
        if (Object.keys(pantryItems).some(function(k) {
          return k.toLowerCase().trim() === name && (pantryItems[k].quantity || 0) > 0;
        })) bAvail++;
      });
    }

    var aPct = aIngs.length ? (aAvail / aIngs.length) : 0;
    var bPct = bIngs.length ? (bAvail / bIngs.length) : 0;

    if (aPct !== bPct) return bPct - aPct;
    return (a.name || a.nome || '').localeCompare(b.name || b.nome || '', 'it');
  });

  /* Stesso layout della pagina Ricette: rc-grid + buildCard */
  var cardsHtml = (typeof buildCard === 'function')
    ? compatibleRicette.map(function(r) { return buildCard(r); }).join('')
    : '';
  var html = '<div class="piano-ricette-section">' +
    '<div class="piano-ricette-title">Ricette compatibili per questo pasto</div>' +
    '<div class="rc-grid">' + cardsHtml + '</div></div>';
  container.innerHTML = html;
}

function escQ(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* ── MISSING ALERT ── */
function renderPianoMissingAlert() {
  var wrap = document.getElementById('pianoMissingWrap');
  if (!wrap) return;
  var items = getMealItems(selectedMeal);
  if (!items.length) { wrap.innerHTML = ''; return; }
  var missing = [];
  items.forEach(function(item) {
    var name = item.name;
    var inFridge = (typeof pantryItems !== 'undefined' && pantryItems &&
      pantryItems[name] && (pantryItems[name].quantity || 0) > 0);
    if (!inFridge) missing.push(name);
  });
  if (!missing.length) {
    wrap.innerHTML = '';
    return;
  }
  var chips = missing.map(function(n) {
    return '<span class="piano-missing-chip">' + n + '</span>';
  }).join('');
  wrap.innerHTML =
    '<div class="piano-missing-banner">' +
    '<span class="piano-missing-icon">⚠️</span>' +
    '<div style="flex:1;min-width:0;"><strong>Ingredienti mancanti in dispensa:</strong><br>' +
    '<div class="piano-missing-chips">' + chips + '</div></div>' +
    '<button class="rc-btn rc-btn-primary rc-btn-sm" onclick="pianoAddMissingToSpesa()">+ spesa</button>' +
    '</div>';
}

/* Aggiunge tutti gli ingredienti mancanti del pasto corrente alla lista spesa,
   usando le quantità minime previste dal piano. */
function pianoAddMissingToSpesa() {
  if (typeof pianoAddToSpesa !== 'function') return;
  var items = getMealItems(selectedMeal);
  if (!items.length) return;
  var added = 0;
  items.forEach(function(item) {
    if (!item || !item.name) return;
    var name = item.name;
    var inFridge = (typeof pantryItems !== 'undefined' && pantryItems &&
      pantryItems[name] && (pantryItems[name].quantity || 0) > 0);
    if (inFridge) return;
    var qty  = item.quantity || null;
    var unit = item.unit || 'g';
    pianoAddToSpesa(name, qty, unit, true);
    added++;
  });
  if (typeof saveData === 'function') saveData();
  if (typeof renderSpesa === 'function') renderSpesa();
  if (typeof showToast === 'function') {
    if (added) {
      showToast('🛒 ' + added + ' ingredienti aggiunti alla lista della spesa', 'success');
    } else {
      showToast('ℹ️ Nessun ingrediente da aggiungere', 'info');
    }
  }
}
