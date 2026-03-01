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

/** Pasti considerati "completati" oggi: da usedItems O da ricette preparate. */
function getConsumedMealKeysToday() {
  var todayKey = (typeof getCurrentDateKey === 'function') ? getCurrentDateKey() : '';
  if (typeof appHistory === 'undefined' || !appHistory || !appHistory[todayKey]) return [];
  var day = appHistory[todayKey];
  var used = day.usedItems || {};
  var ricette = day.ricette || {};
  var fromUsed = Object.keys(used).filter(function(mk) {
    var m = used[mk] || {};
    return Object.keys(m).length > 0;
  });
  var fromRicette = Object.keys(ricette).filter(function(mk) {
    var r = ricette[mk] || {};
    return Object.keys(r).length > 0;
  });
  var combined = {};
  fromUsed.forEach(function(m) { combined[m] = true; });
  fromRicette.forEach(function(m) { combined[m] = true; });
  return Object.keys(combined);
}

function getSuggestedMeal() {
  var now = new Date().getHours();
  var consumed = getConsumedMealKeysToday();

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

/** Numero di pasti con almeno un consumo oggi (0–5): usedItems + ricette preparate. */
function getConsumedMealsCountToday() {
  return getConsumedMealKeysToday().length;
}

/** Saluto in base all'ora: Buongiorno / Buon pomeriggio / Buonasera [+ solo nome, senza cognome]. */
function getCasaGreeting() {
  var h = new Date().getHours();
  var greeting = (h >= 6 && h < 12) ? 'Buongiorno' : (h >= 12 && h < 18) ? 'Buon pomeriggio' : 'Buonasera';
  var name = (typeof currentUser !== 'undefined' && currentUser && currentUser.displayName)
    ? (currentUser.displayName.split(' ')[0] || currentUser.displayName.trim())
    : '';
  return name ? greeting + ', ' + name : greeting;
}

/** Data formattata breve per la pagina Casa (es. "sabato 28 feb"). */
function getCasaDateString() {
  return new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
}

/**
 * Ricetta suggerita per il pasto: quella con più ingredienti in scadenza;
 * in assenza di ingredienti in scadenza, quella con più ingredienti disponibili in dispensa.
 */
function getCasaSuggestedRecipe(mealKey) {
  if (!mealKey) return null;
  var all = (typeof getAllRicette === 'function') ? getAllRicette() : [];
  var forMeal = all.filter(function(r) {
    var pasto = r.pasto;
    var pasti = Array.isArray(pasto) ? pasto : (pasto ? [pasto] : []);
    return pasti.indexOf(mealKey) !== -1;
  });
  if (!forMeal.length) return null;

  var expiring = (typeof getExpiringSoon === 'function') ? getExpiringSoon(14) : [];
  var expiringNames = expiring.map(function(e) { return (e.name || '').trim().toLowerCase(); });

  function countExpiringInRecipe(recipe) {
    var ings = Array.isArray(recipe.ingredienti) ? recipe.ingredienti : [];
    return ings.filter(function(ing) {
      var n = (ing.name || ing.nome || '').trim().toLowerCase();
      return n && expiringNames.some(function(ex) { return ex === n || n.indexOf(ex) !== -1 || ex.indexOf(n) !== -1; });
    }).length;
  }

  var withExpiring = forMeal.map(function(r) {
    return { recipe: r, expiringCount: countExpiringInRecipe(r) };
  }).filter(function(x) { return x.expiringCount > 0; });

  if (withExpiring.length) {
    withExpiring.sort(function(a, b) { return b.expiringCount - a.expiringCount; });
    return withExpiring[0].recipe;
  }

  var countAvail = (typeof countAvailable === 'function') ? countAvailable : function() { return 0; };
  forMeal.sort(function(a, b) {
    var aIngs = Array.isArray(a.ingredienti) ? a.ingredienti : [];
    var bIngs = Array.isArray(b.ingredienti) ? b.ingredienti : [];
    var diff = countAvail(bIngs) - countAvail(aIngs);
    if (diff !== 0) return diff;
    return (b.ingredienti || []).length - (a.ingredienti || []).length;
  });
  return forMeal[0] || null;
}

var _renderCasaLastRun = 0;
var _renderCasaDebounceMs = 120;

function renderCasa() {
  var now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  if (now - _renderCasaLastRun < _renderCasaDebounceMs) return;
  _renderCasaLastRun = now;

  var el = document.getElementById('casaContent');
  if (!el) return;

  var suggested = getSuggestedMeal();
  /* Esponi per openRecipeModal: prepara da Casa con pasto suggerito */
  try { window.casaSuggestedMeal = suggested || 'colazione'; window.casaSuggestedDateKey = (typeof getCurrentDateKey === 'function') ? getCurrentDateKey() : ''; } catch (e) {}

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
  var totalMeals = 5;
  var pctBar = totalMeals ? Math.round((consumedCount / totalMeals) * 100) : 0;

  var suggestedRecipe = getCasaSuggestedRecipe(suggested || 'colazione');
  var recipeBlock = '';
  if (suggestedRecipe && typeof buildCard === 'function') {
    var recipeName = suggestedRecipe.name || suggestedRecipe.nome || '';
    recipeBlock =
      '<div class="casa-recipe-section">' +
        '<div class="casa-recipe-section-title">📖 Ricetta consigliata per ' + escapeHtml(label || 'questo pasto') + '</div>' +
        '<div class="casa-recipe-card-wrap">' + buildCard(suggestedRecipe) + '</div>' +
      '</div>';
  }

  var completionBar =
    '<div class="casa-completion-wrap meal-progress-wrap">' +
      '<div class="meal-prog-bar-wrap">' +
        '<div class="meal-prog-bar" role="progressbar" aria-valuenow="' + consumedCount + '" aria-valuemin="0" aria-valuemax="' + totalMeals + '">' +
          '<div class="meal-prog-fill casa-prog-fill" style="width:' + pctBar + '%"></div>' +
        '</div>' +
        '<span class="meal-prog-label casa-prog-label">' + consumedCount + '/' + totalMeals + ' pasti</span>' +
      '</div>' +
    '</div>';

  var html =
    '<p class="casa-greeting">' + escapeHtml(greeting) + '</p>' +
    completionBar +
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
    recipeBlock +
    '<p class="casa-meta">Oggi · ' + escapeHtml(dateStr) + '</p>';

  el.innerHTML = html;
}

function escapeHtml(s) {
  if (s == null || s === '') return '';
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
