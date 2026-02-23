/* ============================================================
   GEMINI.JS — Integrazione Google Gemini AI
   Features:
   - Generazione ricette strutturate per pasto (JSON puro)
   - Accetta / Rigenera / Rifiuta ricette generate
   - Suggerimenti sostituzione ingredienti
   - Analisi AI statistiche (solo dati aggregati, no piano)
============================================================ */

function _getGeminiKey() {
  return (window.APP_CONFIG && window.APP_CONFIG.gemini && window.APP_CONFIG.gemini.apiKey) || '';
}

function _geminiCall(prompt, callback, opts) {
  var apiKey = _getGeminiKey();
  if (!apiKey) {
    callback(null, 'API key Gemini non configurata (config.js)');
    return;
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);

  var body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: (opts && opts.maxOutputTokens) ? opts.maxOutputTokens : 1500
    }
  });

  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    try {
      var data = JSON.parse(xhr.responseText);
      if (xhr.status !== 200) {
        callback(null, (data.error && data.error.message) || 'Errore API ' + xhr.status);
        return;
      }
      var text = data.candidates &&
                 data.candidates[0] &&
                 data.candidates[0].content &&
                 data.candidates[0].content.parts &&
                 data.candidates[0].content.parts[0] &&
                 data.candidates[0].content.parts[0].text;
      callback(text || '', null);
    } catch (e) {
      callback(null, 'Errore parsing risposta AI');
    }
  };
  xhr.onerror = function() { callback(null, 'Errore di rete'); };
  xhr.send(body);
}

/* ══════════════════════════════════════════════════
   GENERA RICETTA — stato interno
══════════════════════════════════════════════════ */
var _aiPendingRecipe       = null;   /* ricetta JSON in attesa di conferma */
var _aiRecipeMealKey       = 'pranzo';
var _aiRecipeContext       = 'ricette';
var _aiSelectedIngredients = null;   /* ingredienti spuntati nel picker (solo context 'oggi') */

var _mealIconMap = {
  colazione: '☕', spuntino: '🍎',
  pranzo: '🍽', merenda: '🥪', cena: '🌙'
};
var _mealLabelMap = {
  colazione: '☀️ Colazione', spuntino: '🍎 Spuntino',
  pranzo: '🍽 Pranzo', merenda: '🥪 Merenda', cena: '🌙 Cena'
};

/* ──────────────────────────────────────────────────
   Entry point: context = 'oggi' | 'dispensa' | 'ricette'
────────────────────────────────────────────────── */
function openAIRecipeModal(context) {
  var modal = document.getElementById('aiRecipeModal');
  if (!modal) return;

  _aiRecipeContext  = context || 'ricette';
  _aiPendingRecipe  = null;

  /* Determina pasto iniziale */
  if (context === 'oggi' && typeof selectedMeal !== 'undefined') {
    _aiRecipeMealKey = selectedMeal;
  } else {
    _aiRecipeMealKey = 'pranzo';
  }

  modal.classList.add('active');

  if (context === 'oggi') {
    /* Dal piano giornaliero: mostra selettore pasto + ingredienti */
    _aiSelectedIngredients = null;
    _renderAIStep('select-oggi');
  } else if (context === 'oggi_piano') {
    /* Da sezione ricette nella pagina Oggi: usa ingredienti del piano */
    _renderAIStep('loading');
    _runAIGeneration();
  } else {
    /* Da ricette o dispensa: mostra sempre il selettore del pasto */
    _renderAIStep('select');
  }
}

/* ──────────────────────────────────────────────────
   Render step del modal
────────────────────────────────────────────────── */
function _renderAIStep(step) {
  var resultEl = document.getElementById('aiRecipeResult');
  var footerEl = document.getElementById('aiRecipeFooter');
  if (!resultEl || !footerEl) return;

  if (step === 'select') {
    var meals = [
      { key:'colazione', emoji:'☀️', label:'Colazione' },
      { key:'spuntino',  emoji:'🍎', label:'Spuntino'  },
      { key:'pranzo',    emoji:'🍽', label:'Pranzo'    },
      { key:'merenda',   emoji:'🥪', label:'Merenda'   },
      { key:'cena',      emoji:'🌙', label:'Cena'      }
    ];
    resultEl.innerHTML =
      '<p style="font-size:.9em;color:var(--text-2);margin-bottom:14px;">Per quale pasto vuoi generare una ricetta?</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
        meals.map(function(m) {
          var active = m.key === _aiRecipeMealKey;
          var style  = active
            ? 'background:var(--primary);color:#fff;border-color:var(--primary);'
            : 'background:var(--bg-subtle);color:var(--text-1);border:1px solid var(--border);';
          return '<button class="ai-meal-pill" style="padding:8px 14px;border-radius:99px;font-size:.88em;font-weight:600;cursor:pointer;transition:.15s;' + style + '"' +
                 ' onclick="_aiSelectMealPill(\'' + m.key + '\')">' +
                 m.emoji + ' ' + m.label + '</button>';
        }).join('') +
      '</div>';
    footerEl.innerHTML =
      '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Annulla</button>' +
      '<button class="btn btn-primary" onclick="_runAIFromModal()">✨ Genera</button>';
    return;
  }

  if (step === 'select-oggi') {
    var meals = [
      { key:'colazione', emoji:'☀️', label:'Colazione' },
      { key:'spuntino',  emoji:'🍎', label:'Spuntino'  },
      { key:'pranzo',    emoji:'🍽', label:'Pranzo'    },
      { key:'merenda',   emoji:'🥪', label:'Merenda'   },
      { key:'cena',      emoji:'🌙', label:'Cena'      }
    ];
    var mealPills =
      '<p style="font-size:.85em;color:var(--text-2);margin-bottom:10px;font-weight:600;">Per quale pasto?</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:18px;">' +
        meals.map(function(m) {
          var active = m.key === _aiRecipeMealKey;
          var s = active
            ? 'background:var(--primary);color:#fff;border-color:var(--primary);'
            : 'background:var(--bg-subtle);color:var(--text-1);border:1px solid var(--border);';
          return '<button class="ai-meal-pill" style="padding:7px 13px;border-radius:99px;font-size:.86em;font-weight:600;cursor:pointer;transition:.15s;' + s + '"' +
                 ' onclick="_aiSelectMealPill(\'' + m.key + '\')">' + m.emoji + ' ' + m.label + '</button>';
        }).join('') +
      '</div>';

    var planItems = (typeof getMealItems === 'function') ? getMealItems(_aiRecipeMealKey) : [];
    var ingSection = '';
    if (planItems.length) {
      ingSection =
        '<p style="font-size:.85em;color:var(--text-2);margin-bottom:8px;font-weight:600;">Ingredienti del piano — seleziona quelli da usare:</p>' +
        '<div style="display:flex;flex-direction:column;gap:5px;">' +
          planItems.map(function(item) {
            var qty = item.quantity ? ' <span style="color:var(--text-3);font-size:.76em;">(' + item.quantity + '\u202f' + (item.unit || 'g') + ')</span>' : '';
            return '<label style="display:flex;align-items:center;gap:9px;padding:8px 11px;background:var(--bg-subtle);border-radius:var(--r-md);cursor:pointer;">' +
              '<input type="checkbox" class="ai-ing-check" value="' + item.name.replace(/"/g,'&quot;') + '" checked ' +
              'style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;flex-shrink:0;">' +
              '<span style="font-size:.88em;font-weight:600;color:var(--text-1);">' + item.name + qty + '</span>' +
            '</label>';
          }).join('') +
        '</div>';
    } else {
      ingSection =
        '<p style="font-size:.84em;color:var(--text-3);font-style:italic;padding:10px 0;">' +
        'Nessun ingrediente nel piano per questo pasto. La ricetta sarà generata liberamente.</p>';
    }

    resultEl.innerHTML = mealPills + ingSection;
    footerEl.innerHTML =
      '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Annulla</button>' +
      '<button class="btn btn-primary" onclick="_runAIFromModal()">✨ Genera</button>';
    return;
  }

  if (step === 'loading') {
    resultEl.innerHTML =
      '<div style="margin-bottom:14px;">' +
        '<div style="height:4px;background:var(--bg-subtle);border-radius:99px;overflow:hidden;">' +
          '<div class="ai-progress-bar"></div>' +
        '</div>' +
      '</div>' +
      '<div class="ai-loading" style="padding:16px 0;">' +
        '<span class="ai-spinner"></span>' +
        ' Gemini sta creando la tua ricetta…' +
      '</div>';
    footerEl.innerHTML =
      '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Annulla</button>';
    return;
  }

  if (step === 'result') {
    var r = _aiPendingRecipe;
    if (!r) return;
    var icon       = r.icon || _mealIconMap[r.pasto] || '🍽';
    var mealLabel  = _mealLabelMap[r.pasto] || r.pasto || '';
    var ings       = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    var prep       = r.preparazione || '';

    var html =
      '<div>' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">' +
          '<span style="font-size:2.2rem;line-height:1;">' + icon + '</span>' +
          '<div>' +
            '<div style="font-weight:800;font-size:1.05rem;line-height:1.2;">' + r.name + '</div>' +
            '<div style="font-size:.8em;color:var(--primary);font-weight:600;margin-top:4px;">' + mealLabel + '</div>' +
          '</div>' +
        '</div>';

    if (ings.length) {
      html +=
        '<div style="font-weight:700;font-size:.78em;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Ingredienti</div>' +
        '<ul style="margin:0 0 16px;padding-left:20px;">' +
          ings.map(function(i) {
            var qty = (i.quantity != null) ? ' — ' + i.quantity + ' ' + (i.unit || '') : '';
            return '<li style="margin-bottom:5px;font-size:.9em;">' + (i.name || '') + qty + '</li>';
          }).join('') +
        '</ul>';
    }

    if (prep) {
      html +=
        '<div style="font-weight:700;font-size:.78em;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Preparazione</div>' +
        '<p style="font-size:.9em;line-height:1.65;color:var(--text-2);margin:0;">' + prep + '</p>';
    }

    html += '</div>';
    resultEl.innerHTML = html;
    footerEl.innerHTML =
      '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Rifiuta</button>' +
      '<button class="btn btn-secondary" onclick="_regenAIRecipe()">Rigenera</button>' +
      '<button class="btn btn-primary"   onclick="_acceptAIRecipe()">✓ Accetta</button>';
    return;
  }

  if (step === 'error') {
    /* gestito internamente */
  }
}

function _aiSelectMealPill(meal) {
  _aiRecipeMealKey = meal;
  _renderAIStep(_aiRecipeContext === 'oggi' ? 'select-oggi' : 'select');
}

function _getCheckedIngredients() {
  var boxes = document.querySelectorAll('#aiRecipeResult .ai-ing-check:checked');
  var names = [];
  for (var i = 0; i < boxes.length; i++) { names.push(boxes[i].value); }
  return names;
}

function _runAIFromModal() {
  if (_aiRecipeContext === 'oggi') {
    _aiSelectedIngredients = _getCheckedIngredients();
  }
  _renderAIStep('loading');
  _runAIGeneration();
}

function _runAIGeneration() {
  /* Raccogli ingredienti in base al contesto */
  var ingredients = [];
  if (_aiRecipeContext === 'oggi') {
    /* Usa gli ingredienti spuntati nel picker (o tutti se nessuno spuntato) */
    if (_aiSelectedIngredients && _aiSelectedIngredients.length > 0) {
      _aiSelectedIngredients.forEach(function(n) { ingredients.push(n); });
    } else if (typeof getMealItems === 'function') {
      getMealItems(_aiRecipeMealKey).forEach(function(i) { ingredients.push(i.name); });
    }
  } else if (_aiRecipeContext === 'oggi_piano') {
    /* Usa gli ingredienti del piano per il pasto selezionato */
    if (typeof getMealItems === 'function') {
      getMealItems(_aiRecipeMealKey).forEach(function(i) { ingredients.push(i.name); });
    }
  } else {
    /* dispensa o ricette: usa gli ingredienti disponibili in dispensa */
    if (typeof pantryItems !== 'undefined' && pantryItems) {
      Object.keys(pantryItems).forEach(function(k) {
        if (pantryItems[k] && (pantryItems[k].quantity || 0) > 0) ingredients.push(k);
      });
    }
  }

  var mealLabel = { colazione:'Colazione', spuntino:'Spuntino', pranzo:'Pranzo', merenda:'Merenda', cena:'Cena' }[_aiRecipeMealKey] || 'pranzo';
  var ingHint   = ingredients.length
    ? 'Usa PRINCIPALMENTE questi ingredienti: ' + ingredients.slice(0, 20).join(', ') + '.'
    : 'Scegli ingredienti comuni e sani adatti al pasto.';

  var prompt =
    'Sei un nutrizionista e chef italiano. Crea UNA ricetta per il pasto "' + mealLabel + '". ' + ingHint + '\n\n' +
    'Rispondi ESCLUSIVAMENTE con un oggetto JSON valido. Nessun testo prima o dopo il JSON, zero markdown, zero spiegazioni. Schema esatto:\n' +
    '{"name":"<nome ricetta in italiano>","icon":"<un singolo emoji>","pasto":"' + _aiRecipeMealKey + '",' +
    '"ingredienti":[{"name":"<nome ingrediente>","quantity":<numero intero o decimale>,"unit":"<g|ml|pz|cucchiai|cucchiaini|fette|porzione>"}],' +
    '"preparazione":"<istruzioni brevi in italiano, max 280 caratteri>"}\n\n' +
    'Regola assoluta: SOLO il JSON puro, nient\'altro.';

  _geminiCall(prompt, function(text, err) {
    var resultEl = document.getElementById('aiRecipeResult');
    var footerEl = document.getElementById('aiRecipeFooter');
    if (!resultEl || !footerEl) return;

    if (err || !text) {
      resultEl.innerHTML = '<p style="color:var(--danger);padding:8px 0;">Errore: ' + (err || 'risposta vuota') + '</p>';
      footerEl.innerHTML =
        '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Chiudi</button>' +
        '<button class="btn btn-secondary" onclick="_regenAIRecipe()">Riprova</button>';
      return;
    }

    try {
      /* Estrai il primo oggetto JSON dalla risposta */
      var jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('nessun JSON');
      var recipe = JSON.parse(jsonMatch[0]);
      if (!recipe.name || !Array.isArray(recipe.ingredienti)) throw new Error('struttura non valida');

      /* Normalizza */
      recipe.pasto = recipe.pasto || _aiRecipeMealKey;
      recipe.icon  = recipe.icon  || _mealIconMap[recipe.pasto] || '🍽';
      recipe.isAI  = true;

      _aiPendingRecipe = recipe;
      _renderAIStep('result');
    } catch (parseErr) {
      resultEl.innerHTML =
        '<p style="color:var(--danger);margin-bottom:8px;">La risposta AI non è nel formato atteso. Riprova.</p>' +
        '<pre style="font-size:.7em;overflow:auto;max-height:80px;color:var(--text-3);border:1px solid var(--border);padding:6px;border-radius:6px;">' +
        text.slice(0, 300) + '</pre>';
      footerEl.innerHTML =
        '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Chiudi</button>' +
        '<button class="btn btn-secondary" onclick="_regenAIRecipe()">Riprova</button>';
    }
  });
}

function _regenAIRecipe() {
  _aiPendingRecipe = null;
  _renderAIStep('loading');
  _runAIGeneration();
}

function _acceptAIRecipe() {
  if (!_aiPendingRecipe) return;
  if (typeof aiRecipes === 'undefined') window.aiRecipes = [];

  /* Aggiungi sottocategoria se generata dalla pagina Oggi */
  if (_aiRecipeContext === 'oggi' || _aiRecipeContext === 'oggi_piano') {
    _aiPendingRecipe.subcategory = 'Da piano giornaliero';
  }

  var name = _aiPendingRecipe.name || 'Ricetta AI';

  /* Evita duplicati per nome */
  var dup = aiRecipes.findIndex(function(r) {
    return (r.name || '').toLowerCase() === name.toLowerCase();
  });
  if (dup !== -1) {
    aiRecipes[dup] = _aiPendingRecipe;
  } else {
    _aiPendingRecipe.id = 'ai_' + Date.now();
    aiRecipes.push(_aiPendingRecipe);
  }

  if (typeof saveData === 'function') saveData();
  closeAIRecipeModal();
  if (typeof showToast === 'function') showToast('✅ Ricetta "' + name + '" aggiunta alle ricette AI!', 'success');

  /* Aggiorna viste ricette */
  if (typeof renderRicetteGrid  === 'function') renderRicetteGrid();
  if (typeof renderAIRicetteTab === 'function') renderAIRicetteTab();

  if (_aiRecipeContext === 'oggi' || _aiRecipeContext === 'oggi_piano') {
    /* Rimane sulla pagina Oggi */
    if (typeof renderPianoRicette === 'function') renderPianoRicette();
  } else {
    /* Naviga alla pagina ricette → tab AI per mostrare il risultato */
    if (typeof goToPage === 'function') goToPage('ricette');
    setTimeout(function() {
      if (typeof switchRicetteTab === 'function') {
        var tabBtn = document.querySelector('#page-ricette .page-tabs .page-tab:nth-child(3)');
        switchRicetteTab('ai', tabBtn);
      }
    }, 80);
  }
}

function closeAIRecipeModal() {
  var modal = document.getElementById('aiRecipeModal');
  if (modal) modal.classList.remove('active');
  _aiPendingRecipe = null;
}

/* ══════════════════════════════════════════════════
   SUGGERIMENTI SOSTITUZIONE AI
══════════════════════════════════════════════════ */
function getAISubstituteSuggestions(ingredientName, origCat, callback) {
  var catHint = origCat ? ' (categoria attuale: ' + origCat + ')' : '';
  var prompt =
    'Sei un nutrizionista italiano. Suggerisci 5 ingredienti alternativi a "' + ingredientName + '"' + catHint + ' ' +
    'con valori nutrizionali simili o che svolgano la stessa funzione nel pasto. ' +
    'Considera anche sostituzioni tra gruppi alimentari diversi dove sensato ' +
    '(es. carne→legumi, latticini→alternativa vegetale). ' +
    'Rispondi SOLO con un array JSON di 5 nomi di ingredienti in italiano, ' +
    'es.: ["Lenticchie","Ceci","Tofu","Tempeh","Seitan"]. ' +
    'Nessun altro testo, SOLO il JSON array.';

  _geminiCall(prompt, function(text, err) {
    if (err || !text) { callback([], err); return; }
    try {
      var match = text.match(/\[[\s\S]*?\]/);
      if (!match) { callback([], 'Formato risposta non valido'); return; }
      var arr = JSON.parse(match[0]);
      callback(
        Array.isArray(arr)
          ? arr.filter(function(s) { return typeof s === 'string' && s.trim(); }).slice(0, 5)
          : [],
        null
      );
    } catch (e) {
      callback([], 'Errore parsing JSON');
    }
  });
}

/* ══════════════════════════════════════════════════
   ANALISI AI STATISTICHE
   (solo dati aggregati — il piano alimentare non viene inviato)
══════════════════════════════════════════════════ */
function generateAIStatsAnalysis() {
  var resultEl = document.getElementById('aiStatsResult');
  var btnEl    = document.getElementById('aiStatsBtn');
  if (!resultEl) return;

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = '⏳ Analisi in corso…';
  }
  resultEl.style.display = 'block';
  resultEl.innerHTML =
    '<div class="ai-loading"><span class="ai-spinner"></span> Gemini sta analizzando le tue abitudini…</div>';

  /* Raccoglie solo statistiche aggregate — mai dati del piano (privacy) */
  var stats     = (typeof computeStats     === 'function') ? computeStats()     : {};
  var weekUsage = (typeof computeWeekUsage === 'function') ? computeWeekUsage() : {};

  var topIng   = (stats.topIngredients || []).slice(0, 5)
    .map(function(i) { return i.name + ' (' + i.count + ' volte)'; }).join(', ');
  var mealDist = Object.keys(stats.mealCounts || {})
    .map(function(mk) { return mk + ':' + (stats.mealCounts[mk] || 0); }).join(', ');
  var weekStr  = Object.keys(weekUsage)
    .map(function(k) { return k + ':' + weekUsage[k]; }).join(', ');

  var prompt =
    'Sei un nutrizionista italiano esperto e incoraggiante. Analizza le seguenti statistiche di comportamento alimentare e fornisci consigli utili.\n\n' +
    'STATISTICHE UTENTE:\n' +
    '- Giorni di utilizzo registrati: ' + (stats.totalDays         || 0) + '\n' +
    '- Pasti completati totali: '        + (stats.totalMeals        || 0) + '\n' +
    '- Alimenti unici consumati: '       + (stats.uniqueIngredients || 0) + '\n' +
    '- Sostituzioni effettuate: '        + (stats.totalSubs         || 0) + '\n' +
    (topIng   ? '- Alimenti più frequenti: '        + topIng   + '\n' : '') +
    (mealDist ? '- Pasti registrati per fascia: '   + mealDist + '\n' : '') +
    (weekStr  ? '- Uso settimanale per categoria: ' + weekStr  + '\n' : '') +
    '\nFornisci la risposta strutturata così:\n' +
    '1. Commento generale sulle abitudini (2-3 righe)\n' +
    '2. Tre suggerimenti pratici numerati\n' +
    '3. Un punto di forza rilevato nei dati\n\n' +
    'Rispondi in italiano, tono positivo e diretto. Massimo 250 parole. ' +
    'IMPORTANTE: termina sempre ogni frase in modo completo, non interrompere mai a metà frase. ' +
    'Nessun elemento superfluo.';

  _geminiCall(prompt, function(text, err) {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '🤖 Analisi AI <span class="ai-powered-label">Powered by Gemini</span>';
    }
    if (!resultEl) return;

    if (err || !text) {
      resultEl.innerHTML =
        '<p style="color:var(--danger);font-size:.9em;">Errore: ' + (err || 'risposta vuota') + '</p>';
      return;
    }

    var html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^(\d+\.)/gm, '<br><strong>$1</strong>')
      .replace(/\n\n+/g, '<br><br>')
      .replace(/\n/g, '<br>');

    resultEl.innerHTML =
      '<div style="padding:14px 16px;background:var(--bg-subtle);border-radius:var(--r-lg);border:1px solid var(--border);margin-top:4px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
          '<span style="font-size:1.1rem;">🤖</span>' +
          '<span style="font-size:.75em;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.05em;">Analisi Gemini</span>' +
        '</div>' +
        '<div style="font-size:.9em;line-height:1.7;color:var(--text-2);">' + html + '</div>' +
      '</div>';
  }, { maxOutputTokens: 2500 });
}
