/*
   STATISTICHE.JS — v4  stile rc-card unificato
*/

function renderStatistiche() {
  var el = document.getElementById('statisticheContent');
  if (!el) return;

  var stats = computeStats();
  var html  = '';

  /* ══════════════════════════════════════════
     STAT CARDS RIEPILOGO
  ══════════════════════════════════════════ */
  var statItems = [
    { emoji:'📅', label:'Giorni registrati', value: stats.totalDays },
    { emoji:'✅', label:'Pasti completati',  value: stats.totalMeals },
    { emoji:'🌿', label:'Ingredienti unici', value: stats.uniqueIngredients },
    { emoji:'🔄', label:'Sostituzioni',      value: stats.totalSubs }
  ];

  html +=
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px;">' +
    statItems.map(function(s){
      return (
        '<div class="rc-card" style="padding:18px 16px;text-align:center;">' +
          '<div style="font-size:1.8rem;margin-bottom:6px;">'+s.emoji+'</div>' +
          '<div style="font-size:1.6rem;font-weight:800;color:var(--primary);">'+s.value+'</div>' +
          '<div style="font-size:.78em;color:var(--text-3);margin-top:4px;">'+s.label+'</div>' +
        '</div>'
      );
    }).join('') +
    '</div>';

  /* ══════════════════════════════════════════
     ALIMENTI PIÙ CONSUMATI
  ══════════════════════════════════════════ */
  html += buildStatSection(
    '🏆 Alimenti più consumati',
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

  return {
    totalDays:         totalDays,
    totalMeals:        totalMeals,
    totalSubs:         totalSubs,
    uniqueIngredients: Object.keys(ingredientCounts).length,
    topIngredients:    topIngredients,
    mealCounts:        mealCounts
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
    '🥩 Carne e Pesce': 'carne',
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
