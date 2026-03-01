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

/** Bonus keyword meteo su nome + preparazione (solo dati utente). */
function getWeatherBonusForRecipe(recipe, weatherContext) {
  if (!weatherContext || weatherContext.type === 'neutral') return 0;
  var name = (recipe.name || recipe.nome || '').toLowerCase();
  var prep = (recipe.preparazione || recipe.preparation || '').toLowerCase();
  var text = name + ' ' + prep;
  var type = weatherContext.type;
  if (type === 'cold') {
    if (/zuppa|minestra|brodo|porridge|tè|caldo|in forno|cuoci/.test(text)) return 1;
  } else if (type === 'hot') {
    if (/insalata|gazpacho|freddo|raffreddare|fresco|crudo/.test(text)) return 1;
  } else if (type === 'rain') {
    if (/cremoso|minestra|zuppa|cioccolata|torta|comfort/.test(text)) return 1;
  }
  return 0;
}

/** Etichette motivo suggerimento ricetta (per UI Casa). */
var CASA_SUGGESTION_REASONS = {
  expiring:   'Per ingredienti in scadenza',
  weather:    'Ideale per il meteo di oggi',
  ai:         'Suggerita in base al meteo (AI)',
  availability: 'In base a ciò che hai in dispensa'
};

/**
 * Ricetta suggerita per il pasto (solo da database utente): scadenza, disponibilità, bonus meteo.
 * Ritorna { recipe, weatherScore, candidateNames, reason } per UI e AI ultima spiaggia.
 */
function getCasaSuggestedRecipe(mealKey, weatherContext, aiOverrideRecipe) {
  if (!mealKey) return { recipe: null, weatherScore: 0, candidateNames: [], reason: null };
  if (aiOverrideRecipe) return { recipe: aiOverrideRecipe, weatherScore: 1, candidateNames: [], reason: 'ai' };
  var all = (typeof getAllRicette === 'function') ? getAllRicette() : [];
  var forMeal = all.filter(function(r) {
    var pasto = r.pasto;
    var pasti = Array.isArray(pasto) ? pasto : (pasto ? [pasto] : []);
    return pasti.indexOf(mealKey) !== -1;
  });
  if (!forMeal.length) return { recipe: null, weatherScore: 0, candidateNames: [], reason: null };

  var expiring = (typeof getExpiringSoon === 'function') ? getExpiringSoon(14) : [];
  var expiringNames = expiring.map(function(e) { return (e.name || '').trim().toLowerCase(); });

  function countExpiringInRecipe(recipe) {
    var ings = Array.isArray(recipe.ingredienti) ? recipe.ingredienti : [];
    return ings.filter(function(ing) {
      var n = (ing.name || ing.nome || '').trim().toLowerCase();
      return n && expiringNames.some(function(ex) { return ex === n || n.indexOf(ex) !== -1 || ex.indexOf(n) !== -1; });
    }).length;
  }

  var countAvail = (typeof countAvailable === 'function') ? countAvailable : function() { return 0; };

  var scored = forMeal.map(function(r) {
    var exp = countExpiringInRecipe(r);
    var ings = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    var avail = countAvail(ings);
    var wBonus = getWeatherBonusForRecipe(r, weatherContext);
    return { recipe: r, expiringCount: exp, avail: avail, weatherBonus: wBonus };
  });

  scored.sort(function(a, b) {
    if (b.expiringCount !== a.expiringCount) return b.expiringCount - a.expiringCount;
    if (b.weatherBonus !== a.weatherBonus) return b.weatherBonus - a.weatherBonus;
    return b.avail - a.avail;
  });

  var best = scored[0];
  var candidateNames = forMeal.map(function(r) { return r.name || r.nome || ''; }).filter(Boolean);
  var reason = null;
  if (best) {
    if (best.expiringCount > 0) reason = 'expiring';
    else if (best.weatherBonus > 0) reason = 'weather';
    else reason = 'availability';
  }
  return {
    recipe: best ? best.recipe : null,
    weatherScore: best ? best.weatherBonus : 0,
    candidateNames: candidateNames,
    reason: reason
  };
}

var _renderCasaLastRun = 0;
var _renderCasaDebounceMs = 120;
var _casaWeatherState = null; /* { loading, data, error } */
var _casaAISuggestedRecipe = null; /* override da AI ultima spiaggia */
var _casaWeatherRequestStarted = false;

function renderCasa(force) {
  var now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  if (!force && now - _renderCasaLastRun < _renderCasaDebounceMs) return;
  _renderCasaLastRun = now;

  var el = document.getElementById('casaContent');
  if (!el) return;

  var suggested = getSuggestedMeal();
  try { window.casaSuggestedMeal = suggested || 'colazione'; window.casaSuggestedDateKey = (typeof getCurrentDateKey === 'function') ? getCurrentDateKey() : ''; } catch (e) {}

  var weather = _casaWeatherState && _casaWeatherState.data ? _casaWeatherState.data : null;
  var weatherContext = (typeof getWeatherSuggestionContext === 'function') ? getWeatherSuggestionContext(weather) : null;
  var suggestionResult = getCasaSuggestedRecipe(suggested || 'colazione', weatherContext, _casaAISuggestedRecipe);
  var suggestedRecipe = suggestionResult.recipe;

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
    if (weatherContext && weatherContext.type === 'cold') subMsg = (subMsg ? subMsg + ' ' : '') + 'Con questo freddo una zuppa è l\'ideale.';
    else if (weatherContext && weatherContext.type === 'hot') subMsg = (subMsg ? subMsg + ' ' : '') + 'Con il caldo preferisci qualcosa di fresco?';
    else if (weatherContext && weatherContext.type === 'rain') subMsg = (subMsg ? subMsg + ' ' : '') + 'Giornata di pioggia: un piatto comfort?';
  } else {
    msg = 'Hai già consumato tutti i pasti di oggi.';
    subMsg = 'Rivedi il piano o prepara qualcosa in più.';
  }

  /* Avvio fetch meteo una sola volta; al risultato ri-render */
  if (typeof getWeatherForCasa === 'function' && !_casaWeatherRequestStarted) {
    _casaWeatherRequestStarted = true;
    _casaWeatherState = { loading: true };
    getWeatherForCasa(function (w) {
      _casaWeatherState = w.error ? { loading: false, error: w.error } : { loading: false, data: w };
      renderCasa(true);
    });
  }

  var weatherBlock = '';
  if (_casaWeatherState && _casaWeatherState.loading) {
    weatherBlock = '<div class="casa-weather casa-weather--loading" aria-busy="true"><span class="casa-weather-icon">🌤️</span><span class="casa-weather-temp">--</span><span class="casa-weather-label">Meteo in caricamento…</span></div>';
  } else if (weather && !weather.error) {
    var condClass = 'casa-weather--' + (weather.condition || 'cloudy');
    weatherBlock = '<div class="casa-weather ' + condClass + '">' +
      '<span class="casa-weather-icon">' + (weather.icon || '🌤️') + '</span>' +
      '<span class="casa-weather-temp">' + (weather.temp != null ? weather.temp + ' °C' : '--') + '</span>' +
      '<span class="casa-weather-label">' + escapeHtml(weather.label || '') + '</span></div>';
  }

  var greeting = getCasaGreeting();
  var consumedCount = getConsumedMealsCountToday();
  var dateStr = getCasaDateString();
  var totalMeals = 5;
  var pctBar = totalMeals ? Math.round((consumedCount / totalMeals) * 100) : 0;

  var recipeBlock = '';
  if (suggestedRecipe && typeof buildCard === 'function') {
    var reasonKey = suggestionResult.reason;
    var reasonLabel = reasonKey ? (CASA_SUGGESTION_REASONS[reasonKey] || '') : '';
    var reasonHtml = reasonLabel ? ('<p class="casa-recipe-suggestion-reason">' + escapeHtml(reasonLabel) + '</p>') : '';
    recipeBlock =
      '<div class="casa-recipe-section">' +
        '<div class="casa-recipe-section-title">📖 Ricetta consigliata per ' + escapeHtml(label || 'questo pasto') + '</div>' +
        reasonHtml +
        '<div class="casa-recipe-card-wrap">' + buildCard(suggestedRecipe) + '</div>' +
      '</div>';
  }

  /* AI ultima spiaggia: se nessun bonus meteo e ci sono candidate, chiedi a Gemini (una volta) */
  if (weatherContext && suggestionResult.weatherScore === 0 && suggestionResult.candidateNames.length > 1 && typeof suggestRecipeByWeather === 'function' && !_casaAISuggestedRecipe) {
    suggestRecipeByWeather(suggestionResult.candidateNames, weatherContext.type, function (err, recipeName) {
      if (err || !recipeName) return;
      var all = (typeof getAllRicette === 'function') ? getAllRicette() : [];
      var found = all.find(function (r) { return (r.name || r.nome || '') === recipeName; });
      if (found) {
        _casaAISuggestedRecipe = found;
        renderCasa(true);
      }
    });
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
    (weatherBlock ? weatherBlock : '') +
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
