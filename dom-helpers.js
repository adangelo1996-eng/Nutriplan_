/* ============================================================
   DOM-HELPERS.JS — alias DOM riutilizzabili
   ============================================================ */

function byId(id) {
  return document.getElementById(id);
}

function qs(sel, root) {
  return (root || document).querySelector(sel);
}

function qsAll(sel, root) {
  return (root || document).querySelectorAll(sel);
}

function setHtml(el, html) {
  if (el) el.innerHTML = html;
}
