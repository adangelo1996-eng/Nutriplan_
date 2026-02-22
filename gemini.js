/* ============================================================
   GEMINI.JS — Integrazione Google Gemini AI
   Features:
   - Generazione ricette dagli ingredienti del pasto o dispensa
   - Suggerimenti intelligenti per sostituzione ingredienti
============================================================ */

function _getGeminiKey() {
  return (window.APP_CONFIG && window.APP_CONFIG.gemini && window.APP_CONFIG.gemini.apiKey) || '';
}

function _geminiCall(prompt, callback) {
  var apiKey = _getGeminiKey();
  if (!apiKey) {
    callback(null, 'API key Gemini non configurata (config.js)');
    return;
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(apiKey);

  var body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1200
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

/* ── Converti markdown semplice in HTML ── */
function _mdToHtml(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^###\s(.+)$/gm, '<h4 class="ai-h4">$1</h4>')
    .replace(/^##\s(.+)$/gm, '<h3 class="ai-h3">$1</h3>')
    .replace(/^#\s(.+)$/gm, '<h2 class="ai-h2">$1</h2>')
    .replace(/^\d+\.\s(.+)$/gm, '<div class="ai-li-num">$&</div>')
    .replace(/^[-•]\s(.+)$/gm, '<div class="ai-li">• $1</div>')
    .replace(/\n\n+/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

/* ══════════════════════════════════════════════════
   GENERA RICETTA
══════════════════════════════════════════════════ */
function openAIRecipeModal(context) {
  var ingredients = [];
  var mealLabel   = '';

  if (context === 'oggi') {
    if (typeof getMealItems === 'function' && typeof selectedMeal !== 'undefined') {
      var items = getMealItems(selectedMeal);
      ingredients = items.map(function(i) { return i.name; });
    }
    var mealLabels = {
      colazione: 'Colazione', spuntino: 'Spuntino',
      pranzo: 'Pranzo', merenda: 'Merenda', cena: 'Cena'
    };
    mealLabel = mealLabels[selectedMeal] || selectedMeal || 'pasto';
  } else if (context === 'dispensa') {
    if (typeof pantryItems !== 'undefined' && pantryItems) {
      Object.keys(pantryItems).forEach(function(k) {
        if (pantryItems[k] && (pantryItems[k].quantity || 0) > 0) ingredients.push(k);
      });
    }
    mealLabel = 'un pasto a tua scelta';
  }

  if (!ingredients.length) {
    if (typeof showToast === 'function') showToast('⚠️ Nessun ingrediente disponibile', 'warning');
    return;
  }

  var modal   = document.getElementById('aiRecipeModal');
  var resultEl = document.getElementById('aiRecipeResult');
  if (!modal || !resultEl) return;

  resultEl.innerHTML =
    '<div class="ai-loading">' +
      '<span class="ai-spinner"></span>' +
      ' Gemini sta creando la tua ricetta…' +
    '</div>';
  modal.classList.add('active');

  var prompt =
    'Sei un nutrizionista e chef italiano. Crea una ricetta sana e gustosa per ' + mealLabel + ' ' +
    'usando PRINCIPALMENTE questi ingredienti: ' + ingredients.join(', ') + '.\n\n' +
    'Struttura la risposta così:\n' +
    '## Nome Ricetta\n' +
    '**Ingredienti** (con quantità)\n' +
    '**Preparazione** (3-5 passi brevi)\n' +
    '**Valori nutrizionali** (kcal, proteine, carboidrati, grassi approssimativi)\n\n' +
    'Rispondi in italiano, tono amichevole, formato conciso.';

  _geminiCall(prompt, function(text, err) {
    if (!resultEl) return;
    if (err || !text) {
      resultEl.innerHTML =
        '<p style="color:var(--danger);padding:12px;">Errore: ' + (err || 'risposta vuota') + '</p>';
      return;
    }
    resultEl.innerHTML = '<div class="ai-recipe-text">' + _mdToHtml(text) + '</div>';
  });
}

function closeAIRecipeModal() {
  var modal = document.getElementById('aiRecipeModal');
  if (modal) modal.classList.remove('active');
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
