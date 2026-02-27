/* ============================================================
   PIANO_GEN.JS — Generatore piano alimentare guidato
   - Wizard dati utente (profilo, attività, obiettivo)
   - Calcolo BMR/TDEE e macro approssimati
   - Proposta piano basata su defaultMealPlan scalato
   - Scrittura in pianoAlimentare (struttura categorie)
   - Verifica opzionale con AI (Gemini) in background
============================================================ */

var pgState = {
  step: 1,
  profile: {
    sex: 'F',
    age: '',
    weight: '',
    height: '',
    activity: 'moderato',
    goal: 'mantenimento'
  },
  tdee: null,
  macros: null,
  factor: 1,
  draftPlan: null,
  verification: {
    status: 'idle', // idle | pending | ok | fail
    reason: null,
    risk: null,
    autoAdjusted: false
  }
};

var PG_BASELINE_KCAL = 2000;

function pgRoundQuantity(q, unit) {
  if (!q) return 0;
  var u = (unit || 'g').toLowerCase();
  if (u === 'g' || u === 'ml') {
    return Math.round(q / 10) * 10;
  }
  return Math.round(q);
}

function pgCaptureProfileFromInputs() {
  if (pgState.step !== 1) return;
  var sexEl    = document.getElementById('pgSex');
  var ageEl    = document.getElementById('pgAge');
  var weightEl = document.getElementById('pgWeight');
  var heightEl = document.getElementById('pgHeight');
  var actEl    = document.getElementById('pgActivity');
  var goalEl   = document.getElementById('pgGoal');
  if (!sexEl || !ageEl || !weightEl || !heightEl || !actEl || !goalEl) return;
  var prev = pgState.profile || {};
  var age    = parseInt(ageEl.value, 10);
  var weight = parseFloat(weightEl.value);
  var height = parseFloat(heightEl.value);
  pgState.profile = {
    sex: sexEl.value === 'M' ? 'M' : 'F',
    age: isNaN(age)    ? (prev.age    || '') : age,
    weight: isNaN(weight) ? (prev.weight || '') : weight,
    height: isNaN(height) ? (prev.height || '') : height,
    activity: actEl.value || prev.activity || 'moderato',
    goal: goalEl.value || prev.goal || 'mantenimento'
  };
}

function renderPianoGenPage() {
  var el = document.getElementById('pianoGenContent');
  if (!el) return;

  var s = pgState;

  if (s.step === 1) {
    el.innerHTML = buildPgStep1();
  } else if (s.step === 2) {
    el.innerHTML = buildPgStep2();
  } else {
    el.innerHTML = buildPgStep3();
  }
}

function buildPgStep1() {
  var p = pgState.profile;
  return '' +
    '<div style="margin-bottom:10px;display:flex;gap:8px;font-size:.78em;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;font-weight:600;">' +
      '<span style="color:var(--primary);">1 • Profilo</span>' +
      '<span>2 • Fabbisogno</span>' +
      '<span>3 • Piano</span>' +
    '</div>' +
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:18px 18px 4px;">' +
        '<div style="font-weight:700;font-size:1rem;margin-bottom:4px;">Il tuo profilo</div>' +
        '<p style="font-size:.85em;color:var(--text-3);margin-bottom:14px;">Useremo pochi dati essenziali per proporti un piano di base.</p>' +
        '<div class="row gap-12" style="margin-bottom:10px;">' +
          '<div class="form-group" style="flex:1;min-width:120px;">' +
            '<label>Sesso</label>' +
            '<select id="pgSex">' +
              '<option value="F"' + (p.sex === 'F' ? ' selected' : '') + '>Donna</option>' +
              '<option value="M"' + (p.sex === 'M' ? ' selected' : '') + '>Uomo</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="width:120px;">' +
            '<label>Età</label>' +
            '<input type="number" id="pgAge" min="14" max="90" placeholder="Anni" value="' + (p.age || '') + '">' +
          '</div>' +
        '</div>' +
        '<div class="row gap-12" style="margin-bottom:10px;">' +
          '<div class="form-group" style="flex:1;min-width:120px;">' +
            '<label>Peso</label>' +
            '<div class="row gap-6">' +
              '<input type="number" id="pgWeight" min="30" max="250" placeholder="es. 70" value="' + (p.weight || '') + '" style="flex:1;">' +
              '<span style="align-self:center;font-size:.85em;color:var(--text-3);">kg</span>' +
            '</div>' +
          '</div>' +
          '<div class="form-group" style="flex:1;min-width:120px;">' +
            '<label>Altezza</label>' +
            '<div class="row gap-6">' +
              '<input type="number" id="pgHeight" min="130" max="220" placeholder="es. 170" value="' + (p.height || '') + '" style="flex:1;">' +
              '<span style="align-self:center;font-size:.85em;color:var(--text-3);">cm</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:10px;">' +
          '<label>Livello di attività</label>' +
          '<select id="pgActivity">' +
            '<option value="sedentario"' + (p.activity === 'sedentario' ? ' selected' : '') + '>Sedentario (poca o nessuna attività)</option>' +
            '<option value="moderato"'   + (p.activity === 'moderato'   ? ' selected' : '') + '>Moderato (2-3 allenamenti a settimana)</option>' +
            '<option value="intenso"'    + (p.activity === 'intenso'    ? ' selected' : '') + '>Intenso (4+ allenamenti a settimana)</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:4px;">' +
          '<label>Obiettivo</label>' +
          '<select id="pgGoal">' +
            '<option value="dimagrimento"' + (p.goal === 'dimagrimento' ? ' selected' : '') + '>Perdita di peso</option>' +
            '<option value="mantenimento"' + (p.goal === 'mantenimento' ? ' selected' : '') + '>Mantenimento</option>' +
            '<option value="massa"'        + (p.goal === 'massa'        ? ' selected' : '') + '>Aumento massa muscolare</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
    '</div>' +
    pgBuildDietPrefsCard() +
    '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;">' +
      '<button class="btn btn-secondary" onclick="goToPage && goToPage(\'piano-alimentare\')">Annulla</button>' +
      '<button class="btn btn-primary" onclick="pgNextFromStep1()">Prosegui →</button>' +
    '</div>';
}

function pgNextFromStep1() {
  var sexEl     = document.getElementById('pgSex');
  var ageEl     = document.getElementById('pgAge');
  var weightEl  = document.getElementById('pgWeight');
  var heightEl  = document.getElementById('pgHeight');
  var actEl     = document.getElementById('pgActivity');
  var goalEl    = document.getElementById('pgGoal');

  if (!sexEl || !ageEl || !weightEl || !heightEl || !actEl || !goalEl) return;

  var sex    = sexEl.value === 'M' ? 'M' : 'F';
  var age    = parseInt(ageEl.value, 10);
  var weight = parseFloat(weightEl.value);
  var height = parseFloat(heightEl.value);
  var activity = actEl.value || 'moderato';
  var goal     = goalEl.value || 'mantenimento';

  if (!age || age < 14 || age > 90 || !weight || weight < 30 || weight > 250 || !height || height < 130 || height > 220) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Inserisci dati validi per età, peso e altezza', 'warning');
    }
    return;
  }

  pgState.profile = {
    sex: sex,
    age: age,
    weight: weight,
    height: height,
    activity: activity,
    goal: goal
  };

  var bmr;
  if (sex === 'M') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  var actFactor = activity === 'sedentario' ? 1.3 : activity === 'moderato' ? 1.5 : 1.7;
  var tdee = Math.round(bmr * actFactor);

  if (goal === 'dimagrimento') {
    tdee = Math.round(tdee * 0.85);
  } else if (goal === 'massa') {
    tdee = Math.round(tdee * 1.10);
  }

  var carbsKcal   = Math.round(tdee * 0.5);
  var proteinKcal = Math.round(tdee * 0.25);
  var fatKcal     = tdee - carbsKcal - proteinKcal;

  var macros = {
    kcal: tdee,
    carbsG: Math.round(carbsKcal / 4),
    proteinG: Math.round(proteinKcal / 4),
    fatG: Math.round(fatKcal / 9)
  };

  var factor = tdee / PG_BASELINE_KCAL;
  if (factor < 0.8) factor = 0.8;
  if (factor > 1.4) factor = 1.4;

  pgState.tdee   = tdee;
  pgState.macros = macros;
  pgState.factor = factor;
  pgState.step   = 2;
  renderPianoGenPage();
}

function buildPgStep2() {
  var p = pgState.profile;
  var m = pgState.macros || { kcal: 0, carbsG: 0, proteinG: 0, fatG: 0 };
  var factor = pgState.factor || 1;
  var goalLabel =
    p.goal === 'dimagrimento' ? 'Perdita di peso' :
    p.goal === 'massa'        ? 'Aumento massa muscolare' :
    'Mantenimento';

  var dist = {
    colazione: 0.25,
    spuntino:  0.10,
    pranzo:    0.35,
    merenda:   0.10,
    cena:      0.20
  };

  var mealPerc = {
    colazione: Math.round(dist.colazione * 100),
    spuntino:  Math.round(dist.spuntino  * 100),
    pranzo:    Math.round(dist.pranzo    * 100),
    merenda:   Math.round(dist.merenda   * 100)
  };
  mealPerc.cena = 100 - mealPerc.colazione - mealPerc.spuntino - mealPerc.pranzo - mealPerc.merenda;

  var carbsPct   = m.kcal ? Math.round(((m.carbsG   * 4) / m.kcal) * 100) : 0;
  var proteinPct = m.kcal ? Math.round(((m.proteinG * 4) / m.kcal) * 100) : 0;
  var fatPct     = 100 - carbsPct - proteinPct;

  function mealK(label) {
    return Math.round(m.kcal * dist[label]);
  }

  var macroMeals = ['☀️ Colazione','🍎 Spuntino','🍽 Pranzo','🥪 Merenda','🌙 Cena'];
  var macroCardsHtml = macroMeals.map(function(lbl) {
    return (
      '<div class="pg-macro-card">' +
        '<div class="pg-macro-title">' + lbl + '</div>' +
        '<div class="pg-macro-pie" style="background:conic-gradient(' +
          '#22c55e 0 ' + carbsPct + '%,' +
          '#3b82f6 ' + carbsPct + '% ' + (carbsPct + proteinPct) + '%,' +
          '#eab308 ' + (carbsPct + proteinPct) + '% 100%);"></div>' +
        '<div class="pg-macro-legend">' +
          '<span><span class="pg-dot" style="background:#22c55e;"></span>Carboidrati ' + carbsPct + '%</span>' +
          '<span><span class="pg-dot" style="background:#3b82f6;"></span>Proteine ' + proteinPct + '%</span>' +
          '<span><span class="pg-dot" style="background:#eab308;"></span>Grassi ' + fatPct + '%</span>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  return '' +
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:18px 18px 10px;">' +
        '<div style="font-weight:700;font-size:1rem;margin-bottom:6px;">Il tuo fabbisogno</div>' +
        '<p style="font-size:.84em;color:var(--text-3);margin-bottom:10px;">Valori indicativi per organizzare i pasti; per indicazioni personalizzate rivolgiti a un professionista.</p>' +
        '<div class="row gap-12" style="margin-bottom:10px;">' +
          '<div style="flex:1;min-width:120px;">' +
            '<div style="font-size:.8em;color:var(--text-3);">Energia giornaliera stimata</div>' +
            '<div style="font-weight:800;font-size:1.1em;">' + m.kcal + ' kcal</div>' +
          '</div>' +
          '<div style="flex:1;min-width:120px;">' +
            '<div style="font-size:.8em;color:var(--text-3);">Obiettivo</div>' +
            '<div style="font-weight:600;font-size:.95em;">' + goalLabel + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="row gap-12">' +
          '<div style="flex:1;min-width:120px;">' +
            '<div style="font-size:.8em;color:var(--text-3);">Carboidrati (circa metà energia)</div>' +
            '<div style="font-weight:600;font-size:.95em;">' + m.carbsG + ' g/die</div>' +
          '</div>' +
          '<div style="flex:1;min-width:120px;">' +
            '<div style="font-size:.8em;color:var(--text-3);">Proteine</div>' +
            '<div style="font-weight:600;font-size:.95em;">' + m.proteinG + ' g/die</div>' +
          '</div>' +
          '<div style="flex:1;min-width:120px;">' +
            '<div style="font-size:.8em;color:var(--text-3);">Grassi</div>' +
            '<div style="font-weight:600;font-size:.95em;">' + m.fatG + ' g/die</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:16px 18px 12px;">' +
        '<div style="font-weight:700;font-size:.95em;margin-bottom:10px;">Come distribuiamo le calorie</div>' +
        '<div class="pg-pie-row">' +
          '<div class="pg-pie" style="background:conic-gradient(' +
            '#22c55e 0 ' + mealPerc.colazione + '%,' +
            '#f97316 ' + mealPerc.colazione + '% ' + (mealPerc.colazione + mealPerc.spuntino) + '%,' +
            '#3b82f6 ' + (mealPerc.colazione + mealPerc.spuntino) + '% ' + (mealPerc.colazione + mealPerc.spuntino + mealPerc.pranzo) + '%,' +
            '#eab308 ' + (mealPerc.colazione + mealPerc.spuntino + mealPerc.pranzo) + '% ' + (mealPerc.colazione + mealPerc.spuntino + mealPerc.pranzo + mealPerc.merenda) + '%,' +
            '#a855f7 ' + (mealPerc.colazione + mealPerc.spuntino + mealPerc.pranzo + mealPerc.merenda) + '% 100%);"></div>' +
          '<div class="pg-pie-legend">' +
            '<span><span class="pg-dot" style="background:#22c55e;"></span>☀️ Colazione ~' + mealK('colazione') + ' kcal (' + mealPerc.colazione + '%)</span>' +
            '<span><span class="pg-dot" style="background:#f97316;"></span>🍎 Spuntino ~'  + mealK('spuntino')  + ' kcal (' + mealPerc.spuntino  + '%)</span>' +
            '<span><span class="pg-dot" style="background:#3b82f6;"></span>🍽 Pranzo ~'    + mealK('pranzo')    + ' kcal (' + mealPerc.pranzo    + '%)</span>' +
            '<span><span class="pg-dot" style="background:#eab308;"></span>🥪 Merenda ~'   + mealK('merenda')   + ' kcal (' + mealPerc.merenda   + '%)</span>' +
            '<span><span class="pg-dot" style="background:#a855f7;"></span>🌙 Cena ~'      + mealK('cena')      + ' kcal (' + mealPerc.cena      + '%)</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:16px 18px 10px;">' +
        '<div style="font-weight:700;font-size:.95em;margin-bottom:8px;">Macronutrienti per pasto (in %)</div>' +
        '<div class="pg-macro-grid">' + macroCardsHtml + '</div>' +
        '<p class="pg-charts-summary" style="font-size:.8em;color:var(--text-3);margin:10px 0 0;">Il pranzo è il pasto più ricco; colazione e cena sono bilanciate.</p>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;">' +
      '<button class="btn btn-secondary" onclick="pgBackToStep1()">← Indietro</button>' +
      '<button class="btn btn-primary" onclick="pgBuildPlanAndGo()">Vedi piano proposto →</button>' +
    '</div>';
}

function pgBackToStep1() {
  pgState.step = 1;
  renderPianoGenPage();
}

function pgBuildPlanAndGo() {
  pgState.draftPlan = pgGeneratePlanFromDefault();
  pgState.verification = { status: 'pending', reason: null, risk: null, autoAdjusted: false };
  pgState.step = 3;
  renderPianoGenPage();
  pgRequestVerification();
}

function pgGeneratePlanFromDefault() {
  if (typeof defaultMealPlan === 'undefined') return {};

  var factor = pgState.factor || 1;
  var meals = ['colazione','spuntino','pranzo','merenda','cena'];
  var newPlan = {};

  meals.forEach(function(mk) {
    newPlan[mk] = {};
  });

  function getCat(name) {
    if (typeof paGetIngCat === 'function') {
      return paGetIngCat(name);
    }
    if (typeof _getCategoryForIngredient === 'function') {
      return _getCategoryForIngredient(name);
    }
    return '🧂 Altro';
  }

  // Costruisci un pool di ingredienti possibili per categoria (per alternative)
  var altPoolByCat = {};
  var seenByCatKey = {};

  meals.forEach(function(mk) {
    var src = defaultMealPlan[mk] || {};
    ['principale','contorno','frutta','extra'].forEach(function(legacyCat) {
      var arr = src[legacyCat];
      if (!Array.isArray(arr)) return;
      arr.forEach(function(item) {
        if (!item || !item.name) return;
        if (!pgIsIngredientAllowed(item.name)) return;
        var cat = getCat(item.name);
        var key = (cat || '🧂 Altro') + '|' + item.name.toLowerCase();
        if (seenByCatKey[key]) return;
        seenByCatKey[key] = true;
        if (!Array.isArray(altPoolByCat[cat])) altPoolByCat[cat] = [];
        altPoolByCat[cat].push({
          name: item.name,
          baseQty: item.quantity != null ? item.quantity : 100,
          unit: item.unit || 'g'
        });
      });
    });
  });

  // Estendi il pool con gli ingredienti di default, se presenti
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function(di) {
      if (!di || !di.name) return;
      if (!pgIsIngredientAllowed(di.name)) return;
      var cat = di.category || getCat(di.name);
      var key = (cat || '🧂 Altro') + '|' + di.name.toLowerCase();
      if (seenByCatKey[key]) return;
      seenByCatKey[key] = true;
      if (!Array.isArray(altPoolByCat[cat])) altPoolByCat[cat] = [];
      altPoolByCat[cat].push({
        name: di.name,
        baseQty: di.quantity != null ? di.quantity : 100,
        unit: di.unit || 'g'
      });
    });
  }

  meals.forEach(function(mk) {
    var src = defaultMealPlan[mk] || {};
    ['principale','contorno','frutta','extra'].forEach(function(legacyCat) {
      var arr = src[legacyCat];
      if (!Array.isArray(arr)) return;
      arr.forEach(function(item) {
        if (!item || !item.name) return;
        if (!pgIsIngredientAllowed(item.name)) return;
        var baseQty = item.quantity != null ? item.quantity : null;
        if (baseQty == null) return;
        var scaledRaw = baseQty * factor;
        var scaled = pgRoundQuantity(scaledRaw, item.unit || 'g');
        if (!scaled || scaled <= 0) scaled = baseQty;
        var cat = getCat(item.name);
        if (!Array.isArray(newPlan[mk][cat])) newPlan[mk][cat] = [];
        var nameLower = item.name.toLowerCase();
        var alts = [];
        var pool = altPoolByCat[cat] || [];
        var maxAlts = Math.min(3, Math.max(1, pool.length));
        for (var i = 0; i < pool.length && alts.length < maxAlts; i++) {
          var cand = pool[i];
          if (!cand || !cand.name) continue;
          var candLower = cand.name.toLowerCase();
          if (candLower === nameLower) continue;
          var already = alts.some(function(a) { return (a.name || '').toLowerCase() === candLower; });
          if (already) continue;
          var altBase = cand.baseQty != null ? cand.baseQty : baseQty;
          var altUnit = cand.unit || item.unit || 'g';
          var altRaw  = altBase * factor;
          var altQty  = pgRoundQuantity(altRaw, altUnit);
          if (!altQty || altQty <= 0) altQty = pgRoundQuantity(altBase, altUnit) || altBase;
          alts.push({
            name: cand.name,
            quantity: altQty,
            unit: altUnit
          });
        }
        newPlan[mk][cat].push({
          name: item.name,
          quantity: scaled,
          unit: item.unit || 'g',
          alternatives: alts
        });
      });
    });
  });

  return newPlan;
}

function pgIsIngredientAllowed(name) {
  if (typeof dietProfile === 'undefined' || !dietProfile) return true;
  var nl = (name || '').toLowerCase();

  var cat = null;
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    var d = defaultIngredients.find(function(i) {
      return i && i.name && i.name.toLowerCase() === nl;
    });
    if (d) cat = d.category || null;
  }
  if (!cat && typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    var c = customIngredients.find(function(i) {
      return i && i.name && i.name.toLowerCase() === nl;
    });
    if (c) cat = c.category || null;
  }

  var dp = dietProfile || {};
  if (dp.vegano) {
    if (cat === '🥩 Carne' || cat === '🐟 Pesce' || cat === '🥛 Latticini e Uova') return false;
    if (/uova|formagg|latte|yogurt|burro/i.test(nl)) return false;
  } else if (dp.vegetariano) {
    if (cat === '🥩 Carne' || cat === '🐟 Pesce') return false;
    if (/carne|prosciutt|bresaola|salame|pollo|tacchino|manzo|vitello|coniglio|pesce|salmone|tonno|merluzzo/i.test(nl)) return false;
  }

  if (dp.senzaLattosio) {
    if (cat === '🥛 Latticini e Uova' && !/senza lattosio/i.test(nl)) return false;
    if (/latte|formagg|yogurt|panna|burro|ricotta/i.test(nl) && !/senza lattosio/i.test(nl)) return false;
  }

  if (dp.senzaGlutine) {
    if (cat === '🌾 Cereali e Legumi') {
      if (/pasta|pane|couscous|farro|orzo|biscott|gnocchi|gallette|crackers|piadina|wasa/i.test(nl)) return false;
    }
  }

  if (Array.isArray(dp.allergenici) && dp.allergenici.length) {
    var blocked = dp.allergenici.some(function(a) {
      var al = (a || '').toLowerCase();
      return al && nl.indexOf(al) !== -1;
    });
    if (blocked) return false;
  }

  return true;
}

function buildPgStep3() {
  var plan = pgState.draftPlan || {};
  var meals = (typeof PA_MEALS !== 'undefined' && PA_MEALS && PA_MEALS.length)
    ? PA_MEALS
    : [
        { key:'colazione', emoji:'☀️', label:'Colazione' },
        { key:'spuntino',  emoji:'🍎', label:'Spuntino'  },
        { key:'pranzo',    emoji:'🍽', label:'Pranzo'    },
        { key:'merenda',   emoji:'🥪', label:'Merenda'   },
        { key:'cena',      emoji:'🌙', label:'Cena'      }
      ];

  var v = pgState.verification || { status:'idle' };
  var badge;
  if (v.status === 'pending') {
    badge = '<span class="rc-badge" style="background:var(--bg-subtle);color:var(--text-2);font-size:.75em;">Verifica AI in corso…</span>';
  } else if (v.status === 'ok') {
    if (v.autoAdjusted) {
      badge = '<span class="rc-badge" style="background:rgba(234,179,8,.12);color:#92400e;font-size:.75em;">⚠ AI ha suggerito correzioni — piano aggiornato automaticamente</span>';
    } else {
      badge = '<span class="rc-badge" style="background:rgba(34,197,94,.1);color:#16a34a;font-size:.75em;">✅ Piano verificato da AI</span>';
    }
  } else if (v.status === 'fail') {
    var r = v.reason || '';
    var msg;
    if (r === 'not_available' || r === 'no_response' || r === 'parse_error' || /API key Gemini non configurata/.test(r)) {
      msg = 'ℹ Verifica AI non attiva';
      badge = '<span class="rc-badge" style="background:var(--bg-subtle);color:var(--text-3);font-size:.75em;">' + msg + '</span>';
    } else {
      msg = '⚠ Verifica AI non riuscita';
      badge = '<span class="rc-badge" style="background:rgba(249,115,22,.08);color:#ea580c;font-size:.75em;">' + msg + '</span>';
    }
  } else {
    badge = '<span class="rc-badge" style="background:var(--bg-subtle);color:var(--text-3);font-size:.75em;">Verifica AI opzionale</span>';
  }

  var reasonHtml = '';
  var techCodes = ['parse_error', 'invalid_format', 'no_response'];
  var isTechnicalReason = techCodes.indexOf(v.reason) !== -1 || (v.reason && /API key Gemini non configurata/i.test(v.reason));
  if (v.reason && (v.status === 'ok' || v.status === 'fail') && !isTechnicalReason) {
    var safeReason = String(v.reason)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    reasonHtml =
      '<p style="font-size:.78em;color:var(--text-3);margin-top:4px;margin-bottom:0;">' +
        safeReason +
      '</p>';
  }

  var m = pgState.macros || {};
  var kcal = m.kcal || 0;
  var carbsPct = kcal ? Math.round(((m.carbsG || 0) * 4 / kcal) * 100) : 0;
  var proteinPct = kcal ? Math.round(((m.proteinG || 0) * 4 / kcal) * 100) : 0;
  var fatPct = 100 - carbsPct - proteinPct;
  var goalKey = (pgState.profile || {}).goal || 'mantenimento';
  var goalBadgeLabel = goalKey === 'dimagrimento' ? 'Perdita peso' : goalKey === 'massa' ? 'Massa muscolare' : 'Mantenimento';
  var microSummary =
    '<div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px;font-size:.8em;color:var(--text-2);">' +
      '<span><strong>' + kcal + '</strong> kcal</span>' +
      '<span>Carb ' + carbsPct + '% · Prot ' + proteinPct + '% · Grassi ' + fatPct + '%</span>' +
      '<span class="rc-badge" style="background:var(--bg-subtle);color:var(--text-2);font-size:.75em;">' + goalBadgeLabel + '</span>' +
    '</div>';
  var headerCard =
    '<div class="rc-card" style="margin-bottom:14px;">' +
      '<div style="padding:16px 18px 14px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:700;font-size:1rem;margin-bottom:4px;">3. Piano proposto</div>' +
          '<p style="font-size:.82em;color:var(--text-3);margin:0;">Base di partenza calcolata automaticamente; modificabile dal Piano Alimentare.</p>' +
          microSummary +
          reasonHtml +
        '</div>' +
        badge +
      '</div>' +
    '</div>';

  var htmlMeals = meals.map(function(m) {
    return pgBuildPreviewMealSection(m, plan);
  }).join('');

  var footer =
    '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px;">' +
      '<button class="btn btn-secondary" onclick="pgBackToStep2()">← Indietro</button>' +
      '<button class="btn btn-primary" onclick="pgApplyPlan()">💾 Applica piano</button>' +
    '</div>';

  return headerCard + htmlMeals + footer;
}

function pgPreviewMealCount(mealKey, plan) {
  var meal = plan[mealKey];
  if (!meal) return 0;
  var count = 0;
  Object.keys(meal).forEach(function(cat) {
    var arr = meal[cat];
    if (Array.isArray(arr)) count += arr.length;
  });
  return count;
}

function pgBuildPreviewMealSection(meal, plan) {
  var count   = pgPreviewMealCount(meal.key, plan);
  var mealEsc = (typeof paEscQ === 'function') ? paEscQ(meal.key) : meal.key;

  var catsList = (typeof PA_CATEGORIES !== 'undefined' && PA_CATEGORIES && PA_CATEGORIES.length)
    ? PA_CATEGORIES.slice()
    : [
        '🥩 Carne','🐟 Pesce','🥛 Latticini e Uova','🌾 Cereali e Legumi',
        '🥦 Verdure','🍎 Frutta','🥑 Grassi e Condimenti','🍫 Dolci e Snack'
      ];

  var catSections = '';
  catsList.forEach(function(cat) {
    catSections += pgBuildPreviewCatSection(meal.key, cat, plan);
  });

  // \"🧂 Altro\" solo se presente
  var altroCat  = '🧂 Altro';
  var mealData  = plan[meal.key] || {};
  var altroItems = Array.isArray(mealData[altroCat]) ? mealData[altroCat] : [];
  if (altroItems.length) {
    catSections += pgBuildPreviewCatSection(meal.key, altroCat, plan);
  }

  return (
    '<div class="pa-meal-block pa-meal-preview" id="pg-meal-' + meal.key + '">' +
      '<div class="pa-meal-header" onclick="togglePAMeal && togglePAMeal(\'' + mealEsc + '\')">' +
        '<span class="pa-meal-emoji">' + (meal.emoji || '') + '</span>' +
        '<span class="pa-meal-label">' + (meal.label || meal.key) + '</span>' +
        (count > 0
          ? '<span class="pa-meal-count">' + count + ' ing.</span>'
          : '<span class="pa-meal-count" style="opacity:.4">Vuoto</span>') +
        '<span class="pa-meal-chevron" id="pa-chev-' + meal.key + '">▾</span>' +
      '</div>' +
      '<div class="pa-meal-body open" id="pa-body-' + meal.key + '">' +
        catSections +
      '</div>' +
    '</div>'
  );
}

function pgBuildPreviewCatSection(mealKey, catName, plan) {
  var meal = plan[mealKey] || {};
  var items = Array.isArray(meal[catName]) ? meal[catName] : [];
  if (!items.length) return '';

  var color = (typeof paCatColor === 'function') ? paCatColor(catName) : '#64748b';
  var icon  = (typeof paCatIcon === 'function')  ? paCatIcon(catName)  : '🧂';
  var label = catName.replace(/^[^\\s]+\\s/, '');
  var safeId  = mealKey + '-' + catName.replace(/[^a-z0-9]/gi, '_');

  var itemsHtml = items.map(function(item, idx) {
    return pgBuildPreviewIngredientRow(mealKey, catName, item, idx, safeId);
  }).join('');

  return (
    '<div class="pa-cat-section" style="--pc:' + color + ';">' +
      '<div class="pa-cat-header">' +
        '<span class="pa-cat-icon">' + icon + '</span>' +
        '<span class="pa-cat-label">' + label + '</span>' +
        (items.length ? '<span class="pa-cat-count">' + items.length + '</span>' : '') +
      '</div>' +
      '<div class="pa-cat-items" id="pg-items-' + safeId + '">' +
        itemsHtml +
      '</div>' +
    '</div>'
  );
}

function pgBuildPreviewIngredientRow(mealKey, catName, item, idx, safeIdBase) {
  if (!item || !item.name) return '';
  var alts = Array.isArray(item.alternatives) ? item.alternatives : [];
  var hasAlts = alts.length > 0;
  var qty     = (item.quantity !== null && item.quantity !== undefined)
    ? item.quantity + ' ' + (item.unit || 'g')
    : '';
  var altId   = 'pg-alt-' + safeIdBase + '-' + idx;

  var altsHtml = alts.map(function(alt) {
    if (!alt || !alt.name) return '';
    var altQty = (alt.quantity !== null && alt.quantity !== undefined)
      ? alt.quantity + ' ' + (alt.unit || 'g')
      : '';
    return (
      '<div class="pa-alt-row">' +
        '<span class="pa-alt-bullet">↔</span>' +
        '<div class="pa-alt-info">' +
          '<span class="pa-alt-name">' + alt.name + '</span>' +
          (altQty ? '<span class="pa-alt-qty">' + altQty + '</span>' : '') +
        '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="pa-ing-row pa-ing-preview" id="pg-ing-' + safeIdBase + '-' + idx + '">' +
      '<div class="pa-ing-main">' +
        '<div class="pa-ing-info">' +
          '<span class="pa-ing-name">' + item.name + '</span>' +
          (qty ? '<span class="pa-ing-qty">' + qty + '</span>' : '') +
        '</div>' +
        (hasAlts
          ? '<div class="pa-ing-actions">' +
              '<button class="pa-alt-toggle active" ' +
                      'title="Mostra/Nascondi alternative" ' +
                      'onclick="togglePAAltSection && togglePAAltSection(\'' + altId + '\',this)">' +
                '↔ ' + alts.length +
              '</button>' +
            '</div>'
          : '') +
      '</div>' +
      (hasAlts
        ? '<div class="pa-alt-section open" id="' + altId + '">' + altsHtml + '</div>'
        : '') +
    '</div>'
  );
}

function pgBackToStep2() {
  pgState.step = 2;
  renderPianoGenPage();
}

function pgApplyPlan() {
  if (!pgState.draftPlan) return;
  if (typeof pushUndo === 'function') {
    pushUndo('Generazione nuovo piano alimentare');
  }
  window.pianoAlimentare = pgState.draftPlan;
  if (typeof paEnsureStructure === 'function') {
    paEnsureStructure();
  } else if (typeof ensurePlanStructure === 'function') {
    ensurePlanStructure();
  }
  if (typeof saveData === 'function') saveData();
  if (typeof showToast === 'function') {
    showToast('✅ Nuovo piano alimentare applicato', 'success');
  }
  if (typeof goToPage === 'function') goToPage('piano-alimentare');
}

function pgRequestVerification() {
  if (!pgState.draftPlan || typeof verifyGeneratedPlanWithAI !== 'function') {
    pgState.verification = {
      status:'fail',
      reason:'La verifica automatica non è disponibile in questo momento.',
      risk:null,
      autoAdjusted:false
    };
    renderPianoGenPage();
    return;
  }

  var p = pgState.profile || {};
  var m = pgState.macros || {};
  var summary = {
    totalKcal: m.kcal || null,
    carbsG: m.carbsG || null,
    proteinG: m.proteinG || null,
    fatG: m.fatG || null,
    factorVsBaseline: pgState.factor || null,
    meals: {}
  };

  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk) {
    var meal = pgState.draftPlan[mk] || {};
    var mealInfo = { items:0, categories:{} };
    Object.keys(meal).forEach(function(cat) {
      var arr = meal[cat];
      if (!Array.isArray(arr)) return;
      mealInfo.items += arr.length;
      mealInfo.categories[cat] = arr.length;
    });
    summary.meals[mk] = mealInfo;
  });

  var profileSummary = {
    sex: p.sex || null,
    age: p.age || null,
    weight: p.weight || null,
    height: p.height || null,
    activity: p.activity || null,
    goal: p.goal || null
  };

  if (typeof console !== 'undefined' && console.debug) {
    console.debug('[pg] Verifica AI: profilo', JSON.stringify(profileSummary), 'riepilogo piano', JSON.stringify(summary).substring(0, 150) + '…');
  }

  verifyGeneratedPlanWithAI(profileSummary, summary, function(res) {
    if (!res) {
      pgState.verification = {
        status:'fail',
        reason:'La verifica automatica non ha restituito risposta, ma puoi usare comunque questo piano come base.',
        risk:null,
        autoAdjusted:false
      };
    } else if (res.verified) {
      pgState.verification = {
        status:'ok',
        reason:res.reason || 'Il piano risulta globalmente coerente per un uso di base.',
        risk:res.risk || null,
        autoAdjusted:false
      };
    } else {
      var code = res.reason || '';
      var isHardError = (code === 'parse_error' || code === 'invalid_format' || code === 'no_response');
      if (isHardError) {
        pgState.verification = {
          status:'fail',
          reason:'Non siamo riusciti a valutare automaticamente il piano. Puoi comunque salvarlo e farlo valutare al tuo professionista.',
          risk:res.risk || null,
          autoAdjusted:false
        };
      } else {
        var adjusted = pgAutoAdjustPlanIfNeeded(res);
        pgState.verification = {
          status: adjusted ? 'ok' : 'fail',
          reason: res.reason || 'Il piano potrebbe non essere ottimale; sono state applicate piccole correzioni automatiche.',
          risk: res.risk || null,
          autoAdjusted: adjusted
        };
      }
    }
    renderPianoGenPage();
  });
}

function pgAutoAdjustPlanIfNeeded(aiRes) {
  if (!aiRes || aiRes.verified) return false;
  var risk = aiRes.risk || 'medium';
  if (risk === 'low') return false;

  var m = pgState.macros;
  if (!m || !m.kcal) return false;

  var origKcal = m.kcal;
  var newKcal  = origKcal;

  if (risk === 'high') {
    var minK = 1400;
    var maxK = 2800;
    if (origKcal < minK) newKcal = minK;
    else if (origKcal > maxK) newKcal = maxK;
  } else {
    var goal = (pgState.profile && pgState.profile.goal) || 'mantenimento';
    if (goal === 'dimagrimento') {
      newKcal = Math.round(origKcal * 1.05);
    } else if (goal === 'massa') {
      newKcal = Math.round(origKcal * 0.95);
    } else {
      newKcal = origKcal;
    }
  }

  if (!newKcal || newKcal === origKcal) return false;

  // Mantieni le proporzioni attuali tra macro
  var totalKcal = origKcal;
  var carbShare   = totalKcal ? (m.carbsG * 4)   / totalKcal : 0.5;
  var proteinShare= totalKcal ? (m.proteinG * 4) / totalKcal : 0.25;
  var fatShare    = totalKcal ? (m.fatG * 9)     / totalKcal : 0.25;

  var carbsKcal   = Math.round(newKcal * carbShare);
  var proteinKcal = Math.round(newKcal * proteinShare);
  var fatKcal     = newKcal - carbsKcal - proteinKcal;

  pgState.macros = {
    kcal: newKcal,
    carbsG: Math.round(carbsKcal / 4),
    proteinG: Math.round(proteinKcal / 4),
    fatG: Math.round(fatKcal / 9)
  };

  var factor = newKcal / PG_BASELINE_KCAL;
  if (factor < 0.8) factor = 0.8;
  if (factor > 1.4) factor = 1.4;
  pgState.factor = factor;

  pgState.draftPlan = pgGeneratePlanFromDefault();
  return true;
}

/* ══════════════════════════════════════════════════
   Vincoli dieta nel wizard (UI + handler)
══════════════════════════════════════════════════ */
function pgBuildDietPrefsCard() {
  var dp = (typeof dietProfile !== 'undefined' && dietProfile) ? dietProfile : {};
  var flags = [
    { key:'vegetariano',  emoji:'🥦', label:'Vegetariano',    sub:'No carne, no pesce' },
    { key:'vegano',       emoji:'🌱', label:'Vegano',          sub:'Nessun prodotto animale' },
    { key:'senzaLattosio',emoji:'🥛', label:'Senza lattosio',  sub:'Evita latticini non specificati' },
    { key:'senzaGlutine', emoji:'🌾', label:'Senza glutine',   sub:'Evita cereali con glutine' }
  ];
  var allergenici = Array.isArray(dp.allergenici) ? dp.allergenici : [];

  var togglesHtml = flags.map(function(f) {
    var on = Boolean(dp[f.key]);
    return '' +
      '<div class="settings-row" onclick="pgToggleDietPref(\'' + f.key + '\')" style="cursor:pointer;">' +
        '<div class="settings-row-icon">' + f.emoji + '</div>' +
        '<div class="settings-row-info">' +
          '<div class="settings-row-label">' + f.label + '</div>' +
          '<div class="settings-row-sub">' + f.sub + '</div>' +
        '</div>' +
        '<div class="diet-toggle' + (on ? ' diet-toggle-on' : '') + '">' +
          '<div class="diet-toggle-knob"></div>' +
        '</div>' +
      '</div>';
  }).join('');

  var allergensHtml =
    '<div style="padding:10px 16px 4px;border-top:1px solid var(--border);margin-top:4px;">' +
      '<div style="font-size:.8em;font-weight:700;color:var(--text-2);margin-bottom:6px;">Allergie / ingredienti da evitare</div>' +
      '<div id="pgAllergenTagsWrap" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">' +
        (allergenici.length
          ? allergenici.map(function(a) {
              return '<span class="allergen-tag">' +
                       a +
                       '<button onclick="pgRemoveAllergen(\'' + a.replace(/'/g, "\\'") + '\')" aria-label="Rimuovi">✕</button>' +
                     '</span>';
            }).join('')
          : '<span style="font-size:.8em;color:var(--text-3);font-style:italic;">Nessun ingrediente aggiunto</span>'
        ) +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
        '<input type="text" id="pgAllergenInput" placeholder="Es. arachidi, soia…" ' +
               'style="flex:1;padding:7px 10px;border-radius:var(--r-md);border:1.5px solid var(--border);' +
               'background:var(--bg-subtle);font-size:.86em;color:var(--text-1);outline:none;" ' +
               'list="ingredientiAutocomplete" autocomplete="off" ' +
               'oninput="if(typeof populateIngAutocomplete===\'function\')populateIngAutocomplete()" ' +
               'onkeydown="if(event.key===\'Enter\')pgAddAllergen()">' +
        '<button class="rc-btn rc-btn-primary" style="padding:7px 14px;font-size:.86em;" onclick="pgAddAllergen()">＋</button>' +
      '</div>' +
    '</div>';

  return '' +
    '<div class="rc-card" style="margin-bottom:12px;">' +
      '<div style="padding:14px 16px 8px;">' +
        '<div style="font-weight:700;font-size:.95em;margin-bottom:4px;">Preferenze alimentari per questo piano</div>' +
        '<p style="font-size:.8em;color:var(--text-3);margin-bottom:8px;">' +
          'Seleziona eventuali preferenze o allergie: il generatore terrà conto di queste informazioni per scegliere gli ingredienti.' +
        '</p>' +
      '</div>' +
      togglesHtml +
      allergensHtml +
    '</div>';
}

function pgToggleDietPref(key) {
  pgCaptureProfileFromInputs();
  if (typeof dietProfile === 'undefined' || !dietProfile) dietProfile = {};
  dietProfile[key] = !Boolean(dietProfile[key]);
  // Vegano implica vegetariano
  if (key === 'vegano' && dietProfile.vegano) dietProfile.vegetariano = true;
  if (key === 'vegetariano' && !dietProfile.vegetariano) dietProfile.vegano = false;
  if (typeof saveData === 'function') saveData();
  renderPianoGenPage();
}

function pgAddAllergen() {
  pgCaptureProfileFromInputs();
  var inp = document.getElementById('pgAllergenInput');
  if (!inp) return;
  var val = inp.value.trim();
  if (!val) return;
  if (typeof dietProfile === 'undefined' || !dietProfile) dietProfile = {};
  if (!Array.isArray(dietProfile.allergenici)) dietProfile.allergenici = [];
  if (dietProfile.allergenici.indexOf(val) === -1) {
    dietProfile.allergenici.push(val);
    if (typeof saveData === 'function') saveData();
    inp.value = '';
    renderPianoGenPage();
  }
}

function pgRemoveAllergen(name) {
  pgCaptureProfileFromInputs();
  if (typeof dietProfile === 'undefined' || !dietProfile || !Array.isArray(dietProfile.allergenici)) return;
  dietProfile.allergenici = dietProfile.allergenici.filter(function(a) { return a !== name; });
  if (typeof saveData === 'function') saveData();
  renderPianoGenPage();
}
