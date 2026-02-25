/* ════════════════════════════════════════════════════════════════════════
   NUTRIPLAN — firebase.js
   
   Wrapper ES6 per Firebase SDK caricato globalmente.
   
   Questo modulo esporta le istanze Firebase (db, auth) per l'uso con
   import ES6 in piano.js e altri moduli.
   
   Firebase SDK è caricato dal CDN nel <head> di index.html.
   firebase-config.js inizializza Firebase e lo espone globalmente.
   Questo file wrappa quelle istanze globali per l'uso come moduli ES6.
════════════════════════════════════════════════════════════════════════ */

// Verifica che Firebase SDK sia stato caricato
if (typeof firebase === 'undefined') {
  console.error('[firebase.js] Firebase SDK non trovato! Verifica che sia caricato nel <head> prima di questo modulo.');
  throw new Error('Firebase SDK non disponibile');
}

// Attendi che firebase-config.js abbia inizializzato Firebase
function waitForFirebase() {
  return new Promise((resolve) => {
    // Se già inizializzato, risolvi immediatamente
    if (firebase.apps && firebase.apps.length > 0) {
      resolve();
      return;
    }
    
    // Altrimenti controlla ogni 100ms fino a quando non è pronto
    const checkInterval = setInterval(() => {
      if (firebase.apps && firebase.apps.length > 0) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    // Timeout dopo 10 secondi
    setTimeout(() => {
      clearInterval(checkInterval);
      console.warn('[firebase.js] Timeout: Firebase non inizializzato dopo 10s');
      resolve(); // Risolvi comunque per non bloccare
    }, 10000);
  });
}

// Attendi inizializzazione
await waitForFirebase();

// Esporta istanze Firebase per l'uso con import ES6
export const auth = firebase.auth();
export const db = firebase.database();

// Re-esporta l'oggetto firebase globale per compatibilità
export { firebase };

// Log di conferma
console.log('[firebase.js] Modulo ES6 caricato - auth e db disponibili per import');
