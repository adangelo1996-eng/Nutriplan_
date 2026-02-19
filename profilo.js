/* ============================================================
   PROFILO.JS — scheda utente + editor piano alimentare
   Regola: ogni nuovo ingrediente DEVE avere una categoria
   ============================================================ */

var profiloEditMode  = false;
var editMealPlanData = null;

/* ============================================================
   RENDER PRINCIPALE
   ============================================================ */
function renderProfilo() {
  var el = document.getElementById('profiloPage');
  if (!el) return;

  el.innerHTML =
    buildProfiloUserSection() +
    buildProfiloLimitiSection() +
    buildProfiloPianoSection();
}

/* ---- SEZIONE UTENTE ---- */
function buildProfiloUserSection() {
  var user = (typeof currentUser !== 'undefined') ? currentUser : null;
  var html = '<div class="profilo-section">';

  if (user) {
    var name  = user.displayName || user.email || 'Utente';
    var email = user.email || '';
    var photo = user.photoURL;
    html +=
      '<div class="profilo-user-card">' +
        (photo
          ? '<img src="' + photo + '" class="profilo-avatar" alt="avatar">'
          : '<div class="profilo-avatar-placeholder">👤</div>') +
        '<div>' +
          '<div class="profilo-user-name">'  + name  + '</div>' +
          '<div class="profilo-user-email">' + email + '</div>' +
          '<div class="profilo-sync-info">☁️ Dati sincronizzati</div>' +
        '</div>' +
      '</div>';
  } else {
    html +=
      '<div class="profilo-noauth-card">' +
        '<div style="font-size:2em;margin-bottom:10px">👤</div>' +
        '<p style="margin-bottom:14px;color:var(--text-mid);font-size:.88em">' +
          'Accedi con Google per sincronizzare i dati su tutti i dispositivi.' +
        '</p>' +
        '<button class="btn btn-primary" onclick="signInWithGoogle()">🔑 Accedi con Google</button>' +
      '</div>';
  }

  html += '</div>';
  return html;
}

/* ---- SEZIONE LIMITI ---- */
function buildProfiloLimitiSection() {
  if (!weeklyLimits || !Object.keys(weeklyLimits).length) return '';
  var html = '<div class="profilo-section"><h3 class="profilo-title">📊 Limiti settimanali</h3>';
  html += '<div class="limits-grid">';
  Object.keys(weeklyLimits).forEach(function (key) {
    var d   = weeklyLimits[key];
    var cur = d.current || 0;
    var pct = Math.min(Math.round((cur / d.max) * 100), 100);
    var cls = pct >= 100 ? 'exceeded' : pct >= 70 ? 'warning' : '';
    html +=
      '<div class="limit-card ' + cls + '">' +
        '<div class="limit-card-icon">'   + (d.icon || '') + '</div>' +
        '<div class="limit-card-name">'   + key + '</div>' +
        '<div class="limit-progress-bar">' +
          '<div class="limit-progress-fill ' + cls + '" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<div class="limit-text ' + cls + '">' + cur + ' / ' + d.max + ' ' + (d.unit || '') + '</div>' +
      '</div>';
  });
  html += '</div></div>';
  return html;
}

/* ---- SEZIONE PIANO ---- */
function buildProfiloPianoSection() {
  var html =
    '<div class="profilo-section">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
        '<h3 class="profilo-title" style="margin:0">🥗 Piano alimentare</h3>' +
        (profiloEditMode
          ? '<div style="display:flex;gap:8px">' +
              '<button class="btn btn-secondary btn-small" onclick="cancelProfiloEdit()">Annulla</button>' +
              '<button class="btn btn-primary btn-small" onclick="saveProfiloPiano()">💾 Salva</button>' +
            '</div>'
          : '<button class="btn btn-secondary btn-small" onclick="startProfiloEdit()">✏️ Modifica</button>') +
      '</div>';

  var plan = profiloEditMode ? editMealPlanData : mealPlan;
  var meals = [
    { key: 'colazione', label: '☀️ Colazione' },
    { key: 'spuntino',  label: '🍎 Spuntino'  },
    { key: 'pranzo',    label: '🥗 Pranzo'    },
    { key: 'merenda',   label: '🌙 Merenda'   },
    { key: 'cena',      label: '🌆 Cena'      }
  ];

  meals.forEach(function (m) {
    if (profiloEditMode) {
      html += buildProfiloMealEdit(m.key, m.label, plan[m.key] || {});
    } else {
      html += buildProfiloMealView(m.key, m.label, plan[m.key] || {});
    }
  });

  html += '</div>';
  return html;
}

/* ============================================================
   MODALITÀ VISTA
   ============================================================ */
function buildProfiloMealView(mealKey, label, meal) {
  var allItems = [];
  ['principale', 'contorno', 'frutta', 'extra'].forEach(function (cat) {
    (meal[cat] || []).forEach(function (item) {
      if (!item || !item.name || typeof item.name !== 'string') return;
      allItems.push(item);
    });
  });

  var html = '<div class="profilo-meal-section">';
  html += '<div class="profilo-meal-header"><span class="profilo-meal-title">' + label + '</span></div>';

  if (!allItems.length) {
    html += '<div class="profilo-empty-meal">Nessun elemento nel piano.</div>';
  } else {
    allItems.forEach(function (item) {
      var avail = checkIngredientAvailability(item);
      var dot   = avail.sufficient ? '🟢' : avail.matched ? '🟡' : '🔴';
      var qtyTxt = (item.quantity && item.unit) ? ' · ' + item.quantity + ' ' + item.unit : '';
      html +=
        '<div class="storico-item">' +
          '<span>' + dot + ' ' + item.name + '</span>' +
          '<span class="storico-item-qty">' + qtyTxt + '</span>' +
        '</div>';
    });
  }

  html += '</div>';
  return html;
}

/* ============================================================
   MODALITÀ MODIFICA
   ============================================================ */
function startProfiloEdit() {
  editMealPlanData = JSON.parse(JSON.stringify(mealPlan));
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
    if (!editMealPlanData[mk]) editMealPlanData[mk] = {};
    ['principale','contorno','frutta','extra'].forEach(function (cat) {
      if (!Array.isArray(editMealPlanData[mk][cat])) editMealPlanData[mk][cat] = [];
    });
  });
  profiloEditMode = true;
  renderProfilo();
}

function cancelProfiloEdit() {
  profiloEditMode  = false;
  editMealPlanData = null;
  renderProfilo();
}

function saveProfiloPiano() {
  /* Rileggi i dati dai form */
  var collected = {};
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function (mk) {
    collected[mk] = { principale: [], contorno: [], frutta: [], extra: [] };
    ['principale','contorno','frutta','extra'].forEach(function (cat) {
      var container = document.getElementById('edit_' + mk + '_' + cat);
      if (!container) return;
      var rows = container.querySelectorAll('.edit-item-row');
      rows.forEach(function (row) {
        var nameEl = row.querySelector('.edit-item-name');
        var qtyEl  = row.querySelector('.edit-item-qty');
        var unitEl = row.querySelector('.edit-item-unit');
        var catEl  = row.querySelector('.edit-item-category');

        var name = nameEl ? nameEl.value.trim() : '';
        if (!name) return;

        var qty  = qtyEl  ? (parseFloat(qtyEl.value) || null)  : null;
        var unit = unitEl ? (unitEl.value || 'g')               : 'g';
        var cat  = catEl  ? catEl.value : '';

        /* Verifica/crea ingrediente se non esiste */
        ensureIngredientExists(name, cat, unit);

        collected[mk][cat].push({ name: name, quantity: qty, unit: unit });
      });
    });
  });

  mealPlan = collected;
  saveData();
  profiloEditMode  = false;
  editMealPlanData = null;
  renderProfilo();
  renderMealPlan();
  if (typeof renderPantry === 'function') renderPantry();
}

/* ---- Garantisce che l'ingrediente esista nel database ---- */
function ensureIngredientExists(name, category, unit) {
  if (!name || typeof name !== 'string' || !name.trim()) return;
  var nm = name.trim();

  /* Cerca nei default */
  var inDefault = (typeof defaultIngredients !== 'undefined') &&
    defaultIngredients.some(function (i) {
      return i && i.name && i.name.toLowerCase() === nm.toLowerCase();
    });
  if (inDefault) return;

  /* Cerca nei custom */
  var inCustom = Array.isArray(customIngredients) &&
    customIngredients.some(function (i) {
      return i && i.name && i.name.toLowerCase() === nm.toLowerCase();
    });
  if (inCustom) return;

  /* Non esiste: lo crea come custom CON categoria obbligatoria */
  var cat  = (category && CATEGORIES.indexOf(category) !== -1) ? category : '🧂 Cucina';
  var u    = unit || 'g';
  var icon = getCategoryIcon(cat);
  if (!Array.isArray(customIngredients)) customIngredients = [];
  customIngredients.push({ name: nm, category: cat, unit: u, icon: icon });
  if (!pantryItems[nm]) {
    pantryItems[nm] = { quantity: 0, unit: u, category: cat, icon: icon, isCustom: true };
  }
}

/* ---- RENDER FORM MODIFICA ---- */
function buildProfiloMealEdit(mealKey, label, meal) {
  var html =
    '<div class="profilo-meal-section">' +
      '<div class="profilo-meal-header">' +
        '<span class="profilo-meal-title">' + label + '</span>' +
      '</div>';

  var catLabels = { principale: '🍽 Principale', contorno: '🥦 Contorno', frutta: '🍎 Frutta', extra: '➕ Extra' };
  ['principale','contorno','frutta','extra'].forEach(function (cat) {
    var items = (meal[cat] || []).filter(function (i) {
      return i && i.name && typeof i.name === 'string';
    });
    html +=
      '<div style="margin-bottom:10px">' +
        '<div style="font-size:.74em;font-weight:800;color:var(--text-light);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">' +
          catLabels[cat] +
        '</div>' +
        '<div id="edit_' + mealKey + '_' + cat + '">';

    items.forEach(function (item) {
      html += buildEditItemRow(item, cat);
    });

    html +=
        '</div>' +
        '<button class="btn btn-secondary btn-small" style="margin-top:6px" ' +
          'onclick="addProfiloItem(\'' + mealKey + '\',\'' + cat + '\')">' +
          '+ Aggiungi' +
        '</button>' +
      '</div>';
  });

  html += '</div>';
  return html;
}

/* ---- SINGOLA RIGA MODIFICA ---- */
function buildEditItemRow(item, cat) {
  var name  = (item && item.name)     ? item.name     : '';
  var qty   = (item && item.quantity) ? item.quantity : '';
  var unit  = (item && item.unit)     ? item.unit     : 'g';

  /* Determina categoria pre-selezionata cercando nell'ingrediente database */
  var existingCat = getIngredientCategory(name);

  /* Lista unità */
  var units = ['g','ml','pz','fette','cucchiai','cucchiaini','porzione','kg','l'];
  var unitOpts = units.map(function (u) {
    return '<option value="' + u + '"' + (unit === u ? ' selected' : '') + '>' + u + '</option>';
  }).join('');

  /* Lista categorie — obbligatoria se ingrediente non noto */
  var catOpts = CATEGORIES.map(function (c) {
    return '<option value="' + c + '"' + (existingCat === c ? ' selected' : '') + '>' + c + '</option>';
  }).join('');

  /* Mostra selector categoria solo se l'ingrediente non è già nel database */
  var catSelector = !existingCat
    ? '<select class="form-input edit-item-category" title="Categoria (obbligatoria)" style="flex:2;min-width:120px;border-color:var(--warning)">' +
        '<option value="">-- Categoria * --</option>' + catOpts +
      '</select>'
    : '<input type="hidden" class="edit-item-category" value="' + existingCat + '">';

  return (
    '<div class="edit-item-row profilo-item-row">' +
      '<input type="text" class="form-input edit-item-name profilo-item-name" value="' + name + '" ' +
        'placeholder="Ingrediente..." list="ingredientiDatalist" ' +
        'onchange="onEditItemNameChange(this)">' +
      '<input type="number" class="form-input edit-item-qty" value="' + qty + '" ' +
        'placeholder="Qtà" min="0" step="any" style="width:60px;flex:none">' +
      '<select class="form-input edit-item-unit" style="width:70px;flex:none">' + unitOpts + '</select>' +
      catSelector +
      '<button class="btn-icon-only" style="background:var(--bg-light);border:1.5px solid var(--border);color:var(--danger);width:32px;height:32px;flex-shrink:0" ' +
        'onclick="removeEditItemRow(this)" title="Rimuovi">✕</button>' +
    '</div>'
  );
}

/* ============================================================
   HELPERS FORM
   ============================================================ */
function addProfiloItem(mealKey, cat) {
  var container = document.getElementById('edit_' + mealKey + '_' + cat);
  if (!container) return;
  var rowHtml = buildEditItemRow({ name: '', quantity: null, unit: 'g' }, cat);
  container.insertAdjacentHTML('beforeend', rowHtml);
}

function removeEditItemRow(btn) {
  var row = btn.closest('.edit-item-row');
  if (row) row.remove();
}

/* Quando si cambia il nome dell'ingrediente:
   - Se esiste nel database → nascondi il selector categoria
   - Se NON esiste → mostra il selector (categoria obbligatoria) */
function onEditItemNameChange(input) {
  var row  = input.closest('.edit-item-row');
  if (!row) return;
  var name = input.value.trim();
  if (!name) return;

  var existingCat = getIngredientCategory(name);
  var catEl = row.querySelector('.edit-item-category');
  if (!catEl) return;

  if (existingCat) {
    /* Ingrediente noto: sostituisce il select con un hidden */
    if (catEl.tagName === 'SELECT') {
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.className = 'edit-item-category';
      hidden.value = existingCat;
      catEl.replaceWith(hidden);
    } else {
      catEl.value = existingCat;
    }
  } else {
    /* Ingrediente sconosciuto: mostra il select con bordo arancione */
    if (catEl.tagName !== 'SELECT') {
      var catOpts = CATEGORIES.map(function (c) {
        return '<option value="' + c + '">' + c + '</option>';
      }).join('');
      var sel = document.createElement('select');
      sel.className = 'form-input edit-item-category';
      sel.title  = 'Categoria (obbligatoria)';
      sel.style.cssText = 'flex:2;min-width:120px;border-color:var(--warning)';
      sel.innerHTML = '<option value="">-- Categoria * --</option>' + catOpts;
      catEl.replaceWith(sel);
    }
  }
}

/* Cerca la categoria di un ingrediente nel database (default + custom) */
function getIngredientCategory(name) {
  if (!name || typeof name !== 'string') return null;
  var nl = name.toLowerCase().trim();
  if (!nl) return null;

  var all = [];
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    all = all.concat(defaultIngredients);
  }
  if (Array.isArray(customIngredients)) {
    all = all.concat(customIngredients);
  }

  var found = all.find(function (i) {
    return i && i.name && i.name.toLowerCase().trim() === nl;
  });
  return found ? found.category : null;
}

/* ============================================================
   getCategoryIcon (se non già definita in dispensa.js)
   ============================================================ */
if (typeof getCategoryIcon === 'undefined') {
  function getCategoryIcon(cat) {
    var map = {
      '🥩 Carne e Pesce':       '🥩',
      '🥛 Latticini e Uova':    '🥛',
      '🌾 Cereali e Legumi':    '🌾',
      '🥦 Verdure':             '🥦',
      '🍎 Frutta':              '🍎',
      '🥑 Grassi e Condimenti': '🥑',
      '🍫 Dolci e Snack':       '🍫',
      '🧂 Cucina':              '🧂'
    };
    return (cat && map[cat]) ? map[cat] : '🧂';
  }
}
