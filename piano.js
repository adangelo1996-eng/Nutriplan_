/* ══════════════════════════════════════════════════════════════════════════════
   NUTRIPLAN — piano.js
   Gestione Piano Pasto (con AI + scadenze + Piano Alimentare + ricerca)
   
   FIX DEFINITIVO: Convertito a script normale (NON module) per compatibilità
   con inline event handlers HTML (oninput, onclick, etc.)
   
   Usa Firebase compat API globale (window.firebase) invece di ES6 imports.
══════════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   0. RIFERIMENTI FIREBASE GLOBALI
   Firebase SDK è caricato globalmente da firebase-config.js
══════════════════════════════════════════════════ */
var db = null;
var auth = null;

// Inizializza riferimenti Firebase quando disponibile
function _initFirebaseRefs() {
  if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
    db = firebase.database();
    auth = firebase.auth();
    return true;
  }
  return false;
}

/* ══════════════════════════════════════════════════
   1. INIT
══════════════════════════════════════════════════ */
var currentDate     = new Date().toISOString().split('T')[0];
var selectedMeal    = 'colazione';
var allRecipesList  = [];    // tutte le ricette del DB
var suggestedRecipes= [];    // suggerimenti extra
var userDiet        = null;  // obj dieta utente
var frigoData       = [];    // dati frigo
var paData          = null;  // dati Piano Alimentare

/* DEBUG — per rimuovere YYYY-MM-DD fixati */
window.dbgWeekRange = function() {
  if (!auth || !auth.currentUser) return;
  var wkRef = db.ref('users/' + auth.currentUser.uid + '/weekRange');
  wkRef.remove().then(function() { console.log('weekRange rimosso'); });
};

/* ══════════════════════════════════════════════════
   1A. GLOBAL FUNCTIONS — Esposte direttamente su window
   per compatibilità con inline event handlers HTML
══════════════════════════════════════════════════ */

// selectMeal: chiamato dai bottoni pasto in HTML
window.selectMeal = function(meal, btnElement) {
  selectedMeal = meal;
  
  // Aggiorna UI bottoni
  var buttons = document.querySelectorAll('.meal-btn');
  buttons.forEach(function(b) { b.classList.remove('active'); });
  if (btnElement) btnElement.classList.add('active');
  
  // Refresh contenuti
  _checkDayMeals();
  _renderSuggestedRecipes();
};

// filterOggiIngredients: chiamato dalla barra ricerca in HTML
window.filterOggiIngredients = function(query) {
  var searchQuery = (query || '').toLowerCase().trim();
  var itemsWrap = document.getElementById('mealItemsWrap');
  if (!itemsWrap) return;
  
  var items = itemsWrap.querySelectorAll('.meal-item');
  var visibleCount = 0;
  
  items.forEach(function(item) {
    var nameEl = item.querySelector('.meal-item-name');
    var catEl = item.querySelector('.meal-item-icon');
    var name = (nameEl ? nameEl.textContent : '').toLowerCase();
    var cat = (catEl ? catEl.textContent : '').toLowerCase();
    
    if (!searchQuery || name.includes(searchQuery) || cat.includes(searchQuery)) {
      item.style.display = '';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Aggiorna contatore
  var counter = document.getElementById('oggiSearchCounter');
  if (counter) {
    if (searchQuery) {
      counter.textContent = visibleCount + ' risultati';
      counter.style.display = 'block';
    } else {
      counter.style.display = 'none';
    }
  }
};

// clearOggiSearch: resetta la ricerca
window.clearOggiSearch = function() {
  var input = document.getElementById('oggiSearch');
  if (input) {
    input.value = '';
    window.filterOggiIngredients('');
  }
};

// resetPiano: chiamato dal bottone reset nell'HTML
window.resetPiano = function() {
  if (!confirm('Vuoi resettare tutti i pasti di oggi?')) return;
  if (!auth || !auth.currentUser) return;
  var dayRef = db.ref('users/' + auth.currentUser.uid + '/pianoPasto/' + currentDate);
  dayRef.remove().then(function() {
    _checkDayMeals();
    _buildMealSelector();
    console.log('[piano] Piano resettato per', currentDate);
  });
};

// shiftCalendar: chiamato dai bottoni < > del calendario
window.shiftCalendar = function(days) {
  var d = new Date(currentDate);
  d.setDate(d.getDate() + days);
  currentDate = d.toISOString().split('T')[0];
  _renderCalendarBar();
  _checkDayMeals();
  _buildDayNotes();
};

function initPiano() {
  // Inizializza Firebase refs
  if (!_initFirebaseRefs()) {
    console.warn('[piano] Firebase non disponibile, ritento tra 500ms...');
    setTimeout(initPiano, 500);
    return;
  }
  
  if (!auth.currentUser) {
    console.log('[piano] Utente non autenticato, skip init.');
    return;
  }
  console.log('[piano] Init Piano Pasto');
  _setupCalendar();
  _loadFrigoData();
  _loadDietPreferences();
  _loadRecipes();
  _buildMealSelector();
  _renderAddItemRow();
  _buildDayNotes();
  _setupAIRecipeGen();
  _setupAIStatsBtn();
  _checkDayMeals();
  _initExpiringSection();
  _initPianoAlimentare();
  _setupAIPianoWizardBtn();
  _initRecipeSearch();
}

// Esporta initPiano per app.js
window.initPiano = initPiano;

/* ══════════════════════════════════════════════════
   2. CALENDARIO TIMELINE
══════════════════════════════════════════════════ */
var pastRange = 3, futureRange = 3;

function _setupCalendar() {
  var barEl = document.getElementById('calendarBar');
  if (!barEl) return;
  _renderCalendarBar();
  barEl.dataset.listen = 'true';
}

function _renderCalendarBar() {
  var bar = document.getElementById('calendarBar');
  if (!bar) return;
  bar.innerHTML = '';

  var selDate  = new Date(currentDate);
  var todayStr = new Date().toISOString().split('T')[0];
  var today    = new Date(todayStr);
  var minDate  = new Date(today); minDate.setDate(minDate.getDate() - pastRange);
  var maxDate  = new Date(today); maxDate.setDate(maxDate.getDate() + futureRange);

  var start = new Date(minDate);
  var end   = new Date(maxDate);
  var days  = [];
  for (var d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
    days.push(new Date(d));
  }

  days.forEach(function(d) {
    var iso = d.toISOString().split('T')[0];
    var isActive= (iso === currentDate);
    var isToday = (iso === todayStr);
    var isPast  = (d < today && !isToday);

    var dayName = d.toLocaleDateString('it-IT',{weekday:'short'});
    var dayNum  = d.getDate();
    var month   = d.toLocaleDateString('it-IT',{month:'short'}).replace('.','');

    var distClass = '';
    if (!isActive && !isToday) {
      var diffDays = Math.abs(Math.floor((d - selDate)/(1000*60*60*24)));
      if      (diffDays===1) distClass='cal-d1';
      else if (diffDays===2) distClass='cal-d2';
      else if (diffDays===3) distClass='cal-d3';
      else                   distClass='cal-dfar';
    }

    var div = document.createElement('div');
    div.className='cal-day';
    if (isActive) div.classList.add('active');
    if (isToday)  div.classList.add('today');
    if (isPast)   div.classList.add('cal-past');
    if (distClass) div.classList.add(distClass);
    div.dataset.date=iso;

    div.innerHTML = [
      '<span class="cal-day-name">' + dayName + '</span>',
      '<span class="cal-day-num">' + dayNum + '</span>',
      '<span class="cal-day-month">' + month + '</span>'
    ].join('');
    
    div.addEventListener('click', function() {
      currentDate = iso; 
      _renderCalendarBar(); 
      _checkDayMeals(); 
      _buildDayNotes();
    });
    bar.appendChild(div);
  });
  
  setTimeout(function() {
    var active = bar.querySelector('.cal-day.active');
    if (active) active.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
  }, 50);
}

/* ══════════════════════════════════════════════════
   3. LOAD DATI (frigo, dieta, ricette, PA)
══════════════════════════════════════════════════ */
function _loadFrigoData() {
  if (!auth || !auth.currentUser) return;
  var fRef = db.ref('users/' + auth.currentUser.uid + '/frigo');
  fRef.on('value', function(snap) {
    frigoData = snap.exists() ? snap.val() : [];
    _renderSuggestedRecipes();
  });
}

function _loadDietPreferences() {
  if (!auth || !auth.currentUser) return;
  var dietRef = db.ref('users/' + auth.currentUser.uid + '/diet');
  dietRef.on('value', function(snap) {
    userDiet = snap.exists() ? snap.val() : null;
    _renderSuggestedRecipes();
  });
}

function _loadRecipes() {
  var rRef = db.ref('recipes');
  rRef.on('value', function(snap) {
    if (snap.exists()) {
      var obj = snap.val();
      allRecipesList = Object.keys(obj).map(function(k) {
        return Object.assign({id: k}, obj[k]);
      });
    } else {
      allRecipesList = [];
    }
    _renderSuggestedRecipes();
  });
}

function _initPianoAlimentare() {
  if (!auth || !auth.currentUser) return;
  var paRef = db.ref('users/' + auth.currentUser.uid + '/pianoAlimentare');
  paRef.on('value', function(snap) {
    paData = snap.exists() ? snap.val() : null;
  });
}

/* ══════════════════════════════════════════════════
   4. SELETTORE PASTO
══════════════════════════════════════════════════ */
function _buildMealSelector() {
  var sel = document.getElementById('mealSelector');
  if (!sel) return;
  if (!auth || !auth.currentUser) return;

  var meals = [
    {key:'colazione', icon:'☕️', label:'Colazione'},
    {key:'pranzo', icon:'🍝', label:'Pranzo'},
    {key:'cena', icon:'🍖', label:'Cena'},
    {key:'spuntini', icon:'🍪', label:'Spuntini'}
  ];

  sel.innerHTML = '';
  var dayRef = db.ref('users/' + auth.currentUser.uid + '/pianoPasto/' + currentDate);
  dayRef.once('value').then(function(snap) {
    var data = snap.exists() ? snap.val() : {};
    meals.forEach(function(m) {
      var items = (data[m.key] && data[m.key].items) ? data[m.key].items : [];
      var cons = (data[m.key] && data[m.key].consumed) ? data[m.key].consumed : [];
      var totCount = items.length;
      var consumedCount = cons.length;

      var btn = document.createElement('button');
      btn.className = 'meal-btn';
      if (m.key === selectedMeal) btn.classList.add('active');
      btn.innerHTML = [
        '<div class="meal-btn-icon">' + m.icon + '</div>',
        '<div class="meal-btn-label">' + m.label + '</div>',
        '<div class="meal-btn-count">' + consumedCount + '/' + totCount + '</div>'
      ].join('');
      
      btn.addEventListener('click', function() {
        selectedMeal = m.key; 
        _buildMealSelector(); 
        _checkDayMeals();
        _renderSuggestedRecipes();
      });
      sel.appendChild(btn);
    });
  });
}

/* ══════════════════════════════════════════════════
   5. RENDER INGREDIENTI PASTO
══════════════════════════════════════════════════ */
function _checkDayMeals() {
  if (!auth || !auth.currentUser) return;
  var dayRef = db.ref('users/' + auth.currentUser.uid + '/pianoPasto/' + currentDate);
  dayRef.once('value').then(function(snap) {
    var data = snap.exists() ? snap.val() : {};
    _renderMealItems(data);
  });
}

function _renderMealItems(data) {
  var list = document.getElementById('mealItemsWrap');
  if (!list) return;
  list.innerHTML = '';

  var items = (data[selectedMeal] && data[selectedMeal].items) ? data[selectedMeal].items : [];
  var cons = (data[selectedMeal] && data[selectedMeal].consumed) ? data[selectedMeal].consumed : [];

  if (!items.length) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-3);padding:24px;">Nessun ingrediente aggiunto</p>';
    return;
  }

  items.forEach(function(it, idx) {
    var ic = it.categoria || '🍫';
    var isUsed = cons.includes(idx);
    var div = document.createElement('div');
    div.className = 'meal-item';
    if (isUsed) div.classList.add('used');

    var stat = '';
    if (!isUsed) {
      var avail = _checkAvailability(it.name, it.quantity || 0, it.unit || '');
      if (avail) stat = '<span class="meal-item-status avail">✓ In frigo</span>';
      else       stat = '<span class="meal-item-status missing">✗ Mancante</span>';
    }

    div.innerHTML = [
      '<div class="meal-item-icon">' + ic + '</div>',
      '<div class="meal-item-info">',
        '<div class="meal-item-name">' + it.name + '</div>',
        '<div class="meal-item-qty">' + (it.quantity||0) + ' ' + (it.unit||'') + '</div>',
        stat,
      '</div>',
      '<div class="meal-item-actions">',
        '<button class="meal-item-btn btn-use-item" onclick="window.pianoModule.consumeItem(' + idx + ')" ',
          (isUsed ? 'disabled' : '') + ' title="Consuma">✓</button>',
        '<button class="meal-item-btn btn-del-item" onclick="window.pianoModule.delItem(' + idx + ')" ',
          'title="Rimuovi">✕</button>',
      '</div>'
    ].join('');
    list.appendChild(div);
  });
}

function _checkAvailability(ingName, qNeeded, unit) {
  var norm = function(s) { return (s || '').toLowerCase().trim(); };
  var ingN = norm(ingName);
  var uN = norm(unit);
  
  return frigoData.some(function(f) {
    if (norm(f.name) !== ingN) return false;
    if (uN && norm(f.unit) !== uN) return false;
    return (f.quantity || 0) >= qNeeded;
  });
}

window.pianoModule = window.pianoModule || {};
window.pianoModule.consumeItem = consumeItem;
window.pianoModule.delItem = delItem;
window.pianoModule.addManualItem = addManualItem;
window.pianoModule.addRecipe = addRecipe;

function consumeItem(idx) {
  if (!auth || !auth.currentUser) return;
  var cRef = db.ref('users/' + auth.currentUser.uid + '/pianoPasto/' + currentDate + '/' + selectedMeal + '/consumed');
  cRef.once('value').then(function(snap) {
    var arr = snap.exists() ? snap.val() : [];
    if (!arr.includes(idx)) arr.push(idx);
    cRef.set(arr).then(function() {
      _checkDayMeals();
      _buildMealSelector();
      console.log('[piano] Item consumato:', idx);
    });
  });
}

function delItem(idx) {
  if (!confirm('Rimuovere questo ingrediente dal pasto?')) return;
  if (!auth || !auth.currentUser) return;
  var iRef = db.ref('users/' + auth.currentUser.uid + '/pianoPasto/' + currentDate + '/' + selectedMeal + '/items');
  iRef.once('value').then(function(snap) {
    if (!snap.exists()) return;
    var arr = snap.val();
    arr.splice(idx, 1);
    iRef.set(arr).then(function() {
      _checkDayMeals();
      _buildMealSelector();
      console.log('[piano] Item rimosso:', idx);
    });
  });
}

/* ══════════════════════════════════════════════════
   6. ADD ITEM MANUALE
══════════════════════════════════════════════════ */
function _renderAddItemRow() {
  var cont = document.getElementById('addItemRow');
  if (!cont) return;
  cont.innerHTML = [
    '<select id="addItemCat">',
      '<option value="🥩">🥩 Proteine</option>',
      '<option value="🍚">🍚 Carboidrati</option>',
      '<option value="🥑">🥑 Grassi</option>',
      '<option value="🥦">🥦 Verdure</option>',
      '<option value="🍎">🍎 Frutta</option>',
      '<option value="🧀">🧀 Latticini</option>',
      '<option value="🥚">🥚 Uova</option>',
      '<option value="🥤">🥤 Liquidi</option>',
      '<option value="🍫">🍫 Altro</option>',
    '</select>',
    '<input type="text" id="addItemName" placeholder="Nome ingrediente" />',
    '<input type="number" id="addItemQty" placeholder="Quantità" value="1" style="max-width:80px;" />',
    '<input type="text" id="addItemUnit" placeholder="Unità (g,ml…)" style="max-width:80px;" />',
    '<button class="btn btn-s btn-primary" onclick="window.pianoModule.addManualItem()">+ Aggiungi</button>'
  ].join('');
}

function addManualItem() {
  var catEl = document.getElementById('addItemCat');
  var nameEl = document.getElementById('addItemName');
  var qtyEl = document.getElementById('addItemQty');
  var unitEl = document.getElementById('addItemUnit');
  
  var cat = catEl ? catEl.value : '🍫';
  var name = nameEl ? nameEl.value.trim() : '';
  var qty = qtyEl ? parseFloat(qtyEl.value) || 1 : 1;
  var unit = unitEl ? unitEl.value.trim() : '';
  
  if (!name) {
    alert('Inserisci almeno il nome!');
    return;
  }

  if (!auth || !auth.currentUser) return;
  var iRef = db.ref('users/' + auth.currentUser.uid + '/pianoPasto/' + currentDate + '/' + selectedMeal + '/items');
  iRef.once('value').then(function(snap) {
    var arr = snap.exists() ? snap.val() : [];
    arr.push({name: name, quantity: qty, unit: unit, categoria: cat});
    iRef.set(arr).then(function() {
      _checkDayMeals();
      _buildMealSelector();
      if (nameEl) nameEl.value = '';
      if (qtyEl) qtyEl.value = '1';
      if (unitEl) unitEl.value = '';
      console.log('[piano] Item manuale aggiunto:', name);
    });
  });
}

/* ══════════════════════════════════════════════════
   7. NOTE GIORNO
══════════════════════════════════════════════════ */
function _buildDayNotes() {
  var noteEl = document.getElementById('dayNotesText');
  if (!noteEl) return;
  if (!auth || !auth.currentUser) return;
  var nRef = db.ref('users/' + auth.currentUser.uid + '/pianoPasto/' + currentDate + '/notes');
  nRef.once('value').then(function(snap) {
    noteEl.value = snap.exists() ? snap.val() : '';
  });
  noteEl.removeEventListener('blur', _saveNotes);
  noteEl.addEventListener('blur', _saveNotes);
}

function _saveNotes() {
  var noteEl = document.getElementById('dayNotesText');
  if (!noteEl) return;
  if (!auth || !auth.currentUser) return;
  var nRef = db.ref('users/' + auth.currentUser.uid + '/pianoPasto/' + currentDate + '/notes');
  nRef.set(noteEl.value.trim()).then(function() {
    console.log('[piano] Note salvate.');
  });
}

/* ══════════════════════════════════════════════════
   8. RICETTE SUGGERITE
══════════════════════════════════════════════════ */
var searchQuery = '';

function _initRecipeSearch() {
  var cont = document.getElementById('pianoRicetteWrap');
  if (!cont) return;
  
  var searchBar = cont.querySelector('#recipeSearchBar');
  if (!searchBar) {
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom:12px;';
    wrapper.innerHTML = '<input type="text" id="recipeSearchBar" class="form-control" ' +
      'placeholder="🔍 Cerca ricette per nome o ingrediente..." ' +
      'style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--r-lg);font-size:.88rem;">';
    cont.insertBefore(wrapper, cont.firstChild);
    searchBar = document.getElementById('recipeSearchBar');
  }
  
  if (searchBar) {
    searchBar.addEventListener('input', function(e) {
      searchQuery = e.target.value.toLowerCase().trim();
      _renderSuggestedRecipes();
    });
  }
}

function _renderSuggestedRecipes() {
  var cont = document.getElementById('pianoRicetteWrap');
  if (!cont) return;
  
  var grid = cont.querySelector('.rc-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'rc-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:12px;';
    cont.appendChild(grid);
  }
  grid.innerHTML = '';

  var filteredList = allRecipesList.slice();

  // 1) FILTRO DIETA
  if (userDiet && userDiet.enabled) {
    var ex = userDiet.excluded || [];
    var all = userDiet.allergens || [];
    filteredList = filteredList.filter(function(r) {
      var tags = (r.tags || '').toLowerCase();
      if (ex.some(function(e) { return tags.includes(e.toLowerCase()); })) return false;
      var ings = (r.ingredients || []).map(function(i) { return (i.name || '').toLowerCase(); });
      if (all.some(function(a) { return ings.some(function(ing) { return ing.includes(a.toLowerCase()); }); })) return false;
      return true;
    });
  }

  // 2) FILTRO PASTO
  filteredList = filteredList.filter(function(r) {
    var pm = (r.pasto || '').toLowerCase();
    if (selectedMeal === 'spuntini') return pm.includes('spuntin');
    return pm.includes(selectedMeal);
  });

  // 3) FILTRO RICERCA
  if (searchQuery) {
    filteredList = filteredList.filter(function(r) {
      var name = (r.name || '').toLowerCase();
      if (name.includes(searchQuery)) return true;
      var ings = (r.ingredients || []).map(function(i) { return (i.name || '').toLowerCase(); });
      return ings.some(function(ing) { return ing.includes(searchQuery); });
    });
  }

  // 4) ORDINA PER DISPONIBILITÀ
  var scored = filteredList.map(function(r) {
    var ings = r.ingredients || [];
    var available = 0, missing = 0;
    ings.forEach(function(ing) {
      var avail = _checkAvailability(ing.name, ing.quantity || 0, ing.unit || '');
      if (avail) available++;
      else missing++;
    });
    var total = ings.length || 1;
    var pct = (available / total) * 100;
    return {recipe: r, available: available, missing: missing, total: total, pct: pct};
  });
  scored.sort(function(a, b) { return b.pct - a.pct; });

  if (scored.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-3);">' +
      '<div style="font-size:2.5rem;margin-bottom:8px;">🍽️</div>' +
      '<div style="font-weight:600;margin-bottom:4px;">Nessuna ricetta</div>' +
      '<div style="font-size:.88rem;">' + (searchQuery ? 'Nessun risultato per questa ricerca.' : 'Nessuna ricetta trovata per questo pasto.') + '</div>' +
      '</div>';
    return;
  }

  scored.forEach(function(s) {
    var r = s.recipe;
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-2);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:14px;cursor:pointer;transition:all .2s;';
    card.onmouseenter = function() { card.style.borderColor = 'var(--primary)'; };
    card.onmouseleave = function() { card.style.borderColor = 'var(--border)'; };

    var badgeClass = 'badge-grey', badgeText = s.available + '/' + s.total;
    if (s.pct === 100) {
      badgeClass = 'badge-ok';
      badgeText = '✓ Tutto disponibile';
    } else if (s.pct >= 50) {
      badgeClass = 'badge-warn';
      badgeText = s.available + '/' + s.total + ' disponibile';
    }

    var badgeStyle = s.pct === 100 ? 'background:#dcfce7;color:#16a34a;' :
                     s.pct >= 50 ? 'background:#fef3c7;color:#ca8a04;' :
                     'background:var(--bg-3);color:var(--text-3);';

    card.innerHTML = [
      '<div style="font-weight:700;margin-bottom:6px;">' + (r.name || 'Senza nome') + '</div>',
      '<div style="font-size:.82rem;color:var(--text-3);margin-bottom:8px;">' + (r.pasto || 'Vario') + '</div>',
      '<span style="display:inline-block;padding:2px 8px;border-radius:var(--r-sm);font-size:.75rem;font-weight:600;' + badgeStyle + '">',
        badgeText,
      '</span>',
      '<button class="btn btn-primary btn-small" style="width:100%;margin-top:10px;" ',
        'onclick="window.pianoModule.addRecipe(\'' + r.id + '\');event.stopPropagation();">',
        '+ Aggiungi al Pasto',
      '</button>'
    ].join('');
    grid.appendChild(card);
  });
}

function addRecipe(recipeId) {
  var r = allRecipesList.find(function(x) { return x.id === recipeId; });
  if (!r) {
    alert('Ricetta non trovata.');
    return;
  }
  var ings = r.ingredients || [];
  if (!ings.length) {
    alert('Ricetta senza ingredienti.');
    return;
  }

  if (!auth || !auth.currentUser) return;
  var iRef = db.ref('users/' + auth.currentUser.uid + '/pianoPasto/' + currentDate + '/' + selectedMeal + '/items');
  iRef.once('value').then(function(snap) {
    var arr = snap.exists() ? snap.val() : [];
    ings.forEach(function(ing) {
      arr.push({
        name: ing.name,
        quantity: ing.quantity || 0,
        unit: ing.unit || '',
        categoria: ing.categoria || '🍫'
      });
    });
    iRef.set(arr).then(function() {
      _checkDayMeals();
      _buildMealSelector();
      _renderSuggestedRecipes();
      console.log('[piano] Ricetta aggiunta:', r.name);
      alert('Ricetta "' + r.name + '" aggiunta al pasto!');
    });
  });
}

/* ══════════════════════════════════════════════════
   9. AI RICETTE (stub)
══════════════════════════════════════════════════ */
function _setupAIRecipeGen() { /* gestito da gemini.js */ }
function _setupAIStatsBtn() { /* gestito da gemini.js */ }
function _initExpiringSection() { /* opzionale */ }
function _setupAIPianoWizardBtn() { /* opzionale */ }

console.log('[piano] piano.js caricato - script normale (non module)');
