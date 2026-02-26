/* Configurazione locale di sviluppo.
   Se non hai ancora creato un progetto Firebase / chiavi Gemini,
   puoi lasciare questi valori vuoti: l'app funzionerà comunque in modalità solo locale
   (niente login / sincronizzazione cloud / AI). */

window.APP_CONFIG = window.APP_CONFIG || {};

window.APP_CONFIG.firebase = {
  apiKey:            "",
  authDomain:        "",
  databaseURL:       "",
  projectId:         "",
  storageBucket:     "",
  messagingSenderId: "",
  appId:             ""
};

window.APP_CONFIG.gemini = {
  apiKey: ""
};

