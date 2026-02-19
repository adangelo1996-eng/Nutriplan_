/* ============================================================
   PIANO.JS — gestione piano pasti, frigo, ingredienti giorno
   ============================================================ */

var selectedMeal = 'colazione';

/* ---- INIT ---- */
function initMealSelector() {
    var meals = [
        { key: 'colazione', label: '☕ Colazione' },
        { key: 'spuntino',  label: '🍎 Spuntino'  },
        { key: 'pranzo',    label: '🍽 Pranzo'    },
        { key: 'merenda',   label: '🥪 Merenda'   },
        { key: 'cena',      label: '🌙 Cena'      }
    ];
    var wrap = document.getElementById('mealSelector');
    if (!wrap) return;
    wrap.innerHTML = meals.map(function (m) {
        var active = m.key === selectedMeal ? ' active' : '';
        return '<button class="meal-btn' + active + '" onclick="selectMeal(\'' + m.key + '\', this)">'
            + m.label + '</button>';
    }).join('');
}

function selectMeal(meal, btn) {
    selectedMeal = meal;
    document.querySelectorAll('.meal-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    renderMealItems();
    renderMealProgress();
}

/* ---- RENDER PIANO COMPLETO ---- */
function renderMealPlan() {
    initMealSelector();
    renderMealProgress();
    renderMealItems();
}

/* ---- PROGRESS BAR ---- */
function renderMealProgress() {
    var wrap = document.getElementById('mealProgressWrap');
    if (!wrap) return;

    var dayData   = getDayData(selectedDateKey);
    var usedItems = dayData.usedItems || {};
    var totalItems = 0, usedCount = 0;

    var mealKeys = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
    mealKeys.forEach(function (mk) {
        var plan = getMealItems(mk);
        totalItems += plan.length;
        var used = usedItems[mk] || {};
        plan.forEach(function (item) {
            if (used[item.name]) usedCount++;
        });
    });

    if (totalItems === 0) { wrap.innerHTML = ''; return; }
    var pct = Math.round((usedCount / totalItems) * 100);

    wrap.innerHTML =
        '<div class="meal-progress-wrap">'
        + '<div class="meal-progress-top">'
        + '<span class="meal-progress-title">📋 Progresso giornaliero</span>'
        + '<span class="meal-progress-count">' + usedCount + ' / ' + totalItems + ' (' + pct + '%)</span>'
        + '</div>'
        + '<div class="meal-progress-bar">'
        + '<div class="meal-progress-fill" style="width:' + pct + '%"></div>'
        + '</div></div>';
}

/* ---- GET ITEMS DEL PASTO ---- */
function getMealItems(mealKey) {
  if (!mealPlan || !mealPlan[mealKey]) return [];
  var m = mealPlan[mealKey];
  var items = [];
  ['principale', 'contorno', 'frutta', 'extra'].forEach(function (cat) {
    if (Array.isArray(m[cat])) {
      m[cat].forEach(function (item) {
        /* Salta item null, non-oggetto o senza name stringa */
        if (!item || typeof item !== 'object' ||
            !item.name || typeof item.name !== 'string' ||
            !item.name.trim()) return;
        items.push(Object.assign({}, item, { _cat: cat }));
      });
    }
  });
  return items;
}


/* ---- RENDER ITEMS ---- */
function renderMealItems() {
    var list = document.getElementById('mealItemsList');
    if (!list) return;

    var items     = getMealItems(selectedMeal);
    var dayData   = getDayData(selectedDateKey);
    var usedItems = dayData.usedItems || {};
    var mealUsed  = usedItems[selectedMeal] || {};
    var subs      = dayData.substitutions || {};
    var mealSubs  = subs[selectedMeal] || {};

    if (!items.length) {
        list.innerHTML = '<div class="empty-state">'
            + '<div class="empty-state-icon">🥗</div>'
            + '<h3>Nessun alimento</h3>'
            + '<p>Per questo pasto non è stato impostato alcun alimento nel piano.</p>'
            + '</div>';
        return;
    }

    var html = '';
    items.forEach(function (item) {
        var isUsed   = !!mealUsed[item.name];
        var subName  = mealSubs[item.name];
        var avail    = checkIngredientAvailability(item);
        var dispName = subName || item.name;

        /* Stato */
        var statusClass, statusIcon;
        if (isUsed) {
            statusClass = 'used';   statusIcon = '✅';
        } else if (avail.sufficient) {
            statusClass = 'available'; statusIcon = '🟢';
        } else if (avail.matched && !avail.sufficient) {
            statusClass = 'partial';   statusIcon = '🟡';
        } else {
            statusClass = 'missing';   statusIcon = '🔴';
        }

        /* Riga quantità */
        var qtyLine = '';
        if (item.quantity && item.unit) {
            qtyLine = item.quantity + ' ' + item.unit;
        }

        /* Riga disponibilità */
        var availLine = '';
        if (!isUsed && avail.matched) {
            if (avail.sufficient) {
                availLine = '<div class="meal-item-avail">✔ Disponibile: '
                    + Math.round(avail.available) + ' ' + avail.availableUnit + '</div>';
            } else if (avail.incompatibleUnits) {
                availLine = '<div class="meal-item-miss">⚠ Unità incompatibili</div>';
            } else {
                availLine = '<div class="meal-item-miss">⚠ Solo '
                    + Math.round(avail.available) + ' ' + avail.availableUnit
                    + ' (servono ' + item.quantity + ' ' + item.unit + ')</div>';
            }
        } else if (!isUsed && !avail.matched) {
            availLine = '<div class="meal-item-miss">✖ Non in dispensa</div>';
        }

        /* Nome con eventuale sostituzione */
        var nameLine = '';
        if (subName) {
            nameLine = '<span class="meal-item-orig">' + item.name + '</span>'
                + ' <span class="meal-item-arrow">→</span>'
                + ' <span class="meal-item-sub">' + subName + '</span>';
        } else {
            nameLine = '<span class="meal-item-name">' + item.name + '</span>';
        }

        /* Pulsanti azione */
        var actions = '';
        if (isUsed) {
            actions = '<button class="meal-item-btn unuse-btn" title="Segna come non usato"'
                + ' onclick="unuseItem(\'' + selectedMeal + '\',\'' + escQ(item.name) + '\')">↩</button>';
        } else {
            actions = '<button class="meal-item-btn use-btn" title="Segna come usato"'
                + ' onclick="useItem(\'' + selectedMeal + '\',\'' + escQ(item.name) + '\')">✔</button>'
                + '<button class="meal-item-btn sub-btn" title="Sostituisci"'
                + ' onclick="toggleSubDrawer(\'' + escQ(item.name) + '\')">🔄</button>';
        }

        var drawerId = 'sub_' + item.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

        html += '<div>';
        html += '<div class="meal-item ' + statusClass + '">'
            + '<div class="meal-item-status">' + statusIcon + '</div>'
            + '<div class="meal-item-info">'
            + '<div class="meal-item-name">' + nameLine + '</div>'
            + (qtyLine   ? '<div class="meal-item-qty">' + qtyLine + '</div>'   : '')
            + availLine
            + '</div>'
            + '<div class="meal-item-actions">' + actions + '</div>'
            + '</div>';

        /* Sub drawer */
        if (!isUsed) {
            html += '<div id="' + drawerId + '" class="sub-drawer">'
                + '<div class="sub-drawer-inner">'
                + '<div class="sub-drawer-title">Sostituisci con:</div>'
                + buildSubOptions(item.name, selectedMeal, subName)
                + '</div></div>';
        }

        html += '</div>';
    });

    list.innerHTML = html;
}

/* ---- SUB OPTIONS ---- */
function buildSubOptions(itemName, mealKey, currentSub) {
    var subs = getSubstitutes(itemName, mealKey);
    if (!subs.length) return '<p style="font-size:.8em;color:var(--text-light);">Nessun sostituto trovato.</p>';

    var html = '';
    subs.forEach(function (s) {
        var isSel = currentSub === s.name;
        var avail = checkIngredientAvailability({ name: s.name, quantity: s.quantity, unit: s.unit });
        var qtyTxt = s.quantity ? ' <span>' + s.quantity + ' ' + s.unit + '</span>' : '';
        var cls = 'sub-option' + (isSel ? ' selected' : '') + (avail.sufficient ? '' : ' sub-missing');
        html += '<button class="' + cls + '"'
            + ' onclick="applySub(\'' + escQ(itemName) + '\',\'' + escQ(s.name) + '\',\'' + mealKey + '\')">'
            + s.name + qtyTxt
            + '</button>';
    });

    if (currentSub) {
        html += '<button class="sub-clear" onclick="clearSub(\'' + escQ(itemName) + '\',\'' + mealKey + '\')">✕ Rimuovi sostituzione</button>';
    }
    return html;
}

/* ---- SOSTITUTI: blocco pantryItems (sostituisce il vecchio) ---- */
Object.keys(pantryItems).forEach(function (pName) {
  /* GUARD: salta chiavi non valide */
  if (!pName || pName === 'undefined' || pName === 'null' || !pName.trim()) return;
  if (pName.toLowerCase() === nl) return;
  if (result.some(function (r) { return r.name.toLowerCase() === pName.toLowerCase(); })) return;
  var pd = pantryItems[pName];
  if (!pd || typeof pd !== 'object') return;
  result.push({ name: pName, quantity: pd.quantity, unit: pd.unit });
});


    /* Poi: elementi da altri pasti */
    ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'].forEach(function (mk) {
        if (mk === mealKey) return;
        getMealItems(mk).forEach(function (it) {
            if (it.name.toLowerCase() !== nl &&
                !result.some(function (r) { return r.name.toLowerCase() === it.name.toLowerCase(); })) {
                result.push(it);
            }
        });
    });

    /* Poi: ingredienti in dispensa non nel piano */
    Object.keys(pantryItems).forEach(function (pName) {
        if (pName.toLowerCase() !== nl &&
            !result.some(function (r) { return r.name.toLowerCase() === pName.toLowerCase(); })) {
            var pd = pantryItems[pName];
            result.push({ name: pName, quantity: pd.quantity, unit: pd.unit });
        }
    });

    return result.slice(0, 12);
}

/* ---- AZIONI ---- */
function useItem(mealKey, itemName) {
    var dayData = getDayData(selectedDateKey);
    if (!dayData.usedItems) dayData.usedItems = {};
    if (!dayData.usedItems[mealKey]) dayData.usedItems[mealKey] = {};
    dayData.usedItems[mealKey][itemName] = true;

    /* Scala dalla dispensa */
    var items = getMealItems(mealKey);
    var item  = items.find(function (i) { return i.name === itemName; });
    if (item && item.quantity && item.unit) {
        var nl = itemName.toLowerCase();
        Object.keys(pantryItems).forEach(function (pName) {
            var pnl = pName.toLowerCase();
            if (pnl === nl || pnl.includes(nl) || nl.includes(pnl)) {
                var pd   = pantryItems[pName];
                var conv = convertUnit(item.quantity, item.unit, pd.unit);
                var qty  = conv !== null ? conv : item.quantity;
                pd.quantity = Math.max(0, (pd.quantity || 0) - qty);
                pd.quantity = Math.round(pd.quantity * 100) / 100;
            }
        });
    }

    /* Aggiorna limiti settimanali */
    updateWeeklyLimitsForItem(itemName);

    saveData();
    renderMealItems();
    renderMealProgress();
}

function unuseItem(mealKey, itemName) {
    var dayData = getDayData(selectedDateKey);
    if (dayData.usedItems && dayData.usedItems[mealKey]) {
        delete dayData.usedItems[mealKey][itemName];
    }
    saveData();
    renderMealItems();
    renderMealProgress();
}

function applySub(itemName, subName, mealKey) {
    var dayData = getDayData(selectedDateKey);
    if (!dayData.substitutions) dayData.substitutions = {};
    if (!dayData.substitutions[mealKey]) dayData.substitutions[mealKey] = {};
    dayData.substitutions[mealKey][itemName] = subName;
    saveData();
    renderMealItems();
}

function clearSub(itemName, mealKey) {
    var dayData = getDayData(selectedDateKey);
    if (dayData.substitutions && dayData.substitutions[mealKey]) {
        delete dayData.substitutions[mealKey][itemName];
    }
    saveData();
    renderMealItems();
}

function toggleSubDrawer(itemName) {
    var drawerId = 'sub_' + itemName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    var el = document.getElementById(drawerId);
    if (!el) return;
    /* Chiudi tutti gli altri */
    document.querySelectorAll('.sub-drawer.open').forEach(function (d) {
        if (d !== el) d.classList.remove('open');
    });
    el.classList.toggle('open');
}

/* ---- LIMITI SETTIMANALI ---- */
function updateWeeklyLimitsForItem(itemName) {
    var nl = itemName.toLowerCase();
    var limitMap = {
        'carne':      ['pollo', 'manzo', 'maiale', 'tacchino', 'vitello', 'agnello', 'bistecca', 'salsiccia', 'prosciutto', 'salame', 'bresaola', 'pancetta', 'speck', 'mortadella'],
        'pesce':      ['salmone', 'tonno', 'merluzzo', 'trota', 'orata', 'branzino', 'sgombro', 'acciughe', 'gamberetti', 'gamberi', 'pesce'],
        'uova':       ['uovo', 'uova'],
        'legumi':     ['fagioli', 'ceci', 'lenticchie', 'piselli', 'soia', 'edamame', 'fave', 'lupini'],
        'latticini':  ['latte', 'yogurt', 'formaggio', 'ricotta', 'mozzarella', 'parmigiano', 'grana', 'burro', 'panna'],
        'verdure':    ['insalata', 'spinaci', 'broccoli', 'carote', 'pomodori', 'zucchine', 'melanzane', 'peperoni', 'cavolo', 'cetrioli', 'sedano', 'finocchio'],
        'frutta':     ['mela', 'pera', 'banana', 'arancia', 'kiwi', 'fragole', 'uva', 'pesca', 'albicocca', 'mango', 'ananas', 'frutti'],
        'cereali':    ['pasta', 'riso', 'pane', 'farro', 'orzo', 'quinoa', 'avena', 'mais', 'polenta', 'fette', 'crackers', 'cereali']
    };

    Object.keys(limitMap).forEach(function (limitKey) {
        if (!weeklyLimits[limitKey]) return;
        var words = limitMap[limitKey];
        var match = words.some(function (w) { return nl.includes(w); });
        if (match && weeklyLimits[limitKey].current < weeklyLimits[limitKey].max) {
            weeklyLimits[limitKey].current++;
        }
    });
}

/* ---- TAB INGREDIENTI DAY ---- */
function initDayIngGrid() {
    updateFridgeSuggestions();
    renderDayIngredients();
}

function renderDayIngredients() {
    var grid    = document.getElementById('dayIngGrid');
    var details = document.getElementById('dayIngDetails');
    if (!grid || !details) return;

    /* Raccoglie tutti gli ingredienti dal piano */
    var allItems = [];
    var mealKeys = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
    var mealLabels = {
        colazione: '☕ Colazione', spuntino: '🍎 Spuntino',
        pranzo: '🍽 Pranzo', merenda: '🥪 Merenda', cena: '🌙 Cena'
    };

    mealKeys.forEach(function (mk) {
        getMealItems(mk).forEach(function (item) {
            if (!allItems.some(function (i) { return i.name === item.name; })) {
                allItems.push(Object.assign({}, item, { meal: mk }));
            }
        });
    });

    if (!allItems.length) {
        grid.innerHTML = '';
        details.innerHTML = '<div class="empty-state">'
            + '<div class="empty-state-icon">📋</div>'
            + '<h3>Piano non impostato</h3>'
            + '<p>Vai su Profilo per impostare il tuo piano alimentare.</p>'
            + '</div>';
        return;
    }

    /* Render pill buttons */
    grid.innerHTML = allItems.map(function (item, idx) {
        var avail = checkIngredientAvailability(item);
        var dot   = avail.sufficient ? '🟢' : avail.matched ? '🟡' : '🔴';
        return '<button class="day-ing-btn" onclick="showDayIngDetail(' + idx + ')">'
            + dot + ' ' + item.name + '</button>';
    }).join('');

    /* Detail al click */
    window._dayIngItems = allItems;
    window._mealLabels  = mealLabels;
    details.innerHTML   = buildAllIngDetails(allItems, mealLabels);
}

function showDayIngDetail(idx) {
    var btns = document.querySelectorAll('.day-ing-btn');
    btns.forEach(function (b, i) {
        b.classList.toggle('selected', i === idx);
    });
    var item  = window._dayIngItems[idx];
    var avail = checkIngredientAvailability(item);
    var details = document.getElementById('dayIngDetails');
    if (!details) return;

    var html = '<div class="card" style="margin-top:10px;">'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">'
        + '<span style="font-size:1.5em;">'
        + (avail.sufficient ? '🟢' : avail.matched ? '🟡' : '🔴') + '</span>'
        + '<div>'
        + '<div style="font-weight:800;font-size:.98em;">' + item.name + '</div>'
        + '<div style="font-size:.78em;color:var(--text-light);">'
        + (window._mealLabels[item.meal] || item.meal) + '</div>'
        + '</div></div>';

    /* Quantità richiesta */
    if (item.quantity && item.unit) {
        html += '<div class="ingredient-item">'
            + '<span>Quantità nel piano</span>'
            + '<span class="ingredient-qty-label">' + item.quantity + ' ' + item.unit + '</span>'
            + '</div>';
    }

    /* Disponibilità in dispensa */
    if (avail.matched) {
        var cls = avail.sufficient ? 'ok' : 'ko';
        html += '<div class="ingredient-item ' + (avail.sufficient ? 'ing-available' : 'ing-missing') + '">'
            + '<span>In dispensa (' + avail.pantryName + ')</span>'
            + '<span class="ingredient-qty-label ' + cls + '">'
            + Math.round(avail.available) + ' ' + avail.availableUnit + '</span>'
            + '</div>';
    } else {
        html += '<div class="ingredient-item ing-missing">'
            + '<span>Non trovato in dispensa</span>'
            + '<span class="ingredient-qty-label ko">—</span>'
            + '</div>';
    }

    html += '</div>';
    details.innerHTML = html;
}

function buildAllIngDetails(allItems, mealLabels) {
    /* Vista compatta: tabella riassuntiva */
    var html = '<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">';
    allItems.forEach(function (item) {
        var avail = checkIngredientAvailability(item);
        var cls   = avail.sufficient ? 'ing-available' : 'ing-missing';
        var icon  = avail.sufficient ? '✔' : avail.matched ? '⚠' : '✖';
        var iconCls = avail.sufficient ? 'ok' : 'ko';
        html += '<div class="ingredient-item ' + cls + '">'
            + '<div style="min-width:0;flex:1;">'
            + '<div style="font-weight:700;font-size:.86em;">' + item.name + '</div>'
            + '<div style="font-size:.72em;color:var(--text-light);">' + (mealLabels[item.meal] || item.meal) + '</div>'
            + '</div>'
            + '<div style="text-align:right;flex-shrink:0;">'
            + (item.quantity ? '<div style="font-size:.82em;font-weight:700;">' + item.quantity + ' ' + item.unit + '</div>' : '')
            + '<div class="ingredient-qty-label ' + iconCls + '" style="font-size:.8em;">' + icon + (avail.matched ? ' ' + Math.round(avail.available) + ' ' + avail.availableUnit : '') + '</div>'
            + '</div>'
            + '</div>';
    });
    html += '</div>';
    return html;
}

/* ---- FRIGO SUGGESTIONS ---- */
function updateFridgeSuggestions() {
    var wrap = document.getElementById('fridgeSuggestions');
    if (!wrap) return;

    var filterEl = document.getElementById('fridgeSuggestionFilter');
    var filter   = filterEl ? filterEl.value : 'all';

    /* Ingredienti disponibili in dispensa */
    var available = Object.keys(pantryItems).filter(function (name) {
        return (pantryItems[name].quantity || 0) > 0;
    });

    if (!available.length) {
        wrap.innerHTML = '<div class="empty-state">'
            + '<div class="empty-state-icon">❄️</div>'
            + '<h3>Dispensa vuota</h3>'
            + '<p>Aggiungi ingredienti alla dispensa per ricevere suggerimenti.</p>'
            + '</div>';
        return;
    }

    /* Trova ricette (default + custom) con ingredienti disponibili */
    var allRecipes = (typeof defaultRecipes !== 'undefined' ? defaultRecipes : [])
        .concat(customRecipes || []);

    var filteredRecipes = allRecipes.filter(function (r) {
        if (filter !== 'all' && r.pasto && r.pasto !== filter) return false;
        var ings = r.ingredienti || r.ingredients || [];
        if (!ings.length) return false;
        var matched = ings.filter(function (ing) {
            var n = (ing.name || ing.nome || '').toLowerCase();
            return available.some(function (av) {
                var al = av.toLowerCase();
                return al === n || al.includes(n) || n.includes(al);
            });
        });
        return matched.length > 0;
    });

    /* Ordina per % ingredienti disponibili */
    filteredRecipes.sort(function (a, b) {
        var aI = a.ingredienti || a.ingredients || [];
        var bI = b.ingredienti || b.ingredients || [];
        var aPct = aI.length ? aI.filter(function (ing) {
            var n = (ing.name || ing.nome || '').toLowerCase();
            return available.some(function (av) { return av.toLowerCase().includes(n) || n.includes(av.toLowerCase()); });
        }).length / aI.length : 0;
        var bPct = bI.length ? bI.filter(function (ing) {
            var n = (ing.name || ing.nome || '').toLowerCase();
            return available.some(function (av) { return av.toLowerCase().includes(n) || n.includes(av.toLowerCase()); });
        }).length / bI.length : 0;
        return bPct - aPct;
    });

    var top = filteredRecipes.slice(0, 8);

    if (!top.length) {
        wrap.innerHTML = '<div class="empty-state">'
            + '<div class="empty-state-icon">🤔</div>'
            + '<h3>Nessun suggerimento</h3>'
            + '<p>Con gli ingredienti disponibili non ho trovato ricette compatibili.</p>'
            + '</div>';
        return;
    }

    var html = '<div class="ricette-grid">';
    top.forEach(function (r) {
        var ings   = r.ingredienti || r.ingredients || [];
        var avCount = ings.filter(function (ing) {
            var n = (ing.name || ing.nome || '').toLowerCase();
            return available.some(function (av) { return av.toLowerCase().includes(n) || n.includes(av.toLowerCase()); });
        }).length;
        var pct = ings.length ? Math.round((avCount / ings.length) * 100) : 0;
        var badgeCls = pct >= 80 ? 'rcb-avail' : pct >= 50 ? 'rcb-partial' : 'rcb-missing';
        var icon = r.icon || r.icona || '🍽';
        var name = r.nome || r.name || 'Ricetta';
        var pasto = r.pasto || '';

        html += '<div class="ricetta-card" onclick="openRecipeModal(\'' + escQ(name) + '\')">'
            + '<div class="ricetta-card-head">'
            + '<div class="ricetta-card-icon">' + icon + '</div>'
            + '<div class="ricetta-card-info">'
            + '<div class="ricetta-card-name">' + name + '</div>'
            + '<div class="ricetta-card-badges">'
            + (pasto ? '<span class="rcb rcb-pasto">' + capitalizeFirst(pasto) + '</span>' : '')
            + '<span class="rcb ' + badgeCls + '">' + avCount + '/' + ings.length + ' ingredienti</span>'
            + '</div></div></div>'
            + '<div class="ricetta-card-ings">' + ings.slice(0, 4).map(function (i) { return i.name || i.nome; }).join(', ') + (ings.length > 4 ? '...' : '') + '</div>'
            + '</div>';
    });
    html += '</div>';
    wrap.innerHTML = html;
}

/* ---- SAVED FRIDGES ---- */
function updateSavedFridges() {
    var el = document.getElementById('savedFridgesContent');
    if (!el) return;
    var keys = Object.keys(savedFridges);
    if (!keys.length) {
        el.innerHTML = '<p style="color:var(--text-light);font-size:.85em;text-align:center;padding:20px 0;">Nessun frigo salvato.</p>';
        return;
    }
    el.innerHTML = keys.map(function (k) {
        var f = savedFridges[k];
        var items = Object.keys(f.items || {});
        return '<div class="saved-fridge-item">'
            + '<div class="saved-fridge-name">📁 ' + k + '</div>'
            + '<div class="saved-fridge-date">🕐 ' + (f.date || '') + ' · ' + items.length + ' ingredienti</div>'
            + '<div class="saved-fridge-actions">'
            + '<button class="btn btn-small btn-primary" onclick="loadFridge(\'' + escQ(k) + '\')">📂 Carica</button>'
            + '<button class="btn btn-small btn-warning" onclick="deleteFridge(\'' + escQ(k) + '\')">🗑</button>'
            + '</div></div>';
    }).join('');
}

function openSaveFridgeModal() {
    var m = document.getElementById('saveFridgeModal');
    if (m) { m.classList.add('active'); document.getElementById('fridgeName').value = ''; document.getElementById('fridgeName').focus(); }
}
function closeSaveFridgeModal() {
    var m = document.getElementById('saveFridgeModal');
    if (m) m.classList.remove('active');
}
function saveFridge() {
    var name = (document.getElementById('fridgeName').value || '').trim();
    if (!name) { alert('Inserisci un nome per la configurazione.'); return; }
    savedFridges[name] = {
        items: JSON.parse(JSON.stringify(pantryItems)),
        date:  new Date().toLocaleDateString('it-IT')
    };
    saveData();
    closeSaveFridgeModal();
    updateSavedFridges();
    alert('✅ Configurazione "' + name + '" salvata!');
}
function loadFridge(name) {
    if (!savedFridges[name]) return;
    if (!confirm('Caricare la configurazione "' + name + '"?\nGli ingredienti attuali saranno sovrascritti.')) return;
    pantryItems = JSON.parse(JSON.stringify(savedFridges[name].items || {}));
    saveData();
    renderPantry();
    renderFridge();
    updateFridgeSuggestions();
    alert('✅ Configurazione "' + name + '" caricata!');
}
function deleteFridge(name) {
    if (!confirm('Eliminare la configurazione "' + name + '"?')) return;
    delete savedFridges[name];
    saveData();
    updateSavedFridges();
}

/* ---- UTILITY ---- */
function escQ(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
