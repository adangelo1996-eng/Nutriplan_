/* ============================================================
   APP.JS — v5
   Navigazione, icone, dark mode, calendario, limiti, init
============================================================ */

/* ── Registra Service Worker (PWA) ── */
/* Nota: i Service Worker sono supportati solo su http/https,
   non funzionano se apri il file direttamente da disco (file://). */
if ('serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.protocol === 'http:')) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').catch(function(e) {
      console.warn('[NutriPlan] SW registration failed:', e);
    });
  });
} else {
  console.info('[NutriPlan] Service Worker disattivato (protocollo non supportato: ' + location.protocol + ')');
}

/* ══════════════════════════════════════════════════
   ICONA CANVAS
══════════════════════════════════════════════════ */
function drawAppIcon(canvas, size) {
  size = size || 512;
  canvas.width = canvas.height = size;
  var ctx = canvas.getContext('2d');
  var r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  var grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#4a9b7f');
  grad.addColorStop(1, '#2d6e55');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(size * 0.3, size * 0.25, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold ' + Math.round(size * 0.52) + 'px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = size * 0.04;
  ctx.fillText('🌿', size / 2, size * 0.52);
}

function initIcons() {
  /* Icona canvas per header e landing (decorativa) */
  var hc = document.getElementById('headerIcon');
  if (hc && hc.tagName === 'CANVAS') drawAppIcon(hc, 32);

  var lc = document.createElement('canvas');
  drawAppIcon(lc, 90);
  var ldiv = document.getElementById('landingLogo');
  if (ldiv) { ldiv.innerHTML = ''; ldiv.appendChild(lc); }

  /* L'icona PWA e il manifest usano file statici (icon.svg, manifest.json)
     già referenziati nel <head> di index.html — nessun blob URL necessario */
}

/* ══════════════════════════════════════════════════
   DARK MODE
══════════════════════════════════════════════════ */
function initDarkMode() {
  var saved = localStorage.getItem('nutriplanDark');
  var prefersDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
  applyDarkMode(saved !== null ? saved === '1' : prefersDark, false);
}

function applyDarkMode(isDark, save) {
  if (save === undefined) save = true;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  /* Aggiorna tutti i bottoni tema — supporta id darkToggle, themeToggle e data-theme-toggle */
  var icon = isDark ? '☀️' : '🌙';
  ['darkToggle', 'themeToggle'].forEach(function(id) {
    var b = document.getElementById(id);
    if (b) b.textContent = icon;
  });
  document.querySelectorAll('[data-theme-toggle]').forEach(function(b) {
    b.textContent = icon;
  });
  var meta = document.getElementById('metaThemeColor');
  if (meta) meta.content = isDark ? '#152318' : '#4a9b7f';
  if (save) localStorage.setItem('nutriplanDark', isDark ? '1' : '0');
}

/* Alias compatibili — entrambi funzionano */
function toggleDarkMode() {
  applyDarkMode(document.documentElement.getAttribute('data-theme') !== 'dark');
}
function toggleTheme() { toggleDarkMode(); }

/* ══════════════════════════════════════════════════
   iOS / PWA
══════════════════════════════════════════════════ */
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isInStandaloneMode() {
  return window.navigator.standalone === true ||
         window.matchMedia('(display-mode:standalone)').matches;
}

/* Alias compatibili per ios banner */
function closeIosBanner()   { dismissIosBanner(); }
function dismissIosBanner() {
  var b = document.getElementById('iosBanner');
  if (b) b.classList.remove('show');
  localStorage.setItem('iosBannerDismissed', '1');
}

function initIosBanner() {
  if (isIos() && !isInStandaloneMode() && !localStorage.getItem('iosBannerDismissed')) {
    setTimeout(function() {
      var b = document.getElementById('iosBanner');
      if (b) b.classList.add('show');
    }, 2000);
  }
}

var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
  if (!localStorage.getItem('installDismissed')) {
    var b = document.getElementById('installPwaBanner');
    if (b) b.style.display = 'flex';
  }
});

function installPwa() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function() { deferredPrompt = null; });
  dismissInstallBanner();
}
function dismissInstallBanner() {
  var b = document.getElementById('installPwaBanner');
  if (b) b.style.display = 'none';
  localStorage.setItem('installDismissed', '1');
}

/* ══════════════════════════════════════════════════
   NAVIGAZIONE PAGINE
══════════════════════════════════════════════════ */
var PAGE_MAP = {
  'piano':   'pianoPasto',
  'pantry':  'pantryPage',
  'ricette': 'ricettePage',
  'storico': 'storicoPage',
  'spesa':   'spesaPage',
  'stats':   'statsPage',
  'profilo': 'profiloPage'
};

var currentPage = 'piano';

function switchPage(pageKey) {
  if (!PAGE_MAP[pageKey]) return;
  currentPage = pageKey;

  /* Nasconde tutte le pagine */
  Object.values(PAGE_MAP).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  /* Mostra pagina target */
  var target = document.getElementById(PAGE_MAP[pageKey]);
  if (target) target.classList.add('active');

  /* Aggiorna nav tab — bottom nav */
  document.querySelectorAll('.bottom-nav .nav-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.page === pageKey);
  });

  /* Aggiorna nav tab — sidebar */
  document.querySelectorAll('.sidebar-nav .nav-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.page === pageKey);
  });

  /* Render specifico per pagina */
  if (pageKey === 'pantry')  { renderFridge(); }
  if (pageKey === 'ricette') { if (typeof renderRicette === 'function') renderRicette(); }
  if (pageKey === 'storico') { if (typeof renderStorico === 'function') renderStorico(); }
  if (pageKey === 'spesa')   { if (typeof renderSpesa   === 'function') renderSpesa(); }
  if (pageKey === 'stats')   { if (typeof renderStats   === 'function') renderStats(); }
  if (pageKey === 'profilo') { if (typeof renderProfilo === 'function') renderProfilo(); }
}

/* ══════════════════════════════════════════════════
   TAB INTERNI — PIANO
══════════════════════════════════════════════════ */
var currentPianoTab = 'pasto';

function switchPianoTab(tabKey) {
  currentPianoTab = tabKey;

  /* Tab buttons */
  document.querySelectorAll('#pianoTabs .page-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tabKey);
  });

  /* Tab content */
  document.querySelectorAll('#pianoPasto .page-tab-content').forEach(function(c) {
    c.classList.toggle('active', c.id === 'tab-' + tabKey);
  });

  /* Render specifico */
  if (tabKey === 'frigo-piano')  { if (typeof renderFridgeRecipes  === 'function') renderFridgeRecipes(); }
  if (tabKey === 'ingredienti')  { if (typeof renderIngredienti    === 'function') renderIngredienti(); }
  if (tabKey === 'limiti')       { renderLimiti(); }
}

/* ══════════════════════════════════════════════════
   TAB INTERNI — RICETTE
══════════════════════════════════════════════════ */
var currentRicetteTab = 'catalogo';

function switchRicetteTab(tabKey) {
  currentRicetteTab = tabKey;

  document.querySelectorAll('#ricetteTabs .page-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tabKey);
  });
  document.querySelectorAll('#ricettePage .page-tab-content').forEach(function(c) {
    c.classList.toggle('active', c.id === 'tab-' + tabKey);
  });

  if (tabKey === 'catalogo') { if (typeof renderRicette        === 'function') renderRicette(); }
  if (tabKey === 'mie')      { if (typeof renderCustomRicette  === 'function') renderCustomRicette(); }
}

/* ══════════════════════════════════════════════════
   DATE UTILITIES
══════════════════════════════════════════════════ */
function formatDateKey(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function parseDateKey(dk) {
  if (!dk) return new Date();
  var parts = dk.split('-');
  if (parts.length !== 3) return new Date();
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/* ══════════════════════════════════════════════════
   CALENDARIO
══════════════════════════════════════════════════ */
var DAYS_IT   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
var MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

var _calOffset = 0; /* offset in giorni dal centro (oggi) */

function buildCalendarBar() {
  var bar = document.getElementById('calendarBar');
  if (!bar) return;
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  /* Pre-calcola la data attiva per il fade a distanza */
  var activeDk = (typeof selectedDateKey !== 'undefined' && selectedDateKey) ? selectedDateKey : getCurrentDateKey();
  var activeD = parseDateKey(activeDk);
  activeD.setHours(0, 0, 0, 0);

  var html = '';
  var start = -20 + _calOffset;
  var end   =  10 + _calOffset;
  for (var i = start; i <= end; i++) {
    var d = new Date(today);
    d.setDate(today.getDate() + i);
    var dk = formatDateKey(d);
    var isToday  = dk === getCurrentDateKey();
    var isActive = dk === selectedDateKey;
    var hd = (typeof appHistory !== 'undefined' && appHistory[dk]) ? appHistory[dk] : {};
    var hasData = Object.keys(hd.usedItems || {}).some(function(mk) {
      return Object.keys((hd.usedItems || {})[mk] || {}).length > 0;
    }) || Object.keys(hd.ricette || {}).some(function(mk){
      return Object.keys((hd.ricette || {})[mk] || {}).length > 0;
    });
    var isPast   = d < today && !isToday;
    var isFuture = d > today && !isToday;
    var dist = Math.abs(Math.round((d - activeD) / 86400000));
    var distCls = dist === 0 ? '' : dist === 1 ? ' cal-d1' : dist === 2 ? ' cal-d2' : dist === 3 ? ' cal-d3' : ' cal-dfar';
    var cls = 'cal-day' +
      (isToday  ? ' today'      : '') +
      (isActive ? ' active'     : '') +
      (hasData  ? ' has-data'   : '') +
      (isPast   ? ' cal-past'   : '') +
      (isFuture ? ' cal-future' : '') +
      distCls;
    html +=
      '<div class="' + cls + '" onclick="selectDate(\'' + dk + '\')" data-dk="' + dk + '">' +
        '<span class="cal-day-name">' + DAYS_IT[d.getDay()] + '</span>' +
        '<span class="cal-day-num">'  + d.getDate() + '</span>' +
        '<span class="cal-day-month">' + MONTHS_IT[d.getMonth()] + '</span>' +
        (hasData ? '<span class="cal-dot"></span>' : '') +
      '</div>';
  }
  bar.innerHTML = html;

  /* Scroll centrato sul giorno attivo/oggi */
  setTimeout(function() {
    var active = bar.querySelector('.cal-day.active') || bar.querySelector('.cal-day.today');
    if (active) {
      /* Calcola scrollLeft per centrare il giorno */
      var barWidth  = bar.offsetWidth;
      var dayLeft   = active.offsetLeft;
      var dayWidth  = active.offsetWidth;
      var targetScroll = dayLeft - (barWidth / 2) + (dayWidth / 2);
      bar.scrollLeft = Math.max(0, targetScroll);
    }
  }, 80);

  /* Aggiorna bottoni navigazione */
  var prevBtn = document.getElementById('calPrevBtn');
  var nextBtn = document.getElementById('calNextBtn');
  if (prevBtn) prevBtn.disabled = _calOffset <= -710; /* max 2 anni indietro */
  if (nextBtn) nextBtn.disabled = _calOffset >= 20;
}

function shiftCalendar(delta) {
  _calOffset = Math.max(-710, Math.min(20, _calOffset + delta));
  buildCalendarBar();
}

function updateDateLabel() {
  var el = document.getElementById('selectedDateLabel');
  if (!el) return;
  var d = selectedDateKey ? parseDateKey(selectedDateKey) : new Date();
  var today = new Date(); today.setHours(0,0,0,0);
  var diff = Math.round((d - today) / 86400000);
  var prefix = diff === 0 ? 'Oggi, ' : diff === -1 ? 'Ieri, ' : diff === 1 ? 'Domani, ' : '';
  el.textContent = prefix + DAYS_IT[d.getDay()] + ' ' + d.getDate() + ' ' +
                   MONTHS_IT[d.getMonth()] + ' ' + d.getFullYear();
}

function selectDate(dk) {
  var todayDk = typeof getCurrentDateKey === 'function' ? getCurrentDateKey() : '';
  if (dk !== todayDk) {
    /* Solo per giorni PASSATI con dati già presenti, chiedi conferma */
    var d = typeof parseDateKey === 'function' ? parseDateKey(dk) : new Date(dk + 'T00:00:00');
    var todayD = new Date(); todayD.setHours(0,0,0,0);
    if (d < todayD) {
      var hd = (typeof appHistory !== 'undefined' && appHistory && appHistory[dk]) ? appHistory[dk] : {};
      var hasData = Object.keys(hd.usedItems||{}).some(function(m){ return Object.keys((hd.usedItems||{})[m]||{}).length>0; });
      if (hasData && !confirm('Vuoi modificare i dati di ' + dk + '?\nLe modifiche aggiornano i dati storici.')) return;
    }
  }
  selectedDateKey = dk;
  buildCalendarBar();
  updateDateLabel();
  if (typeof renderPiano === 'function') renderPiano();
}

/* ══════════════════════════════════════════════════
   LIMITI SETTIMANALI
══════════════════════════════════════════════════ */
function renderLimiti() {
  var el = document.getElementById('limitiContent');
  if (!el) return;
  if (typeof weeklyLimits === 'undefined' || !weeklyLimits ||
      Object.keys(weeklyLimits).length === 0) {
    el.innerHTML = '<div class="rc-empty"><div style="font-size:2rem;">📊</div>' +
                   '<p>Nessun limite configurato.</p></div>';
    return;
  }
  var html = '<div class="limits-grid">';
  Object.keys(weeklyLimits).forEach(function(key) {
    var data = weeklyLimits[key];
    var cur  = data.current || 0;
    var pct  = Math.min(Math.round((cur / data.max) * 100), 100);
    var cls  = pct >= 100 ? 'exceeded' : pct >= 70 ? 'warning' : '';
    html +=
      '<div class="limit-card ' + cls + '">' +
        '<div class="limit-card-icon">' + (data.icon || '📊') + '</div>' +
        '<div class="limit-card-name">' + (data.name || key) + '</div>' +
        '<div class="limit-progress-bar">' +
          '<div class="limit-progress-fill ' + cls + '" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<div class="limit-text ' + cls + '">' + cur + ' / ' + data.max + ' ' + (data.unit || '') + '</div>' +
      '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

/* ══════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════ */
function showToast(msg, type, duration) {
  type     = type     || 'info';
  duration = duration || 2800;
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(function() {
    t.classList.add('removing');
    setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 250);
  }, duration);
}

/* Gamification: celebrazione al completamento attività (Oggi) */
function showCompletionCelebration() {
  if (typeof showToast === 'function') {
    showToast('🎉 Completato! Ottimo lavoro!', 'success', 2200);
  }
  var overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<span class="celebration-icon">✓</span>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function() {
    overlay.classList.add('celebration-visible');
  });
  setTimeout(function() {
    overlay.classList.remove('celebration-visible');
    overlay.classList.add('celebration-out');
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 400);
  }, 900);
}

/* ══════════════════════════════════════════════════
   CLOUD STATUS
══════════════════════════════════════════════════ */
function updateCloudStatus(state, text) {
  var el = document.getElementById('cloudStatus');
  if (!el) return;
  el.className = 'cloud-status ' + (state || 'local');
  var span = el.querySelector('span');
  if (span) span.textContent = text || (state === 'synced' ? '✓ Sincronizzato' :
                                         state === 'saving'  ? '⏳ Salvataggio…' :
                                         state === 'error'   ? '✗ Errore sync'  : '☁ Locale');
}

/* updateAuthUI è definita in firebase-config.js con i corretti ID HTML */

/* Da mobile: click sul nome utente → vai a Profilo; da desktop → modal auth */
function onAuthPillClick() {
  var isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  if (isMobile && typeof goToPage === 'function') {
    goToPage('profilo');
  } else {
    openAuthModal();
  }
}

function openAuthModal() {
  var modal = document.getElementById('authModal');
  if (!modal) return;
  var body  = document.getElementById('authModalBody');
  var title = document.getElementById('authModalTitle');
  var user  = (typeof currentUser !== 'undefined') ? currentUser : null;

  if (user) {
    if (title) title.textContent = 'Account';
    if (body) body.innerHTML =
      '<div style="text-align:center;padding:16px 0;">' +
        '<img src="' + (user.photoURL || '') + '" alt="Avatar" ' +
             'style="width:64px;height:64px;border-radius:50%;margin:0 auto 12px;' +
                    'border:3px solid var(--primary);display:block;" ' +
             'onerror="this.style.display=\'none\'" />' +
        '<div style="font-weight:800;font-size:1rem;">' + (user.displayName || '') + '</div>' +
        '<div style="font-size:.78rem;color:var(--text-light);margin:4px 0 20px;">' + (user.email || '') + '</div>' +
        '<button class="btn btn-danger btn-small" onclick="signOutUser()">Esci</button>' +
      '</div>';
  } else {
    if (title) title.textContent = 'Accedi';
    if (body) body.innerHTML =
      '<div style="padding:8px 0;">' +
        '<p style="font-size:.82rem;color:var(--text-light);text-align:center;margin-bottom:20px;">' +
          'Accedi per sincronizzare i dati su tutti i dispositivi.' +
        '</p>' +
        '<button class="btn-google" onclick="signInWithGoogle()">' +
          '<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>' +
          'Continua con Google' +
        '</button>' +
      '</div>';
  }
  modal.classList.add('active');
}

function closeAuthModal() {
  var modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
}

/* ══════════════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════════════ */
function closeRecipeModal() {
  var m = document.getElementById('recipeModal');
  if (m) m.classList.remove('active');
}
function closeSaveFridgeModal() {
  var m = document.getElementById('saveFridgeModal');
  if (m) m.classList.remove('active');
}
function openSavedFridgeModal() {
  var m = document.getElementById('savedFridgeModal');
  if (!m) return;
  var list = document.getElementById('savedFridgeList');
  if (list && typeof renderSavedFridgeList === 'function') renderSavedFridgeList(list);
  m.classList.add('active');
}
function closeSavedFridgeModal() {
  var m = document.getElementById('savedFridgeModal');
  if (m) m.classList.remove('active');
}
function openAddFridgeModal() {
  var m = document.getElementById('addFridgeModal');
  if (!m) return;
  var inp = document.getElementById('newFridgeItem');
  if (inp) { inp.value = ''; inp.focus(); }
  var qty = document.getElementById('newFridgeQty');
  if (qty) qty.value = '';
  m.classList.add('active');
  populateIngAutocomplete();
}

/* Apre il modal dispensa con il nome ingrediente già compilato
   (usato dalla pagina Oggi per aggiungere velocemente alla dispensa). */
function openAddFridgePrecompiled(name) {
  var modal = document.getElementById('addFridgeModal');
  if (!modal) return;
  modal.classList.add('active');

  var nameEl = document.getElementById('newFridgeItem');
  var qtyEl  = document.getElementById('newFridgeQty');
  var catEl  = document.getElementById('newFridgeCategory');

  if (nameEl) {
    nameEl.value = name || '';
    if (typeof populateIngAutocomplete === 'function') populateIngAutocomplete();
    if (typeof autoFillFridgeCategory === 'function' && name) autoFillFridgeCategory(name);
  }
  if (qtyEl) qtyEl.value = '';
  if (catEl && !catEl.value) catEl.value = '🧂 Altro';

  setTimeout(function() {
    if (qtyEl) { qtyEl.focus(); qtyEl.select(); }
  }, 100);
}
function closeAddFridgeModal() {
  var m = document.getElementById('addFridgeModal');
  if (m) m.classList.remove('active');
}
function openNewRicettaModal() {
  var m = document.getElementById('newRicettaModal');
  if (m) m.classList.add('active');
}
function closeNewRicettaModal() {
  var m = document.getElementById('newRicettaModal');
  if (m) m.classList.remove('active');
}
function closePurchasedQtyModal() {
  var m = document.getElementById('purchasedQtyModal');
  if (m) m.classList.remove('active');
}

/* Chiudi modali cliccando sfondo */
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal').forEach(function(modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.classList.remove('active');
    });
  });
});

/* ══════════════════════════════════════════════════
   FRIGO — helpers interfaccia
══════════════════════════════════════════════════ */
function clearPantrySearch() {
  var inp = document.getElementById('pantrySearch');
  if (inp) inp.value = '';
  filterPantry('');
}

/* Auto-compila la categoria quando si seleziona un ingrediente dal database */
function autoFillFridgeCategory(name) {
  if (!name) return;
  var catSel = document.getElementById('newFridgeCategory');
  if (!catSel) return;
  var nl = name.trim().toLowerCase();
  var found = null;
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    found = defaultIngredients.find(function(i) {
      return i && i.name && i.name.toLowerCase() === nl;
    });
  }
  if (!found && typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    found = customIngredients.find(function(i) {
      return i && i.name && i.name.toLowerCase() === nl;
    });
  }
  if (!found && typeof pantryItems !== 'undefined' && pantryItems && pantryItems[name]) {
    found = { category: pantryItems[name].category };
  }
  if (found && found.category) {
    catSel.value = found.category;
    /* Auto-suggerisci scadenza in base alla categoria appena rilevata */
    _autoFillFridgeExpiry();
  }
}

/* Aggiorna la data di scadenza suggerita nel modal addFridgeModal */
function _autoFillFridgeExpiry() {
  var catEl      = document.getElementById('newFridgeCategory');
  var scadEl     = document.getElementById('newFridgeScadenza');
  var freezerEl  = document.getElementById('newFridgeFreezer');
  var suggLabel  = document.getElementById('newFridgeSuggLabel');
  if (!catEl || !scadEl) return;
  var cat    = catEl.value || '🧂 Altro';
  var frozen = freezerEl ? freezerEl.checked : false;
  if (typeof _suggestExpiry !== 'function') return;
  var suggested = _suggestExpiry(cat, frozen);
  scadEl.value = suggested;
  if (suggLabel) {
    if (frozen) {
      suggLabel.textContent = '❄️ Scadenza estesa per congelatore (modifica se necessario)';
    } else {
      var freshDays = (typeof FRESH_EXPIRY_DAYS !== 'undefined') ? FRESH_EXPIRY_DAYS[cat] : null;
      if (freshDays && freshDays < 30) {
        suggLabel.textContent = '💡 Suggerita per prodotti freschi (' + freshDays + ' giorni)';
      } else {
        suggLabel.textContent = 'Lascia vuoto se non applicabile';
      }
    }
  }
}

function _updateAddFridgeSuggLabel() {
  /* Chiamato quando l'utente modifica manualmente la data */
  var suggLabel = document.getElementById('newFridgeSuggLabel');
  if (suggLabel) suggLabel.textContent = '';
}

function populateIngAutocomplete() {
  var dl = document.getElementById('ingredientiAutocomplete');
  if (!dl) return;
  var seen = {};
  var options = [];
  /* 1. Dal database default */
  if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
    defaultIngredients.forEach(function(i) {
      if (i && i.name && !seen[i.name]) { seen[i.name] = true; options.push(i.name); }
    });
  }
  /* 2. Ingredienti custom */
  if (typeof customIngredients !== 'undefined' && Array.isArray(customIngredients)) {
    customIngredients.forEach(function(i) {
      if (i && i.name && !seen[i.name]) { seen[i.name] = true; options.push(i.name); }
    });
  }
  /* 3. Frigo attuale */
  if (typeof pantryItems !== 'undefined' && pantryItems) {
    Object.keys(pantryItems).forEach(function(k) {
      if (k && !seen[k]) { seen[k] = true; options.push(k); }
    });
  }
  options.sort(function(a,b){ return a.localeCompare(b,'it'); });
  dl.innerHTML = options.map(function(name) {
    return '<option value="' + name.replace(/"/g, '&quot;') + '">';
  }).join('');
}

function confirmAddFridge() {
  var name     = (document.getElementById('newFridgeItem')     || {}).value || '';
  var cat      = (document.getElementById('newFridgeCategory') || {}).value || '🧂 Altro';
  var qty      = parseFloat((document.getElementById('newFridgeQty') || {}).value || '0');
  var unit     = (document.getElementById('newFridgeUnit')     || {}).value || 'g';
  var scadenza = (document.getElementById('newFridgeScadenza') || {}).value || '';
  var frozen   = !!(document.getElementById('newFridgeFreezer') || {}).checked;

  name = name.trim();
  if (!name) { showToast('⚠️ Inserisci il nome dell\'ingrediente', 'warning'); return; }
  if (isNaN(qty) || qty < 0) qty = 0;

  if (!pantryItems) pantryItems = {};
  var existing = pantryItems[name] || {};
  var entry = Object.assign({}, existing, {
    quantity: qty,
    unit:     unit,
    category: cat,
    icon:     typeof getCategoryIcon === 'function' ? getCategoryIcon(cat) : '🧂'
  });
  if (scadenza) entry.scadenza = scadenza;
  if (frozen)   entry.freezer  = true;
  pantryItems[name] = entry;

  if (typeof saveData === 'function') saveData();
  closeAddFridgeModal();
  renderFridge();
  renderFridge('pianoFridgeContent');
  var msg = '✅ ' + name + (frozen ? ' ❄️ aggiunto al congelatore' : ' aggiunto alla dispensa');
  showToast(msg, 'success');
}

/* Aggiunge un ingrediente acquistato alla dispensa (chiamato da spesa.js) */
function addFromSpesa(name, qty, unit) {
  if (!name || isNaN(qty) || qty <= 0) return;
  if (!pantryItems) pantryItems = {};
  var existing = pantryItems[name] || {};

  /* Cerca la categoria dal database defaultIngredients */
  var lookupCat = existing.category || null;
  if (!lookupCat) {
    var nl = name.toLowerCase();
    if (typeof defaultIngredients !== 'undefined' && Array.isArray(defaultIngredients)) {
      var def = defaultIngredients.find(function(d){ return d && d.name && d.name.toLowerCase() === nl; });
      if (def && def.category) lookupCat = def.category;
    }
  }
  var cat = lookupCat || '🧂 Cucina';

  pantryItems[name] = Object.assign({}, existing, {
    quantity: (existing.quantity || 0) + qty,
    unit:     unit || existing.unit || 'g',
    category: cat,
    icon:     typeof getCategoryIcon === 'function' ? getCategoryIcon(cat) : '🧂'
  });
  if (typeof saveData === 'function') saveData();
  if (typeof renderFridge === 'function') renderFridge();
  if (typeof showToast === 'function') showToast('🛒 ' + name + ': ' + qty + ' ' + (unit || 'g') + ' → dispensa', 'success');
  if (typeof showCompletionCelebration === 'function') showCompletionCelebration();
}

function saveFridgeConfig() {
  var m = document.getElementById('saveFridgeModal');
  if (m) m.classList.add('active');
  var inp = document.getElementById('fridgeConfigName');
  if (inp) { inp.value = ''; setTimeout(function() { inp.focus(); }, 120); }
}

function confirmSaveFridge() {
  var inp  = document.getElementById('fridgeConfigName');
  var name = inp ? inp.value.trim() : '';
  if (!name) { showToast('⚠️ Inserisci un nome per la configurazione', 'warning'); return; }
  if (typeof saveData !== 'function') return;

  var configs = JSON.parse(localStorage.getItem('nutriplanFridgeConfigs') || '[]');
  configs.push({
    id:    Date.now(),
    name:  name,
    date:  new Date().toLocaleDateString('it-IT'),
    items: JSON.parse(JSON.stringify(pantryItems || {}))
  });
  localStorage.setItem('nutriplanFridgeConfigs', JSON.stringify(configs));
  closeSaveFridgeModal();
  showToast('💾 Dispensa "' + name + '" salvata', 'success');
  if (typeof showCompletionCelebration === 'function') showCompletionCelebration();
}

function renderSavedFridgeList(container) {
  var configs = JSON.parse(localStorage.getItem('nutriplanFridgeConfigs') || '[]');
  if (!configs.length) {
    container.innerHTML = '<div class="rc-empty"><p>Nessuna configurazione salvata.</p></div>';
    return;
  }
  container.innerHTML = configs.map(function(cfg) {
    return '<div class="saved-fridge-item">' +
      '<div class="saved-fridge-info">' +
        '<div class="saved-fridge-name">' + cfg.name + '</div>' +
        '<div class="saved-fridge-date">' + cfg.date + '</div>' +
      '</div>' +
      '<div class="saved-fridge-actions">' +
        '<button class="rc-btn rc-btn-sm rc-btn-primary" ' +
                'onclick="loadFridgeConfig(' + cfg.id + ')">Carica</button>' +
        '<button class="rc-btn rc-btn-sm" style="color:var(--danger)" ' +
                'onclick="deleteFridgeConfig(' + cfg.id + ')">🗑</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function loadFridgeConfig(id) {
  var configs = JSON.parse(localStorage.getItem('nutriplanFridgeConfigs') || '[]');
  var cfg = configs.find(function(c) { return c.id === id; });
  if (!cfg) return;
  pantryItems = JSON.parse(JSON.stringify(cfg.items));
  if (typeof saveData === 'function') saveData();
  closeSavedFridgeModal();
  renderFridge();
  showToast('📁 Dispensa "' + cfg.name + '" caricata', 'success');
}

function deleteFridgeConfig(id) {
  var configs = JSON.parse(localStorage.getItem('nutriplanFridgeConfigs') || '[]');
  configs = configs.filter(function(c) { return c.id !== id; });
  localStorage.setItem('nutriplanFridgeConfigs', JSON.stringify(configs));
  var m = document.getElementById('savedFridgeModal');
  var list = document.getElementById('savedFridgeList');
  if (list) renderSavedFridgeList(list);
  showToast('🗑 Configurazione eliminata', 'info');
}

/* ══════════════════════════════════════════════════
   UPDATE ALL UI
══════════════════════════════════════════════════ */
function updateAllUI() {
  if (typeof renderPiano   === 'function') renderPiano();
  if (typeof renderFridge  === 'function' && currentPage === 'dispensa') renderFridge();
  if (typeof renderRicette === 'function' && currentPage === 'ricette') renderRicette();
  if (typeof renderSpesa   === 'function' && currentPage === 'spesa') renderSpesa();
  if (typeof renderStats   === 'function' && currentPage === 'stats') renderStats();
}

/* ══════════════════════════════════════════════════
   RESET GIORNATA
══════════════════════════════════════════════════ */
function resetDay() {
  if (!confirm('Vuoi resettare il piano di oggi?')) return;
  if (typeof pianoAlimentare !== 'undefined') {
    ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk) {
      if (pianoAlimentare[mk]) {
        Object.keys(pianoAlimentare[mk]).forEach(function(cat) {
          pianoAlimentare[mk][cat] = [];
        });
      }
    });
  }
  if (typeof saveData === 'function') saveData();
  if (typeof renderPiano === 'function') renderPiano();
  showToast('🔄 Piano resettato', 'info');
}

/* ══════════════════════════════════════════════════
   INIT APP
══════════════════════════════════════════════════ */
function startApp() {
  var landing = document.getElementById('landingPage');
  var shell   = document.getElementById('appShell');
  if (landing) landing.style.display = 'none';
  if (shell)   shell.style.display   = 'block';

  initDarkMode();
  initIcons();
  initIosBanner();

  if (typeof loadData === 'function') loadData();

  /* Init data defaults */
  if (typeof selectedDateKey === 'undefined' || !selectedDateKey) {
    if (typeof getCurrentDateKey === 'function') {
      window.selectedDateKey = getCurrentDateKey();
    }
  }

  buildCalendarBar();
  updateDateLabel();

  /* Render pagina iniziale */
  if (typeof renderPiano === 'function') renderPiano();

  /* Pagina attiva di default */
  switchPage('piano');
  if (typeof initSwipePages === 'function') initSwipePages();
}

/* Auto-start se non c'è landing page */
document.addEventListener('DOMContentLoaded', function() {
  /* Cookie consent — prima di tutto */
  initCookieConsent();

  /* Avvia Firebase subito per rilevare sessione già attiva
     (aggiorna i bottoni landing prima che l'utente clicchi) */
  if (typeof initFirebase === 'function') {
    try { initFirebase(); } catch(e) {}
  }

  initDarkMode();

  /* Aggiorna icona tema nell'header (data-theme-toggle) */
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach(function(b) {
    b.textContent = isDark ? '☀️' : '🌙';
  });

  /* Se l'appShell è già visibile (no landing), init diretto */
  var shell = document.getElementById('appShell');
  if (shell && shell.style.display !== 'none' && shell.style.display !== '') {
    startApp();
  }

  /* FIX: listener rimosso — gestito esclusivamente in firebase-config.js
     per evitare registrazioni duplicate che causavano il loop "Verifica accesso" */
});
/* ============================================================
   BRIDGE SHIM — collega index.html v2 con app.js esistente
   Da aggiungere IN FONDO ad app.js
============================================================ */

/* ══════════════════════════════════════════════════
   COOKIE CONSENT
══════════════════════════════════════════════════ */
var COOKIE_KEY = 'nutriplan_cookie_consent';

function initCookieConsent() {
  if (localStorage.getItem(COOKIE_KEY)) return;
  var banner = document.getElementById('cookieBanner');
  if (banner) banner.classList.add('visible');
}

function acceptAllCookies() {
  localStorage.setItem(COOKIE_KEY, 'all');
  _hideCookieBanner();
}

function acceptEssentialCookies() {
  localStorage.setItem(COOKIE_KEY, 'essential');
  _hideCookieBanner();
}

function _hideCookieBanner() {
  var banner = document.getElementById('cookieBanner');
  if (banner) banner.classList.remove('visible');
}

/* ══════════════════════════════════════════════════
   LANDING — login gate helpers
══════════════════════════════════════════════════ */
function landingSignIn() {
  /* FIX: initFirebase() rimossa — già inizializzato in DOMContentLoaded;
     ri-chiamarla registrava listener duplicati */
  if (typeof signInWithGoogle === 'function') signInWithGoogle();
}

function landingOffline() {
  if (!confirm('Senza accesso i dati non vengono sincronizzati tra dispositivi.\nContinuare in modalità offline?')) return;
  enterApp();
}

/* ── enterApp() ── chiamata dopo login o scelta offline ── */
function enterApp() {
  var landing = document.getElementById('landingPage');
  var header  = document.getElementById('appHeader');
  var sidebar = document.getElementById('sidebarNav');
  var bottom  = document.getElementById('bottomNav');
  var main    = document.getElementById('appMain');

  if (landing) landing.style.display = 'none';
  if (header)  header.style.display  = '';
  if (sidebar) sidebar.style.display = '';
  if (bottom)  bottom.style.display  = '';
  if (main)    main.style.display    = '';

  initDarkMode();
  initIcons();
  initIosBanner();

  /* FIX: initFirebase() rimossa da qui — era già chiamata in DOMContentLoaded e
     registrava un nuovo onAuthStateChanged ad ogni enterApp(), creando listener
     duplicati e il loop "Verifica accesso" */
  if (typeof loadData === 'function') loadData();

  if (!window.selectedDateKey && typeof getCurrentDateKey === 'function') {
    window.selectedDateKey = getCurrentDateKey();
  }

  buildCalendarBar();
  updateDateLabel();
  goToPage('piano-alimentare');

  if (typeof initSwipePages === 'function') initSwipePages();

  /* Prima mostra onboarding (piano alimentare), poi tutorial */
  if (typeof checkOnboarding === 'function') {
    checkOnboarding();
  } else if (typeof checkTutorial === 'function') {
    checkTutorial();
  }
}

/* ── goToPage() ── navigazione con i nuovi ID ─────────── */
function goToPage(key) {
  currentPage = key;

  /* Nasconde tutte le pagine */
  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.remove('active');
  });

  /* Mostra pagina target */
  var target = document.getElementById('page-' + key);
  if (target) target.classList.add('active');

  /* Aggiorna sidebar */
  document.querySelectorAll('.sidebar-nav .nav-tab').forEach(function(t) {
    t.classList.toggle('active', t.id === 'st-' + key);
  });

  /* Aggiorna bottom nav */
  document.querySelectorAll('.bottom-nav .nav-tab').forEach(function(t) {
    t.classList.toggle('active', t.id === 'bn-' + key);
  });

  /* Render specifico per pagina */
  var renders = {
    'piano':            function() { if (typeof renderPiano            === 'function') renderPiano(); },
    'piano-alimentare': function() { if (typeof renderPianoAlimentare  === 'function') renderPianoAlimentare(); },
    'dispensa':         function() { if (typeof renderFridge           === 'function') renderFridge(); },
    'ricette':          function() { if (typeof renderRicette          === 'function') renderRicette(); },
    'spesa':            function() { if (typeof renderSpesa            === 'function') renderSpesa(); },
    'statistiche':      function() { if (typeof renderStats            === 'function') renderStats(); },
    'profilo':          function() { if (typeof renderProfilo          === 'function') renderProfilo(); }
  };
  if (renders[key]) renders[key]();
}

/* ── Swipe tra pagine (mobile) ─────────────────────────── */
var SWIPE_PAGE_ORDER = ['piano','piano-alimentare','dispensa','ricette','spesa','statistiche'];
var _swipeStartX = 0;

function initSwipePages() {
  if (window._swipePagesInited) return;
  window._swipePagesInited = true;
  var container = document.getElementById('appMain') || document.querySelector('.app-inner') || document.body;
  if (!container) return;
  container.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) _swipeStartX = e.touches[0].clientX;
  }, { passive: true });
  container.addEventListener('touchend', function(e) {
    if (e.changedTouches.length !== 1) return;
    var endX = e.changedTouches[0].clientX;
    var delta = _swipeStartX - endX;
    var threshold = 80;
    var idx = SWIPE_PAGE_ORDER.indexOf(currentPage);
    if (idx === -1) return;
    if (delta > threshold && idx < SWIPE_PAGE_ORDER.length - 1) {
      e.preventDefault();
      goToPage(SWIPE_PAGE_ORDER[idx + 1]);
    } else if (delta < -threshold && idx > 0) {
      e.preventDefault();
      goToPage(SWIPE_PAGE_ORDER[idx - 1]);
    }
  }, { passive: false });
}

/* ── switchPianoTab / switchRicetteTab ────────────────── */
/* Sovrascrivi le versioni esistenti perché ora prendono
   anche l'elemento cliccato come secondo parametro        */
function switchPianoTab(tabKey, el) {
  currentPianoTab = tabKey;

  document.querySelectorAll('#page-piano .page-tabs .page-tab').forEach(function(t) {
    t.classList.remove('active');
  });
  if (el) el.classList.add('active');

  document.querySelectorAll('#page-piano .page-tab-content').forEach(function(c) {
    c.classList.toggle('active', c.id === 'tab-' + tabKey);
  });

  if (tabKey === 'piano') {
    if (typeof renderMealItems    === 'function') renderMealItems();
    if (typeof renderPianoRicette === 'function') renderPianoRicette();
  }
}

function switchRicetteTab(tabKey, el) {
  currentRicetteTab = tabKey;

  document.querySelectorAll('#page-ricette .page-tabs .page-tab').forEach(function(t) {
    t.classList.remove('active');
  });
  if (el) el.classList.add('active');

  document.querySelectorAll('#page-ricette .page-tab-content').forEach(function(c) {
    c.classList.toggle('active', c.id === 'tab-' + tabKey);
  });

  if (tabKey === 'catalogo' && typeof renderRicette        === 'function') renderRicette();
  if (tabKey === 'mie'      && typeof renderCustomRicette  === 'function') renderCustomRicette();
  if (tabKey === 'ai'       && typeof renderAIRicetteTab   === 'function') renderAIRicetteTab();
}

/* ── Privacy Policy Modal ─────────────────────────── */
function openPrivacyModal() {
  var m = document.getElementById('privacyModal');
  if (m) m.classList.add('active');
}
function closePrivacyModal() {
  var m = document.getElementById('privacyModal');
  if (m) m.classList.remove('active');
}

/* ── Alias funzioni modal (nomi usati nel nuovo HTML) ──── */
function openSavedFridges()    { openSavedFridgeModal(); }
function openAddFridge()       { openAddFridgeModal();   }
function closeAddFridge()      { closeAddFridgeModal();  }
function openNewRicetta()      { openNewRicettaModal();  }
function closeNewRicetta()     { closeNewRicettaModal(); }
function resetPiano()          { resetDay();             }
function saveNewRicetta()      { if (typeof saveCustomRicetta === 'function') saveCustomRicetta(); }
function addIngToNewRicetta()  { if (typeof addIngredientToNew === 'function') addIngredientToNew(); }
function addRecipeToPlan()     { if (typeof applyRecipeToMeal === 'function') applyRecipeToMeal(); }

/* ── Alias renderPiano / renderRicette / renderStats / renderIngredienti ─── */
function renderPiano() {
  if (typeof renderMealPlan === 'function') renderMealPlan();
}

/* ══════════════════════════════════════════════════
   UNDO SYSTEM — annulla ultima azione
══════════════════════════════════════════════════ */
var _undoStack   = [];
var _undoMax     = 8;
var _undoTimeout = null;

function pushUndo(description) {
  _undoStack.push({
    desc:        description,
    pantryItems: JSON.parse(JSON.stringify(typeof pantryItems !== 'undefined' ? pantryItems : {})),
    pianoAlimentare: JSON.parse(JSON.stringify(typeof pianoAlimentare !== 'undefined' ? pianoAlimentare : {})),
    appHistory:  JSON.parse(JSON.stringify(typeof appHistory  !== 'undefined' ? appHistory  : {})),
    spesaItems:  JSON.parse(JSON.stringify(typeof spesaItems  !== 'undefined' ? spesaItems  : []))
  });
  if (_undoStack.length > _undoMax) _undoStack.shift();
  _showUndoBar(description);
}

function performUndo() {
  var s = _undoStack.pop();
  if (!s) { showToast('Nessuna azione da annullare', 'info'); return; }
  pantryItems = s.pantryItems;
  pianoAlimentare = s.pianoAlimentare;
  appHistory  = s.appHistory;
  spesaItems  = s.spesaItems;
  if (typeof saveData === 'function') saveData();
  /* Re-render pagina corrente */
  var rmap = {
    'piano':       function() { if (typeof renderPiano       === 'function') renderPiano(); },
    'dispensa':    function() { if (typeof renderFridge      === 'function') renderFridge(); },
    'ricette':     function() { if (typeof renderRicette     === 'function') renderRicette(); },
    'spesa':       function() { if (typeof renderSpesa       === 'function') renderSpesa(); },
    'statistiche': function() { if (typeof renderStatistiche === 'function') renderStatistiche(); },
    'profilo':     function() { if (typeof renderProfilo     === 'function') renderProfilo(); }
  };
  if (typeof currentPage !== 'undefined' && rmap[currentPage]) rmap[currentPage]();
  showToast('↩ ' + s.desc + ' annullato', 'info');
  if (_undoStack.length > 0) _showUndoBar(_undoStack[_undoStack.length - 1].desc);
  else _hideUndoBar();
}

function _showUndoBar(desc) {
  var bar = document.getElementById('undoBar');
  if (!bar) return;
  var lbl = bar.querySelector('.undo-label');
  if (lbl) lbl.textContent = desc;
  bar.classList.add('visible');
  if (_undoTimeout) clearTimeout(_undoTimeout);
  _undoTimeout = setTimeout(_hideUndoBar, 6000);
}

function _hideUndoBar() {
  var bar = document.getElementById('undoBar');
  if (bar) bar.classList.remove('visible');
}

/* ── Alias renderPiano / renderRicette / renderStats / renderIngredienti ─── */
function renderRicette() {
  if (typeof renderRicettePage === 'function') renderRicettePage();
}
function renderStats() {
  if (typeof renderStatistiche === 'function') renderStatistiche();
}
function renderIngredienti() {
  var el = document.getElementById('ingredientiContent');
  if (!el) return;
  if (typeof renderDayIngGrid === 'function') {
    /* Rimappa il target su ingredientiContent */
    var orig = document.getElementById('dayIngGrid');
    if (!orig) {
      var proxy = document.createElement('div');
      proxy.id = 'dayIngGrid';
      el.innerHTML = '';
      el.appendChild(proxy);
    }
    renderDayIngGrid();
    /* Sposta il contenuto reso in ingredientiContent */
    var grid = document.getElementById('dayIngGrid');
    if (grid && grid.parentElement !== el) {
      el.innerHTML = '';
      el.appendChild(grid);
    }
  }
  if (typeof renderFridgeRecipes === 'function') renderFridgeRecipes();
}

/* ── signOut → usa quella in firebase-config.js ─────── */
if (typeof signOut === 'undefined') {
  function signOut() {
    if (typeof signOutUser === 'function') signOutUser();
  }
}

/* ── Aggiorna cloud status (alias per firebase-config) ── */
function updateCloudStatus(state, text) {
  if (typeof showCloudStatus === 'function') showCloudStatus(state);
}
