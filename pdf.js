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

  /* ── Storico (ultimi 7 giorni) ── */
  var storicoHtml = '';
  if (typeof appHistory !== 'undefined') {
    var skeys = Object.keys(appHistory).sort(function(a,b){ return b.localeCompare(a); }).slice(0,7);
    skeys.forEach(function(dk){
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
      ? '<h2>📅 Storico pasti (ultimi 7 giorni)</h2>'+storicoHtml
      : '')+

    (spesaRows
      ? '<h2>🛒 Lista spesa</h2><table class="data-table">'+spesaRows+'</table>'
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
