/* ═══════════════════════════════════════════════════════════════════════════
   NUTRIPLAN — piano-global.js
   
   Stub functions globali per compatibilità con event handlers inline HTML.
   
   PROBLEMA: piano.js è un modulo ES6 (type="module") che viene eseguito in 
   modo deferred. Gli event handlers inline HTML (oninput="filterOggiIngredients()")
   vengono valutati PRIMA che il modulo sia caricato → ReferenceError.
   
   SOLUZIONE: Questo file (script normale, NON module) viene caricato PRIMA e
   crea stub functions su window. Quando piano.js si carica, sovrascrive questi
   stub con le implementazioni reali.
═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';
  
  console.log('[piano-global] Stub functions inizializzate');
  
  // Queue per azioni chiamate prima che piano.js sia pronto
  let _pianoReady = false;
  let _actionQueue = [];
  
  // Funzione helper per accodare azioni
  function _queueOrExecute(fn) {
    if (_pianoReady && typeof fn === 'function') {
      fn();
    } else {
      _actionQueue.push(fn);
    }
  }
  
  // Quando piano.js è pronto, esegue la coda
  window._markPianoReady = function() {
    _pianoReady = true;
    console.log('[piano-global] piano.js pronto, eseguo', _actionQueue.length, 'azioni in coda');
    _actionQueue.forEach(fn => {
      try { fn(); } catch(e) { console.error('[piano-global] Errore esecuzione azione:', e); }
    });
    _actionQueue = [];
  };
  
  // ═══════════════════════════════════════════════════════════════════════
  // STUB FUNCTIONS - Verranno sovrascritte da piano.js quando caricato
  // ═══════════════════════════════════════════════════════════════════════
  
  // Ricerca ingredienti nella pagina Oggi
  window.filterOggiIngredients = function(query) {
    console.log('[piano-global] filterOggiIngredients stub chiamato con:', query);
    // Nessuna azione - piano.js sovrascriverà questa funzione
  };
  
  // Reset ricerca ingredienti
  window.clearOggiSearch = function() {
    console.log('[piano-global] clearOggiSearch stub chiamato');
    const input = document.getElementById('oggiSearch');
    if (input) input.value = '';
  };
  
  // Selezione pasto
  window.selectMeal = function(meal, btnElement) {
    console.log('[piano-global] selectMeal stub chiamato con:', meal);
    // Aggiorna visualmente il bottone almeno
    if (btnElement) {
      const buttons = document.querySelectorAll('.meal-btn');
      buttons.forEach(b => b.classList.remove('active'));
      btnElement.classList.add('active');
    }
  };
  
  // Reset piano giornaliero
  window.resetPiano = function() {
    console.log('[piano-global] resetPiano stub chiamato');
    alert('Piano pasto in caricamento, riprova tra un attimo...');
  };
  
  // Navigazione calendario
  window.shiftCalendar = function(days) {
    console.log('[piano-global] shiftCalendar stub chiamato con:', days);
    // Verrà sovrascritto da piano.js
  };
  
  // Namespace per funzioni modulo
  window.pianoModule = window.pianoModule || {
    consumeItem: function(idx) {
      console.log('[piano-global] pianoModule.consumeItem stub:', idx);
    },
    delItem: function(idx) {
      console.log('[piano-global] pianoModule.delItem stub:', idx);
    },
    addManualItem: function() {
      console.log('[piano-global] pianoModule.addManualItem stub');
    },
    addRecipe: function(recipeId) {
      console.log('[piano-global] pianoModule.addRecipe stub:', recipeId);
    }
  };
  
  console.log('[piano-global] Stub functions pronte - piano.js le sovrascriverà quando caricato');
})();
