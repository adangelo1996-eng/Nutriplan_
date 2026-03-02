/*
   DISPENSA-BARCODE.JS — Scanner codici a barre per dispensa
   Dipende da: dispensa.js (getCategoryIcon, _suggestExpiry, FRESH_EXPIRY_DAYS, FREEZER_EXTRA_DAYS)
*/

var _barcodeScanner  = null;
var _barcodeResult   = null;
var _barcodeScanLock = false;

function openBarcodeScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    if (typeof showToast === 'function')
      showToast('Libreria scanner non disponibile. Ricarica la pagina.', 'error');
    return;
  }

  var modal    = document.getElementById('barcodeScannerModal');
  var statusEl = document.getElementById('barcodeScanStatus');
  if (!modal) return;

  _barcodeScanLock = false;
  modal.classList.add('active');
  if (statusEl) statusEl.textContent = 'Avvio fotocamera…';

  setTimeout(function() {
    var container = document.getElementById('barcode-reader-container');
    if (container) container.innerHTML = '';

    try {
      _barcodeScanner = new Html5Qrcode('barcode-reader-container');
      _barcodeScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 130 } },
        function(decodedText) {
          if (_barcodeScanLock) return;
          _barcodeScanLock = true;
          if (statusEl) statusEl.textContent = '✅ Codice: ' + decodedText;
          _stopBarcodeScanner(function() {
            modal.classList.remove('active');
            _lookupBarcode(decodedText);
          });
        },
        function() { }
      ).then(function() {
        if (statusEl) statusEl.textContent = 'Inquadra il codice a barre del prodotto…';
      }).catch(function(err) {
        if (statusEl) statusEl.textContent = '⚠️ ' + (err.message || err);
        if (typeof showToast === 'function')
          showToast('Impossibile accedere alla fotocamera. Controlla i permessi.', 'error');
      });
    } catch (e) {
      if (typeof showToast === 'function')
        showToast('Errore avvio scanner: ' + (e.message || e), 'error');
    }
  }, 250);
}

function closeBarcodeScanner() {
  _stopBarcodeScanner(function() {
    var modal = document.getElementById('barcodeScannerModal');
    if (modal) modal.classList.remove('active');
    _barcodeScanLock = false;
  });
}

function _stopBarcodeScanner(callback) {
  if (_barcodeScanner) {
    _barcodeScanner.stop().then(function() {
      _barcodeScanner = null;
      if (callback) callback();
    }).catch(function() {
      _barcodeScanner = null;
      if (callback) callback();
    });
  } else {
    if (callback) callback();
  }
}

function _lookupBarcode(barcode) {
  if (typeof showToast === 'function') showToast('🔍 Ricerca prodotto…', 'info');

  var url = 'https://world.openfoodfacts.org/api/v2/product/' +
            encodeURIComponent(barcode) +
            '.json?fields=product_name,product_name_it,brands,categories_tags,nutriments,quantity';

  fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      if (data.status === 1 && data.product) {
        _showBarcodeResult(data.product, barcode);
      } else {
        if (typeof showToast === 'function')
          showToast('Prodotto non trovato nel database OpenFoodFacts.', 'warning');
      }
    })
    .catch(function(err) {
      console.warn('[NutriPlan] OpenFoodFacts error:', err);
      if (typeof showToast === 'function')
        showToast('Errore ricerca prodotto. Verifica la connessione.', 'error');
    });
}

function _mapOFFCategory(categories_tags) {
  if (!Array.isArray(categories_tags) || !categories_tags.length) return '🧂 Altro';
  var s = categories_tags.join(' ').toLowerCase();

  if (/en:meats|en:poultry|en:beef|en:pork|en:lamb|en:chicken|en:turkey|en:veal|it:carni|it:salumi/.test(s))
    return '🥩 Carne';
  if (/en:fish|en:seafood|en:tuna|en:salmon|en:anchovies|it:pesce|it:frutti-di-mare/.test(s))
    return '🐟 Pesce';
  if (/en:dairy|en:milk|en:cheeses|en:yogurts|en:cream|en:butter|en:eggs|it:latticini|it:uova|it:formaggi/.test(s))
    return '🥛 Latticini e Uova';
  if (/en:pastas|en:cereals|en:breads|en:rice|en:legumes|en:flours|en:oats|en:lentils|en:beans|en:chickpeas|en:grains|it:pasta|it:cereali|it:legumi|it:pane/.test(s))
    return '🌾 Cereali e Legumi';
  if (/en:vegetables|en:salads|en:leafy-vegetables|en:tomatoes|en:potatoes|en:carrots|en:onions|en:mushrooms|it:verdure|it:ortaggi/.test(s))
    return '🥦 Verdure';
  if (/en:fruits|en:berries|en:apples|en:bananas|en:citrus|en:oranges|it:frutta|it:frutta-fresca/.test(s))
    return '🍎 Frutta';
  if (/en:fats|en:oils|en:olive-oils|en:dressings|en:sauces|en:vinegars|it:condimenti|it:oli|it:sughi/.test(s))
    return '🥑 Grassi e Condimenti';
  if (/en:sweets|en:chocolates|en:biscuits|en:cookies|en:snacks|en:candies|en:ice-creams|en:pastries|en:cakes|en:chips|it:dolci|it:snack|it:biscotti/.test(s))
    return '🍫 Dolci e Snack';
  if (/en:spices|en:seasonings|en:condiments|en:broths|en:herbs|en:salt|en:sugars|it:spezie|it:aromi|it:brodi/.test(s))
    return '🧂 Cucina';

  return '🧂 Altro';
}

/**
 * Estrae quantità e unità dal campo quantity di Open Food Facts (es. "500g", "1 L", "200ml", "6 x 125 g").
 * Restituisce { qty: number, unit: string } con default 1 e "pz" se non disponibile.
 */
function _parseBarcodeQuantity(quantity) {
  var qty = 1;
  var unit = 'pz';
  if (quantity == null || quantity === '') return { qty: qty, unit: unit };

  var s = String(quantity).trim().toLowerCase();
  if (!s) return { qty: qty, unit: unit };

  var num = null;
  var u = '';

  if (/^\d+(?:[.,]\d+)?\s*[a-z]+$/.test(s)) {
    var m = s.match(/^(\d+(?:[.,]\d+)?)\s*([a-z]+)$/);
    if (m) { num = parseFloat(m[1].replace(',', '.')); u = m[2]; }
  }
  if (num == null && /^\d+(?:[.,]\d+)?[a-z]+$/.test(s)) {
    var m2 = s.match(/^(\d+(?:[.,]\d+)?)([a-z]+)$/);
    if (m2) { num = parseFloat(m2[1].replace(',', '.')); u = m2[2]; }
  }
  if (num == null) {
    var m3 = s.match(/^(\d+(?:[.,]\d+)?)\s*([a-z]+)?$/);
    if (m3) { num = parseFloat(m3[1].replace(',', '.')); u = (m3[2] || '').trim(); }
  }
  if (num == null) {
    var m4 = s.match(/(\d+(?:[.,]\d+)?)/);
    if (m4) num = parseFloat(m4[1].replace(',', '.'));
  }

  if (num != null && !isNaN(num) && num > 0) qty = num;
  if (u) {
    if (u === 'g' || u === 'gr') unit = 'g';
    else if (u === 'kg') { qty = qty * 1000; unit = 'g'; }
    else if (u === 'ml' || u === 'millilitri') unit = 'ml';
    else if (u === 'l' || u === 'lt') { qty = qty * 1000; unit = 'ml'; }
    else if (u === 'pz' || u === 'pezzi' || u === 'x') unit = 'pz';
    else if (_barcodeUnitMap(u)) unit = _barcodeUnitMap(u);
    else if (u.length <= 10) unit = u;
  }
  if (qty <= 0) qty = 1;
  return { qty: qty, unit: unit };
}

function _barcodeUnitMap(u) {
  var map = { 'fette': 'fette', 'cucchiai': 'cucchiai', 'cucchiaini': 'cucchiaini', 'porzione': 'porzione' };
  return map[u] || null;
}

function _barcodeUnitOptions(selectedUnit) {
  var units = [
    { v: 'pz', l: 'pz' }, { v: 'g', l: 'g' }, { v: 'kg', l: 'kg' },
    { v: 'ml', l: 'ml' }, { v: 'l', l: 'l' }, { v: 'fette', l: 'fette' },
    { v: 'cucchiai', l: 'cucchiai' }, { v: 'cucchiaini', l: 'cucchiaini' },
    { v: 'porzione', l: 'porzione' }
  ];
  var sel = (selectedUnit || 'pz').toLowerCase();
  return units.map(function(u) {
    return '<option value="' + u.v + '"' + (u.v === sel ? ' selected' : '') + '>' + u.l + '</option>';
  }).join('');
}

function _showBarcodeResult(product, barcode) {
  var name = (product.product_name_it || product.product_name || '').trim();
  if (!name) name = 'Prodotto ' + barcode;

  var category  = _mapOFFCategory(product.categories_tags);
  var brand     = (product.brands || '').trim();
  var n         = product.nutriments || {};

  var kcal     = n['energy-kcal_100g']    != null ? Math.round(n['energy-kcal_100g'])            : null;
  var proteins = n['proteins_100g']       != null ? parseFloat(n['proteins_100g']).toFixed(1)     : null;
  var carbs    = n['carbohydrates_100g']  != null ? parseFloat(n['carbohydrates_100g']).toFixed(1): null;
  var fat      = n['fat_100g']            != null ? parseFloat(n['fat_100g']).toFixed(1)          : null;
  var fiber    = n['fiber_100g']          != null ? parseFloat(n['fiber_100g']).toFixed(1)        : null;
  var nutriments = (kcal != null || proteins != null || carbs != null || fat != null || fiber != null)
    ? { kcal: kcal, proteins: proteins, carbs: carbs, fat: fat, fiber: fiber } : null;

  _barcodeResult = { name: name, category: category, brand: brand, barcode: barcode, nutriments: nutriments };

  var hasDetails = brand || kcal !== null || proteins !== null || carbs !== null || fat !== null;
  var detailsHtml = '';
  if (hasDetails) {
    var macroChips = '';
    if (kcal     !== null) macroChips += '<div class="barcode-macro-chip"><span>Energia</span><strong>' + kcal + ' kcal</strong></div>';
    if (proteins !== null) macroChips += '<div class="barcode-macro-chip"><span>Proteine</span><strong>' + proteins + 'g</strong></div>';
    if (carbs    !== null) macroChips += '<div class="barcode-macro-chip"><span>Carboidrati</span><strong>' + carbs + 'g</strong></div>';
    if (fat      !== null) macroChips += '<div class="barcode-macro-chip"><span>Grassi</span><strong>' + fat + 'g</strong></div>';
    if (fiber    !== null) macroChips += '<div class="barcode-macro-chip"><span>Fibre</span><strong>' + fiber + 'g</strong></div>';

    detailsHtml =
      '<details class="barcode-details">' +
        '<summary>↕ Dettagli (marca e valori nutrizionali per 100g)</summary>' +
        '<div class="barcode-details-body">' +
          (brand ? '<div class="barcode-brand"><strong>Marca:</strong> ' + brand + '</div>' : '') +
          (macroChips ? '<div class="barcode-macro-label">Valori per 100g</div><div class="barcode-macro-grid">' + macroChips + '</div>' : '') +
        '</div>' +
      '</details>';
  }

  var catIcon = typeof getCategoryIcon === 'function' ? getCategoryIcon(category) : '🧂';
  var catName = category.replace(/^[^\s]+\s/, '');

  var qtyFromApi = _parseBarcodeQuantity(product.quantity);
  var defaultQty = qtyFromApi.qty;
  var defaultUnit = qtyFromApi.unit;

  var catOptions = [
    '🥩 Carne', '🐟 Pesce', '🥛 Latticini e Uova', '🌾 Cereali e Legumi',
    '🥦 Verdure', '🍎 Frutta', '🥑 Grassi e Condimenti',
    '🍫 Dolci e Snack', '🧂 Cucina', '🧂 Altro'
  ].map(function(c) {
    return '<option value="' + c + '"' + (c === category ? ' selected' : '') + '>' + c + '</option>';
  }).join('');

  var suggestedExpiry = typeof _suggestExpiry === 'function' ? _suggestExpiry(category, false) : '';
  var todayIso = new Date().toISOString().slice(0, 10);
  var hasFreshSuggestion = typeof FRESH_EXPIRY_DAYS !== 'undefined' && FRESH_EXPIRY_DAYS[category] && FRESH_EXPIRY_DAYS[category] < 30;
  var hasFreezerExtra = typeof FREEZER_EXTRA_DAYS !== 'undefined' && !!FREEZER_EXTRA_DAYS[category];

  var html =
    '<div class="barcode-result-header">' +
      '<div class="barcode-result-icon">' + catIcon + '</div>' +
      '<div>' +
        '<div class="barcode-result-name">' + name + '</div>' +
        '<div class="barcode-result-cat">Categoria rilevata: ' + catName + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Nome ingrediente</label>' +
      '<input type="text" id="barcodeIngName" value="' + escForAttr(name) + '" ' +
             'onchange="_updateBarcodeSuggestion()">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Categoria</label>' +
      '<select id="barcodeIngCategory" onchange="_updateBarcodeSuggestion()">' + catOptions + '</select>' +
    '</div>' +
    '<div class="row gap-8">' +
      '<div class="form-group flex1">' +
        '<label>Quantità <span style="font-size:.78em;color:var(--text-3);">(da API, modificabile)</span></label>' +
        '<input type="number" id="barcodeIngQty" min="0" step="any" value="' + defaultQty + '" placeholder="' + defaultQty + '">' +
      '</div>' +
      '<div class="form-group" style="width:110px;">' +
        '<label>Unità</label>' +
        '<select id="barcodeIngUnit">' +
          _barcodeUnitOptions(defaultUnit) +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>📅 Data di scadenza <span style="font-size:.78em;color:var(--text-3);">(opzionale)</span></label>' +
      '<input type="date" id="barcodeIngScadenza" min="' + todayIso + '" ' +
             'value="' + (hasFreshSuggestion ? suggestedExpiry : '') + '" ' +
             'style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg-card);color:var(--text-1);font-size:.9em;">' +
      (hasFreshSuggestion
        ? '<small id="barcodeSuggLabel" style="color:var(--text-3);font-size:.76em;">💡 Suggerita in base alla categoria (modifica se necessario)</small>'
        : '<small id="barcodeSuggLabel" style="color:var(--text-3);font-size:.76em;">Lascia vuoto se non applicabile</small>') +
    '</div>' +
    (hasFreezerExtra
      ? '<label style="display:flex;align-items:center;gap:9px;padding:8px 0;cursor:pointer;font-size:.88em;">' +
          '<input type="checkbox" id="barcodeIngFreezer" style="width:16px;height:16px;accent-color:#3b82f6;" ' +
                 'onchange="_updateBarcodeSuggestion()">' +
          '<span>❄️ <strong>In congelatore</strong> — scadenza estesa automaticamente</span>' +
        '</label>'
      : '') +
    detailsHtml;

  var contentEl = document.getElementById('barcodeResultContent');
  if (contentEl) contentEl.innerHTML = html;

  var modal = document.getElementById('barcodeResultModal');
  if (modal) modal.classList.add('active');
}

function _updateBarcodeSuggestion() {
  var catEl      = document.getElementById('barcodeIngCategory');
  var scadEl     = document.getElementById('barcodeIngScadenza');
  var freezerEl  = document.getElementById('barcodeIngFreezer');
  var suggLabel  = document.getElementById('barcodeSuggLabel');
  if (!catEl || !scadEl) return;
  var cat    = catEl.value || '🧂 Altro';
  var frozen = freezerEl ? freezerEl.checked : false;
  var suggested = typeof _suggestExpiry === 'function' ? _suggestExpiry(cat, frozen) : '';
  scadEl.value = suggested;
  if (suggLabel) {
    if (frozen) {
      suggLabel.textContent = '❄️ Scadenza estesa per congelatore (modifica se necessario)';
    } else {
      var freshDays = (typeof FRESH_EXPIRY_DAYS !== 'undefined') ? FRESH_EXPIRY_DAYS[cat] : null;
      if (freshDays && freshDays < 30) {
        suggLabel.textContent = '💡 Suggerita per prodotti freschi (' + freshDays + ' giorni) — modifica se necessario';
      } else {
        suggLabel.textContent = 'Lascia vuoto se non applicabile';
      }
    }
  }
}

function closeBarcodeResult() {
  var modal = document.getElementById('barcodeResultModal');
  if (modal) modal.classList.remove('active');
  _barcodeResult = null;
}
