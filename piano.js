/*
   PIANO.JS — v8  stile rc-card unificato
*/

var selectedMeal = 'colazione';

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
  /* Aggiorna sia rf-pill che meal-btn */
  document.querySelectorAll('#mealSelector .rf-pill, #mealSelector .meal-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderMealItems();
  renderMealProgress();
  renderPianoRicette();
}

/* ── ENTRY POINT ── */
function renderMealPlan() {
  ensureDefaultPlan();
  initMealSelector();
  renderMealProgress();
  renderMealItems();
  renderPianoRicette();
}

function ensureDefaultPlan() {
  if (typeof defaultMealPlan === 'undefined') return;
  /* Non ripristinare i default se l'utente è loggato (dati da Firebase) */
  if (typeof currentUser !== 'undefined' && currentUser) return;
  /* Non ripristinare i default se l'utente ha esplicitamente cancellato
     tutti i dati — il piano deve restare vuoto */
  if (localStorage.getItem('nutriplan_cleared') === '1') return;
  var isEmpty = !mealPlan || !Object.keys(mealPlan).some(function(mk){
    var m = mealPlan[mk] || {};
    return ['principale','contorno','frutta','extra'].some(function(cat){
      return Array.isArray(m[cat]) && m[cat].length > 0;
    });
  });
  if (isEmpty) mealPlan = JSON.parse(JSON.stringify(defaultMealPlan));
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
  var plan = (mealPlan && mealPlan[meal]) ? mealPlan[meal] : {};
  var out  = [];
  ['principale','contorno','frutta','extra'].forEach(function(cat){
    var arr = plan[cat];
    if (Array.isArray(arr)) arr.forEach(function(i){
      if (i && i.name) out.push(Object.assign({}, i, { _cat: cat }));
    });
  });
  return out;
}

function renderMealItems() {
  var el = document.getElementById('mealItemsWrap');
  if (!el) return;
  var items    = getMealItems(selectedMeal);
  var dayData  = getDayData(selectedDateKey);
  var usedMap  = (dayData && dayData.usedItems && dayData.usedItems[selectedMeal]) ? dayData.usedItems[selectedMeal] : {};
  var subsMap  = (dayData && dayData.substitutions && dayData.substitutions[selectedMeal]) ? dayData.substitutions[selectedMeal] : {};
  var mealColor = { colazione:'#f59e0b', spuntino:'#10b981', pranzo:'#3d8b6f', merenda:'#8b5cf6', cena:'#3b82f6' }[selectedMeal] || 'var(--primary)';

  if (!items.length) {
    el.innerHTML =
      '<div class="rc-empty">' +
        '<div style="font-size:2rem;">🍽</div>' +
        '<p>Nessun alimento impostato per questo pasto.</p>' +
      '</div>';
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

  el.innerHTML = consumedHtml + aiBtn + items.map(function(item){
    var used    = usedMap[item.name] ? true : false;
    var subName = subsMap[item.name] || null;
    var display = subName || item.name;
    var qty     = item.quantity ? item.quantity + ' ' + (item.unit||'g') : '';
    var inFridge = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[display] && (pantryItems[display].quantity||0) > 0);
    var dot     = inFridge
      ? '<span style="color:var(--success);font-size:.9em;">✔</span>'
      : '<span style="color:var(--text-3);font-size:.9em;">○</span>';
    var usedCls = used ? ' style="opacity:.45;text-decoration:line-through;"' : '';

    /* Controlla se l'ingrediente o la sua alternativa è già stata consumata di recente */
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

    return '<div class="rc-card" style="margin-bottom:8px;">' +
      '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;">' +
        dot +
        '<span'+usedCls+' style="flex:1;font-weight:500;font-size:.93em;">'+display+'</span>' +
        alreadyBadge +
        (qty ? '<span class="rc-badge" style="font-size:.72em;">'+qty+'</span>' : '') +
        (subName ? '<span class="rc-badge" style="background:#fff3cd;color:#856404;font-size:.7em;">↔</span>' : '') +
        '<div style="display:flex;gap:4px;">' +
          '<button class="rc-btn-icon" title="'+(used?'Annulla':'Segna consumato')+'" onclick="toggleUsedItem(\''+escQ(item.name)+'\')">'+
            (used ? '↩' : '✅') +
          '</button>' +
          '<button class="rc-btn-icon" title="Sostituisci" onclick="openSubstituteModal(\''+escQ(item.name)+'\')">↔</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
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
  if (cur) {
    delete day.usedItems[selectedMeal][name];
  } else {
    day.usedItems[selectedMeal][name] = true;
    var subs = day.substitutions && day.substitutions[selectedMeal] && day.substitutions[selectedMeal][name];
    var consumed = subs || name;
    if (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[consumed]) {
      var item = getMealItems(selectedMeal).find(function(i){ return i.name === name; });
      if (item && item.quantity) {
        pantryItems[consumed].quantity = Math.max(0, (pantryItems[consumed].quantity||0) - parseFloat(item.quantity));
      }
    }
  }
  saveData();
  renderMealItems();
  renderMealProgress();
  if (typeof renderFridge === 'function') renderFridge();
}

/* Gruppi macro-compatibili per le sostituzioni */
var MACRO_COMPATIBLE_GROUPS = [
  ['🥩 Carne', '🐟 Pesce', '🥩 Carne e Pesce'], /* compat */
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

/* Nome ingrediente corrente per la modal sostituzione */
var _subCurrentName = '';

function openSubstituteModal(name) {
  _subCurrentName = name;

  /* Trova la categoria dell'ingrediente da sostituire */
  var origCat = null;
  if (typeof defaultIngredients !== 'undefined') {
    var def = defaultIngredients.find(function(d){ return d.name === name; });
    if (def) origCat = def.category || null;
  }
  if (!origCat && typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) {
    origCat = pantryItems[name].category || null;
  }
  var compatGroup = origCat ? _getSameGroup(origCat) : null;

  /* === 1. Ingredienti IN DISPENSA (qty > 0), stessa categoria === */
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

  /* === 2. Suggerimenti dal piano alimentare dell'utente, stessa categoria === */
  var planSuggestions = [];
  var seenPlan = {};
  seenPlan[name] = true;
  inFridge.forEach(function(k){ seenPlan[k] = true; });

  if (typeof mealPlan !== 'undefined' && mealPlan) {
    ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk){
      var mp = mealPlan[mk] || {};
      ['principale','contorno','frutta','extra'].forEach(function(cat){
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

  /* === 3. Suggerimenti da defaultIngredients, stessa categoria === */
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

  /* === Build HTML === */
  var html = '<div style="margin-bottom:12px;font-weight:600;font-size:1em;">Sostituisci: <em>' + name + '</em></div>';
  if (origCat) {
    html += '<div style="font-size:.78em;color:var(--text-3);margin-bottom:14px;">Categoria: ' + origCat + '</div>';
  }

  /* Sezione 1: in dispensa */
  if (inFridge.length) {
    html += '<div style="font-size:.82em;font-weight:700;color:var(--primary);margin-bottom:8px;">✔ Disponibili in dispensa</div>';
    html += inFridge.map(function(k){
      return '<button class="sub-opt-btn sub-opt-available" onclick="applySubstitute(\'' + escQ(name) + '\',\'' + escQ(k) + '\')">' +
               k + '<span class="rc-badge" style="margin-left:8px;background:var(--success-light,#dcfce7);color:var(--success,#16a34a);">in dispensa</span>' +
             '</button>';
    }).join('');
  }

  /* Sezione 2: suggerimenti dal piano */
  var allSuggestions = planSuggestions.concat(dbSuggestions).slice(0, 8);
  if (allSuggestions.length) {
    html += '<div style="font-size:.82em;font-weight:700;color:var(--text-2);margin:14px 0 8px;">💡 Suggerimenti compatibili</div>';
    html += allSuggestions.map(function(sName){
      return '<div class="sub-opt-suggestion">' +
               '<span class="sub-opt-name">' + sName + '</span>' +
               '<div class="sub-opt-actions">' +
                 '<button class="btn btn-secondary btn-small" title="Aggiungi alla spesa" ' +
                         'onclick="subAddToSpesa(\'' + escQ(sName) + '\')">🛒 Spesa</button>' +
                 '<button class="btn btn-secondary btn-small" title="Aggiungi in dispensa" ' +
                         'onclick="subAddToDispensa(\'' + escQ(name) + '\',\'' + escQ(sName) + '\')">🗄️ Dispensa</button>' +
               '</div>' +
             '</div>';
    }).join('');
  }

  if (!inFridge.length && !allSuggestions.length) {
    html += '<p style="color:var(--text-3);font-size:.9em;padding:8px 0;">Nessun ingrediente compatibile trovato nel piano.</p>';
  }

  var body  = document.getElementById('substituteModalBody');
  var modal = document.getElementById('substituteModal');
  if (body)  body.innerHTML  = html;
  if (modal) modal.classList.add('active');

  /* ── Suggerimenti AI ── */
  var aiSection = document.getElementById('aiSubstituteSection');
  if (aiSection && typeof getAISubstituteSuggestions === 'function') {
    aiSection.innerHTML =
      '<div style="border-top:1px solid var(--border);padding-top:12px;">' +
        '<div style="font-size:.82em;font-weight:700;color:var(--primary);margin-bottom:8px;">🤖 Suggerimenti AI</div>' +
        '<div id="aiSubstResults" class="ai-loading"><span class="ai-spinner"></span> Analisi in corso…</div>' +
      '</div>';

    getAISubstituteSuggestions(name, origCat, function(suggestions, err) {
      var resultsEl = document.getElementById('aiSubstResults');
      if (!resultsEl) return;
      if (err || !suggestions.length) {
        resultsEl.innerHTML = '<span style="color:var(--text-3);font-size:.85em;">' +
          (err || 'Nessun suggerimento AI disponibile') + '</span>';
        return;
      }
      resultsEl.innerHTML = suggestions.map(function(sName) {
        return '<button class="sub-opt-btn sub-opt-ai" ' +
                       'onclick="applySubstitute(\'' + escQ(name) + '\',\'' + escQ(sName) + '\')">' +
                 '🤖 ' + sName +
               '</button>';
      }).join('');
    });
  } else if (aiSection) {
    aiSection.innerHTML = '';
  }
}

/* Aggiunge il suggerimento alla lista della spesa */
function subAddToSpesa(suggName) {
  if (typeof spesaItems !== 'undefined') {
    if (!Array.isArray(spesaItems)) spesaItems = [];
    var exists = spesaItems.find(function(i){ return i.name === suggName; });
    if (!exists) {
      spesaItems.push({ name: suggName, quantity: null, unit: 'g', checked: false });
      if (typeof saveData === 'function') saveData();
    }
    if (typeof showToast === 'function') showToast('🛒 ' + suggName + ' aggiunto alla spesa', 'success');
  }
  closeSubstituteModal();
}

/* Apre una mini-modal per scegliere la quantità e aggiunge il suggerimento in dispensa,
   poi lo applica come sostituto */
function subAddToDispensa(originalName, suggName) {
  closeSubstituteModal();
  /* Usa il modal quantità per dispensa */
  var qty = prompt('Quantità di ' + suggName + ' da aggiungere in dispensa? (numero, es. 200)');
  if (qty === null) return;
  var qtyNum = parseFloat(qty);
  if (isNaN(qtyNum) || qtyNum <= 0) {
    if (typeof showToast === 'function') showToast('⚠️ Quantità non valida', 'warning');
    return;
  }

  /* Trova unità di default */
  var unit = 'g';
  if (typeof defaultIngredients !== 'undefined') {
    var def = defaultIngredients.find(function(d){ return d.name === suggName; });
    if (def && def.unit) unit = def.unit;
  }

  if (typeof addFromSpesa === 'function') {
    addFromSpesa(suggName, qtyNum, unit);
  } else {
    if (!pantryItems) pantryItems = {};
    var pd = pantryItems[suggName] || {};
    pantryItems[suggName] = Object.assign({}, pd, { quantity: (pd.quantity||0) + qtyNum, unit: unit });
    if (typeof saveData === 'function') saveData();
  }

  /* Applica subito come sostituto */
  applySubstitute(originalName, suggName);
  if (typeof showToast === 'function') showToast('🗄️ ' + suggName + ' aggiunto in dispensa e applicato come sostituto', 'success');
}

function applySubstitute(original, replacement) {
  if (!selectedDateKey) return;
  if (!appHistory[selectedDateKey]) appHistory[selectedDateKey] = { usedItems:{}, substitutions:{} };
  var day = appHistory[selectedDateKey];
  if (!day.substitutions) day.substitutions = {};
  if (!day.substitutions[selectedMeal]) day.substitutions[selectedMeal] = {};
  day.substitutions[selectedMeal][original] = replacement;
  saveData();
  var modal = document.getElementById('substituteModal');
  if (modal) modal.classList.remove('active');
  renderMealItems();
}

function closeSubstituteModal() {
  var modal = document.getElementById('substituteModal');
  if (modal) modal.classList.remove('active');
}

/* ── GIORNO ── */
function renderDayIngGrid() {
  var el = document.getElementById('dayIngGrid');
  if (!el) return;
  var items = getMealItems(selectedMeal);
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--text-3);font-size:.9em;">Nessun ingrediente per questo pasto.</p>';
    return;
  }
  el.innerHTML = '<div class="fridge-items">' +
    items.map(function(item){
      var inFridge = typeof pantryItems!=='undefined' && pantryItems && pantryItems[item.name] && (pantryItems[item.name].quantity||0)>0;
      var dot = inFridge ? '✔' : '○';
      var dotColor = inFridge ? 'var(--success)' : 'var(--text-3)';
      return '<div class="fridge-card">' +
        '<div class="fridge-icon">'+getCategoryIcon((pantryItems&&pantryItems[item.name]&&pantryItems[item.name].category)||'🧂 Altro')+'</div>' +
        '<div class="fridge-name">'+item.name+'</div>' +
        (item.quantity ? '<div class="fridge-qty" style="color:var(--primary);">'+item.quantity+' '+(item.unit||'g')+'</div>' : '') +
        '<span style="color:'+dotColor+';font-size:.85em;">'+dot+'</span>' +
      '</div>';
    }).join('') +
  '</div>';
}

/* ── RICETTE SUGGERITE ── */
function renderFridgeRecipes() {
  var el = document.getElementById('fridgeRecipesList');
  if (!el) return;
  if (typeof getAllRicette !== 'function') { el.innerHTML = ''; return; }
  var all = getAllRicette();
  var fridgeKeys = (typeof pantryItems !== 'undefined' && pantryItems)
    ? Object.keys(pantryItems).filter(function(k){ return pantryItems[k] && (pantryItems[k].quantity||0)>0; })
    : [];
  var scored = all.map(function(r){
    var ings = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    var cnt  = ings.filter(function(ing){
      var n = (ing.name||ing.nome||'').toLowerCase().trim();
      return fridgeKeys.some(function(k){ var kl=k.toLowerCase(); return kl===n||kl.includes(n)||n.includes(kl); });
    }).length;
    return { r:r, cnt:cnt, tot:ings.length };
  }).filter(function(x){ return x.cnt > 0; })
    .sort(function(a,b){ return b.cnt - a.cnt; })
    .slice(0, 3);

  if (!scored.length) {
    el.innerHTML = '<p style="color:var(--text-3);font-size:.9em;">Nessuna ricetta compatibile con gli ingredienti disponibili.</p>';
    return;
  }
  el.innerHTML = scored.map(function(x){
    var r   = x.r;
    var nm  = r.name || r.nome || '';
    var pct = x.tot > 0 ? Math.round((x.cnt/x.tot)*100) : 0;
    return '<div class="rc-card" style="margin-bottom:10px;cursor:pointer;" onclick="openRecipeModal(\''+escQ(nm)+'\')">' +
      '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;">' +
        '<span style="flex:1;font-weight:500;">'+nm+'</span>' +
        '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">'+x.cnt+'/'+x.tot+' ing.</span>' +
        '<div class="rc-progress-track" style="width:60px;margin:0;">' +
          '<div class="rc-progress-fill" style="width:'+pct+'%;"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* ── FRIGO SALVATI (tab Piano) ── */
function updateSavedFridges() {
  var el = document.getElementById('savedFridgesContent2');
  if (!el) return;
  var keys = Object.keys(savedFridges||{});
  if (!keys.length) {
    el.innerHTML = '<p style="color:var(--text-3);font-size:.9em;">Nessuna configurazione salvata.</p>';
    return;
  }
  el.innerHTML = keys.map(function(k){
    var f = savedFridges[k];
    var n = Object.keys(f.items||{}).length;
    return '<div class="rc-card" style="display:flex;align-items:center;gap:10px;padding:12px 16px;margin-bottom:8px;">' +
      '<span style="flex:1;font-weight:500;">'+k+'</span>' +
      '<span class="rc-badge">'+n+' ing.</span>' +
      '<button class="rc-btn-icon" onclick="loadFridgeConfig(\''+escQ(k)+'\')">📥</button>' +
      '<button class="rc-btn-icon" onclick="deleteFridgeConfig(\''+escQ(k)+'\')">🗑️</button>' +
    '</div>';
  }).join('');
}

function loadFridgeConfig(name) {
  if (!confirm('Caricare "'+name+'"? Sostituirà il frigo attuale.')) return;
  if (savedFridges[name]) {
    pantryItems = JSON.parse(JSON.stringify(savedFridges[name].items||{}));
    saveData();
    if (typeof renderFridge==='function') renderFridge();
    if (typeof renderPantry==='function') renderPantry();
  }
}

function deleteFridgeConfig(name) {
  if (!confirm('Eliminare la configurazione "'+name+'"?')) return;
  delete savedFridges[name];
  saveData();
  updateSavedFridges();
}

/* ── UTILITY ── */
function escQ(str) { return String(str).replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function capitalizeFirst(str) { return str ? str.charAt(0).toUpperCase()+str.slice(1) : ''; }
function getCategoryIcon(cat) {
  var map = {
    '🥩 Carne':'🥩','🐟 Pesce':'🐟',
    '🥩 Carne e Pesce':'🥩','🥛 Latticini e Uova':'🥛','🌾 Cereali e Legumi':'🌾',
    '🥦 Verdure':'🥦','🍎 Frutta':'🍎','🥑 Grassi e Condimenti':'🥑',
    '🍫 Dolci e Snack':'🍫','🧂 Cucina':'🧂','🧂 Altro':'🧂'
  };
  return (cat && map[cat]) ? map[cat] : '🧂';
}

/* Controlla se un pasto rientra nel filtro */
function _mealContains(pasto, meal) {
  if (!pasto) return false;
  return Array.isArray(pasto) ? pasto.indexOf(meal) !== -1 : pasto === meal;
}

/* Chiavi frigo con quantità > 0 */
function _getFridgeKeys() {
  if (typeof pantryItems === 'undefined' || !pantryItems) return [];
  return Object.keys(pantryItems).filter(function(k){
    return k && k !== 'undefined' && pantryItems[k] && (pantryItems[k].quantity||0) > 0;
  });
}

/* ── RICETTE PER PASTO SELEZIONATO (tab Piano) ── */
function renderPianoRicette() {
  var el = document.getElementById('pianoRicetteWrap');
  if (!el) return;
  if (typeof getAllRicette !== 'function') {
    el.innerHTML = '<p style="color:var(--text-3);font-size:.9em;">Modulo ricette non caricato.</p>';
    return;
  }
  var fridgeKeys = _getFridgeKeys();
  var all = getAllRicette().filter(function(r) {
    if (!_mealContains(r.pasto, selectedMeal)) return false;
    /* mostra solo ricette con almeno 1 ingrediente disponibile */
    var ings = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    if (!ings.length) return true; /* ricetta senza ingredienti listati: mostrala sempre */
    return ings.some(function(ing){
      var n = (ing.name||ing.nome||'').toLowerCase().trim();
      return fridgeKeys.some(function(k){ var kl=k.toLowerCase(); return kl===n||kl.includes(n)||n.includes(kl); });
    });
  });
  if (!all.length) {
    el.innerHTML = '<div style="padding:12px 0;color:var(--text-light);font-size:.88em;">Nessuna ricetta con ingredienti disponibili per questo pasto.<br><span style="font-size:.82em;">Aggiungi ingredienti alla dispensa per vedere i suggerimenti.</span></div>';
    return;
  }
  /* Ordina per disponibilità ingredienti (% decrescente) */
  all.sort(function(a, b) {
    function avail(r) {
      var ings = Array.isArray(r.ingredienti) ? r.ingredienti : [];
      if (!ings.length) return 0;
      var cnt = ings.filter(function(ing){
        var n = (ing.name||ing.nome||'').toLowerCase().trim();
        return fridgeKeys.some(function(k){ var kl=k.toLowerCase(); return kl===n||kl.includes(n)||n.includes(kl); });
      }).length;
      return cnt / ings.length;
    }
    return avail(b) - avail(a);
  });
  el.innerHTML = all.map(function(r) {
    return _buildPianoRicettaCard(r, fridgeKeys);
  }).join('');
}

function _buildPianoRicettaCard(r, fridgeKeys) {
  var rawName = r.name || r.nome || 'Ricetta';
  var safeName = escQ(rawName);
  var icon  = r.icon || r.icona || '🍽';
  var ings  = Array.isArray(r.ingredienti) ? r.ingredienti : [];
  var avail = ings.filter(function(ing){
    var n = (ing.name||ing.nome||'').toLowerCase().trim();
    return fridgeKeys.some(function(k){ var kl=k.toLowerCase(); return kl===n||kl.includes(n)||n.includes(kl); });
  }).length;
  var allAvailable = ings.length > 0 && avail === ings.length;
  var pct = ings.length ? Math.round((avail/ings.length)*100) : 0;
  var stateCls = pct>=80?'badge-ok':pct>=40?'badge-warn':'badge-grey';

  var ingHtml = ings.map(function(ing){
    var n  = ing.name || ing.nome || '';
    var nl = n.toLowerCase().trim();
    var ok = fridgeKeys.some(function(k){ var kl=k.toLowerCase(); return kl===nl||kl.includes(nl)||nl.includes(kl); });
    var qty = ing.quantity
      ? '<span class="rc-acc-qty">'+ing.quantity+'\u00a0'+(ing.unit||'g')+'</span>'
      : '';
    return '<li class="rc-acc-item'+(ok?' ok':'')+'">'+
             '<span class="rc-acc-dot"></span>'+
             '<span class="rc-acc-name">'+n+'</span>'+
             qty+
           '</li>';
  }).join('');

  var chooseBtn = allAvailable
    ? '<button class="rc-detail-btn btn-choose" style="flex:1;" '+
        'onclick="event.stopPropagation();choosePianoRecipe(\''+safeName+'\')">'+
        '✅ Scegli</button>'
    : '<button class="rc-detail-btn" style="flex:1;opacity:.45;cursor:not-allowed;" disabled '+
        'title="Ingredienti mancanti in dispensa">'+
        '🔒 Mancano '+(ings.length-avail)+' ing.</button>';

  return (
    '<div class="rc-card" style="margin-bottom:10px;" onclick="togglePianoRicettaCard(this)">'+
      '<div class="rc-card-head">'+
        '<div class="rc-icon-wrap">'+icon+'</div>'+
        '<div class="rc-info">'+
          '<div class="rc-name">'+rawName+'</div>'+
          '<div class="rc-meta">'+
            '<span class="rc-badge '+stateCls+'">'+avail+'/'+ings.length+' in dispensa</span>'+
          '</div>'+
        '</div>'+
        '<span class="rc-chevron">'+
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">'+
            '<path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'+
          '</svg>'+
        '</span>'+
      '</div>'+
      '<div class="rc-accordion">'+
        '<div class="rc-accordion-inner">'+
          (ings.length ? '<ul class="rc-acc-list">'+ingHtml+'</ul>' : '')+
          '<div style="display:flex;gap:8px;margin-top:8px;">'+
            '<button class="rc-detail-btn" style="flex:1;" '+
              'onclick="event.stopPropagation();openRecipeModal(\''+safeName+'\')">'+
              'Dettagli →</button>'+
            chooseBtn+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'
  );
}

function togglePianoRicettaCard(el) {
  var wasOpen = el.classList.contains('open');
  var wrap = document.getElementById('pianoRicetteWrap');
  if (wrap) wrap.querySelectorAll('.rc-card.open').forEach(function(c){ c.classList.remove('open'); });
  if (!wasOpen) el.classList.add('open');
}

/* Segna ricetta come scelta → riduce dispensa + registra storico + usedItems */
function choosePianoRecipe(name) {
  var r = typeof findRicetta === 'function' ? findRicetta(name) : null;
  if (!r) { if (typeof showToast==='function') showToast('Ricetta non trovata','warning'); return; }
  if (typeof pushUndo === 'function') pushUndo('Scegli ricetta ' + name);
  var ings = Array.isArray(r.ingredienti) ? r.ingredienti : [];
  var reduced = 0;
  ings.forEach(function(ing){
    var n = (ing.name||ing.nome||'').trim();
    if (!n || typeof pantryItems==='undefined' || !pantryItems) return;
    var key = null;
    if (pantryItems[n] && (pantryItems[n].quantity||0) > 0) {
      key = n;
    } else {
      var nl = n.toLowerCase();
      key = Object.keys(pantryItems).find(function(k){
        var kl = k.toLowerCase();
        return (pantryItems[k]&&(pantryItems[k].quantity||0)>0) &&
               (kl===nl||kl.includes(nl)||nl.includes(kl));
      }) || null;
    }
    if (key) {
      var qty = parseFloat(ing.quantity) || 0;
      if (qty > 0) {
        pantryItems[key].quantity = Math.max(0, (pantryItems[key].quantity||0) - qty);
        reduced++;
      }
    }
  });

  /* Registra nello storico (ricette + usedItems per il pasto corrente) */
  if (selectedDateKey) {
    if (typeof appHistory === 'undefined') appHistory = {};
    if (!appHistory[selectedDateKey]) appHistory[selectedDateKey] = { usedItems:{}, substitutions:{}, ricette:{} };
    var day = appHistory[selectedDateKey];
    if (!day.ricette) day.ricette = {};
    if (!day.ricette[selectedMeal]) day.ricette[selectedMeal] = {};
    day.ricette[selectedMeal][name] = true;
    /* Marca anche gli ingredienti del piano come usati (se presenti nel piano) */
    var planItems = typeof getMealItems === 'function' ? getMealItems(selectedMeal) : [];
    if (!day.usedItems) day.usedItems = {};
    if (!day.usedItems[selectedMeal]) day.usedItems[selectedMeal] = {};
    planItems.forEach(function(pi){ day.usedItems[selectedMeal][pi.name] = true; });
  }

  if (typeof saveData==='function') saveData();
  var msg = reduced > 0
    ? '✅ ' + name + ' — dispensa aggiornata (' + reduced + ' ingredienti)'
    : '✅ ' + name + ' scelta';
  if (typeof showToast==='function') showToast(msg, 'success');
  renderMealItems();
  renderPianoRicette();
  if (typeof renderFridge==='function') renderFridge();
  renderMealProgress();
}
