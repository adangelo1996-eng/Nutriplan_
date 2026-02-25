/*
   PIANO.JS — v9  smart reset + deselection
*/

var selectedMeal = 'colazione';

/* STEP 3: Deselection tracking */
var deselectedMeals = {};
try {
  var stored = localStorage.getItem('nutriplan_deselected');
  if (stored) deselectedMeals = JSON.parse(stored);
} catch(e) {
  deselectedMeals = {};
}

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
  _pianoRicetteFilter = 'base';
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
  var el = document.getElementById('mealItemsWrap');
  if (!el) return;
  var items    = getMealItems(selectedMeal);
  var dayData  = getDayData(selectedDateKey);
  var usedMap  = (dayData && dayData.usedItems && dayData.usedItems[selectedMeal]) ? dayData.usedItems[selectedMeal] : {};
  var subsMap  = (dayData && dayData.substitutions && dayData.substitutions[selectedMeal]) ? dayData.substitutions[selectedMeal] : {};
  var mealColor = { colazione:'#f59e0b', spuntino:'#10b981', pranzo:'#3d8b6f', merenda:'#8b5cf6', cena:'#3b82f6' }[selectedMeal] || 'var(--primary)';

  /* STEP 3: Filter out deselected items for rendering */
  var deselectedList = (deselectedMeals && deselectedMeals[selectedMeal]) ? deselectedMeals[selectedMeal] : [];
  var activeItems = items.filter(function(i) {
    return deselectedList.indexOf(i.name) === -1;
  });

  if (!activeItems.length) {
    el.innerHTML =
      '<div class="rc-empty">' +
        '<div style="font-size:2rem;">🍽</div>' +
        '<p>Nessun alimento attivo per questo pasto.</p>' +
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

  el.innerHTML = consumedHtml + aiBtn + activeItems.map(function(item){
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

    /* Pulsanti azione: ✅ solo se in dispensa, altrimenti 🗄️ e 🛒 */
    var actionBtns;
    if (used) {
      actionBtns = '<button class="rc-btn-icon" title="Annulla" onclick="toggleUsedItem(\''+escQ(item.name)+'\')">↩</button>';
    } else if (inFridge) {
      actionBtns = '<button class="rc-btn-icon" title="Segna consumato" onclick="toggleUsedItem(\''+escQ(item.name)+'\')">✅</button>';
    } else {
      actionBtns =
        '<button class="rc-btn-icon" title="Aggiungi in dispensa" style="font-size:.7em;padding:4px 6px;" ' +
                'onclick="openAddFridgePrecompiled(\''+escQ(display)+'\')">🗄️</button>' +
        '<button class="rc-btn-icon" title="Aggiungi alla spesa" style="font-size:.7em;padding:4px 6px;" ' +
                'onclick="pianoAddToSpesa(\''+escQ(display)+'\',\''+escQ(item.quantity||'')+'\',\''+escQ(item.unit||'g')+'\')">🛒</button>';
    }

    return '<div class="rc-card" style="margin-bottom:8px;">' +
      '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;">' +
        dot +
        '<span'+usedCls+' style="flex:1;font-weight:500;font-size:.93em;">'+display+'</span>' +
        alreadyBadge +
        (qty ? '<span class="rc-badge" style="font-size:.72em;">'+qty+'</span>' : '') +
        (subName ? '<span class="rc-badge" style="background:#fff3cd;color:#856404;font-size:.7em;">↔</span>' : '') +
        '<div style="display:flex;gap:4px;">' +
          actionBtns +
          '<button class="rc-btn-icon" title="Sostituisci" onclick="openSubstituteModal(\''+escQ(item.name)+'\')">↔</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* STEP 3: Smart reset - deselect instead of delete */
function resetDay(meal) {
  if (!meal || !pianoAlimentare[meal]) return;
  if (typeof pushUndo === 'function') pushUndo('Reset ' + meal);
  
  /* Initialize deselection array for this meal */
  if (!deselectedMeals[meal]) deselectedMeals[meal] = [];
  
  /* Get all items for this meal */
  var items = getMealItems(meal);
  
  /* Mark each item as deselected (if not already) */
  items.forEach(function(item) {
    if (item && item.name && deselectedMeals[meal].indexOf(item.name) === -1) {
      deselectedMeals[meal].push(item.name);
    }
  });
  
  /* Save deselection state */
  try {
    localStorage.setItem('nutriplan_deselected', JSON.stringify(deselectedMeals));
  } catch(e) {
    console.warn('Could not save deselection state:', e);
  }
  
  saveData();
  renderMealItems();
  renderMealProgress();
  if (typeof showToast === 'function') {
    showToast('🔄 Pasto deselezionato (ripristinabile)', 'info');
  }
}

/* Helper to restore deselected items */
function restoreDeselected(meal) {
  if (!meal || !deselectedMeals[meal]) return;
  delete deselectedMeals[meal];
  try {
    localStorage.setItem('nutriplan_deselected', JSON.stringify(deselectedMeals));
  } catch(e) {}
  renderMealItems();
  if (typeof showToast === 'function') {
    showToast('✅ Pasto ripristinato', 'success');
  }
}

/* Rest of piano.js continues unchanged... */
/* (All other functions remain exactly as they were) */
