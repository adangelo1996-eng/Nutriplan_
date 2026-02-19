function renderStorico() {
    var container = document.getElementById('storicoContent');
    if (!container) return;

    var keys = Object.keys(appHistory).sort(function (a, b) { return b.localeCompare(a); });
    var recentKeys = keys.filter(function (dk) {
        return Object.keys((appHistory[dk].usedItems || {})).some(function (mk) {
            return Object.keys(appHistory[dk].usedItems[mk] || {}).length > 0;
        });
    });

    if (!recentKeys.length) {
        container.innerHTML = '<div class="empty-state">'
            + '<div style="font-size:3em;margin-bottom:12px;">📅</div>'
            + '<h3>Nessuno storico</h3>'
            + '<p>I pasti registrati appariranno qui.</p>'
            + '</div>';
        return;
    }

    var MEAL_LABELS = {
        colazione: '☕ Colazione', spuntino: '🍎 Spuntino',
        pranzo: '🍽️ Pranzo', merenda: '🥪 Merenda', cena: '🌙 Cena'
    };
    var DAYS_IT   = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    var MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                     'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

    var html = '<div class="storico-list">';

    recentKeys.forEach(function (dk) {
        var d = new Date(dk + 'T00:00:00');
        var isToday = dk === getCurrentDateKey();
        var dayLabel = isToday
            ? 'Oggi'
            : DAYS_IT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_IT[d.getMonth()] + ' ' + d.getFullYear();

        var dayData  = appHistory[dk];
        var usedItems = dayData.usedItems || {};
        var subs      = dayData.substitutions || {};

        // Conta totale pasti usati
        var totalUsed = 0;
        Object.keys(usedItems).forEach(function (mk) {
            totalUsed += Object.keys(usedItems[mk] || {}).length;
        });

        html += '<div class="storico-day-card" onclick="toggleStoricoDay(\'' + dk + '\')">';
        html += '<div class="storico-day-header">';
        html += '<div class="storico-day-label">'
            + (isToday ? '📍 ' : '📅 ') + dayLabel + '</div>';
        html += '<div class="storico-day-meta">'
            + totalUsed + ' aliment' + (totalUsed === 1 ? 'o' : 'i') + ' registrat'
            + (totalUsed === 1 ? 'o' : 'i')
            + ' <span class="storico-toggle-icon">▼</span></div>';
        html += '</div>';
        html += '<div class="storico-day-detail" id="storicoDetail_' + dk + '" style="display:none;">';

        var MEALS_ORDER = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
        MEALS_ORDER.forEach(function (meal) {
            var mealUsed = usedItems[meal] || {};
            var mealSubs = subs[meal] || {};
            var planItems = (mealPlan[meal] && mealPlan[meal].principale) || [];
            var usedCount = Object.keys(mealUsed).length;
            if (!usedCount) return;

            html += '<div class="storico-meal-block">';
            html += '<div class="storico-meal-title">' + (MEAL_LABELS[meal] || meal) + '</div>';

            Object.keys(mealUsed).forEach(function (idx) {
                var i = parseInt(idx);
                var base = planItems[i] || { label: '?', qty: 0, unit: '' };
                var sub  = mealSubs[i];
                var eff  = sub || base;
                html += '<div class="storico-item">';
                if (sub) {
                    html += '<span class="storico-item-name">'
                        + '<span style="text-decoration:line-through;opacity:.5;">' + base.label + '</span>'
                        + ' → ' + sub.label + '</span>';
                } else {
                    html += '<span class="storico-item-name">' + eff.label + '</span>';
                }
                html += '<span class="storico-item-qty">' + eff.qty + ' ' + eff.unit + '</span>';
                html += '</div>';
            });

            html += '</div>';
        });

        // Pulsante vai al giorno
        html += '<button class="btn btn-secondary btn-small storico-goto-btn" '
            + 'onclick="event.stopPropagation();gotoStoricoDay(\'' + dk + '\')">'
            + '📅 Vai a questo giorno</button>';
        html += '</div>';
        html += '</div>';
    });

    html += '</div>';

    // Pulsante reset storico
    html += '<div style="text-align:center;margin-top:20px;">';
    html += '<button class="btn btn-warning btn-small" onclick="clearStorico()">🗑️ Cancella storico</button>';
    html += '</div>';

    container.innerHTML = html;
}

function toggleStoricoDay(dk) {
    var el = document.getElementById('storicoDetail_' + dk);
    if (!el) return;
    var isOpen = el.style.display !== 'none';
    el.style.display = isOpen ? 'none' : 'block';
    // Ruota la freccia
    var card = el.closest('.storico-day-card');
    if (card) {
        var icon = card.querySelector('.storico-toggle-icon');
        if (icon) icon.textContent = isOpen ? '▼' : '▲';
    }
}

function gotoStoricoDay(dk) {
    if (typeof selectCalendarDay === 'function') selectCalendarDay(dk);
    if (typeof showPage === 'function') {
        showPage('piano', document.querySelector('.nav-tab'));
        document.querySelectorAll('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelector('.nav-tab').classList.add('active');
    }
}

function clearStorico() {
    if (!confirm('Cancellare tutto lo storico? Questa azione non è reversibile.')) return;
    appHistory = {};
    saveData();
    renderStorico();
}
