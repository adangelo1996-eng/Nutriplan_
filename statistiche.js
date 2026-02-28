/*
   STATISTICHE.JS — v4  stile rc-card unificato
*/

function renderStatistiche() {
  var el = document.getElementById('statisticheContent');
  if (!el) return;

  var stats = computeStats();
  var html  = '';

  /* ══════════════════════════════════════════
     ANALISI AI — in cima per facile accesso
  ══════════════════════════════════════════ */
  html +=
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:18px 20px;">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
          '<span style="font-size:1.1rem;">🤖</span>' +
          '<div style="font-weight:700;font-size:.95em;">Analisi AI delle tue abitudini</div>' +
        '</div>' +
        '<p style="font-size:.82em;color:var(--text-3);margin-bottom:14px;">Gemini analizzerà le tue statistiche e ti darà suggerimenti personalizzati (i dati del piano alimentare non vengono condivisi).</p>' +
        '<button id="aiStatsBtn" class="btn btn-primary btn-small" onclick="generateAIStatsAnalysis()">' +
          'Analisi AI <span class="ai-powered-label">Powered by Gemini</span>' +
        '</button>' +
        '<div id="aiStatsResult" style="display:none;margin-top:14px;"></div>' +
      '</div>' +
    '</div>';

  /* ══════════════════════════════════════════
     STAT CARDS RIEPILOGO
  ══════════════════════════════════════════ */
  var statItems = [
    { emoji:'', label:'Giorni registrati',  value: stats.totalDays },
    { emoji:'', label:'Pasti completati',   value: stats.totalMeals },
    { emoji:'', label:'Ingredienti unici',  value: stats.uniqueIngredients },
    { emoji:'', label:'Sostituzioni',       value: stats.totalSubs },
    { emoji:'', label:'Giorni saltati (14gg)', value: stats.skippedDays },
    { emoji:'', label:'Varietà media/giorno', value: stats.varietyScore }
  ];

  html +=
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px;">' +
    statItems.map(function(s){
      return (
        '<div class="rc-card" style="padding:18px 16px;text-align:center;">' +
          '<div style="font-size:1.6rem;font-weight:800;color:var(--primary);margin-bottom:2px;">'+s.value+'</div>' +
          '<div style="font-size:.78em;color:var(--text-3);margin-top:4px;">'+s.label+'</div>' +
        '</div>'
      );
    }).join('') +
    '</div>';

  /* ══════════════════════════════════════════
     ALIMENTI PIÙ CONSUMATI
  ══════════════════════════════════════════ */
  html += buildStatSection(
    'Alimenti più consumati',
    stats.topIngredients,
    function(item){
      var pct = stats.topIngredients.length ? Math.round((item.count / stats.topIngredients[0].count) * 100) : 0;
      return (
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">' +
          '<span style="font-weight:600;min-width:20px;text-align:right;color:var(--primary);">'+item.rank+'.</span>' +
          '<span style="flex:1;font-weight:500;">'+item.name+'</span>' +
          '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">'+item.count+'×</span>' +
          '<div style="width:80px;">' +
            '<div class="rc-progress-track">' +
              '<div class="rc-progress-fill" style="width:'+pct+'%;"></div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    },
    'Nessun alimento registrato ancora.'
  );

  /* ══════════════════════════════════════════
     PASTI PIÙ COMPLETI
  ══════════════════════════════════════════ */
  var mealLabels = { colazione:'☀️ Colazione', spuntino:'🍎 Spuntino', pranzo:'🍽 Pranzo', merenda:'🥪 Merenda', cena:'🌙 Cena' };
  var mealStats  = Object.keys(stats.mealCounts||{}).map(function(mk){
    return { key:mk, label:mealLabels[mk]||mk, count:stats.mealCounts[mk] };
  }).sort(function(a,b){ return b.count-a.count; });

  html += buildStatSection(
    '🍽 Pasti per fascia',
    mealStats,
    function(item){
      var max = mealStats.length ? mealStats[0].count : 1;
      var pct = max > 0 ? Math.round((item.count / max) * 100) : 0;
      return (
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">' +
          '<span style="flex:1;font-weight:500;">'+item.label+'</span>' +
          '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">'+item.count+' volte</span>' +
          '<div style="width:80px;">' +
            '<div class="rc-progress-track">' +
              '<div class="rc-progress-fill" style="width:'+pct+'%;"></div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    },
    'Nessun dato disponibile.'
  );

  /* ══════════════════════════════════════════
     GRAFICI
  ══════════════════════════════════════════ */
  html += buildActivityChart();
  html += buildMealDistributionChart(stats.mealCounts);
  html += buildPantryCategoryChart();

  /* ══════════════════════════════════════════
     LIMITI SETTIMANALI — STATO
  ══════════════════════════════════════════ */
  var limiti = (typeof weeklyLimits !== 'undefined') ? weeklyLimits : {};
  var limitItems = [
    { key:'carne',     label:'Carne',     emoji:'🥩' },
    { key:'pesce',     label:'Pesce',     emoji:'🐟' },
    { key:'uova',      label:'Uova',      emoji:'🥚' },
    { key:'latticini', label:'Latticini', emoji:'🥛' },
    { key:'legumi',    label:'Legumi',    emoji:'🌱' },
    { key:'cereali',   label:'Cereali',   emoji:'🌾' },
    { key:'frutta',    label:'Frutta',    emoji:'🍎' },
    { key:'verdura',   label:'Verdura',   emoji:'🥦' }
  ].filter(function(li){ return limiti[li.key] !== undefined && limiti[li.key] > 0; });

  if (limitItems.length) {
    var weekUsage = computeWeekUsage();
    html +=
      '<div class="rc-card" style="margin-bottom:16px;">' +
        '<div style="padding:18px 20px;">' +
          '<div style="font-weight:700;font-size:.95em;margin-bottom:14px;">📊 Limiti settimana corrente</div>' +
          limitItems.map(function(li){
            var limit = limiti[li.key] || 0;
            var used  = weekUsage[li.key] || 0;
            var pct   = limit > 0 ? Math.min(100, Math.round((used/limit)*100)) : 0;
            var over  = used > limit;
            var fillColor = over ? 'var(--danger)' : pct > 75 ? 'var(--warn)' : 'var(--primary)';
            var badgeBg   = over ? '#fde8e8' : 'var(--primary-light)';
            var badgeCol  = over ? 'var(--danger)' : 'var(--primary)';
            return (
              '<div style="margin-bottom:14px;">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                  '<span>'+li.emoji+'</span>' +
                  '<span style="flex:1;font-weight:500;font-size:.9em;">'+li.label+'</span>' +
                  '<span class="rc-badge" style="background:'+badgeBg+';color:'+badgeCol+';">'+
                    used+' / '+limit+
                  '</span>' +
                '</div>' +
                '<div class="rc-progress-track">' +
                  '<div class="rc-progress-fill" style="width:'+pct+'%;background:'+fillColor+';"></div>' +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>' +
      '</div>';
  }

  el.innerHTML = html;
}

/* ══════════════════════════════════════════
   HELPER — sezione con lista
══════════════════════════════════════════ */
function buildStatSection(title, items, rowFn, emptyMsg) {
  var rows = items.length
    ? items.map(rowFn).join('')
    : '<p style="color:var(--text-3);font-size:.88em;padding:8px 0;">'+emptyMsg+'</p>';
  return (
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:18px 20px;">' +
        '<div style="font-weight:700;font-size:.95em;margin-bottom:12px;">'+title+'</div>' +
        rows +
      '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   CALCOLO STATISTICHE
══════════════════════════════════════════ */
function computeStats() {
  var totalDays         = 0;
  var totalMeals        = 0;
  var totalSubs         = 0;
  var ingredientCounts  = {};
  var mealCounts        = { colazione:0, spuntino:0, pranzo:0, merenda:0, cena:0 };

  Object.keys(appHistory||{}).forEach(function(dk){
    var hd = appHistory[dk];
    if (!hd || !hd.usedItems) return;
    var hasAny = false;
    Object.keys(hd.usedItems).forEach(function(mk){
      var items = Object.keys(hd.usedItems[mk]||{});
      if (!items.length) return;
      hasAny = true;
      totalMeals += items.length;
      if (mealCounts[mk] !== undefined) mealCounts[mk]++;
      items.forEach(function(name){
        ingredientCounts[name] = (ingredientCounts[name]||0) + 1;
      });
    });
    if (hd.substitutions) {
      Object.keys(hd.substitutions).forEach(function(mk){
        totalSubs += Object.keys(hd.substitutions[mk]||{}).length;
      });
    }
    if (hasAny) totalDays++;
  });

  var topIngredients = Object.keys(ingredientCounts)
    .map(function(name){ return { name:name, count:ingredientCounts[name] }; })
    .sort(function(a,b){ return b.count - a.count; })
    .slice(0, 10)
    .map(function(item, i){ return Object.assign({}, item, { rank: i+1 }); });

  /* Pasti saltati: giorni negli ultimi 14 senza registrazioni */
  var skippedDays = 0;
  var today14 = new Date(); today14.setHours(0,0,0,0);
  for (var d = 1; d <= 14; d++) {
    var check = new Date(today14);
    check.setDate(today14.getDate() - d);
    var dk2 = check.getFullYear() + '-' +
              String(check.getMonth()+1).padStart(2,'0') + '-' +
              String(check.getDate()).padStart(2,'0');
    var hd2 = appHistory[dk2];
    var hadMeal = hd2 && hd2.usedItems && Object.keys(hd2.usedItems).some(function(mk){
      return Object.keys((hd2.usedItems[mk]||{})).length > 0;
    });
    if (!hadMeal) skippedDays++;
  }

  /* Varietà: ingredienti unici / giorni con almeno un pasto */
  var varietyScore = totalDays > 0 ? Math.round(Object.keys(ingredientCounts).length / totalDays * 10) / 10 : 0;

  return {
    totalDays:         totalDays,
    totalMeals:        totalMeals,
    totalSubs:         totalSubs,
    uniqueIngredients: Object.keys(ingredientCounts).length,
    topIngredients:    topIngredients,
    mealCounts:        mealCounts,
    skippedDays:       skippedDays,
    varietyScore:      varietyScore
  };
}

/* ══════════════════════════════════════════
   USO SETTIMANALE (per limiti)
══════════════════════════════════════════ */
function computeWeekUsage() {
  var usage   = {};
  var today   = new Date();
  var weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  /* mappa nome ingrediente → categoria limite */
  var catMap = {
    '🥩 Carne': 'carne', '🐟 Pesce': 'pesce',
    '🥩 Carne e Pesce': 'carne', /* compat */
    '🥛 Latticini e Uova': 'latticini',
    '🌾 Cereali e Legumi': 'cereali',
    '🥦 Verdure': 'verdura',
    '🍎 Frutta': 'frutta'
  };

  Object.keys(appHistory||{}).forEach(function(dk){
    var parts = dk.split('-');
    if (parts.length !== 3) return;
    var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    if (d < weekAgo || d > today) return;
    var hd = appHistory[dk];
    if (!hd || !hd.usedItems) return;
    Object.keys(hd.usedItems).forEach(function(mk){
      Object.keys(hd.usedItems[mk]||{}).forEach(function(name){
        var pi  = (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) ? pantryItems[name] : null;
        var cat = pi ? catMap[pi.category] : null;
        if (cat) usage[cat] = (usage[cat]||0) + 1;
        /* uova separato */
        if (name.toLowerCase().includes('uov')) usage['uova'] = (usage['uova']||0) + 1;
        /* pesce separato */
        if (name.toLowerCase().includes('pesce') || name.toLowerCase().includes('tonno') ||
            name.toLowerCase().includes('salmone') || name.toLowerCase().includes('merluzzo')) {
          usage['pesce'] = (usage['pesce']||0) + 1;
        }
        /* legumi separato */
        if (name.toLowerCase().includes('legumi') || name.toLowerCase().includes('ceci') ||
            name.toLowerCase().includes('lenticch') || name.toLowerCase().includes('fagioli')) {
          usage['legumi'] = (usage['legumi']||0) + 1;
        }
      });
    });
  });
  return usage;
}

/* ══════════════════════════════════════════════════════
   GRAFICO TIPOLOGIE — ultimi 7 giorni per categoria
══════════════════════════════════════════════════════ */
function buildActivityChart() {
  var CAT_COLORS = {
    '🥩 Carne':              '#ef4444',
    '🐟 Pesce':              '#3b82f6',
    '🥛 Latticini e Uova':   '#fbbf24',
    '🌾 Cereali e Legumi':   '#f97316',
    '🥦 Verdure':            '#22c55e',
    '🍎 Frutta':             '#a855f7',
    '🥑 Grassi e Condimenti':'#84cc16',
    '🍫 Dolci e Snack':      '#ec4899',
    '🧂 Cucina':             '#a8a29e',
    '🧂 Altro':              '#94a3b8'
  };
  var CAT_ORDER = Object.keys(CAT_COLORS);

  /* Indice categoria da defaultIngredients */
  var defCatMap = {};
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function(d) {
      if (d && d.name && d.category) defCatMap[d.name.toLowerCase()] = d.category;
    });
  }

  function resolveCategory(name) {
    if (typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name] && pantryItems[name].category)
      return pantryItems[name].category;
    return defCatMap[name.toLowerCase()] || '🧂 Altro';
  }

  var today = new Date(); today.setHours(0,0,0,0);
  var days7 = [];
  var allCatsUsed = {};
  for (var i = 6; i >= 0; i--) {
    var d = new Date(today);
    d.setDate(today.getDate() - i);
    var dk = d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');
    var hd = (typeof appHistory !== 'undefined' && appHistory[dk]) ? appHistory[dk] : {};
    var catCounts = {};
    Object.keys(hd.usedItems || {}).forEach(function(mk){
      Object.keys(hd.usedItems[mk] || {}).forEach(function(name){
        var cat = resolveCategory(name);
        /* normalizza legacy */
        if (cat === '🥩 Carne e Pesce') cat = '🥩 Carne';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
        allCatsUsed[cat] = true;
      });
    });
    days7.push({ d: d, dk: dk, catCounts: catCounts, isToday: i === 0 });
  }

  var catsPresent = CAT_ORDER.filter(function(c){ return allCatsUsed[c]; });
  var dayNames = ['D','L','M','M','G','V','S'];

  /* max totale per scala barre */
  var maxTotal = 0;
  days7.forEach(function(day){
    var tot = Object.values(day.catCounts).reduce(function(a,b){ return a+b; }, 0);
    if (tot > maxTotal) maxTotal = tot;
  });
  if (!maxTotal) maxTotal = 1;

  var bars = days7.map(function(day){
    var total = Object.values(day.catCounts).reduce(function(a,b){ return a+b; }, 0);
    var heightPct = Math.max(total > 0 ? 8 : 0, Math.round((total / maxTotal) * 100));

    /* Segmenti colorati per categoria (stacked) */
    var segments = '';
    if (total > 0) {
      catsPresent.forEach(function(cat){
        var cnt = day.catCounts[cat] || 0;
        if (!cnt) return;
        var segPct = Math.round((cnt / total) * 100);
        segments += '<div style="background:' + (CAT_COLORS[cat]||'#94a3b8') + ';height:' + segPct + '%;min-height:3px;"></div>';
      });
    }

    var todayStyle = day.isToday ? 'border:2px solid var(--primary);border-radius:4px 4px 0 0;' : '';
    return (
      '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;">' +
        '<div style="width:100%;height:80px;display:flex;flex-direction:column;justify-content:flex-end;">' +
          '<div style="width:80%;margin:0 auto;height:' + heightPct + '%;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;border-radius:3px 3px 0 0;' + todayStyle + '">' +
            segments +
          '</div>' +
        '</div>' +
        '<span style="font-size:.7em;color:' + (day.isToday ? 'var(--primary)' : 'var(--text-3)') + ';font-weight:' + (day.isToday ? '700' : '400') + ';">' +
          dayNames[day.d.getDay()] +
        '</span>' +
        '<span style="font-size:.68em;color:var(--text-3);">' + (total || '') + '</span>' +
      '</div>'
    );
  }).join('');

  /* Legenda colori */
  var legend = catsPresent.length
    ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">' +
        catsPresent.map(function(cat){
          return '<span style="display:flex;align-items:center;gap:4px;font-size:.72em;color:var(--text-2);">' +
            '<span style="width:10px;height:10px;border-radius:2px;background:' + (CAT_COLORS[cat]||'#94a3b8') + ';display:inline-block;"></span>' +
            cat.replace(/^[^\s]+\s/, '') +
          '</span>';
        }).join('') +
      '</div>'
    : '';

  return (
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:18px 20px;">' +
        '<div style="font-weight:700;font-size:.95em;margin-bottom:14px;">📊 Tipologie consumate — ultimi 7 giorni</div>' +
        (maxTotal > 1 || days7.some(function(d){ return Object.keys(d.catCounts).length > 0; })
          ? '<div style="display:flex;gap:4px;align-items:flex-end;">' + bars + '</div>' + legend
          : '<p style="color:var(--text-3);font-size:.88em;">Nessun dato registrato negli ultimi 7 giorni.</p>') +
      '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════════════════
   GRAFICO DISTRIBUZIONE PASTI
══════════════════════════════════════════════════════ */
function buildMealDistributionChart(mealCounts) {
  var mealLabels = {
    colazione: { label:'Colazione', emoji:'☀️' },
    spuntino:  { label:'Spuntino',  emoji:'🍎' },
    pranzo:    { label:'Pranzo',    emoji:'🍽' },
    merenda:   { label:'Merenda',   emoji:'🥪' },
    cena:      { label:'Cena',      emoji:'🌙' }
  };
  var total = Object.values(mealCounts||{}).reduce(function(a,b){ return a+b; }, 0);
  if (!total) {
    return (
      '<div class="rc-card" style="margin-bottom:16px;">' +
        '<div style="padding:18px 20px;">' +
          '<div style="font-weight:700;font-size:.95em;margin-bottom:8px;">🍽 Distribuzione pasti</div>' +
          '<p style="color:var(--text-3);font-size:.88em;">Nessun pasto registrato ancora.</p>' +
        '</div>' +
      '</div>'
    );
  }
  var rows = Object.keys(mealLabels).map(function(mk){
    var count = (mealCounts && mealCounts[mk]) || 0;
    var pct   = total > 0 ? Math.round((count/total)*100) : 0;
    var info  = mealLabels[mk];
    return (
      '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">' +
          '<span>' + info.emoji + '</span>' +
          '<span style="flex:1;font-weight:500;font-size:.88em;">' + info.label + '</span>' +
          '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">' + count + '</span>' +
          '<span style="font-size:.72em;color:var(--text-3);min-width:32px;text-align:right;">' + pct + '%</span>' +
        '</div>' +
        '<div class="rc-progress-track">' +
          '<div class="rc-progress-fill" style="width:' + pct + '%;"></div>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:18px 20px;">' +
        '<div style="font-weight:700;font-size:.95em;margin-bottom:14px;">🍽 Distribuzione pasti</div>' +
        rows +
      '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════════════════
   GRAFICO DISPENSA PER CATEGORIA
══════════════════════════════════════════════════════ */
function buildPantryCategoryChart() {
  var items = (typeof pantryItems !== 'undefined' && pantryItems) ? pantryItems : {};

  /* struttura: { count, totalG (grammi/ml equivalenti), totalPz } */
  var catData = {};

  var _unitToG = { 'g': 1, 'kg': 1000, 'ml': 1, 'l': 1000 };

  /* Indice rapido da defaultIngredients per lookup categoria */
  var defCatMap = {};
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function(d) {
      if (d && d.name && d.category) defCatMap[d.name.toLowerCase()] = d.category;
    });
  }

  Object.keys(items).forEach(function(k){
    var item = items[k];
    if (!item || (item.quantity || 0) <= 0) return;
    var cat = item.category || defCatMap[k.toLowerCase()] || null;
    /* Normalizza la categoria legacy */
    if (cat === '🥩 Carne e Pesce') {
      cat = (item.icon === '🐟' || item.icon === '🦑' || item.icon === '🐙') ? '🐟 Pesce' : '🥩 Carne';
    }
    cat = cat || '🧂 Altro';
    if (!catData[cat]) catData[cat] = { count: 0, totalG: 0, totalPz: 0 };
    catData[cat].count++;
    var qty  = item.quantity || 0;
    var unit = item.unit || 'g';
    if (_unitToG[unit] !== undefined) {
      catData[cat].totalG += qty * _unitToG[unit];
    } else {
      /* unità non convertibili (pz, fette, ecc.) */
      catData[cat].totalPz += qty;
    }
  });

  var cats = Object.keys(catData).sort(function(a,b){ return catData[b].count - catData[a].count; });
  if (!cats.length) {
    return (
      '<div class="rc-card" style="margin-bottom:16px;">' +
        '<div style="padding:18px 20px;">' +
          '<div style="font-weight:700;font-size:.95em;margin-bottom:8px;">🗄️ Dispensa per categoria</div>' +
          '<p style="color:var(--text-3);font-size:.88em;">Nessun ingrediente in dispensa.</p>' +
        '</div>' +
      '</div>'
    );
  }
  var maxVal = catData[cats[0]].count || 1;

  var rows = cats.map(function(cat){
    var d     = catData[cat];
    var pct   = Math.round((d.count / maxVal) * 100);

    /* Costruisce il testo quantità */
    var qtyParts = [];
    if (d.totalG > 0) {
      var gVal = d.totalG >= 1000 ? (d.totalG / 1000).toFixed(1) + ' kg' : Math.round(d.totalG) + ' g';
      qtyParts.push('~' + gVal);
    }
    if (d.totalPz > 0) {
      var pzVal = d.totalPz % 1 === 0 ? d.totalPz : parseFloat(d.totalPz.toFixed(1));
      qtyParts.push(pzVal + ' pz');
    }
    var qtyLabel = qtyParts.length ? ' · ' + qtyParts.join(' + ') : '';

    return (
      '<div style="margin-bottom:9px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
          '<span style="flex:1;font-size:.85em;font-weight:500;">' + cat + '</span>' +
          '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">' +
            d.count + ' voc' + (d.count === 1 ? 'e' : 'i') + qtyLabel +
          '</span>' +
        '</div>' +
        '<div class="rc-progress-track">' +
          '<div class="rc-progress-fill" style="width:' + pct + '%;"></div>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="rc-card" style="margin-bottom:16px;">' +
      '<div style="padding:18px 20px;">' +
        '<div style="font-weight:700;font-size:.95em;margin-bottom:14px;">🗄️ Dispensa per categoria</div>' +
        rows +
      '</div>' +
    '</div>'
  );
}
