/* ============================================================
   PIANO.JS
   ============================================================ */

var selectedMeal = 'colazione';

/* ============================================================
   INIT
   ============================================================ */
function initMealSelector() {
  var meals = [
    { key: 'colazione', label: '☀️ Colazione' },
    { key: 'spuntino',  label: '🍎 Spuntino'  },
    { key: 'pranzo',    label: '🍽 Pranzo'     },
    { key: 'merenda',   label: '🥪 Merenda'    },
    { key: 'cena',      label: '🌙 Cena'       }
  ];
  var wrap = document.getElementById('mealSelector');
  if (!wrap) return;
  wrap.innerHTML = meals.map(function (m) {
    var active = m.key === selectedMeal ? ' active' : '';
    return '<button class="meal-btn' + active + '" onclick="selectMeal(\'' + m.key + '\',this)">' + m.label + '</button>';
  }).join('');
}

function selectMeal(meal, btn) {
  selectedMeal = meal;
  document.querySelectorAll('.meal-btn').forEach(function (b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderMealItems();
  renderMealProgress();
}

/* ============================================================
   RENDER PIANO COMPLETO
   ============================================================ */
function renderMealPlan() {
  ensureDefaultPlan();
  initMealSelector();
  renderMealProgress();
  renderMealItems();
}

/* Carica il piano default se vuoto */
function ensureDefaultPlan() {
  if (typeof defaultMealPlan === 'undefined') return;
  var isEmpty = !mealPlan || !Object.keys(mealPlan).some(function (mk) {
    var m = mealPlan[mk] || {};
    return ['principale','contorno','frutta','extra'].some(function (cat) {
      return Array.isArray(m[cat]) && m[cat].length > 0;
    });
  });
  if (isEmpty) {
    mealPlan = JSON.parse(JSON.stringify(defaultMealPlan));
  }
}

/* ============================================================
   PROGRESS BAR
   ============================================================ */
function renderMealProgress() {
  var wrap = document.getElementById('mealProgressWrap');
  if (!wrap) return;
  var dayData   = getDayData(selectedDateKey);
  var usedItems = (dayData && dayData.usedItems) ? dayData.usedItems : {};
  var total = 0, used = 0;
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
    var items = getMealItems(mk);
    total += items.length;
    var mUsed = usedItems[mk] || {};
    items.forEach(function (i) { if (mUsed[i.name]) used++; });
  });
  if (!total) { wrap.innerHTML = ''; return; }
  var pct = Math.round((used / total) * 100);
  wrap.innerHTML =
    '<div class="meal-progress-wrap">' +
      '<div class="meal-progress-top">' +
        '<span class="meal-progress-title">📋 Progresso giornaliero</span>' +
        '<span class="meal-progress-count">' + used + ' / ' + total + ' (' + pct + '%)</span>' +
      '</div>' +
      '<div class="meal-progress-bar">' +
        '<div class="meal-progress-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
    '</div>';
}

/* ============================================================
   GET ITEMS DEL PASTO
   ============================================================ */
function getMealItems(mealKey) {
  if (!mealPlan || !mealPlan[mealKey]) return [];
  var m = mealPlan[mealKey];
  var items = [];
  ['principale','contorno','frutta','extra'].forEach(function (cat) {
    if (!Array.isArray(m[cat])) return;
    m[cat].forEach(function (item) {
      if (!item || typeof item !== 'object' || !item.name ||
          typeof item.name !== 'string' || !item.name.trim()) return;
      items.push(Object.assign({}, item, { _cat: cat }));
    });
  });
  return items;
}

/* ============================================================
   RENDER ITEMS PASTO
   ============================================================ */
function renderMealItems() {
  var list = document.getElementById('mealItemsList');
  if (!list) return;
  var items   = getMealItems(selectedMeal);
  var dayData = getDayData(selectedDateKey);
  var usedItems = (dayData && dayData.usedItems) ? dayData.usedItems : {};
  var mealUsed  = usedItems[selectedMeal] || {};
  var subs      = (dayData && dayData.substitutions) ? dayData.substitutions : {};
  var mealSubs  = subs[selectedMeal] || {};

  if (!items.length) {
    list.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">🥗</div>' +
        '<h3>Nessun alimento</h3>' +
        '<p>Per questo pasto non è stato impostato alcun alimento nel piano.</p>' +
        '<button class="btn btn-secondary btn-small" onclick="showPage(\'profilo\')" style="margin-top:10px">✏️ Imposta piano</button>' +
      '</div>';
    return;
  }

  var html = '<div class="meal-items-list">';
  items.forEach(function (item) {
    var isUsed  = !!mealUsed[item.name];
    var subName = mealSubs[item.name] || null;
    var avail   = checkIngredientAvailability(item);
    var displayName = subName || item.name;
    var safeId  = 'sub_' + item.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

    var statusClass, statusIcon;
    if (isUsed) {
      statusClass = 'used'; statusIcon = '✅';
    } else if (avail.sufficient) {
      statusClass = 'available'; statusIcon = '🟢';
    } else if (avail.matched) {
      statusClass = 'partial'; statusIcon = '🟡';
    } else {
      statusClass = 'missing'; statusIcon = '🔴';
    }

    var qtyLine = (item.quantity && item.unit)
      ? '<span class="meal-item-qty">' + item.quantity + ' ' + item.unit + '</span>'
      : '';

    var availLine = '';
    if (!isUsed) {
      if (avail.sufficient) {
        availLine = '<span class="meal-item-avail">✔ Disponibile: ' + Math.round(avail.available) + ' ' + avail.availableUnit + '</span>';
      } else if (avail.matched) {
        availLine = '<span class="meal-item-miss">⚠ Solo ' + Math.round(avail.available) + ' ' + avail.availableUnit + '</span>';
      } else {
        availLine = '<span class="meal-item-miss">✖ Non in dispensa</span>';
      }
    }

    var nameLine = subName
      ? '<span class="meal-item-name"><s style="color:var(--text-light)">' + item.name + '</s> → <b>' + subName + '</b></span>'
      : '<span class="meal-item-name">' + item.name + '</span>';

    var actions = isUsed
      ? '<button class="meal-item-btn unuse-btn" onclick="unuseItem(\'' + escQ(selectedMeal) + '\',\'' + escQ(item.name) + '\')" title="Annulla">↩</button>'
      : '<button class="meal-item-btn use-btn" onclick="useItem(\'' + escQ(selectedMeal) + '\',\'' + escQ(item.name) + '\')" title="Consumato">✔</button>' +
        '<button class="meal-item-btn sub-btn" onclick="toggleSubDrawer(\'' + escQ(item.name) + '\')" title="Sostituisci">🔄</button>';

    html +=
      '<div class="meal-item ' + statusClass + '" id="mi_' + safeId + '">' +
        '<span class="meal-item-status">' + statusIcon + '</span>' +
        '<div class="meal-item-info">' +
          nameLine + qtyLine + availLine +
        '</div>' +
        '<div class="meal-item-actions">' + actions + '</div>' +
      '</div>' +
      '<div class="sub-drawer" id="' + safeId + '">' +
        '<div class="sub-drawer-inner">' +
          '<div class="sub-drawer-title">Sostituisci con:</div>' +
          buildSubOptions(item.name, selectedMeal, subName) +
        '</div>' +
      '</div>';
  });
  html += '</div>';
  list.innerHTML = html;
}

/* ============================================================
   SOSTITUTI
   ============================================================ */
function getSubstitutes(itemName, mealKey) {
  if (!itemName || typeof itemName !== 'string') return [];
  var nl     = itemName.toLowerCase().trim();
  var result = [];
  var seen   = {};
  seen[nl]   = true;

  /* 1. Ingredienti in dispensa con quantità > 0 */
  Object.keys(pantryItems).forEach(function (pName) {
    if (!pName || pName === 'undefined' || pName === 'null' || !pName.trim()) return;
    var pl = pName.toLowerCase().trim();
    if (seen[pl]) return;
    var pd = pantryItems[pName];
    if (!pd || typeof pd !== 'object') return;
    if ((pd.quantity || 0) > 0) {
      seen[pl] = true;
      result.push({ name: pName, quantity: pd.quantity, unit: pd.unit || 'g' });
    }
  });

  /* 2. Ingredienti dagli altri pasti */
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
    if (mk === mealKey) return;
    getMealItems(mk).forEach(function (it) {
      var il = it.name.toLowerCase().trim();
      if (seen[il]) return;
      seen[il] = true;
      result.push({ name: it.name, quantity: it.quantity, unit: it.unit || 'g' });
    });
  });

  /* 3. Ingredienti default */
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function (it) {
      if (!it || !it.name) return;
      var il = it.name.toLowerCase().trim();
      if (seen[il]) return;
      seen[il] = true;
      result.push({ name: it.name, quantity: 0, unit: it.unit || 'g' });
    });
  }

  return result.slice(0, 12);
}

function buildSubOptions(itemName, mealKey, currentSub) {
  var subs = getSubstitutes(itemName, mealKey);
  if (!subs.length) return '<span style="color:var(--text-light);font-size:.82em">Nessun sostituto disponibile.</span>';
  var html = '';
  subs.forEach(function (s) {
    var isSel = currentSub === s.name;
    var avail = checkIngredientAvailability({ name: s.name, quantity: s.quantity, unit: s.unit });
    var qtyTxt = s.quantity ? ' <span>' + s.quantity + ' ' + s.unit + '</span>' : '';
    var cls = 'sub-option' + (isSel ? ' selected' : '');
    html += '<button class="' + cls + '" onclick="applySub(\'' + escQ(itemName) + '\',\'' + escQ(s.name) + '\',\'' + escQ(mealKey) + '\')">' + s.name + qtyTxt + '</button>';
  });
  if (currentSub) html += '<button class="sub-clear" onclick="clearSub(\'' + escQ(itemName) + '\',\'' + escQ(mealKey) + '\')">✕ Rimuovi sostituzione</button>';
  return html;
}

/* ============================================================
   AZIONI PIANO
   ============================================================ */
function useItem(mealKey, itemName) {
  var dayData = getDayData(selectedDateKey);
  if (!dayData.usedItems)           dayData.usedItems = {};
  if (!dayData.usedItems[mealKey])  dayData.usedItems[mealKey] = {};
  dayData.usedItems[mealKey][itemName] = true;

  /* Scala dalla dispensa */
  var item = getMealItems(mealKey).find(function (i) { return i.name === itemName; });
  if (item && item.quantity && item.unit) {
    Object.keys(pantryItems).forEach(function (pName) {
      if (!pName || pName === 'undefined') return;
      var pnl = pName.toLowerCase(), nl = itemName.toLowerCase();
      if (pnl === nl || pnl.includes(nl) || nl.includes(pnl)) {
        var pd   = pantryItems[pName];
        var conv = convertUnit(item.quantity, item.unit, pd.unit);
        var qty  = conv !== null ? conv : item.quantity;
        pd.quantity = Math.max(0, Math.round(((pd.quantity || 0) - qty) * 100) / 100);
      }
    });
  }

  updateWeeklyLimitsForItem(itemName);
  saveData();
  renderMealItems();
  renderMealProgress();
}

function unuseItem(mealKey, itemName) {
  var dayData = getDayData(selectedDateKey);
  if (dayData.usedItems && dayData.usedItems[mealKey]) {
    delete dayData.usedItems[mealKey][itemName];
  }
  saveData();
  renderMealItems();
  renderMealProgress();
}

function applySub(itemName, subName, mealKey) {
  var dayData = getDayData(selectedDateKey);
  if (!dayData.substitutions)          dayData.substitutions = {};
  if (!dayData.substitutions[mealKey]) dayData.substitutions[mealKey] = {};
  dayData.substitutions[mealKey][itemName] = subName;
  saveData();
  renderMealItems();
}

function clearSub(itemName, mealKey) {
  var dayData = getDayData(selectedDateKey);
  if (dayData.substitutions && dayData.substitutions[mealKey]) {
    delete dayData.substitutions[mealKey][itemName];
  }
  saveData();
  renderMealItems();
}

function toggleSubDrawer(itemName) {
  var safeId = 'sub_' + itemName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  var el = document.getElementById(safeId);
  if (!el) return;
  document.querySelectorAll('.sub-drawer.open').forEach(function (d) {
    if (d !== el) d.classList.remove('open');
  });
  el.classList.toggle('open');
}

/* ============================================================
   LIMITI SETTIMANALI
   ============================================================ */
function updateWeeklyLimitsForItem(itemName) {
  if (!weeklyLimits || !itemName) return;
  var nl = itemName.toLowerCase();
  Object.keys(weeklyLimits).forEach(function (key) {
    var lim = weeklyLimits[key];
    if (!lim || !Array.isArray(lim.keywords)) return;
    var match = lim.keywords.some(function (kw) { return nl.includes(kw.toLowerCase()); });
    if (match) lim.current = Math.min((lim.current || 0) + 1, lim.max * 2);
  });
}

/* ============================================================
   TAB FRIGO — SUGGERIMENTI
   ============================================================ */
function updateFridgeSuggestions() {
  var wrap = document.getElementById('fridgeSuggestions');
  if (!wrap) return;

  var allRecipes = (typeof defaultRecipes !== 'undefined' ? defaultRecipes : []).concat(customRecipes || []);
  var available  = Object.keys(pantryItems).filter(function (n) {
    return n && n !== 'undefined' && (pantryItems[n].quantity || 0) > 0;
  });

  if (!available.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❄️</div><h3>Frigo vuoto</h3><p>Aggiungi ingredienti alla dispensa o segna acquisti dalla spesa.</p></div>';
    return;
  }

  var scored = allRecipes.map(function (r) {
    var ings  = r.ingredienti || r.ingredients || [];
    var match = ings.filter(function (ing) {
      var n = (ing.name || '').toLowerCase();
      return available.some(function (av) {
        var al = av.toLowerCase();
        return al === n || al.includes(n) || n.includes(al);
      });
    }).length;
    return { r: r, pct: ings.length ? match / ings.length : 0, match: match, total: ings.length };
  }).filter(function (x) { return x.match > 0; })
    .sort(function (a, b) { return b.pct - a.pct; })
    .slice(0, 8);

  if (!scored.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤔</div><h3>Nessun suggerimento</h3><p>Nessuna ricetta compatibile con gli ingredienti disponibili.</p></div>';
    return;
  }

  var html = '<div class="ricette-grid">';
  scored.forEach(function (x) {
    var r    = x.r;
    var icon = r.icon || r.icona || '🍽';
    var name = r.nome || r.name || 'Ricetta';
    var pct  = Math.round(x.pct * 100);
    var cls  = pct >= 80 ? 'rcb-avail' : pct >= 50 ? 'rcb-partial' : 'rcb-missing';
    html +=
      '<div class="ricetta-card" onclick="openRecipeModal(\'' + escQ(name) + '\')">' +
        '<div class="ricetta-card-head">' +
          '<div class="ricetta-card-icon">' + icon + '</div>' +
          '<div class="ricetta-card-info">' +
            '<div class="ricetta-card-name">' + name + '</div>' +
            '<div class="ricetta-card-badges">' +
              '<span class="rcb ' + cls + '">' + x.match + '/' + x.total + ' ingredienti</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  });
  html += '</div>';
  wrap.innerHTML = html;
}

/* ============================================================
   FRIGO SALVATI
   ============================================================ */
function updateSavedFridges() {
  var el = document.getElementById('savedFridgesContent');
  if (!el) return;
  var keys = Object.keys(savedFridges || {});
  if (!keys.length) {
    el.innerHTML = '<p style="color:var(--text-light);font-size:.84em">Nessuna configurazione salvata.</p>';
    return;
  }
  el.innerHTML = keys.map(function (k) {
    var f = savedFridges[k];
    var n = Object.keys(f.items || {}).length;
    return '<div class="saved-fridge-item">' +
      '<div class="saved-fridge-name">📁 ' + k + '</div>' +
      '<div class="saved-fridge-date">🕐 ' + (f.date || '') + ' · ' + n + ' ingredienti</div>' +
      '<div class="saved-fridge-actions">' +
        '<button class="btn btn-secondary btn-small" onclick="loadFridge(\'' + escQ(k) + '\')">📂 Carica</button>' +
        '<button class="btn btn-warning btn-small" onclick="deleteFridge(\'' + escQ(k) + '\')">🗑</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function openSaveFridgeModal() {
  var m = document.getElementById('saveFridgeModal');
  if (m) { m.classList.add('active'); document.getElementById('fridgeName').value = ''; document.getElementById('fridgeName').focus(); }
}
function closeSaveFridgeModal() {
  var m = document.getElementById('saveFridgeModal'); if (m) m.classList.remove('active');
}
function saveFridge() {
  var name = (document.getElementById('fridgeName').value || '').trim();
  if (!name) { alert('Inserisci un nome.'); return; }
  savedFridges[name] = { items: JSON.parse(JSON.stringify(pantryItems)), date: new Date().toLocaleDateString('it-IT') };
  saveData(); closeSaveFridgeModal(); updateSavedFridges();
}
function loadFridge(name) {
  if (!savedFridges[name]) return;
  if (!confirm('Caricare "' + name + '"? Gli ingredienti attuali saranno sovrascritti.')) return;
  pantryItems = JSON.parse(JSON.stringify(savedFridges[name].items || {}));
  saveData(); renderPantry(); renderFridge(); updateFridgeSuggestions();
}
function deleteFridge(name) {
  if (!confirm('Eliminare "' + name + '"?')) return;
  delete savedFridges[name]; saveData(); updateSavedFridges();
}

/* ============================================================
   UTILITY
   ============================================================ */
function escQ(str) { return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function capitalizeFirst(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function initDayIngGrid() { updateFridgeSuggestions(); }
