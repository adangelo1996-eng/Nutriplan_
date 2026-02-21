/*
   SPESA.JS — v5  stile rc-card unificato
*/

/* ── Stato selezione ricette ── */
var selectedSpesaRecipes    = {};
var spesaGenerateDays       = 1;
var spesaRecipeSelectorOpen = false;

/* ══════════════════════════════════════════════
   PANNELLO GENERA
══════════════════════════════════════════════ */
function buildSpesaGeneratePanel() {
  var allRicette = (typeof getAllRicette === 'function') ? getAllRicette() : [];
  var selCount   = Object.keys(selectedSpesaRecipes).filter(function(k){ return selectedSpesaRecipes[k]; }).length;

  var recipeRows = allRicette.map(function(r){
    var name    = r.name || r.nome || '';
    var icon    = r.icon || r.icona || '🍽';
    var checked = selectedSpesaRecipes[name] ? true : false;
    return '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--r-sm);cursor:pointer;background:'+(checked?'var(--primary-xl)':'var(--bg-subtle)')+';border:1.5px solid '+(checked?'var(--primary-mid)':'transparent')+';">' +
      '<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleSpesaRecipe(\''+_escSpesa(name)+'\')" style="width:16px;height:16px;accent-color:var(--primary);">' +
      '<span style="font-size:1.1em;">'+icon+'</span>' +
      '<span style="flex:1;font-size:.88em;font-weight:500;">'+name+'</span>' +
      '<span style="font-size:.75em;color:var(--text-light);">'+(r.pasto||'')+'</span>' +
    '</label>';
  }).join('');

  var selectorHtml = spesaRecipeSelectorOpen
    ? '<div style="background:var(--bg-card);border:1.5px solid var(--border);border-radius:var(--r-md);padding:12px;margin-bottom:10px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
          '<span style="font-weight:700;font-size:.9em;">Seleziona ricette</span>' +
          '<button class="rc-btn-icon" onclick="spesaRecipeSelectorOpen=false;renderSpesa()">✕</button>' +
        '</div>' +
        '<div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">' +
          (recipeRows || '<p style="color:var(--text-3);font-size:.85em;">Nessuna ricetta disponibile.</p>') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap;">' +
          '<button class="rc-btn rc-btn-primary rc-btn-sm" onclick="generateFromSelectedRecipes()" '+(selCount?'':'disabled style="opacity:.5;"')+'>'+
            '📋 Genera da ricette selezionate ('+selCount+')'+
          '</button>' +
          '<button class="rc-btn rc-btn-outline rc-btn-sm" onclick="toggleAllSpesaRecipes()">'+
            (selCount===allRicette.length ? '☐ Deseleziona tutte' : '☑ Seleziona tutte') +
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
        '🍽 Da ricette selezionate'+(selCount?' ('+selCount+')':'')+' ▾' +
      '</button>' +
      selectorHtml +
    '</div>'
  );
}

function _escSpesa(str) {
  return String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

function toggleSpesaRecipe(name) {
  selectedSpesaRecipes[name] = !selectedSpesaRecipes[name];
  renderSpesa();
}

function toggleAllSpesaRecipes() {
  var all = (typeof getAllRicette === 'function') ? getAllRicette() : [];
  var selCount = Object.keys(selectedSpesaRecipes).filter(function(k){ return selectedSpesaRecipes[k]; }).length;
  selectedSpesaRecipes = {};
  if (selCount < all.length) {
    all.forEach(function(r){ selectedSpesaRecipes[r.name||r.nome||''] = true; });
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
    var ings = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    ings.forEach(function(ing){
      var iname = (ing.name||ing.nome||'').trim();
      if (!iname) return;
      var qty   = parseFloat(ing.quantity) || 0;
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

/* ══════════════════════════════════════════════
   RENDER PRINCIPALE
══════════════════════════════════════════════ */
function renderSpesa() {
  var el = document.getElementById('spesaContent');
  if (!el) return;

  var items  = typeof spesaItems !== 'undefined' ? spesaItems : [];
  var manual = items.filter(function(i){ return i.manual; });
  var auto   = items.filter(function(i){ return !i.manual; });

  /* ── toolbar ── */
  var toolbar =
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
      '<button class="rc-btn rc-btn-outline" onclick="openSpesaItemModal()">＋ Aggiungi</button>' +
      '<button class="rc-btn rc-btn-outline" onclick="clearBoughtItems()">🗑️ Acquistati</button>' +
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

  var html = toolbar;

  /* ── SEZIONE AUTO ── */
  if (auto.length) {
    html +=
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
        '<span style="font-weight:700;font-size:.95em;">🤖 Dal piano</span>' +
        '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">'+auto.length+'</span>' +
      '</div>' +
      auto.map(function(item, idx){ return buildSpesaCard(item, items.indexOf(item)); }).join('') +
      '<div style="margin-bottom:20px;"></div>';
  }

  /* ── SEZIONE MANUALE ── */
  if (manual.length) {
    html +=
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
        '<span style="font-weight:700;font-size:.95em;">✏️ Aggiunti manualmente</span>' +
        '<span class="rc-badge" style="background:var(--bg2);color:var(--text-2);">'+manual.length+'</span>' +
      '</div>' +
      manual.map(function(item){ return buildSpesaCard(item, items.indexOf(item)); }).join('');
  }

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

  /* se appena acquistato → apri modal quantità */
  if (items[idx].bought) {
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

/* ── GENERA DA PIANO (× giorni) ── */
function generateShoppingList() {
  var days   = typeof spesaGenerateDays !== 'undefined' ? (parseInt(spesaGenerateDays)||1) : 1;
  var needed = {};
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk){
    var plan = (mealPlan && mealPlan[mk]) ? mealPlan[mk] : {};
    ['principale','contorno','frutta','extra'].forEach(function(cat){
      if (!Array.isArray(plan[cat])) return;
      plan[cat].forEach(function(item){
        if (!item || !item.name) return;
        var name    = item.name.trim();
        var inPantry = typeof pantryItems !== 'undefined' && pantryItems &&
                       pantryItems[name] && (pantryItems[name].quantity||0) > 0;
        if (!inPantry) {
          var baseQty = parseFloat(item.quantity) || 0;
          var totalQty = baseQty * days;
          if (!needed[name]) needed[name] = { name:name, quantity:totalQty||null, unit:item.unit||'g', manual:false, bought:false };
          else if (totalQty > 0) needed[name].quantity = (needed[name].quantity||0) + totalQty;
        }
      });
    });
  });

  /* mantieni i manuali, sostituisci gli auto */
  var manual = (typeof spesaItems !== 'undefined' ? spesaItems : []).filter(function(i){ return i.manual; });
  spesaItems = manual.concat(Object.values(needed));
  saveData();
  renderSpesa();
  if (typeof showToast==='function') showToast('✅ Lista generata per '+days+' giorn'+(days===1?'o':'i'),'success');
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
