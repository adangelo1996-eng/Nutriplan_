/* ============================================================
   STATISTICHE.JS
   ============================================================ */

function renderStatistiche() {
    var el = document.getElementById('statisticheContent');
    if (!el) return;

    var html = '';

    /* ---- STAT CARDS ---- */
    var stats = computeStats();
    html += '<div class="stat-cards-row">'
        + statCard('📅', stats.totalDays,    'Giorni tracciati', '')
        + statCard('✅', stats.totalUsed,    'Pasti consumati',  '')
        + statCard('🔄', stats.totalSubs,    'Sostituzioni',     '')
        + statCard('🏆', stats.bestStreak,   'Giorni di fila',   '')
        + '</div>';

    /* ---- GRAFICO SETTIMANALE ---- */
    html += '<div class="stat-section">';
    html += '<div class="stat-section-title">📊 Ultimi 7 giorni</div>';
    html += buildWeekChart();
    html += '</div>';

    /* ---- COMPLETAMENTO PER PASTO ---- */
    html += '<div class="stat-section">';
    html += '<div class="stat-section-title">🍽 Completamento per pasto</div>';
    html += buildMealCompletionBars();
    html += '</div>';

    /* ---- TOP ALIMENTI ---- */
    html += '<div class="stat-section">';
    html += '<div class="stat-section-title">⭐ Alimenti più usati</div>';
    html += buildTopFoods();
    html += '</div>';

    /* ---- LIMITI SETTIMANALI ---- */
    html += '<div class="stat-section">';
    html += '<div class="stat-section-title">📋 Limiti settimanali</div>';
    html += buildLimitsSummary();
    html += '</div>';

    el.innerHTML = html;
}

/* ---- STAT CARD ---- */
function statCard(icon, value, label, unit) {
    return '<div class="stat-card">'
        + '<div class="stat-card-icon">'  + icon  + '</div>'
        + '<div class="stat-card-value">' + value + '</div>'
        + '<div class="stat-card-label">' + label + '</div>'
        + (unit ? '<div class="stat-card-unit">' + unit + '</div>' : '')
        + '</div>';
}

/* ---- COMPUTE STATS ---- */
function computeStats() {
    var totalDays = 0, totalUsed = 0, totalSubs = 0;
    var streak = 0, bestStreak = 0, lastDate = null;

    var keys = Object.keys(appHistory).sort();
    keys.forEach(function (dk) {
        var hd  = appHistory[dk] || {};
        var used = hd.usedItems || {};
        var subs = hd.substitutions || {};

        var dayUsed = 0;
        Object.keys(used).forEach(function (mk) {
            dayUsed += Object.keys(used[mk] || {}).length;
        });
        if (!dayUsed) return;

        totalDays++;
        totalUsed += dayUsed;

        Object.keys(subs).forEach(function (mk) {
            totalSubs += Object.keys(subs[mk] || {}).length;
        });

        /* Streak */
        if (lastDate) {
            var prev = new Date(lastDate + 'T00:00:00');
            var curr = new Date(dk       + 'T00:00:00');
            var diff = (curr - prev) / 86400000;
            if (diff === 1) {
                streak++;
            } else {
                streak = 1;
            }
        } else {
            streak = 1;
        }
        bestStreak = Math.max(bestStreak, streak);
        lastDate   = dk;
    });

    return { totalDays: totalDays, totalUsed: totalUsed, totalSubs: totalSubs, bestStreak: bestStreak };
}

/* ---- GRAFICO SETTIMANA ---- */
function buildWeekChart() {
    var DAYS_SHORT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    var today      = new Date(); today.setHours(0,0,0,0);
    var days       = [];

    for (var i = 6; i >= 0; i--) {
        var d = new Date(today); d.setDate(today.getDate() - i);
        var dk = formatDateKey(d);
        var hd = appHistory[dk] || {};
        var used = hd.usedItems || {};
        var count = 0;
        Object.keys(used).forEach(function (mk) {
            count += Object.keys(used[mk] || {}).length;
        });
        days.push({ dk: dk, label: DAYS_SHORT[d.getDay()], count: count, isToday: i === 0 });
    }

    var maxVal = Math.max.apply(null, days.map(function (d) { return d.count; })) || 1;

    var html = '<div class="stat-bar-chart">';
    days.forEach(function (d) {
        var h   = maxVal > 0 ? Math.round((d.count / maxVal) * 100) : 0;
        var cls = 'stat-bar-fill' + (d.isToday ? ' today' : '');
        html += '<div class="stat-bar-col">'
            + '<div class="stat-bar-val">' + (d.count || '') + '</div>'
            + '<div class="stat-bar-wrap">'
            + '<div class="' + cls + '" style="height:' + h + '%"></div>'
            + '</div>'
            + '<div class="stat-bar-label">' + d.label + '</div>'
            + '</div>';
    });
    html += '</div>';
    return html;
}

/* ---- COMPLETAMENTO PER PASTO ---- */
function buildMealCompletionBars() {
    var mealDefs = [
        { key: 'colazione', label: '☕ Colazione' },
        { key: 'spuntino',  label: '🍎 Spuntino'  },
        { key: 'pranzo',    label: '🍽 Pranzo'    },
        { key: 'merenda',   label: '🥪 Merenda'   },
        { key: 'cena',      label: '🌙 Cena'      }
    ];

    var mealTotals = {};
    var mealUsedCount = {};
    mealDefs.forEach(function (md) {
        mealTotals[md.key]    = 0;
        mealUsedCount[md.key] = 0;
    });

    Object.keys(appHistory).forEach(function (dk) {
        var hd   = appHistory[dk] || {};
        var used = hd.usedItems || {};
        mealDefs.forEach(function (md) {
            var items = getMealItemsForStats(md.key);
            mealTotals[md.key]    += items.length;
            mealUsedCount[md.key] += Object.keys(used[md.key] || {}).length;
        });
    });

    var hasData = mealDefs.some(function (md) { return mealTotals[md.key] > 0; });
    if (!hasData) return '<div class="stat-empty">Nessun dato disponibile.</div>';

    var html = '<div class="stat-meal-bars">';
    mealDefs.forEach(function (md) {
        var tot = mealTotals[md.key];
        var usd = mealUsedCount[md.key];
        var pct = tot > 0 ? Math.round((usd / tot) * 100) : 0;
        var cls = pct >= 80 ? 'great' : pct >= 50 ? 'ok' : 'low';
        html += '<div class="stat-meal-row">'
            + '<div class="stat-meal-label">' + md.label + '</div>'
            + '<div class="stat-meal-bar-wrap">'
            + '<div class="stat-meal-bar-fill ' + cls + '" style="width:' + pct + '%"></div>'
            + '</div>'
            + '<div class="stat-meal-pct">' + pct + '%</div>'
            + '</div>';
    });
    html += '</div>';
    return html;
}

/* ---- TOP ALIMENTI ---- */
function buildTopFoods() {
    var counts = {};
    Object.keys(appHistory).forEach(function (dk) {
        var hd   = appHistory[dk] || {};
        var used = hd.usedItems || {};
        Object.keys(used).forEach(function (mk) {
            Object.keys(used[mk] || {}).forEach(function (name) {
                counts[name] = (counts[name] || 0) + 1;
            });
        });
    });

    var sorted = Object.keys(counts).sort(function (a, b) {
        return counts[b] - counts[a];
    }).slice(0, 8);

    if (!sorted.length) return '<div class="stat-empty">Nessun alimento consumato.</div>';

    var medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
    var html = '<div class="stat-top-list">';
    sorted.forEach(function (name, i) {
        html += '<div class="stat-top-item">'
            + '<div class="stat-top-rank">' + (medals[i] || (i + 1) + '.') + '</div>'
            + '<div class="stat-top-name">'  + name + '</div>'
            + '<div class="stat-top-count">' + counts[name] + '×</div>'
            + '</div>';
    });
    html += '</div>';
    return html;
}

/* ---- LIMITI SUMMARY ---- */
function buildLimitsSummary() {
    if (!weeklyLimits || !Object.keys(weeklyLimits).length) {
        return '<div class="stat-empty">Nessun limite configurato.</div>';
    }
    var html = '<div class="limits-grid">';
    Object.keys(weeklyLimits).forEach(function (key) {
        var data = weeklyLimits[key];
        var pct  = Math.min(Math.round((data.current / data.max) * 100), 100);
        var cls  = pct >= 100 ? 'exceeded' : pct >= 70 ? 'warning' : '';
        html += '<div class="limit-card">'
            + '<div class="limit-card-icon">'  + data.icon + '</div>'
            + '<div class="limit-card-name">'  + key.replace(/_/g,' ') + '</div>'
            + '<div class="limit-progress-bar">'
            + '<div class="limit-progress-fill ' + cls + '" style="width:' + pct + '%"></div>'
            + '</div>'
            + '<div class="limit-text ' + cls + '">'
            + data.current + '/' + data.max + ' ' + data.unit + '</div>'
            + '</div>';
    });
    html += '</div>';
    return html;
}

/* ---- UTILITY ---- */
function getMealItemsForStats(mealKey) {
    if (!mealPlan || !mealPlan[mealKey]) return [];
    var m = mealPlan[mealKey];
    var items = [];
    ['principale','contorno','frutta','extra'].forEach(function (cat) {
        (m[cat] || []).forEach(function (item) { items.push(item); });
    });
    return items;
}

function formatDateKey(d) {
    return d.getFullYear() + '-'
        + String(d.getMonth() + 1).padStart(2,'0') + '-'
        + String(d.getDate()).padStart(2,'0');
}
