/*
   DISPENSA.JS — v4  stile rc-card unificato
*/

var pantrySearchQuery = '';

/* ── UTILITY ── */
function getCategoryIcon(cat) {
  var map = {
    '🥩 Carne e Pesce':'🥩','🥛 Latticini e Uova':'🥛','🌾 Cereali e Legumi':'🌾',
    '🥦 Verdure':'🥦','🍎 Frutta':'🍎','🥑 Grassi e Condimenti':'🥑',
    '🍫 Dolci e Snack':'🍫','🧂 Cucina':'🧂','🧂 Altro':'🧂'
  };
  return (cat && map[cat]) ? map[cat] : '🧂';
}
function safeid(n) { return String(n).replace(/[^a-zA-Z0-9]/g,'_'); }
function escQ(str) { return String(str).replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function getStep(unit) {
  if (['kg','l'].indexOf(unit) !== -1) return 0.1;
  if (['pz','fette','cucchiai','cucchiaini','porzione'].indexOf(unit) !== -1) return 1;
  return 10;
}
function isValidPantryKey(k) { return k && typeof k==='string' && k.trim()!=='' && k!=='undefined' && k!=='null'; }
function isValidItem(item) { return item && typeof item==='object' && item.name && typeof item.name==='string' && item.name.trim()!==''; }

/* ── CATALOGO COMPLETO ── */
function getAllPantryItems() {
  var result = [], seen = {};
  var mealKeys = ['colazione','spuntino','pranzo','merenda','cena'];
  mealKeys.forEach(function(mk){
    var mp = (typeof mealPlan!=='undefined' && mealPlan && mealPlan[mk]) ? mealPlan[mk] : {};
    ['principale','contorno','frutta','extra'].forEach(function(cat){
      var arr = mp[cat];
      if (!Array.isArray(arr)) return;
      arr.forEach(function(item){
        if (!isValidItem(item)) return;
        var name = item.name.trim();
        if (seen[name]) return;
        seen[name] = true;
        var pd = (typeof pantryItems!=='undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
        result.push({ name:name, quantity:typeof pd.quantity==='number'?pd.quantity:0, unit:pd.unit||item.unit||'g', category:pd.category||'🧂 Altro', icon:pd.icon||getCategoryIcon(pd.category||'🧂 Altro'), isCustom:false });
      });
    });
  });
  if (typeof defaultIngredients!=='undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function(item){
      if (!isValidItem(item)) return;
      var name = item.name.trim();
      if (seen[name]) return;
      seen[name] = true;
      var pd = (typeof pantryItems!=='undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
      result.push({ name:name, quantity:typeof pd.quantity==='number'?pd.quantity:0, unit:pd.unit||item.unit||'g', category:item.category||'🧂 Altro', icon:item.icon||getCategoryIcon(item.category), isCustom:false });
    });
  }
  if (typeof customIngredients!=='undefined' && Array.isArray(customIngredients)) {
    customIngredients.forEach(function(item){
      if (!isValidItem(item)) return;
      var name = item.name.trim();
      if (seen[name]) return;
      seen[name] = true;
      var pd = (typeof pantryItems!=='undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : {};
      result.push({ name:name, quantity:typeof pd.quantity==='number'?pd.quantity:0, unit:pd.unit||item.unit||'g', category:item.category||'🧂 Altro', icon:item.icon||getCategoryIcon(item.category), isCustom:true });
    });
  }
  if (typeof pantryItems!=='undefined' && pantryItems && typeof pantryItems==='object') {
    Object.keys(pantryItems).forEach(function(name){
      if (!isValidPantryKey(name)||seen[name]) return;
      seen[name] = true;
      var pd = pantryItems[name];
      if (!pd||typeof pd!=='object') return;
      result.push({ name:name, quantity:typeof pd.quantity==='number'?pd.quantity:0, unit:pd.unit||'g', category:pd.category||'🧂 Altro', icon:pd.icon||'🧂', isCustom:pd.isCustom||false });
    });
  }
  result.sort(function(a,b){ if (b.quantity!==a.quantity) return b.quantity-a.quantity; return a.name.localeCompare(b.name,'it'); });
  return result;
}

/* ── RENDER (alias) ── */
function renderPantry() { renderFridge(); }

function renderFridge() {
  var el = document.getElementById('pantryContent');
  if (!el) return;

  var active = getAllPantryItems().filter(function(i){ return isValidItem(i) && (i.quantity||0) > 0; });

  if (pantrySearchQuery) {
    var q = pantrySearchQuery;
    active = active.filter(function(i){
      return i.name.toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q);
    });
  }

  /* ── VUOTO ── */
  if (!active.length) {
    el.innerHTML =
      '<div class="rc-empty">' +
        '<div style="font-size:2.5rem;">❄️</div>' +
        '<p>' + (pantrySearchQuery
          ? 'Nessun ingrediente corrisponde a "'+pantrySearchQuery+'".'
          : 'Il frigo è vuoto.<br>Aggiungi ingredienti con <strong>＋</strong> oppure segna acquisti nella <strong>Spesa</strong>.') +
        '</p>' +
      '</div>';
    updateSavedFridgesList();
    return;
  }

  /* ── RAGGRUPPA PER CATEGORIA ── */
  var groups = {};
  active.forEach(function(i){
    var cat = i.category || '🧂 Altro';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(i);
  });

  var html = '';
  Object.keys(groups).sort().forEach(function(cat){
    var icon = getCategoryIcon(cat);
    html +=
      '<div style="margin-bottom:20px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
          '<span style="font-size:1.1em;">'+icon+'</span>' +
          '<span style="font-weight:600;color:var(--text-2);font-size:.9em;text-transform:uppercase;letter-spacing:.05em;">'+cat.replace(/^[^\s]+\s/,'')+'</span>' +
          '<span class="rc-badge" style="background:var(--bg2);color:var(--text-2);">'+groups[cat].length+'</span>' +
        '</div>' +
        '<div class="fridge-items">' +
          groups[cat].map(function(item){
            var sid   = safeid(item.name);
            var step  = getStep(item.unit);
            var qty   = typeof item.quantity==='number' ? item.quantity : 0;
            var warn  = qty <= step ? ' style="border:1.5px solid var(--warn);"' : '';
            return '<div class="fridge-card"'+warn+'>' +
              '<div class="fridge-icon">'+item.icon+'</div>' +
              '<div class="fridge-name">'+item.name+'</div>' +
              '<div class="fridge-qty" onclick="openQtyEditor(\''+escQ(item.name)+'\')" style="cursor:pointer;" title="Modifica quantità">'+
                qty+' <span style="font-size:.75em;opacity:.7;">'+item.unit+'</span>' +
              '</div>' +
              '<div style="display:flex;gap:4px;justify-content:center;margin-top:6px;">' +
                '<button class="qty-btn minus" onclick="adjustQty(\''+escQ(item.name)+'\',-'+step+')">−</button>' +
                '<button class="qty-btn plus"  onclick="adjustQty(\''+escQ(item.name)+'\','+step+')">+</button>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';
  });

  el.innerHTML = html;
  updateSavedFridgesList();
}

/* ── MODIFICA QUANTITÀ ── */
function openQtyEditor(name) {
  var modal = document.getElementById('qtyEditorModal');
  var lbl   = document.getElementById('qtyEditorLabel');
  var inp   = document.getElementById('qtyEditorInput');
  var sel   = document.getElementById('qtyEditorUnit');
  if (!modal||!inp) return;
  var item  = (pantryItems && pantryItems[name]) ? pantryItems[name] : {};
  if (lbl) lbl.textContent = name;
  inp.value = item.quantity||0;
  if (sel) sel.value = item.unit||'g';
  inp.dataset.name = name;
  modal.classList.add('active');
  setTimeout(function(){ inp.focus(); inp.select(); }, 100);
}

function confirmQtyEdit() {
  var inp  = document.getElementById('qtyEditorInput');
  var sel  = document.getElementById('qtyEditorUnit');
  var modal= document.getElementById('qtyEditorModal');
  if (!inp) return;
  var name = inp.dataset.name;
  var val  = parseFloat(inp.value);
  if (!name || isNaN(val) || val < 0) return;
  if (!pantryItems[name]) pantryItems[name] = {};
  pantryItems[name].quantity = val;
  if (sel) pantryItems[name].unit = sel.value;
  saveData();
  if (modal) modal.classList.remove('active');
  renderFridge();
}

function adjustQty(name, delta) {
  if (!isValidPantryKey(name)) return;
  if (!pantryItems[name]) pantryItems[name] = { quantity:0, unit:'g' };
  var cur  = typeof pantryItems[name].quantity==='number' ? pantryItems[name].quantity : 0;
  var next = Math.max(0, Math.round((cur + delta) * 100) / 100);
  pantryItems[name].quantity = next;
  saveData();
  renderFridge();
}

/* ── AGGIUNGI DA SPESA ── */
function addFromSpesa(name, qty, unit) {
  if (!isValidPantryKey(name)) return;
  if (!pantryItems[name]) pantryItems[name] = { quantity:0, unit: unit||'g', category:'🧂 Altro' };
  var cur = typeof pantryItems[name].quantity==='number' ? pantryItems[name].quantity : 0;
  pantryItems[name].quantity = Math.round((cur + parseFloat(qty||0)) * 100) / 100;
  if (unit) pantryItems[name].unit = unit;
  saveData();
  renderFridge();
}

/* ── AGGIUNGI INGREDIENTE MANUALE ── */
function submitAddIngredient() {
  var nameEl = document.getElementById('addIngName');
  var catEl  = document.getElementById('addIngCategory');
  var qtyEl  = document.getElementById('addIngQty');
  var unitEl = document.getElementById('addIngUnit');
  var errEl  = document.getElementById('addIngError');
  if (!nameEl) return;
  var name = nameEl.value.trim();
  var cat  = catEl ? catEl.value : '';
  var qty  = parseFloat(qtyEl ? qtyEl.value : 0) || 0;
  var unit = unitEl ? unitEl.value : 'g';
  if (!name) { if (errEl) errEl.textContent='Inserisci il nome.'; return; }
  if (!cat)  { if (errEl) errEl.textContent='Seleziona una categoria.'; return; }
  if (errEl) errEl.textContent = '';
  if (!pantryItems[name]) pantryItems[name] = {};
  pantryItems[name].quantity = (pantryItems[name].quantity||0) + qty;
  pantryItems[name].unit     = unit;
  pantryItems[name].category = cat;
  pantryItems[name].icon     = getCategoryIcon(cat);
  if (!customIngredients.find(function(i){ return i.name===name; })) {
    customIngredients.push({ name:name, unit:unit, category:cat, icon:getCategoryIcon(cat) });
  }
  saveData();
  var modal = document.getElementById('addIngModal');
  if (modal) modal.classList.remove('active');
  if (nameEl) nameEl.value='';
  if (qtyEl)  qtyEl.value='';
  renderFridge();
  updateIngredientDatalist();
}

/* ── FRIGO SALVATI ── */
function updateSavedFridgesList() {
  var el = document.getElementById('savedFridgesContent2');
  if (!el) return;
  var keys = Object.keys(savedFridges||{});
  if (!keys.length) {
    el.innerHTML = '<p style="color:var(--text-3);font-size:.9em;padding:8px 0;">Nessuna configurazione salvata.</p>';
    return;
  }
  el.innerHTML = keys.map(function(k){
    var f = savedFridges[k];
    var n = Object.keys(f.items||{}).length;
    return '<div class="rc-card" style="display:flex;align-items:center;gap:10px;padding:12px 16px;margin-bottom:8px;">' +
      '<span style="flex:1;font-weight:500;">'+k+'</span>' +
      '<span class="rc-badge">'+n+' ing.</span>' +
      '<button class="rc-btn-icon" title="Carica" onclick="loadFridge(\''+escQ(k)+'\')">📥</button>' +
      '<button class="rc-btn-icon" title="Elimina" onclick="deleteFridge(\''+escQ(k)+'\')">🗑️</button>' +
    '</div>';
  }).join('');
}

function saveFridgeConfig() {
  var modal = document.getElementById('saveFridgeModal');
  var inp   = document.getElementById('saveFridgeName');
  if (!inp) return;
  var name = inp.value.trim();
  if (!name) { alert('Inserisci un nome.'); return; }
  if (!savedFridges) savedFridges = {};
  savedFridges[name] = { items: JSON.parse(JSON.stringify(pantryItems||{})), savedAt: new Date().toISOString() };
  saveData();
  if (modal) modal.classList.remove('active');
  if (inp) inp.value = '';
  updateSavedFridgesList();
}

function loadFridge(name) {
  if (!confirm('Caricare "'+name+'"? Sostituirà il frigo attuale.')) return;
  if (savedFridges && savedFridges[name]) {
    pantryItems = JSON.parse(JSON.stringify(savedFridges[name].items||{}));
    saveData();
    renderFridge();
  }
}

function deleteFridge(name) {
  if (!confirm('Eliminare "'+name+'"?')) return;
  delete savedFridges[name];
  saveData();
  updateSavedFridgesList();
}

/* ── RICERCA ── */
function searchPantry(q) {
  pantrySearchQuery = (q||'').trim().toLowerCase();
  renderFridge();
}

/* ── DATALIST ── */
function updateIngredientDatalist() {
  var dl = document.getElementById('ingredientiDatalist');
  if (!dl) return;
  var all = getAllPantryItems().map(function(i){ return i.name; });
  dl.innerHTML = all.map(function(n){ return '<option value="'+escQ(n)+'">'; }).join('');
}
