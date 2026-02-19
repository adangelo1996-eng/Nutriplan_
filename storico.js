/* ============================================================
   STORICO.JS
   ============================================================ */

var storicoOpenDays = {};

function renderStorico() {
    var el = document.getElementById('storicoContent');
    if (!el) return;

    var keys = Object.keys(appHistory).sort(function (a, b) {
        return b.localeCompare(a);
    });

    /* Filtra solo giorni con almeno un item usato */
    keys = keys.filter(function (dk) {
        var hd = appHistory[dk];
        if (!hd || !hd.usedItems) return false;
        return Object.keys(hd.usedItems).some(function (mk) {
            return Object.keys(hd.usedItems[mk] || {}).length > 0;
        });
    });

    if (!keys.length) {
        el.innerHTML = '<div class="empty-state">'
            + '<div class="empty-state-icon">📅</div>'
            + '<h3>Nessuno storico</h3>'
            + '<p>Inizia a segnare i pasti consumati nella sezione Piano.</p>'
            + '</div>';
        return;
    }

    var DAYS_IT   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    var MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

    var html = '<div class="storico-list">';
    keys.forEach(function (dk) {
        var hd      = appHistory[dk] || {};
        var used    = hd.usedItems  || {};
        var subs    = hd.substitutions || {};
        var d       = new Date(dk + 'T00:00:00');
        var label   = DAYS_IT[d.getDay()] + ' ' + d.getDate() + ' '
                    + MONTHS_IT[d.getMonth()] + ' ' + d.getFullYear();
        var isOpen  = storicoOpenDays[dk];
        var isToday = dk === getCurrentDateKey();

        /* Conta totale item usati */
        var totalUsed = 0;
        Object.keys(used).forEach(function (mk) {
            totalUsed += Object.keys(used[mk] || {}).length;
        });

        html += '<div class="storico-day-card"'
            + ' onclick="toggleStoricoDay(\'' + dk + '\')">';

        /* Header */
        html += '<div class="storico-day-header">'
            + '<div>'
            + '<div class="storico-day-label">'
            + (isToday ? '📍 ' : '') + label + '</div>'
            + '<div class="storico-day-meta">'
            + totalUsed + ' aliment' + (totalUsed === 1 ? 'o' : 'i') + ' consumat'
            + (totalUsed === 1 ? 'o' : 'i') + '</div>'
            + '</div>'
            + '<span style="color:var(--text-light);font-size:1.1em;">'
            + (isOpen ? '▲' : '▼') + '</span>'
            + '</div>';

        /* Dettaglio */
        if (isOpen) {
            html += '<div class="storico-day-detail">';
            var mealDefs = [
                { key: 'colazione', label: '☕ Colazione' },
                { key: 'spuntino',  label: '🍎 Spuntino'  },
                { key: 'pranzo',    label: '🍽 Pranzo'    },
                { key: 'merenda',   label: '🥪 Merenda'   },
                { key: 'cena',      label: '🌙 Cena'      }
            ];
            mealDefs.forEach(function (md) {
                var items   = Object.keys(used[md.key] || {});
                var mSubs   = subs[md.key] || {};
                if (!items.length) return;

                html += '<div class="storico-meal-block">';
                html += '<div class="storico-meal-title">' + md.label + '</div>';
                items.forEach(function (itemName) {
                    var subName = mSubs[itemName];
                    var planItems = getMealItemsForDay(md.key, dk);
                    var planItem  = planItems.find(function (i) { return i.name === itemName; });
                    var qtyText   = planItem && planItem.quantity
                        ? planItem.quantity + ' ' + planItem.unit
                        : '—';
                    html += '<div class="storico-item">';
                    if (subName) {
                        html += '<span>'
                            + '<span style="text-decoration:line-through;opacity:.5;">' + itemName + '</span>'
                            + ' → <b>' + subName + '</b></span>';
                    } else {
                        html += '<span>' + itemName + '</span>';
                    }
                    html += '<span class="storico-item-qty">' + qtyText + '</span>';
                    html += '</div>';
                });
                html += '</div>';
            });

            /* Note sostituzioni generali */
            var hasSubs = Object.keys(subs).some(function (mk) {
                return Object.keys(subs[mk] || {}).length > 0;
            });
            if (hasSubs) {
                html += '<div style="margin-top:8px;font-size:.76em;color:var(--text-light);">'
                    + '🔄 Alcune sostituzioni applicate</div>';
            }

            html += '</div>';
        }

        html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
}

function toggleStoricoDay(dk) {
    storicoOpenDays[dk] = !storicoOpenDays[dk];
    renderStorico();
}

function getMealItemsForDay(mealKey, dateKey) {
    /* Restituisce gli item del piano per un dato giorno
       (usa il piano corrente — idealmente andrebbe salvato per giorno) */
    if (!mealPlan || !mealPlan[mealKey]) return [];
    var m     = mealPlan[mealKey];
    var items = [];
    ['principale', 'contorno', 'frutta', 'extra'].forEach(function (cat) {
        (m[cat] || []).forEach(function (item) {
            items.push(item);
        });
    });
    return items;
}
