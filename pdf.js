/**
 * Esporta il piano alimentare come pagina stampabile (PDF via Stampa → Salva come PDF).
 * Layout minimal e ordinato, coerente con l'app, utilizzabile come supporto cartaceo.
 */
function exportPianoToPDF() {
  var MEAL_LABELS = { colazione: 'Colazione', spuntino: 'Spuntino', pranzo: 'Pranzo', merenda: 'Merenda', cena: 'Cena' };
  var MEALS_ORDER = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
  var CAT_ORDER = [
    '🥩 Carne', '🐟 Pesce', '🥛 Latticini e Uova', '🌾 Cereali e Legumi',
    '🥦 Verdure', '🍎 Frutta', '🥑 Grassi e Condimenti', '🍫 Dolci e Snack', '🧂 Cucina', '🧂 Altro'
  ];
  var MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  var dateLabel = 'Piano di riferimento';
  if (typeof selectedDateKey !== 'undefined' && selectedDateKey) {
    var d = new Date(selectedDateKey + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      dateLabel = d.getDate() + ' ' + MONTHS_IT[d.getMonth()] + ' ' + d.getFullYear();
    }
  } else {
    var today = new Date();
    dateLabel = today.getDate() + ' ' + MONTHS_IT[today.getMonth()] + ' ' + today.getFullYear();
  }

  var hasAny = false;
  var mealBlocks = '';
  MEALS_ORDER.forEach(function(mealKey) {
    var plan = (typeof pianoAlimentare !== 'undefined' && pianoAlimentare && pianoAlimentare[mealKey]) ? pianoAlimentare[mealKey] : {};
    var catOrdered = [];
    CAT_ORDER.forEach(function(cat) {
      var arr = Array.isArray(plan[cat]) ? plan[cat] : [];
      if (arr.length) catOrdered.push({ cat: cat, items: arr });
    });
    var restCats = Object.keys(plan).filter(function(c) { return CAT_ORDER.indexOf(c) === -1; });
    restCats.forEach(function(c) {
      var arr = Array.isArray(plan[c]) ? plan[c] : [];
      if (arr.length) catOrdered.push({ cat: c, items: arr });
    });
    if (!catOrdered.length) return;

    hasAny = true;
    var catRows = '';
    catOrdered.forEach(function(block) {
      var catName = (block.cat && block.cat.replace) ? block.cat.replace(/^[^\s]+\s/, '') : block.cat;
      block.items.forEach(function(i) {
        if (!i || !i.name) return;
        var qty = (i.quantity != null && i.quantity !== '') ? (i.quantity + ' ' + (i.unit || 'g')) : '—';
        catRows += '<tr><td class="piano-pdf-ing">' + escapeHtml(i.name) + '</td><td class="piano-pdf-qty">' + escapeHtml(qty) + '</td></tr>';
      });
    });
    mealBlocks +=
      '<div class="piano-pdf-meal">' +
        '<div class="piano-pdf-meal-title">' + MEAL_LABELS[mealKey] + '</div>' +
        '<table class="piano-pdf-table"><tbody>' + catRows + '</tbody></table>' +
      '</div>';
  });

  if (!hasAny) {
    if (typeof showToast === 'function') showToast('Il piano è vuoto. Aggiungi ingredienti dal Piano alimentare.', 'warning');
    return;
  }

  var css =
    '*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{font-family:\'Poppins\',-apple-system,sans-serif;font-size:11pt;color:#182420;line-height:1.5;background:#fff;padding:28px 32px;max-width:720px;margin:0 auto;}' +
    '.piano-pdf-head{text-align:center;padding-bottom:24px;border-bottom:2px solid #e2ece7;margin-bottom:28px;}' +
    '.piano-pdf-head h1{font-size:1.35rem;font-weight:800;color:#182420;letter-spacing:-.02em;}' +
    '.piano-pdf-head .sub{font-size:.9rem;color:#3d8b6f;font-weight:600;margin-top:4px;}' +
    '.piano-pdf-head .date{font-size:.85rem;color:#475c53;margin-top:8px;}' +
    '.piano-pdf-meal{page-break-inside:avoid;margin-bottom:24px;}' +
    '.piano-pdf-meal-title{font-size:1rem;font-weight:700;color:#3d8b6f;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2ece7;}' +
    '.piano-pdf-table{width:100%;border-collapse:collapse;font-size:10pt;}' +
    '.piano-pdf-table td{padding:6px 10px 6px 0;border-bottom:1px solid #f0f4f2;vertical-align:top;}' +
    '.piano-pdf-table tr:last-child td{border-bottom:none;}' +
    '.piano-pdf-ing{color:#182420;}' +
    '.piano-pdf-qty{text-align:right;white-space:nowrap;color:#475c53;font-weight:500;}' +
    '.piano-pdf-footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2ece7;font-size:.8rem;color:#8aa89e;text-align:center;}' +
    '@media print{body{padding:20px 28px;} .piano-pdf-meal{page-break-inside:avoid;}}';

  function escapeHtml(s) {
    if (s == null) return '';
    var t = String(s);
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var html =
    '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Piano alimentare — NutriPlan — ' + escapeHtml(dateLabel) + '</title>' +
    '<style>' + css + '</style></head><body>' +
    '<div class="piano-pdf-head">' +
      '<h1>Piano alimentare</h1>' +
      '<div class="sub">NutriPlan</div>' +
      '<div class="date">' + escapeHtml(dateLabel) + '</div>' +
    '</div>' +
    mealBlocks +
    '<div class="piano-pdf-footer">Esportato da NutriPlan · Stampa o Salva come PDF per conservare il foglio.</div>' +
    '<script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script>' +
    '</body></html>';

  var win = window.open('', '_blank');
  if (!win) {
    if (typeof showToast === 'function') showToast('Abilita i popup per aprire la versione stampabile.', 'warning');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function exportPDF() {
  var MEAL_LABELS  = { colazione:'Colazione', spuntino:'Spuntino', pranzo:'Pranzo', merenda:'Merenda', cena:'Cena' };
  var MEALS_ORDER  = ['colazione','spuntino','pranzo','merenda','cena'];
  var DAYS_IT      = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  var MONTHS_IT    = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  var today        = new Date();
  var todayLabel   = today.getDate() + ' ' + MONTHS_IT[today.getMonth()] + ' ' + today.getFullYear();

  /* Periodo storico */
  var storicoKeys = (typeof appHistory !== 'undefined') ? Object.keys(appHistory).sort(function(a,b){ return b.localeCompare(a); }).slice(0,30) : [];
  var periodLabel = '';
  if (storicoKeys.length) {
    var first = new Date(storicoKeys[storicoKeys.length-1]+'T00:00:00');
    var last  = new Date(storicoKeys[0]+'T00:00:00');
    periodLabel = first.getDate() + '/' + (first.getMonth()+1) + ' – ' + last.getDate() + '/' + (last.getMonth()+1) + ' ' + last.getFullYear();
  }

  /* ── Profilo alimentare e vincoli (per nutrizionista) ── */
  var profiloHtml = '';
  var dp = (typeof dietProfile !== 'undefined' && dietProfile) ? dietProfile : {};
  var vincoli = [];
  if (dp.vegetariano) vincoli.push('Vegetariano');
  if (dp.vegano) vincoli.push('Vegano');
  if (dp.senzaLattosio) vincoli.push('Senza lattosio');
  if (dp.senzaGlutine) vincoli.push('Senza glutine');
  var allergeni = Array.isArray(dp.allergenici) ? dp.allergenici : [];
  if (vincoli.length || allergeni.length) {
    profiloHtml = '<div class="section-block">';
    if (vincoli.length) profiloHtml += '<p><strong>Regime alimentare:</strong> ' + vincoli.join(', ') + '.</p>';
    if (allergeni.length) profiloHtml += '<p><strong>Ingredienti da evitare (allergie/intolleranze):</strong> ' + allergeni.join(', ') + '.</p>';
    profiloHtml += '</div>';
  } else {
    profiloHtml = '<p class="muted">Nessun vincolo impostato.</p>';
  }

  /* ── Limiti settimanali ── */
  var limitiHtml = '';
  var wl = (typeof weeklyLimits !== 'undefined' && weeklyLimits) ? weeklyLimits : {};
  var wlc = (typeof weeklyLimitsCustom !== 'undefined' && weeklyLimitsCustom) ? weeklyLimitsCustom : {};
  var limitiLabels = { carne:'Carne', pesce:'Pesce', uova:'Uova', latticini:'Latticini', legumi:'Legumi', cereali:'Cereali', frutta:'Frutta', verdura:'Verdura' };
  var limitiRows = '';
  Object.keys(limitiLabels).forEach(function(k){
    if (wl[k] !== undefined && wl[k] !== '' && wl[k] !== null) limitiRows += '<tr><td>'+limitiLabels[k]+'</td><td class="num">'+wl[k]+'</td></tr>';
  });
  Object.keys(wlc).forEach(function(k){
    var c = wlc[k];
    if (c && c.max != null) limitiRows += '<tr><td>'+(c.label||k)+'</td><td class="num">max '+c.max+' '+(c.unit||'')+'</td></tr>';
  });
  if (limitiRows) limitiHtml = '<table class="data-table"><thead><tr><th>Voce</th><th class="num">Limite settimanale</th></tr></thead><tbody>'+limitiRows+'</tbody></table>';
  else limitiHtml = '<p class="muted">Nessun limite configurato.</p>';

  /* ── Piano alimentare ── */
  var pianoRows = '';
  MEALS_ORDER.forEach(function(meal) {
    var plan  = (pianoAlimentare && pianoAlimentare[meal]) ? pianoAlimentare[meal] : {};
    var allItems = [];
    Object.keys(plan).forEach(function(cat){
      if (Array.isArray(plan[cat])) plan[cat].forEach(function(i){ if(i&&i.name) allItems.push(i); });
    });
    if (!allItems.length) return;
    pianoRows +=
      '<tr><td class="meal-label">'+MEAL_LABELS[meal]+'</td>' +
      '<td>'+allItems.map(function(i){
        return '<span class="ing-chip">'+i.name+(i.quantity?' <em>'+i.quantity+' '+(i.unit||'g')+'</em>':'')+'</span>';
      }).join('')+'</td></tr>';
  });

  /* ── Storico consumo effettivo ── */
  var storicoHtml = '';
  storicoKeys.forEach(function(dk){
    var d     = new Date(dk+'T00:00:00');
    var label = DAYS_IT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_IT[d.getMonth()];
    var hd    = appHistory[dk] || {};
    var used  = hd.usedItems || {};
    var subs  = hd.substitutions || {};
    var ricette = hd.ricette || {};
    var rows  = '';
    MEALS_ORDER.forEach(function(mk){
      var mUsed = used[mk] || {};
      var mSubs = subs[mk] || {};
      var mRic  = ricette[mk] || {};
      var names = Object.keys(mUsed);
      var ricNames = Object.keys(mRic);
      if (!names.length && !ricNames.length) return;
      rows += '<tr><td class="meal-label">'+MEAL_LABELS[mk]+'</td><td>';
      names.forEach(function(n){
        var s = mSubs[n];
        rows += s ? '<span class="ing-chip sub">'+n+' → '+s+'</span>' : '<span class="ing-chip">'+n+'</span>';
      });
      ricNames.forEach(function(n){ rows += '<span class="ing-chip ric">🍽 '+n+'</span>'; });
      rows += '</td></tr>';
    });
    if (rows) storicoHtml += '<div class="day-block"><h3 class="day-label">'+label+'</h3><table class="data-table">'+rows+'</table></div>';
  });

  /* Statistiche rapide per nutrizionista */
  var daysWithData = 0;
  var totalMeals = 0;
  storicoKeys.forEach(function(dk){
    var hd = appHistory[dk] || {};
    var used = hd.usedItems || {};
    var ric = hd.ricette || {};
    var count = 0;
    MEALS_ORDER.forEach(function(mk){
      count += (used[mk] ? Object.keys(used[mk]).length : 0) + (ric[mk] ? Object.keys(ric[mk]).length : 0);
    });
    if (count > 0) { daysWithData++; totalMeals += count; }
  });
  var mediaMeals = daysWithData ? (totalMeals / daysWithData).toFixed(1) : '—';
  var statsHtml = '<table class="stats-table">' +
    '<tr><td>Giorni con almeno un pasto registrato (ultimi 30)</td><td class="num">'+daysWithData+'</td></tr>' +
    '<tr><td>Media alimenti/ricette consumati per giorno (solo giorni con dati)</td><td class="num">'+mediaMeals+'</td></tr>' +
    '</table>';

  /* ── Dispensa ── */
  var dispensaRows = '';
  if (typeof pantryItems !== 'undefined' && pantryItems) {
    Object.keys(pantryItems).sort().forEach(function(k){
      var d = pantryItems[k];
      if (!d || (d.quantity||0) <= 0) return;
      dispensaRows += '<tr><td>'+k+'</td><td class="num">'+d.quantity+' '+(d.unit||'g')+'</td></tr>';
    });
  }

  /* ── Spesa ── */
  var spesaRows = '';
  if (typeof spesaItems !== 'undefined' && Array.isArray(spesaItems)) {
    spesaItems.forEach(function(i){
      if (!i || !i.name) return;
      var qty = i.quantity ? i.quantity+' '+(i.unit||'g') : '—';
      spesaRows += '<tr'+(i.bought?' class="bought"':'')+'><td>'+(i.bought?'✓ ':'')+i.name+'</td><td class="num">'+qty+'</td></tr>';
    });
  }

  /* Grafici */
  var chart1Html = '';
  if (typeof pantryItems !== 'undefined' && pantryItems) {
    var catCounts = {};
    Object.keys(pantryItems).forEach(function(name){
      var p = pantryItems[name];
      if (!p || (p.quantity||0) <= 0) return;
      var cat = (p.category || 'Altro').replace(/^.\s/, '');
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    var catKeys = Object.keys(catCounts).sort();
    if (catKeys.length) {
      var maxCount = Math.max.apply(null, catKeys.map(function(k){ return catCounts[k]; })) || 1;
      chart1Html = '<div class="chart-section">';
      catKeys.forEach(function(cat){
        var count = catCounts[cat];
        var width = Math.round((count / maxCount) * 100);
        chart1Html += '<div class="chart-bar"><span class="chart-bar-label">'+cat+'</span><div class="chart-bar-track"><div class="chart-bar-fill" style="width:'+width+'%;"></div></div><span class="chart-bar-value">'+count+'</span></div>';
      });
      chart1Html += '</div>';
    }
  }

  var chart2Html = '';
  if (storicoKeys.length) {
    var dayTotals = [];
    var maxUsed = 0;
    storicoKeys.slice().reverse().forEach(function(dk){
      var hd = appHistory[dk] || {};
      var used = hd.usedItems || {};
      var ric = hd.ricette || {};
      var total = 0;
      MEALS_ORDER.forEach(function(mk){
        total += (used[mk] ? Object.keys(used[mk]).length : 0) + (ric[mk] ? Object.keys(ric[mk]).length : 0);
      });
      maxUsed = Math.max(maxUsed, total);
      var dObj = new Date(dk+'T00:00:00');
      dayTotals.push({ label: DAYS_IT[dObj.getDay()].slice(0,3)+' '+dObj.getDate()+'/'+(dObj.getMonth()+1), value: total });
    });
    if (maxUsed > 0) {
      chart2Html = '<div class="chart-section">';
      dayTotals.forEach(function(row){
        var width = Math.round((row.value / maxUsed) * 100);
        chart2Html += '<div class="chart-bar"><span class="chart-bar-label">'+row.label+'</span><div class="chart-bar-track"><div class="chart-bar-fill chart-bar-fill-2" style="width:'+width+'%;"></div></div><span class="chart-bar-value">'+row.value+'</span></div>';
      });
      chart2Html += '</div>';
    }
  }

  var css =
    '*{box-sizing:border-box;margin:0;padding:0;}'+
    'body{font-family:Georgia,"Times New Roman",serif;font-size:11pt;color:#1f2937;line-height:1.45;max-width:800px;margin:0 auto;padding:28px 36px;}'+
    '.cover{text-align:center;padding:80px 24px 60px;page-break-after:always;}'+
    '.cover h1{font-size:1.8rem;color:#166534;margin-bottom:8px;font-weight:700;}'+
    '.cover .app-name{font-size:1.1rem;color:#4a9b7f;margin-bottom:32px;letter-spacing:.05em;}'+
    '.cover .report-title{font-size:1.25rem;color:#374151;margin:24px 0 8px;font-weight:700;}'+
    '.cover .date{font-size:1rem;color:#6b7280;margin-bottom:6px;}'+
    '.cover .period{font-size:.9rem;color:#6b7280;}'+
    'h2{font-size:1.05rem;font-weight:700;color:#166534;border-bottom:2px solid #4a9b7f;padding-bottom:6px;margin:28px 0 14px;page-break-after:avoid;}'+
    'h2:first-of-type{margin-top:0;}'+
    '.section-block{margin-bottom:16px;}'+
    '.day-block{page-break-inside:avoid;margin-bottom:18px;}'+
    'h3.day-label{font-size:.95rem;font-weight:700;color:#374151;margin:14px 0 6px;padding-left:8px;border-left:4px solid #4a9b7f;}'+
    'table.data-table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10pt;}'+
    'table.data-table th,table.data-table td{padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;}'+
    'table.data-table th{text-align:left;font-weight:700;color:#374151;background:#f9fafb;}'+
    'table.data-table .num{text-align:right;white-space:nowrap;}'+
    '.meal-label{font-weight:700;white-space:nowrap;width:110px;color:#166534;}'+
    '.ing-chip{display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:4px;padding:3px 8px;margin:2px 4px 2px 0;font-size:.85em;}'+
    '.ing-chip.sub{background:#fffbeb;border-color:#fcd34d;}'+
    '.ing-chip.ric{background:#f5f3ff;border-color:#c4b5fd;}'+
    '.ing-chip em{color:#6b7280;font-style:normal;}'+
    'tr.bought td{color:#9ca3af;text-decoration:line-through;}'+
    '.stats-table{width:100%;max-width:400px;border-collapse:collapse;margin:12px 0;}'+
    '.stats-table td{padding:8px 12px;border-bottom:1px solid #e5e7eb;}'+
    '.stats-table .num{font-weight:700;color:#166534;}'+
    '.muted{color:#9ca3af;font-style:italic;margin:8px 0;}'+
    '.chart-section{margin:14px 0 24px;page-break-inside:avoid;}'+
    '.chart-bar{display:flex;align-items:center;gap:10px;margin-bottom:6px;}'+
    '.chart-bar-label{flex:0 0 100px;font-size:9pt;color:#4b5563;}'+
    '.chart-bar-track{flex:1;height:12px;border-radius:999px;background:#e5e7eb;overflow:hidden;}'+
    '.chart-bar-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#34d399,#10b981);}'+
    '.chart-bar-fill-2{height:100%;border-radius:999px;background:linear-gradient(90deg,#60a5fa,#3b82f6);}'+
    '.chart-bar-value{font-size:9pt;font-weight:700;color:#374151;min-width:28px;text-align:right;}'+
    '.chart-title{font-size:10pt;font-weight:700;color:#374151;margin-bottom:4px;}'+
    '.chart-sub{font-size:9pt;color:#6b7280;margin-bottom:10px;}'+
    '.notes-box{border:1px dashed #d1d5db;border-radius:8px;padding:20px;margin-top:16px;background:#f9fafb;min-height:80px;color:#6b7280;font-size:10pt;}'+
    '@media print{body{padding:16px 24px;}.cover{padding:60px 24px 40px;}h2{page-break-after:avoid;} .day-block,.chart-section{page-break-inside:avoid;}}';

  var html =
    '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">'+
    '<title>NutriPlan — Report per il nutrizionista — '+todayLabel+'</title>'+
    '<style>'+css+'</style></head><body>'+

    /* Copertina */
    '<div class="cover">'+
      '<h1>🌿 NutriPlan</h1>'+
      '<div class="app-name">Piano alimentare personale</div>'+
      '<div class="report-title">Report per il nutrizionista</div>'+
      '<div class="date">Esportato il '+todayLabel+'</div>'+
      (periodLabel ? '<div class="period">Periodo consumo: '+periodLabel+'</div>' : '')+
    '</div>'+

    /* 1. Profilo e vincoli */
    '<h2>1. Profilo alimentare e vincoli</h2>'+
    profiloHtml+

    /* 2. Limiti settimanali */
    '<h2>2. Limiti settimanali (riferimento)</h2>'+
    limitiHtml+

    /* 3. Piano alimentare */
    '<h2>3. Piano alimentare configurato</h2>'+
    '<p class="section-block" style="font-size:10pt;color:#6b7280;">Ingredienti e quantità previste per ogni pasto (riferimento settimanale).</p>'+
    (pianoRows ? '<table class="data-table">'+pianoRows+'</table>' : '<p class="muted">Nessun piano configurato.</p>')+

    /* 4. Consumo effettivo */
    '<h2>4. Consumo effettivo — Storico pasti</h2>'+
    (periodLabel ? '<p class="section-block" style="font-size:10pt;color:#6b7280;">Periodo: '+periodLabel+'. Alimenti e ricette segnati come consumati.</p>' : '')+
    (storicoHtml || '<p class="muted">Nessun dato di consumo negli ultimi 30 giorni.</p>')+

    /* 5. Statistiche */
    '<h2>5. Riepilogo statistiche</h2>'+
    statsHtml+

    /* 6. Dispensa */
    '<h2>6. Dispensa attuale</h2>'+
    (dispensaRows ? '<table class="data-table"><thead><tr><th>Ingrediente</th><th class="num">Quantità</th></tr></thead><tbody>'+dispensaRows+'</tbody></table>' : '<p class="muted">Dispensa vuota o non compilata.</p>')+

    /* 7. Lista spesa */
    '<h2>7. Lista della spesa</h2>'+
    (spesaRows ? '<table class="data-table"><thead><tr><th>Voce</th><th class="num">Quantità</th></tr></thead><tbody>'+spesaRows+'</tbody></table>' : '<p class="muted">Nessuna voce in lista.</p>')+

    /* 8. Grafici */
    (chart1Html || chart2Html ? '<h2>8. Riepilogo visivo</h2>'+
      (chart1Html ? '<div class="chart-title">Dispensa per categoria</div><div class="chart-sub">Numero di ingredienti con quantità &gt; 0</div>'+chart1Html : '')+
      (chart2Html ? '<div class="chart-title" style="margin-top:20px;">Consumo per giorno (ultimi 30)</div><div class="chart-sub">Alimenti/ricette segnati come consumati</div>'+chart2Html : '')
    : '')+

    /* 9. Note per nutrizionista */
    '<h2>9. Note per il nutrizionista</h2>'+
    '<div class="notes-box">Spazio per appunti in sede di confronto con il paziente.</div>'+

    '<script>window.onload=function(){window.print();}<\/script>'+
    '</body></html>';

  var win = window.open('', '_blank');
  if (!win) {
    if (typeof showToast === 'function') showToast('⚠️ Abilita i popup per esportare in PDF','warning');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
