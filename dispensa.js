var dispensaFilterText = '';

function getAllIngredients() {
    var base = allPantryItems ? allPantryItems.slice() : [];
    customIngredients.forEach(function (ci) {
        base.push({
            name: ci.name, icon: ci.icon || '📦',
            units: [ci.unit || 'g'], step: ci.step || 10,
            _custom: true, _id: ci.id, _categoria: ci.categoria || ''
        });
    });
    return base;
}

function refreshAllViews() {
    renderFridge();
    if (typeof renderMealPlan === 'function') renderMealPlan();
    if (typeof updateFridgeSuggestions === 'function') updateFridgeSuggestions();
    if (typeof initDayIngGrid === 'function') initDayIngGrid();
    if (typeof buildCalendarBar === 'function') buildCalendarBar();
}

function renderPantry() {
    dispensaFilterText = document.getElementById('dispensaSearch') ? document.getElementById('dispensaSearch').value : '';
    renderPantryFiltered(dispensaFilterText);
}

function renderPantryFiltered(query) {
    var container = document.getElementById('pantryContent');
    if (!container) return;
    var q = query.toLowerCase().trim();
    var totalVisible = 0;
    var html = '';

    // Built-in categories
    pantryCategories.forEach(function (cat) {
        // Include custom ingredients that belong to this category
        var builtIn = cat.items.filter(function (item) {
            return !q || item.name.toLowerCase().includes(q);
        });
        var customInCat = customIngredients.filter(function (ci) {
            return ci.categoria === cat.label && (!q || ci.name.toLowerCase().includes(q));
        });
        if (!builtIn.length && !customInCat.length) return;
        totalVisible += builtIn.length + customInCat.length;
        html += '<div class="category-section">';
        html += '<div class="category-title">' + cat.label + '</div>';
        html += '<div class="pantry-grid">';
        builtIn.forEach(function (item) { html += buildPantryItemHTML(item, false); });
        customInCat.forEach(function (item) { html += buildPantryItemHTML(item, true); });
        html += '</div></div>';
    });

    // Custom with no category or unknown category
    var uncategorized = customIngredients.filter(function (ci) {
        var knownCat = pantryCategories.some(function (c) { return c.label === ci.categoria; });
        return !knownCat && (!q || ci.name.toLowerCase().includes(q));
    });
    if (uncategorized.length) {
        totalVisible += uncategorized.length;
        html += '<div class="category-section">';
        html += '<div class="category-title">⭐ Personalizzati</div>';
        html += '<div class="pantry-grid">';
        uncategorized.forEach(function (item) { html += buildPantryItemHTML(item, true); });
        html += '</div></div>';
    }

    if (!totalVisible) {
        html = '<div class="dispensa-no-results"><div style="font-size:2.5em;margin-bottom:10px;">🔍</div>';
        html += '<p>Nessun ingrediente trovato per <strong>' + query + '</strong>.</p></div>';
    }
    container.innerHTML = html;
}

function buildPantryItemHTML(item, isCustom) {
    var name = item.name;
    var inPantry = pantryItems[name] !== undefined;
    var qty = inPantry ? pantryItems[name].quantity : 0;
    var units = item.units || [item.unit || 'g'];
    var unit = inPantry ? pantryItems[name].unit : units[0];
    var step = item.step || 10;
    var esc = name.replace(/'/g, "\\'");

    var html = '<div class="pantry-item ' + (inPantry ? 'active' : 'inactive') + '">';
    html += '<div class="pantry-item-row">';
    html += '<div class="pantry-name">' + (item.icon || '📦') + ' ' + name + '</div>';
    html += '<div class="pantry-item-actions">';
    if (!inPantry) {
        html += '<button class="pantry-add-btn" onclick="addToPantry(\'' + esc + '\')">+ Aggiungi</button>';
    }
    if (isCustom) {
        html += '<button class="pantry-delete-btn" onclick="deleteCustomIngredient(\'' + esc + '\')" title="Elimina">🗑</button>';
    }
    html += '</div></div>';

    if (inPantry) {
        html += '<div class="pantry-quantity-row">';
        html += '<button class="qty-btn minus" onclick="adjustQty(\'' + esc + '\',-' + step + ')">−</button>';
        html += '<input type="number" class="quantity-input" value="' + qty + '" min="0" onchange="updatePantryQuantity(\'' + esc + '\',this.value,null)">';
        html += '<select class="unit-select" onchange="updatePantryQuantity(\'' + esc + '\',null,this.value)">';
        units.forEach(function (u) {
            html += '<option value="' + u + '"' + (u === unit ? ' selected' : '') + '>' + u + '</option>';
        });
        html += '</select>';
        html += '<button class="pantry-remove-btn" onclick="removeFromPantry(\'' + esc + '\')">✕</button>';
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function filterDispensa(val) {
    dispensaFilterText = val;
    var clearBtn = document.getElementById('dispensaClearBtn');
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
    renderPantryFiltered(val);
}

function clearDispensaSearch() {
    var input = document.getElementById('dispensaSearch');
    if (input) input.value = '';
    var clearBtn = document.getElementById('dispensaClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    dispensaFilterText = '';
    renderPantryFiltered('');
    if (input) input.focus();
}

function addToPantry(name) {
    var item = getAllIngredients().find(function (i) { return i.name === name; });
    pantryItems[name] = { quantity: 0, unit: (item && item.units ? item.units[0] : null) || (item && item.unit) || 'g' };
    saveData(); renderPantryFiltered(dispensaFilterText); refreshAllViews();
}

function removeFromPantry(name) {
    delete pantryItems[name];
    saveData(); renderPantryFiltered(dispensaFilterText); refreshAllViews();
}

function adjustQty(name, delta) {
    if (!pantryItems[name]) return;
    pantryItems[name].quantity = Math.max(0, parseFloat(((pantryItems[name].quantity || 0) + delta).toFixed(3)));
    saveData(); renderPantryFiltered(dispensaFilterText); refreshAllViews();
}

function updatePantryQuantity(name, quantity, unit) {
    if (!pantryItems[name]) return;
    if (quantity !== null) pantryItems[name].quantity = Math.max(0, parseFloat(quantity) || 0);
    if (unit !== null) pantryItems[name].unit = unit;
    saveData(); renderPantryFiltered(dispensaFilterText); refreshAllViews();
}

/* ---- INGREDIENTI CUSTOM ---- */
function openCustomIngModal() {
    document.getElementById('ciName').value = '';
    document.getElementById('ciIcon').value = '';
    document.getElementById('ciUnit').value = 'g';
    document.getElementById('ciStep').value = '10';
    document.getElementById('ciCategoria').value = '';
    document.getElementById('customIngModal').classList.add('active');
    setTimeout(function () { document.getElementById('ciName').focus(); }, 100);
}

function closeCustomIngModal() {
    document.getElementById('customIngModal').classList.remove('active');
}

function saveCustomIngredient() {
    var name = document.getElementById('ciName').value.trim();
    var icon = document.getElementById('ciIcon').value.trim() || '📦';
    var unit = document.getElementById('ciUnit').value || 'g';
    var step = parseFloat(document.getElementById('ciStep').value) || 10;
    var categoria = document.getElementById('ciCategoria').value || '';
    if (!name) { alert('Inserisci il nome.'); return; }
    if (getAllIngredients().some(function (i) { return i.name.toLowerCase() === name.toLowerCase(); })) {
        alert('Ingrediente già esistente.'); return;
    }
    customIngredients.push({ id: 'ci_' + Date.now(), name: name, icon: icon, unit: unit, step: step, categoria: categoria });
    saveData();
    closeCustomIngModal();
    renderPantryFiltered(dispensaFilterText);
    if (typeof initIngredientiDatalist === 'function') initIngredientiDatalist();
    alert('Ingrediente "' + name + '" aggiunto!');
}

function deleteCustomIngredient(name) {
    if (!confirm('Eliminare "' + name + '"?')) return;
    customIngredients = customIngredients.filter(function (ci) { return ci.name !== name; });
    delete pantryItems[name];
    saveData(); renderPantryFiltered(dispensaFilterText); refreshAllViews();
}

/* ---- FRIGO ---- */
function renderFridge() {
    var container = document.getElementById('fridgeContent');
    if (!container) return;
    var available = Object.entries(pantryItems).filter(function (e) { return (e[1].quantity || 0) > 0; });
    if (!available.length) {
        container.innerHTML = '<div class="fridge-empty"><h3>🍃 Frigorifero vuoto</h3><p>Aggiungi e quantifica dalla Dispensa.</p></div>';
        return;
    }
    var allIngs = getAllIngredients();
    var html = '';
    pantryCategories.forEach(function (cat) {
        var catItems = available.filter(function (e) {
            return cat.items.some(function (i) { return i.name === e[0]; }) ||
                customIngredients.some(function (ci) { return ci.name === e[0] && ci.categoria === cat.label; });
        });
        if (!catItems.length) return;
        html += '<div class="fridge-section"><h3>' + cat.label + '</h3><div class="fridge-items">';
        catItems.forEach(function (e) { html += buildFridgeItemHTML(e[0], e[1], allIngs); });
        html += '</div></div>';
    });
    var others = available.filter(function (e) {
        return !pantryCategories.some(function (cat) {
            return cat.items.some(function (i) { return i.name === e[0]; }) ||
                customIngredients.some(function (ci) { return ci.name === e[0] && ci.categoria === cat.label; });
        });
    });
    if (others.length) {
        html += '<div class="fridge-section"><h3>⭐ Personalizzati</h3><div class="fridge-items">';
        others.forEach(function (e) { html += buildFridgeItemHTML(e[0], e[1], allIngs); });
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function buildFridgeItemHTML(name, data, allIngs) {
    var item = allIngs.find(function (i) { return i.name === name; });
    var step = item ? (item.step || 10) : 10;
    var esc = name.replace(/'/g, "\\'");
    return '<div class="fridge-item">'
        + '<div class="fridge-item-icon">' + (item ? item.icon : '📦') + '</div>'
        + '<div class="fridge-item-name">' + name + '</div>'
        + '<div class="fridge-item-quantity-row">'
        + '<span class="fridge-qty-val">' + data.quantity + '</span>'
        + '<span class="fridge-qty-unit"> ' + data.unit + '</span>'
        + '</div>'
        + '<div class="fridge-qty-btns">'
        + '<button class="qty-btn minus btn-small" onclick="adjustQty(\'' + esc + '\',-' + step + ')">−</button>'
        + '<button class="qty-btn plus btn-small" onclick="adjustQty(\'' + esc + '\',' + step + ')">+</button>'
        + '</div></div>';
}

function openSaveFridgeModal() {
    document.getElementById('fridgeName').value = '';
    document.getElementById('saveFridgeModal').classList.add('active');
    setTimeout(function () { document.getElementById('fridgeName').focus(); }, 100);
}
function closeSaveFridgeModal() { document.getElementById('saveFridgeModal').classList.remove('active'); }

function saveFridge() {
    var name = document.getElementById('fridgeName').value.trim();
    if (!name) { alert('Inserisci un nome.'); return; }
    savedFridges[Date.now().toString()] = { name: name, date: new Date().toLocaleString('it-IT'), items: JSON.parse(JSON.stringify(pantryItems)) };
    saveData(); closeSaveFridgeModal(); updateSavedFridges();
    alert('Frigorifero "' + name + '" salvato!');
}

function updateSavedFridges() {
    var card = document.getElementById('savedFridgesCard');
    var list = document.getElementById('savedFridgeList');
    var keys = Object.keys(savedFridges);
    if (!keys.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    list.innerHTML = keys.map(function (id) {
        var f = savedFridges[id];
        return '<div class="saved-fridge-item">'
            + '<div class="saved-fridge-name">🧊 ' + f.name + '</div>'
            + '<div class="saved-fridge-date">📅 ' + f.date + '</div>'
            + '<div class="saved-fridge-date">📦 ' + Object.keys(f.items).length + ' ingredienti</div>'
            + '<div class="saved-fridge-actions">'
            + '<button class="btn btn-primary btn-small" onclick="loadFridge(\'' + id + '\')">📥 Carica</button>'
            + '<button class="btn btn-warning btn-small" onclick="deleteFridge(\'' + id + '\')">🗑️</button>'
            + '</div></div>';
    }).join('');
}

function loadFridge(id) {
    if (!confirm('Caricare questo frigorifero?')) return;
    pantryItems = JSON.parse(JSON.stringify(savedFridges[id].items));
    saveData(); renderPantryFiltered(dispensaFilterText); refreshAllViews();
}
function deleteFridge(id) {
    if (!confirm('Eliminare "' + savedFridges[id].name + '"?')) return;
    delete savedFridges[id]; saveData(); updateSavedFridges();
}
function clearFridge() {
    if (!confirm('Svuotare il frigorifero?')) return;
    Object.keys(pantryItems).forEach(function (k) { pantryItems[k].quantity = 0; });
    saveData(); renderPantryFiltered(dispensaFilterText); refreshAllViews();
}
