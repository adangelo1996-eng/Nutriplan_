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

/** Restituisce il pasto associato alla fascia oraria corrente (solo ora, non consumi). */
function getMealByTime(hours) {
  if (hours >= 6 && hours < 10) return 'colazione';
  if (hours >= 10 && hours < 12) return 'spuntino';
  if (hours >= 12 && hours < 15) return 'pranzo';
  if (hours >= 15 && hours < 17) return 'merenda';
  if (hours >= 17 && hours < 22) return 'cena';
  return null;
}

function getSuggestedMeal() {
  var now = new Date().getHours();
  var consumed = getConsumedMealKeysToday();
  var order = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];

  /* Fascia oraria corrente: da qui in avanti si suggerisce (se l'ora è passata non torniamo indietro) */
  var mealByTime = getMealByTime(now);
  if (!mealByTime) return null; /* fuori 6–22 non suggerire */
  var startIdx = order.indexOf(mealByTime);
  if (startIdx < 0) startIdx = 0;

  /* Primo pasto non ancora consumato a partire dalla fascia oraria corrente */
  for (var i = startIdx; i < order.length; i++) {
    if (consumed.indexOf(order[i]) === -1) return order[i];
  }
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
 * Bonus meteo: prima associazione in DB (recipe.meteo), poi fallback keyword.
 * L'AI va usata solo quando nessuna ricetta ha associazione (nuove ricette/ingredienti).
 */
function getWeatherBonusForRecipe(recipe, weatherContext) {
  if (!weatherContext || weatherContext.type === 'neutral') return 0;
  var type = weatherContext.type;
  var meteo = recipe.meteo;
  if (meteo) {
    var arr = Array.isArray(meteo) ? meteo : [meteo];
    if (arr.indexOf(type) !== -1) return 1;
  }
  var name = (recipe.name || recipe.nome || '').toLowerCase();
  var prep = (recipe.preparazione || recipe.preparation || '').toLowerCase();
  var text = name + ' ' + prep;
  if (type === 'cold') {
    if (/zuppa|minestra|brodo|porridge|tè|caldo|in forno|cuoci/.test(text)) return 1;
  } else if (type === 'hot') {
    if (/insalata|gazpacho|freddo|raffreddare|fresco|crudo/.test(text)) return 1;
  } else if (type === 'rain') {
    if (/cremoso|minestra|zuppa|cioccolata|torta|comfort/.test(text)) return 1;
  }
  return 0;
}

/** Categorie esplicite per le due ricette suggerite in Casa (affiancate in UI). */
var CASA_SUGGESTION_CATEGORIES = {
  expiring: 'Per ingredienti in scadenza',
  weather:  'In base al meteo',
  weatherAi: 'In base al meteo (suggerita dall\'AI)'
};

/**
 * Due ricette suggerite per il pasto: 1) per scadenza, 2) per meteo (con eventuale AI).
 * Ritorna { expiring: { recipe, hasExpiring }, weather: { recipe, isAi }, candidateNames, needAiFallback }.
 */
function getCasaSuggestedRecipes(mealKey, weatherContext, aiOverrideRecipe) {
  var empty = { expiring: { recipe: null, hasExpiring: false }, weather: { recipe: null, isAi: false }, candidateNames: [], needAiFallback: false };
  if (!mealKey) return empty;

  var all = (typeof getAllRicette === 'function') ? getAllRicette() : [];
  var forMeal = all.filter(function(r) {
    var pasto = r.pasto;
    var pasti = Array.isArray(pasto) ? pasto : (pasto ? [pasto] : []);
    return pasti.indexOf(mealKey) !== -1;
  });
  if (!forMeal.length) return empty;

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

  var byExpiring = scored.slice().sort(function(a, b) {
    if (b.expiringCount !== a.expiringCount) return b.expiringCount - a.expiringCount;
    if (b.weatherBonus !== a.weatherBonus) return b.weatherBonus - a.weatherBonus;
    return b.avail - a.avail;
  });
  var byWeather = scored.slice().sort(function(a, b) {
    if (b.weatherBonus !== a.weatherBonus) return b.weatherBonus - a.weatherBonus;
    if (b.expiringCount !== a.expiringCount) return b.expiringCount - a.expiringCount;
    return b.avail - a.avail;
  });

  var expiringBest = byExpiring[0];
  var expiringRecipe = expiringBest ? expiringBest.recipe : null;
  var hasExpiring = expiringBest ? expiringBest.expiringCount > 0 : false;

  var weatherRecipe = null;
  var weatherIsAi = false;
  var bestWeatherBonus = byWeather[0] ? byWeather[0].weatherBonus : 0;

  if (aiOverrideRecipe) {
    weatherRecipe = aiOverrideRecipe;
    weatherIsAi = true;
  } else {
    for (var i = 0; i < byWeather.length; i++) {
      var w = byWeather[i];
      if (w.recipe !== expiringRecipe) { weatherRecipe = w.recipe; break; }
    }
    if (!weatherRecipe && byWeather.length) weatherRecipe = byWeather[0].recipe;
  }

  var candidateNames = forMeal.map(function(r) { return r.name || r.nome || ''; }).filter(Boolean);
  var needAiFallback = !!(weatherContext && weatherContext.type !== 'neutral' && bestWeatherBonus === 0 && candidateNames.length > 1 && !aiOverrideRecipe);

  return {
    expiring: { recipe: expiringRecipe, hasExpiring: hasExpiring },
    weather: { recipe: weatherRecipe, isAi: weatherIsAi },
    candidateNames: candidateNames,
    needAiFallback: needAiFallback
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
  var suggestions = getCasaSuggestedRecipes(suggested || 'colazione', weatherContext, _casaAISuggestedRecipe);

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
  if (typeof buildCard === 'function') {
    var sectionTitle = '📖 Ricette consigliate per ' + (label || 'questo pasto');
    var part1 = '';
    var part2 = '';
    if (suggestions.expiring.recipe) {
      part1 =
        '<div class="casa-recipe-section">' +
          '<div class="casa-recipe-category">' + escapeHtml(CASA_SUGGESTION_CATEGORIES.expiring) + '</div>' +
          '<div class="casa-recipe-card-wrap">' + buildCard(suggestions.expiring.recipe) + '</div>' +
        '</div>';
    }
    if (suggestions.weather.recipe) {
      var weatherCategory = suggestions.weather.isAi ? CASA_SUGGESTION_CATEGORIES.weatherAi : CASA_SUGGESTION_CATEGORIES.weather;
      part2 =
        '<div class="casa-recipe-section">' +
          '<div class="casa-recipe-category">' + escapeHtml(weatherCategory) + '</div>' +
          '<div class="casa-recipe-card-wrap">' + buildCard(suggestions.weather.recipe) + '</div>' +
        '</div>';
    }
    if (part1 || part2) {
      recipeBlock = '<div class="casa-recipe-sections">' +
        '<div class="casa-recipe-section-title">' + escapeHtml(sectionTitle) + '</div>' +
        '<div class="casa-recipe-sections-row">' + part1 + part2 + '</div>' +
      '</div>';
    }
  }

  /* AI ultima spiaggia: se nessun bonus meteo e ci sono candidate, chiedi a Gemini (una volta) */
  if (suggestions.needAiFallback && typeof suggestRecipeByWeather === 'function' && !_casaAISuggestedRecipe) {
    suggestRecipeByWeather(suggestions.candidateNames, weatherContext.type, function (err, recipeName) {
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

  var sharedBlock = '';
  var hasHousehold = typeof householdId !== 'undefined' && householdId;
  var hasUser = typeof currentUser !== 'undefined' && currentUser;
  if (hasHousehold) {
    sharedBlock = '<div class="casa-shared-section rc-card">' +
      '<div class="casa-shared-title">Casa condivisa</div>' +
      '<div id="casaHouseholdCredentialsBox" class="casa-credentials-box">' +
        '<div class="casa-credentials-row">' +
          '<span class="casa-credentials-label">Nome</span>' +
          '<span id="casaHouseholdName" class="casa-credentials-value">—</span>' +
        '</div>' +
        '<div class="casa-credentials-row">' +
          '<span class="casa-credentials-label">Codice</span>' +
          '<span id="casaHouseholdCodeWrap" class="casa-credentials-code-wrap casa-credentials-code-blur">' +
            '<span id="casaHouseholdCode" class="casa-credentials-code">—</span>' +
          '</span>' +
          '<button type="button" id="casaHouseholdCodeEye" class="casa-credentials-eye" title="Mostra/nascondi codice" aria-label="Mostra codice">' +
            '<span class="casa-eye-icon casa-eye-show" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>' +
            '<span class="casa-eye-icon casa-eye-hide" aria-hidden="true" style="display:none;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<p class="casa-shared-desc">Dispensa e lista della spesa condivise con i membri della casa.</p>' +
      '<div class="casa-shared-buttons" style="margin-bottom:12px;">' +
        '<button class="casa-shared-btn casa-shared-btn-primary" onclick="copyHouseholdInviteLink()">' +
          '<span class="casa-shared-btn-icon">\uD83D\uDCCB</span>' +
          '<span>Copia link invito</span>' +
        '</button>' +
      '</div>' +
      '<div class="casa-shared-members">' +
        '<div class="casa-shared-label">Membri</div>' +
        '<div id="casaHouseholdMembersList" class="casa-shared-members-list">Caricamento...</div>' +
      '</div>' +
      '<div class="casa-shared-last-activity">' +
        '<div class="casa-shared-label">Ultima modifica</div>' +
        '<div id="casaHouseholdLastActivity" class="casa-shared-last-activity-text">Caricamento...</div>' +
      '</div>' +
      '<div class="casa-shared-buttons">' +
        '<button class="casa-shared-btn" onclick="goToPageWithButtonExpand(\'dispensa\', this)" data-page="dispensa">' +
          '<span class="casa-shared-btn-icon">\uD83D\uDCE6</span>' +
          '<span>Dispensa</span>' +
        '</button>' +
        '<button class="casa-shared-btn" onclick="goToPageWithButtonExpand(\'spesa\', this)" data-page="spesa">' +
          '<span class="casa-shared-btn-icon">\uD83D\uDED2</span>' +
          '<span>Lista della spesa</span>' +
        '</button>' +
      '</div>' +
      '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);">' +
        '<button class="casa-shared-btn" style="color:var(--text-3);" onclick="confirmDeleteHousehold()">' +
          '<span class="casa-shared-btn-icon">\u2716</span>' +
          '<span>Elimina casa condivisa</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  } else if (hasUser) {
    sharedBlock = '<div class="casa-shared-section rc-card">' +
      '<div class="casa-shared-title">Casa condivisa</div>' +
      '<p class="casa-shared-desc">Condividi dispensa e lista della spesa con familiari o coinquilini.</p>' +
      '<div class="casa-shared-buttons">' +
        '<button class="casa-shared-btn casa-shared-btn-primary" onclick="createHouseholdAndShowLink()">' +
          '<span class="casa-shared-btn-icon">\u2795</span>' +
          '<span>Crea una casa</span>' +
        '</button>' +
      '</div>' +
      '<div style="margin-top:12px;">' +
        '<div style="font-size:.85em;color:var(--text-2);margin-bottom:6px;">Con link invito</div>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<input type="text" id="casaHouseholdJoinInput" placeholder="Incolla il link invito" ' +
                 'style="flex:1;padding:10px 12px;border-radius:var(--r-md);border:1.5px solid var(--border);background:var(--bg-subtle);font-size:.9em;color:var(--text-1);">' +
          '<button class="casa-shared-btn" onclick="joinHouseholdFromCasaInput()">Unisciti</button>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">' +
        '<div style="font-size:.85em;color:var(--text-2);margin-bottom:6px;">Oppure con nome e password</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<input type="text" id="casaHouseholdNameInput" placeholder="Nome della casa" ' +
                 'style="padding:10px 12px;border-radius:var(--r-md);border:1.5px solid var(--border);background:var(--bg-subtle);font-size:.9em;color:var(--text-1);">' +
          '<input type="password" id="casaHouseholdPasswordInput" placeholder="Password" ' +
                 'style="padding:10px 12px;border-radius:var(--r-md);border:1.5px solid var(--border);background:var(--bg-subtle);font-size:.9em;color:var(--text-1);">' +
          '<button class="casa-shared-btn" onclick="joinHouseholdByNamePasswordFromCasa()">Accedi alla casa</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

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
    sharedBlock +
    '<p class="casa-meta">Oggi · ' + escapeHtml(dateStr) + '</p>';

  el.innerHTML = html;

  if (householdId) {
    fillHouseholdCredentialsBox(householdId);
  }

  if (householdId && typeof getHouseholdMembers === 'function' && typeof getHouseholdLastActivity === 'function') {
    var hid = householdId;
    getHouseholdMembers(hid).then(function (members) {
      var uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
      if (uid && (!members || !members[uid])) {
        householdId = null;
        if (typeof stopHouseholdRealtimeListener === 'function') stopHouseholdRealtimeListener();
        if (typeof saveData === 'function') saveData();
        if (typeof renderCasa === 'function') renderCasa(true);
        return;
      }
      var listEl = document.getElementById('casaHouseholdMembersList');
      if (!listEl || listEl.closest('#casaContent') === null) return;
      if (!members || Object.keys(members).length === 0) {
        listEl.innerHTML = '<span class="casa-shared-empty">Nessun membro</span>';
        return;
      }
      listEl.innerHTML = Object.keys(members).map(function (uid) {
        var m = members[uid];
        var name = (m && m.displayName) || m.email || uid.slice(0, 8);
        var role = (m && m.role) === 'owner' ? ' (creatore)' : '';
        return '<div class="casa-shared-member-row">' + escapeHtml(String(name)) + role + '</div>';
      }).join('');
    });
    getHouseholdLastActivity(hid).then(function (text) {
      var actEl = document.getElementById('casaHouseholdLastActivity');
      if (!actEl || actEl.closest('#casaContent') === null) return;
      actEl.innerHTML = text ? ('<span class="casa-shared-activity-text">' + escapeHtml(text) + '</span>') : '<span class="casa-shared-empty">Nessuna modifica recente</span>';
    });
  }
}

function fillHouseholdCredentialsBox(hid) {
  var nameEl = document.getElementById('casaHouseholdName');
  var codeEl = document.getElementById('casaHouseholdCode');
  var wrapEl = document.getElementById('casaHouseholdCodeWrap');
  var eyeBtn = document.getElementById('casaHouseholdCodeEye');
  if (!nameEl || !codeEl || !wrapEl || !eyeBtn) return;
  var cred = (typeof getHouseholdDisplayCredentials === 'function') ? getHouseholdDisplayCredentials(hid) : { name: null, code: null };
  var name = (cred && cred.name) ? cred.name : null;
  var code = (cred && cred.code) ? cred.code : null;
  if (!name && typeof getHouseholdNameFromFirebase === 'function') {
    getHouseholdNameFromFirebase(hid).then(function (firebaseName) {
      if (nameEl.closest('#casaContent') === null) return;
      nameEl.textContent = firebaseName || '—';
    });
  } else {
    nameEl.textContent = name || '—';
  }
  codeEl.textContent = code || '—';
  wrapEl.classList.add('casa-credentials-code-blur');
  eyeBtn.setAttribute('aria-label', 'Mostra codice');
  eyeBtn.onclick = function () {
    var blurred = wrapEl.classList.contains('casa-credentials-code-blur');
    var showEl = eyeBtn.querySelector('.casa-eye-show');
    var hideEl = eyeBtn.querySelector('.casa-eye-hide');
    if (blurred) {
      wrapEl.classList.remove('casa-credentials-code-blur');
      eyeBtn.setAttribute('aria-label', 'Nascondi codice');
      if (showEl) showEl.style.display = 'none';
      if (hideEl) hideEl.style.display = '';
    } else {
      wrapEl.classList.add('casa-credentials-code-blur');
      eyeBtn.setAttribute('aria-label', 'Mostra codice');
      if (showEl) showEl.style.display = '';
      if (hideEl) hideEl.style.display = 'none';
    }
  };
}

function escapeHtml(s) {
  if (s == null || s === '') return '';
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function joinHouseholdFromCasaInput() {
  var inp = document.getElementById('casaHouseholdJoinInput');
  if (!inp) return;
  var hid = typeof parseJoinInput === 'function' ? parseJoinInput(inp.value) : (inp.value && inp.value.trim()) || null;
  if (!hid) {
    if (typeof showToast === 'function') showToast('Incolla il link invito o l\'id della casa', 'warning');
    return;
  }
  if (typeof joinHousehold === 'function') {
    joinHousehold(hid).then(function (ok) {
      if (ok && inp) inp.value = '';
    });
  }
}

function joinHouseholdByNamePasswordFromCasa() {
  var nameEl = document.getElementById('casaHouseholdNameInput');
  var passEl = document.getElementById('casaHouseholdPasswordInput');
  var name = nameEl ? nameEl.value : '';
  var password = passEl ? passEl.value : '';
  if (!name || !name.trim()) {
    if (typeof showToast === 'function') showToast('Inserisci il nome della casa', 'warning');
    return;
  }
  if (!password || !password.trim()) {
    if (typeof showToast === 'function') showToast('Inserisci la password', 'warning');
    return;
  }
  if (typeof joinHouseholdByNameAndPassword !== 'function') {
    if (typeof showToast === 'function') showToast('Funzione non disponibile', 'error');
    return;
  }
  joinHouseholdByNameAndPassword(name.trim(), password).then(function (ok) {
    if (ok) {
      if (nameEl) nameEl.value = '';
      if (passEl) passEl.value = '';
      if (typeof showToast === 'function') showToast('Accesso alla casa effettuato.', 'success');
    } else {
      if (typeof showToast === 'function') showToast('Nome casa o password non corretti. Riprova.', 'error');
    }
  });
}
