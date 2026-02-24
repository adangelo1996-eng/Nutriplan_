/*
   ONBOARDING.JS — Multi-Step Wizard con Progress Bar
   Flusso: Step 1 (Pasti) → Step 2 (Limiti) → Step 3 (Review) → Save
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

/* Voci limiti settimanali */
var OB_LIMITI = [
  { key:'carne',    label:'Carne',    emoji:'🥩', unit:'volte/sett.' },
  { key:'pesce',    label:'Pesce',    emoji:'🐟', unit:'volte/sett.' },
  { key:'uova',     label:'Uova',     emoji:'🥚', unit:'volte/sett.' },
  { key:'latticini',label:'Latticini',emoji:'🥛', unit:'volte/sett.' },
  { key:'legumi',   label:'Legumi',   emoji:'🌱', unit:'volte/sett.' },
  { key:'cereali',  label:'Cereali',  emoji:'🌾', unit:'porzioni/g'  },
  { key:'frutta',   label:'Frutta',   emoji:'🍎', unit:'pz/gg'       },
  { key:'verdura',  label:'Verdura',  emoji:'🥦', unit:'porzioni/gg' }
];

/* Stato wizard */
var _obCurrentStep = 1;
var _obMeal = 'colazione';
var _obData = {};   /* { colazione: ['Latte', 'Uova', ...], ... } */

/* ══════════════════════════════════════════════════
   CHECK
══════════════════════════════════════════════════ */
function checkOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY)) {
    /* Onboarding già fatto → avvia tutorial */
    setTimeout(function() {
      if (typeof checkTutorial === 'function') checkTutorial();
    }, 300);
    return;
  }

  /* Se il piano ha già qualcosa → skip onboarding */
  var hasPlan = false;
  if (typeof pianoAlimentare !== 'undefined' && pianoAlimentare) {
    OB_MEAL_ORDER.forEach(function(mk) {
      var m = pianoAlimentare[mk] || {};
      Object.keys(m).forEach(function(cat) {
        if (Array.isArray(m[cat]) && m[cat].length > 0) hasPlan = true;
      });
    });
  }
  if (hasPlan) {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setTimeout(function() {
      if (typeof checkTutorial === 'function') checkTutorial();
    }, 300);
    return;
  }

  showOnboarding();
}

/* ══════════════════════════════════════════════════
   SHOW
══════════════════════════════════════════════════ */
function showOnboarding() {
  _obData = {};
  _obMeal = 'colazione';
  _obCurrentStep = 1;
  var overlay = document.getElementById('onboardingOverlay');
  if (!overlay) return;
  overlay.classList.add('active');
  _renderObStep();
}

/* ══════════════════════════════════════════════════
   RENDER STEP
══════════════════════════════════════════════════ */
function _renderObStep() {
  _updateObHeader();
  _updateObProgress();
  
  if (_obCurrentStep === 1) {
    _renderStep1Meals();
  } else if (_obCurrentStep === 2) {
    _renderStep2Limits();
  } else if (_obCurrentStep === 3) {
    _renderStep3Review();
  }
  
  _updateObFooter();
}

/* ══════════════════════════════════════════════════
   HEADER & PROGRESS
══════════════════════════════════════════════════ */
function _updateObHeader() {
  var header = document.querySelector('.onboarding-header');
  if (!header) return;
  
  var stepLabel = header.querySelector('.onboarding-step-label');
  var title = header.querySelector('.onboarding-title');
  var sub = header.querySelector('.onboarding-sub');
  
  if (_obCurrentStep === 1) {
    stepLabel.textContent = 'Passo 1 di 3';
    title.innerHTML = '🍽 Cosa mangi di solito?';
    sub.textContent = 'Seleziona gli alimenti tipici per ogni pasto. Puoi modificarli in seguito.';
  } else if (_obCurrentStep === 2) {
    stepLabel.textContent = 'Passo 2 di 3';
    title.innerHTML = '📊 Imposta i limiti (opzionale)';
    sub.textContent = 'Indica quante volte a settimana vuoi consumare certi alimenti. Puoi saltare questo passaggio.';
  } else if (_obCurrentStep === 3) {
    stepLabel.textContent = 'Passo 3 di 3';
    title.innerHTML = '✅ Riepilogo finale';
    sub.textContent = 'Controlla il tuo piano prima di salvarlo. Tutto pronto?';
  }
}

function _updateObProgress() {
  var container = document.querySelector('.ob-content');
  if (!container) return;
  
  var progressHtml = 
    '<div class="wizard-progress" style="margin-bottom:20px;">' +
      '<span class="wizard-progress-dot ' + (_obCurrentStep >= 1 ? 'active' : '') + '"></span>' +
      '<span class="wizard-progress-dot ' + (_obCurrentStep >= 2 ? 'active' : '') + '"></span>' +
      '<span class="wizard-progress-dot ' + (_obCurrentStep >= 3 ? 'active' : '') + '"></span>' +
    '</div>';
  
  // Inserisco all'inizio del contenuto
  if (container.querySelector('.wizard-progress')) {
    container.querySelector('.wizard-progress').outerHTML = progressHtml;
  } else {
    container.insertAdjacentHTML('afterbegin', progressHtml);
  }
}

/* ══════════════════════════════════════════════════
   STEP 1 - PASTI
══════════════════════════════════════════════════ */
function _renderStep1Meals() {
  // Nascondi sezione limiti
  var limitiSection = document.getElementById('obLimitiSection');
  if (limitiSection) limitiSection.style.display = 'none';
  
  _renderObTabs();
  _renderObMealContent();
}

function _renderObTabs() {
  var tabsEl = document.getElementById('obTabs');
  if (!tabsEl) return;
  
  tabsEl.style.display = 'flex';
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

function _renderObMealContent() {
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
    '<div class="wizard-progress"></div>' +
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
    
  _updateObProgress();
}

/* ══════════════════════════════════════════════════
   STEP 2 - LIMITI
══════════════════════════════════════════════════ */
function _renderStep2Limits() {
  // Nascondi tabs pasti
  var tabsEl = document.getElementById('obTabs');
  if (tabsEl) tabsEl.style.display = 'none';
  
  var contentEl = document.getElementById('obContent');
  if (!contentEl) return;
  
  var currentLimits = (typeof weeklyLimits !== 'undefined') ? (weeklyLimits || {}) : {};

  var rows = OB_LIMITI.map(function(it) {
    var val = (currentLimits[it.key] !== undefined && currentLimits[it.key] !== '') ? currentLimits[it.key] : '';
    return (
      '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<span style="font-size:1.3em;width:28px;text-align:center;">' + it.emoji + '</span>' +
        '<span style="flex:1;font-size:.92em;font-weight:600;">' + it.label + '</span>' +
        '<span style="font-size:.74em;color:var(--text-3);margin-right:6px;">' + it.unit + '</span>' +
        '<input type="number" min="0" step="1" value="' + val + '" ' +
               'placeholder="—" ' +
               'onchange="obSaveLimit(\'' + it.key + '\',this.value)" ' +
               'style="width:64px;text-align:center;padding:6px 8px;border:1.5px solid var(--border);' +
                      'border-radius:var(--r-md);background:var(--bg);color:var(--text);font-size:.9em;">' +
      '</div>'
    );
  }).join('');

  contentEl.innerHTML =
    '<div class="wizard-progress"></div>' +
    '<div class="ob-limiti-wrap">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
        '<span style="font-size:1.3em;">📊</span>' +
        '<span style="font-weight:700;font-size:1rem;">Limiti settimanali</span>' +
        '<span style="font-size:.76em;color:var(--text-3);background:var(--bg-subtle);' +
               'border:1px solid var(--border);border-radius:99px;padding:2px 10px;margin-left:4px;">opzionali</span>' +
      '</div>' +
      '<p style="font-size:.84em;color:var(--text-3);margin-bottom:14px;line-height:1.5;">' +
        'Imposta quante volte a settimana vuoi consumare certi alimenti. Puoi saltare e impostare in seguito.' +
      '</p>' +
      rows +
    '</div>';
    
  _updateObProgress();
}

function obSaveLimit(key, val) {
  if (typeof weeklyLimits === 'undefined') window.weeklyLimits = {};
  var num = parseFloat(val);
  if (!isNaN(num) && num >= 0) {
    weeklyLimits[key] = num;
  } else {
    delete weeklyLimits[key];
  }
}

/* ══════════════════════════════════════════════════
   STEP 3 - REVIEW
══════════════════════════════════════════════════ */
function _renderStep3Review() {
  // Nascondi tabs
  var tabsEl = document.getElementById('obTabs');
  if (tabsEl) tabsEl.style.display = 'none';
  
  var contentEl = document.getElementById('obContent');
  if (!contentEl) return;
  
  var totalItems = 0;
  OB_MEAL_ORDER.forEach(function(mk) {
    totalItems += (_obData[mk] || []).length;
  });
  
  var mealsHtml = OB_MEAL_ORDER.map(function(mk) {
    var info = OB_MEAL_INFO[mk];
    var items = _obData[mk] || [];
    
    if (items.length === 0) {
      return (
        '<div class="wiz-review-meal">' +
          '<div class="wiz-review-meal-header">' +
            '<span>' + info.emoji + ' ' + info.label + '</span>' +
            '<span class="wiz-review-count" style="color:var(--text-3);">Nessun alimento</span>' +
          '</div>' +
        '</div>'
      );
    }
    
    var chipsHtml = items.map(function(name) {
      return '<span class="wiz-review-ing-chip">' + name + '</span>';
    }).join('');
    
    return (
      '<div class="wiz-review-meal">' +
        '<div class="wiz-review-meal-header">' +
          '<span>' + info.emoji + ' ' + info.label + '</span>' +
          '<span class="wiz-review-count">' + items.length + ' aliment' + (items.length === 1 ? 'o' : 'i') + '</span>' +
        '</div>' +
        '<div class="wiz-review-ings">' + chipsHtml + '</div>' +
      '</div>'
    );
  }).join('');
  
  // Limiti settati
  var limitsHtml = '';
  var hasLimits = false;
  if (typeof weeklyLimits !== 'undefined' && weeklyLimits) {
    var limitsList = OB_LIMITI.filter(function(it) {
      return weeklyLimits[it.key] !== undefined && weeklyLimits[it.key] !== '';
    }).map(function(it) {
      return '<li>' + it.emoji + ' ' + it.label + ': <strong>' + weeklyLimits[it.key] + '</strong> ' + it.unit + '</li>';
    });
    
    if (limitsList.length > 0) {
      hasLimits = true;
      limitsHtml = 
        '<div style="background:var(--bg-subtle);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:14px 16px;margin-top:16px;">' +
          '<div style="font-weight:700;font-size:.92em;margin-bottom:8px;">📊 Limiti settimanali</div>' +
          '<ul style="margin:0;padding-left:20px;font-size:.85em;line-height:1.8;">' +
            limitsList.join('') +
          '</ul>' +
        '</div>';
    }
  }
  
  contentEl.innerHTML =
    '<div class="wizard-progress"></div>' +
    '<p class="wiz-review-intro">' +
      '🎉 Ottimo lavoro! Hai inserito <strong>' + totalItems + ' alimenti</strong> nel tuo piano alimentare.' +
      (hasLimits ? ' Hai anche impostato alcuni limiti settimanali.' : '') +
      '<br><br>Rivedi il riepilogo e salva quando sei pronto.' +
    '</p>' +
    mealsHtml +
    limitsHtml;
    
  _updateObProgress();
}

/* ══════════════════════════════════════════════════
   FOOTER & NAVIGATION
══════════════════════════════════════════════════ */
function _updateObFooter() {
  var footer = document.querySelector('.onboarding-footer');
  if (!footer) return;
  
  var warnEmpty = document.getElementById('obWarnEmpty');
  var actionsContainer = footer.querySelector('.onboarding-footer-actions');
  
  // Controllo se ci sono alimenti
  var hasItems = false;
  OB_MEAL_ORDER.forEach(function(mk) {
    if ((_obData[mk] || []).length > 0) hasItems = true;
  });
  
  if (_obCurrentStep === 1) {
    // Step 1: Mostra warning se vuoto
    if (warnEmpty) {
      warnEmpty.style.display = hasItems ? 'none' : 'block';
    }
    
    actionsContainer.innerHTML =
      '<button class="btn btn-secondary" onclick="obSkip()">Salta per ora</button>' +
      '<button class="btn btn-primary" onclick="obNextStep()" ' + (hasItems ? '' : 'disabled') + '>' +
        'Avanti →' +
      '</button>';
      
  } else if (_obCurrentStep === 2) {
    // Step 2: Sempre abilitato (limiti opzionali)
    if (warnEmpty) warnEmpty.style.display = 'none';
    
    actionsContainer.innerHTML =
      '<button class="btn btn-secondary" onclick="obPrevStep()">← Indietro</button>' +
      '<button class="btn btn-secondary" onclick="obSkipLimits()">Salta limiti</button>' +
      '<button class="btn btn-primary" onclick="obNextStep()">Avanti →</button>';
      
  } else if (_obCurrentStep === 3) {
    // Step 3: Review finale
    if (warnEmpty) warnEmpty.style.display = 'none';
    
    actionsContainer.innerHTML =
      '<button class="btn btn-secondary" onclick="obPrevStep()">← Indietro</button>' +
      '<button class="btn btn-primary" onclick="saveOnboardingPlan()">' +
        '💾 Salva e inizia!' +
      '</button>';
  }
}

function obNextStep() {
  if (_obCurrentStep < 3) {
    _obCurrentStep++;
    _renderObStep();
    
    // Scroll to top
    var content = document.querySelector('.ob-content');
    if (content) content.scrollTop = 0;
  }
}

function obPrevStep() {
  if (_obCurrentStep > 1) {
    _obCurrentStep--;
    _renderObStep();
    
    // Scroll to top
    var content = document.querySelector('.ob-content');
    if (content) content.scrollTop = 0;
  }
}

function obSkipLimits() {
  // Salta lo step dei limiti
  _obCurrentStep = 3;
  _renderObStep();
}

/* ══════════════════════════════════════════════════
   ACTIONS - PASTI
══════════════════════════════════════════════════ */
function obSelectMeal(mk) {
  _obMeal = mk;
  _renderObMealContent();
}

function obToggle(mk, btn, name) {
  if (!_obData[mk]) _obData[mk] = [];
  var idx = _obData[mk].indexOf(name);
  if (idx !== -1) {
    _obData[mk].splice(idx, 1);
  } else {
    _obData[mk].push(name);
  }
  _renderObMealContent();
  _updateObFooter();
}

function obRemove(mk, name) {
  if (!_obData[mk]) return;
  _obData[mk] = _obData[mk].filter(function(n) { return n !== name; });
  _renderObMealContent();
  _updateObFooter();
}

function obAddCustom() {
  var inp  = document.getElementById('obCustomInput');
  if (!inp) return;
  var name = inp.value.trim();
  if (!name) return;
  if (!_obData[_obMeal]) _obData[_obMeal] = [];
  if (_obData[_obMeal].indexOf(name) === -1) _obData[_obMeal].push(name);
  inp.value = '';
  _renderObMealContent();
  _updateObFooter();
}

/* ══════════════════════════════════════════════════
   SAVE & SKIP
══════════════════════════════════════════════════ */
function saveOnboardingPlan() {
  /* Salva piano alimentare */
  if (typeof pianoAlimentare === 'undefined') window.pianoAlimentare = {};
  
  OB_MEAL_ORDER.forEach(function(mk) {
    var items = _obData[mk] || [];
    if (items.length === 0) return;
    
    if (!pianoAlimentare[mk]) pianoAlimentare[mk] = {};
    
    items.forEach(function(name) {
      var cat = _getCategoryForIngredient(name);
      if (!pianoAlimentare[mk][cat]) pianoAlimentare[mk][cat] = [];
      
      var exists = pianoAlimentare[mk][cat].some(function(ing) {
        return ing.name === name;
      });
      
      if (!exists) {
        pianoAlimentare[mk][cat].push({
          name: name,
          qty: '',
          unit: 'g',
          alternatives: []
        });
      }
    });
  });
  
  /* Salva localmente */
  if (typeof savePianoAlimentare === 'function') savePianoAlimentare();
  
  /* Segna onboarding completato */
  localStorage.setItem(ONBOARDING_KEY, '1');
  
  /* Chiudi overlay */
  var overlay = document.getElementById('onboardingOverlay');
  if (overlay) overlay.classList.remove('active');
  
  /* Mostra welcome modal */
  setTimeout(function() {
    showWelcomeModal();
  }, 300);
}

function obSkip() {
  if (!confirm('Vuoi davvero saltare la configurazione iniziale? Potrai creare il piano in seguito dalla sezione Profilo.')) {
    return;
  }
  
  localStorage.setItem(ONBOARDING_KEY, '1');
  var overlay = document.getElementById('onboardingOverlay');
  if (overlay) overlay.classList.remove('active');
  
  setTimeout(function() {
    if (typeof checkTutorial === 'function') checkTutorial();
  }, 300);
}

/* ══════════════════════════════════════════════════
   WELCOME MODAL
══════════════════════════════════════════════════ */
function showWelcomeModal() {
  var modal = document.getElementById('welcomeModal');
  if (!modal) return;
  
  var body = document.getElementById('welcomeModalBody');
  if (!body) return;
  
  body.innerHTML = 
    '<div class="welcome-card" onclick="closeWelcomeModal();goToPage(\'dispensa\')">' +
      '<span class="welcome-card-icon">🗄️</span>' +
      '<div class="welcome-card-title">Riempi la dispensa</div>' +
      '<div class="welcome-card-desc">Aggiungi gli ingredienti che hai a disposizione</div>' +
      '<div class="welcome-card-cta">Vai alla dispensa →</div>' +
    '</div>' +
    '<div class="welcome-card" onclick="closeWelcomeModal();goToPage(\'ricette\')">' +
      '<span class="welcome-card-icon">📖</span>' +
      '<div class="welcome-card-title">Esplora le ricette</div>' +
      '<div class="welcome-card-desc">Scopri cosa puoi cucinare con i tuoi ingredienti</div>' +
      '<div class="welcome-card-cta">Vedi ricette →</div>' +
    '</div>' +
    '<div class="welcome-card" onclick="closeWelcomeModal();goToPage(\'piano\')">' +
      '<span class="welcome-card-icon">🍽</span>' +
      '<div class="welcome-card-title">Organizza oggi</div>' +
      '<div class="welcome-card-desc">Pianifica i pasti di oggi dal tuo piano</div>' +
      '<div class="welcome-card-cta">Vai a oggi →</div>' +
    '</div>' +
    '<div class="welcome-card" onclick="closeWelcomeModal();goToPage(\'profilo\')">' +
      '<span class="welcome-card-icon">📊</span>' +
      '<div class="welcome-card-title">Personalizza</div>' +
      '<div class="welcome-card-desc">Modifica il piano e imposta obiettivi</div>' +
      '<div class="welcome-card-cta">Vai al profilo →</div>' +
    '</div>';
  
  modal.classList.add('active');
  
  // Avvia tutorial dopo chiusura
  setTimeout(function() {
    if (typeof checkTutorial === 'function') checkTutorial();
  }, 500);
}

function closeWelcomeModal() {
  var modal = document.getElementById('welcomeModal');
  if (modal) modal.classList.remove('active');
}

/* ══════════════════════════════════════════════════
   HELPER
══════════════════════════════════════════════════ */
function _getCategoryForIngredient(name) {
  var lowerName = name.toLowerCase();
  
  if (/carne|pollo|manzo|maiale|tacchino|vitello|agnello/.test(lowerName)) return '🥩 Carne';
  if (/pesce|salmone|tonno|merluzzo|orata|branzino/.test(lowerName)) return '🐟 Pesce';
  if (/latte|yogurt|formaggio|mozzarella|parmigiano|ricotta|uova/.test(lowerName)) return '🥛 Latticini e Uova';
  if (/pasta|riso|pane|farro|orzo|avena|cereali|legumi|fagioli|lenticchie|ceci/.test(lowerName)) return '🌾 Cereali e Legumi';
  if (/insalata|pomodoro|carota|zucchina|melanzana|peperone|broccoli|spinaci|verdura/.test(lowerName)) return '🥦 Verdure';
  if (/mela|banana|arancia|pera|pesca|kiwi|fragola|uva|frutta/.test(lowerName)) return '🍎 Frutta';
  if (/olio|burro|margarina|panna/.test(lowerName)) return '🥑 Grassi e Condimenti';
  if (/cioccolat|biscott|dolce|torta|gelato/.test(lowerName)) return '🍫 Dolci e Snack';
  
  return '🧂 Cucina';
}
