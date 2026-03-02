/* ============================================================
   UTILS.JS — funzioni condivise: escape, empty state, modali
   ============================================================ */

/** Escape per attributi HTML / onclick (es. onclick="fn('val')") */
function escForAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;');
}

/** Escape per contenuto HTML (XSS-safe) */
function escapeHtml(str) {
  if (str == null || str === '') return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** HTML unificato per stati vuoti (rc-empty) */
function renderEmptyState(icon, title, message) {
  var i = icon || '📭';
  var t = title || '';
  var m = message || '';
  return '<div class="rc-empty">' +
    (i ? '<div style="font-size:2rem;">' + i + '</div>' : '') +
    (t ? '<h3 style="font-size:.95rem;margin:8px 0 4px;">' + (typeof escapeHtml === 'function' ? escapeHtml(t) : t) + '</h3>' : '') +
    (m ? '<p>' + (typeof escapeHtml === 'function' ? escapeHtml(m) : m) + '</p>' : '') +
    '</div>';
}

/** Mostra modale per id (aggiunge classe active) */
function showModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/** Nasconde modale per id (rimuove classe active) */
function hideModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('active');
}
