/* ---- ICONA ---- */
function drawAppIcon(canvas, size) {
    size = size || 512;
    canvas.width = size; canvas.height = size;
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
    ctx.fillStyle = grad; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(size * 0.3, size * 0.25, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold ' + Math.round(size * 0.52) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = size * 0.04;
    ctx.fillText('\uD83C\uDF3F', size / 2, size * 0.52);
}

function initIcons() {
    var hc = document.getElementById('headerIcon');
    if (hc) drawAppIcon(hc, 32);
    var lc = document.createElement('canvas');
    drawAppIcon(lc, 90);
    var ldiv = document.getElementById('landingLogo');
    if (ldiv) { ldiv.innerHTML = ''; ldiv.appendChild(lc); }
    var bigCanvas = document.createElement('canvas');
    drawAppIcon(bigCanvas, 512);
    var iconUrl = bigCanvas.toDataURL('image/png');
    var ati = document.getElementById('appleTouchIcon');
    if (ati) ati.href = iconUrl;
    var mf = { name: 'NutriPlan', short_name: 'NutriPlan', start_url: '/', display: 'standalone',
        background_color: '#4a9b7f', theme_color: '#4a9b7f',
        icons: [{ src: iconUrl, sizes: '512x512', type: 'image/png' }] };
    var mp = document.getElementById('manifest-placeholder');
    if (mp) mp.href = URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: 'application/json' }));
}

/* ---- DARK MODE ---- */
function initDarkMode() {
    var saved = localStorage.getItem('nutriplanDark');
    var prefersDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
    applyDarkMode(saved !== null ? saved === '1' : prefersDark, false);
}
function applyDarkMode(isDark, save) {
    if (save === undefined) save = true;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    var btn = document.getElementById('darkToggle');
    if (btn) btn.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
    var meta = document.getElementById('metaThemeColor');
    if (meta) meta.content = isDark ? '#152318' : '#4a9b7f';
    if (save) localStorage.setItem('nutriplanDark', isDark ? '1' : '0');
}
function toggleDarkMode() {
    applyDarkMode(document.documentElement.getAttribute('data-theme') !== 'dark');
}

/* ---- IOS / PWA ---- */
function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isInStandaloneMode() {
    return window.navigator.standalone === true ||
        window.matchMedia('(display-mode:standalone)').matches;
}
function closeIosBanner() {
    document.getElementById('iosBanner').classList.remove('show');
    localStorage.setItem('iosBannerDismissed', '1');
}
function initIosBanner() {
    if (isIos() && !isInStandaloneMode() && !localStorage.getItem('iosBannerDismissed')) {
        setTimeout(function () { document.getElementById('iosBanner').classList.add('show'); }, 2000);
    }
}

var deferredPrompt;
window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredPrompt = e;
    if (!localStorage.getItem('installDismissed'))
        document.getElementById('installBanner').classList.add('show');
});
document.getElementById('installBtn').addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); deferredPrompt = null;
    document.getElementById('installBanner').classList.remove('show');
});
document.getElementById('dismissBtn').addEventListener('click', function () {
    document.getElementById('installBanner').classList.remove('show');
    localStorage.setItem('installDismissed', '1');
});

window.addEventListener('online', function () { document.getElementById('offlineIndicator').classList.remove('show'); });
window.addEventListener('offline', function () { document.getElementById('offlineIndicator').classList.add('show'); });

/* ---- SERVICE WORKER ---- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        var lines = [
            "var C='nutriplan-v8';",
            "var A=['/','/index.html','/style.css','/firebase-config.js','/data.js','/storage.js',",
            "'/app.js','/piano.js','/dispensa.js','/ricette.js','/storico.js',",
            "'/spesa.js','/statistiche.js','/pdf.js','/ricette_custom.js','/profilo.js'];",
            "self.addEventListener('install',function(e){",
            "e.waitUntil(caches.open(C).then(function(c){return c.addAll(A).catch(function(){});}));});",
            "self.addEventListener('fetch',function(e){",
            "e.respondWith(caches.match(e.request).then(function(r){",
            "return r||fetch(e.request).catch(function(){return caches.match('/index.html');});}));});",
            "self.addEventListener('activate',function(e){",
            "e.waitUntil(caches.keys().then(function(ks){",
            "return Promise.all(ks.map(function(k){if(k!==C)return caches.delete(k);}));}));});"
        ];
        try {
            navigator.serviceWorker.register(
                URL.createObjectURL(new Blob([lines.join('\n')], { type: 'application/javascript' }))
            ).catch(function () {});
        } catch (e) {}
    });
}

/* ---- CALENDARIO ---- */
var DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
var MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function buildCalendarBar() {
    var bar = document.getElementById('calendarBar');
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var html = '';
    for (var i = -30; i <= 30; i++) {
        var d = new Date(today); d.setDate(today.getDate() + i);
        var dk = formatDateKey(d);
        var isToday = dk === getCurrentDateKey();
        var isActive = dk === selectedDateKey;
        var hd = appHistory[dk] || {};
        var hasData = Object.keys(hd.usedItems || {}).some(function (mk) {
            return Object.keys((hd.usedItems || {})[mk] || {}).length > 0;
        });
        var isPast = d < today && !isToday;
        var cls = 'cal-day' + (isToday ? ' today' : '') + (isActive ? ' active' : '') +
            (hasData ? ' has-data' : '') + (isPast ? ' cal-past' : '');
        html += '<div class="' + cls + '" onclick="selectCalendarDay(\'' + dk + '\')">';
        html += '<div class="cal-dow">' + DAYS_IT[d.getDay()] + '</div>';
        html += '<div class="cal-num">' + d.getDate() + '</div>';
        html += '<div class="cal-mon">' + MONTHS_IT[d.getMonth()] + '</div>';
        html += '</div>';
    }
    bar.innerHTML = html;
    setTimeout(function () {
        var active = bar.querySelector('.cal-day.active');
        if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 100);
}

function formatDateKey(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function selectCalendarDay(dk) {
    selectedDateKey = dk;
    var d = new Date(dk + 'T00:00:00');
    document.getElementById('currentDateLabel').textContent =
        DAYS_IT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_IT[d.getMonth()] + ' ' + d.getFullYear();
    getDayData(dk);
    buildCalendarBar();
    renderMealPlan();
}

/* ---- ENTER APP ---- */
function enterApp() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('mainApp').classList.add('active');
    loadData();
    initFirebase();
    selectedDateKey = getCurrentDateKey();
    getDayData(selectedDateKey);
    buildCalendarBar();
    selectCalendarDay(selectedDateKey);
    renderPantry();
    renderFridge();
    updateLimits();
    initDayIngGrid();
    updateFridgeSuggestions();
    initIosBanner();
    if (typeof initIngredientiDatalist === 'function') initIngredientiDatalist();
}

/* ---- NAVIGAZIONE ---- */
function showPage(name, btn) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
    document.getElementById(name + 'Page').classList.add('active');
    if (btn) btn.classList.add('active');
    if (name === 'frigo') { renderFridge(); updateSavedFridges(); }
    if (name === 'limiti') updateLimits();
    if (name === 'dispensa') renderPantry();
    if (name === 'storico') renderStorico();
    if (name === 'statistiche') renderStatistiche();
    if (name === 'ricette') renderRicettePage();
    if (name === 'spesa') renderSpesa();
    if (name === 'profilo') renderProfilo();
}

function showPianoTab(tab, btn) {
    document.querySelectorAll('.page-tab-content').forEach(function (c) { c.classList.remove('active'); });
    document.querySelectorAll('#pianoPage .page-tab').forEach(function (t) { t.classList.remove('active'); });
    document.getElementById('pianoTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    if (btn) btn.classList.add('active');
    if (tab === 'frigo') updateFridgeSuggestions();
}

/* ---- LIMITI ---- */
function updateLimits() {
    var grid = document.getElementById('limitsGrid');
    if (!grid) return;
    var html = '';
    Object.keys(weeklyLimits).forEach(function (key) {
        var data = weeklyLimits[key];
        var pct = Math.min((data.current / data.max) * 100, 100);
        var cls = pct >= 100 ? 'exceeded' : pct >= 70 ? 'warning' : '';
        html += '<div class="limit-card">';
        html += '<div class="limit-card-icon">' + data.icon + '</div>';
        html += '<div class="limit-card-name">' + key.replace(/_/g, ' ') + '</div>';
        html += '<div class="limit-progress-bar"><div class="limit-progress-fill ' + cls + '" style="width:' + pct + '%"></div></div>';
        html += '<div class="limit-text ' + cls + '">' + data.current + ' / ' + data.max + ' ' + data.unit + '</div>';
        html += '</div>';
    });
    grid.innerHTML = html;
}

function resetWeek() {
    if (!confirm('Resettare tutti i contatori settimanali?')) return;
    Object.keys(weeklyLimits).forEach(function (k) { weeklyLimits[k].current = 0; });
    saveData(); updateLimits(); renderMealPlan();
}

/* ---- MODAL LISTENERS ---- */
['saveFridgeModal','recipeModal','spesaItemModal','customIngModal','ricettaFormModal'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) {
        if (e.target.id === id) {
            if (id === 'saveFridgeModal') closeSaveFridgeModal();
            else if (id === 'recipeModal') closeRecipeModal();
            else if (id === 'spesaItemModal') closeSpesaItemModal();
            else if (id === 'customIngModal') closeCustomIngModal();
            else if (id === 'ricettaFormModal') closeRicettaForm();
        }
    });
});

document.getElementById('fridgeName').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') saveFridge();
});
document.addEventListener('click', function (e) {
    if (!e.target.closest('.sub-drawer') && !e.target.closest('.meal-item-btn')) {
        document.querySelectorAll('.sub-drawer.open').forEach(function (d) { d.classList.remove('open'); });
    }
});

/* ---- INIT ---- */
initIcons();
initDarkMode();
