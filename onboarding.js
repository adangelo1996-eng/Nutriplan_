/*
   ONBOARDING.JS — Inserimento piano alimentare + welcome modal
   Flusso: checkOnboarding() → showOnboarding() → saveOnboardingPlan() → showWelcomeModal()
*/

var ONBOARDING_KEY = 'nutriplan_onboarding_done';

/* ── Suggerimenti rapidi per pasto ── */
var OB_PRESETS = {
  colazione: ['Latte','Yogurt','Uova','Pane','Avena','Muesli','Frutta','Caffè','Burro di arachidi'],
  spuntino:  ['Frutta','Yogurt','Noci','Crackers','Barretta','Frutta secca'],
  pranzo:    ['Pasta','Riso','Pollo','Pesce','Insalata','Legumi','Verdure','Pane'],
  merenda:   ['Frutta','Yogurt','Pane','Crackers','Noci','Budino'],
  cena:      ['Carne','Pesce','Verdure','Legumi','Riso','Pane','Uova','Formaggio']
};

var OB_MEAL_INFO = {
  colazione: { label:'Colazione', emoji:'☀️' },
  spuntino:  { label:'Spuntino',  emoji:'🍎' },
  pranzo:    { label:'Pranzo',    emoji:'🍽' },
  merenda:   { label:'Merenda',   emoji:'🥪' },
  cena:      { label:'Cena',      emoji:'🌙' }
};

var OB_MEAL_ORDER = ['colazione','spuntino','pranzo','merenda','cena'];

var _obMeal = 'colazione';
var _obData = {};   /* { colazione: ['Latte', 'Uova', ...], ... } */

/* ══════════════════════════════════════════════════
   CHECK
══════════════════════════════════════════════════ */
function checkOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY)) return;

  /* Se il piano ha già qualcosa → skip onboarding */
  var hasPlan = false;
  if (typeof mealPlan !== 'undefined' && mealPlan) {
    OB_MEAL_ORDER.forEach(function(mk) {
      var m = mealPlan[mk] || {};
      ['principale','contorno','frutta','extra'].forEach(function(cat) {
        if (Array.isArray(m[cat]) && m[cat].length > 0) hasPlan = true;
      });
    });
  }
  if (hasPlan) { localStorage.setItem(ONBOARDING_KEY, '1'); return; }

  showOnboarding();
}

/* ══════════════════════════════════════════════════
   SHOW
══════════════════════════════════════════════════ */
function showOnboarding() {
  _obData = {};
  _obMeal = 'colazione';
  var overlay = document.getElementById('onboardingOverlay');
  if (!overlay) return;
  overlay.classList.add('active');
  _renderObContent();
}

/* ══════════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════════ */
function _renderObContent() {
  /* Tabs */
  var tabsEl = document.getElementById('obTabs');
  if (tabsEl) {
    tabsEl.innerHTML = OB_MEAL_ORDER.map(function(mk) {
      var info  = OB_MEAL_INFO[mk];
      var count = (_obData[mk] || []).length;
      return (
        '<button class="ob-tab' + (mk === _obMeal ? ' active' : '') + '" ' +
                'onclick="obSelectMeal(\'' + mk + '\')">' +
          info.emoji + ' ' + info.label +
          (count > 0 ? '<span class="ob-tab-badge">' + count + '</span>' : '') +
        '</button>'
      );
    }).join('');
  }

  /* Content */
  var contentEl = document.getElementById('obContent');
  if (!contentEl) return;

  var info    = OB_MEAL_INFO[_obMeal];
  var current = _obData[_obMeal] || [];
  var presets = OB_PRESETS[_obMeal] || [];

  var presetsHtml = presets.map(function(name) {
    var isOn = current.indexOf(name) !== -1;
    return (
      '<button class="ob-chip' + (isOn ? ' on' : '') + '" ' +
              'onclick="obToggle(\'' + _obMeal + '\',this,\'' + name.replace(/'/g, "\\'") + '\')">' +
        (isOn ? '✅ ' : '➕ ') + name +
      '</button>'
    );
  }).join('');

  var addedHtml = current.length
    ? current.map(function(name) {
        return (
          '<span class="ob-added-chip">' + name +
            '<button onclick="obRemove(\'' + _obMeal + '\',\'' + name.replace(/'/g, "\\'") + '\')" ' +
                    'title="Rimuovi">✕</button>' +
          '</span>'
        );
      }).join('')
    : '<span class="ob-empty-note">Nessun alimento aggiunto per ' + info.label.toLowerCase() + '</span>';

  contentEl.innerHTML =
    '<div class="ob-meal-header">' +
      '<span class="ob-meal-emoji">' + info.emoji + '</span>' +
      '<span class="ob-meal-label">' + info.label + '</span>' +
    '</div>' +
    '<div class="ob-section-lbl">Aggiungi rapidamente:</div>' +
    '<div class="ob-presets-wrap">' + presetsHtml + '</div>' +
    '<div class="ob-section-lbl">O scrivi un alimento:</div>' +
    '<div class="ob-custom-row">' +
      '<input id="obCustomInput" class="ob-custom-input" type="text" ' +
             'placeholder="Es. Avocado, Feta, Bresaola…" ' +
             'list="ingredientiAutocomplete" autocomplete="off" ' +
             'onkeydown="if(event.key===\'Enter\')obAddCustom()">' +
      '<button class="btn btn-primary btn-small" onclick="obAddCustom()">➕ Aggiungi</button>' +
    '</div>' +
    '<div class="ob-section-lbl ob-added-lbl">Selezionati:</div>' +
    '<div class="ob-added-wrap">' + addedHtml + '</div>';

  _refreshObSaveBtn();
}

/* ══════════════════════════════════════════════════
   ACTIONS
══════════════════════════════════════════════════ */
function obSelectMeal(mk) {
  _obMeal = mk;
  _renderObContent();
}

function obToggle(mk, btn, name) {
  if (!_obData[mk]) _obData[mk] = [];
  var idx = _obData[mk].indexOf(name);
  if (idx !== -1) {
    _obData[mk].splice(idx, 1);
  } else {
    _obData[mk].push(name);
  }
  _renderObContent();
}

function obRemove(mk, name) {
  if (!_obData[mk]) return;
  _obData[mk] = _obData[mk].filter(function(n) { return n !== name; });
  _renderObContent();
}

function obAddCustom() {
  var inp  = document.getElementById('obCustomInput');
  if (!inp) return;
  var name = inp.value.trim();
  if (!name) return;
  if (!_obData[_obMeal]) _obData[_obMeal] = [];
  if (_obData[_obMeal].indexOf(name) === -1) _obData[_obMeal].push(name);
  inp.value = '';
  _renderObContent();
}

function _refreshObSaveBtn() {
  var total = 0;
  OB_MEAL_ORDER.forEach(function(mk) { total += (_obData[mk] || []).length; });

  var warn = document.getElementById('obWarnEmpty');
  var btn  = document.getElementById('obSaveBtn');
  if (warn) warn.style.display = total === 0 ? '' : 'none';
  if (btn)  btn.disabled       = total === 0;
}

/* ══════════════════════════════════════════════════
   SAVE
══════════════════════════════════════════════════ */
function saveOnboardingPlan() {
  var total = 0;
  OB_MEAL_ORDER.forEach(function(mk) { total += (_obData[mk] || []).length; });

  if (total === 0) {
    if (typeof showToast === 'function') showToast('⚠️ Aggiungi almeno un alimento al piano', 'warning');
    return;
  }

  /* Non-blocking warning per piani minimi */
  if (total < 3) {
    if (typeof showToast === 'function')
      showToast('💡 Piano salvato con pochi alimenti — puoi aggiungerne altri dal Profilo', 'info');
  }

  /* Build mealPlan */
  if (typeof mealPlan === 'undefined') window.mealPlan = {};
  var catMap = ['principale', 'contorno', 'frutta', 'extra'];

  OB_MEAL_ORDER.forEach(function(mk) {
    var foods = _obData[mk] || [];
    if (!foods.length) return;
    if (!mealPlan[mk]) mealPlan[mk] = { principale:[], contorno:[], frutta:[], extra:[] };
    foods.forEach(function(name, idx) {
      var cat = catMap[Math.min(Math.floor(idx / 2), catMap.length - 1)];
      if (!Array.isArray(mealPlan[mk][cat])) mealPlan[mk][cat] = [];
      mealPlan[mk][cat].push({ name: name, quantity: null, unit: 'porzione' });
    });
  });

  if (typeof saveData === 'function') saveData();
  localStorage.setItem(ONBOARDING_KEY, '1');

  /* Close overlay */
  var overlay = document.getElementById('onboardingOverlay');
  if (overlay) overlay.classList.remove('active');

  if (typeof goToPage   === 'function') goToPage('piano');
  if (typeof renderPiano === 'function') renderPiano();

  setTimeout(showWelcomeModal, 500);
}

function obSkip() {
  var total = 0;
  OB_MEAL_ORDER.forEach(function(mk) { total += (_obData[mk] || []).length; });

  /* If they added something, save it */
  if (total > 0) { saveOnboardingPlan(); return; }

  if (!confirm('Puoi configurare il piano in qualsiasi momento dal Profilo.\nContinuare senza piano alimentare?')) return;

  localStorage.setItem(ONBOARDING_KEY, '1');
  var overlay = document.getElementById('onboardingOverlay');
  if (overlay) overlay.classList.remove('active');
  if (typeof goToPage === 'function') goToPage('piano');
  setTimeout(showWelcomeModal, 400);
}

/* ══════════════════════════════════════════════════
   WELCOME MODAL (post-onboarding)
══════════════════════════════════════════════════ */
var WELCOME_AREAS = [
  {
    icon:  '🍽',
    title: 'Piano alimentare',
    desc:  'Il tuo piano è pronto! Seleziona il pasto di oggi e segna gli ingredienti man mano che li consumi.',
    page:  'piano',
    cta:   'Vai al Piano →'
  },
  {
    icon:  '🗄️',
    title: 'Aggiungi alla Dispensa',
    desc:  'Inserisci quello che hai in casa: la app scala le quantità automaticamente ad ogni pasto.',
    page:  'dispensa',
    cta:   'Apri la Dispensa →'
  },
  {
    icon:  '📖',
    title: 'Sfoglia le Ricette',
    desc:  'Trova ricette con gli ingredienti già presenti. Aggiunge alla spesa solo ciò che manca.',
    page:  'ricette',
    cta:   'Esplora le Ricette →'
  },
  {
    icon:  '🛒',
    title: 'Crea la Spesa',
    desc:  'Genera la lista della spesa dal piano × N giorni o dalle ricette che vuoi cucinare questa settimana.',
    page:  'spesa',
    cta:   'Crea la Lista →'
  }
];

function showWelcomeModal() {
  var modal = document.getElementById('welcomeModal');
  if (!modal) return;

  var body = document.getElementById('welcomeModalBody');
  if (body) {
    body.innerHTML = WELCOME_AREAS.map(function(area) {
      return (
        '<div class="welcome-card" onclick="closeWelcomeAndGo(\'' + area.page + '\')">' +
          '<div class="welcome-card-icon">' + area.icon + '</div>' +
          '<div class="welcome-card-title">' + area.title + '</div>' +
          '<div class="welcome-card-desc">'  + area.desc  + '</div>' +
          '<div class="welcome-card-cta">'   + area.cta   + '</div>' +
        '</div>'
      );
    }).join('');
  }

  modal.classList.add('active');
}

function closeWelcomeAndGo(page) {
  closeWelcomeModal();
  if (page && typeof goToPage === 'function') goToPage(page);
}

function closeWelcomeModal() {
  var modal = document.getElementById('welcomeModal');
  if (modal) modal.classList.remove('active');
}
