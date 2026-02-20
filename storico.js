/*
   STORICO.JS — v4  stile rc-card unificato
*/

var storicoOpenDays = {};

function renderStorico() {
  var el = document.getElementById('storicoContent');
  if (!el) return;

  var keys = Object.keys(appHistory).sort(function(a,b){ return b.localeCompare(a); });

  /* solo giorni con almeno un item usato */
  keys = keys.filter(function(dk){
    var hd = appHistory[dk];
    if (!hd || !hd.usedItems) return false;
    return Object.keys(hd.usedItems).some(function(mk){
      return Object.keys(hd.usedItems[mk]||{}).length > 0;
    });
  });

  if (!keys.length) {
    el.innerHTML =
      '<div class="rc-empty">' +
        '<div style="font-size:2.5rem;">📅</div>' +
        '<p>Nessun pasto registrato.<br>Inizia a segnare i pasti consumati nella sezione <strong>Piano</strong>.</p>' +
      '</div>';
    return;
  }

  el.innerHTML = keys.map(function(dk){
    return buildStoricoDay(dk);
  }).join('');
}

/* ── CARD GIORNO ── */
function buildStoricoDay(dk) {
  var hd       = appHistory[dk] || {};
  var used     = hd.usedItems || {};
  var subs     = hd.substitutions || {};
  var isOpen   = storicoOpenDays[dk] ? true : false;

  /* conta totale pasti consumati */
  var totalUsed = 0;
  ['colazione','spuntino','pranzo','merenda','cena'].forEach(function(mk){
    totalUsed += Object.keys(used[mk]||{}).length;
  });

  /* label data leggibile */
  var dateLabel = formatStoricoDate(dk);

  /* ── righe pasto ── */
  var meals = [
    { key:'colazione', emoji:'☀️', label:'Colazione' },
    { key:'spuntino',  emoji:'🍎', label:'Spuntino'  },
    { key:'pranzo',    emoji:'🍽', label:'Pranzo'    },
    { key:'merenda',   emoji:'🥪', label:'Merenda'   },
    { key:'cena',      emoji:'🌙', label:'Cena'      }
  ];

  var mealRows = meals.map(function(m){
    var mUsed = used[m.key] || {};
    var mSubs = subs[m.key] || {};
    var names = Object.keys(mUsed);
    if (!names.length) return '';

    var pills = names.map(function(name){
      var sub = mSubs[name];
      return sub
        ? '<span class="rc-badge" style="background:#fff3cd;color:#856404;" title="Sostituito con '+sub+'">'+name+' → '+sub+'</span>'
        : '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);">'+name+'</span>';
    }).join('');

    return (
      '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
          '<span>'+m.emoji+'</span>' +
          '<span style="font-weight:600;font-size:.88em;color:var(--text-2);">'+m.label+'</span>' +
          '<span class="rc-badge" style="background:var(--bg2);color:var(--text-3);">'+names.length+'</span>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;">'+pills+'</div>' +
      '</div>'
    );
  }).filter(Boolean).join('');

  var bodyStyle = isOpen
    ? 'max-height:1000px;overflow:hidden;transition:max-height .35s ease;'
    : 'max-height:0;overflow:hidden;transition:max-height .35s ease;';

  return (
    '<div class="rc-card rc-accordion-card" style="margin-bottom:10px;">' +
      /* header */
      '<div class="rc-accordion-header" onclick="toggleStoricoDay(\''+dk+'\')" style="cursor:pointer;">' +
        '<div style="display:flex;align-items:center;gap:10px;flex:1;">' +
          '<span style="font-size:1.2em;">📅</span>' +
          '<span style="font-weight:700;">'+dateLabel+'</span>' +
        '</div>' +
        '<span class="rc-badge" style="background:var(--primary-light);color:var(--primary);margin-right:8px;">'+totalUsed+' consumati</span>' +
        '<span class="rc-accordion-arrow" id="arrow-'+dk+'">'+(isOpen?'▴':'▾')+'</span>' +
      '</div>' +
      /* body */
      '<div class="rc-accordion-body" id="storico-body-'+dk+'" style="'+bodyStyle+'">' +
        '<div style="padding:0 18px 16px;">' +
          (mealRows || '<p style="color:var(--text-3);font-size:.85em;">Nessun dettaglio disponibile.</p>') +
          '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">' +
            '<button class="rc-btn rc-btn-outline rc-btn-sm" '+
                    'onclick="if(confirm(\'Eliminare questo giorno dallo storico?\')) deleteStoricoDay(\''+dk+'\')">' +
              '🗑️ Elimina' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

/* ── TOGGLE ACCORDION ── */
function toggleStoricoDay(dk) {
  var body  = document.getElementById('storico-body-'+dk);
  var arrow = document.getElementById('arrow-'+dk);
  if (!body) return;
  var open = storicoOpenDays[dk] ? true : false;
  storicoOpenDays[dk] = !open;
  if (!open) {
    body.style.maxHeight  = body.scrollHeight + 'px';
    if (arrow) arrow.textContent = '▴';
  } else {
    body.style.maxHeight  = '0px';
    if (arrow) arrow.textContent = '▾';
  }
}

/* ── ELIMINA GIORNO ── */
function deleteStoricoDay(dk) {
  delete appHistory[dk];
  saveData();
  renderStorico();
}

/* ── FORMATTA DATA ── */
function formatStoricoDate(dk) {
  /* dk formato YYYY-MM-DD */
  var parts = dk.split('-');
  if (parts.length !== 3) return dk;
  var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  if (isNaN(d.getTime())) return dk;
  var days   = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  var months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

  /* etichetta oggi / ieri */
  var today     = new Date();
  var yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  var todayKey  = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  var yestKey   = yesterday.getFullYear()+'-'+String(yesterday.getMonth()+1).padStart(2,'0')+'-'+String(yesterday.getDate()).padStart(2,'0');

  if (dk === todayKey)  return '📅 Oggi — '+d.getDate()+' '+months[d.getMonth()];
  if (dk === yestKey)   return '📅 Ieri — '+d.getDate()+' '+months[d.getMonth()];
  return days[d.getDay()]+' '+d.getDate()+' '+months[d.getMonth()]+' '+d.getFullYear();
}
