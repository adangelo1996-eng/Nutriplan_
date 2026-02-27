/*
   TUTORIAL.JS — v5  Welcome modal al termine tutorial
   - checkpoint "Non mostrare più" visibile su tutti i passi
   - auto-avanzamento quando l'utente compie l'azione indicata
   - welcome modal con azioni rapide alla fine del tutorial (solo se onboarding completato)
*/

var TUTORIAL_KEY  = 'nutriplan_tutorial_done';
var _tutStep      = 0;
var _tutActive    = false;

/* Handler auto-avanzamento corrente */
var _tutAutoEl      = null;
var _tutAutoHandler = null;

/* Ordine allineato alle schede della nav: Oggi → Piano → Dispensa → Ricette → Spesa */
var TUTORIAL_STEPS = [
  {
    icon:   '🌿',
    title:  'Benvenuto in NutriPlan!',
    text:   'Il tuo assistente alimentare. Segui le schede in basso: tocca quella indicata per continuare.',
    page:   null,
    target: null,
    hint:   ''
  },
  {
    icon:   '🍽',
    title:  'Oggi',
    text:   'Qui vedi il piano del giorno. Scegli un pasto e segna gli ingredienti che consumi.',
    page:   'piano',
    target: '#bn-piano,#st-piano',
    hint:   'Tocca la scheda "Oggi" per continuare',
    autoAdvance: true
  },
  {
    icon:   '🌿',
    title:  'Piano alimentare',
    text:   'Imposta gli ingredienti per ogni pasto e i limiti settimanali.',
    page:   'piano-alimentare',
    target: '#bn-piano-alimentare,#st-piano-alimentare',
    hint:   'Tocca la scheda "Piano" per continuare',
    autoAdvance: true
  },
  {
    icon:   '🗄️',
    title:  'Dispensa',
    text:   'Tieni traccia di ciò che hai in casa. Le quantità si aggiornano quando consumi.',
    page:   'dispensa',
    target: '#bn-dispensa,#st-dispensa',
    hint:   'Tocca la scheda "Dispensa" per continuare',
    autoAdvance: true
  },
  {
    icon:   '📖',
    title:  'Ricette',
    text:   'Sfoglia le ricette. Il tasto 🛒 aggiunge alla spesa solo ciò che manca.',
    page:   'ricette',
    target: '#bn-ricette,#st-ricette',
    hint:   'Tocca la scheda "Ricette" per continuare',
    autoAdvance: true
  },
  {
    icon:   '🛒',
    title:  'Lista della spesa',
    text:   'Genera la lista dal piano o dalle ricette. Spunta gli acquisti per aggiornare la dispensa.',
    page:   'spesa',
    target: '#bn-spesa,#st-spesa',
    hint:   'Tocca la scheda "Spesa" per continuare',
    autoAdvance: true
  },
  {
    icon:   '🎉',
    title:  'Tutto pronto!',
    text:   'Ora puoi usare NutriPlan. Riapri questa guida dal Profilo → Impostazioni.',
    page:   null,
    target: null,
    hint:   ''
  }
];

/* Array di passi attivi (tutorial completo o aiuto pagina) */
var _tutSteps = TUTORIAL_STEPS;
/* Modalità corrente: 'global' (tutorial iniziale) o 'page' (aiuto contestuale) */
var _tutMode  = 'global';

/* ══════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════ */
function checkTutorial() {
  if (localStorage.getItem(TUTORIAL_KEY)) return;
  setTimeout(startTutorial, 800);
}

function startTutorial() {
  _tutMode   = 'global';
  _tutSteps  = TUTORIAL_STEPS;
  _tutStep   = 0;
  _tutActive = true;
  _createTutElements();
  _renderTutStep();
}

function resetTutorial() {
  localStorage.removeItem(TUTORIAL_KEY);
  _tutMode   = 'global';
  _tutSteps  = TUTORIAL_STEPS;
  _tutStep   = 0;
  _tutActive = true;
  _clearAutoAdvance();
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
      '<label id="tutNoShowWrap" class="tut-no-show-wrap">' +
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
  var step = _tutSteps[_tutStep];
  if (!step) { _endTutorial(); return; }

  /* Rimuovi listener auto-avanzamento precedente */
  _clearAutoAdvance();

  /* Navigate to page */
  if (step.page && typeof goToPage === 'function') goToPage(step.page);

  var card    = document.getElementById('tutCard');
  var iconEl  = document.getElementById('tutCardIcon');
  var stepEl  = document.getElementById('tutCardStep');
  var titleEl = document.getElementById('tutCardTitle');
  var textEl  = document.getElementById('tutCardText');
  var hintEl  = document.getElementById('tutCardHint');
  var nextBtn = document.getElementById('tutNextBtn');
  var dotsEl  = document.getElementById('tutDotsRow');

  if (card) card.style.display = 'block';

  if (iconEl)  iconEl.textContent = step.icon || '🌿';
  if (stepEl)  stepEl.textContent = (_tutStep + 1) + ' di ' + _tutSteps.length;
  if (titleEl) titleEl.textContent = step.title;
  if (textEl)  textEl.textContent  = step.text;

  if (hintEl) {
    hintEl.textContent   = step.hint || '';
    hintEl.style.display = step.hint ? 'flex' : 'none';
  }

  var isLast = _tutStep === _tutSteps.length - 1;
  if (nextBtn) nextBtn.textContent = isLast ? '🎉 Inizia!' : 'Avanti →';

  if (dotsEl) {
    dotsEl.innerHTML = _tutSteps.map(function(_, i) {
      return '<span class="tut-dot' + (i === _tutStep ? ' active' : '') + '"></span>';
    }).join('');
  }

  /* Position after page renders */
  var delay = step.page ? 240 : 60;
  setTimeout(function() {
    _positionStep(step);
    /* Configura auto-avanzamento dopo posizionamento */
    if (step.autoAdvance && step.target) {
      _setupAutoAdvance(step.target);
    }
  }, delay);
}

/* ══════════════════════════════════════════════════
   AUTO-ADVANCE
══════════════════════════════════════════════════ */
function _clearAutoAdvance() {
  if (_tutAutoEl && _tutAutoHandler) {
    _tutAutoEl.removeEventListener('click', _tutAutoHandler);
    _tutAutoEl      = null;
    _tutAutoHandler = null;
  }
}

function _setupAutoAdvance(targetSelector) {
  /* Trova il primo elemento target VISIBILE disponibile */
  var el   = null;
  var sels = targetSelector.split(',');
  for (var i = 0; i < sels.length; i++) {
    var found = document.querySelector(sels[i].trim());
    if (found) {
      var r = found.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) { el = found; break; }
    }
  }
  /* Fallback: qualsiasi elemento presente */
  if (!el) {
    for (var j = 0; j < sels.length; j++) {
      var fb = document.querySelector(sels[j].trim());
      if (fb) { el = fb; break; }
    }
  }
  if (!el) return;

  _tutAutoEl = el;
  _tutAutoHandler = function() {
    _clearAutoAdvance();
    /* Piccolo ritardo per permettere alla pagina di cambiare prima di avanzare */
    setTimeout(function() {
      if (!_tutActive) return;
      _tutStep++;
      if (_tutStep >= TUTORIAL_STEPS.length) {
        _maybeSuppressTutorial();
        _endTutorial();
      } else {
        _renderTutStep();
      }
    }, 500);
  };
  el.addEventListener('click', _tutAutoHandler);
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

  /* Find first VISIBLE target element (try comma-separated selectors one by one) */
  var el   = null;
  var sels = step.target.split(',');
  /* Pass 1: cerca il primo con dimensioni reali (visibile) */
  for (var i = 0; i < sels.length; i++) {
    var found = document.querySelector(sels[i].trim());
    if (found) {
      var r = found.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) { el = found; break; }
    }
  }
  /* Pass 2: fallback — qualsiasi elemento che esiste nel DOM */
  if (!el) {
    for (var j = 0; j < sels.length; j++) {
      var fb = document.querySelector(sels[j].trim());
      if (fb) { el = fb; break; }
    }
  }

  if (!el) {
    /* Element not found → bottom-center fallback */
    if (spot) spot.style.cssText = 'display:none;';
    if (ptr)  ptr.style.cssText  = 'display:none;';
    card.style.cssText =
      'display:block;left:50%;bottom:90px;top:auto;transform:translateX(-50%);width:320px;max-width:calc(100vw - 32px);';
    return;
  }

  // Assicura che l'elemento target sia visibile nello schermo
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  } catch(e) {}

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
  _clearAutoAdvance();
  _tutStep++;
  if (_tutStep >= _tutSteps.length) {
    _maybeSuppressTutorial();
    _endTutorial();
  } else {
    _renderTutStep();
  }
}

function skipTutorial() {
  _clearAutoAdvance();
  _maybeSuppressTutorial();
  _endTutorial();
}

function _maybeSuppressTutorial() {
  var cb = document.getElementById('tutNoShow');
  if (_tutMode === 'global' && cb && cb.checked) {
    localStorage.setItem(TUTORIAL_KEY, '1');
  }
}

function _endTutorial() {
  _tutActive = false;
  _clearAutoAdvance();
  var spot = document.getElementById('tutSpotlight');
  var card = document.getElementById('tutCard');
  var ptr  = document.getElementById('tutPointer');
  if (spot) spot.style.cssText = 'display:none;';
  if (card) card.style.cssText = 'display:none;';
  if (ptr)  ptr.style.cssText  = 'display:none;';

}

/* ══════════════════════════════════════════════════
   AIUTO CONTESTUALE PER PAGINA
   startPageHelp('piano' | 'dispensa' | 'ricette' | 'spesa' | 'statistiche' | 'profilo' | 'piano-alimentare' | 'piano-gen')
══════════════════════════════════════════════════ */
var TUTORIAL_STEPS_BY_PAGE = {
  'piano': [
    {
      icon:  '🍽',
      title: 'Scegli il pasto',
      text:  'Qui selezioni il pasto che stai gestendo (colazione, pranzo, cena…).',
      page:  'piano',
      target:'#mealSelector',
      hint:  'Tocca un pasto per vedere gli ingredienti relativi.'
    },
    {
      icon:  '🌿',
      title: 'Ingredienti nel piano',
      text:  'Questa sezione mostra gli ingredienti previsti dal piano per il pasto selezionato.',
      page:  'piano',
      target:'#mealItemsWrap',
      hint:  'Da qui puoi segnare consumato, sostituire o aggiungere alla dispensa/spesa.'
    },
    {
      icon:  '📖',
      title: 'Ricette compatibili',
      text:  'Qui trovi le ricette compatibili con il piano e la dispensa per il pasto scelto.',
      page:  'piano',
      target:'#pianoRicetteWrap',
      hint:  'Apri una ricetta per segnare la preparazione e aggiornare la dispensa.'
    }
  ],
  'piano-alimentare': [
    {
      icon:  '🌿',
      title: 'Configura il tuo piano',
      text:  'In questa pagina imposti gli ingredienti per ogni pasto e le categorie nutrizionali.',
      page:  'piano-alimentare',
      target:'#pianoAlimentarePage',
      hint:  'Usa i pulsanti “+” per aggiungere o modificare gli ingredienti.'
    }
  ],
  'piano-gen': [
    {
      icon:  '⚙️',
      title: 'Generatore di piano',
      text:  'Compila i dati (età, peso, obiettivo) per calcolare un piano alimentare su misura.',
      page:  'piano-gen',
      target:'#pianoGenContent',
      hint:  'Segui i passi e conferma per applicare il piano generato.'
    }
  ],
  'dispensa': [
    {
      icon:  '🗄️',
      title: 'Categorie della dispensa',
      text:  'Gli ingredienti sono raggruppati per categoria (carne, latticini, verdure, ecc.).',
      page:  'dispensa',
      target:'#pantryContent',
      hint:  'Puoi espandere/collassare ogni categoria a seconda delle necessità.'
    }
  ],
  'ricette': [
    {
      icon:  '📖',
      title: 'Filtri ricette',
      text:  'Filtra le ricette per pasto, compatibilità e ingredienti extra piano.',
      page:  'ricette',
      target:'#ricetteFilterRow',
      hint:  'Scegli il pasto e il tipo di compatibilità che ti interessa.'
    },
    {
      icon:  '📚',
      title: 'Catalogo e ricette personali',
      text:  'Sfoglia il catalogo o passa alla tab “Le mie” per le tue ricette salvate.',
      page:  'ricette',
      target:'#ricetteGrid',
      hint:  'Apri una card per vedere dettagli e aggiungere al piano o alla spesa.'
    }
  ],
  'spesa': [
    {
      icon:  '🛒',
      title: 'Lista della spesa per categoria',
      text:  'Gli articoli sono raggruppati per categoria come in dispensa.',
      page:  'spesa',
      target:'#spesaContent',
      hint:  'Spunta ciò che hai acquistato per aggiornare facilmente la dispensa.'
    }
  ],
  'statistiche': [
    {
      icon:  '📊',
      title: 'Andamento nel tempo',
      text:  'Qui trovi grafici e riepiloghi delle ultime settimane di utilizzo.',
      page:  'statistiche',
      target:'#statisticheContent',
      hint:  'Usa questi dati per confrontarti con il nutrizionista.'
    }
  ],
  'profilo': [
    {
      icon:  '👤',
      title: 'Dati profilo e accesso',
      text:  'Gestisci account, accesso Google e dati visibili nel tuo profilo.',
      page:  'profilo',
      target:'#profiloPage',
      hint:  'Scorri per trovare vincoli dieta, storico e impostazioni avanzate.'
    }
  ]
};

function startPageHelp(pageKey) {
  if (!pageKey) return;
  var steps = TUTORIAL_STEPS_BY_PAGE[pageKey];
  if (!steps || !steps.length) {
    /* Fallback: se non definito, mostra il tutorial completo */
    startTutorial();
    return;
  }
  _tutMode   = 'page';
  _tutSteps  = steps;
  _tutStep   = 0;
  _tutActive = true;
  _clearAutoAdvance();
  _createTutElements();
  /* Nasconde la checkbox "Non mostrare più" per l'aiuto contestuale */
  var noShowWrap = document.getElementById('tutNoShowWrap');
  if (noShowWrap) noShowWrap.style.display = 'none';
  _renderTutStep();
}

/* Compat alias (called from old HTML) */
function _renderTutorialStep() { _renderTutStep(); }
