/*
   PROFILO.JS — v4  stile rc-card unificato
*/

var profiloEditMode  = false;
var editMealPlanData = null;

/* ── ENTRY POINT ── */
function renderProfilo() {
  var el = document.getElementById('profiloPage');
  if (!el) return;
  el.innerHTML =
    buildProfiloUserSection() +
    buildProfiloPianoSection() +
    buildProfiloLimitiSection() +
    buildProfiloStoricoSection();
  /* Render storico nell'apposito contenitore */
  if (typeof renderStorico === 'function') renderStorico('profiloStoricoContent');
}

/* ══════════════════════════════════════════════
   SEZIONE UTENTE
══════════════════════════════════════════════ */
function buildProfiloUserSection() {
  var user = (typeof currentUser !== 'undefined') ? currentUser : null;
  return (
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:20px 20px 16px;">' +
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">' +
          '<div style="width:52px;height:52px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:1.6rem;">👤</div>' +
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
   SEZIONE LIMITI
══════════════════════════════════════════════ */
function buildProfiloLimitiSection() {
  var limiti = (typeof weeklyLimits !== 'undefined') ? weeklyLimits : {};
  var items  = [
    { key:'carne',    label:'Carne',    emoji:'🥩', unit:'volte/sett.' },
    { key:'pesce',    label:'Pesce',    emoji:'🐟', unit:'volte/sett.' },
    { key:'uova',     label:'Uova',     emoji:'🥚', unit:'volte/sett.' },
    { key:'latticini',label:'Latticini',emoji:'🥛', unit:'volte/sett.' },
    { key:'legumi',   label:'Legumi',   emoji:'🌱', unit:'volte/sett.' },
    { key:'cereali',  label:'Cereali',  emoji:'🌾', unit:'porzioni/g' },
    { key:'frutta',   label:'Frutta',   emoji:'🍎', unit:'pz/gg'      },
    { key:'verdura',  label:'Verdura',  emoji:'🥦', unit:'porzioni/gg' }
  ];

  var rows = items.map(function(it){
    var val = (limiti[it.key] !== undefined) ? limiti[it.key] : '—';
    return (
      '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<span style="font-size:1.2em;width:28px;text-align:center;">'+it.emoji+'</span>' +
        '<span style="flex:1;font-weight:500;">'+it.label+'</span>' +
        '<span style="font-size:.8em;color:var(--text-3);margin-right:8px;">'+it.unit+'</span>' +
        '<input type="number" min="0" step="1" value="'+val+'" ' +
               'onchange="saveLimitChange(\''+it.key+'\',this.value)" ' +
               'style="width:64px;text-align:center;padding:5px 8px;border:1.5px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);font-size:.95em;">' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:20px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
          '<span style="font-weight:700;font-size:1em;">📊 Limiti settimanali</span>' +
          '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">'+items.length+' voci</span>' +
        '</div>' +
        rows +
      '</div>' +
    '</div>'
  );
}

function saveLimitChange(key, val) {
  if (typeof weeklyLimits === 'undefined') return;
  weeklyLimits[key] = parseFloat(val) || 0;
  saveData();
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
      var plan  = (mealPlan && mealPlan[m.key]) ? mealPlan[m.key] : {};
      var items = [];
      ['principale','contorno','frutta','extra'].forEach(function(cat){
        if (Array.isArray(plan[cat])) plan[cat].forEach(function(i){
          if (i && i.name) items.push(i);
        });
      });

      var ingHtml = items.length
        ? items.map(function(i){
            var qty = i.quantity ? ' <span class="rc-badge" style="font-size:.75em;">'+i.quantity+' '+(i.unit||'g')+'</span>' : '';
            return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">'+
                     '<span style="color:var(--text-3);font-size:.85em;">•</span>'+
                     '<span style="flex:1;font-size:.92em;">'+i.name+'</span>'+
                     qty+
                   '</div>';
          }).join('')
        : '<p style="color:var(--text-3);font-size:.85em;padding:6px 0;">Nessun alimento impostato.</p>';

      return (
        '<div class="rc-card rc-accordion-card" style="margin-bottom:10px;">' +
          '<div class="rc-accordion-header" onclick="toggleProfiloPasto(this)">' +
            '<span style="font-size:1.1em;">'+m.emoji+'</span>' +
            '<span style="flex:1;font-weight:600;margin-left:10px;">'+m.label+'</span>' +
            '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);margin-right:8px;">'+items.length+' ing.</span>' +
            '<span class="rc-accordion-arrow">▾</span>' +
          '</div>' +
          '<div class="rc-accordion-body" style="max-height:0;overflow:hidden;transition:max-height .3s ease;">' +
            '<div style="padding:0 18px 14px;">'+ingHtml+'</div>' +
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
  var data   = editMealPlanData || JSON.parse(JSON.stringify(mealPlan||{}));
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
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;" data-meal="'+m.key+'" data-idx="'+idx+'" data-cat="'+i._cat+'">' +
        '<input list="ingredientiDatalist" class="profilo-ing-name" value="'+escQP(i.name)+'" '+
               'style="flex:2;padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);font-size:.9em;">' +
        '<input type="number" class="profilo-ing-qty" value="'+qty+'" placeholder="qtà" '+
               'style="width:64px;padding:7px 8px;border:1.5px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);font-size:.9em;text-align:center;">' +
        '<select class="profilo-ing-unit" style="padding:7px 6px;border:1.5px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);font-size:.9em;">' +
          ['g','ml','pz','fette','cucchiai','cucchiaini','porzione','kg','l'].map(function(u){
            return '<option value="'+u+'"'+(i.unit===u?' selected':'')+'>'+u+'</option>';
          }).join('') +
        '</select>' +
        '<button class="rc-btn-icon" onclick="removeEditRow(this)" title="Rimuovi">🗑️</button>' +
      '</div>';
    }).join('');

    return (
      '<div class="rc-card" style="margin-bottom:12px;">' +
        '<div style="padding:16px 18px;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
            '<span style="font-size:1.1em;">'+m.emoji+'</span>' +
            '<span style="font-weight:700;">'+m.label+'</span>' +
          '</div>' +
          '<div class="edit-rows-wrap" data-meal="'+m.key+'">'+rows+'</div>' +
          '<button class="rc-btn rc-btn-outline rc-btn-sm" onclick="addEditRow(\''+m.key+'\')" style="margin-top:8px;">＋ Aggiungi</button>' +
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
  editMealPlanData = JSON.parse(JSON.stringify(mealPlan||{}));
  renderProfilo();
}

function cancelEditPiano() {
  profiloEditMode  = false;
  editMealPlanData = null;
  renderProfilo();
}

function addEditRow(mealKey) {
  var wrap = document.querySelector('.edit-rows-wrap[data-meal="'+mealKey+'"]');
  if (!wrap) return;
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
  row.setAttribute('data-meal', mealKey);
  row.setAttribute('data-cat',  'principale');
  row.innerHTML =
    '<input list="ingredientiDatalist" class="profilo-ing-name" placeholder="Ingrediente" '+
           'style="flex:2;padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);font-size:.9em;">' +
    '<input type="number" class="profilo-ing-qty" placeholder="qtà" '+
           'style="width:64px;padding:7px 8px;border:1.5px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);font-size:.9em;text-align:center;">' +
    '<select class="profilo-ing-unit" style="padding:7px 6px;border:1.5px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);font-size:.9em;">' +
      ['g','ml','pz','fette','cucchiai','cucchiaini','porzione','kg','l'].map(function(u){
        return '<option value="'+u+'">'+u+'</option>';
      }).join('') +
    '</select>' +
    '<button class="rc-btn-icon" onclick="removeEditRow(this)">🗑️</button>';
  wrap.appendChild(row);
}

function removeEditRow(btn) {
  var row = btn.closest('[data-meal]');
  if (row) row.remove();
}

function saveEditPiano() {
  var newPlan = {};
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk){
    newPlan[mk] = { principale:[], contorno:[], frutta:[], extra:[] };
  });
  document.querySelectorAll('.edit-rows-wrap').forEach(function(wrap){
    var mk = wrap.getAttribute('data-meal');
    if (!mk || !newPlan[mk]) return;
    wrap.querySelectorAll('[data-meal]').forEach(function(row){
      var nameEl = row.querySelector('.profilo-ing-name');
      var qtyEl  = row.querySelector('.profilo-ing-qty');
      var unitEl = row.querySelector('.profilo-ing-unit');
      var cat    = row.getAttribute('data-cat') || 'principale';
      if (!nameEl) return;
      var name   = nameEl.value.trim();
      if (!name) return;
      var qty    = parseFloat(qtyEl ? qtyEl.value : '') || null;
      var unit   = unitEl ? unitEl.value : 'g';
      if (!Array.isArray(newPlan[mk][cat])) newPlan[mk][cat] = [];
      newPlan[mk][cat].push({ name:name, quantity:qty, unit:unit });
    });
  });
  mealPlan        = newPlan;
  profiloEditMode = false;
  editMealPlanData= null;
  saveData();
  renderProfilo();
  if (typeof renderMealPlan === 'function') renderMealPlan();
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

/* ── UTILITY ── */
function escQP(str) { return String(str||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
