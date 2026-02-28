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

/* ── Rate limiting ──────────────────────────────────────────────────────────── */
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

/* ── HTTP call ────────────────────────────────────────────────────────────── */
function _geminiCall(prompt, callback, opts) {
  var apiKey = _getGeminiKey();
  if (!apiKey) { callback(null, 'API key Gemini non configurata (config.js)'); return; }
  var rateCheck = _checkRateLimit();
  if (!rateCheck.ok) { callback(null, rateCheck.reason); return; }

  var url  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
  var body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: (opts && opts.temperature !== undefined) ? opts.temperature : 0.3,
      maxOutputTokens: (opts && opts.maxOutputTokens) ? opts.maxOutputTokens : 2000
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

/* ══════════════════════════════════════════════════════════════════════════════
   PARSER JSON MULTI-STRATEGIA
   Prova diverse tecniche per estrarre JSON valido dalla risposta AI
══════════════════════════════════════════════════════════════════════════════ */

function _extractBalancedJson(text) {
  /* Rimuovi markdown code fence e spazi extra */
  var clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();

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
        return clean.slice(start, i + 1);
      }
    }
  }

  /* JSON troncato: auto-repair */
  if (depth > 0) {
    var partial = clean.slice(start);
    partial = partial.replace(/,\s*$/, '');
    var closing = '';
    for (var d = 0; d < depth; d++) closing += '}';
    var repaired = partial + closing;
    console.warn('[AI Parser] JSON troncato, repair applicato');
    // #region agent log
    fetch('http://127.0.0.1:7877/ingest/d4259ea7-a374-40c6-8a9b-f82b54460446',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c92f53'},body:JSON.stringify({sessionId:'c92f53',location:'gemini.js:_extractBalancedJson_repair',message:'JSON truncation repair applied',data:{hypothesisId:'H1',inputLength:(text&&text.length)||0,cleanLength:clean.length,depth:depth,partialLength:partial.length,repairedLength:repaired.length,repairedStart:repaired.substring(0,120),repairedEnd:repaired.length>80?repaired.substring(repaired.length-80):repaired},timestamp:Date.now()})}).catch(function(){});
    // #endregion
    return repaired;
  }

  return null;
}

function _extractJsonWithRegex(text) {
  /* Strategia 2: regex per trovare JSON anche con testo attorno */
  var patterns = [
    /\{[\s\S]*?"ingredienti"[\s\S]*?\}/,
    /\{[\s\S]*?"name"[\s\S]*?"preparazione"[\s\S]*?\}/,
    /\{[^{}]*\{[^{}]*\}[^{}]*\}/
  ];
  
  for (var i = 0; i < patterns.length; i++) {
    var match = text.match(patterns[i]);
    if (match) {
      console.log('[AI Parser] Strategia regex ' + (i+1) + ' match');
      return match[0];
    }
  }
  return null;
}

function _cleanMarkdownJson(text) {
  /* Strategia 3: pulizia aggressiva markdown */
  return text
    .replace(/^[\s\S]*?(?=\{)/, '')  /* rimuovi tutto prima della prima { */
    .replace(/\}[\s\S]*$/, '}')      /* rimuovi tutto dopo l'ultima } */
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^[^{]*/, '')
    .trim();
}

function _parseGeminiRecipe(text) {
  console.log('[AI Parser] === INIZIO PARSING ===');
  console.log('[AI Parser] Raw length:', text.length, 'chars');
  console.log('[AI Parser] Preview:', text.substring(0, 200));

  var strategies = [
    { name: 'Balanced JSON', fn: function() { return _extractBalancedJson(text); } },
    { name: 'Regex extraction', fn: function() { return _extractJsonWithRegex(text); } },
    { name: 'Markdown cleanup', fn: function() { return _cleanMarkdownJson(text); } }
  ];

  var recipe = null;
  
  for (var i = 0; i < strategies.length; i++) {
    var strategy = strategies[i];
    console.log('[AI Parser] Tentativo strategia:', strategy.name);
    
    try {
      var jsonStr = strategy.fn();
      if (!jsonStr) {
        console.log('[AI Parser]', strategy.name, '→ nessun JSON trovato');
        continue;
      }
      
      console.log('[AI Parser]', strategy.name, '→ JSON estratto:', jsonStr.substring(0, 150));
      recipe = JSON.parse(jsonStr);
      
      /* Normalizza campi EN → IT */
      if (!recipe.ingredienti && recipe.ingredients) {
        recipe.ingredienti = recipe.ingredients;
        delete recipe.ingredients;
      }
      
      /* De-serializza ingredienti se sono stringhe */
      if (typeof recipe.ingredienti === 'string') {
        try { recipe.ingredienti = JSON.parse(recipe.ingredienti); }
        catch(e) { recipe.ingredienti = []; }
      }
      
      /* Normalizza ogni ingrediente */
      if (Array.isArray(recipe.ingredienti)) {
        recipe.ingredienti = recipe.ingredienti
          .map(function(ing) {
            if (typeof ing === 'string') {
              return { name: ing, quantity: null, unit: 'g' };
            }
            /* EN → IT */
            if (!ing.name && ing.nome)         ing.name     = ing.nome;
            if (!ing.unit && ing.unita)        ing.unit     = ing.unita;
            if (!ing.quantity && ing.quantita) ing.quantity = ing.quantita;
            
            /* Default unità */
            if (!ing.unit || ing.unit.trim() === '') ing.unit = 'g';
            
            /* Converti quantity stringa → numero */
            if (typeof ing.quantity === 'string') {
              var parsed = parseFloat(ing.quantity.replace(',', '.'));
              ing.quantity = isNaN(parsed) ? null : parsed;
            }
            
            return ing;
          })
          .filter(function(ing) {
            return ing && typeof ing.name === 'string' && ing.name.trim().length > 0;
          });
      }
      
      /* Pulisci preparazione */
      if (typeof recipe.preparazione === 'string') {
        recipe.preparazione = recipe.preparazione
          .replace(/\{[\s\S]*?\}/g, '')
          .replace(/[\[\]]/g, '')
          .replace(/"/g, '')
          .trim();
      }
      
      /* Validazione struttura */
      if (recipe.name && 
          typeof recipe.name === 'string' && 
          recipe.name.trim().length >= 3 &&
          Array.isArray(recipe.ingredienti) && 
          recipe.ingredienti.length > 0) {
        console.log('[AI Parser] ✓ Ricetta valida:', recipe.name, '('+recipe.ingredienti.length+' ing.)');
        console.log('[AI Parser] Strategia vincente:', strategy.name);
        return recipe;
      }
      
      console.warn('[AI Parser]', strategy.name, '→ struttura incompleta');
      
    } catch(e) {
      console.warn('[AI Parser]', strategy.name, '→ errore:', e.message);
      continue;
    }
  }

  /* Strategia 4: Fallback testo libero */
  console.log('[AI Parser] Tutte le strategie JSON fallite → fallback testo libero');
  return _parseFreeTextRecipe(text);
}

/* ───────────────────────────────────────────────────────────────────────────
   FALLBACK: PARSER TESTO LIBERO MIGLIORATO
─────────────────────────────────────────────────────────────────────────── */
function _parseFreeTextRecipe(text) {
  var recipe = {
    name:         _ftExtractTitle(text) || 'Ricetta AI',
    ingredienti:  [],
    preparazione: _ftExtractPrep(text)  || '',
    icon:         '🍽',
    pasto:        _aiRecipeMealKey || 'pranzo'
  };

  /* Cerca sezione ingredienti con pattern multipli */
  var patterns = [
    /ingredient[ui]\s*:?\s*([\s\S]*?)(?=\n\s*(?:preparaz|procedim|istruz|passag|calor|nutri|serv|note)|$)/i,
    /per\s+\d+\s+person[ei]\s*:?\s*([\s\S]*?)(?=\n\s*(?:preparaz|procedim)|$)/i
  ];
  
  for (var p = 0; p < patterns.length; p++) {
    var m = text.match(patterns[p]);
    if (m && m[1]) {
      recipe.ingredienti = m[1].split(/\n/)
        .map(function(l) {
          l = l.replace(/^[\s•\-*\d.):]+/, '').replace(/[\{\}\[\]"]/g,'').trim();
          return l;
        })
        .filter(function(l) { 
          return l.length > 2 && 
                 !/^(preparaz|procedim|calor|nutri|name|quantity|unit|ricetta|titolo)/i.test(l); 
        })
        .slice(0,20)
        .map(function(l) {
          /* Prova a estrarre quantità: "Pollo 200g" o "200g pollo" */
          var qtyMatch = l.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?/);
          var parts = l.split(/\s*[-–—:]\s*/);
          
          if (parts.length >= 2 && qtyMatch) {
            return {
              name:     parts[0].trim().replace(/\d+.*$/, '').trim(),
              quantity: parseFloat(qtyMatch[1].replace(',','.')),
              unit:     qtyMatch[2] || 'g'
            };
          }
          return { name: l.replace(/\d+.*$/, '').trim(), quantity: null, unit: 'g' };
        })
        .filter(function(ing) { return ing.name.length >= 2; });
      
      if (recipe.ingredienti.length > 0) break;
    }
  }

  console.log('[AI Parser] ⚠ Fallback testo libero: "'+recipe.name+'" ('+recipe.ingredienti.length+' ing.)');
  return recipe;
}

function _ftExtractTitle(text) {
  var lines = text.replace(/```[\s\S]*?```/g,'').split(/\n/).slice(0,8);
  for (var i=0; i<lines.length; i++) {
    var l = lines[i]
      .replace(/[\{\}\[\]"]/g,'')
      .replace(/^(?:ricetta|titolo|nome|name)[:\s]*/i,'')
      .replace(/^[#*\-\s]+/, '')
      .trim();
    if (l.length >= 5 && l.length <= 80 && !/^[{\[:]/.test(l) && !/^\d+\./.test(l)) {
      return l;
    }
  }
  return 'Ricetta AI';
}

function _ftExtractPrep(text) {
  var patterns = [
    /(?:preparazione|procedimento|istruzioni|passaggi)[:\s]*([\s\S]{30,}?)(?=\n\s*(?:calor|nutri|serv|note|ingredient)|$)/i,
    /(?:come\s+preparare|metodo)[:\s]*([\s\S]{30,}?)$/i
  ];
  
  for (var i = 0; i < patterns.length; i++) {
    var m = text.match(patterns[i]);
    if (m && m[1]) {
      return m[1]
        .replace(/\{[\s\S]*?\}/g,'')
        .replace(/[\[\]"]/g,'')
        .replace(/^[\s\n]+/, '')
        .trim()
        .substring(0, 1000);
    }
  }
  return '';
}

/* ══════════════════════════════════════════════════════════════════════════════
   STATO INTERNO
══════════════════════════════════════════════════════════════════════════════ */
var _aiPendingRecipe       = null;
var _aiRecipeMealKey       = 'pranzo';
var _aiRecipeContext       = 'ricette';
var _aiSelectedIngredients = null;
var _aiRetryCount          = 0;

var _mealIconMap = {
  colazione:'☕', spuntino:'🍎', pranzo:'🍽', merenda:'🥪', cena:'🌙'
};
var _mealLabelMap = {
  colazione:'☀️ Colazione', spuntino:'🍎 Spuntino',
  pranzo:'🍽 Pranzo', merenda:'🥪 Merenda', cena:'🌙 Cena'
};

/* ══════════════════════════════════════════════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════════════════════════════════════════════ */
function openAIRecipeModal(context) {
  var modal = document.getElementById('aiRecipeModal');
  if (!modal) return;
  _aiRecipeContext  = context || 'ricette';
  _aiPendingRecipe  = null;
  _aiRetryCount     = 0;
  
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
  } else if (context === 'dispensa') {
    _aiSelectedIngredients = null;
    _renderAIStep('select-dispensa');
  } else {
    _renderAIStep('select');
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   RENDER STEPS
══════════════════════════════════════════════════════════════════════════════ */
function _renderAIStep(step) {
  var resultEl = document.getElementById('aiRecipeResult');
  var footerEl = document.getElementById('aiRecipeFooter');
  if (!resultEl || !footerEl) return;

  /* ── SELECT pasto (contesti ricette/dispensa) ────────────────────────────── */
  if (step === 'select' || step === 'select-oggi' || step === 'select-dispensa') {
    var meals = [
      {key:'colazione',emoji:'☀️',label:'Colazione'},
      {key:'spuntino', emoji:'🍎',label:'Spuntino'},
      {key:'pranzo',   emoji:'🍽',label:'Pranzo'},
      {key:'merenda',  emoji:'🥪',label:'Merenda'},
      {key:'cena',     emoji:'🌙',label:'Cena'}
    ];

    var pillsHtml =
      '<p style="font-size:.88em;color:var(--text-2);margin-bottom:12px;font-weight:600;">Per quale pasto?</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:' + (step==='select'?'4':'18') + 'px;">' +
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
                ? ' <span style="color:var(--text-3);font-size:.76em;">(' + item.quantity + ' ' + (item.unit||'g') + ')</span>' : '';
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
    
    if (step === 'select-dispensa') {
      var availableItems = [];
      if (typeof pantryItems !== 'undefined' && pantryItems) {
        Object.keys(pantryItems).forEach(function(name) {
          var pd = pantryItems[name];
          if (pd && (pd.quantity || 0) > 0) {
            availableItems.push({
              name: name,
              quantity: pd.quantity,
              unit: pd.unit || 'g'
            });
          }
        });
      }
      
      if (availableItems.length) {
        ingSection =
          '<p style="font-size:.84em;color:var(--text-2);margin-bottom:8px;font-weight:600;">Ingredienti disponibili in dispensa — seleziona quelli da usare:</p>' +
          '<div style="display:flex;flex-direction:column;gap:5px;max-height:280px;overflow-y:auto;">' +
            availableItems.slice(0, 30).map(function(item) {
              var qty = item.quantity
                ? ' <span style="color:var(--text-3);font-size:.76em;">(' + item.quantity + ' ' + item.unit + ')</span>' : '';
              return '<label style="display:flex;align-items:center;gap:9px;padding:8px 11px;background:var(--bg-subtle);border-radius:var(--r-md);cursor:pointer;">' +
                '<input type="checkbox" class="ai-ing-check" value="' + item.name.replace(/"/g,'&quot;') + '" checked ' +
                'style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;flex-shrink:0;">' +
                '<span style="font-size:.88em;font-weight:600;color:var(--text-1);">' + item.name + qty + '</span>' +
              '</label>';
            }).join('') +
          '</div>';
      } else {
        ingSection = '<p style="font-size:.84em;color:var(--text-3);font-style:italic;padding:8px 0;">Nessun ingrediente disponibile in dispensa. La ricetta sarà generata liberamente.</p>';
      }
    }

    resultEl.innerHTML = pillsHtml + ingSection;
    footerEl.innerHTML =
      '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Annulla</button>' +
      '<button class="btn btn-primary" onclick="_runAIFromModal()">✨ Genera</button>';
    return;
  }

  /* ── LOADING ────────────────────────────────────────────────────────────── */
  if (step === 'loading') {
    var retryMsg = _aiRetryCount > 0 ? ' (tentativo ' + (_aiRetryCount + 1) + '/2)' : '';
    resultEl.innerHTML =
      '<div style="margin-bottom:14px;"><div style="height:4px;background:var(--bg-subtle);border-radius:99px;overflow:hidden;"><div class="ai-progress-bar"></div></div></div>' +
      '<div class="ai-loading" style="padding:16px 0;"><span class="ai-spinner"></span> Gemini sta creando la tua ricetta…' + retryMsg + '</div>';
    footerEl.innerHTML = '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Annulla</button>';
    return;
  }

  /* ── RESULT (identico a openRecipeModal di ricette.js) ───────────────────── */
  if (step === 'result') {
    var r = _aiPendingRecipe;
    if (!r) return;

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

    var html =
      '<div class="rm-hero" style="--mc:' + color + ';">' +
        '<div class="rm-hero-icon">' + icon + '</div>' +
        '<div>' +
          '<div class="rm-hero-name">' + name + '</div>' +
          (pLabel ? '<div class="rm-hero-pasto" style="color:' + color + ';">' + pLabel + '</div>' : '') +
        '</div>' +
      '</div>';

    if (tot > 0) {
      html +=
        '<div class="rm-avail">' +
          '<div class="rm-avail-track"><div class="rm-avail-fill" style="width:' + pct + '%;background:' + barClr + '"></div></div>' +
          '<span style="color:' + barClr + ';font-size:.75rem;font-weight:800;">' + avail + '/' + tot + ' in dispensa</span>' +
        '</div>';
    }

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
          ? '<span class="rm-qty">' + ing.quantity + ' ' + _safeStr(ing.unit || ing.unita || 'g') + '</span>'
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

/* ══════════════════════════════════════════════════════════════════════════════
   HELPERS MODAL
══════════════════════════════════════════════════════════════════════════════ */
function _aiSelectMealPill(meal) {
  _aiRecipeMealKey = meal;
  if (_aiRecipeContext === 'oggi') {
    _renderAIStep('select-oggi');
  } else if (_aiRecipeContext === 'dispensa') {
    _renderAIStep('select-dispensa');
  } else {
    _renderAIStep('select');
  }
}

function _getCheckedIngredients() {
  var boxes = document.querySelectorAll('#aiRecipeResult .ai-ing-check:checked');
  var names = [];
  for (var i=0; i<boxes.length; i++) names.push(boxes[i].value);
  return names;
}

function _runAIFromModal() {
  if (_aiRecipeContext === 'oggi' || _aiRecipeContext === 'dispensa') {
    _aiSelectedIngredients = _getCheckedIngredients();
  }
  _aiRetryCount = 0;
  _renderAIStep('loading');
  _runAIGeneration();
}

/* ══════════════════════════════════════════════════════════════════════════════
   GENERAZIONE RICETTA CON RETRY AUTOMATICO E FILTRO INTELLIGENTE INGREDIENTI
══════════════════════════════════════════════════════════════════════════════ */
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
  } else if (_aiRecipeContext === 'dispensa') {
    if (_aiSelectedIngredients && _aiSelectedIngredients.length > 0) {
      ingredients = _aiSelectedIngredients.slice();
    }
  } else {
    if (typeof pantryItems !== 'undefined' && pantryItems) {
      Object.keys(pantryItems).forEach(function(k) {
        if (pantryItems[k] && (pantryItems[k].quantity||0) > 0) ingredients.push(k);
      });
    }
  }

  var mealLabel  = {colazione:'Colazione',spuntino:'Spuntino',pranzo:'Pranzo',merenda:'Merenda',cena:'Cena'}[_aiRecipeMealKey] || 'Pranzo';
  
  /* PROMPT FLESSIBILE: AI sceglie quali ingredienti usare */
  var ingHint = '';
  if (ingredients.length > 0) {
    ingHint = 'INGREDIENTI DISPONIBILI: ' + ingredients.slice(0,25).join(', ') + '.\n\n' +
              'ISTRUZIONI FLESSIBILI:\n' +
              '- TRA questi ingredienti, scegli SOLO quelli adatti che stanno bene insieme per una ricetta di ' + mealLabel + '\n' +
              '- SCARTA ingredienti incompatibili, fuori contesto, o che non funzionano per questo pasto\n' +
              '- USA almeno 2-3 ingredienti dalla lista SE sono sensati (ma NON tutti se sono incompatibili)\n' +
              '- AGGIUNGI ingredienti base comuni se necessario (sale, olio, spezie, erbe aromatiche)\n' +
              '- Se NESSUN ingrediente va bene, crea una ricetta libera adatta a ' + mealLabel;
  } else {
    ingHint = 'Crea una ricetta bilanciata e gustosa per ' + mealLabel + ' con ingredienti comuni italiani.';
  }

  var dietHints = [];
  var dp = (typeof dietProfile !== 'undefined') ? dietProfile : {};
  if (dp.vegetariano)   dietHints.push('vegetariana (no carne, no pesce)');
  if (dp.vegano)        dietHints.push('vegana (no carne, no pesce, no latticini, no uova)');
  if (dp.senzaLattosio) dietHints.push('senza lattosio');
  if (dp.senzaGlutine)  dietHints.push('senza glutine');
  if (Array.isArray(dp.allergenici) && dp.allergenici.length)
    dietHints.push('senza: ' + dp.allergenici.join(', '));
  var dietClause = dietHints.length ? '\n\nVINCOLI DIETA: La ricetta deve essere ' + dietHints.join('; ') + '.' : '';

  /* Prompt ultra-vincolante con filtraggio smart */
  var prompt =
    'Sei uno chef italiano esperto. ' + ingHint + dietClause + '\n\n' +
    'FORMATO OBBLIGATORIO — Restituisci SOLO questo JSON (NO testo prima, NO testo dopo, NO markdown):' +
    '\n\n{\n' +
    '  "name": "Nome ricetta in italiano",\n' +
    '  "icon": "🍝",\n' +
    '  "pasto": "' + _aiRecipeMealKey + '",\n' +
    '  "ingredienti": [\n' +
    '    {"name": "Pasta", "quantity": 100, "unit": "g"},\n' +
    '    {"name": "Pomodoro", "quantity": 200, "unit": "g"},\n' +
    '    {"name": "Basilico", "quantity": 5, "unit": "foglie"}\n' +
    '  ],\n' +
    '  "preparazione": "Cuoci la pasta in acqua salata. Scalda i pomodori in padella. Aggiungi basilico fresco e servi."\n' +
    '}\n\n' +
    'VINCOLI RIGIDI:\n' +
    '✓ Le quantità degli ingredienti devono essere per 1 porzione (una persona).\n' +
    '✓ quantity: sempre NUMERO (mai stringa tipo "100")\n' +
    '✓ unit: solo g, ml, pz, cucchiai, cucchiaino, fette, foglie, spicchi\n' +
    '✓ preparazione: max 300 caratteri, NO JSON annidato\n' +
    '✓ Almeno 3 ingredienti, max 15\n' +
    '✓ ZERO testo fuori dal JSON\n' +
    '✓ NO markdown, NO commenti, NO spiegazioni';

  _geminiCall(prompt, function(text, err) {
    var resultEl = document.getElementById('aiRecipeResult');
    var footerEl = document.getElementById('aiRecipeFooter');
    if (!resultEl || !footerEl) return;

    if (err || !text) {
      /* Errore API o risposta vuota */
      resultEl.innerHTML = '<p style="color:var(--danger);padding:8px 0;">❌ Errore: ' + (err || 'risposta vuota') + '</p>';
      footerEl.innerHTML =
        '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Chiudi</button>' +
        '<button class="btn btn-secondary" onclick="_regenAIRecipe()">Riprova</button>';
      return;
    }

    var recipe;
    try {
      recipe = _parseGeminiRecipe(text);
    } catch(e) {
      console.error('[AI] Errore parsing critico:', e);
      recipe = null;
    }

    /* Validazione ricetta */
    var isValid = recipe && 
                  recipe.name && 
                  typeof recipe.name === 'string' &&
                  recipe.name.trim().length >= 3 &&
                  Array.isArray(recipe.ingredienti) && 
                  recipe.ingredienti.length >= 2;

    if (!isValid) {
      console.warn('[AI] Ricetta non valida, retry:', _aiRetryCount);
      
      /* RETRY AUTOMATICO (1 volta) */
      if (_aiRetryCount < 1) {
        _aiRetryCount++;
        console.log('[AI] Tentativo automatico', _aiRetryCount + 1);
        setTimeout(function() {
          _renderAIStep('loading');
          _runAIGeneration();
        }, 800);
        return;
      }
      
      /* Dopo 2 tentativi: mostra errore dettagliato */
      resultEl.innerHTML =
        '<p style="color:var(--danger);margin-bottom:10px;font-weight:600;">⚠️ Gemini non ha risposto correttamente dopo 2 tentativi.</p>' +
        '<p style="font-size:.85em;color:var(--text-2);margin-bottom:8px;">Prova a rigenerare o seleziona meno ingredienti.</p>' +
        '<details style="font-size:.72em;color:var(--text-3);border:1px solid var(--border);padding:8px;border-radius:6px;max-height:140px;overflow:auto;">' +
          '<summary style="cursor:pointer;font-weight:600;margin-bottom:4px;">🔍 Debug: mostra risposta raw</summary>' +
          '<pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-family:monospace;">' + text.slice(0,800) + '</pre>' +
        '</details>';
      footerEl.innerHTML =
        '<button class="btn btn-secondary" onclick="closeAIRecipeModal()">Chiudi</button>' +
        '<button class="btn btn-secondary" onclick="_regenAIRecipe()">🔄 Riprova</button>';
      return;
    }

    /* Successo! Normalizza e mostra */
    recipe.pasto = recipe.pasto || _aiRecipeMealKey;
    recipe.icon  = recipe.icon  || _mealIconMap[recipe.pasto] || '🍽';
    recipe.isAI  = true;

    console.log('[AI] ✓ Ricetta generata con successo:', recipe.name);
    _aiPendingRecipe = recipe;
    _renderAIStep('result');
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   AZIONI: ACCETTA / RIGENERA / CHIUDI
══════════════════════════════════════════════════════════════════════════════ */
function _regenAIRecipe() {
  _aiPendingRecipe = null;
  _aiRetryCount    = 0;
  _renderAIStep('loading');
  _runAIGeneration();
}

function _acceptAIRecipe() {
  if (!_aiPendingRecipe) return;
  if (typeof aiRecipes === 'undefined') window.aiRecipes = [];

  if (_aiRecipeContext === 'oggi' || _aiRecipeContext === 'oggi_piano') {
    _aiPendingRecipe.subcategory = 'Da piano giornaliero';
  }
  if (_aiRecipeContext === 'dispensa') {
    _aiPendingRecipe.subcategory = 'Da dispensa';
  }

  _aiPendingRecipe.porzioni = 1; /* ricette AI di base per 1 persona */

  var name = _aiPendingRecipe.name || 'Ricetta AI';
  var dup  = aiRecipes.findIndex(function(r){ return (r.name||'').toLowerCase() === name.toLowerCase(); });
  if (dup !== -1) {
    aiRecipes[dup] = _aiPendingRecipe;
  } else {
    _aiPendingRecipe.id = 'ai_' + Date.now();
    aiRecipes.push(_aiPendingRecipe);
  }

  /* Segna come consumata solo se NON da pagina Oggi (da Oggi la ricetta va solo in "Ricette compatibili") */
  var meal = _aiRecipeMealKey || 'pranzo';
  var dateKey = (typeof selectedDateKey !== 'undefined' && selectedDateKey)
    ? selectedDateKey
    : (typeof getCurrentDateKey === 'function' ? getCurrentDateKey() : null);
  if (dateKey && typeof appHistory !== 'undefined' && _aiRecipeContext !== 'oggi' && _aiRecipeContext !== 'oggi_piano') {
    if (!appHistory[dateKey]) appHistory[dateKey] = { usedItems: {}, substitutions: {}, ricette: {} };
    if (!appHistory[dateKey].ricette) appHistory[dateKey].ricette = {};
    if (!appHistory[dateKey].ricette[meal]) appHistory[dateKey].ricette[meal] = {};
    appHistory[dateKey].ricette[meal][name] = true;
  }

  if (typeof saveData         === 'function') saveData();
  closeAIRecipeModal();
  if (typeof showToast        === 'function') showToast('✅ Ricetta "' + name + '" aggiunta a Ricette e a Oggi!', 'success');
  if (typeof renderRicetteGrid  === 'function') renderRicetteGrid();
  if (typeof renderAIRicetteTab === 'function') renderAIRicetteTab();
  if (typeof renderMealItems    === 'function') renderMealItems();
  if (typeof renderPianoRicette === 'function') renderPianoRicette();

  if (_aiRecipeContext !== 'oggi' && _aiRecipeContext !== 'oggi_piano') {
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
  _aiRetryCount    = 0;
}

/* ══════════════════════════════════════════════════════════════════════════════
   SUGGERIMENTI SOSTITUZIONE AI
══════════════════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════════════════
   ANALISI AI STATISTICHE
══════════════════════════════════════════════════════════════════════════════ */
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
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = 'Analisi AI <span class=\"ai-powered-label\">Powered by Gemini</span>'; }
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
  }, { maxOutputTokens: 2500, temperature: 0.5 });
}

/* ══════════════════════════════════════════════════════════════════════════════
   VERIFICA AI PIANO GENERATO
   - Usa solo dati di profilo e piano RIASSUNTI (anonimizzati)
   - Non genera un nuovo piano, ma restituisce solo un giudizio sintetico

   Callback riceve { verified, reason, risk }.
   reason può essere:
   - stringa descrittiva in italiano (dalla risposta API) → mostrabile all'utente
   - "parse_error"   → errore parsing JSON risposta (non mostrare codice)
   - "invalid_format"→ risposta API senza verified boolean (non mostrare codice)
   - "no_response"   → nessun testo restituito (non mostrare codice)
   - messaggio da _geminiCall (es. "API key Gemini non configurata (config.js)")
     → trattare come verifica non disponibile, messaggio umano in piano_gen.js
   - "risk_high" non usato come reason; risk è in res.risk (low|medium|high).
══════════════════════════════════════════════════════════════════════════════ */
function _extractVerifyResponseJson(text) {
  if (!text || typeof text !== 'string') return null;
  var clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  var out = _extractBalancedJson(clean);
  if (out) return out;
  out = _cleanMarkdownJson(clean);
  if (out && out.indexOf('"verified"') !== -1) return out;
  return null;
}

function _parseVerifyResponseFallback(str) {
  if (!str || typeof str !== 'string') return null;
  var verifiedMatch = str.match(/"verified"\s*:\s*(true|false)/i);
  if (!verifiedMatch) return null;
  var verified = verifiedMatch[1].toLowerCase() === 'true';
  var riskMatch = str.match(/"risk"\s*:\s*"(low|medium|high)"/i);
  var risk = riskMatch ? riskMatch[1] : null;
  var reasonMatch = str.match(/"reason"\s*:\s*"((?:[^"\\]|\\.)*)/);
  var reason = reasonMatch ? reasonMatch[1].replace(/\\"/g, '"').trim() : null;
  return { verified: verified, reason: reason || null, risk: risk };
}

function verifyGeneratedPlanWithAI(userProfile, planSummary, callback) {
  if (typeof callback !== 'function') callback = function () {};

  var profile = userProfile || {};
  var plan    = planSummary || {};

  var payload = {
    profile: {
      sex: profile.sex != null ? profile.sex : null,
      age: profile.age != null ? profile.age : null,
      weightKg: profile.weight != null ? profile.weight : null,
      heightCm: profile.height != null ? profile.height : null,
      activity: profile.activity != null ? profile.activity : null,
      goal: profile.goal != null ? profile.goal : null
    },
    plan: plan
  };
  var payloadStr = JSON.stringify(payload);

  if (typeof console !== 'undefined' && console.debug) {
    console.debug('[AI verifica piano] Payload inviato (lunghezza ' + payloadStr.length + '):', payloadStr.substring(0, 300) + (payloadStr.length > 300 ? '…' : ''));
  }

  var prompt =
    'Agisci come nutrizionista esperto. Ti fornisco un profilo sintetico e il riepilogo di un piano alimentare già calcolato.\n' +
    'Il tuo compito è SOLO verificare se, in linea di massima, il piano è coerente con il profilo (distribuzione dei pasti, calorie totali e proporzioni dei macronutrienti), ' +
    'senza proporre un nuovo piano e senza aggiungere dettagli inutili.\n\n' +
    'PROFILO E PIANO (JSON):\n' +
    payloadStr + '\n\n' +
    'RISPOSTA OBBLIGATORIA: restituisci SOLO un JSON con questa forma, senza testo prima o dopo, senza markdown:\n' +
    '{"verified": true o false, "risk": "low" o "medium" o "high", "reason": "breve spiegazione in italiano (max 200 caratteri)"}';

  _geminiCall(prompt, function (text, err) {
    if (err || !text) {
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[AI verifica piano] Errore o vuoto:', (err || 'no_response').substring(0, 80));
      }
      callback({ verified: false, reason: err || 'no_response' });
      return;
    }
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[AI verifica piano] Risposta ricevuta (lunghezza ' + (text ? text.length : 0) + '):', (text || '').substring(0, 350) + ((text && text.length > 350) ? '…' : ''));
    }
    var jsonStr = _extractVerifyResponseJson(text);
    // #region agent log
    fetch('http://127.0.0.1:7877/ingest/d4259ea7-a374-40c6-8a9b-f82b54460446',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c92f53'},body:JSON.stringify({sessionId:'c92f53',location:'gemini.js:verify_after_extract',message:'Verify response extracted',data:{hypothesisId:'H5',responseLength:(text&&text.length)||0,jsonStrLength:(jsonStr&&jsonStr.length)||0,jsonStrPreview:jsonStr?jsonStr.substring(0,180):null},timestamp:Date.now()})}).catch(function(){});
    // #endregion
    if (!jsonStr) {
      try {
        var res = JSON.parse(text.trim());
        if (res && typeof res.verified === 'boolean') {
          callback({ verified: !!res.verified, reason: res.reason || null, risk: res.risk || null });
          return;
        }
      } catch (e) {}
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[AI verifica piano] Impossibile estrarre JSON dalla risposta.');
      }
      callback({ verified: false, reason: 'parse_error' });
      return;
    }
    try {
      var res = JSON.parse(jsonStr);
      if (typeof res.verified !== 'boolean') {
        // #region agent log
        fetch('http://127.0.0.1:7877/ingest/d4259ea7-a374-40c6-8a9b-f82b54460446',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c92f53'},body:JSON.stringify({sessionId:'c92f53',location:'gemini.js:verify_invalid_format',message:'Verified not boolean',data:{hypothesisId:'H4',jsonStrPreview:jsonStr.substring(0,200),hasVerified:res&&('verified'in res),verifiedType:res&&typeof res.verified},timestamp:Date.now()})}).catch(function(){});
        // #endregion
        callback({ verified: false, reason: 'invalid_format' });
        return;
      }
      var out = {
        verified: !!res.verified,
        reason: (res.reason != null && String(res.reason).trim()) ? String(res.reason).trim() : null,
        risk: res.risk || null
      };
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[AI verifica piano] Parsing OK:', JSON.stringify(out));
      }
      callback(out);
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7877/ingest/d4259ea7-a374-40c6-8a9b-f82b54460446',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c92f53'},body:JSON.stringify({sessionId:'c92f53',location:'gemini.js:verify_parse_catch',message:'JSON.parse failed in verify',data:{hypothesisId:'H2',errorMessage:(e&&e.message)||'',jsonStrLength:(jsonStr&&jsonStr.length)||0,jsonStrPreview:(jsonStr&&jsonStr.substring(0,220))||null},timestamp:Date.now()})}).catch(function(){});
      // #endregion
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[AI verifica piano] JSON.parse fallito:', e && e.message);
      }
      var fallback = _parseVerifyResponseFallback(jsonStr || text);
      if (fallback) {
        if (typeof console !== 'undefined' && console.debug) {
          console.debug('[AI verifica piano] Fallback regex OK:', JSON.stringify(fallback));
        }
        callback(fallback);
      } else {
        callback({ verified: false, reason: 'parse_error' });
      }
    }
  }, { maxOutputTokens: 1024, temperature: 0.1 });
}
