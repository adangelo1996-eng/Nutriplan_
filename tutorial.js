/*
   TUTORIAL.JS — v3  Spotlight interattivo + card posizionata dinamicamente
*/

var TUTORIAL_KEY  = 'nutriplan_tutorial_done';
var _tutStep      = 0;
var _tutActive    = false;

var TUTORIAL_STEPS = [
  {
    icon:   '🌿',
    title:  'Benvenuto in NutriPlan!',
    text:   'Il tuo assistente alimentare. Ti mostriamo le sezioni principali in meno di un minuto.',
    page:   null,
    target: null,
    hint:   ''
  },
  {
    icon:   '🍽',
    title:  'Piano alimentare',
    text:   'Tocca un pasto, poi spunta ✅ gli ingredienti consumati. Le quantità si scalano dalla dispensa in automatico.',
    page:   'piano',
    target: '#mealSelector',
    hint:   'Tocca un pasto per iniziare'
  },
  {
    icon:   '📖',
    title:  'Ricette',
    text:   'Sfoglia le ricette ordinate per ingredienti disponibili. Il tasto 🛒 aggiunge alla spesa solo ciò che manca.',
    page:   'ricette',
    target: '#bn-ricette,#st-ricette',
    hint:   'Tocca per aprire le Ricette'
  },
  {
    icon:   '🗄️',
    title:  'Dispensa',
    text:   'Tieni traccia di tutto ciò che hai in casa. Le quantità si aggiornano automaticamente quando consumi.',
    page:   'dispensa',
    target: '#bn-dispensa,#st-dispensa',
    hint:   'Tocca per aprire la Dispensa'
  },
  {
    icon:   '🛒',
    title:  'Lista della Spesa',
    text:   'Genera la spesa dal piano × N giorni o dalle ricette. Spunta gli acquisti per aggiornarela dispensa.',
    page:   'spesa',
    target: '#bn-spesa,#st-spesa',
    hint:   'Tocca per aprire la Spesa'
  },
  {
    icon:   '📊',
    title:  'Statistiche & Storico',
    text:   'Grafici del tuo percorso alimentare e calendario per navigare tra i giorni passati e futuri.',
    page:   'statistiche',
    target: '#bn-stats,#st-stats',
    hint:   'Tocca per aprire le Statistiche'
  },
  {
    icon:   '🎉',
    title:  'Tutto pronto!',
    text:   'Ora imposta il tuo piano alimentare. Puoi riaprire questa guida in qualsiasi momento dal Profilo → Impostazioni.',
    page:   null,
    target: null,
    hint:   ''
  }
];

/* ══════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════ */
function checkTutorial() {
  if (localStorage.getItem(TUTORIAL_KEY)) return;
  setTimeout(startTutorial, 800);
}

function startTutorial() {
  _tutStep   = 0;
  _tutActive = true;
  _createTutElements();
  _renderTutStep();
}

function resetTutorial() {
  localStorage.removeItem(TUTORIAL_KEY);
  _tutStep   = 0;
  _tutActive = true;
  _createTutElements();
  var card = document.getElementById('tutCard');
  var spot = document.getElementById('tutSpotlight');
  var ptr  = document.getElementById('tutPointer');
  if (card) card.style.cssText = '';
  if (spot) spot.style.cssText = '';
  if (ptr)  ptr.style.cssText  = '';
  _renderTutStep();
}

function dismissTutorialForever() {
  localStorage.setItem(TUTORIAL_KEY, '1');
  _endTutorial();
  if (typeof showToast === 'function')
    showToast('Tutorial disattivato — riaprilo dal Profilo → Impostazioni', 'info');
}

/* ══════════════════════════════════════════════════
   DOM CREATION (lazy, una sola volta)
══════════════════════════════════════════════════ */
function _createTutElements() {
  if (document.getElementById('tutCard')) return;

  /* 1 · Spotlight overlay (box-shadow trick) */
  var spot = document.createElement('div');
  spot.id  = 'tutSpotlight';
  document.body.appendChild(spot);

  /* 2 · Animated pointer */
  var ptr = document.createElement('div');
  ptr.id  = 'tutPointer';
  document.body.appendChild(ptr);

  /* 3 · Tutorial card */
  var card = document.createElement('div');
  card.id  = 'tutCard';
  card.innerHTML =
    '<div class="tut-card-top">' +
      '<span id="tutCardIcon"  class="tut-card-icon"></span>' +
      '<span id="tutCardStep"  class="tut-card-step-lbl"></span>' +
      '<button class="tut-card-close" onclick="skipTutorial()" title="Salta">✕</button>' +
    '</div>' +
    '<div id="tutDotsRow" class="tut-dots-mini"></div>' +
    '<h3 id="tutCardTitle" class="tut-card-title"></h3>' +
    '<p  id="tutCardText"  class="tut-card-text"></p>' +
    '<div id="tutCardHint" class="tut-card-hint"></div>' +
    '<div class="tut-card-footer">' +
      '<label id="tutNoShowWrap" class="tut-no-show-wrap" style="display:none">' +
        '<input type="checkbox" id="tutNoShow"> Non mostrare più' +
      '</label>' +
      '<button id="tutNextBtn" class="btn btn-primary btn-small" onclick="nextTutorialStep()">Avanti →</button>' +
    '</div>';
  document.body.appendChild(card);
}

/* ══════════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════════ */
function _renderTutStep() {
  var step = TUTORIAL_STEPS[_tutStep];
  if (!step) { _endTutorial(); return; }

  /* Navigate to page */
  if (step.page && typeof goToPage === 'function') goToPage(step.page);

  var card    = document.getElementById('tutCard');
  var iconEl  = document.getElementById('tutCardIcon');
  var stepEl  = document.getElementById('tutCardStep');
  var titleEl = document.getElementById('tutCardTitle');
  var textEl  = document.getElementById('tutCardText');
  var hintEl  = document.getElementById('tutCardHint');
  var nextBtn = document.getElementById('tutNextBtn');
  var noShow  = document.getElementById('tutNoShowWrap');
  var dotsEl  = document.getElementById('tutDotsRow');

  if (card) card.style.display = 'block';

  if (iconEl)  iconEl.textContent = step.icon || '🌿';
  if (stepEl)  stepEl.textContent = (_tutStep + 1) + ' di ' + TUTORIAL_STEPS.length;
  if (titleEl) titleEl.textContent = step.title;
  if (textEl)  textEl.textContent  = step.text;

  if (hintEl) {
    hintEl.textContent   = step.hint || '';
    hintEl.style.display = step.hint ? 'flex' : 'none';
  }

  var isLast = _tutStep === TUTORIAL_STEPS.length - 1;
  if (nextBtn) nextBtn.textContent = isLast ? '🎉 Inizia!' : 'Avanti →';
  if (noShow)  noShow.style.display = isLast ? '' : 'none';

  if (dotsEl) {
    dotsEl.innerHTML = TUTORIAL_STEPS.map(function(_, i) {
      return '<span class="tut-dot' + (i === _tutStep ? ' active' : '') + '"></span>';
    }).join('');
  }

  /* Position after page renders */
  var delay = step.page ? 240 : 60;
  setTimeout(function() { _positionStep(step); }, delay);
}

/* ══════════════════════════════════════════════════
   POSITIONING  (spotlight + pointer + card)
══════════════════════════════════════════════════ */
function _positionStep(step) {
  var spot = document.getElementById('tutSpotlight');
  var card = document.getElementById('tutCard');
  var ptr  = document.getElementById('tutPointer');
  if (!card) return;

  /* No target → centered card, no spotlight */
  if (!step.target) {
    if (spot) spot.style.cssText = 'display:none;';
    if (ptr)  ptr.style.cssText  = 'display:none;';
    card.style.cssText =
      'display:block;left:50%;top:50%;transform:translate(-50%,-50%);width:320px;max-width:calc(100vw - 32px);bottom:auto;';
    return;
  }

  /* Find target element (try comma-separated selectors) */
  var el   = null;
  var sels = step.target.split(',');
  for (var i = 0; i < sels.length; i++) {
    var found = document.querySelector(sels[i].trim());
    if (found) { el = found; break; }
  }

  if (!el) {
    /* Element not found → bottom-center fallback */
    if (spot) spot.style.cssText = 'display:none;';
    if (ptr)  ptr.style.cssText  = 'display:none;';
    card.style.cssText =
      'display:block;left:50%;bottom:90px;top:auto;transform:translateX(-50%);width:320px;max-width:calc(100vw - 32px);';
    return;
  }

  var rect = el.getBoundingClientRect();
  var pad  = 10;

  /* Spotlight */
  if (spot) {
    spot.style.cssText =
      'display:block;' +
      'left:'   + Math.round(rect.left   - pad) + 'px;' +
      'top:'    + Math.round(rect.top    - pad) + 'px;' +
      'width:'  + Math.round(rect.width  + pad * 2) + 'px;' +
      'height:' + Math.round(rect.height + pad * 2) + 'px;';
  }

  /* Animated pointer: below or above target */
  if (ptr) {
    var ptrTop  = rect.bottom + pad + 6;
    var ptrFlip = false;
    if (ptrTop + 44 > window.innerHeight - 10) {
      ptrTop  = rect.top - pad - 38;
      ptrFlip = true;
    }
    ptr.style.cssText =
      'display:block;' +
      'left:' + Math.round(rect.left + rect.width / 2 - 18) + 'px;' +
      'top:'  + Math.round(ptrTop) + 'px;';
    ptr.innerHTML =
      '<span style="display:inline-block;' + (ptrFlip ? 'transform:scaleY(-1)' : '') + '">👆</span>';
  }

  /* Card position */
  var winH   = window.innerHeight;
  var winW   = window.innerWidth;
  var cardW  = Math.min(320, winW - 32);
  var cardH  = 220;
  var cardTop, cardLeft;

  if (winH - (rect.bottom + pad) >= cardH + 50) {
    /* Below spotlight */
    cardTop = rect.bottom + pad + 16;
  } else if (rect.top - pad >= cardH + 50) {
    /* Above spotlight */
    cardTop = rect.top - pad - cardH - 16;
  } else {
    /* Not enough room — offset to the side / center-ish */
    cardTop = Math.max(80, Math.min(winH - cardH - 16, rect.top));
  }

  cardLeft = Math.round(Math.max(16, Math.min(winW - cardW - 16,
    rect.left + rect.width / 2 - cardW / 2)));

  card.style.cssText =
    'display:block;' +
    'left:'   + cardLeft + 'px;' +
    'top:'    + Math.round(cardTop) + 'px;' +
    'width:'  + cardW + 'px;' +
    'transform:none;bottom:auto;';
}

/* ══════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════ */
function nextTutorialStep() {
  _tutStep++;
  if (_tutStep >= TUTORIAL_STEPS.length) {
    _maybeSuppressTutorial();
    _endTutorial();
    setTimeout(function() {
      if (typeof checkOnboarding === 'function') checkOnboarding();
    }, 400);
  } else {
    _renderTutStep();
  }
}

function skipTutorial() {
  _maybeSuppressTutorial();
  _endTutorial();
  setTimeout(function() {
    if (typeof checkOnboarding === 'function') checkOnboarding();
  }, 400);
}

function _maybeSuppressTutorial() {
  var cb = document.getElementById('tutNoShow');
  if (cb && cb.checked) localStorage.setItem(TUTORIAL_KEY, '1');
}

function _endTutorial() {
  _tutActive = false;
  var spot = document.getElementById('tutSpotlight');
  var card = document.getElementById('tutCard');
  var ptr  = document.getElementById('tutPointer');
  if (spot) spot.style.cssText = 'display:none;';
  if (card) card.style.cssText = 'display:none;';
  if (ptr)  ptr.style.cssText  = 'display:none;';
}

/* Compat alias (called from old HTML) */
function _renderTutorialStep() { _renderTutStep(); }
