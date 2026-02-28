/* ============================================================
   RICETTE.JS  v8  —  filtro intelligente per ingredienti piano pasto
   ============================================================ */

var ricetteSearchQuery = '';
var ricetteFilterPasto = 'all';
var ricetteFilterExtra = '';
var ricetteFilterCompatibili = 'all';   /* 'all' | 'compatibili' | 'non_compatibili' */
var ricetteFilterIngredienti = 'solo_piano'; /* 'solo_piano' | 'anche_extra' (per pasto selezionato) */
var currentRecipeName  = null;

function isFavorito(name) {
  return Array.isArray(preferiti) && preferiti.indexOf(name) !== -1;
}
function toggleFavorito(name, event) {
  if (event) event.stopPropagation();
  if (!Array.isArray(preferiti)) preferiti = [];
  var idx = preferiti.indexOf(name);
  if (idx === -1) {
    preferiti.push(name);
    if (typeof showToast === 'function') showToast('⭐ "' + name + '" aggiunta ai preferiti', 'success');
  } else {
    preferiti.splice(idx, 1);
    if (typeof showToast === 'function') showToast('☆ "' + name + '" rimossa dai preferiti', 'info');
  }
  if (typeof saveData === 'function') saveData();
  renderRicetteGrid();
  if (typeof renderAIRicetteTab === 'function') renderAIRicetteTab();
}

var _MEAT_KW  = ['pollo','tacchino','manzo','maiale','agnello','vitello','prosciutto','salame',
                 'bresaola','pancetta','salsiccia','bacon','mortadella','speck','guanciale',
                 'lardo','bistecca','filetto','costata','fesa','coscia','arrosto'];
var _FISH_KW  = ['salmone','tonno','merluzzo','branzino','orata','sgombro','trota','pesce',
                 'calamari','gamberetti','gamberone','cozze','vongole','polpo','seppia',
                 'acciughe','sardine','aringa','nasello','dentice'];
var _DAIRY_KW = ['latte','yogurt','formaggio','mozzarella','parmigiano','ricotta','mascarpone',
                 'grana','burro','panna','fontina','gorgonzola','emmental','pecorino','caciotta',
                 'kefir','quark'];
var _EGG_KW   = ['uova','uovo'];
var _GLUT_KW  = ['pasta','pane','farina','orzo','farro','avena','segale','grano','semola',
                 'biscotti','crackers','grissini','focaccia','pizza','couscous','bulgur',
                 'pangrattato','brioche','cornetto'];

function isDietCompatible(recipe) {
  var dp = (typeof dietProfile !== 'undefined') ? dietProfile : {};
  if (!dp || !Object.keys(dp).length) return true;
  var ings = Array.isArray(recipe.ingredienti) ? recipe.ingredienti : [];
  var allergenici = Array.isArray(dp.allergenici) ? dp.allergenici : [];
  for (var i = 0; i < ings.length; i++) {
    var n = (ings[i].name || '').toLowerCase();
    for (var j = 0; j < allergenici.length; j++) {
      if (allergenici[j] && n.includes(allergenici[j].toLowerCase())) return false;
    }
    if (dp.vegetariano || dp.vegano) {
      for (var k = 0; k < _MEAT_KW.length; k++) { if (n.includes(_MEAT_KW[k])) return false; }
      for (var k = 0; k < _FISH_KW.length; k++) { if (n.includes(_FISH_KW[k])) return false; }
    }
    if (dp.vegano) {
      for (var k = 0; k < _DAIRY_KW.length; k++) { if (n.includes(_DAIRY_KW[k])) return false; }
      for (var k = 0; k < _EGG_KW.length;  k++) { if (n.includes(_EGG_KW[k]))  return false; }
    }
    if (dp.senzaLattosio) {
      for (var k = 0; k < _DAIRY_KW.length; k++) { if (n.includes(_DAIRY_KW[k])) return false; }
    }
    if (dp.senzaGlutine) {
      for (var k = 0; k < _GLUT_KW.length; k++) { if (n.includes(_GLUT_KW[k])) return false; }
    }
  }
  return true;
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
function safeStr(v) { return v == null ? '' : String(v); }

/* Numero di persone/porzioni: default 1 se non impostato */
function getRecipeBasePorzioni(r) {
  if (!r) return 1;
  var p = r.porzioni;
  if (typeof p === 'number' && p >= 1) return Math.round(p);
  return 1;
}

/* Scala le quantità degli ingredienti per un altro numero di porzioni (copia, non muta) */
function scaleIngredientiForPorzioni(ingredienti, basePorzioni, targetPorzioni) {
  if (!Array.isArray(ingredienti) || basePorzioni <= 0 || targetPorzioni <= 0) return ingredienti || [];
  if (basePorzioni === targetPorzioni) return ingredienti.slice();
  var factor = targetPorzioni / basePorzioni;
  return ingredienti.map(function(ing) {
    var copy = { name: ing.name || ing.nome, unit: ing.unit || ing.unita || 'g' };
    var q = ing.quantity != null ? ing.quantity : ing.quantita;
    if (typeof q === 'number' && !isNaN(q)) {
      copy.quantity = Math.round(q * factor * 100) / 100;
      if (copy.quantity === Math.floor(copy.quantity)) copy.quantity = Math.floor(copy.quantity);
    } else if (q != null && q !== '') {
      copy.quantity = q;
    }
    return copy;
  });
}

var currentRecipePorzioni = 1; /* porzioni selezionate nel modale ricetta */

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
/* Ingredienti di base (spezie, sale, olio, aceto, erbe...): sempre in dispensa, mai extra piano, salvo esclusi da profilo */
var INGREDIENTI_BASE_KEYS = [
  'sale', 'olio', 'aceto', 'prezzemolo', 'pepe', 'curcuma', 'paprika', 'origano', 'rosmarino', 'basilico',
  'brodo', 'soia', 'aglio', 'cipolla', 'limone', 'miele', 'tahini', 'menta', 'salvia', 'timo', 'alloro',
  'noce moscata', 'cannella', 'zenzero', 'chiodi di garofano', 'senape', 'vaniglia', 'spezie', 'erbe aromatiche'
];

function isIngredienteBase(ingName) {
  if (!ingName) return false;
  var nl = safeStr(ingName).toLowerCase().trim();
  if (!nl) return false;
  return INGREDIENTI_BASE_KEYS.some(function(key) {
    return nl.indexOf(key) !== -1 || key.indexOf(nl) !== -1;
  });
}

function isIngredienteBaseEsclusoDaProfilo(ingName) {
  if (!isIngredienteBase(ingName)) return false;
  var dp = (typeof dietProfile !== 'undefined' && dietProfile) ? dietProfile : {};
  var allergenici = Array.isArray(dp.allergenici) ? dp.allergenici : [];
  if (!allergenici.length) return false;
  var nl = safeStr(ingName).toLowerCase().trim();
  return allergenici.some(function(a) {
    var al = (a || '').toLowerCase().trim();
    return al && (nl.indexOf(al) !== -1 || al.indexOf(nl) !== -1);
  });
}

function isIngredientAvailableInDispensa(ingName) {
  if (!ingName) return false;
  var name = safeStr(ingName).trim();
  if (isIngredienteBase(name) && !isIngredienteBaseEsclusoDaProfilo(name)) return true;
  if (typeof pantryItems === 'undefined' || !pantryItems) return false;
  var nl = name.toLowerCase();
  return Object.keys(pantryItems).some(function(k) {
    return k && pantryItems[k] && (pantryItems[k].quantity || 0) > 0 &&
      (k.toLowerCase().trim() === nl || k.toLowerCase().includes(nl) || nl.includes(k.toLowerCase().trim()));
  });
}

function getFridgeKeys() {
  if (typeof pantryItems === 'undefined' || !pantryItems) return [];
  return Object.keys(pantryItems).filter(function(k){
    return k && k !== 'undefined' && pantryItems[k] && (pantryItems[k].quantity||0) > 0;
  });
}

/* Restituisce ingredienti del piano per uno specifico pasto */
function getPianoAlimentareIngNamesForMeal(mealKey) {
  if (typeof pianoAlimentare === 'undefined' || !pianoAlimentare || !pianoAlimentare[mealKey]) return [];
  var names = [];
  var seen  = {};
  var meal = pianoAlimentare[mealKey];
  if (!meal || typeof meal !== 'object') return [];
  Object.keys(meal).forEach(function(catKey) {
    var arr = meal[catKey];
    if (!Array.isArray(arr)) return;
    arr.forEach(function(item) {
      if (item && item.name && !seen[item.name]) {
        seen[item.name] = true;
        names.push(item.name.toLowerCase().trim());
      }
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
  return names;
}

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
  return names;
}

function isIngExtraPiano(ingName) {
  if (!ingName) return false;
  if (isIngredienteBase(ingName)) return false; /* ingredienti di base non sono mai extra piano */
  var pianoNames = getPianoAlimentareIngNames();
  if (!pianoNames.length) return false;
  var nl = ingName.toLowerCase().trim();
  return !pianoNames.some(function(pn) {
    return pn === nl || pn.includes(nl) || nl.includes(pn);
  });
}

function countExtraPiano(ings) {
  if (!Array.isArray(ings)) return 0;
  var pianoNames = getPianoAlimentareIngNames();
  if (!pianoNames.length) return 0;
  return ings.filter(function(ing) {
    return isIngExtraPiano(safeStr(ing.name || ing.nome));
  }).length;
}
function countAvailable(ings) {
  if (!Array.isArray(ings)) return 0;
  return ings.filter(function(ing){
    var n = safeStr(ing.name||ing.nome).toLowerCase().trim();
    if (!n) return false;
    if (isIngredienteBase(n) && !isIngredienteBaseEsclusoDaProfilo(n)) return true;
    var keys = getFridgeKeys();
    if (!keys.length) return false;
    return keys.some(function(k){
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
  if (typeof aiRecipes!=='undefined' && Array.isArray(aiRecipes))
    aiRecipes.forEach(function(r){
      if(r&&(r.name||r.nome)) out.push(Object.assign({},r,{isAI:true}));
    });
  return out;
}

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

  var groups = {};
  list.forEach(function(r) {
    var key = r.subcategory || '__default__';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  var html = '';
  if (groups['__default__'] && groups['__default__'].length) {
    html += '<div class="rc-group">' +
      '<div class="rc-group-title" style="--gc:var(--primary);">' +
        '🤖 Generate<span class="rc-group-count">' + groups['__default__'].length + '</span>' +
      '</div>' +
      '<div class="rc-grid">' +
        groups['__default__'].map(function(r) { return buildCard(Object.assign({}, r, { isAI: true })); }).join('') +
      '</div>' +
    '</div>';
  }
  Object.keys(groups).forEach(function(key) {
    if (key === '__default__') return;
    var items = groups[key];
    html += '<div class="rc-group">' +
      '<div class="rc-group-title" style="--gc:#10b981;">' +
        '⭐ ' + key + '<span class="rc-group-count">' + items.length + '</span>' +
      '</div>' +
      '<div class="rc-grid">' +
        items.map(function(r) { return buildCard(Object.assign({}, r, { isAI: true })); }).join('') +
      '</div>' +
    '</div>';
  });

  el.innerHTML = html;
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

function deleteAIRicettaById(id) {
  if (!Array.isArray(aiRecipes)) return;
  var idx = aiRecipes.findIndex(function(r) { return r.id === id; });
  if (idx === -1) return;
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

function showRicetteTab(tab, btn) {
  document.querySelectorAll('#ricettePage .page-tab-content').forEach(function(c){ c.classList.remove('active'); });
  document.querySelectorAll('#ricettePage .page-tab').forEach(function(t){ t.classList.remove('active'); });
  var el = document.getElementById(tab==='catalogo'?'ricetteTabCatalogo':'ricetteTabMie');
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
  if (tab==='catalogo') renderRicettePage();
  if (tab==='mie')      renderCustomRicette();
}

function renderRicettePage() { buildFilterRow(); renderRicetteGrid(); }

function buildFilterRow() {
  var row = document.getElementById('ricetteFilterRow');
  if (!row) return;
  if (ricetteFilterExtra === 'preferiti' || ricetteFilterExtra === 'disponibili') ricetteFilterExtra = '';
  var hasDiet = typeof dietProfile !== 'undefined' && dietProfile && Object.keys(dietProfile).some(function(k){ return k !== 'allergenici' && dietProfile[k]; });
  var compatLabels = { all: 'Compatibilità', compatibili: 'Solo compatibili', non_compatibili: 'Solo non compatibili' };
  var compatLabel = compatLabels[ricetteFilterCompatibili] || 'Compatibilità';

  var compatPills = ['all','compatibili','non_compatibili'].map(function(k){
    var lab = k==='all'?'Tutte':(k==='compatibili'?'Solo compatibili':'Solo non compatibili');
    return '<button class="rf-pill rf-pill-compat'+(ricetteFilterCompatibili===k?' active':'')+'" onclick="setRicetteFilterCompatibili(\''+k+'\',this)">'+lab+'</button>';
  }).join('');

  var dietaPill = hasDiet
    ? '<button class="rf-pill rf-pill-extra'+(ricetteFilterExtra==='dieta'?' active':'')+'" onclick="setRicetteFilterExtra(\'dieta\',this)">Dieta mia</button>'
    : '';

  row.innerHTML =
    '<details class="ricette-filter-detail" id="ricetteFilterCompatDetail">' +
      '<summary class="ricette-filter-summary">' + compatLabel + '</summary>' +
      '<div class="ricette-filter-body">' + compatPills + dietaPill + '</div>' +
    '</details>';
}
function setRicetteFilterCompatibili(key, btn) {
  ricetteFilterCompatibili = key || 'all';
  document.querySelectorAll('.rf-pill-compat').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderRicetteGrid();
}
function setRicetteFilterIngredienti(key, btn) {
  ricetteFilterIngredienti = key || 'solo_piano';
  document.querySelectorAll('.rf-pill-ing').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderRicetteGrid();
}
function setRicetteFilterExtra(key, btn) {
  ricetteFilterExtra = (ricetteFilterExtra === key) ? '' : (key || '');
  document.querySelectorAll('.rf-pill-extra').forEach(function(b){ b.classList.remove('active'); });
  if (ricetteFilterExtra && btn) btn.classList.add('active');
  renderRicetteGrid();
}
function filterRicette(query) {
  ricetteSearchQuery = (query||'').trim().toLowerCase();
  renderRicetteGrid();
}

function renderRicetteGrid() {
  var grid = document.getElementById('ricetteGrid');
  if (!grid) return;
  var fridgeKeys = getFridgeKeys();
  var all = getAllRicette().filter(function(r){
    /* Filtro compatibilità dieta (profilo / allergie / evitati) */
    if (ricetteFilterCompatibili === 'compatibili' && !isDietCompatible(r)) return false;
    if (ricetteFilterCompatibili === 'non_compatibili' && isDietCompatible(r)) return false;

    /* Ricerca testuale */
    if (ricetteSearchQuery) {
      var nm = safeStr(r.name||r.nome).toLowerCase();
      var ings = (Array.isArray(r.ingredienti)?r.ingredienti:[])
        .map(function(i){ return safeStr(i.name||i.nome).toLowerCase(); }).join(' ');
      if (!nm.includes(ricetteSearchQuery) && !ings.includes(ricetteSearchQuery)) return false;
    }

    /* Filtri extra */
    if (ricetteFilterExtra === 'preferiti' && !isFavorito(safeStr(r.name||r.nome))) return false;
    if (ricetteFilterExtra === 'disponibili') {
      var ings2 = Array.isArray(r.ingredienti) ? r.ingredienti : [];
      var avail2 = countAvailable(ings2);
      if (ings2.length === 0 || Math.round((avail2/ings2.length)*100) < 60) return false;
    }
    if (ricetteFilterExtra === 'dieta' && !isDietCompatible(r)) return false;
    return true;
  });
  if (!all.length) {
    grid.innerHTML='<div class="empty-state"><div class="empty-state-icon">🔍</div>'+
                   '<h3>Nessuna ricetta trovata</h3><p>Prova altri termini o cambia filtro.</p></div>';
    return;
  }
  if (!ricetteSearchQuery) {
    grid.innerHTML = buildGroupedGrid(all);
  } else {
    grid.innerHTML = '<div class="rc-grid">'+all.map(buildCard).join('')+'</div>';
  }
}

function buildGroupedGrid(list) {
  var order  = ['colazione','spuntino','pranzo','merenda','cena'];
  var meta   = {colazione:{icon:'☀️',name:'Colazione'},spuntino:{icon:'🍎',name:'Spuntino'},
                pranzo:{icon:'🍽',name:'Pranzo'},merenda:{icon:'🥪',name:'Merenda'},
                cena:{icon:'🌙',name:'Cena'},_altro:{icon:'🧂',name:'Altro'}};
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
    var m=meta[p]||meta._altro;
    var color=pastoColor(p==='_altro'?'':p);
    html+='<details class="fi-group fi-group-collapsible" style="--gc:'+color+'">'+
            '<summary class="fi-group-header">'+
              '<span class="fi-group-icon">'+m.icon+'</span>'+
              '<span class="fi-group-name">'+m.name+'</span>'+
              '<span class="fi-group-count">'+items.length+'</span>'+
            '</summary>'+
            '<div class="fi-list" style="padding:12px 16px;"><div class="rc-grid">'+items.map(buildCard).join('')+'</div></div>'+
          '</details>';
  });
  return html;
}

function buildCard(r) {
  if (!r) return '';
  var name       = safeStr(r.name||r.nome||'Ricetta');
  var icon       = safeStr(r.icon||r.icona||'🍽');
  var ings       = Array.isArray(r.ingredienti)?r.ingredienti:[];
  var isCustom   = Boolean(r.isCustom);
  var isAI       = Boolean(r.isAI);
  var isFav      = isFavorito(name);
  var dietOk     = isDietCompatible(r);
  var hasDietProfile = typeof dietProfile !== 'undefined' && dietProfile && Object.keys(dietProfile).some(function(k){ return k !== 'allergenici' && dietProfile[k]; });
  var tot        = ings.length;
  var avail      = countAvailable(ings);
  var extraCount = countExtraPiano(ings);
  var pct        = tot?Math.round((avail/tot)*100):0;
  var color      = pastoColor(r.pasto);
  var pLabel     = pastoLabel(r.pasto);
  var fridgeKeys = getFridgeKeys();
  var pianoNames = getPianoAlimentareIngNames();
  var hasExtraCheck = pianoNames.length > 0;

  var stateCls = pct>=80?'badge-ok':pct>=40?'badge-warn':'badge-grey';
  var stateTxt = pct>=80?'✔ Disponibile':pct>=40?'◑ Parziale':'○ Da acquistare';

  var extraBadge = '';
  if (hasExtraCheck && extraCount > 0) {
    extraBadge = '<span class="rc-badge badge-extra">⚠ ' + extraCount + ' extra piano</span>';
  } else if (hasExtraCheck && extraCount === 0 && tot > 0) {
    extraBadge = '<span class="rc-badge badge-inpiano">✓ Nel piano</span>';
  }

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
    accHtml += '<div style="display:flex;gap:8px;margin-top:2px;">' +
               '<button class="rc-detail-btn" style="flex:1;" '+
               'onclick="event.stopPropagation();openRecipeModal(\''+esc(name)+'\')">'+
               'Preparazione →</button>'+
               (isAI && r.id
                 ? '<button class="rc-detail-btn" style="background:#fde8e8;color:#dc2626;white-space:nowrap;" '+
                   'onclick="event.stopPropagation();deleteAIRicettaById(\''+esc(r.id)+'\')">🗑 Elimina</button>'
                 : '')+
               '</div>';
  }

  return (
    '<div class="rc-card'+(isCustom?' rc-custom':'')+'" '+
         'style="--cc:'+color+'" '+
         'onclick="toggleRicettaCard(this,\''+esc(name)+'\')" '+
         'data-name="'+esc(name)+'">'+

      '<div class="rc-card-head">'+
        '<div class="rc-icon-wrap">'+icon+'</div>'+
        '<div class="rc-info">'+
          '<div class="rc-name">'+name+'</div>'+
          '<div class="rc-meta">'+
            (pLabel?'<span class="rc-pasto" style="color:'+color+'">'+pLabel+'</span>':'') +
            (isCustom?'<span class="rc-badge">⭐ Mia</span>':'')+
            (isAI?'<span class="rc-badge" style="background:#e8f4fd;color:#1a73e8;">🤖 AI</span>':'')+
            '<span class="rc-badge '+stateCls+'">'+stateTxt+'</span>'+
            extraBadge+
            (hasDietProfile && dietOk ? '<span class="rc-badge badge-diet">🌿 Compatibile</span>' : '')+
            (hasDietProfile && !dietOk ? '<span class="rc-badge badge-diet-no">⚠ Non compatibile</span>' : '')+
          '</div>'+
        '</div>'+
        '<button class="fav-btn'+(isFav?' fav-on':'')+'" '+
                'onclick="toggleFavorito(\''+esc(name)+'\',event)" '+
                'title="'+(isFav?'Rimuovi dai preferiti':'Aggiungi ai preferiti')+'" '+
                'aria-label="'+(isFav?'Rimuovi dai preferiti':'Aggiungi ai preferiti')+'">'+
          (isFav?'★':'☆')+
        '</button>'+
        '<span class="rc-chevron">'+
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">'+
            '<path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'+
          '</svg>'+
        '</span>'+
      '</div>'+

      (accHtml?'<div class="rc-accordion"><div class="rc-accordion-inner">'+accHtml+'</div></div>':'')+

    '</div>'
  );
}

function toggleRicettaCard(el, name) {
  var wasOpen = el.classList.contains('open');
  document.querySelectorAll('.rc-card.open').forEach(function(c){ c.classList.remove('open'); });
  if (!wasOpen) el.classList.add('open');
}

function openRecipeModal(name) {
  if (!name) return;
  currentRecipeName = name;
  var r = findRicetta(name);
  if (!r) return;
  var modal = document.getElementById('recipeModal');
  var title = document.getElementById('recipeModalTitle');
  var body  = document.getElementById('recipeModalBody');
  if (!modal||!body) return;

  var basePorzioni = getRecipeBasePorzioni(r);
  currentRecipePorzioni = basePorzioni;

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

  /* Select numero persone: regola le quantità mostrate */
  var persOpts = '';
  for (var i = 1; i <= 12; i++) {
    persOpts += '<option value="'+i+'"'+(i === currentRecipePorzioni ? ' selected' : '')+'>'+i+(i===1?' persona':' persone')+'</option>';
  }
  html += '<div class="rm-porzioni-row">'+
    '<label class="rm-porzioni-label">Per</label>'+
    '<select id="recipeModalPorzioni" class="rm-porzioni-select" onchange="updateRecipeModalPorzioni(this.value)">'+persOpts+'</select>'+
    '<span class="rm-porzioni-suffix">persone</span>'+
  '</div>';

  var pianoNames = getPianoAlimentareIngNames();
  var hasExtraCheck = pianoNames.length > 0;
  var ingsScaled = scaleIngredientiForPorzioni(ings, basePorzioni, currentRecipePorzioni);

  if (ingsScaled.length) {
    var extraCount = countExtraPiano(ings);
    if (hasExtraCheck && extraCount > 0) {
      html += '<div class="rm-extra-notice">⚠ ' + extraCount + ' ingredient' +
              (extraCount === 1 ? 'e' : 'i') +
              ' non present' + (extraCount === 1 ? 'e' : 'i') +
              ' nel tuo piano alimentare</div>';
    }
    html += '<p class="rm-section-label">Ingredienti</p><ul class="rm-ing-list">';
    ingsScaled.forEach(function(ing){
      var n  = safeStr(ing.name||ing.nome);
      var nl = n.toLowerCase().trim();
      var ok = fridgeKeys.some(function(k){
        var kl=k.toLowerCase().trim(); return kl===nl||kl.includes(nl)||nl.includes(kl);
      });
      var extra = hasExtraCheck && isIngExtraPiano(n);
      var qty= (ing.quantity!= null && ing.quantity !== '' || ing.quantita != null && ing.quantita !== '')
        ?'<span class="rm-qty">'+safeStr(ing.quantity!= null ? ing.quantity : ing.quantita)+'\u00a0'+safeStr(ing.unit||ing.unita||'g')+'</span>':'';
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

  var preparataBtn = document.getElementById('recipeModalPreparataBtn');
  if (preparataBtn) {
    var fromOggiOrEdit = (typeof currentPage !== 'undefined' && (currentPage === 'piano' || currentPage === 'edit-day') &&
      typeof selectedMeal !== 'undefined' && selectedDateKey);
    preparataBtn.style.display = fromOggiOrEdit ? '' : 'none';
  }
  modal.classList.add('active');
}

function closeRecipeModal() {
  var m = document.getElementById('recipeModal');
  if (m) m.classList.remove('active');
  currentRecipeName = null;
}

function updateRecipeModalPorzioni(val) {
  var n = parseInt(val, 10);
  if (isNaN(n) || n < 1) n = 1;
  if (n > 12) n = 12;
  currentRecipePorzioni = n;
  if (!currentRecipeName) return;
  var r = findRicetta(currentRecipeName);
  if (!r) return;
  var body = document.getElementById('recipeModalBody');
  var listEl = body ? body.querySelector('.rm-ing-list') : null;
  if (!listEl || !Array.isArray(r.ingredienti) || !r.ingredienti.length) return;
  var basePorzioni = getRecipeBasePorzioni(r);
  var ingsScaled = scaleIngredientiForPorzioni(r.ingredienti, basePorzioni, currentRecipePorzioni);
  var fridgeKeys = getFridgeKeys();
  var pianoNames = getPianoAlimentareIngNames();
  var hasExtraCheck = pianoNames.length > 0;
  var html = '';
  ingsScaled.forEach(function(ing){
    var nameIng = safeStr(ing.name||ing.nome);
    var nl = nameIng.toLowerCase().trim();
    var ok = fridgeKeys.some(function(k){
      var kl=k.toLowerCase().trim(); return kl===nl||kl.includes(nl)||nl.includes(kl);
    });
    var extra = hasExtraCheck && isIngExtraPiano(nameIng);
    var qty = (ing.quantity != null && ing.quantity !== '' || ing.quantita != null && ing.quantita !== '')
      ? '<span class="rm-qty">'+safeStr(ing.quantity != null ? ing.quantity : ing.quantita)+'\u00a0'+safeStr(ing.unit||ing.unita||'g')+'</span>' : '';
    html += '<li class="rm-ing'+(ok?' ok':'')+(extra?' rm-extra':'')+'">'+
      '<span class="rm-check">'+(ok?'✔':'○')+'</span>'+
      '<span class="rm-ing-name">'+nameIng+'</span>'+qty+
      (extra?'<span class="rm-extra-tag">extra piano</span>':'')+
    '</li>';
  });
  listEl.innerHTML = html;
}

function addRecipeIngredientsToSpesa() {
  if (!currentRecipeName) return;
  var r = findRicetta(currentRecipeName);
  if (!r) return;
  var basePorzioni = getRecipeBasePorzioni(r);
  var targetPorzioni = (typeof currentRecipePorzioni === 'number' && currentRecipePorzioni >= 1) ? currentRecipePorzioni : basePorzioni;
  var ings = scaleIngredientiForPorzioni(Array.isArray(r.ingredienti) ? r.ingredienti : [], basePorzioni, targetPorzioni);
  if (!ings.length) { if (typeof showToast==='function') showToast('Nessun ingrediente da aggiungere','warning'); return; }
  if (typeof spesaItems === 'undefined') spesaItems = [];
  if (typeof pushUndo === 'function') pushUndo('Aggiungi ' + currentRecipeName + ' alla spesa');
  var added = 0, updated = 0, skipped = 0;

  ings.forEach(function(ing){
    var name   = safeStr(ing.name || ing.nome).trim();
    if (!name) return;
    var needed = parseFloat(ing.quantity) || 0;
    var unit   = ing.unit || 'g';

    var inPantry = 0;
    if (typeof pantryItems !== 'undefined' && pantryItems) {
      var nl = name.toLowerCase();
      var pKey = pantryItems[name] ? name :
        Object.keys(pantryItems).find(function(k){ var kl=k.toLowerCase(); return kl===nl||kl.includes(nl)||nl.includes(kl); }) || null;
      if (pKey) inPantry = pantryItems[pKey].quantity || 0;
    }

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

function applyRecipeToMeal() {
  if (!currentRecipeName) return;
  var r = findRicetta(currentRecipeName); if (!r) return;
  var pasto = Array.isArray(r.pasto)?(r.pasto[0]||'pranzo'):(r.pasto||'pranzo');
  if (!pianoAlimentare[pasto]) pianoAlimentare[pasto]={principale:[],contorno:[],frutta:[],extra:[]};
  if (!Array.isArray(pianoAlimentare[pasto].principale)) pianoAlimentare[pasto].principale=[];
  var basePorzioni = getRecipeBasePorzioni(r);
  var targetPorzioni = (typeof currentRecipePorzioni === 'number' && currentRecipePorzioni >= 1) ? currentRecipePorzioni : basePorzioni;
  var ings = scaleIngredientiForPorzioni(Array.isArray(r.ingredienti) ? r.ingredienti : [], basePorzioni, targetPorzioni);
  var added=0;
  ings.forEach(function(ing){
    var nm=safeStr(ing.name||ing.nome).trim(); if(!nm) return;
    var exists=pianoAlimentare[pasto].principale.some(function(i){
      return safeStr(i.name).toLowerCase()===nm.toLowerCase();
    });
    if (!exists){ pianoAlimentare[pasto].principale.push({name:nm,quantity:ing.quantity||null,unit:ing.unit||'g'}); added++; }
  });
  saveData(); closeRecipeModal();
  if (typeof renderMealPlan==='function') renderMealPlan();
  if (typeof renderProfilo==='function')  renderProfilo();
  if (added > 0) {
    if (typeof showToast === 'function') showToast('✅ ' + added + ' ingredienti aggiunti — ' + pastoLabel(pasto) + '!', 'success');
    if (typeof showCompletionCelebration === 'function') showCompletionCelebration();
  } else if (typeof showToast === 'function') showToast('ℹ️ Già presenti nel piano.', 'info');
}

/* Segna ricetta come preparata (da pagina Oggi): salva in storico, sottrae ingredienti dalla dispensa, celebrazione */
function markRecipeAsPreparedAndClose() {
  var recipeName = currentRecipeName;
  if (!recipeName || typeof selectedMeal === 'undefined' || !selectedDateKey) return;
  var r = findRicetta(recipeName);
  if (!r) return;
  var basePorzioni = getRecipeBasePorzioni(r);
  var targetPorzioni = (typeof currentRecipePorzioni === 'number' && currentRecipePorzioni >= 1) ? currentRecipePorzioni : basePorzioni;
  var ings = scaleIngredientiForPorzioni(Array.isArray(r.ingredienti) ? r.ingredienti : [], basePorzioni, targetPorzioni);
  if (typeof appHistory === 'undefined') appHistory = {};
  if (!appHistory[selectedDateKey]) appHistory[selectedDateKey] = { usedItems: {}, substitutions: {}, ricette: {} };
  if (!appHistory[selectedDateKey].ricette) appHistory[selectedDateKey].ricette = {};
  if (!appHistory[selectedDateKey].ricette[selectedMeal]) appHistory[selectedDateKey].ricette[selectedMeal] = {};
  appHistory[selectedDateKey].ricette[selectedMeal][recipeName] = true;

  if (typeof pantryItems !== 'undefined' && pantryItems && ings.length) {
    ings.forEach(function(ing) {
      var iname = (ing.name || ing.nome || '').trim();
      if (!iname) return;
      var qty = parseFloat(ing.quantity || ing.quantita) || 0;
      if (qty <= 0) return;
      var key = Object.keys(pantryItems).find(function(k) {
        return k.toLowerCase().trim() === iname.toLowerCase();
      });
      if (!key) return;
      var cur = parseFloat(pantryItems[key].quantity) || 0;
      pantryItems[key].quantity = Math.max(0, cur - qty);
    });
  }

  if (typeof saveData === 'function') saveData();
  closeRecipeModal();
  if (typeof showRecipeCelebration === 'function') showRecipeCelebration();
  if (typeof showToast === 'function') showToast('🍽 ' + recipeName + ' segnata come preparata!', 'success');
  if (typeof renderMealItems === 'function') renderMealItems();
  if (typeof renderPianoRicette === 'function') renderPianoRicette();
  if (typeof renderFridge === 'function') renderFridge();
}

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
