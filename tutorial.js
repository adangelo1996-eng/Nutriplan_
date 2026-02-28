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
    setTimeout(function() {
      if (!_tutActive) return;
      _tutStep++;
      if (_tutStep >= _tutSteps.length) {
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
   startPageHelp('casa' | 'piano' | 'dispensa' | ...)
   Limitato alla pagina corrente. Almeno 10 passi per pagina.
══════════════════════════════════════════════════ */
var TUTORIAL_STEPS_BY_PAGE = {
  'casa': [
    { icon: '🏠', title: 'Pagina Casa', text: 'Questa è la tua home nell\'app: uno spazio per il suggerimento del pasto in base all\'ora o a ciò che hai già consumato.', page: 'casa', target: '#page-casa .page-header', hint: 'Leggi il passo e premi Avanti.' },
    { icon: '🕐', title: 'Suggerimento pasto', text: 'L\'etichetta (o la card) indica il pasto consigliato: Colazione, Spuntino, Pranzo, Merenda o Cena.', page: 'casa', target: '#casaContent', hint: 'Il suggerimento dipende dall\'orario o dai pasti già segnati oggi.' },
    { icon: '⏰', title: 'In base all\'ora', text: 'Se non hai ancora segnato consumi oggi, il pasto suggerito segue le fasce orarie: 6-10 Colazione, 10-12 Spuntino, 12-15 Pranzo, 15-17 Merenda, 17-22 Cena.', page: 'casa', target: '#casaContent', hint: 'Dopo le 22 non viene suggerito un pasto specifico.' },
    { icon: '✅', title: 'In base ai consumi', text: 'Se hai già segnato dei pasti (es. Colazione e Pranzo), Casa suggerisce il prossimo della sequenza: Spuntino, Merenda o Cena.', page: 'casa', target: '#casaContent', hint: 'Segna i consumi in Oggi per avere suggerimenti accurati.' },
    { icon: '➡️', title: 'Vai a Oggi', text: 'Il pulsante Vai a Oggi ti porta alla pagina Oggi con il pasto suggerito già selezionato, pronto per segnare ingredienti o scegliere una ricetta.', page: 'casa', target: '#casaContent', hint: 'Premi Avanti per continuare.' },
    { icon: '🎯', title: 'Quando usare Casa', text: 'Apri Casa quando vuoi un promemoria veloce su cosa mangiare adesso, senza cercare tra le schede.', page: 'casa', target: '#page-casa', hint: 'Casa è la prima scheda nel menu.' },
    { icon: '🎉', title: 'Fine guida Casa', text: 'Hai visto tutti gli elementi della pagina Casa. Usa Vai a Oggi per passare subito al pasto suggerito.', page: 'casa', target: '#page-casa', hint: 'Premi Avanti per chiudere.' }
  ],
  'piano': [
    { icon: '🍽', title: 'Pagina Oggi', text: 'Qui gestisci cosa mangi oggi: ingredienti del piano per ogni pasto e ricette compatibili con la dispensa.', page: 'piano', target: '#page-piano .page-header', hint: 'Premi Avanti per il prossimo passo.' },
    { icon: '📅', title: 'Data del giorno', text: 'In alto vedi la data selezionata ("Oggi" o un altro giorno). Puoi cambiare giorno dall\'intestazione scorrevole nell\'header.', page: 'piano', target: '#selectedDateLabel', hint: 'Scorri le date in alto per cambiare giorno.' },
    { icon: '📄', title: 'Esporta PDF', text: 'Il pulsante "Esporta PDF" genera un PDF del piano del giorno per stamparlo o conservarlo.', page: 'piano', target: '#page-piano .page-header-actions', hint: 'Usa questo pulsante quando serve una copia cartacea.' },
    { icon: '🔄', title: 'Reset giorno', text: 'Il pulsante "Reset" azzera tutti i consumi segnati per il giorno corrente. Usalo solo se vuoi ricominciare da zero.', page: 'piano', target: '#page-piano .page-header-actions', hint: 'Attenzione: il reset non si può annullare.' },
    { icon: '🍽', title: 'Selettore pasti', text: 'I pulsanti Colazione, Spuntino, Pranzo, Merenda e Cena servono a scegliere quale pasto stai visualizzando. Il numero indica quanti ingredienti/ricette hai.', page: 'piano', target: '#mealSelector', hint: 'Tocca un pasto per vedere i suoi ingredienti e ricette.' },
    { icon: '🔍', title: 'Cerca ingrediente', text: 'La barra di ricerca filtra gli ingredienti del pasto selezionato. Scrivi il nome per trovare rapidamente un ingrediente.', page: 'piano', target: '#pianoSearchRow', hint: 'Lascia vuoto per vedere tutti gli ingredienti.' },
    { icon: '📖', title: 'Ricette compatibili', text: 'Questa sezione mostra le ricette che puoi fare con gli ingredienti in dispensa per il pasto scelto.', page: 'piano', target: '#pianoRicetteWrap', hint: 'Tocca una ricetta per aprirla e segnarla come preparata.' },
    { icon: '🌿', title: 'Ingredienti nel piano', text: 'Sotto le ricette vedi l\'elenco degli ingredienti previsti dal piano. Ogni riga può essere segnata come consumata o modificata.', page: 'piano', target: '#mealItemsWrap', hint: 'Usa i pulsanti su ogni ingrediente per aggiornare quantità e dispensa.' },
    { icon: '✅', title: 'Segnare consumato', text: 'Quando consumi un ingrediente, segnalo dall\'app: la dispensa si aggiorna e le statistiche restano corrette.', page: 'piano', target: '#mealItemsWrap', hint: 'Cerca il pulsante o l\'azione "consumato" su ogni ingrediente.' },
    { icon: '⚠️', title: 'Ingredienti mancanti', text: 'Se compare un avviso di ingredienti mancanti, aggiungili alla spesa se serve prima di cucinare.', page: 'piano', target: '#pianoMissingWrap', hint: 'Controlla spesso questa sezione.' },
    { icon: '🎉', title: 'Fine guida Oggi', text: 'Hai visto tutti gli elementi della pagina Oggi. Usa i pasti in alto per cambiare pasto.', page: 'piano', target: '#page-piano', hint: 'Premi Avanti per chiudere la guida.' }
  ],
  'piano-alimentare': [
    { icon: '🌿', title: 'Piano alimentare', text: 'Qui definisci gli ingredienti e le quantità per ogni pasto del tuo piano settimanale.', page: 'piano-alimentare', target: '#page-piano-alimentare .page-header', hint: 'Premi Avanti.' },
    { icon: '📋', title: 'Struttura', text: 'Vedrai una sezione per ogni pasto con elenco di ingredienti, quantità e unità.', page: 'piano-alimentare', target: '#pianoAlimentarePage', hint: 'Scorri per vedere tutti i pasti.' },
    { icon: '➕', title: 'Aggiungere ingredienti', text: 'Usa il pulsante Aggiungi accanto a un pasto per inserire un nuovo ingrediente.', page: 'piano-alimentare', target: '#pianoAlimentarePage', hint: 'Ripeti per ogni pasto.' },
    { icon: '✏️', title: 'Modificare quantità', text: "Su ogni ingrediente puoi cambiare quantità e unità. Tocca l'ingrediente per aprire la modifica.", page: 'piano-alimentare', target: '#pianoAlimentarePage', hint: 'Si riflettono su Oggi e spesa.' },
    { icon: '🗑️', title: 'Rimuovere', text: "Rimuovi un ingrediente dall'elenco se non fa più parte del piano.", page: 'piano-alimentare', target: '#pianoAlimentarePage', hint: 'Cerca il pulsante elimina.' },
    { icon: '📊', title: 'Limiti settimanali', text: 'In fondo trovi i limiti settimanali: tetto massimo per categoria.', page: 'piano-alimentare', target: '#pianoAlimentarePage', hint: 'Scorri fino in fondo.' },
    { icon: '🔢', title: 'Valori massimi', text: 'Per ogni limite inserisci il numero massimo di volte a settimana.', page: 'piano-alimentare', target: '#pianoAlimentarePage', hint: 'Lascia vuoto se non vuoi un limite.' },
    { icon: '💾', title: 'Salvataggio', text: 'Le modifiche si salvano automaticamente in locale e sul cloud con account.', page: 'piano-alimentare', target: '#pianoAlimentarePage', hint: 'Controlla lo stato cloud in alto.' },
    { icon: '📱', title: 'Risultato in Oggi', text: 'Gli ingredienti che imposti qui compaiono in Oggi nel giorno e pasto corrispondente.', page: 'piano-alimentare', target: '#pianoAlimentarePage', hint: 'Vai su Oggi per vedere il piano.' },
    { icon: '🎉', title: 'Fine guida Piano', text: 'Hai visto come si configura il piano. Torna qui per cambiare ingredienti o limiti.', page: 'piano-alimentare', target: '#page-piano-alimentare', hint: 'Premi Avanti per chiudere.' }
  ],
  'piano-gen': [
    { icon: '⚙️', title: 'Generatore di piano', text: 'Questa pagina ti guida nella creazione di un piano alimentare su misura (età, peso, obiettivi).', page: 'piano-gen', target: '#page-piano-gen .page-header', hint: 'Premi Avanti.' },
    { icon: '📝', title: 'Compilare i dati', text: 'Inserisci età, peso, altezza, livello di attività. Più sono accurati, più il piano sarà adatto a te.', page: 'piano-gen', target: '#pianoGenContent', hint: 'Compila tutti i campi obbligatori.' },
    { icon: '🎯', title: 'Obiettivi', text: 'Indica l\'obiettivo: mantenimento, perdita di peso, aumento massa. Il generatore adatterà le quantità.', page: 'piano-gen', target: '#pianoGenContent', hint: 'Scegli l\'opzione che ti rappresenta.' },
    { icon: '🚫', title: 'Esclusioni', text: 'Se hai intolleranze o allergie, indicaceli. Il piano generato ne terrà conto.', page: 'piano-gen', target: '#pianoGenContent', hint: 'Controlla la sezione vincoli dieta.' },
    { icon: '▶️', title: 'Avviare la generazione', text: 'Quando hai compilato tutto, premi il pulsante per generare il piano.', page: 'piano-gen', target: '#pianoGenContent', hint: 'Attendi il messaggio di conferma.' },
    { icon: '✅', title: 'Applicare il piano', text: 'Una volta generato, potrai revisionare e applicare. Verrà inserito nel Piano alimentare.', page: 'piano-gen', target: '#pianoGenContent', hint: 'Conferma solo se il riepilogo ti convince.' },
    { icon: '✏️', title: 'Modifiche successive', text: 'Dopo aver applicato puoi andare in Piano e modificare manualmente pasti e ingredienti.', page: 'piano-gen', target: '#pianoGenContent', hint: 'Il generatore è un punto di partenza.' },
    { icon: '🔄', title: 'Rigenerare', text: 'Puoi tornare qui e generare un nuovo piano. Applicare un nuovo piano può sovrascrivere quello attuale.', page: 'piano-gen', target: '#pianoGenContent', hint: 'Salva o esporta prima se ti serve una copia.' },
    { icon: '📱', title: 'Dove trovare il risultato', text: 'Il piano generato apparirà in Piano alimentare e i giorni in Oggi.', page: 'piano-gen', target: '#pianoGenContent', hint: 'Controlla Oggi e Piano dopo l\'applicazione.' },
    { icon: '🎉', title: 'Fine guida Generatore', text: 'Hai visto come funziona il generatore. Usalo per una base da personalizzare.', page: 'piano-gen', target: '#page-piano-gen', hint: 'Premi Avanti per chiudere.' }
  ],
  'dispensa': [
    { icon: '🗄️', title: 'Dispensa', text: 'Qui tieni traccia degli ingredienti che hai in casa: quantità, unità e opzionalmente scadenza.', page: 'dispensa', target: '#page-dispensa .page-header', hint: 'Premi Avanti.' },
    { icon: '➕', title: 'Aggiungi ingrediente', text: 'Il pulsante Aggiungi apre una finestra per inserire nome, categoria, quantità, unità e opzionalmente scadenza.', page: 'dispensa', target: '#page-dispensa .page-header-actions', hint: 'Usa Aggiungi ogni volta che fai la spesa.' },
    { icon: '📁', title: 'Dispensa salvata', text: 'Il pulsante Salvati permette di salvare lo stato attuale della dispensa e ripristinarlo in seguito.', page: 'dispensa', target: '#page-dispensa .page-header-actions', hint: 'Utile per snapshot della dispensa.' },
    { icon: '📷', title: 'Scansiona barcode', text: 'Con Barcode puoi scansionare il codice a barre di un prodotto per aggiungerlo rapidamente alla dispensa.', page: 'dispensa', target: '#page-dispensa .page-header-actions', hint: 'Serve la fotocamera.' },
    { icon: '🔍', title: 'Cerca in dispensa', text: 'La barra di ricerca filtra gli ingredienti per nome o categoria.', page: 'dispensa', target: '#pantrySearch', hint: 'Lascia vuoto per vedere tutta la dispensa.' },
    { icon: '📂', title: 'Categorie', text: 'Gli ingredienti sono raggruppati per categoria. Espandi o chiudi ogni categoria toccando l\'intestazione.', page: 'dispensa', target: '#pantryContent', hint: 'Le categorie aiutano a orientarsi.' },
    { icon: '✏️', title: 'Modificare quantità', text: 'Su ogni ingrediente puoi aggiornare la quantità. Quando consumi da Oggi, le quantità si aggiornano automaticamente.', page: 'dispensa', target: '#pantryContent', hint: 'Tocca l\'ingrediente per modificare.' },
    { icon: '📅', title: 'Scadenza e freezer', text: 'Se hai indicato una data di scadenza, l\'app può mostrarla. Il flag freezer serve per il congelatore.', page: 'dispensa', target: '#pantryContent', hint: 'Compila scadenza quando aggiungi.' },
    { icon: '🛒', title: 'Dispensa e ricette', text: 'Le ricette compatibili in Oggi e Ricette si basano su ciò che hai in dispensa.', page: 'dispensa', target: '#pantryContent', hint: 'Aggiorna dopo ogni spesa o consumo.' },
    { icon: '🎉', title: 'Fine guida Dispensa', text: 'Hai visto come gestire la dispensa. Aggiungi gli acquisti e segna i consumi da Oggi.', page: 'dispensa', target: '#page-dispensa', hint: 'Premi Avanti per chiudere.' }
  ],
  'ricette': [
    { icon: '📖', title: 'Ricette', text: 'Qui trovi il catalogo, le tue ricette salvate e quelle generate con l\'AI. Puoi filtrare, cercare e aggiungere al piano o alla spesa.', page: 'ricette', target: '#page-ricette .page-header', hint: 'Premi Avanti.' },
    { icon: '📑', title: 'Tab Catalogo, Le mie, AI', text: 'Tre tab: Catalogo per le ricette predefinite, Le mie per quelle create o salvate, AI per le ricette generate con l\'intelligenza artificiale.', page: 'ricette', target: '#page-ricette .page-tabs', hint: 'Tocca una tab per cambiare sezione.' },
    { icon: '🔍', title: 'Cerca ricetta', text: 'La barra di ricerca filtra le ricette per nome o ingrediente.', page: 'ricette', target: '#ricetteSearchInput', hint: 'Scrivi almeno qualche lettera per filtrare.' },
    { icon: '📋', title: 'Filtri (Catalogo)', text: 'Nel tab Catalogo puoi filtrare le ricette in base al pasto e ad altri criteri.', page: 'ricette', target: '#ricetteFilterRow', hint: 'Scegli pasto e opzioni che ti interessano.' },
    { icon: '🃏', title: 'Griglia ricette', text: 'Le ricette sono mostrate come card. Tocca una card per aprire il dettaglio: ingredienti, preparazione, pulsanti per spesa o piano.', page: 'ricette', target: '#ricetteGrid', hint: 'Tocca una card per aprire la ricetta.' },
    { icon: '🛒', title: 'Aggiungi alla spesa', text: 'Dal dettaglio ricetta il pulsante spesa aggiunge alla lista solo gli ingredienti che non hai o ne mancano.', page: 'ricette', target: '#ricetteGrid', hint: 'Apri una ricetta e cerca il pulsante spesa.' },
    { icon: '➕', title: 'Le mie ricette', text: 'Nel tab Le mie il pulsante Nuova permette di creare una ricetta personalizzata: nome, pasto, ingredienti e preparazione.', page: 'ricette', target: '#tab-mie', hint: 'Passa al tab Le mie e premi Nuova.' },
    { icon: '🤖', title: 'Ricette AI', text: 'Nel tab AI puoi generare ricette con Google Gemini: descrivi cosa vuoi mangiare o gli ingredienti che hai.', page: 'ricette', target: '#tab-ai', hint: 'Usa Genera nel tab AI.' },
    { icon: '🍽', title: 'Segna come preparata', text: 'Quando prepari una ricetta, da Oggi o da qui puoi segnarla come preparata: le quantità vengono scalate dalla dispensa.', page: 'ricette', target: '#ricetteGrid', hint: 'Apri la ricetta e cerca Segna come preparata.' },
    { icon: '🎉', title: 'Fine guida Ricette', text: 'Hai visto catalogo, filtri, ricette personali e AI. Usa le ricette per pianificare i pasti e aggiornare dispensa e spesa.', page: 'ricette', target: '#page-ricette', hint: 'Premi Avanti per chiudere.' }
  ],
  'spesa': [
    { icon: '🛒', title: 'Lista della spesa', text: 'Qui vedi tutto ciò che devi comprare: dal piano, dalle ricette o aggiunto a mano.', page: 'spesa', target: '#page-spesa .page-header', hint: 'Premi Avanti.' },
    { icon: '➕', title: 'Aggiungi voce', text: 'Il pulsante Aggiungi permette di inserire a mano un articolo: nome, quantità, unità e categoria.', page: 'spesa', target: '#page-spesa .page-header-actions', hint: 'Usa Aggiungi per integrare la lista.' },
    { icon: '📂', title: 'Articoli per categoria', text: 'La lista è organizzata per categoria (come la dispensa). Ogni blocco raggruppa articoli dello stesso tipo.', page: 'spesa', target: '#spesaContent', hint: 'Scorri per vedere tutte le categorie.' },
    { icon: '✅', title: 'Spuntare gli acquisti', text: 'Quando compri un articolo, spunta la casella accanto: puoi indicare la quantità effettiva per aggiornare la dispensa.', page: 'spesa', target: '#spesaContent', hint: 'Spunta per segnare come acquistato.' },
    { icon: '📥', title: 'Aggiornare la dispensa', text: 'Dopo aver spuntato e inserito la quantità acquistata, la dispensa si aggiorna automaticamente.', page: 'spesa', target: '#spesaContent', hint: 'Controlla la dispensa dopo la spesa.' },
    { icon: '📋', title: 'Origine della lista', text: 'La lista può essere generata dal piano (ingredienti previsti ma non in dispensa) e dalle ricette (pulsante spesa dalla ricetta).', page: 'spesa', target: '#spesaContent', hint: 'Aggiungi ricette al piano per popolare la spesa.' },
    { icon: '✏️', title: 'Modificare quantità', text: 'Puoi cambiare quantità o unità di un articolo prima di spuntarlo. Puoi anche rimuovere articoli che non servono più.', page: 'spesa', target: '#spesaContent', hint: 'Tocca l\'articolo per modificare o eliminare.' },
    { icon: '🔄', title: 'Svuotare la lista', text: 'Dopo una spesa completa puoi lasciare la lista con gli articoli spuntati o rimuoverli. La dispensa resta aggiornata.', page: 'spesa', target: '#spesaContent', hint: 'Gestisci la lista come preferisci.' },
    { icon: '📲', title: 'Sincronizzazione', text: 'Se usi l\'account, lista e dispensa si sincronizzano tra dispositivi. Fai la spesa da un dispositivo e vedi aggiornamenti ovunque.', page: 'spesa', target: '#spesaContent', hint: 'Controlla lo stato cloud in header.' },
    { icon: '🎉', title: 'Fine guida Spesa', text: 'Hai visto come usare la lista della spesa. Spunta gli acquisti e inserisci le quantità per tenere la dispensa aggiornata.', page: 'spesa', target: '#page-spesa', hint: 'Premi Avanti per chiudere.' }
  ],
  'statistiche': [
    { icon: '📊', title: 'Statistiche', text: 'Qui trovi grafici e riepiloghi del tuo utilizzo: calorie, macro, pasti consumati e andamento nel tempo.', page: 'statistiche', target: '#page-statistiche .page-header', hint: 'Premi Avanti.' },
    { icon: '📅', title: 'Periodo', text: 'Le statistiche si riferiscono a un periodo (es. ultima settimana o mese). Controlla l\'intestazione per l\'arco temporale.', page: 'statistiche', target: '#statisticheContent', hint: 'Alcune sezioni permettono di cambiare periodo.' },
    { icon: '📈', title: 'Grafici', text: 'I grafici mostrano l\'andamento di calorie o macro nel tempo. Utili per vedere se rispetti il piano.', page: 'statistiche', target: '#statisticheContent', hint: 'Scorri per vedere tutti i grafici.' },
    { icon: '🥗', title: 'Riepilogo pasti', text: 'Puoi vedere come sono distribuiti i pasti (colazione, pranzo, cena) e le categorie di alimenti consumati.', page: 'statistiche', target: '#statisticheContent', hint: 'Usa questi dati per bilanciare la settimana.' },
    { icon: '🎯', title: 'Confronto con limiti', text: 'Se hai impostato limiti settimanali nel Piano alimentare, qui puoi vedere se li rispetti.', page: 'statistiche', target: '#statisticheContent', hint: 'Controlla le sezioni limiti se presenti.' },
    { icon: '💾', title: 'Dati usati', text: 'Le statistiche si basano sui consumi che segni in Oggi e sulle ricette preparate. Più usi l\'app, più i dati sono significativi.', page: 'statistiche', target: '#statisticheContent', hint: 'Segna sempre i consumi per statistiche affidabili.' },
    { icon: '📤', title: 'Esportare', text: 'Per condividere i dati con un professionista, puoi usare Esporta PDF dal Profilo o dagli strumenti di questa pagina.', page: 'statistiche', target: '#statisticheContent', hint: 'Controlla il pulsante PDF in header o Profilo.' },
    { icon: '🔄', title: 'Aggiornamento', text: 'I dati si aggiornano in base ai consumi registrati. Apri di nuovo la pagina dopo aver usato Oggi.', page: 'statistiche', target: '#statisticheContent', hint: 'Le stats riflettono l\'ultimo utilizzo.' },
    { icon: '📱', title: 'Uso regolare', text: 'Per statistiche utili segna i consumi ogni giorno in Oggi e segna le ricette come preparate quando le cucini.', page: 'statistiche', target: '#statisticheContent', hint: 'Più dati inserisci, più le stats sono significative.' },
    { icon: '🎉', title: 'Fine guida Statistiche', text: 'Hai visto come leggere grafici e riepiloghi. Usa questa pagina per monitorare i progressi.', page: 'statistiche', target: '#page-statistiche', hint: 'Premi Avanti per chiudere.' }
  ],
  'profilo': [
    { icon: '👤', title: 'Profilo', text: 'Qui gestisci account, impostazioni, vincoli dieta, storico e preferenze dell\'app.', page: 'profilo', target: '#page-profilo .page-header', hint: 'Premi Avanti.' },
    { icon: '🔐', title: 'Accesso e account', text: 'In cima trovi le informazioni sull\'account (nome, email se loggato con Google) e i pulsanti per accedere o uscire.', page: 'profilo', target: '#profiloPage', hint: 'Scorri per vedere la sezione account.' },
    { icon: '📄', title: 'Esporta PDF', text: 'Il pulsante Esporta PDF in header permette di generare un PDF del piano o del profilo da conservare o inviare.', page: 'profilo', target: '#page-profilo .page-header-actions', hint: 'Usa PDF per stampa o condivisione.' },
    { icon: '🥗', title: 'Vincoli dieta', text: 'Imposta intolleranze, allergie e alimenti da escludere. Influenzano le ricette suggerite e il piano generato.', page: 'profilo', target: '#profiloPage', hint: 'Cerca la sezione Impostazioni o Dieta.' },
    { icon: '📚', title: 'Storico', text: 'Lo storico ti permette di vedere o modificare giorni passati: consumi, piano del giorno e dati già registrati.', page: 'profilo', target: '#profiloPage', hint: 'Apri Storico per modificare un giorno precedente.' },
    { icon: '⚙️', title: 'Impostazioni', text: 'Nelle impostazioni trovi tema (chiaro/scuro), notifiche, unità di misura preferite e altre opzioni.', page: 'profilo', target: '#profiloPage', hint: 'Scorri fino alla sezione Impostazioni.' },
    { icon: '📖', title: 'Riapri la guida', text: 'Da Impostazioni puoi riattivare il tutorial iniziale. Su ogni pagina il pulsante Aiuto riapre la guida contestuale.', page: 'profilo', target: '#profiloPage', hint: 'Cerca Tutorial o Guida nelle impostazioni.' },
    { icon: '🌙', title: 'Tema chiaro/scuro', text: 'L\'app può essere in modalità chiara o scura. La scelta viene salvata e applicata a tutte le pagine.', page: 'profilo', target: '#profiloPage', hint: 'Il toggle tema è in header o in Impostazioni.' },
    { icon: '☁️', title: 'Cloud e backup', text: 'Con l\'account i dati (piano, dispensa, ricette) si salvano sul cloud e sono disponibili su altri dispositivi.', page: 'profilo', target: '#profiloPage', hint: 'Controlla lo stato cloud in header.' },
    { icon: '🎉', title: 'Fine guida Profilo', text: 'Hai visto le principali funzioni del Profilo. Torna qui per account, impostazioni e preferenze.', page: 'profilo', target: '#page-profilo', hint: 'Premi Avanti per chiudere.' }
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
