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

/* ── Rate limiting (────────────────────────────────────────────────────────── */
var _AI_RATE_KEY  = 'nutriplan_ai_rate';
var _AI_LIMIT_RPM = 10;
var _AI_LIMIT_RPD = 250;

function _loadAIRate() {
  try { var r = localStorage.getItem(_AI_RATE_KEY); if (r) return JSON.parse(r); } catch(e){}
  return { minuteCount:0, minuteReset:0, dayCount:0, dayKey:'' };
}
function _saveAIRate(r) {
  try { localStorage.setItem(_AI_RATE_KEY, JSON.stringify(r)); } catch(e){}
}
function _checkRateLimit() {
  var now = Date.now();
  var today = new Date().toISOString().slice(0,10);
  var r = _loadAIRate();
  if (now - r.minuteReset >= 60000) { r.minuteCount = 0; r.minuteReset = now; }
  if (r.dayKey !== today)           { r.dayCount = 0;    r.dayKey      = today; }
  if (r.minuteCount >= _AI_LIMIT_RPM) { _saveAIRate(r); return { ok:false, reason:'Troppi messaggi al minuto. Riprova tra qualche secondo. (Limite: '+_AI_LIMIT_RPM+'/min)' }; }
  if (r.dayCount    >= _AI_LIMIT_RPD) { _saveAIRate(r); return { ok:false, reason:'Limite giornaliero raggiunto ('+_AI_LIMIT_RPD+'/giorno). Riprova domani.' }; }
  r.minuteCount++; r.dayCount++;
  _saveAIRate(r);
  return { ok:true };
}
function getAIRemainingToday() {
  var today = new Date().toISOString().slice(0,10);
  var r = _loadAIRate();
  if (r.dayKey !== today) return _AI_LIMIT_RPD;
  return Math.max(0, _AI_LIMIT_RPD - r.dayCount);
}

/* ── HTTP call ────────────────────────────────────────────────────────── */
function _geminiCall(prompt, callback, opts) {
  var apiKey = _getGeminiKey();
  if (!apiKey) { callback(null, 'API key Gemini non configurata (config.js)'); return; }
  var rateCheck = _checkRateLimit();
  if (!rateCheck.ok) { callback(null, rateCheck.reason); return; }

  var url  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
  var body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
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
      if (xhr.status !== 200) { callback(null, (data.error && data.error.message) || 'Errore API ' + xhr.status); return; }
      var text = data.candidates &&
                 data.candidates[0] &&
                 data.candidates[0].content &&
                 data.candidates[0].content.parts &&
                 data.candidates[0].content.parts[0] &&
                 data.candidates[0].content.parts[0].text;
      callback(text || '', null);
    } catch(e) { callback(null, 'Errore parsing risposta AI'); }
  };
  xhr.onerror = function() { callback(null, 'Errore di rete'); };
  xhr.send(body);
}

/* ══════════════════════════════════════════════════
   PARSER JSON BILANCIATO
   Trova il primo oggetto JSON completo in una stringa qualsiasi,
   gestendo correttamente array e oggetti annidati.
══════════════════════════════════════════════════ */

function _extractBalancedJson(text) {
  /* Rimuovi markdown code fence se presente */
  var clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');

  var start = clean.indexOf('{');
  if (start === -1) return null;

  var depth   = 0;
  var inStr   = false;
  var escape  = false;

  for (var i = start; i < clean.length; i++) {
    var ch = clean[i];
    if (escape)          { escape = false; continue; }
    if (ch === '\\')    { escape = true;  continue; }
    if (ch === '"')     { inStr  = !inStr; continue; }
    if (inStr)          { continue; }
    if (ch === '{' || ch === '[') { depth++; continue; }
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        /* Trovato oggetto completo */
        return clean.slice(start, i + 1);
      }
    }
  }

  /* JSON troncato: tenta repair aggiungendo le chiusure mancanti */
  if (depth > 0) {
    var partial = clean.slice(start);
    /* Rimuovi virgola finale pendente prima di chiudere */
    partial = partial.replace(/,\s*$/, '');
    var closing = '';
    /* Ricostruisci sequenza di chiusura approssimativa */
    for (var d = 0; d < depth; d++) closing += (d === 0 ? ']}' : '}');
    console.warn('[AI Parser] JSON troncato, tentativo repair');
    return partial + closing;
  }

  return null;
}

function _parseGeminiRecipe(text) {
  console.log('[AI Parser] Raw response:', text.substring(0, 400));

  /* — Tentativo 1: estrai JSON bilanciato e parsalo — */
  var jsonStr = _extractBalancedJson(text);
  if (jsonStr) {
    try {
      var recipe = JSON.parse(jsonStr);

      /* Normalizza nome campo ingredienti (EN → IT) */
      if (!recipe.ingredienti && recipe.ingredients) {
        recipe.ingredienti = recipe.ingredients;
        delete recipe.ingredients;
      }

      /* Se ingredienti è una stringa JSON, de-serializzala */
      if (typeof recipe.ingredienti === 'string') {
        try { recipe.ingredienti = JSON.parse(recipe.ingredienti); }
        catch(e) { recipe.ingredienti = []; }
      }

      /* Normalizza ogni ingrediente */
      if (Array.isArray(recipe.ingredienti)) {
        recipe.ingredienti = recipe.ingredienti
          .map(function(ing) {
            if (typeof ing === 'string') return { name: ing, quantity: null, unit: '' };
            /* Normalizza chiavi EN → IT */
            if (!ing.name && ing.nome)     ing.name     = ing.nome;
            if (!ing.unit && ing.unita)    ing.unit     = ing.unita;
            if (!ing.quantity && ing.quantita) ing.quantity = ing.quantita;
            return ing;
          })
          .filter(function(ing) {
            return ing && typeof ing.name === 'string' && ing.name.trim().length > 0;
          });
      }

      /* Pulisci preparazione da eventuale JSON residuo */
      if (typeof recipe.preparazione === 'string') {
        recipe.preparazione = recipe.preparazione
          .replace(/\{[\s\S]*?\}/g, '')
          .replace(/[\[\]"]/g, '')
          .trim();
      }

      if (recipe.name && Array.isArray(recipe.ingredienti) && recipe.ingredienti.length > 0) {
        console.log('[AI Parser] ✓ JSON valido: "' + recipe.name + '" (' + recipe.ingredienti.length + ' ingredienti)');
        return recipe;
      }
      console.warn('[AI Parser] JSON parsato ma struttura incompleta:', recipe);
    } catch(e) {
      console.error('[AI Parser] JSON.parse error:', e.message, '\nInput:', jsonStr.substring(0, 200));
    }
  }

  /* — Tentativo 2: fallback testo libero — */
  console.log('[AI Parser] Fallback parsing testo libero…');
  return _parseFreeTextRecipe(text);
}

/* ─────────────────────────────────────────────────────────
   FALLBACK: PARSER TESTO LIBERO
───────────────────────────────────────────────────────── */
function _parseFreeTextRecipe(text) {
  var recipe = {
    name:         _ftExtractTitle(text) || 'Ricetta AI',
    ingredienti:  [],
    preparazione: _ftExtractPrep(text)  || '',
    icon:         '🍽',
    pasto:        _aiRecipeMealKey || 'pranzo'
  };

  /* Cerca sezione ingredienti */
  var m = text.match(/ingredient[ui]\s*:?\s*([\s\S]*?)(?=\n\s*(?:preparaz|procedim|istruz|passag|calor|nutri|serv|note)|$)/i);
  if (m) {
    recipe.ingredienti = m[1].split(/\n/)
      .map(function(l) {
        l = l.replace(/^[\s•\-*\d.):]+/, '').replace(/[\{\}\[\]"]/g,'').trim();
        return l;
      })
      .filter(function(l) { return l.length > 2 && !/^(preparaz|procedim|calor|nutri|name|quantity|unit)/i.test(l); })
      .slice(0,15)
      .map(function(l) {
        var parts = l.split(/\s*[-–—:]\s*/);
        if (parts.length >= 2) {
          var qm = parts[1].match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?/);
          return {
            name:     parts[0].trim(),
            quantity: qm ? parseFloat(qm[1].replace(',','.')) : null,
            unit:     (qm && qm[2]) ? qm[2] : 'g'
          };
        }
        return { name: l, quantity: null, unit: '' };
      });
  }

  console.log('[AI Parser] ⚠ Testo libero: "'+recipe.name+'" ('+recipe.ingredienti.length+' ingredienti)');
  return recipe;
}

function _ftExtractTitle(text) {
  var lines = text.replace(/```[\s\S]*?```/g,'').split(/\n/).slice(0,6);
  for (var i=0; i<lines.length; i++) {
    var l = lines[i].replace(/[\{\}\[\]"]/g,'').replace(/^(?:ricetta|titolo|nome)[:\s]*/i,'').trim();
    if (l.length>=5 && l.length<=70 && !/^[{\[:]/.test(l)) return l;
  }
  return null;
}

function _ftExtractPrep(text) {
  var m = text.match(/(?:preparazione|procedimento|istruzioni|passaggi)[:\s]*([\s\S]{20,}?)(?=\n\s*(?:calor|nutri|serv|note)|$)/i);
  if (m) return m[1].replace(/\{[\s\S]*?\}/g,'').replace(/[\[\]"]/g,'').trim().substring(0,800);
  return '';
}

/* ══════════════════════════════════════════════════
   STATO INTERNO
══════════════════════════════════════════════════ */
var _aiPendingRecipe       = null;
var _aiRecipeMealKey       = 'pranzo';
var _aiRecipeContext       = 'ricette';
var _aiSelectedIngredients = null;

var _mealIconMap = {
  colazione:'☕', spuntino:'🍎', pranzo:'🍽', merenda:'🥪', cena:'🌙'
};
var _mealLabelMap = {
  colazione:'☀️ Colazione', spuntino:'🍎 Spuntino',
  pranzo:'🍽 Pranzo', merenda:'🥪 Merenda', cena:'🌙 Cena'
};

/* ══════════════════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════════════════ */
function openAIRecipeModal(context) {
  var modal = document.getElementById('aiRecipeModal');
  if (!modal) return;
  _aiRecipeContext  = context || 'ricette';
  _aiPendingRecipe  = null;
  if (context === 'oggi' && typeof selectedMeal !== 'undefined') {
    _aiRecipeMealKey = selectedMeal;
  } else {
    _aiRecipeMealKey = 'pranzo';
  }
  modal.classList.add('active');
  if (context === 'oggi') {
    _aiSelectedIngredients = null;
    _renderAIStep('select-oggi');
  } else if (context === 'oggi_piano') {
    _renderAIStep('loading');
    _runAIGeneration();
  } else {
    _renderAIStep('select');
  }
}

/* ══════════════════════════════════════════════════
   RENDER STEPS
══════════════════════════════════════════════════ */
function _renderAIStep(step) {
  var resultEl = document.getElementById('aiRecipeResult');
  var footerEl = document.getElementById('aiRecipeFooter');
  if (!resultEl || !footerEl) return;

  /* ── SELECT pasto (contesti ricette/dispensa) ───────────────────────── */
  if (step === 'select' || step === 'select-oggi') {
    var meals = [
      {key:'colazione',emoji:'☀️',label:'Colazione'},
      {key:'spuntino', emoji:'🍎',label:'Spuntino'},
      {key:'pranzo',   emoji:'🍽',label:'Pranzo'},
      {key:'merenda',  emoji:'🥪',label:'Merenda'},
      {key:'cena',     emoji:'🌙',label:'Cena'}
    ];

    var pillsHtml =
      '<p style="font-size:.88em;color:var(--text-2);margin-bottom:12px;font-weight:600;">Per quale pasto?</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:' + (step==='select-oggi'?'18':'4') + 'px;">' +
        meals.map(function(m) {
          var active = m.key === _aiRecipeMealKey;
          var s = active
            ? 'background:var(--primary);color:#fff;border:1px solid var(--primary);'
            : 'background:var(--bg-subtle);color:var(--text-1);border:1px solid var(--border);';
          return '<button class="ai-meal-pill" style="padding:8px 14px;border-radius:99px;font-size:.87em;font-weight:600;cursor:pointer;transition:.15s;' + s + '"' +
                 ' onclick="_aiSelectMealPill(\'' + m.key + '\')">' + m.emoji + ' ' + m.label + '</button>';
        }).join('') +
      '</div>';

    var ingSection = '';
    if (step === 'select-oggi') {
      var planItems = (typeof getMealItems === 'function') ? getMealItems(_aiRecipeMealKey) : [];
      if (planItems.length) {
        ingSection =
          '<p style="font-size:.84em;color:var(--text-2);margin-bottom:8px;font-weight:600;">Ingredienti del piano — seleziona quelli da usare:</p>' +
          '<div style="display:flex;flex-direction:column;gap:5px;">' +
            planItems.map(function(item) {
              var qty = item.quantity
                ? ' <span style="color:var(--text-3);font-size:.76em;">(' + item.quantity + '\u202f' + (item.unit||'g') + ')</span>' : '';
              return '<label style="display:flex;align-items:center;gap:9px;padding:8px 11px;background:var(--bg-subtle);border-radius:var(--r-md);cursor:pointer;">' +
                '<input type="checkbox" class="ai-ing-check" value="' + item.name.replace(/"/g,'&quot;') + '" checked ' +
                'style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;flex-shrink:0;">' +
                '<span style="font-size:.88em;font-weight:600;color:var(--text-1);">' + item.name + qty + '</span>' +
              '</label>';
            }).join('') +
          '</div>';
      } else {
        ingSection = '<p style="font-size:.84em;color:var(--text-3);font-style:italic;padding:8px 0;">Nessun ingrediente nel piano per questo pasto. La ricetta sarà generata liberamente.</p>';
      }
    }

    resultEl.innerHTML = pillsHtml + ingSection;
    footerEl.innerHTML =
      '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Annulla</button>' +
      '<button class="btn btn-primary" onclick="_runAIFromModal()">✨ Genera</button>';
    return;
  }

  /* ── LOADING ──────────────────────────────────────────────────── */
  if (step === 'loading') {
    resultEl.innerHTML =
      '<div style="margin-bottom:14px;"><div style="height:4px;background:var(--bg-subtle);border-radius:99px;overflow:hidden;"><div class="ai-progress-bar"></div></div></div>' +
      '<div class="ai-loading" style="padding:16px 0;"><span class="ai-spinner"></span> Gemini sta creando la tua ricetta…</div>';
    footerEl.innerHTML = '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Annulla</button>';
    return;
  }

  /* ── RESULT (identico a openRecipeModal di ricette.js) ─────────────── */
  if (step === 'result') {
    var r = _aiPendingRecipe;
    if (!r) return;

    /* Usa le utility di ricette.js se disponibili, altrimenti fallback locali */
    var _safeStr = (typeof safeStr    === 'function') ? safeStr    : function(v){ return v == null ? '' : String(v); };
    var _pColor  = (typeof pastoColor === 'function') ? pastoColor : function(){ return 'var(--primary)'; };
    var _pLabel  = (typeof pastoLabel === 'function') ? pastoLabel : function(p){ return _mealLabelMap[p] || p || ''; };
    var _fridgeK = (typeof getFridgeKeys === 'function') ? getFridgeKeys() : [];
    var _avail   = (typeof countAvailable === 'function') ? countAvailable(r.ingredienti||[]) : 0;
    var _isExtraFn = (typeof isIngExtraPiano === 'function') ? isIngExtraPiano : function(){ return false; };
    var _pianoNms  = (typeof getPianoAlimentareIngNames === 'function') ? getPianoAlimentareIngNames() : [];

    var icon      = _safeStr(r.icon || _mealIconMap[r.pasto] || '🍽');
    var name      = _safeStr(r.name || 'Ricetta AI');
    var pasto     = r.pasto || _aiRecipeMealKey || 'pranzo';
    var color     = _pColor(pasto);
    var pLabel    = _pLabel(pasto);
    var ings      = Array.isArray(r.ingredienti) ? r.ingredienti : [];
    var prep      = _safeStr(r.preparazione || '');
    var tot       = ings.length;
    var avail     = _avail;
    var pct       = tot ? Math.round((avail / tot) * 100) : 0;
    var barClr    = pct >= 80 ? '#2ea86a' : pct >= 40 ? '#d97706' : '#dc2626';
    var hasExtraCheck = _pianoNms.length > 0;

    /* — Header hero (come openRecipeModal) — */
    var html =
      '<div class="rm-hero" style="--mc:' + color + ';">' +
        '<div class="rm-hero-icon">' + icon + '</div>' +
        '<div>' +
          '<div class="rm-hero-name">' + name + '</div>' +
          (pLabel ? '<div class="rm-hero-pasto" style="color:' + color + ';">' + pLabel + '</div>' : '') +
        '</div>' +
      '</div>';

    /* — Barra disponibilità — */
    if (tot > 0) {
      html +=
        '<div class="rm-avail">' +
          '<div class="rm-avail-track"><div class="rm-avail-fill" style="width:' + pct + '%;background:' + barClr + '"></div></div>' +
          '<span style="color:' + barClr + ';font-size:.75rem;font-weight:800;">' + avail + '/' + tot + ' in dispensa</span>' +
        '</div>';
    }

    /* — Ingredienti — */
    if (ings.length) {
      html += '<p class="rm-section-label">Ingredienti</p><ul class="rm-ing-list">';
      ings.forEach(function(ing) {
        var n   = _safeStr(ing.name || ing.nome || '');
        var nl  = n.toLowerCase().trim();
        var ok  = _fridgeK.some(function(k) {
          var kl = k.toLowerCase().trim();
          return kl === nl || kl.includes(nl) || nl.includes(kl);
        });
        var extra = hasExtraCheck && _isExtraFn(n);
        var qty = (ing.quantity != null && !isNaN(parseFloat(ing.quantity)))
          ? '<span class="rm-qty">' + ing.quantity + '\u00a0' + _safeStr(ing.unit || ing.unita || '') + '</span>'
          : '';
        html +=
          '<li class="rm-ing' + (ok?' ok':'') + (extra?' rm-extra':'') + '">' +
            '<span class="rm-check">' + (ok ? '✔' : '○') + '</span>' +
            '<span class="rm-ing-name">' + n + '</span>' + qty +
            (extra ? '<span class="rm-extra-tag">extra piano</span>' : '') +
          '</li>';
      });
      html += '</ul>';
    }

    /* — Preparazione (a steps se ci sono frasi multiple) — */
    if (prep) {
      var steps = prep.split(/\.\s+/).filter(function(s){ return s.trim().length > 3; });
      html += '<p class="rm-section-label">Preparazione</p>';
      html += steps.length > 1
        ? '<ol class="rm-steps">' + steps.map(function(s){ return '<li>' + s.replace(/\.$/,'') + '</li>'; }).join('') + '</ol>'
        : '<p class="rm-prep">' + prep + '</p>';
    }

    resultEl.innerHTML = html;
    footerEl.innerHTML =
      '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Rifiuta</button>' +
      '<button class="btn btn-secondary" onclick="_regenAIRecipe()">Rigenera</button>' +
      '<button class="btn btn-primary"   onclick="_acceptAIRecipe()">✓ Accetta</button>';
    return;
  }
}

/* ══════════════════════════════════════════════════
   HELPERS MODAL
══════════════════════════════════════════════════ */
function _aiSelectMealPill(meal) {
  _aiRecipeMealKey = meal;
  _renderAIStep(_aiRecipeContext === 'oggi' ? 'select-oggi' : 'select');
}

function _getCheckedIngredients() {
  var boxes = document.querySelectorAll('#aiRecipeResult .ai-ing-check:checked');
  var names = [];
  for (var i=0; i<boxes.length; i++) names.push(boxes[i].value);
  return names;
}

function _runAIFromModal() {
  if (_aiRecipeContext === 'oggi') {
    _aiSelectedIngredients = _getCheckedIngredients();
  }
  _renderAIStep('loading');
  _runAIGeneration();
}

/* ══════════════════════════════════════════════════
   GENERAZIONE RICETTA
══════════════════════════════════════════════════ */
function _runAIGeneration() {
  var ingredients = [];

  if (_aiRecipeContext === 'oggi') {
    if (_aiSelectedIngredients && _aiSelectedIngredients.length > 0) {
      ingredients = _aiSelectedIngredients.slice();
    } else if (typeof getMealItems === 'function') {
      getMealItems(_aiRecipeMealKey).forEach(function(i){ ingredients.push(i.name); });
    }
  } else if (_aiRecipeContext === 'oggi_piano') {
    if (typeof getMealItems === 'function') {
      getMealItems(_aiRecipeMealKey).forEach(function(i){ ingredients.push(i.name); });
    }
  } else {
    /* dispensa o ricette */
    if (typeof pantryItems !== 'undefined' && pantryItems) {
      Object.keys(pantryItems).forEach(function(k) {
        if (pantryItems[k] && (pantryItems[k].quantity||0) > 0) ingredients.push(k);
      });
    }
  }

  var mealLabel  = {colazione:'Colazione',spuntino:'Spuntino',pranzo:'Pranzo',merenda:'Merenda',cena:'Cena'}[_aiRecipeMealKey] || 'Pranzo';
  var ingHint    = ingredients.length
    ? 'Usa OBBLIGATORIAMENTE questi ingredienti come base: ' + ingredients.slice(0,20).join(', ') + '.'
    : 'Scegli ingredienti comuni e bilanciati per il pasto.';

  /* Vincoli dieta */
  var dietHints = [];
  var dp = (typeof dietProfile !== 'undefined') ? dietProfile : {};
  if (dp.vegetariano)   dietHints.push('vegetariana (no carne, no pesce)');
  if (dp.vegano)        dietHints.push('vegana (no carne, no pesce, no latticini, no uova)');
  if (dp.senzaLattosio) dietHints.push('senza lattosio');
  if (dp.senzaGlutine)  dietHints.push('senza glutine');
  if (Array.isArray(dp.allergenici) && dp.allergenici.length)
    dietHints.push('senza: ' + dp.allergenici.join(', '));
  var dietClause = dietHints.length ? ' La ricetta deve essere ' + dietHints.join('; ') + '.' : '';

  /* Prompt molto diretto per ottenere JSON puro */
  var prompt =
    'Sei uno chef italiano. Crea UNA ricetta per "' + mealLabel + '". ' + ingHint + dietClause + '\n\n' +
    'Rispondi ESCLUSIVAMENTE con questo JSON (zero testo prima o dopo):\n' +
    '{' +
      '"name": "Nome della ricetta in italiano",' +
      '"icon": "emoji adatta al piatto",' +
      '"pasto": "' + _aiRecipeMealKey + '",' +
      '"ingredienti": [' +
        '{"name": "ingrediente", "quantity": 100, "unit": "g"},' +
        '{"name": "ingrediente2", "quantity": 2, "unit": "pz"}' +
      '],' +
      '"preparazione": "Descrizione breve della preparazione in max 250 caratteri."' +
    '}\n\n' +
    'REGOLE TASSATIVE:\n' +
    '- quantity deve essere un NUMERO (non una stringa)\n' +
    '- unit deve essere: g, ml, pz, cucchiai, cucchiaino, fette, spicchi\n' +
    '- preparazione: max 250 caratteri, nessun JSON dentro\n' +
    '- NESSUN testo fuori dal JSON, nessun markdown, nessun commento';

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

    var recipe;
    try {
      recipe = _parseGeminiRecipe(text);
    } catch(e) {
      recipe = null;
    }

    if (!recipe || !recipe.name || !Array.isArray(recipe.ingredienti) || recipe.ingredienti.length === 0) {
      resultEl.innerHTML =
        '<p style="color:var(--danger);margin-bottom:8px;">⚠️ Gemini non ha risposto correttamente. Riprova.</p>' +
        '<details style="font-size:.74em;color:var(--text-3);border:1px solid var(--border);padding:8px;border-radius:6px;max-height:120px;overflow:auto;">' +
          '<summary style="cursor:pointer;font-weight:600;">Mostra risposta raw</summary>' +
          '<pre style="margin-top:6px;white-space:pre-wrap;word-break:break-all;">' + text.slice(0,600) + '</pre>' +
        '</details>';
      footerEl.innerHTML =
        '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Chiudi</button>' +
        '<button class="btn btn-secondary" onclick="_regenAIRecipe()">Riprova</button>';
      return;
    }

    /* Normalizza e arricchisci */
    recipe.pasto = recipe.pasto || _aiRecipeMealKey;
    recipe.icon  = recipe.icon  || _mealIconMap[recipe.pasto] || '🍽';
    recipe.isAI  = true;

    _aiPendingRecipe = recipe;
    _renderAIStep('result');
  });
}

/* ══════════════════════════════════════════════════
   AZIONI: ACCETTA / RIGENERA / CHIUDI
══════════════════════════════════════════════════ */
function _regenAIRecipe() {
  _aiPendingRecipe = null;
  _renderAIStep('loading');
  _runAIGeneration();
}

function _acceptAIRecipe() {
  if (!_aiPendingRecipe) return;
  if (typeof aiRecipes === 'undefined') window.aiRecipes = [];

  if (_aiRecipeContext === 'oggi' || _aiRecipeContext === 'oggi_piano') {
    _aiPendingRecipe.subcategory = 'Da piano giornaliero';
  }

  var name = _aiPendingRecipe.name || 'Ricetta AI';
  var dup  = aiRecipes.findIndex(function(r){ return (r.name||'').toLowerCase() === name.toLowerCase(); });
  if (dup !== -1) {
    aiRecipes[dup] = _aiPendingRecipe;
  } else {
    _aiPendingRecipe.id = 'ai_' + Date.now();
    aiRecipes.push(_aiPendingRecipe);
  }

  if (typeof saveData         === 'function') saveData();
  closeAIRecipeModal();
  if (typeof showToast        === 'function') showToast('✅ Ricetta "' + name + '" aggiunta alle ricette AI!', 'success');
  if (typeof renderRicetteGrid  === 'function') renderRicetteGrid();
  if (typeof renderAIRicetteTab === 'function') renderAIRicetteTab();

  if (_aiRecipeContext === 'oggi' || _aiRecipeContext === 'oggi_piano') {
    if (typeof renderPianoRicette === 'function') renderPianoRicette();
  } else {
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
    'con valori nutrizionali simili o che svolgano la stessa funzione. ' +
    'Considera sostituzioni tra gruppi diversi (es. carne→legumi, latticini→vegetale). ' +
    'Rispondi SOLO con array JSON: ["Nome1","Nome2","Nome3","Nome4","Nome5"]. ' +
    'Nessun altro testo.';

  _geminiCall(prompt, function(text, err) {
    if (err || !text) { callback([], err); return; }
    try {
      var match = text.match(/\[[\s\S]*?\]/);
      if (!match) { callback([], 'Formato non valido'); return; }
      var arr = JSON.parse(match[0]);
      callback(
        Array.isArray(arr) ? arr.filter(function(s){ return typeof s==='string' && s.trim(); }).slice(0,5) : [],
        null
      );
    } catch(e) { callback([], 'Errore parsing'); }
  });
}

/* ══════════════════════════════════════════════════
   ANALISI AI STATISTICHE
══════════════════════════════════════════════════ */
function generateAIStatsAnalysis() {
  var resultEl = document.getElementById('aiStatsResult');
  var btnEl    = document.getElementById('aiStatsBtn');
  if (!resultEl) return;

  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '⏳ Analisi in corso…'; }
  resultEl.style.display = 'block';
  resultEl.innerHTML = '<div class="ai-loading"><span class="ai-spinner"></span> Gemini sta analizzando le tue abitudini…</div>';

  var stats     = (typeof computeStats     === 'function') ? computeStats()     : {};
  var weekUsage = (typeof computeWeekUsage === 'function') ? computeWeekUsage() : {};

  var topIng   = (stats.topIngredients||[]).slice(0,5).map(function(i){ return i.name+'('+i.count+'x)'; }).join(', ');
  var mealDist = Object.keys(stats.mealCounts||{}).map(function(mk){ return mk+':'+((stats.mealCounts||{})[mk]||0); }).join(', ');
  var weekStr  = Object.keys(weekUsage).map(function(k){ return k+':'+weekUsage[k]; }).join(', ');

  var prompt =
    'Sei un nutrizionista italiano esperto. Analizza queste statistiche alimentari e fornisci consigli utili.\n\n' +
    'STATISTICHE:\n' +
    '- Giorni registrati: ' + (stats.totalDays||0) + '\n' +
    '- Pasti totali: '      + (stats.totalMeals||0) + '\n' +
    '- Alimenti unici: '   + (stats.uniqueIngredients||0) + '\n' +
    '- Sostituzioni: '     + (stats.totalSubs||0) + '\n' +
    (topIng   ? '- Più frequenti: ' + topIng   + '\n' : '') +
    (mealDist ? '- Per pasto: '    + mealDist + '\n' : '') +
    (weekStr  ? '- Settimanale: '  + weekStr  + '\n' : '') +
    '\nStruttura la risposta:\n1. Commento generale (2-3 righe)\n2. Tre suggerimenti pratici\n3. Un punto di forza\n\n' +
    'In italiano, positivo, max 250 parole. Frasi sempre complete.';

  _geminiCall(prompt, function(text, err) {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '🤖 Analisi AI <span class="ai-powered-label">Powered by Gemini</span>'; }
    if (!resultEl) return;
    if (err || !text) {
      resultEl.innerHTML = '<p style="color:var(--danger);font-size:.9em;">Errore: ' + (err||'risposta vuota') + '</p>';
      return;
    }
    var html = text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/^(\d+\.)/gm,'<br><strong>$1</strong>')
      .replace(/\n\n+/g,'<br><br>').replace(/\n/g,'<br>');
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
