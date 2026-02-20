function exportPDF() {
    var MEAL_LABELS = {
        colazione: 'Colazione', spuntino: 'Spuntino',
        pranzo: 'Pranzo', merenda: 'Merenda', cena: 'Cena'
    };
    var MEALS_ORDER = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];

    var lines = [];
    lines.push('NutriPlan — Piano Alimentare');
    lines.push('Esportato il: ' + new Date().toLocaleString('it-IT'));
    lines.push('');
    lines.push('═══════════════════════════════════');
    lines.push('');

    // Piano giornaliero
    lines.push('PIANO ALIMENTARE GIORNALIERO');
    lines.push('');
    MEALS_ORDER.forEach(function (meal) {
        var items = (mealPlan[meal] && mealPlan[meal].principale) || [];
        if (!items.length) return;
        lines.push('▸ ' + (MEAL_LABELS[meal] || meal).toUpperCase());
        items.forEach(function (item) {
            lines.push('  • ' + (item.name || '') + '  ' + (item.quantity || '') + ' ' + (item.unit || ''));
        });
        lines.push('');
    });

    lines.push('═══════════════════════════════════');
    lines.push('');

    // Dispensa
    var pantryKeys = Object.keys(pantryItems).filter(function (k) {
        return (pantryItems[k].quantity || 0) > 0;
    });
    if (pantryKeys.length) {
        lines.push('DISPENSA ATTUALE');
        lines.push('');
        pantryKeys.forEach(function (name) {
            var d = pantryItems[name];
            lines.push('  • ' + name + ': ' + d.quantity + ' ' + d.unit);
        });
        lines.push('');
        lines.push('═══════════════════════════════════');
        lines.push('');
    }

    // Storico (ultimi 7 giorni)
    var storicoKeys = Object.keys(appHistory).sort(function (a, b) {
        return b.localeCompare(a);
    }).slice(0, 7);
    if (storicoKeys.length) {
        lines.push('STORICO (ultimi 7 giorni)');
        lines.push('');
        var DAYS_IT   = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        var MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                         'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        storicoKeys.forEach(function (dk) {
            var d = new Date(dk + 'T00:00:00');
            var dayLabel = DAYS_IT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_IT[d.getMonth()];
            var dayData  = appHistory[dk];
            var usedItems = dayData.usedItems || {};
            var totalUsed = 0;
            Object.keys(usedItems).forEach(function (mk) {
                totalUsed += Object.keys(usedItems[mk] || {}).length;
            });
            if (!totalUsed) return;
            lines.push('▸ ' + dayLabel + ' (' + totalUsed + ' alimenti)');
            MEALS_ORDER.forEach(function (meal) {
                var mealUsed = usedItems[meal] || {};
                var mealSubs = (dayData.substitutions || {})[meal] || {};
                var planItems = (mealPlan[meal] && mealPlan[meal].principale) || [];
                Object.keys(mealUsed).forEach(function (name) {
                    var sub = mealSubs[name];
                    var displayName = sub || name;
                    lines.push('  [' + (MEAL_LABELS[meal] || meal) + '] ' + displayName);
                });
            });
            lines.push('');
        });
    }

    var content = lines.join('\n');
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'nutriplan_' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
