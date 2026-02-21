/*
   TUTORIAL.JS — NutriPlan Interactive Tutorial
*/

var TUTORIAL_KEY   = 'nutriplan_tutorial_done';
var _tutorialStep  = 0;
var _tutorialActive = false;

var TUTORIAL_STEPS = [
  {
    title: '🌿 Benvenuto in NutriPlan!',
    text:  'NutriPlan ti aiuta a gestire il piano alimentare, la dispensa e la lista della spesa — tutto in un\'unico posto. Questo tour ti guida in pochi passi. Puoi saltarlo in qualsiasi momento.',
    page:  null,
    icon:  '🌿'
  },
  {
    title: '🍽 Il Piano Alimentare',
    text:  'Dal Profilo puoi impostare gli alimenti previsti per ogni pasto (colazione, pranzo, cena…). Tornato nel Piano, seleziona il pasto e spunta ✅ gli ingredienti consumati: vengono scalati dalla dispensa e registrati nello storico automaticamente.',
    page:  'piano',
    icon:  '🏠'
  },
  {
    title: '📖 Le Ricette',
    text:  'Nella sezione Ricette trovi tutte le ricette ordinate per disponibilità degli ingredienti. Apri una ricetta per vedere i dettagli, poi usa il tasto "🛒 Spesa" per aggiungere alla lista solo gli ingredienti mancanti, o "✅ Piano" per inserirla nel piano.',
    page:  'ricette',
    icon:  '📖'
  },
  {
    title: '🗄️ La Dispensa',
    text:  'La Dispensa tiene traccia di tutto quello che hai in casa. Aggiungi ingredienti con ➕, specifica categoria e quantità. Le quantità si scalano automaticamente quando consumi alimenti o scegli ricette.',
    page:  'dispensa',
    icon:  '🗄️'
  },
  {
    title: '🛒 La Lista della Spesa',
    text:  'Genera la spesa automaticamente dal piano alimentare × N giorni, oppure seleziona le ricette che vuoi cucinare. Spunta gli acquisti: la quantità viene sommata alla dispensa con la categoria corretta.',
    page:  'spesa',
    icon:  '🛒'
  },
  {
    title: '📊 Statistiche e Storico',
    text:  'Nella sezione Stats trovi i grafici dei tuoi pasti e dell\'uso degli ingredienti. Lo Storico — visibile nel Profilo — registra ogni ingrediente consumato e ricetta scelta. Usa il calendario in cima al Piano per navigare tra i giorni.',
    page:  'statistiche',
    icon:  '📊'
  },
  {
    title: '✅ Tutto pronto!',
    text:  'Inizia impostando il piano alimentare nel Profilo, poi aggiungi i tuoi ingredienti alla Dispensa. Puoi riaprire questa guida in qualsiasi momento dalle Impostazioni nel Profilo.',
    page:  'profilo',
    icon:  '🎉'
  }
];

/* ── INIT: controlla se mostrare tutorial all'avvio ── */
function checkTutorial() {
  if (localStorage.getItem(TUTORIAL_KEY)) return;
  setTimeout(startTutorial, 1200);
}

function startTutorial() {
  _tutorialStep  = 0;
  _tutorialActive = true;
  _renderTutorialStep();
}

function _renderTutorialStep() {
  var step  = TUTORIAL_STEPS[_tutorialStep];
  if (!step) { _endTutorial(); return; }

  /* Naviga alla pagina del tutorial */
  if (step.page && typeof goToPage === 'function') goToPage(step.page);

  /* Aggiorna contenuto modal */
  var modal = document.getElementById('tutorialModal');
  if (!modal) return;

  var iconEl  = document.getElementById('tutorialIcon');
  var titleEl = document.getElementById('tutorialTitle');
  var textEl  = document.getElementById('tutorialText');
  var dotsEl  = document.getElementById('tutorialDots');
  var nextBtn = document.getElementById('tutorialNextBtn');
  var skipBtn = document.getElementById('tutorialSkipBtn');
  var noShow  = document.getElementById('tutorialNoShowWrap');

  if (iconEl)  iconEl.textContent  = step.icon;
  if (titleEl) titleEl.textContent = step.title;
  if (textEl)  textEl.textContent  = step.text;

  /* Progress dots */
  if (dotsEl) {
    dotsEl.innerHTML = TUTORIAL_STEPS.map(function(_, i) {
      return '<span class="tut-dot' + (i === _tutorialStep ? ' active' : '') + '"></span>';
    }).join('');
  }

  var isLast = _tutorialStep === TUTORIAL_STEPS.length - 1;
  if (nextBtn) nextBtn.textContent = isLast ? '🎉 Inizia!' : 'Avanti →';
  if (skipBtn) skipBtn.style.display = isLast ? 'none' : '';
  if (noShow)  noShow.style.display  = isLast ? '' : 'none';

  /* Counter testo */
  var counter = document.getElementById('tutorialCounter');
  if (counter) counter.textContent = (_tutorialStep + 1) + ' / ' + TUTORIAL_STEPS.length;

  modal.classList.add('active');
}

function nextTutorialStep() {
  _tutorialStep++;
  if (_tutorialStep >= TUTORIAL_STEPS.length) {
    _maybeSuppressTutorial();
    _endTutorial();
  } else {
    _renderTutorialStep();
  }
}

function skipTutorial() {
  _maybeSuppressTutorial();
  _endTutorial();
}

function _maybeSuppressTutorial() {
  var cb = document.getElementById('tutorialNoShow');
  if (cb && cb.checked) {
    localStorage.setItem(TUTORIAL_KEY, '1');
    if (typeof showToast === 'function') showToast('Tutorial disattivato — riaprilo dal Profilo → Impostazioni', 'info');
  }
}

function _endTutorial() {
  _tutorialActive = false;
  var modal = document.getElementById('tutorialModal');
  if (modal) modal.classList.remove('active');
}

/* Chiamato dal bottone "Non mostrare più" standalone (skip definitivo) */
function dismissTutorialForever() {
  localStorage.setItem(TUTORIAL_KEY, '1');
  _endTutorial();
  if (typeof showToast === 'function') showToast('Tutorial disattivato — riaprilo dal Profilo → Impostazioni', 'info');
}

/* Chiamato dalle Impostazioni: ripristina tutorial */
function resetTutorial() {
  localStorage.removeItem(TUTORIAL_KEY);
  startTutorial();
}
