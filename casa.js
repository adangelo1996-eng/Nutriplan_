/* ============================================================
   CASA.JS — Pagina Home/Casa
   Suggerimento pasto in base all'ora o ai pasti consumati oggi.
   ============================================================ */

var CASA_MEAL_LABELS = {
  colazione: 'Colazione',
  spuntino:   'Spuntino',
  pranzo:     'Pranzo',
  merenda:    'Merenda',
  cena:       'Cena'
};

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

/** Numero di pasti con almeno un consumo oggi (0–5). */
function getConsumedMealsCountToday() {
  var todayKey = (typeof getCurrentDateKey === 'function') ? getCurrentDateKey() : '';
  var used = (typeof appHistory !== 'undefined' && appHistory && appHistory[todayKey] && appHistory[todayKey].usedItems)
    ? appHistory[todayKey].usedItems
    : {};
  return Object.keys(used).filter(function(mk) {
    var m = used[mk] || {};
    return Object.keys(m).length > 0;
  }).length;
}

/** Saluto in base all'ora: Buongiorno / Buon pomeriggio / Buonasera [+ nome]. */
function getCasaGreeting() {
  var h = new Date().getHours();
  var greeting = (h >= 6 && h < 12) ? 'Buongiorno' : (h >= 12 && h < 18) ? 'Buon pomeriggio' : 'Buonasera';
  var name = (typeof currentUser !== 'undefined' && currentUser && currentUser.displayName) ? currentUser.displayName.trim() : '';
  return name ? greeting + ', ' + name : greeting;
}

/** Data formattata breve per la pagina Casa (es. "sabato 28 feb"). */
function getCasaDateString() {
  return new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
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

  var greeting = getCasaGreeting();
  var consumedCount = getConsumedMealsCountToday();
  var dateStr = getCasaDateString();

  var html =
    '<p class="casa-greeting">' + escapeHtml(greeting) + '</p>' +
    '<div class="casa-card rc-card">' +
      '<div class="casa-suggestion">' +
        '<div class="casa-suggestion-title">' + escapeHtml(label || 'Riepilogo') + '</div>' +
        '<p class="casa-suggestion-msg">' + escapeHtml(msg) + '</p>' +
        '<p class="casa-suggestion-sub">' + escapeHtml(subMsg) + '</p>' +
        '<button class="rc-btn rc-btn-primary" onclick="selectedMeal=\'' + (suggested || 'colazione') + '\';goToPage(\'piano\')">' +
          'Vai a Oggi →' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<p class="casa-meta">Oggi: ' + consumedCount + '/5 pasti · ' + escapeHtml(dateStr) + '</p>';

  el.innerHTML = html;
}

function escapeHtml(s) {
  if (s == null || s === '') return '';
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
