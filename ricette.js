/* ============================================================
   RICETTE.JS  v5  —  stabile, sempre visibile, array-safe
   ============================================================ */

/* ── Stato globale ── */
var ricetteSearchQuery = '';
var ricetteFilterPasto = 'all';
var currentRecipeName  = null;

/* ============================================================
   UTILITY — tutte defensive, nessun crash possibile
   ============================================================ */

/** Capitalizza la prima lettera — gestisce null, array, non-string */
function capFirst(val) {
  if (val == null) return '';
  var s = Array.isArray(val) ? val.join(', ') : String(val);
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/** Escape per uso in onclick="..." */
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g,  "\\'")
    .replace(/"/g,  '&quot;');
}

/** Mappa pasto → etichetta leggibile. Accetta stringa o array. */
function pastoLabel(pasto) {
  var map = {
    colazione: '☀️ Colazione',
    spuntino:  '🍎 Spuntino',
    pranzo:    '🍽 Pranzo',
    merenda:   '🥪 Merenda',
    cena:      '🌙 Cena'
  };
  if (!pasto) return '';
  if (Array.isArray(pasto)) {
    return pasto
      .filter(function (p) { return p && typeof p === 'string'; })
      .map(function (p)    { return map[p] || capFirst(p); })
      .join(' · ');
  }
  var p = typeof pasto === 'string' ? pasto : String(pasto);
  return map[p] || capFirst(p);
}

/** Controlla se un valore di pasto contiene una certa chiave */
function pastoContains(pasto, key) {
  if (!pasto) return false;
  if (Array.isArray(pasto)) return pasto.indexOf(key) !== -1;
  return pasto === key;
}

/** Chiavi degli ingredienti presenti nel frigo (qty > 0) */
function getFridgeKeys() {
  if (typeof pantryItems === 'undefined' || !pantryItems) return [];
  return Object.keys(pantryItems).filter(function (k) {
    return k && k !== 'undefined' && k !== 'null' &&
           pantryItems[k] && typeof pantryItems[k] === 'object' &&
           (pantryItems[k].quantity || 0) > 0;
  });
}

/** Conta ingredienti di una ricetta disponibili nel frigo */
function countAvailable(ings) {
  var keys = getFridgeKeys();
  if (!keys.length || !Array.isArray(ings) || !ings.length) return 0;
  return ings.filter(function (ing) {
    var n = String((ing.name || ing.nome || '')).toLowerCase().trim();
    if (!n) return false;
    return keys.some(function (k) {
      var kl = k.toLowerCase().trim();
      return kl === n || kl.includes(n) || n.includes(kl);
    });
  }).length;
}

/** Badge disponibilità (solo informativo, non filtra mai) */
function availBadge(ings) {
  var tot = Array.isArray(ings) ? ings.length : 0;
  if (!tot) return '';
  var avail = countAvailable(ings);
  var pct   = Math.round((avail / tot) * 100);
  if (pct >= 80) return '<span class="rcb rcb-avail">✔ Disponibile</span>';
  if (pct >= 40) return '<span class="rcb rcb-partial">◑ Parziale</span>';
  return            '<span class="rcb rcb-missing">○ Da acquistare</span>';
}

/** Raccoglie tutte le ricette (default + custom) */
function getAllRicette() {
  var result = [];
  if (typeof defaultRecipes !== 'undefined' && Array.isArray(defaultRecipes)) {
    defaultRecipes.forEach(function (r) {
      if (r && (r.name || r.nome)) result.push(r);
    });
  }
  if (typeof customRecipes !== 'undefined' && Array.isArray(customRecipes)) {
    customRecipes.forEach(function (r) {
      if (r && (r.name || r.nome)) {
        result.push(Object.assign({}, r, { isCustom: true }));
      }
    });
  }
  return result;
}

/** Trova ricetta per nome (cerca sia name che nome) */
function findRicetta(name) {
  if (!name) return null;
  return getAllRicette().find(function (r) {
    return (r.name || r.nome || '') === name;
  }) || null;
}

/* ============================================================
   TAB
   ============================================================ */
function showRicetteTab(tab, btn) {
  document.querySelectorAll('#ricettePage .page-tab-content').forEach(function (c) {
    c.classList.remove('active');
  });
  document.querySelectorAll('#ricettePage .page-tab').forEach(function (t) {
    t.classList.remove('active');
  });
  var id = tab === 'catalogo' ? 'ricetteTabCatalogo' : 'ricetteTabMie';
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
  if (tab === 'catalogo') renderRicettePage();
  if (tab === 'mie')      renderCustomRicette();
}

/* ============================================================
   ENTRY POINT
   ============================================================ */
function renderRicettePage() {
  buildFilterRow();
  renderRicetteGrid();
}

/* ============================================================
   FILTRI
   ============================================================ */
function buildFilterRow() {
  var row = document.getElementById('ricetteFilterRow');
  if (!row) return;

  var filters = [
    { key: 'all',       label: '🍽 Tutti'      },
    { key: 'colazione', label: '☀️ Colazione'  },
    { key: 'spuntino',  label: '🍎 Spuntino'   },
    { key: 'pranzo',    label: '🍽 Pranzo'     },
    { key: 'merenda',   label: '🥪 Merenda'    },
    { key: 'cena',      label: '🌙 Cena'       }
  ];

  row.innerHTML = filters.map(function (f) {
    var cls = (f.key === ricetteFilterPasto) ? ' active' : '';
    return '<button class="ricette-filter-btn' + cls + '" ' +
           'onclick="setRicetteFilter(\'' + f.key + '\', this)">' +
           f.label + '</button>';
  }).join('');
}

function setRicetteFilter(key, btn) {
  ricetteFilterPasto = key || 'all';
  document.querySelectorAll('.ricette-filter-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  renderRicetteGrid();
}

function filterRicette(query) {
  ricetteSearchQuery = (query || '').trim().toLowerCase();
  renderRicetteGrid();
}

/* ============================================================
   GRIGLIA  — SEMPRE TUTTE VISIBILI
   ============================================================ */
function renderRicetteGrid() {
  var grid = document.getElementById('ricetteGrid');
  if (!grid) return;

  var all      = getAllRicette();
  var filtered = all.filter(function (r) {

    /* Filtro pasto */
    if (ricetteFilterPasto !== 'all') {
      if (!pastoContains(r.pasto, ricetteFilterPasto)) return false;
    }

    /* Filtro ricerca — nome + ingredienti */
    if (ricetteSearchQuery) {
      var nm   = String(r.name || r.nome || '').toLowerCase();
      var ings = (Array.isArray(r.ingredienti) ? r.ingredienti : [])
        .map(function (i) { return String(i.name || i.nome || '').toLowerCase(); })
        .join(' ');
      return nm.includes(ricetteSearchQuery) || ings.includes(ricetteSearchQuery);
    }

    return true;
  });

  /* Empty state */
  if (!filtered.length) {
    grid.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">🔍</div>' +
        '<h3>Nessuna ricetta trovata</h3>' +
        '<p>Prova altri termini oppure cambia filtro.</p>' +
      '</div>';
    return;
  }

  /* Vista raggruppata solo in modalità "Tutti" senza ricerca */
  if (ricetteFilterPasto === 'all' && !ricetteSearchQuery) {
    grid.innerHTML = buildGroupedGrid(filtered);
  } else {
    grid.innerHTML =
      '<div class="ricette-grid-inner">' +
        filtered.map(buildRicettaCard).join('') +
      '</div>';
  }
}

/* ============================================================
   RAGGRUPPA PER PASTO
   ============================================================ */
function buildGroupedGrid(list) {
  var order  = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
  var labels = {
    colazione: '☀️ Colazione',
    spuntino:  '🍎 Spuntino',
    pranzo:    '🍽 Pranzo',
    merenda:   '🥪 Merenda',
    cena:      '🌙 Cena'
  };

  /* Init gruppi */
  var groups  = {};
  var placed  = {};   /* id → bool, evita duplicati */
  order.forEach(function (p) { groups[p] = []; });
  groups['altro'] = [];

  list.forEach(function (r) {
    var rid  = r.id || (r.name || r.nome || '');
    var pasto = r.pasto;
    var keys = Array.isArray(pasto)
      ? pasto.filter(function (p) { return typeof p === 'string'; })
      : (pasto ? [String(pasto)] : []);

    /* Inserisci nel primo gruppo dell'ordine in cui compare */
    var wasPlaced = false;
    order.forEach(function (o) {
      if (!wasPlaced && keys.indexOf(o) !== -1 && !placed[rid + '_' + o]) {
        groups[o].push(r);
        placed[rid + '_' + o] = true;
        wasPlaced = true;
      }
    });
    if (!wasPlaced) groups['altro'].push(r);
  });

  var html = '';
  order.concat(['altro']).forEach(function (p) {
    var items = groups[p];
    if (!items || !items.length) return;
    var lbl = labels[p] || '🍴 Altro';
    html +=
      '<div class="ricette-group">' +
        '<div class="ricette-group-title">' +
          lbl +
          '<span class="cat-count-badge">' + items.length + '</span>' +
        '</div>' +
        '<div class="ricette-grid-inner">' +
          items.map(buildRicettaCard).join('') +
        '</div>' +
      '</div>';
  });
  return html;
}

/* ============================================================
   CARD RICETTA
   ============================================================ */
function buildRicettaCard(r) {
  if (!r) return '';

  var name     = String(r.name || r.nome || 'Ricetta');
  var icon     = String(r.icon || r.icona || '🍽');
  var isCustom = Boolean(r.isCustom);
  var ings     = Array.isArray(r.ingredienti) ? r.ingredienti : [];
  var pLabel   = pastoLabel(r.pasto);                /* safe: handles array + string */
  var badge    = availBadge(ings);
  var safeName = esc(name);

  /* Anteprima ingredienti */
  var ingPreview = ings.slice(0, 3)
    .map(function (i) { return String(i.name || i.nome || ''); })
    .filter(Boolean).join(', ');
  if (ings.length > 3) ingPreview += ' +' + (ings.length - 3);

  return (
    '<div class="ricetta-card' + (isCustom ? ' ricetta-card-custom' : '') + '" ' +
         'onclick="openRecipeModal(\'' + safeName + '\')">' +
      '<div class="rc-icon">' + icon + '</div>' +
      '<div class="rc-body">' +
        '<div class="rc-name">' + name + '</div>' +
        '<div class="rc-badges">' +
          (pLabel   ? '<span class="rcb rcb-pasto">' + pLabel + '</span>' : '') +
          (isCustom ? '<span class="rcb rcb-custom">⭐ Mia</span>'        : '') +
          badge +
        '</div>' +
        (ingPreview ? '<div class="rc-ings">' + ingPreview + '</div>' : '') +
      '</div>' +
    '</div>'
  );
}

/* ============================================================
   MODAL DETTAGLIO RICETTA
   ============================================================ */
function openRecipeModal(name) {
  if (!name) return;
  currentRecipeName = name;

  var r = findRicetta(name);
  if (!r) {
    console.warn('[ricette] Ricetta non trovata:', name);
    return;
  }

  var modal = document.getElementById('recipeModal');
  var title = document.getElementById('recipeModalTitle');
  var body  = document.getElementById('recipeModalBody');
  if (!modal || !body) return;

  var icon      = String(r.icon || r.icona || '🍽');
  var ings      = Array.isArray(r.ingredienti) ? r.ingredienti : [];
  var prep      = String(r.preparazione || r.preparation || '');
  var pLabel    = pastoLabel(r.pasto);
  var tot       = ings.length;
  var avail     = countAvailable(ings);
  var pct       = tot ? Math.round((avail / tot) * 100) : 0;
  var fridgeKeys = getFridgeKeys();

  /* Colore barra disponibilità */
  var barColor = pct >= 80
    ? 'var(--primary)'
    : pct >= 40
      ? 'var(--warning, #f0a500)'
      : 'var(--danger, #e05252)';

  var html = '';

  /* ── Header ── */
  html +=
    '<div class="rm-header-inner">' +
      '<div class="rm-icon">' + icon + '</div>' +
      '<div>' +
        '<div class="rm-title-text">' + name + '</div>' +
        (pLabel
          ? '<div class="rm-pasto-badge">' + pLabel + '</div>'
          : '') +
      '</div>' +
    '</div>';

  /* ── Barra disponibilità ── */
  if (tot) {
    html +=
      '<div class="rm-avail-row">' +
        '<div class="rm-avail-bar-wrap">' +
          '<div class="rm-avail-bar" style="width:' + pct + '%;background:' + barColor + '"></div>' +
        '</div>' +
        '<span class="rm-avail-label" style="color:' + barColor + '">' +
          avail + '/' + tot + ' nel frigo' +
        '</span>' +
      '</div>';
  }

  /* ── Ingredienti ── */
  if (ings.length) {
    html += '<div class="rm-section-title">📋 Ingredienti</div><ul class="rm-ing-list">';
    ings.forEach(function (ing) {
      var ingName  = String(ing.name || ing.nome || '');
      var ingNameL = ingName.toLowerCase().trim();
      var inFridge = fridgeKeys.some(function (k) {
        var kl = k.toLowerCase().trim();
        return kl === ingNameL || kl.includes(ingNameL) || ingNameL.includes(kl);
      });
      var qty = (ing.quantity || ing.quantita)
        ? '<span class="rm-qty">' +
            (ing.quantity || ing.quantita) + '\u00a0' + (ing.unit || ing.unita || '') +
          '</span>'
        : '';
      html +=
        '<li class="rm-ing-item ' + (inFridge ? 'rm-ing-ok' : 'rm-ing-ko') + '">' +
          '<span class="rm-ing-check">' + (inFridge ? '✔' : '○') + '</span>' +
          '<span class="rm-ing-name">' + ingName + '</span>' +
          qty +
        '</li>';
    });
    html += '</ul>';
  }

  /* ── Preparazione ── */
  if (prep) {
    html +=
      '<div class="rm-section-title">👨‍🍳 Preparazione</div>' +
      '<div class="rm-prep">' + prep + '</div>';
  }

  if (title) title.textContent = icon + ' ' + name;
  body.innerHTML = html;
  modal.classList.add('active');
}

function closeRecipeModal() {
  var m = document.getElementById('recipeModal');
  if (m) m.classList.remove('active');
  currentRecipeName = null;
}

/* ============================================================
   APPLICA RICETTA AL PIANO
   ============================================================ */
function applyRecipeToMeal() {
  if (!currentRecipeName) return;
  var r = findRicetta(currentRecipeName);
  if (!r) return;

  /* Pasto di destinazione: primo elemento se array */
  var pastoVal = r.pasto;
  var pasto    = Array.isArray(pastoVal)
    ? (pastoVal[0] || 'pranzo')
    : (pastoVal   || 'pranzo');

  /* Init struttura mealPlan */
  if (!mealPlan[pasto]) {
    mealPlan[pasto] = { principale: [], contorno: [], frutta: [], extra: [] };
  }
  if (!Array.isArray(mealPlan[pasto].principale)) mealPlan[pasto].principale = [];

  var ings  = Array.isArray(r.ingredienti) ? r.ingredienti : [];
  var added = 0;

  ings.forEach(function (ing) {
    var nm = String(ing.name || ing.nome || '').trim();
    if (!nm) return;
    var exists = mealPlan[pasto].principale.some(function (i) {
      return String(i.name || '').toLowerCase() === nm.toLowerCase();
    });
    if (!exists) {
      mealPlan[pasto].principale.push({
        name:     nm,
        quantity: ing.quantity || ing.quantita || null,
        unit:     ing.unit     || ing.unita    || 'g'
      });
      added++;
    }
  });

  saveData();
  closeRecipeModal();
  if (typeof renderMealPlan === 'function')  renderMealPlan();
  if (typeof renderProfilo  === 'function')  renderProfilo();

  alert(added > 0
    ? '✅ ' + added + ' ingredient' + (added === 1 ? 'e aggiunto' : 'i aggiunti') +
      ' al piano — ' + pastoLabel(pasto) + '!'
    : 'ℹ️ Ingredienti già presenti nel piano.');
}

/* ============================================================
   RICETTE PERSONALIZZATE
   ============================================================ */
function renderCustomRicette() {
  var el = document.getElementById('customRicetteList');
  if (!el) return;

  var list = (typeof customRecipes !== 'undefined' && Array.isArray(customRecipes))
    ? customRecipes : [];

  if (!list.length) {
    el.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">📝</div>' +
        '<h3>Nessuna ricetta</h3>' +
        '<p>Crea la tua prima ricetta personalizzata.</p>' +
        '<button class="btn btn-primary" style="margin-top:14px" ' +
                'onclick="openRicettaForm()">＋ Nuova ricetta</button>' +
      '</div>';
    return;
  }

  el.innerHTML = list.map(function (r, idx) {
    var name     = String(r.name || r.nome || '');
    var icon     = String(r.icon || '🍽');
    var pLabel   = pastoLabel(r.pasto);
    var ings     = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    var ingText  = ings.map(function (i) {
      var n = String(i.name || i.nome || '');
      var q = i.quantity ? ' ' + i.quantity + '\u00a0' + (i.unit || '') : '';
      return n + q;
    }).filter(Boolean).join(', ');
    var prep     = String(r.preparazione || '');
    var safeName = esc(name);

    return (
      '<div class="custom-ricetta-item">' +
        '<div class="cri-header">' +
          '<div class="cri-icon-name" onclick="openRecipeModal(\'' + safeName + '\')">' +
            '<span class="cri-icon">' + icon + '</span>' +
            '<div>' +
              '<div class="cri-name">' + name + '</div>' +
              '<div class="cri-pasto">' + pLabel + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cri-actions">' +
            '<button class="btn btn-secondary btn-small" ' +
                    'onclick="editCustomRicetta(' + idx + ')">✏️</button>' +
            '<button class="btn btn-danger btn-small"    ' +
                    'onclick="deleteCustomRicetta(' + idx + ')">🗑</button>' +
          '</div>' +
        '</div>' +
        (ingText ? '<div class="cri-ings">' + ingText + '</div>' : '') +
        (prep
          ? '<div class="cri-prep">' +
              prep.substring(0, 120) + (prep.length > 120 ? '…' : '') +
            '</div>'
          : '') +
      '</div>'
    );
  }).join('');
}
