function renderStatistiche() {
    var container = document.getElementById('statisticheContent');
    if (!container) return;

    var MEALS_ORDER  = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
    var MEAL_LABELS  = {
        colazione: '☕ Colazione', spuntino: '🍎 Spuntino',
        pranzo: '🍽️ Pranzo', merenda: '🥪 Merenda', cena: '🌙 Cena'
    };
    var DAYS_IT   = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    var MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                     'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

    // Calcola statistiche
    var keys = Object.keys(appHistory).sort();
    var activeDays = 0;
    var totalUsed  = 0;
    var mealCounts = {};
    var ingCounts  = {};
    var last7 = [];

    MEALS_ORDER.forEach(function (m) { mealCounts[m] = 0; });

    var today = new Date(); today.setHours(0,0,0,0);
    var cutoff7 = new Date(today); cutoff7.setDate(today.getDate() - 6);

    keys.forEach(function (dk) {
        var dayData   = appHistory[dk];
        var usedItems = dayData.usedItems || {};
        var dayTotal  = 0;

        MEALS_ORDER.forEach(function (meal) {
            var mealUsed  = usedItems[meal] || {};
            var mealSubs  = (dayData.substitutions || {})[meal] || {};
            var planItems = (mealPlan[meal] && mealPlan[meal].principale) || [];
            var mealCount = Object.keys(mealUsed).length;
            mealCounts[meal] = (mealCounts[meal] || 0) + mealCount;
            dayTotal += mealCount;
            totalUsed += mealCount;

            Object.keys(mealUsed).forEach(function (idx) {
                var i    = parseInt(idx);
                var base = planItems[i] || {};
                var sub  = mealSubs[i];
                var name = (sub ? sub.label : base.label) || '';
                if (name) ingCounts[name] = (ingCounts[name] || 0) + 1;
            });
        });

        if (dayTotal > 0) activeDays++;

        var d = new Date(dk + 'T00:00:00');
        if (d >= cutoff7) {
            last7.push({ dk: dk, count: dayTotal, d: d });
        }
    });

    // Top 5 ingredienti
    var topIngs = Object.keys(ingCounts)
        .map(function (k) { return { name: k, count: ingCounts[k] }; })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 5);

    // Aderenza pasti
    var maxMeal = Math.max.apply(null, Object.values(mealCounts).concat([1]));

    var html = '';

    // === RIEPILOGO ===
    html += '<div class="stat-cards-row">';
    html += buildStatCard('📅', 'Giorni attivi', activeDays, '');
    html += buildStatCard('✅', 'Alimenti registrati', totalUsed, 'totali');
    html += buildStatCard('📖', 'Ricette', countAllRecipes(), 'disponibili');
    html += buildStatCard('🧺', 'In dispensa',
        Object.values(pantryItems).filter(function (p) { return (p.quantity||0)>0; }).length, 'ingredienti');
    html += '</div>';

    // === ULTIMI 7 GIORNI ===
    html += '<div class="stat-section">';
    html += '<h3 class="stat-section-title">📆 Ultimi 7 giorni</h3>';
    if (!last7.length) {
        html += '<div class="stat-empty">Nessun dato negli ultimi 7 giorni.</div>';
    } else {
        var maxDay = Math.max.apply(null, last7.map(function (x) { return x.count; }).concat([1]));
        html += '<div class="stat-bar-chart">';
        // Mostra tutti e 7 i giorni (anche vuoti)
        for (var i = 0; i < 7; i++) {
            var d = new Date(today); d.setDate(today.getDate() - (6 - i));
            var dk = d.getFullYear() + '-'
                + String(d.getMonth()+1).padStart(2,'0') + '-'
                + String(d.getDate()).padStart(2,'0');
            var found = last7.find(function (x) { return x.dk === dk; });
            var count = found ? found.count : 0;
            var pct   = Math.round((count / maxDay) * 100);
            var isToday = dk === getCurrentDateKey();
            html += '<div class="stat-bar-col">';
            html += '<div class="stat-bar-val">' + (count || '') + '</div>';
            html += '<div class="stat-bar-wrap">'
                + '<div class="stat-bar-fill' + (isToday ? ' today' : '') + '" style="height:' + pct + '%"></div>'
                + '</div>';
            html += '<div class="stat-bar-label">' + DAYS_IT[d.getDay()] + '<br>'
                + d.getDate() + ' ' + MONTHS_IT[d.getMonth()] + '</div>';
            html += '</div>';
        }
        html += '</div>';
    }
    html += '</div>';

    // === ADERENZA PER PASTO ===
    html += '<div class="stat-section">';
    html += '<h3 class="stat-section-title">🍽️ Aderenza per pasto</h3>';
    html += '<div class="stat-meal-bars">';
    MEALS_ORDER.forEach(function (meal) {
        var count = mealCounts[meal] || 0;
        var pct   = activeDays > 0 ? Math.round((count / (activeDays * ((mealPlan[meal] && mealPlan[meal].principale && mealPlan[meal].principale.length) || 1))) * 100) : 0;
        pct = Math.min(pct, 100);
        var cls = pct >= 80 ? 'great' : pct >= 50 ? 'ok' : 'low';
        html += '<div class="stat-meal-row">';
        html += '<div class="stat-meal-label">' + MEAL_LABELS[meal] + '</div>';
        html += '<div class="stat-meal-bar-wrap">'
            + '<div class="stat-meal-bar-fill ' + cls + '" style="width:' + pct + '%"></div>'
            + '</div>';
        html += '<div class="stat-meal-pct">' + pct + '%</div>';
        html += '</div>';
    });
    html += '</div></div>';

    // === TOP INGREDIENTI ===
    if (topIngs.length) {
        html += '<div class="stat-section">';
        html += '<h3 class="stat-section-title">🏆 Alimenti più consumati</h3>';
        html += '<div class="stat-top-list">';
        topIngs.forEach(function (item, idx) {
            var medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
            html += '<div class="stat-top-item">';
            html += '<span class="stat-top-rank">' + (medals[idx] || (idx+1)) + '</span>';
            html += '<span class="stat-top-name">' + item.name + '</span>';
            html += '<span class="stat-top-count">' + item.count + 'x</span>';
            html += '</div>';
        });
        html += '</div></div>';
    }

    // === DISPENSA ===
    var pantryFull = Object.values(pantryItems).filter(function (p) { return (p.quantity||0) > 0; }).length;
    var pantryTotal = Object.keys(pantryItems).length;
    html += '<div class="stat-section">';
    html += '<h3 class="stat-section-title">🧺 Stato dispensa</h3>';
    html += '<div class="stat-cards-row">';
    html += buildStatCard('✅', 'Disponibili', pantryFull, 'ingredienti');
    html += buildStatCard('📦', 'Totale tracciati', pantryTotal, 'ingredienti');
    html += buildStatCard('⭐', 'Ricette custom', customRecipes.length, '');
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
}

function buildStatCard(icon, label, value, unit) {
    return '<div class="stat-card">'
        + '<div class="stat-card-icon">' + icon + '</div>'
        + '<div class="stat-card-value">' + value + '</div>'
        + '<div class="stat-card-label">' + label + '</div>'
        + (unit ? '<div class="stat-card-unit">' + unit + '</div>' : '')
        + '</div>';
}
