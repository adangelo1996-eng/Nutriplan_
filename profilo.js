/*
   PROFILO.JS — v6  Step 2 Enhanced Limits + Step 4 Wizard Detection
*/

var profiloEditMode  = false;
var editMealPlanData = null;

/* STEP 4: Check if meal plan is empty */
function isPianoAlimentareEmpty() {
  if (!pianoAlimentare || typeof pianoAlimentare !== 'object') return true;
  
  var meals = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
  var totalItems = 0;
  
  meals.forEach(function(meal) {
    if (!pianoAlimentare[meal] || typeof pianoAlimentare[meal] !== 'object') return;
    ['principale', 'contorno', 'frutta', 'extra'].forEach(function(cat) {
      if (Array.isArray(pianoAlimentare[meal][cat])) {
        totalItems += pianoAlimentare[meal][cat].length;
      }
    });
  });
  
  return totalItems === 0;
}

/* ── ENTRY POINT ── */
function renderProfilo() {
  var el = document.getElementById('profiloPage');
  if (!el) return;
  
  /* STEP 4: Show wizard invite if plan is empty */
  var wizardInvite = '';
  if (isPianoAlimentareEmpty()) {
    wizardInvite = 
      '<div class="rc-card" style="margin-bottom:16px;padding:24px;text-align:center;">' +
        '<div style="font-size:3rem;margin-bottom:12px;">🧙‍♂️</div>' +
        '<div style="font-weight:800;font-size:1.1em;margin-bottom:8px;">Piano Alimentare Vuoto</div>' +
        '<div style="font-size:.88em;color:var(--text-3);margin-bottom:16px;">Crea il tuo piano settimanale guidato passo-passo</div>' +
        '<button class="rc-btn rc-btn-primary" onclick="startMealPlanWizard()" style="padding:12px 24px;font-size:.95em;">' +
          '✨ Avvia Wizard di Configurazione' +
        '</button>' +
      '</div>';
  }
  
  el.innerHTML =
    wizardInvite +
    buildProfiloUserSection() +
    buildProfiloDietaSection() +
    buildProfiloLimitiSection() +
    buildProfiloStoricoSection() +
    buildProfiloSettingsSection();
  /* Render storico nell'apposito contenitore */
  if (typeof renderStorico === 'function') renderStorico('profiloStoricoContent');
}

/* ══════════════════════════════════════════════
   SEZIONE VINCOLI DIETA
══════════════════════════════════════════════ */
function buildProfiloDietaSection() {
  var dp = (typeof dietProfile !== 'undefined' && dietProfile) ? dietProfile : {};
  var flags = [
    { key:'vegetariano',  emoji:'🥦', label:'Vegetariano',    sub:'No carne, no pesce' },
    { key:'vegano',       emoji:'🌱', label:'Vegano',          sub:'No prodotti animali' },
    { key:'senzaLattosio',emoji:'🥛', label:'Senza Lattosio',  sub:'No latticini' },
    { key:'senzaGlutine', emoji:'🌾', label:'Senza Glutine',   sub:'No grano, pasta, pane' }
  ];
  var allergenici = Array.isArray(dp.allergenici) ? dp.allergenici : [];

  var togglesHtml = flags.map(function(f) {
    var on = Boolean(dp[f.key]);
    return '<div class="settings-row" onclick="toggleDietPref(\\''+f.key+'\\')" style="cursor:pointer;">' +
      '<div class="settings-row-icon">'+f.emoji+'</div>' +
      '<div class="settings-row-info">' +
        '<div class="settings-row-label">'+f.label+'</div>' +
        '<div class="settings-row-sub">'+f.sub+'</div>' +
      '</div>' +
      '<div class="diet-toggle'+(on?' diet-toggle-on':'')+'">' +
        '<div class="diet-toggle-knob"></div>' +
      '</div>' +
    '</div>';
  }).join('');

  var allergensHtml =
    '<div style="padding:12px 16px 14px;">' +
      '<div style="font-size:.82em;font-weight:700;color:var(--text-2);margin-bottom:8px;">🚫 Ingredienti da evitare (allergenici / intolleranze)</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;" id="allergenTagsWrap">' +
        (allergenici.length
          ? allergenici.map(function(a){
              return '<span class="allergen-tag">'+a+
                '<button onclick="removeAllergen(\\''+a.replace(/'/g,"\\\\'")+'\\')'" aria-label="Rimuovi">✕</button></span>';
            }).join('')
          : '<span style="font-size:.8em;color:var(--text-3);font-style:italic;">Nessun ingrediente aggiunto</span>'
        ) +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
        '<input type="text" id="allergenInput" placeholder="Es. arachidi, soia…" ' +
               'style="flex:1;padding:7px 10px;border-radius:var(--r-md);border:1.5px solid var(--border);' +
               'background:var(--bg-subtle);font-size:.86em;color:var(--text-1);outline:none;" ' +
               'onkeydown="if(event.key===\\'Enter\\')addAllergen()">' +
        '<button class="rc-btn rc-btn-primary" style="padding:7px 14px;font-size:.86em;" onclick="addAllergen()">＋</button>' +
      '</div>' +
    '</div>';

  return (
    '<div class="rc-card settings-section" style="margin-bottom:16px;">' +
      '<div class="settings-section-title">🌿 Vincoli Dieta</div>' +
      togglesHtml +
      allergensHtml +
    '</div>'
  );
}

function toggleDietPref(key) {
  if (typeof dietProfile === 'undefined') dietProfile = {};
  dietProfile[key] = !Boolean(dietProfile[key]);
  /* Se vegano → implica anche vegetariano */
  if (key === 'vegano' && dietProfile.vegano) dietProfile.vegetariano = true;
  if (key === 'vegetariano' && !dietProfile.vegetariano) dietProfile.vegano = false;
  if (typeof saveData === 'function') saveData();
  renderProfilo();
  if (typeof buildFilterRow === 'function') buildFilterRow();
}

function addAllergen() {
  var inp = document.getElementById('allergenInput');
  if (!inp) return;
  var val = inp.value.trim();
  if (!val) return;
  if (typeof dietProfile === 'undefined') dietProfile = {};
  if (!Array.isArray(dietProfile.allergenici)) dietProfile.allergenici = [];
  if (dietProfile.allergenici.indexOf(val) === -1) {
    dietProfile.allergenici.push(val);
    if (typeof saveData === 'function') saveData();
    renderProfilo();
  }
}

function removeAllergen(name) {
  if (typeof dietProfile === 'undefined' || !Array.isArray(dietProfile.allergenici)) return;
  dietProfile.allergenici = dietProfile.allergenici.filter(function(a){ return a !== name; });
  if (typeof saveData === 'function') saveData();
  renderProfilo();
}

/* ══════════════════════════════════════════════
   SEZIONE UTENTE
══════════════════════════════════════════════ */
function buildProfiloUserSection() {
  var user = (typeof currentUser !== 'undefined') ? currentUser : null;
  var avatarHtml = user && user.photoURL
    ? '<img src="' + user.photoURL + '" class="profilo-avatar" alt="Foto profilo" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'">' +
      '<div class="profilo-avatar-placeholder" style="display:none;">👤</div>'
    : '<div class="profilo-avatar-placeholder">👤</div>';

  return (
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:20px 20px 16px;">' +
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">' +
          '<div style="flex-shrink:0;">' + avatarHtml + '</div>' +
          '<div>' +
            '<div style="font-weight:700;font-size:1.05em;">' + (user ? (user.displayName||user.email||'Utente') : 'Ospite') + '</div>' +
            '<div style="font-size:.82em;color:var(--text-3);">' + (user ? (user.email||'') : 'Non connesso') + '</div>' +
          '</div>' +
        '</div>' +
        (user
          ? '<button class="rc-btn rc-btn-outline" onclick="signOut()" style="width:100%;">🚪 Esci</button>'
          : '<button class="rc-btn rc-btn-primary" onclick="signInWithGoogle()" style="width:100%;">🔑 Accedi con Google</button>' +
            '<p style="font-size:.8em;color:var(--text-3);margin-top:8px;text-align:center;">Accedi per sincronizzare i dati su tutti i dispositivi.</p>'
        ) +
      '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════════
   SEZIONE LIMITI SETTIMANALI — NUOVO STILE GRIGLIA
══════════════════════════════════════════════ */
function buildProfiloLimitiSection() {
  var limiti = (typeof weeklyLimits !== 'undefined') ? weeklyLimits : {};
  var items  = [
    { key:'carne',    label:'Carne',    emoji:'🥩', unit:'volte' },
    { key:'pesce',    label:'Pesce',    emoji:'🐟', unit:'volte' },
    { key:'uova',     label:'Uova',     emoji:'🥚', unit:'volte' },
    { key:'latticini',label:'Latticini',emoji:'🥛', unit:'volte' },
    { key:'legumi',   label:'Legumi',   emoji:'🌱', unit:'volte' },
    { key:'cereali',  label:'Cereali',  emoji:'🌾', unit:'porz.' },
    { key:'frutta',   label:'Frutta',   emoji:'🍎', unit:'pz'    },
    { key:'verdura',  label:'Verdura',  emoji:'🥦', unit:'porz.' }
  ];

  var cards = items.map(function(it){
    var lim  = limiti[it.key] || { current:0, max:0 };
    var cur  = lim.current || 0;
    var max  = lim.max     || 0;
    var pct  = (max > 0) ? Math.min(100, Math.round((cur / max) * 100)) : 0;

    var stateClass = '';
    if (max > 0) {
      if (cur >= max) stateClass = 'exceeded';
      else if (cur >= max * 0.8) stateClass = 'warning';
    }

    var text = max > 0 ? cur + ' / ' + max + ' ' + it.unit : '—';

    return (
      '<div class="limit-card '+ stateClass +'">' +
        '<div class="limit-card-icon">'+it.emoji+'</div>' +
        '<div class="limit-card-name">'+it.label+'</div>' +
        '<div class="limit-progress-bar">' +
          '<div class="limit-progress-fill '+stateClass+'" style="width:'+pct+'%;"></div>' +
        '</div>' +
        '<div class="limit-text '+stateClass+'">'+text+'</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:18px 20px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">' +
        '<div>' +
          '<div style="font-weight:800;font-size:1.05em;margin-bottom:2px;">📊 Limiti settimanali</div>' +
          '<div style="font-size:.75em;color:var(--text-3);">Monitoraggio consumo settimanale</div>' +
        '</div>' +
        '<button class="rc-btn rc-btn-outline rc-btn-sm" onclick="openLimitiSettings()" style="white-space:nowrap;">⚙️ Modifica</button>' +
      '</div>' +
      '<div class="limits-grid" style="padding:14px 16px 16px;">' +
        cards +
      '</div>' +
    '</div>'
  );
}

function openLimitiSettings() {
  /* Apre la pagina Piano Alimentare dove si possono modificare i limiti */
  if (typeof goToPage === 'function') {
    goToPage('piano-alimentare');
    if (typeof showToast === 'function') {
      setTimeout(function(){
        showToast('💡 Scorri fino alla sezione \"Limiti settimanali\" per modificare i valori', 'info');
      }, 300);
    }
  }
}

/* ══════════════════════════════════════════════
   SEZIONE PIANO ALIMENTARE
══════════════════════════════════════════════ */
function buildProfiloPianoSection() {
  var meals = [
    { key:'colazione', emoji:'☀️', label:'Colazione' },
    { key:'spuntino',  emoji:'🍎', label:'Spuntino'  },
    { key:'pranzo',    emoji:'🍽', label:'Pranzo'    },
    { key:'merenda',   emoji:'🥪', label:'Merenda'   },
    { key:'cena',      emoji:'🌙', label:'Cena'      }
  ];

  if (!profiloEditMode) {
    /* ── VISTA LETTURA ── */
    var cards = meals.map(function(m){
      var plan  = (pianoAlimentare && pianoAlimentare[m.key]) ? pianoAlimentare[m.key] : {};
      var items = [];
      ['principale','contorno','frutta','extra'].forEach(function(cat){
        if (Array.isArray(plan[cat])) plan[cat].forEach(function(i){
          if (i && i.name) items.push(i);
        });
      });

      var ingHtml = items.length
        ? '<div style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0 2px;">'+
            items.map(function(i){
              var qty = i.quantity ? '<span style="font-size:.72rem;color:var(--text-light);margin-left:4px;font-weight:700;">'+i.quantity+' '+(i.unit||'g')+'</span>' : '';
              return '<div style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-subtle);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:5px 10px;font-size:.88rem;font-weight:500;">'+
                       i.name+qty+
                     '</div>';
            }).join('')+
          '</div>'
        : '<p style="color:var(--text-3);font-size:.85em;padding:6px 0;">Nessun alimento impostato.</p>';

      return (
        '<div class="rc-card rc-accordion-card" style="margin-bottom:10px;">' +
          '<div class="rc-accordion-header" onclick="toggleProfiloPasto(this)" style="padding:14px 18px;">' +
            '<span style="font-size:1.3em;">'+m.emoji+'</span>' +
            '<span style="flex:1;font-weight:700;font-size:1em;margin-left:12px;">'+m.label+'</span>' +
            '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);margin-right:10px;font-size:.8em;">'+items.length+' ing.</span>' +
            '<span class="rc-accordion-arrow" style="font-size:1em;">▾</span>' +
          '</div>' +
          '<div class="rc-accordion-body" style="max-height:0;overflow:hidden;transition:max-height .3s ease;">' +
            '<div style="padding:6px 18px 16px;">'+ingHtml+'</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div style="margin-bottom:16px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
          '<span style="font-weight:700;font-size:1em;">🌿 Piano alimentare</span>' +
          '<button class="rc-btn rc-btn-primary rc-btn-sm" onclick="startEditPiano()">✏️ Modifica</button>' +
        '</div>' +
        cards +
      '</div>'
    );
  }

  /* ── VISTA MODIFICA ── */
  var data   = editMealPlanData || JSON.parse(JSON.stringify(pianoAlimentare||{}));
  var fields = meals.map(function(m){
    var plan  = data[m.key] || {};
    var items = [];
    ['principale','contorno','frutta','extra'].forEach(function(cat){
      if (Array.isArray(plan[cat])) plan[cat].forEach(function(i){
        if (i && i.name) items.push(Object.assign({},i,{_cat:cat}));
      });
    });

    var rows = items.map(function(i, idx){
      var qty = i.quantity||'';
      return '<div class="profilo-ing-row" data-cat="'+i._cat+'" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<input class="form-input profilo-ing-name" list="ingredientiAutocomplete" autocomplete="off" ' +
               'oninput="populateIngAutocomplete&&populateIngAutocomplete()" ' +
               'value="'+_escHtml(i.name)+'" placeholder="Ingrediente" ' +
               'style="flex:2;min-width:0;">' +
        '<input type="number" class="form-input profilo-ing-qty" value="'+qty+'" placeholder="qtà" ' +
               'style="width:68px;text-align:center;">' +
        '<select class="form-input profilo-ing-unit" style="width:80px;padding:8px 4px;">' +
          ['g','ml','pz','fette','cucchiai','cucchiaini','porzione','kg','l'].map(function(u){
            return '<option value="'+u+'"'+(i.unit===u?' selected':'')+'>'+u+'</option>';
          }).join('') +
        '</select>' +
        '<button class="rc-btn-icon" onclick="removeEditRow(this)" title="Rimuovi" style="flex-shrink:0;">🗑️</button>' +
      '</div>';
    }).join('');

    return (
      '<div class="rc-card" style="margin-bottom:12px;">' +
        '<div style="padding:16px 18px;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
            '<span style="font-size:1.1em;">'+m.emoji+'</span>' +
            '<span style="font-weight:700;">'+m.label+'</span>' +
          '</div>' +
          '<div class="profilo-ing-rows" id="profilo-rows-'+m.key+'">'+rows+'</div>' +
          '<button class="rc-btn rc-btn-outline rc-btn-sm" onclick="addEditRow(\\''+m.key+'\\')" style="margin-top:8px;">＋ Aggiungi</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div style="margin-bottom:16px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
        '<span style="font-weight:700;font-size:1em;">✏️ Modifica piano</span>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="rc-btn rc-btn-outline rc-btn-sm" onclick="cancelEditPiano()">Annulla</button>' +
          '<button class="rc-btn rc-btn-primary rc-btn-sm" onclick="saveEditPiano()">💾 Salva</button>' +
        '</div>' +
      '</div>' +
      fields +
    '</div>'
  );
}

/* ── ACCORDION PASTO (vista lettura) ── */
function toggleProfiloPasto(header) {
  var body = header.nextElementSibling;
  if (!body) return;
  var open = body.style.maxHeight && body.style.maxHeight !== '0px';
  /* chiudi tutti */
  document.querySelectorAll('#profiloPage .rc-accordion-body').forEach(function(b){
    b.style.maxHeight = '0px';
  });
  document.querySelectorAll('#profiloPage .rc-accordion-arrow').forEach(function(a){
    a.textContent = '▾';
  });
  if (!open) {
    body.style.maxHeight = body.scrollHeight + 'px';
    header.querySelector('.rc-accordion-arrow').textContent = '▴';
  }
}

/* ── EDIT PIANO ── */
function startEditPiano() {
  profiloEditMode  = true;
  editMealPlanData = JSON.parse(JSON.stringify(pianoAlimentare||{}));
  renderProfilo();
}

function cancelEditPiano() {
  profiloEditMode  = false;
  editMealPlanData = null;
  renderProfilo();
}

function addEditRow(mealKey) {
  var wrap = document.getElementById('profilo-rows-'+mealKey);
  if (!wrap) return;
  var row = document.createElement('div');
  row.className = 'profilo-ing-row';
  row.setAttribute('data-cat', 'principale');
  row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  row.innerHTML =
    '<input class="form-input profilo-ing-name" list="ingredientiAutocomplete" autocomplete="off" ' +
           'oninput="populateIngAutocomplete&&populateIngAutocomplete()" ' +
           'placeholder="Ingrediente" style="flex:2;min-width:0;">' +
    '<input type="number" class="form-input profilo-ing-qty" placeholder="qtà" style="width:68px;text-align:center;">' +
    '<select class="form-input profilo-ing-unit" style="width:80px;padding:8px 4px;">' +
      ['g','ml','pz','fette','cucchiai','cucchiaini','porzione','kg','l'].map(function(u){
        return '<option value="'+u+'">'+u+'</option>';
      }).join('') +
    '</select>' +
    '<button class="rc-btn-icon" onclick="removeEditRow(this)" style="flex-shrink:0;">🗑️</button>';
  wrap.appendChild(row);
  /* focus sul nuovo campo nome */
  var inp = row.querySelector('.profilo-ing-name');
  if (inp) setTimeout(function(){ inp.focus(); }, 50);
  if (typeof populateIngAutocomplete === 'function') populateIngAutocomplete();
}

function removeEditRow(btn) {
  var row = btn.closest('.profilo-ing-row');
  if (row) row.remove();
}

function saveEditPiano() {
  var meals = ['colazione','spuntino','pranzo','merenda','cena'];
  var newPlan = {};
  meals.forEach(function(mk){ newPlan[mk] = { principale:[], contorno:[], frutta:[], extra:[] }; });

  meals.forEach(function(mk){
    var wrap = document.getElementById('profilo-rows-'+mk);
    if (!wrap) return;
    wrap.querySelectorAll('.profilo-ing-row').forEach(function(row){
      var nameEl = row.querySelector('.profilo-ing-name');
      var qtyEl  = row.querySelector('.profilo-ing-qty');
      var unitEl = row.querySelector('.profilo-ing-unit');
      if (!nameEl) return;
      var name = nameEl.value.trim();
      if (!name) return;
      var cat  = row.getAttribute('data-cat') || 'principale';
      var qty  = parseFloat(qtyEl ? qtyEl.value : '') || null;
      var unit = unitEl ? unitEl.value : 'g';
      if (!Array.isArray(newPlan[mk][cat])) newPlan[mk][cat] = [];
      newPlan[mk][cat].push({ name:name, quantity:qty, unit:unit });
    });
  });

  /* Fondi il piano editato in pianoAlimentare, preservando le categorie nutrizionali extra */
  if (!pianoAlimentare || typeof pianoAlimentare !== 'object') pianoAlimentare = {};
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk) {
    if (!pianoAlimentare[mk] || typeof pianoAlimentare[mk] !== 'object') pianoAlimentare[mk] = {};
    ['principale','contorno','frutta','extra'].forEach(function(cat) {
      pianoAlimentare[mk][cat] = newPlan[mk] ? (newPlan[mk][cat] || []) : [];
    });
  });
  profiloEditMode = false;
  editMealPlanData= null;
  saveData();
  renderProfilo();
  if (typeof renderMealPlan === 'function') renderMealPlan();
  if (typeof showToast === 'function') showToast('✅ Piano alimentare salvato','success');
}

/* ══════════════════════════════════════════════
   SEZIONE STORICO (incorporata nel profilo)
══════════════════════════════════════════════ */
function buildProfiloStoricoSection() {
  return (
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:16px 20px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);">' +
        '<span style="font-size:1.3em;">📅</span>' +
        '<span style="font-weight:700;font-size:1.05em;">Storico pasti</span>' +
      '</div>' +
      '<div style="padding:16px 20px;">' +
        '<div id="profiloStoricoContent"></div>' +
      '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════════
   SEZIONE IMPOSTAZIONI
══════════════════════════════════════════════ */
function buildProfiloSettingsSection() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  var rows = [
    {
      icon: isDark ? '☀️' : '🌙',
      label: isDark ? 'Tema: Scuro' : 'Tema: Chiaro',
      sub: 'Cambia tra tema chiaro e scuro',
      action: 'toggleDarkMode()',
      right: '<span class="settings-toggle '+(isDark?'on':'')+'\"></span>'
    },
    {
      icon: '📚',
      label: 'Guida introduttiva',
      sub: 'Rivedi il tutorial passo-passo',
      action: 'if(typeof resetTutorial===\\'function\\')resetTutorial()',
      right: '<span class="settings-row-arrow">›</span>'
    },
    {
      icon: '📄',
      label: 'Esporta PDF',
      sub: 'Stampa piano, dispensa e storico',
      action: 'if(typeof exportPDF===\\'function\\')exportPDF()',
      right: '<span class="settings-row-arrow">›</span>'
    },
    {
      icon: '🔒',
      label: 'Privacy Policy',
      sub: 'Informativa sul trattamento dei dati',
      action: 'if(typeof openPrivacyModal===\\'function\\')openPrivacyModal()',
      right: '<span class="settings-row-arrow">›</span>'
    },
    {
      icon: '🗑️',
      label: 'Cancella tutti i dati',
      sub: 'Rimuove permanentemente tutti i dati',
      action: 'confirmClearAllData()',
      right: '<span class="settings-row-arrow" style="color:var(--danger);">›</span>',
      danger: true
    }
  ];

  var html = rows.map(function(r){
    return '<div class="settings-row" onclick="'+r.action+'"'+(r.danger?' style="color:var(--danger);"':'')+'>'+
      '<div class="settings-row-icon"'+(r.danger?' style="background:color-mix(in srgb,var(--danger) 12%,var(--bg-subtle));"':'')+'>'+r.icon+'</div>'+
      '<div class="settings-row-info">'+
        '<div class="settings-row-label">'+r.label+'</div>'+
        '<div class="settings-row-sub">'+r.sub+'</div>'+
      '</div>'+
      r.right+
    '</div>';
  }).join('');

  return (
    '<div class="rc-card settings-section" style="margin-bottom:16px;">'+
      '<div class="settings-section-title">⚙️ Impostazioni</div>'+
      html+
    '</div>'
  );
}

function confirmClearAllData() {
  var modal = document.getElementById('confirmDeleteModal');
  if (modal) {
    modal.classList.add('active');
  } else {
    /* Fallback per sicurezza */
    if (!confirm('Cancellare TUTTI i dati di NutriPlan?\\nQuesta operazione è irreversibile.')) return;
    executeDeleteAllData();
  }
}

function closeConfirmDeleteModal() {
  var modal = document.getElementById('confirmDeleteModal');
  if (modal) modal.classList.remove('active');
}

function executeDeleteAllData() {
  closeConfirmDeleteModal();

  /* Azzeramento locale */
  if (typeof pantryItems          !== 'undefined') pantryItems          = {};
  if (typeof appHistory           !== 'undefined') appHistory           = {};
  if (typeof spesaItems           !== 'undefined') spesaItems           = [];
  if (typeof pianoAlimentare      !== 'undefined') pianoAlimentare      = {};
  if (typeof weeklyLimitsCustom   !== 'undefined') weeklyLimitsCustom   = {};
  if (typeof customRecipes        !== 'undefined') customRecipes        = [];
  if (typeof customIngredients    !== 'undefined') customIngredients    = [];
  if (typeof savedFridges         !== 'undefined') savedFridges         = {};
  if (typeof weeklyLimits         !== 'undefined') {
    Object.keys(weeklyLimits).forEach(function(k) {
      if (weeklyLimits[k]) weeklyLimits[k].current = 0;
    });
  }

  /* Marca come \"cancellato esplicitamente\" per impedire il ripristino
     automatico del piano di default (ensureDefaultPlan / initStorage) */
  try { localStorage.setItem('nutriplan_cleared', '1'); } catch(e) {}

  /* Elimina localStorage principale e ri-salva vuoto */
  try { localStorage.removeItem('nutriplan_v2'); } catch(e) {}
  if (typeof saveData === 'function') saveData();

  /* Elimina anche da Firebase se l'utente è loggato */
  var user = (typeof currentUser !== 'undefined') ? currentUser : null;
  if (user && typeof firebase !== 'undefined' && firebase.database) {
    try {
      firebase.database()
        .ref('users/' + user.uid + '/nutriplan')
        .remove()
        .catch(function(e) { console.warn('Firebase remove error:', e); });
    } catch(e) {}
  }

  /* Aggiorna tutte le viste */
  renderProfilo();
  if (typeof renderMealPlan === 'function') renderMealPlan();
  if (typeof renderFridge   === 'function') renderFridge();
  if (typeof showToast      === 'function') showToast('🗑️ Tutti i dati eliminati', 'info');
}

/* STEP 4: Wizard trigger (placeholder - implement full wizard separately) */
function startMealPlanWizard() {
  /* Navigate to Piano Alimentare page */
  if (typeof goToPage === 'function') {
    goToPage('piano-alimentare');
  }
  
  /* Show instructions */
  if (typeof showToast === 'function') {
    setTimeout(function() {
      showToast('💡 Inizia aggiungendo ingredienti per ogni pasto', 'info', 5000);
    }, 500);
  }
  
  /* Future: Implement full step-by-step wizard with:
     - Step 1: Select meals to configure
     - Step 2: Add ingredients per meal
     - Step 3: Set weekly limits
     - Step 4: Review and save
  */
}

/* ── UTILITY ── */
function escQP(str) { return String(str||'').replace(/'/g,"\\\\'").replace(/"/g,'&quot;'); }
function _escHtml(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
