/* ============================================================
   RICETTE.JS  v7  —  accordion card, minimal, array-safe
   ============================================================ */

var ricetteSearchQuery = '';
var ricetteFilterPasto = 'all';
var currentRecipeName  = null;

/* ── Utility ── */
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
function safeStr(v) { return v == null ? '' : String(v); }

function pastoLabel(p) {
  var map = { colazione:'☀️ Colazione', spuntino:'🍎 Spuntino',
              pranzo:'🍽 Pranzo', merenda:'🥪 Merenda', cena:'🌙 Cena' };
  if (!p) return '';
  if (Array.isArray(p)) return p.filter(Boolean).map(function(k){ return map[k]||k; }).join(' · ');
  return map[p] || p;
}
function pastoContains(p, key) {
  if (!p) return false;
  return Array.isArray(p) ? p.indexOf(key) !== -1 : p === key;
}
function pastoColor(p) {
  var first = Array.isArray(p) ? p[0] : p;
  return { colazione:'#f59e0b', spuntino:'#10b981', pranzo:'#3d8b6f',
           merenda:'#8b5cf6', cena:'#3b82f6' }[first] || 'var(--primary)';
}
function getFridgeKeys() {
  if (typeof pantryItems === 'undefined' || !pantryItems) return [];
  return Object.keys(pantryItems).filter(function(k){
    return k && k !== 'undefined' && pantryItems[k] && (pantryItems[k].quantity||0) > 0;
  });
}

/* Restituisce tutti i nomi di ingredienti presenti nel pianoAlimentare */
function getPianoAlimentareIngNames() {
  if (typeof pianoAlimentare === 'undefined' || !pianoAlimentare) return [];
  var names = [];
  var seen  = {};
  Object.keys(pianoAlimentare).forEach(function(mealKey) {
    var meal = pianoAlimentare[mealKey];
    if (!meal || typeof meal !== 'object') return;
    Object.keys(meal).forEach(function(catKey) {
      var arr = meal[catKey];
      if (!Array.isArray(arr)) return;
      arr.forEach(function(item) {
        if (item && item.name && !seen[item.name]) {
          seen[item.name] = true;
          names.push(item.name.toLowerCase().trim());
        }
        /* Anche le alternative */
        if (Array.isArray(item.alternatives)) {
          item.alternatives.forEach(function(alt) {
            if (alt && alt.name && !seen[alt.name]) {
              seen[alt.name] = true;
              names.push(alt.name.toLowerCase().trim());
            }
          });
        }
      });
    });
  });
  /* Fallback: usa anche mealPlan se pianoAlimentare è vuoto */
  if (!names.length && typeof mealPlan !== 'undefined' && mealPlan) {
    Object.keys(mealPlan).forEach(function(mk) {
      var m = mealPlan[mk];
      if (!m) return;
      ['principale','contorno','frutta','extra'].forEach(function(cat) {
        if (!Array.isArray(m[cat])) return;
        m[cat].forEach(function(it) {
          if (it && it.name && !seen[it.name]) {
            seen[it.name] = true;
            names.push(it.name.toLowerCase().trim());
          }
        });
      });
    });
  }
  return names;
}

/* Controlla se un ingrediente è fuori dal piano alimentare */
function isIngExtraPiano(ingName) {
  if (!ingName) return false;
  var pianoNames = getPianoAlimentareIngNames();
  if (!pianoNames.length) return false; /* piano vuoto → non segniamo nulla */
  var nl = ingName.toLowerCase().trim();
  return !pianoNames.some(function(pn) {
    return pn === nl || pn.includes(nl) || nl.includes(pn);
  });
}

/* Conta ingredienti extra piano per una lista di ingredienti ricetta */
function countExtraPiano(ings) {
  if (!Array.isArray(ings)) return 0;
  var pianoNames = getPianoAlimentareIngNames();
  if (!pianoNames.length) return 0;
  return ings.filter(function(ing) {
    return isIngExtraPiano(safeStr(ing.name || ing.nome));
  }).length;
}
function countAvailable(ings) {
  var keys = getFridgeKeys();
  if (!keys.length || !Array.isArray(ings)) return 0;
  return ings.filter(function(ing){
    var n = safeStr(ing.name||ing.nome).toLowerCase().trim();
    return n && keys.some(function(k){
      var kl = k.toLowerCase().trim();
      return kl===n || kl.includes(n) || n.includes(kl);
    });
  }).length;
}
function getAllRicette() {
  var out = [];
  if (typeof defaultRecipes!=='undefined' && Array.isArray(defaultRecipes))
    defaultRecipes.forEach(function(r){ if(r&&(r.name||r.nome)) out.push(r); });
  if (typeof customRecipes!=='undefined' && Array.isArray(customRecipes))
    customRecipes.forEach(function(r){
      if(r&&(r.name||r.nome)) out.push(Object.assign({},r,{isCustom:true}));
    });
  /* Le ricette AI sono incluse nel catalogo con badge dedicato */
  if (typeof aiRecipes!=='undefined' && Array.isArray(aiRecipes))
    aiRecipes.forEach(function(r){
      if(r&&(r.name||r.nome)) out.push(Object.assign({},r,{isAI:true}));
    });
  return out;
}

/* ── Render tab AI Ricette ── */
function renderAIRicetteTab() {
  var el = document.getElementById('aiRicetteList');
  if (!el) return;
  var list = (typeof aiRecipes !== 'undefined' && Array.isArray(aiRecipes)) ? aiRecipes : [];
  if (!list.length) {
    el.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">🤖</div>' +
        '<h3>Nessuna ricetta AI</h3>' +
        '<p>Genera la tua prima ricetta con il tasto <b>✨ Genera</b>.</p>' +
      '</div>';
    return;
  }
  el.innerHTML = list.map(function(r, idx) {
    return buildAIRicettaItem(r, idx);
  }).join('');
}

function buildAIRicettaItem(r, idx) {
  var name  = r.name || r.nome || 'Ricetta AI';
  var icon  = r.icon || '🤖';
  var pasto = r.pasto || '';
  var ings  = Array.isArray(r.ingredienti) ? r.ingredienti : [];
  var prep  = r.preparazione || '';
  var color = pastoColor(pasto);
  var pl    = pastoLabel(pasto);

  var ingList = ings.map(function(i) {
    var qty = i.quantity ? i.quantity + ' ' + (i.unit || '') : '';
    return (i.name || '') + (qty ? ' (' + qty + ')' : '');
  }).filter(Boolean).join(', ');

  return (
    '<div class="cri-card" style="--cc:' + color + '">' +
      '<div class="cri-top">' +
        '<div class="cri-icon" onclick="openRecipeModal(\'' + esc(name) + '\')">' + icon + '</div>' +
        '<div class="cri-body" onclick="openRecipeModal(\'' + esc(name) + '\')">' +
          '<div class="cri-name">' + name + '</div>' +
          (pl ? '<div class="cri-pasto" style="color:' + color + '">' + pl + '</div>' : '') +
          '<span class="rc-badge" style="background:#e8f4fd;color:#1a73e8;font-size:.7em;margin-top:4px;">🤖 AI</span>' +
        '</div>' +
        '<div class="cri-actions">' +
          '<button class="btn btn-warning btn-small" onclick="event.stopPropagation();deleteAIRicetta(' + idx + ')">🗑</button>' +
        '</div>' +
      '</div>' +
      (ingList ? '<div class="cri-ings">🥗 ' + ingList + '</div>' : '') +
      (prep ? '<div class="cri-prep">' + truncate(prep, 120) + '</div>' : '') +
    '</div>'
  );
}

function deleteAIRicetta(idx) {
  if (!Array.isArray(aiRecipes) || !aiRecipes[idx]) return;
  var name = aiRecipes[idx].name || 'questa ricetta';
  if (!confirm('Eliminare la ricetta AI "' + name + '"?')) return;
  aiRecipes.splice(idx, 1);
  if (typeof saveData === 'function') saveData();
  renderAIRicetteTab();
  renderRicetteGrid();
}
function findRicetta(name) {
  return getAllRicette().find(function(r){ return (r.name||r.nome||'')===name; })||null;
}

/* ── Tab ── */
function showRicetteTab(tab, btn) {
  document.querySelectorAll('#ricettePage .page-tab-content').forEach(function(c){ c.classList.remove('active'); });
  document.querySelectorAll('#ricettePage .page-tab').forEach(function(t){ t.classList.remove('active'); });
  var el = document.getElementById(tab==='catalogo'?'ricetteTabCatalogo':'ricetteTabMie');
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
  if (tab==='catalogo') renderRicettePage();
  if (tab==='mie')      renderCustomRicette();
}

/* ── Entry point ── */
function renderRicettePage() { buildFilterRow(); renderRicetteGrid(); }

/* ── Filtri ── */
function buildFilterRow() {
  var row = document.getElementById('ricetteFilterRow');
  if (!row) return;
  var filters = [
    {key:'all',emoji:'🍴',label:'Tutti'},
    {key:'colazione',emoji:'☀️',label:'Colazione'},
    {key:'spuntino',emoji:'🍎',label:'Spuntino'},
    {key:'pranzo',emoji:'🍽',label:'Pranzo'},
    {key:'merenda',emoji:'🥪',label:'Merenda'},
    {key:'cena',emoji:'🌙',label:'Cena'}
  ];
  row.innerHTML = filters.map(function(f){
    return '<button class="rf-pill'+(f.key===ricetteFilterPasto?' active':'')+'" '+
           'onclick="setRicetteFilter(\''+f.key+'\',this)">'+
           f.emoji+' '+f.label+'</button>';
  }).join('');
}
function setRicetteFilter(key, btn) {
  ricetteFilterPasto = key||'all';
  document.querySelectorAll('.rf-pill').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderRicetteGrid();
}
function filterRicette(query) {
  ricetteSearchQuery = (query||'').trim().toLowerCase();
  renderRicetteGrid();
}

/* ── Griglia ── */
function renderRicetteGrid() {
  var grid = document.getElementById('ricetteGrid');
  if (!grid) return;
  var all = getAllRicette().filter(function(r){
    if (ricetteFilterPasto!=='all' && !pastoContains(r.pasto, ricetteFilterPasto)) return false;
    if (ricetteSearchQuery) {
      var nm = safeStr(r.name||r.nome).toLowerCase();
      var ings = (Array.isArray(r.ingredienti)?r.ingredienti:[])
        .map(function(i){ return safeStr(i.name||i.nome).toLowerCase(); }).join(' ');
      return nm.includes(ricetteSearchQuery)||ings.includes(ricetteSearchQuery);
    }
    return true;
  });
  if (!all.length) {
    grid.innerHTML='<div class="empty-state"><div class="empty-state-icon">🔍</div>'+
                   '<h3>Nessuna ricetta trovata</h3><p>Prova altri termini o cambia filtro.</p></div>';
    return;
  }
  if (ricetteFilterPasto==='all' && !ricetteSearchQuery) {
    grid.innerHTML = buildGroupedGrid(all);
  } else {
    grid.innerHTML = '<div class="rc-grid">'+all.map(buildCard).join('')+'</div>';
  }
}

/* ── Raggruppa ── */
function buildGroupedGrid(list) {
  var order  = ['colazione','spuntino','pranzo','merenda','cena'];
  var labels = {colazione:'☀️ Colazione',spuntino:'🍎 Spuntino',
                pranzo:'🍽 Pranzo',merenda:'🥪 Merenda',cena:'🌙 Cena'};
  var groups = {}; var placed = {};
  order.forEach(function(p){ groups[p]=[]; }); groups._altro=[];
  list.forEach(function(r){
    var rid  = safeStr(r.id||r.name||r.nome);
    var keys = Array.isArray(r.pasto)?r.pasto:[safeStr(r.pasto)];
    var done = false;
    order.forEach(function(o){
      if (!done && keys.indexOf(o)!==-1 && !placed[rid+'_'+o]){
        groups[o].push(r); placed[rid+'_'+o]=true; done=true;
      }
    });
    if (!done) groups._altro.push(r);
  });
  var html='';
  order.concat(['_altro']).forEach(function(p){
    var items=groups[p]; if(!items||!items.length) return;
    var lbl=labels[p]||'🍴 Altro';
    var color=pastoColor(p==='_altro'?'':p);
    html+='<div class="rc-group">'+
            '<div class="rc-group-title" style="--gc:'+color+'">'+
              lbl+'<span class="rc-group-count">'+items.length+'</span>'+
            '</div>'+
            '<div class="rc-grid">'+items.map(buildCard).join('')+'</div>'+
          '</div>';
  });
  return html;
}

/* ══════════════════════════════════════════════════
   CARD con ACCORDION
   ══════════════════════════════════════════════════ */
function buildCard(r) {
  if (!r) return '';
  var name       = safeStr(r.name||r.nome||'Ricetta');
  var icon       = safeStr(r.icon||r.icona||'🍽');
  var ings       = Array.isArray(r.ingredienti)?r.ingredienti:[];
  var isCustom   = Boolean(r.isCustom);
  var tot        = ings.length;
  var avail      = countAvailable(ings);
  var extraCount = countExtraPiano(ings);
  var pct        = tot?Math.round((avail/tot)*100):0;
  var color      = pastoColor(r.pasto);
  var pLabel     = pastoLabel(r.pasto);
  var fridgeKeys = getFridgeKeys();
  var pianoNames = getPianoAlimentareIngNames();
  var hasExtraCheck = pianoNames.length > 0;

  /* stato badge */
  var stateCls = pct>=80?'badge-ok':pct>=40?'badge-warn':'badge-grey';
  var stateTxt = pct>=80?'✔ Disponibile':pct>=40?'◑ Parziale':'○ Da acquistare';

  /* badge extra piano */
  var extraBadge = '';
  if (hasExtraCheck && extraCount > 0) {
    extraBadge = '<span class="rc-badge badge-extra">⚠ ' + extraCount + ' extra piano</span>';
  } else if (hasExtraCheck && extraCount === 0 && tot > 0) {
    extraBadge = '<span class="rc-badge badge-inpiano">✓ Nel piano</span>';
  }

  /* accordion ingredienti */
  var accHtml = '';
  if (ings.length) {
    accHtml += '<ul class="rc-acc-list">';
    ings.forEach(function(ing){
      var n       = safeStr(ing.name||ing.nome);
      var nl      = n.toLowerCase().trim();
      var ok      = fridgeKeys.some(function(k){
        var kl=k.toLowerCase().trim();
        return kl===nl||kl.includes(nl)||nl.includes(kl);
      });
      var extra   = hasExtraCheck && isIngExtraPiano(n);
      var qty = (ing.quantity||ing.quantita)
        ? '<span class="rc-acc-qty">'+safeStr(ing.quantity||ing.quantita)+
          '\u00a0'+safeStr(ing.unit||ing.unita)+'</span>'
        : '';
      accHtml += '<li class="rc-acc-item'+(ok?' ok':'')+(extra?' extra-piano':'')+'">'+
                   '<span class="rc-acc-dot"></span>'+
                   '<span class="rc-acc-name">'+n+'</span>'+
                   qty+
                   (extra?'<span class="rc-acc-extra-tag">extra</span>':'')+
                 '</li>';
    });
    accHtml += '</ul>';
    accHtml += '<button class="rc-detail-btn" '+
               'onclick="event.stopPropagation();openRecipeModal(\''+esc(name)+'\')">'+
               'Preparazione →</button>';
  }

  return (
    '<div class="rc-card'+(isCustom?' rc-custom':'')+'" '+
         'style="--cc:'+color+'" '+
         'onclick="toggleRicettaCard(this,\''+esc(name)+'\')" '+
         'data-name="'+esc(name)+'">'+

      /* Header card */
      '<div class="rc-card-head">'+
        '<div class="rc-icon-wrap">'+icon+'</div>'+
        '<div class="rc-info">'+
          '<div class="rc-name">'+name+'</div>'+
          '<div class="rc-meta">'+
            (pLabel?'<span class="rc-pasto" style="color:'+color+'">'+pLabel+'</span>':'') +
            (isCustom?'<span class="rc-badge">⭐ Mia</span>':'')+
            '<span class="rc-badge '+stateCls+'">'+stateTxt+'</span>'+
            extraBadge+
          '</div>'+
        '</div>'+
        '<span class="rc-chevron">'+
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">'+
            '<path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'+
          '</svg>'+
        '</span>'+
      '</div>'+

      /* Accordion */
      (accHtml?'<div class="rc-accordion"><div class="rc-accordion-inner">'+accHtml+'</div></div>':'')+

    '</div>'
  );
}

/* toggle accordion — una sola aperta alla volta */
function toggleRicettaCard(el, name) {
  var wasOpen = el.classList.contains('open');
  document.querySelectorAll('.rc-card.open').forEach(function(c){ c.classList.remove('open'); });
  if (!wasOpen) el.classList.add('open');
}

/* ══════════════════════════════════════════════════
   MODAL DETTAGLIO (preparazione + ingredienti completi)
   ══════════════════════════════════════════════════ */
function openRecipeModal(name) {
  if (!name) return;
  currentRecipeName = name;
  var r = findRicetta(name);
  if (!r) return;
  var modal = document.getElementById('recipeModal');
  var title = document.getElementById('recipeModalTitle');
  var body  = document.getElementById('recipeModalBody');
  if (!modal||!body) return;

  var icon   = safeStr(r.icon||r.icona||'🍽');
  var ings   = Array.isArray(r.ingredienti)?r.ingredienti:[];
  var prep   = safeStr(r.preparazione||r.preparation||'');
  var pLabel = pastoLabel(r.pasto);
  var color  = pastoColor(r.pasto);
  var tot    = ings.length;
  var avail  = countAvailable(ings);
  var pct    = tot?Math.round((avail/tot)*100):0;
  var barClr = pct>=80?'#2ea86a':pct>=40?'#d97706':'#dc2626';
  var fridgeKeys = getFridgeKeys();

  var html =
    '<div class="rm-hero" style="--mc:'+color+'">'+
      '<div class="rm-hero-icon">'+icon+'</div>'+
      '<div>'+
        '<div class="rm-hero-name">'+name+'</div>'+
        (pLabel?'<div class="rm-hero-pasto" style="color:'+color+'">'+pLabel+'</div>':'')+
      '</div>'+
    '</div>';

  if (tot) {
    html += '<div class="rm-avail">'+
              '<div class="rm-avail-track"><div class="rm-avail-fill" style="width:'+pct+'%;background:'+barClr+'"></div></div>'+
              '<span style="color:'+barClr+';font-size:.75rem;font-weight:800">'+avail+'/'+tot+' in dispensa</span>'+
            '</div>';
  }

  var pianoNames = getPianoAlimentareIngNames();
  var hasExtraCheck = pianoNames.length > 0;

  if (ings.length) {
    var extraCount = countExtraPiano(ings);
    if (hasExtraCheck && extraCount > 0) {
      html += '<div class="rm-extra-notice">⚠ ' + extraCount + ' ingredient' +
              (extraCount === 1 ? 'e' : 'i') +
              ' non present' + (extraCount === 1 ? 'e' : 'i') +
              ' nel tuo piano alimentare</div>';
    }
    html += '<p class="rm-section-label">Ingredienti</p><ul class="rm-ing-list">';
    ings.forEach(function(ing){
      var n  = safeStr(ing.name||ing.nome);
      var nl = n.toLowerCase().trim();
      var ok = fridgeKeys.some(function(k){
        var kl=k.toLowerCase().trim(); return kl===nl||kl.includes(nl)||nl.includes(kl);
      });
      var extra = hasExtraCheck && isIngExtraPiano(n);
      var qty= (ing.quantity||ing.quantita)
        ?'<span class="rm-qty">'+safeStr(ing.quantity||ing.quantita)+'\u00a0'+safeStr(ing.unit||ing.unita)+'</span>':'';
      html += '<li class="rm-ing'+(ok?' ok':'')+(extra?' rm-extra':'')+'">'+
                '<span class="rm-check">'+(ok?'✔':'○')+'</span>'+
                '<span class="rm-ing-name">'+n+'</span>'+qty+
                (extra?'<span class="rm-extra-tag">extra piano</span>':'')+
              '</li>';
    });
    html += '</ul>';
  }

  if (prep) {
    var steps = prep.split(/\.\s+/).filter(Boolean);
    html += '<p class="rm-section-label">Preparazione</p>';
    html += steps.length>1
      ? '<ol class="rm-steps">'+steps.map(function(s){ return '<li>'+s.replace(/\.$/,'')+'</li>'; }).join('')+'</ol>'
      : '<p class="rm-prep">'+prep+'</p>';
  }

  if (title) title.textContent = icon+' '+name;
  body.innerHTML = html;
  modal.classList.add('active');
}

function closeRecipeModal() {
  var m = document.getElementById('recipeModal');
  if (m) m.classList.remove('active');
  currentRecipeName = null;
}

/* ── Aggiungi alla spesa solo gli ingredienti MANCANTI dalla dispensa ── */
function addRecipeIngredientsToSpesa() {
  if (!currentRecipeName) return;
  var r = findRicetta(currentRecipeName);
  if (!r) return;
  var ings = Array.isArray(r.ingredienti) ? r.ingredienti : [];
  if (!ings.length) { if (typeof showToast==='function') showToast('Nessun ingrediente da aggiungere','warning'); return; }
  if (typeof spesaItems === 'undefined') spesaItems = [];
  if (typeof pushUndo === 'function') pushUndo('Aggiungi ' + currentRecipeName + ' alla spesa');
  var added = 0, updated = 0, skipped = 0;

  ings.forEach(function(ing){
    var name   = safeStr(ing.name || ing.nome).trim();
    if (!name) return;
    var needed = parseFloat(ing.quantity) || 0;
    var unit   = ing.unit || 'g';

    /* Disponibile in dispensa */
    var inPantry = 0;
    if (typeof pantryItems !== 'undefined' && pantryItems) {
      var nl = name.toLowerCase();
      var pKey = pantryItems[name] ? name :
        Object.keys(pantryItems).find(function(k){ var kl=k.toLowerCase(); return kl===nl||kl.includes(nl)||nl.includes(kl); }) || null;
      if (pKey) inPantry = pantryItems[pKey].quantity || 0;
    }

    /* Già in lista spesa (non acquistato) */
    var inSpesa = 0, existing = null;
    spesaItems.forEach(function(s){
      if (!s.bought && safeStr(s.name).toLowerCase() === name.toLowerCase()) {
        inSpesa += parseFloat(s.quantity) || 0;
        existing = s;
      }
    });

    var missing = needed > 0 ? Math.max(0, needed - inPantry - inSpesa) : (inPantry > 0 ? 0 : needed);
    if (missing <= 0 && needed > 0) { skipped++; return; }

    if (existing) {
      existing.quantity = Math.round(((existing.quantity || 0) + missing) * 100) / 100;
      updated++;
    } else {
      spesaItems.push({ name:name, quantity:missing||null, unit:unit, manual:false, bought:false });
      added++;
    }
  });

  if (typeof saveData === 'function') saveData();
  closeRecipeModal();
  if (typeof goToPage === 'function') goToPage('spesa');
  var msg = [];
  if (added)   msg.push(added + ' nuov' + (added===1?'o':'i'));
  if (updated) msg.push(updated + ' aggiornati');
  if (skipped) msg.push(skipped + ' già in dispensa');
  if (typeof showToast === 'function') showToast('🛒 ' + (msg.join(', ') || 'Tutto già in dispensa'), 'success');
}

/* ── Applica al piano ── */
function applyRecipeToMeal() {
  if (!currentRecipeName) return;
  var r = findRicetta(currentRecipeName); if (!r) return;
  var pasto = Array.isArray(r.pasto)?(r.pasto[0]||'pranzo'):(r.pasto||'pranzo');
  if (!mealPlan[pasto]) mealPlan[pasto]={principale:[],contorno:[],frutta:[],extra:[]};
  if (!Array.isArray(mealPlan[pasto].principale)) mealPlan[pasto].principale=[];
  var ings=Array.isArray(r.ingredienti)?r.ingredienti:[], added=0;
  ings.forEach(function(ing){
    var nm=safeStr(ing.name||ing.nome).trim(); if(!nm) return;
    var exists=mealPlan[pasto].principale.some(function(i){
      return safeStr(i.name).toLowerCase()===nm.toLowerCase();
    });
    if (!exists){ mealPlan[pasto].principale.push({name:nm,quantity:ing.quantity||null,unit:ing.unit||'g'}); added++; }
  });
  saveData(); closeRecipeModal();
  if (typeof renderMealPlan==='function') renderMealPlan();
  if (typeof renderProfilo==='function')  renderProfilo();
  alert(added>0?'✅ '+added+' ingredienti aggiunti — '+pastoLabel(pasto)+'!':'ℹ️ Già presenti nel piano.');
}

/* ── Ricette personalizzate ── */
function renderCustomRicette() {
  var el = document.getElementById('customRicetteList'); if (!el) return;
  var list = typeof customRecipes!=='undefined'&&Array.isArray(customRecipes)?customRecipes:[];
  if (!list.length) {
    el.innerHTML='<div class="empty-state"><div class="empty-state-icon">📝</div>'+
                 '<h3>Nessuna ricetta</h3><p>Crea la tua prima ricetta.</p>'+
                 '<button class="btn btn-primary" style="margin-top:16px" onclick="openRicettaForm()">＋ Nuova ricetta</button></div>';
    return;
  }
  el.innerHTML = list.map(function(r,idx){
    var name=safeStr(r.name||r.nome), icon=safeStr(r.icon||'🍽');
    var pl=pastoLabel(r.pasto), color=pastoColor(r.pasto);
    var ings=Array.isArray(r.ingredienti)?r.ingredienti:[];
    var it=ings.map(function(i){
      return safeStr(i.name||i.nome)+(i.quantity?' '+i.quantity+'\u00a0'+safeStr(i.unit):'');
    }).filter(Boolean).join(', ');
    var prep=safeStr(r.preparazione||'');
    return (
      '<div class="cri-card" style="--cc:'+color+'">'+
        '<div class="cri-top">'+
          '<div class="cri-icon" onclick="openRecipeModal(\''+esc(name)+'\')">'+icon+'</div>'+
          '<div class="cri-body" onclick="openRecipeModal(\''+esc(name)+'\')">'+
            '<div class="cri-name">'+name+'</div>'+
            (pl?'<div class="cri-pasto" style="color:'+color+'">'+pl+'</div>':'')+
          '</div>'+
          '<div class="cri-actions">'+
            '<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();editCustomRicetta('+idx+')">✏️</button>'+
            '<button class="btn btn-danger btn-small"    onclick="event.stopPropagation();deleteCustomRicetta('+idx+')">🗑</button>'+
          '</div>'+
        '</div>'+
        (it?'<div class="cri-ings">'+it+'</div>':'')+
        (prep?'<div class="cri-prep">'+prep.substring(0,120)+(prep.length>120?'…':'')+'</div>':'')+
      '</div>'
    );
  }).join('');
}
