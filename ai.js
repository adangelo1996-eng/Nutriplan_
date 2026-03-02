/*
   AI.JS — Pagina Assistente AI
   Comandi in linguaggio naturale → azioni su piano, dispensa, spesa, ricette.
   Sempre anteprima con conferma prima di eseguire.
*/

var _aiPendingResult = null;
var _aiPendingRequestText = '';
var _aiSuggestedRecipes = [];

var AI_MEAL_LABELS = {
  colazione: 'Colazione',
  spuntino: 'Spuntino',
  pranzo: 'Pranzo',
  merenda: 'Merenda',
  cena: 'Cena'
};

var AI_EXAMPLE_COMMANDS = [
  'Ho mangiato pollo con verdure',
  'Aggiungi latte alla spesa',
  'Non so cosa mangiare stasera',
  'Voglio fare qualcosa con spinaci e pollo'
];

var AI_REQUESTS_LIMIT = 5;
var AI_ADMIN_EMAILS = ['a.dangelo1996@gmail.com'];
var _aiRequestsToday = { date: '', count: 0 };

function _isAIAdmin() {
  var user = (typeof currentUser !== 'undefined') ? currentUser : null;
  if (!user || !user.email) return false;
  var email = (user.email || '').toLowerCase().trim();
  return AI_ADMIN_EMAILS.some(function(e) { return (e || '').toLowerCase().trim() === email; });
}

function _getAIDailyRequests() {
  try {
    var raw = localStorage.getItem('nutriplan_ai_requests');
    if (raw) {
      var r = JSON.parse(raw);
      var today = new Date().toISOString().slice(0, 10);
      if (r.date === today) return r.count;
    }
  } catch (e) {}
  return 0;
}

function _incrementAIDailyRequests() {
  try {
    var today = new Date().toISOString().slice(0, 10);
    var count = _getAIDailyRequests();
    if (count >= AI_REQUESTS_LIMIT) return false;
    count++;
    localStorage.setItem('nutriplan_ai_requests', JSON.stringify({ date: today, count: count }));
    return true;
  } catch (e) {}
  return true;
}

function _updateAILimitBanner() {
  var bannerEl = document.getElementById('aiLimitBanner');
  if (!bannerEl) return;
  var used = _getAIDailyRequests();
  var left = Math.max(0, AI_REQUESTS_LIMIT - used);
  if (_isAIAdmin()) {
    bannerEl.innerHTML = '<span class="ai-limit-text">Admin: limiti disabilitati. (Standard: ' + AI_REQUESTS_LIMIT + ' richieste/giorno.)</span>';
  } else {
    bannerEl.innerHTML = '<span class="ai-limit-text">Massimo ' + AI_REQUESTS_LIMIT + ' richieste al giorno. Oggi ne hai usate ' + used + ', ne restano ' + left + '.</span>';
  }
  bannerEl.style.display = 'block';
}

function updateAdminBadge() {
  var badge = document.getElementById('adminBadge');
  if (!badge) return;
  badge.style.display = _isAIAdmin() ? 'inline-flex' : 'none';
}

function renderAIPage() {
  _aiPendingResult = null;
  _aiSuggestedRecipes = [];
  var inputWrap = document.getElementById('aiResultWrap');
  var loadingWrap = document.getElementById('aiLoadingWrap');
  var errorWrap = document.getElementById('aiErrorWrap');
  var inputEl = document.getElementById('aiCommandInput');
  var chipsWrap = document.getElementById('aiExampleChips');
  if (inputWrap) inputWrap.style.display = 'none';
  if (loadingWrap) loadingWrap.style.display = 'none';
  if (errorWrap) errorWrap.style.display = 'none';
  if (inputEl) inputEl.value = '';
  if (chipsWrap) {
    chipsWrap.innerHTML = '';
    AI_EXAMPLE_COMMANDS.forEach(function(text) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ai-example-chip';
      chip.textContent = text;
      chip.addEventListener('click', function() {
        if (inputEl) inputEl.value = text;
        inputEl.focus();
      });
      chipsWrap.appendChild(chip);
    });
  }

  _updateAILimitBanner();

  var historyEl = document.getElementById('aiHistoryList');
  if (historyEl && typeof aiActionHistory !== 'undefined' && Array.isArray(aiActionHistory)) {
    var history = aiActionHistory.slice().reverse().slice(0, 10);
    historyEl.innerHTML = history.length
      ? history.map(function(h) { return '<div class="ai-history-item">' + (typeof escapeHtml === 'function' ? escapeHtml(h) : h.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) + '</div>'; }).join('')
      : '<div class="ai-history-empty">Nessuna azione eseguita ancora.</div>';
  }
}

function askAICommand() {
  var inputEl = document.getElementById('aiCommandInput');
  var askBtn = document.getElementById('aiAskBtn');
  var inputWrap = document.getElementById('aiResultWrap');
  var loadingWrap = document.getElementById('aiLoadingWrap');
  var errorWrap = document.getElementById('aiErrorWrap');

  if (!inputEl) return;
  var text = (inputEl.value || '').trim();
  if (!text) {
    if (typeof showToast === 'function') showToast('Scrivi una richiesta', 'warning');
    return;
  }

  if (!_isAIAdmin()) {
    var used = _getAIDailyRequests();
    if (used >= AI_REQUESTS_LIMIT) {
      if (typeof showToast === 'function') showToast('Limite giornaliero raggiunto (' + AI_REQUESTS_LIMIT + ' richieste). Riprova domani.', 'warning');
      return;
    }
    if (!_incrementAIDailyRequests()) {
      if (typeof showToast === 'function') showToast('Limite giornaliero raggiunto.', 'warning');
      return;
    }
  }

  if (inputWrap) inputWrap.style.display = 'none';
  if (errorWrap) errorWrap.style.display = 'none';
  if (loadingWrap) loadingWrap.style.display = 'block';
  if (askBtn) askBtn.disabled = true;

  if (typeof parseNaturalLanguageCommand !== 'function') {
    _showAIError('Funzione AI non disponibile. Verifica la configurazione Gemini.');
    if (loadingWrap) loadingWrap.style.display = 'none';
    if (askBtn) askBtn.disabled = false;
    return;
  }

  parseNaturalLanguageCommand(text, function(parsed, err) {
    if (loadingWrap) loadingWrap.style.display = 'none';
    if (askBtn) askBtn.disabled = false;
    _updateAILimitBanner();

    if (err) {
      _showAIError(err);
      return;
    }
    if (!parsed || !Array.isArray(parsed.actions) || !parsed.actions.length) {
      _showAIError('Nessuna azione riconosciuta. Prova a riformulare la richiesta.');
      return;
    }

    var totalItems = 0;
    parsed.actions.forEach(function(a) {
      if (a.items && Array.isArray(a.items)) totalItems += a.items.length;
    });
    if (totalItems > 20 && !parsed.notes) parsed.notes = [];
    if (totalItems > 20) parsed.notes.push('Molte richieste: alcune potrebbero essere state semplificate. Prova a dividere in più comandi se necessario.');

    _aiPendingResult = parsed;
    _aiPendingRequestText = text;
    _aiSuggestedRecipes = [];
    _displayAIResult(parsed);
    if (inputWrap) inputWrap.style.display = 'block';
  });
}

function _displayAIResult(parsed) {
  var summaryEl = document.getElementById('aiResultSummary');
  var stepsEl = document.getElementById('aiResultSteps');
  var notesEl = document.getElementById('aiResultNotes');
  var recipesEl = document.getElementById('aiResultRecipes');

  var dateLabel = parsed.date === (typeof getCurrentDateKey === 'function' ? getCurrentDateKey() : '') ? 'Oggi' : parsed.date;
  var mealLabel = parsed.meal ? (AI_MEAL_LABELS[parsed.meal] || parsed.meal) : '—';

  var actionTypes = [];
  parsed.actions.forEach(function(a) {
    if (a.type === 'log_meal') actionTypes.push('aggiorna pasti');
    else if (a.type === 'add_to_shopping_list') actionTypes.push('aggiorna spesa');
    else if (a.type === 'suggest_recipes') actionTypes.push('suggerisci ricette');
    else if (a.type === 'generate_recipe') actionTypes.push('genera ricetta');
  });
  if (actionTypes.length) actionTypes = actionTypes.filter(function(t, i, arr) { return arr.indexOf(t) === i; });

  if (summaryEl) {
    summaryEl.innerHTML =
      '<div class="ai-summary-row"><span class="ai-summary-label">Data:</span> ' + (dateLabel || '—') + '</div>' +
      '<div class="ai-summary-row"><span class="ai-summary-label">Pasto:</span> ' + mealLabel + '</div>' +
      '<div class="ai-summary-row"><span class="ai-summary-label">Azioni:</span> ' + (actionTypes.join(', ') || '—') + '</div>';
  }

  var stepsHtml = '';
  parsed.actions.forEach(function(a, i) {
    var stepText = _actionToStepText(a, parsed);
    if (stepText) {
      var missing = _getMissingIngredientsForAction(a);
      var createBtn = missing.length > 0
        ? '<button type="button" class="rc-btn rc-btn-outline rc-btn-sm ai-step-create" onclick="openAICreateIngredientModal(_getMissingIngredientsForAction(_aiPendingResult.actions[' + i + ']), ' + i + ')">Crea ingrediente</button>'
        : '';
      stepsHtml += '<div class="ai-action-block" data-action-index="' + i + '">' +
        '<div class="ai-step-text">' + (i + 1) + '. ' + escapeHtml(stepText) + '</div>' +
        '<div class="ai-step-buttons">' + createBtn +
        '<button type="button" class="rc-btn rc-btn-primary rc-btn-sm ai-step-execute" onclick="executeAISingleAction(' + i + ')">Esegui</button></div>' +
      '</div>';
    }
  });
  if (stepsEl) stepsEl.innerHTML = stepsHtml || '<div class="ai-step">Nessun passo da eseguire.</div>';

  if (notesEl) {
    notesEl.innerHTML = Array.isArray(parsed.notes) && parsed.notes.length
      ? '<div class="ai-notes-label">Note:</div>' + parsed.notes.map(function(n) { return '<div class="ai-note">' + escapeHtml(n) + '</div>'; }).join('')
      : '';
    notesEl.style.display = notesEl.innerHTML ? 'block' : 'none';
  }

  if (recipesEl) {
    recipesEl.innerHTML = '';
    recipesEl.style.display = 'none';
  }
  var testimonyWrap = document.getElementById('aiTestimonyWrap');
  if (testimonyWrap) { testimonyWrap.innerHTML = ''; testimonyWrap.style.display = 'none'; }
  var execBtn = document.getElementById('aiExecuteBtn');
  if (execBtn) { execBtn.style.display = ''; execBtn.disabled = false; execBtn.textContent = 'Esegui tutto'; }
}

function _actionToStepText(a, parsed) {
  if (a.type === 'log_meal') {
    var meal = a.meal || parsed.meal || 'pranzo';
    var mealLabel = AI_MEAL_LABELS[meal] || meal;
    var items = Array.isArray(a.items) ? a.items : [];
    var parts = items.map(function(it) {
      if (it.isRecipe) return (it.name || '').trim() + ' (ricetta)';
      var q = it.quantity != null ? it.quantity + ' ' + (it.unit || 'g') : '';
      return (it.name || '').trim() + (q ? ' (' + q + ')' : '');
    }).filter(Boolean);
    return 'Segnare come consumati: ' + (parts.join(', ') || '—') + ' a ' + mealLabel + '.';
  }
  if (a.type === 'add_to_shopping_list') {
    var list = Array.isArray(a.items) ? a.items : [];
    var listParts = list.map(function(it) {
      var q = it.quantity != null ? it.quantity + ' ' + (it.unit || 'pz') : '';
      return (it.name || '').trim() + (q ? ' (' + q + ')' : '');
    }).filter(Boolean);
    return 'Aggiungere alla lista della spesa: ' + (listParts.join(', ') || '—') + '.';
  }
  if (a.type === 'suggest_recipes') {
    var m = a.meal || parsed.meal || 'cena';
    var count = a.count || 3;
    return 'Suggerire ' + count + ' ricette per ' + (AI_MEAL_LABELS[m] || m) + '.';
  }
  if (a.type === 'generate_recipe') {
    var m = a.meal || parsed.meal || 'pranzo';
    var ings = Array.isArray(a.ingredients) ? a.ingredients : [];
    return 'Generare ricetta con ' + (ings.join(', ') || '—') + ' per ' + (AI_MEAL_LABELS[m] || m) + '.';
  }
  return '';
}

function cancelAIResult() {
  _aiPendingResult = null;
  _aiSuggestedRecipes = [];
  var inputWrap = document.getElementById('aiResultWrap');
  if (inputWrap) inputWrap.style.display = 'none';
}

function executeAISingleAction(index) {
  if (!_aiPendingResult || !Array.isArray(_aiPendingResult.actions)) return;
  var a = _aiPendingResult.actions[index];
  if (!a) return;

  var missing = _getMissingIngredientsForAction(a);
  if (missing.length > 0) {
    openAICreateIngredientModal(missing, index);
    if (typeof showToast === 'function') showToast('Crea gli ingredienti mancanti prima di eseguire', 'warning');
    return;
  }

  var dateKey = _aiPendingResult.date || (typeof getCurrentDateKey === 'function' ? getCurrentDateKey() : '');
  if (a.type === 'generate_recipe') {
    _executeGenerateRecipe(a, index);
    return;
  }

  try {
    if (a.type === 'log_meal') {
      _executeLogMeal(a, dateKey);
    } else if (a.type === 'add_to_shopping_list') {
      _executeAddToShoppingList(a);
    } else if (a.type === 'suggest_recipes') {
      _executeSuggestRecipes(a);
    }
  } catch (e) {
    console.warn('[AI] Errore esecuzione azione:', a.type, e);
    if (typeof showToast === 'function') showToast('Errore durante l\'esecuzione', 'warning');
    return;
  }

  _pushAIActionHistory([a], dateKey);

  saveData();
  if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
  if (typeof renderFridge === 'function') renderFridge();
  if (typeof renderSpesa === 'function') renderSpesa();
  if (typeof renderMealItems === 'function') renderMealItems();
  if (typeof renderMealProgress === 'function') renderMealProgress();
  if (typeof renderCasa === 'function') renderCasa(true);
  if (typeof renderPianoRicette === 'function') renderPianoRicette();

  _markAIActionCompleted(index);

  var hasSuggestRecipes = a.type === 'suggest_recipes';
  if (!hasSuggestRecipes && typeof showToast === 'function') showToast('Azione completata', 'success');
}

/* Verifica se l'ingrediente esiste in pantryItems o è simile a uno esistente. */
function _ingredientExistsInDatabase(name) {
  if (!name || typeof name !== 'string') return true;
  var n = (name || '').trim();
  if (!n) return true;
  if (typeof pantryItems === 'undefined' || !pantryItems) return false;
  var exists = Object.keys(pantryItems).some(function(k) {
    return k && k.toLowerCase().trim() === n.toLowerCase();
  });
  if (exists) return true;
  if (typeof findSimilarIngredientInPantry === 'function') {
    return !!findSimilarIngredientInPantry(n, pantryItems);
  }
  return false;
}

/* Restituisce gli ingredienti mancanti per l'azione (non presenti in dispensa). */
function _getMissingIngredientsForAction(a) {
  var missing = [];
  if (a.type === 'log_meal' && Array.isArray(a.items)) {
    a.items.forEach(function(it) {
      var n = (it.name || it || '').trim();
      if (n && !it.isRecipe && !_ingredientExistsInDatabase(n)) missing.push(n);
    });
  }
  if (a.type === 'add_to_shopping_list' && Array.isArray(a.items)) {
    a.items.forEach(function(it) {
      var n = (it.name || it || '').trim();
      if (n && !_ingredientExistsInDatabase(n)) missing.push(n);
    });
  }
  if (a.type === 'generate_recipe' && Array.isArray(a.ingredients)) {
    a.ingredients.forEach(function(ing) {
      var n = (typeof ing === 'string' ? ing : (ing && ing.name) ? ing.name : '').trim();
      if (n && !_ingredientExistsInDatabase(n)) missing.push(n);
    });
  }
  return missing.filter(function(n, i, arr) { return arr.indexOf(n) === i; });
}

var _aiCreateIngredientPendingIndex = null;
var _aiCreateIngredientPendingBulk = false;

function openAICreateIngredientModal(missingIngredients, actionIndex) {
  if (!missingIngredients || !missingIngredients.length) return;
  _aiCreateIngredientPendingIndex = actionIndex;
  _aiCreateIngredientPendingBulk = false;
  var modal = document.getElementById('aiCreateIngredientModal');
  var body = document.getElementById('aiCreateIngredientModalBody');
  if (!modal || !body) return;
  body.innerHTML = '<p class="ai-create-ing-desc">Gli ingredienti seguenti non esistono nel database. Crealili prima di eseguire l\'azione.</p>' +
    missingIngredients.map(function(name) {
      var attrVal = String(name).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<div class="ai-create-ing-row" data-name="' + attrVal + '">' +
        '<span class="ai-create-ing-name">' + (typeof escapeHtml === 'function' ? escapeHtml(name) : name) + '</span>' +
        '<button type="button" class="rc-btn rc-btn-primary rc-btn-sm ai-create-ing-btn">Crea ingrediente</button>' +
        '</div>';
    }).join('');
  body.querySelectorAll('.ai-create-ing-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var row = btn.closest('.ai-create-ing-row');
      var name = row && row.getAttribute('data-name');
      if (name && typeof openAddFridgePrecompiled === 'function') {
        closeAICreateIngredientModal();
        openAddFridgePrecompiled(name);
      }
    });
  });
  modal.classList.add('active');
}

function closeAICreateIngredientModal() {
  var modal = document.getElementById('aiCreateIngredientModal');
  if (modal) modal.classList.remove('active');
  _aiCreateIngredientPendingIndex = null;
  _aiCreateIngredientPendingBulk = false;
}

function _getModifiedPagesForAction(a) {
  if (a.type === 'log_meal') return [{ page: 'piano', label: 'Oggi', id: 'piano' }];
  if (a.type === 'add_to_shopping_list') return [{ page: 'spesa', label: 'Lista spesa', id: 'spesa' }];
  if (a.type === 'generate_recipe') return [{ page: 'ricette', label: 'Ricette', id: 'ricette' }];
  if (a.type === 'suggest_recipes') return [];
  return [];
}

function _updateAITestimony() {
  if (!_aiPendingResult || !_aiPendingRequestText) return;
  var completed = document.querySelectorAll('.ai-action-completed');
  var seen = {};
  var pages = [];
  completed.forEach(function(bl) {
    var idx = parseInt(bl.getAttribute('data-action-index'), 10);
    var a = _aiPendingResult.actions[idx];
    if (a) _getModifiedPagesForAction(a).forEach(function(p) {
      if (!seen[p.id]) { seen[p.id] = true; pages.push(p); }
    });
  });
  var wrap = document.getElementById('aiTestimonyWrap');
  if (!wrap) return;
  if (pages.length === 0) { wrap.style.display = 'none'; return; }
  var linksHtml = pages.map(function(p) {
    return '<a href="#" class="ai-testimony-link" onclick="goToPage(\'' + (p.id || p.page) + '\');return false;">' + (typeof escapeHtml === 'function' ? escapeHtml(p.label) : p.label) + '</a>';
  }).join(', ');
  wrap.innerHTML = '<div class="ai-testimony-block">' +
    '<div class="ai-testimony-label">Richiesta eseguita</div>' +
    '<div class="ai-testimony-request">' + (typeof escapeHtml === 'function' ? escapeHtml(_aiPendingRequestText) : _aiPendingRequestText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) + '</div>' +
    '<div class="ai-testimony-pages">Pagine modificate: ' + linksHtml + '</div>' +
    '</div>';
  wrap.style.display = 'block';
}

function _markAIActionCompleted(index) {
  var block = document.querySelector('.ai-action-block[data-action-index="' + index + '"]');
  if (block) {
    var btns = block.querySelector('.ai-step-buttons');
    if (btns) btns.remove();
    var textEl = block.querySelector('.ai-step-text');
    if (textEl) textEl.innerHTML = (textEl.innerHTML || '') + ' <span class="ai-action-done">Completato</span>';
    block.classList.add('ai-action-completed');
  }
  var execBtn = document.getElementById('aiExecuteBtn');
  if (execBtn) execBtn.style.display = 'none';
  _updateAITestimony();
}

function _condenseAIAction(a, parsed) {
  var meal = a.meal || parsed.meal || 'pranzo';
  var mealLabel = AI_MEAL_LABELS[meal] || meal;
  if (a.type === 'log_meal') {
    var items = Array.isArray(a.items) ? a.items : [];
    var parts = items.map(function(it) {
      if (it.isRecipe) return (it.name || '').trim() + '(r)';
      return (it.name || '').trim();
    }).filter(Boolean);
    return 'log_meal ' + mealLabel + ': ' + parts.join(', ');
  }
  if (a.type === 'add_to_shopping_list') {
    var list = Array.isArray(a.items) ? a.items : [];
    var names = list.map(function(it) { return (it.name || '').trim(); }).filter(Boolean);
    return 'add_spesa: ' + names.join(', ');
  }
  if (a.type === 'suggest_recipes') {
    return 'suggest_recipes ' + mealLabel + ' (' + (a.count || 3) + ')';
  }
  if (a.type === 'generate_recipe') {
    var ings = Array.isArray(a.ingredients) ? a.ingredients : [];
    return 'generate_recipe ' + mealLabel + ': ' + ings.join(', ');
  }
  return a.type || '?';
}

function _pushAIActionHistory(actions, dateKey) {
  if (typeof aiActionHistory === 'undefined') aiActionHistory = [];
  var now = new Date();
  var ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  var parsed = { meal: null };
  var parts = actions.map(function(a) { return _condenseAIAction(a, parsed); }).filter(Boolean);
  if (parts.length) {
    aiActionHistory.push(ts + ' | ' + parts.join('; '));
    if (aiActionHistory.length > 50) aiActionHistory = aiActionHistory.slice(-50);
  }
}

function executeAIResult() {
  if (!_aiPendingResult || !Array.isArray(_aiPendingResult.actions)) return;

  var allMissing = [];
  _aiPendingResult.actions.forEach(function(a) {
    _getMissingIngredientsForAction(a).forEach(function(n) {
      if (allMissing.indexOf(n) === -1) allMissing.push(n);
    });
  });
  if (allMissing.length > 0) {
    _aiCreateIngredientPendingBulk = true;
    openAICreateIngredientModal(allMissing, null);
    if (typeof showToast === 'function') showToast('Crea gli ingredienti mancanti prima di eseguire', 'warning');
    return;
  }

  var dateKey = _aiPendingResult.date || (typeof getCurrentDateKey === 'function' ? getCurrentDateKey() : '');
  var completed = 0;
  var failed = 0;

  _aiPendingResult.actions.forEach(function(a, i) {
    try {
      if (a.type === 'generate_recipe') {
        _executeGenerateRecipe(a, i);
        completed++;
      } else if (a.type === 'log_meal') {
        _executeLogMeal(a, dateKey);
        completed++;
      } else if (a.type === 'add_to_shopping_list') {
        _executeAddToShoppingList(a);
        completed++;
      } else if (a.type === 'suggest_recipes') {
        _executeSuggestRecipes(a);
        completed++;
      }
    } catch (e) {
      failed++;
      console.warn('[AI] Errore esecuzione azione:', a.type, e);
    }
  });

  saveData();
  if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
  if (typeof renderFridge === 'function') renderFridge();
  if (typeof renderSpesa === 'function') renderSpesa();
  if (typeof renderMealItems === 'function') renderMealItems();
  if (typeof renderMealProgress === 'function') renderMealProgress();
  if (typeof renderCasa === 'function') renderCasa(true);
  if (typeof renderPianoRicette === 'function') renderPianoRicette();

  var hasSuggestRecipes = _aiPendingResult.actions.some(function(a) { return a.type === 'suggest_recipes'; });
  if (!hasSuggestRecipes && typeof showToast === 'function') showToast('Azioni completate', 'success');

  _pushAIActionHistory(_aiPendingResult.actions, dateKey);

  _aiPendingResult.actions.forEach(function(a, i) {
    if (a.type !== 'generate_recipe') _markAIActionCompleted(i);
  });

  var execBtn = document.getElementById('aiExecuteBtn');
  if (execBtn) {
    execBtn.style.display = 'none';
    execBtn.textContent = 'Completato';
    execBtn.disabled = true;
    execBtn.onclick = null;
  }
  _aiPendingRequestText = _aiPendingResult.actions.length ? (_aiPendingRequestText || '') : '';
  if (_aiPendingRequestText) _updateAITestimony();

  if (typeof showToast === 'function') {
    var msg = completed > 0 ? '✅ ' + completed + ' azione/i completata/e.' : '';
    if (failed > 0) msg += (msg ? ' ' : '') + '⚠️ ' + failed + ' fallita/e.';
    showToast(msg || 'Nessuna azione eseguita.', completed > 0 ? 'success' : 'warning');
  }
}

function _executeLogMeal(a, dateKey) {
  if (!dateKey) return;
  var meal = a.meal || 'pranzo';
  var items = Array.isArray(a.items) ? a.items : [];
  var day = typeof getDayData === 'function' ? getDayData(dateKey) : null;
  if (!day) return;

  if (!day.usedItems) day.usedItems = {};
  if (!day.usedItems[meal]) day.usedItems[meal] = {};
  if (!day.extraConsumed) day.extraConsumed = {};
  if (!day.extraConsumed[meal]) day.extraConsumed[meal] = [];
  if (!day.ricette) day.ricette = {};
  if (!day.ricette[meal]) day.ricette[meal] = {};

  var planItems = (typeof getMealItems === 'function') ? getMealItems(meal) : [];

  items.forEach(function(it) {
    var name = (it.name || '').trim();
    if (!name) return;

    if (it.isRecipe) {
      var r = (typeof findRicetta === 'function') ? findRicetta(name) : null;
      if (r) {
        day.ricette[meal][name] = true;
        var basePorzioni = (typeof getRecipeBasePorzioni === 'function') ? getRecipeBasePorzioni(r) : 1;
        var ings = (typeof scaleIngredientiForPorzioni === 'function')
          ? scaleIngredientiForPorzioni(Array.isArray(r.ingredienti) ? r.ingredienti : [], basePorzioni, basePorzioni)
          : (Array.isArray(r.ingredienti) ? r.ingredienti : []);
        if (typeof pantryItems !== 'undefined' && pantryItems && ings.length) {
          ings.forEach(function(ing) {
            var iname = (ing.name || ing.nome || '').trim();
            if (!iname) return;
            var qty = parseFloat(ing.quantity || ing.quantita) || 0;
            if (qty <= 0) return;
            var key = Object.keys(pantryItems).find(function(k) {
              return k && k.toLowerCase().trim() === iname.toLowerCase();
            });
            if (!key) return;
            var cur = parseFloat(pantryItems[key].quantity) || 0;
            pantryItems[key].quantity = Math.max(0, cur - qty);
          });
        }
      } else {
        day.extraConsumed[meal].push({ name: name, quantity: 1, unit: 'pz' });
      }
      return;
    }

    var qty = parseFloat(it.quantity);
    if (isNaN(qty) || qty <= 0) qty = 1;
    var unit = (it.unit || 'g').trim() || 'g';

    var planItem = planItems.find(function(p) {
      return p && p.name && p.name.toLowerCase().trim() === name.toLowerCase();
    });

    if (planItem) {
      day.usedItems[meal][planItem.name] = true;
      var subQty = parseFloat(planItem.quantity) || qty;
      if (typeof pantryItems !== 'undefined' && pantryItems) {
        var key = Object.keys(pantryItems).find(function(k) {
          return k && k.toLowerCase().trim() === planItem.name.toLowerCase();
        });
        if (key) {
          var cur = parseFloat(pantryItems[key].quantity) || 0;
          pantryItems[key].quantity = Math.max(0, cur - subQty);
        }
      }
    } else {
      if (typeof pianoAlimentare !== 'undefined' && pianoAlimentare[meal] && pianoAlimentare[meal].principale) {
        var exists = pianoAlimentare[meal].principale.some(function(i) {
          return i && i.name && i.name.toLowerCase().trim() === name.toLowerCase();
        });
        if (!exists) {
          pianoAlimentare[meal].principale.push({ name: name, quantity: qty, unit: unit });
        }
      }
      day.usedItems[meal][name] = true;
      if (typeof pantryItems !== 'undefined' && pantryItems) {
        var key = Object.keys(pantryItems).find(function(k) {
          return k && k.toLowerCase().trim() === name.toLowerCase();
        });
        if (key) {
          var cur = parseFloat(pantryItems[key].quantity) || 0;
          pantryItems[key].quantity = Math.max(0, cur - qty);
        }
      }
    }
  });
}

function _executeAddToShoppingList(a) {
  var items = Array.isArray(a.items) ? a.items : [];
  if (!spesaItems) spesaItems = [];

  items.forEach(function(it) {
    var name = (it.name || '').trim();
    if (!name) return;
    var qty = parseFloat(it.quantity);
    if (isNaN(qty) || qty <= 0) qty = 1;
    var unit = (it.unit || 'pz').trim() || 'pz';

    spesaItems.push({ name: name, quantity: qty, unit: unit, manual: true, bought: false });
  });
}

function _executeGenerateRecipe(a, actionIndex) {
  var ings = Array.isArray(a.ingredients) ? a.ingredients : [];
  var meal = a.meal || 'pranzo';
  if (!ings.length) {
    if (typeof showToast === 'function') showToast('Nessun ingrediente specificato', 'warning');
    return;
  }

  var block = document.querySelector('.ai-action-block[data-action-index="' + actionIndex + '"]');
  var btn = block ? block.querySelector('.ai-step-execute') : null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Generazione…';
  }

  var recipesEl = document.getElementById('aiResultRecipes');
  if (recipesEl) {
    recipesEl.innerHTML = '<div class="ai-loading" style="padding:16px;text-align:center;">🤖 Generazione ricetta in corso…</div>';
    recipesEl.style.display = 'block';
  }

  if (typeof generateRecipeFromIngredients !== 'function') {
    if (btn) btn.disabled = false; if (btn) btn.textContent = 'Esegui';
    if (typeof showToast === 'function') showToast('Funzione non disponibile', 'warning');
    return;
  }

  generateRecipeFromIngredients(ings, meal, function(recipe, err) {
    if (btn) btn.disabled = false;
    if (btn) btn.textContent = 'Esegui';

    if (err || !recipe) {
      if (recipesEl) recipesEl.innerHTML = '<div style="color:var(--danger);padding:12px;">❌ ' + (typeof escapeHtml === 'function' ? escapeHtml(err || 'Errore') : (err || 'Errore')) + '</div>';
      if (typeof showToast === 'function') showToast('Errore generazione ricetta', 'warning');
      return;
    }

    if (typeof aiRecipes === 'undefined') window.aiRecipes = [];
    var dup = aiRecipes.findIndex(function(r) { return (r.name || '').toLowerCase() === (recipe.name || '').toLowerCase(); });
    if (dup >= 0) aiRecipes[dup] = recipe;
    else aiRecipes.push(recipe);

    _pushAIActionHistory([a], typeof getCurrentDateKey === 'function' ? getCurrentDateKey() : '');
    saveData();
    if (typeof renderRicette === 'function') renderRicette();

    _markAIActionCompleted(actionIndex);

    var prep = (recipe.preparazione || '').substring(0, 200);
    var ingsList = Array.isArray(recipe.ingredienti) ? recipe.ingredienti.map(function(i) {
      return (i.name || '') + (i.quantity ? ' ' + i.quantity + (i.unit || 'g') : '');
    }).join(', ') : '';
    var html = '<div class="ai-recipes-label">Ricetta generata e aggiunta alle ricette AI:</div>' +
      '<div class="ai-recipe-card" style="flex-direction:column;align-items:flex-start;">' +
      '<span class="ai-recipe-icon" style="font-size:1.4rem;">' + (recipe.icon || '🍽') + '</span>' +
      '<span class="ai-recipe-name" style="font-weight:700;font-size:1rem;">' + (typeof escapeHtml === 'function' ? escapeHtml(recipe.name || '') : recipe.name || '') + '</span>' +
      (ingsList ? '<div style="font-size:.82em;color:var(--text-2);margin:6px 0;">' + (typeof escapeHtml === 'function' ? escapeHtml(ingsList) : ingsList) + '</div>' : '') +
      (prep ? '<div style="font-size:.85em;color:var(--text-3);line-height:1.4;">' + (typeof escapeHtml === 'function' ? escapeHtml(prep) : prep) + '</div>' : '') +
      '</div>' +
      '<button class="rc-btn rc-btn-outline" onclick="goToPage(\'ricette\')" style="margin-top:10px;">Apri Ricette</button>';
    if (recipesEl) {
      recipesEl.innerHTML = html;
      recipesEl.style.display = 'block';
    }

    if (typeof showToast === 'function') showToast('✅ Ricetta "' + (recipe.name || '') + '" aggiunta', 'success');
  });
}

function _executeSuggestRecipes(a) {
  var meal = a.meal || 'cena';
  var count = Math.min(a.count || 3, 10);

  var all = (typeof getAllRicette === 'function') ? getAllRicette() : [];
  var forMeal = all.filter(function(r) {
    var pasto = r.pasto;
    var pasti = Array.isArray(pasto) ? pasto : (pasto ? [pasto] : []);
    return pasti.indexOf(meal) !== -1;
  });

  if (!forMeal.length) {
    forMeal = all.slice(0, count);
  }

  var shuffled = forMeal.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = t;
  }
  _aiSuggestedRecipes = shuffled.slice(0, count);

  var recipesEl = document.getElementById('aiResultRecipes');
  if (!recipesEl) return;

  var html = '<div class="ai-recipes-label">Ricette suggerite per ' + (AI_MEAL_LABELS[meal] || meal) + ':</div>';
  _aiSuggestedRecipes.forEach(function(r) {
    var n = r.name || r.nome || 'Ricetta';
    var icon = r.icon || r.icona || '🍽';
    html += '<div class="ai-recipe-card">' +
      '<span class="ai-recipe-icon">' + icon + '</span>' +
      '<span class="ai-recipe-name">' + escapeHtml(n) + '</span>' +
      '<button class="rc-btn rc-btn-sm rc-btn-primary" onclick="aiAddRecipeToPlan(\'' + escForAttr(n) + '\',\'' + meal + '\')">Aggiungi al piano</button>' +
    '</div>';
  });
  html += '<button class="rc-btn rc-btn-outline" onclick="goToPage(\'ricette\')" style="margin-top:8px;">Apri Ricette</button>';
  recipesEl.innerHTML = html;
  recipesEl.style.display = 'block';
}

function aiAddRecipeToPlan(recipeName, mealKey) {
  if (!recipeName || !mealKey) return;
  var r = (typeof findRicetta === 'function') ? findRicetta(recipeName) : null;
  if (!r) return;
  var pasto = mealKey;
  if (!pianoAlimentare[pasto]) pianoAlimentare[pasto] = { principale: [], contorno: [], frutta: [], extra: [] };
  if (!Array.isArray(pianoAlimentare[pasto].principale)) pianoAlimentare[pasto].principale = [];
  var basePorzioni = (typeof getRecipeBasePorzioni === 'function') ? getRecipeBasePorzioni(r) : 1;
  var ings = (typeof scaleIngredientiForPorzioni === 'function')
    ? scaleIngredientiForPorzioni(Array.isArray(r.ingredienti) ? r.ingredienti : [], basePorzioni, basePorzioni)
    : (Array.isArray(r.ingredienti) ? r.ingredienti : []);
  var added = 0;
  ings.forEach(function(ing) {
    var nm = (ing.name || ing.nome || '').trim();
    if (!nm) return;
    var exists = pianoAlimentare[pasto].principale.some(function(i) { return (i.name || '').toLowerCase() === nm.toLowerCase(); });
    if (!exists) {
      pianoAlimentare[pasto].principale.push({ name: nm, quantity: ing.quantity || null, unit: ing.unit || 'g' });
      added++;
    }
  });
  saveData();
  if (typeof renderMealPlan === 'function') renderMealPlan();
  if (typeof renderProfilo === 'function') renderProfilo();
  if (typeof showToast === 'function') showToast('✅ ' + recipeName + ' aggiunta al piano (' + (AI_MEAL_LABELS[pasto] || pasto) + ')', 'success');
}

function _showAIError(msg) {
  var errorWrap = document.getElementById('aiErrorWrap');
  var errorText = document.getElementById('aiErrorText');
  if (errorText) errorText.textContent = msg || 'Errore sconosciuto';
  if (errorWrap) errorWrap.style.display = 'block';
}

function dismissAIError() {
  var errorWrap = document.getElementById('aiErrorWrap');
  if (errorWrap) errorWrap.style.display = 'none';
}
