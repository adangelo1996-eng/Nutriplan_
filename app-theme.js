/* ============================================================
   APP-THEME.JS — Icone, dark mode, iOS/PWA
============================================================ */

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
  var hc = document.getElementById('headerIcon');
  if (hc && hc.tagName === 'CANVAS') drawAppIcon(hc, 32);
  var lc = document.createElement('canvas');
  drawAppIcon(lc, 90);
  var ldiv = document.getElementById('landingLogo');
  if (ldiv) { ldiv.innerHTML = ''; ldiv.appendChild(lc); }
}

function initDarkMode() {
  var saved = localStorage.getItem('nutriplanDark');
  applyDarkMode(saved !== null ? saved === '1' : false, false);
}

function applyDarkMode(isDark, save) {
  if (save === undefined) save = true;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
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

function toggleDarkMode() {
  applyDarkMode(document.documentElement.getAttribute('data-theme') !== 'dark');
}
function toggleTheme() { toggleDarkMode(); }

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isInStandaloneMode() {
  return window.navigator.standalone === true ||
         window.matchMedia('(display-mode:standalone)').matches;
}

function closeIosBanner() { dismissIosBanner(); }
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
  _wireInstallPwaBtn();
});

function _wireInstallPwaBtn() {
  var btn = document.getElementById('installPwaBtn');
  if (!btn || btn._installWired) return;
  btn._installWired = true;
  btn.addEventListener('click', function() {
    if (typeof installPwa === 'function') installPwa();
  });
}

function installPwa() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function() { deferredPrompt = null; });
    dismissInstallBanner();
    return;
  }
  if (isIos()) {
    var b = document.getElementById('iosBanner');
    if (b) b.classList.add('show');
    if (typeof showToast === 'function') showToast('Usa Condividi → Aggiungi a Home per installare l\'app', 'info');
  } else if (typeof showToast === 'function') {
    showToast('Installa da menu del browser (⋮ → Installa app) o riprova più tardi', 'info');
  }
}
function dismissInstallBanner() {
  var b = document.getElementById('installPwaBanner');
  if (b) b.style.display = 'none';
  localStorage.setItem('installDismissed', '1');
}
