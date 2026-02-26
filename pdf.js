function exportPDF() {
  var MEAL_LABELS  = { colazione:'Colazione', spuntino:'Spuntino', pranzo:'Pranzo', merenda:'Merenda', cena:'Cena' };
  var MEALS_ORDER  = ['colazione','spuntino','pranzo','merenda','cena'];
  var DAYS_IT      = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  var MONTHS_IT    = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  var today        = new Date();
  var todayLabel   = DAYS_IT[today.getDay()]+' '+today.getDate()+' '+MONTHS_IT[today.getMonth()]+' '+today.getFullYear();

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

  /* ── Dispensa ── */
  var dispensaRows = '';
  if (typeof pantryItems !== 'undefined' && pantryItems) {
    Object.keys(pantryItems).sort().forEach(function(k){
      var d = pantryItems[k];
      if (!d || (d.quantity||0) <= 0) return;
      dispensaRows += '<tr><td>'+k+'</td><td style="text-align:right;font-weight:600;">'+d.quantity+' '+(d.unit||'g')+'</td></tr>';
    });
  }

  /* ── Storico (ultimi 30 giorni) ── */
  var storicoHtml = '';
  var storicoKeys = [];
  if (typeof appHistory !== 'undefined') {
    storicoKeys = Object.keys(appHistory).sort(function(a,b){ return b.localeCompare(a); }).slice(0,30);
    storicoKeys.forEach(function(dk){
      var d     = new Date(dk+'T00:00:00');
      var label = DAYS_IT[d.getDay()]+' '+d.getDate()+' '+MONTHS_IT[d.getMonth()];
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
      if (rows) storicoHtml += '<h3 class="day-label">'+label+'</h3><table class="data-table">'+rows+'</table>';
    });
  }

  /* ── Spesa ── */
  var spesaRows = '';
  if (typeof spesaItems !== 'undefined' && Array.isArray(spesaItems)) {
    spesaItems.forEach(function(i){
      if (!i || !i.name) return;
      var qty = i.quantity ? i.quantity+' '+(i.unit||'g') : '—';
      spesaRows += '<tr'+(i.bought?' class="bought"':'')+'><td>'+(i.bought?'✅ ':'')+i.name+'</td><td style="text-align:right;">'+qty+'</td></tr>';
    });
  }

  /* ── GRAFICO 1: ingredienti attivi per categoria ── */
  var chart1Html = '';
  if (typeof pantryItems !== 'undefined' && pantryItems) {
    var catCounts = {};
    Object.keys(pantryItems).forEach(function(name){
      var p = pantryItems[name];
      if (!p || (p.quantity||0) <= 0) return;
      var cat = p.category || '🧂 Altro';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    var catKeys = Object.keys(catCounts);
    if (catKeys.length) {
      var maxCount = catKeys.reduce(function(m,k){ return Math.max(m, catCounts[k]); }, 0) || 1;
      chart1Html = '<div class="chart-section">';
      catKeys.sort().forEach(function(cat){
        var count = catCounts[cat];
        var label = cat.replace(/^\S+\s/, '');
        var width = Math.round((count / maxCount) * 100);
        chart1Html +=
          '<div class="chart-bar">'+
            '<span class="chart-bar-label">'+label+'</span>'+
            '<div class="chart-bar-track"><div class="chart-bar-fill" style="width:'+width+'%;"></div></div>'+
            '<span class="chart-bar-value">'+count+'</span>'+
          '</div>';
      });
      chart1Html += '</div>';
    }
  }

  /* ── GRAFICO 2: attività ultimi 7 giorni ── */
  var chart2Html = '';
  if (typeof appHistory !== 'undefined' && storicoKeys.length) {
    var dayTotals = [];
    var maxUsed = 0;
    storicoKeys.slice().reverse().forEach(function(dk){
      var hd   = appHistory[dk] || {};
      var used = hd.usedItems || {};
      var totalUsed = 0;
      MEALS_ORDER.forEach(function(mk){
        var mUsed = used[mk] || {};
        totalUsed += Object.keys(mUsed).length;
      });
      maxUsed = Math.max(maxUsed, totalUsed);
      var dObj = new Date(dk+'T00:00:00');
      var shortLabel = DAYS_IT[dObj.getDay()]+' '+dObj.getDate()+'/'+(dObj.getMonth()+1);
      dayTotals.push({ label: shortLabel, value: totalUsed });
    });
    if (maxUsed > 0) {
      chart2Html = '<div class="chart-section">';
      dayTotals.forEach(function(row){
        var width = Math.round((row.value / maxUsed) * 100);
        chart2Html +=
          '<div class="chart-bar">'+
            '<span class="chart-bar-label">'+row.label+'</span>'+
            '<div class="chart-bar-track"><div class="chart-bar-fill chart-bar-fill-2" style="width:'+width+'%;"></div></div>'+
            '<span class="chart-bar-value">'+row.value+'</span>'+
          '</div>';
      });
      chart2Html += '</div>';
    }
  }

  var html =
    '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">'+
    '<title>NutriPlan — Export '+todayLabel+'</title>'+
    '<style>'+
      '*{box-sizing:border-box;margin:0;padding:0;}'+
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;color:#1a2e22;padding:24px 32px;max-width:900px;margin:0 auto;}'+
      'h1{font-size:1.5rem;color:#2d6e55;margin-bottom:4px;}'+
      '.subtitle{font-size:.85rem;color:#6b7280;margin-bottom:24px;}'+
      'h2{font-size:1.05rem;font-weight:700;color:#2d6e55;border-bottom:2px solid #4a9b7f;padding-bottom:4px;margin:28px 0 12px;}'+
      'h3.day-label{font-size:.9rem;font-weight:700;color:#374151;margin:16px 0 6px;padding-left:4px;border-left:3px solid #4a9b7f;}'+
      'table.data-table{width:100%;border-collapse:collapse;margin-bottom:10px;}'+
      'table.data-table td{padding:6px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top;}'+
      'table.data-table tr:last-child td{border-bottom:none;}'+
      '.meal-label{font-weight:700;white-space:nowrap;width:100px;color:#4a9b7f;}'+
      '.ing-chip{display:inline-block;background:#f0faf5;border:1px solid #bbf0d9;border-radius:4px;padding:2px 7px;margin:2px 3px 2px 0;font-size:.8rem;}'+
      '.ing-chip.sub{background:#fff3cd;border-color:#ffd166;}'+
      '.ing-chip.ric{background:#ede9fe;border-color:#c4b5fd;}'+
      '.ing-chip em{color:#6b7280;font-style:normal;}'+
      'tr.bought td{color:#9ca3af;text-decoration:line-through;}'+
      '.chart-section{margin:12px 0 20px;page-break-inside:avoid;}'+
      '.chart-bar{display:flex;align-items:center;gap:8px;margin-bottom:4px;}'+
      '.chart-bar-label{flex:0 0 90px;font-size:.78rem;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
      '.chart-bar-track{flex:1;height:10px;border-radius:999px;background:#e5e7eb;overflow:hidden;}'+
      '.chart-bar-fill{height:100%;border-radius:999px;background:#4ade80;}'+
      '.chart-bar-fill-2{height:100%;border-radius:999px;background:#60a5fa;}'+
      '.chart-bar-value{font-size:.78rem;color:#374151;min-width:24px;text-align:right;}'+
      '.chart-title{font-size:.85rem;font-weight:700;color:#374151;margin-bottom:6px;}'+
      '.chart-sub{font-size:.76rem;color:#6b7280;margin-bottom:8px;}'+
      '@media print{body{padding:12px 16px;}h2{page-break-before:auto;}}'+
    '</style></head><body>'+
    '<h1>🌿 NutriPlan</h1>'+
    '<div class="subtitle">Esportato il '+todayLabel+'</div>'+

    '<h2>📋 Piano alimentare</h2>'+
    (pianoRows
      ? '<table class="data-table">'+pianoRows+'</table>'
      : '<p style="color:#9ca3af;">Nessun piano configurato.</p>')+

    (dispensaRows
      ? '<h2>🗄️ Dispensa</h2><table class="data-table">'+dispensaRows+'</table>'
      : '')+

    (storicoHtml
      ? '<h2>📅 Storico pasti (ultimi 30 giorni)</h2>'+storicoHtml
      : '')+

    (spesaRows
      ? '<h2>🛒 Lista spesa</h2><table class="data-table">'+spesaRows+'</table>'
      : '')+

    (chart1Html || chart2Html
      ? '<h2>📈 Riepilogo visivo</h2>'+
        (chart1Html
          ? '<div class="chart-title">🗄️ Ingredienti attivi per categoria</div>'+
            '<div class="chart-sub">Numero di ingredienti con quantità &gt; 0 in dispensa</div>'+
            chart1Html
          : '')+
        (chart2Html
          ? '<div class="chart-title" style="margin-top:20px;">📅 Attività ultimi 30 giorni</div>'+
            '<div class="chart-sub">Numero totale di alimenti segnati come consumati per giorno</div>'+
            chart2Html
          : '')
      : '')+

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
