/* ============================================================
   CASA.JS — Pagina Home/Casa
   Suggerimento pasto in base all'ora o ai pasti consumati oggi.
   Usa la scena 3D React Three Fiber se disponibile.
   ============================================================ */

var CASA_MEAL_LABELS = {
  colazione: 'Colazione',
  spuntino:   'Spuntino',
  pranzo:     'Pranzo',
  merenda:    'Merenda',
  cena:       'Cena'
};

var _casaUnmount = null;

function getSuggestedMeal() {
  var now = new Date().getHours();
  var todayKey = (typeof getCurrentDateKey === 'function') ? getCurrentDateKey() : '';
  var used = (typeof appHistory !== 'undefined' && appHistory && appHistory[todayKey] && appHistory[todayKey].usedItems)
    ? appHistory[todayKey].usedItems
    : {};
  var consumed = Object.keys(used).filter(function(mk) {
    var m = used[mk] || {};
    return Object.keys(m).length > 0;
  });

  /* Se ha consumato pasti, suggerisci il prossimo */
  if (consumed.length > 0) {
    var order = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
    for (var i = 0; i < order.length; i++) {
      if (consumed.indexOf(order[i]) === -1) return order[i];
    }
    return null;
  }
  /* Altrimenti in base all'ora */
  if (now >= 6 && now < 10) return 'colazione';
  if (now >= 10 && now < 12) return 'spuntino';
  if (now >= 12 && now < 15) return 'pranzo';
  if (now >= 15 && now < 17) return 'merenda';
  if (now >= 17 && now < 22) return 'cena';
  return null;
}

function renderCasa() {
  var el = document.getElementById('casaContent');
  if (!el) return;

  var suggested = getSuggestedMeal();
  var label = suggested ? CASA_MEAL_LABELS[suggested] : '';
  var msg = '';
  var subMsg = '';

  if (suggested) {
    var msgs = {
      colazione: { msg: 'È l\'ora di colazione.', sub: 'Cosa hai in programma?' },
      spuntino:  { msg: 'È l\'ora dello spuntino.', sub: 'Un break veloce?' },
      pranzo:    { msg: 'È l\'ora di pranzo.', sub: 'Cosa hai in programma?' },
      merenda:   { msg: 'È l\'ora della merenda.', sub: 'Un break dolce o salato?' },
      cena:      { msg: 'È l\'ora di cena.', sub: 'Cosa prepari stasera?' }
    };
    var m = msgs[suggested] || { msg: 'Suggerimento: ' + label + '.', sub: 'Cosa hai in programma?' };
    msg = m.msg;
    subMsg = m.sub;
  } else {
    msg = 'Hai già consumato tutti i pasti di oggi.';
    subMsg = 'Rivedi il piano o prepara qualcosa in più.';
  }

  var userName = (typeof currentUser !== 'undefined' && currentUser && currentUser.displayName) ? currentUser.displayName : '';
  var onVaiOggi = function() {
    if (typeof selectedMeal !== 'undefined') window.selectedMeal = suggested || 'colazione';
    if (typeof goToPage === 'function') goToPage('piano');
  };

  /* Usa scena 3D se disponibile */
  if (typeof window.mountCasaScene === 'function') {
    if (_casaUnmount) _casaUnmount();
    el.innerHTML = '';
    var container = document.createElement('div');
    container.className = 'casa-scene-container';
    container.style.cssText = 'width:100%;height:100%;min-height:320px;flex:1;display:flex;';
    el.appendChild(container);
    _casaUnmount = window.mountCasaScene(container, {
      suggestedMeal: suggested,
      suggestedLabel: label || 'Riepilogo',
      msg: msg,
      subMsg: subMsg,
      userName: userName,
      onVaiOggi: onVaiOggi
    });
    return;
  }

  /* Fallback: card HTML classica */
  var html =
    '<div class="casa-card rc-card">' +
      '<div class="casa-suggestion">' +
        '<div class="casa-suggestion-title">' + (label || 'Riepilogo') + '</div>' +
        '<p class="casa-suggestion-msg">' + msg + '</p>' +
        '<p class="casa-suggestion-sub">' + subMsg + '</p>' +
        '<button class="rc-btn rc-btn-primary" onclick="selectedMeal=\'' + (suggested || 'colazione') + '\';goToPage(\'piano\')">' +
          'Vai a Oggi →' +
        '</button>' +
      '</div>' +
    '</div>';

  el.innerHTML = html;
}
