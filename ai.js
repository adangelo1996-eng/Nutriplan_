/*
   AI.JS — Pagina Assistente AI
   Comandi in linguaggio naturale → azioni su piano, dispensa, spesa, ricette.
   Sempre anteprima con conferma prima di eseguire.
*/

var _aiPendingResult = null;
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
  'Ho mangiato pasta al pomodoro e metti il pane in lista'
];

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
      stepsHtml += '<div class="ai-action-block" data-action-index="' + i + '">' +
        '<div class="ai-step-text">' + (i + 1) + '. ' + escapeHtml(stepText) + '</div>' +
        '<button type="button" class="rc-btn rc-btn-primary rc-btn-sm ai-step-execute" onclick="executeAISingleAction(' + i + ')">Esegui</button>' +
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

  var dateKey = _aiPendingResult.date || (typeof getCurrentDateKey === 'function' ? getCurrentDateKey() : '');
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

  saveData();
  if (typeof refreshAllAppViews === 'function') refreshAllAppViews();
  if (typeof renderFridge === 'function') renderFridge();
  if (typeof renderSpesa === 'function') renderSpesa();
  if (typeof renderMealItems === 'function') renderMealItems();
  if (typeof renderMealProgress === 'function') renderMealProgress();
  if (typeof renderPianoRicette === 'function') renderPianoRicette();

  _markAIActionCompleted(index);

  var hasSuggestRecipes = a.type === 'suggest_recipes';
  if (!hasSuggestRecipes && typeof showToast === 'function') showToast('Azione completata', 'success');
}

function _markAIActionCompleted(index) {
  var block = document.querySelector('.ai-action-block[data-action-index="' + index + '"]');
  if (block) {
    var btn = block.querySelector('.ai-step-execute');
    if (btn) btn.remove();
    var textEl = block.querySelector('.ai-step-text');
    if (textEl) textEl.innerHTML = (textEl.innerHTML || '') + ' <span class="ai-action-done">Completato</span>';
    block.classList.add('ai-action-completed');
  }
}

function executeAIResult() {
  if (!_aiPendingResult || !Array.isArray(_aiPendingResult.actions)) return;

  var dateKey = _aiPendingResult.date || (typeof getCurrentDateKey === 'function' ? getCurrentDateKey() : '');
  var completed = 0;
  var failed = 0;

  _aiPendingResult.actions.forEach(function(a) {
    try {
      if (a.type === 'log_meal') {
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
  if (typeof renderPianoRicette === 'function') renderPianoRicette();

  var hasSuggestRecipes = _aiPendingResult.actions.some(function(a) { return a.type === 'suggest_recipes'; });
  if (!hasSuggestRecipes) cancelAIResult();

  _aiPendingResult.actions.forEach(function(_, i) { _markAIActionCompleted(i); });

  var execBtn = document.getElementById('aiExecuteBtn');
  if (execBtn) {
    execBtn.textContent = 'Completato';
    execBtn.disabled = true;
    execBtn.onclick = null;
  }

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

  if (!day.extraConsumed) day.extraConsumed = {};
  if (!day.extraConsumed[meal]) day.extraConsumed[meal] = [];
  if (!day.ricette) day.ricette = {};
  if (!day.ricette[meal]) day.ricette[meal] = {};

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

    day.extraConsumed[meal].push({ name: name, quantity: qty, unit: unit });

    if (typeof pantryItems !== 'undefined' && pantryItems) {
      var key = Object.keys(pantryItems).find(function(k) {
        return k && k.toLowerCase().trim() === name.toLowerCase();
      });
      if (key) {
        var cur = parseFloat(pantryItems[key].quantity) || 0;
        pantryItems[key].quantity = Math.max(0, cur - qty);
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
