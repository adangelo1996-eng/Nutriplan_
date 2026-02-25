/* ═════════════════════════════════════════════════════════════════
   NUTRIPLAN — piano-global.js
   
   Stub functions per piano.js (modulo ES6)
   
   Questo file NON è un modulo ES6. Viene caricato PRIMA di piano.js
   nell'HTML e crea funzioni stub su window.* immediatamente disponibili.
   
   Quando piano.js (type="module") si carica successivamente, sovrascrive
   queste funzioni con le implementazioni reali.
   
   Questo risolve il problema del timing: gli inline event handlers HTML
   (es. oninput="filterOggiIngredients()") possono chiamare le funzioni
   anche se il modulo ES6 non è ancora stato eseguito (deferred).
═════════════════════════════════════════════════════════════════ */

// Queue per azioni in attesa del caricamento del modulo
window._pianoQueue = window._pianoQueue || [];

// Funzione helper per creare stub che mettono in coda
function createPianoStub(fnName) {
  return function(...args) {
    // Se la funzione reale non è ancora stata caricata, metti in coda
    if (typeof window['_piano_' + fnName] === 'function') {
      return window['_piano_' + fnName](...args);
    } else {
      console.log('[piano-global] Stub chiamato per', fnName, '- in attesa del modulo');
      window._pianoQueue.push({ fn: fnName, args: args });
    }
  };
}

// Stub functions - saranno sovrascritte da piano.js quando si carica
window.filterOggiIngredients = createPianoStub('filterOggiIngredients');
window.clearOggiSearch = createPianoStub('clearOggiSearch');
window.selectMeal = createPianoStub('selectMeal');
window.resetPiano = createPianoStub('resetPiano');
window.shiftCalendar = createPianoStub('shiftCalendar');

// Funzione per processare la coda quando piano.js è pronto
window._processPianoQueue = function() {
  if (window._pianoQueue && window._pianoQueue.length > 0) {
    console.log('[piano-global] Processando', window._pianoQueue.length, 'azioni in coda');
    window._pianoQueue.forEach(item => {
      const realFn = window['_piano_' + item.fn];
      if (typeof realFn === 'function') {
        realFn(...item.args);
      }
    });
    window._pianoQueue = [];
  }
};

console.log('[piano-global] Stub functions caricate - in attesa di piano.js module');
