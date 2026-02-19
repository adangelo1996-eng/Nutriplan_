/* ricette.js
   Tutta la logica ricette è in ricette_custom.js.
   Questo file rimane per compatibilità con il service worker
   e per eventuali future estensioni. */

// Utility: restituisce il label del pasto dato il valore chiave
function getPastoLabel(pasto) {
    var map = {
        colazione: '☕ Colazione',
        spuntino:  '🍎 Spuntino',
        pranzo:    '🍽️ Pranzo',
        merenda:   '🥪 Merenda',
        cena:      '🌙 Cena'
    };
    return map[pasto] || pasto || '';
}

// Utility: conta quante ricette (builtin + custom) sono disponibili
function countAllRecipes() {
    var builtIn = typeof ricette !== 'undefined' ? Object.keys(ricette).length : 0;
    var custom  = typeof customRecipes !== 'undefined' ? customRecipes.length : 0;
    return builtIn + custom;
}
