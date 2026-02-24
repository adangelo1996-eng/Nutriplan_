/* Continua da commit precedente - aggiungere al file app.js le funzioni del calendario compatto */

/* ══════════════════════════════════════════════════════
   CALENDARIO COMPATTO 6 GIORNI CON SCROLL
══════════════════════════════════════════════════════ */

/* Offset per scorrere i 6 giorni visualizzati */
var _calendarOffset = -2;  // mostra 2 giorni prima + oggi + 3 giorni dopo

function shiftCalendar(days) {
  _calendarOffset += (days > 0 ? 1 : -1);
  renderCalendar();
}

function renderCalendar() {
  var bar = document.getElementById('calendarBar');
  if (!bar) return;
  
  var today = new Date();
  var todayKey = formatDateKey(today);
  var selectedKey = selectedDateKey || todayKey;
  
  // 6 giorni totali: offset + 6
  var days = [];
  for (var i = 0; i < 6; i++) {
    var d = new Date(today);
    d.setDate(today.getDate() + _calendarOffset + i);
    days.push(d);
  }
  
  bar.innerHTML = days.map(function(d) {
    var key = formatDateKey(d);
    var isToday = key === todayKey;
    var isSelected = key === selectedKey;
    var isPast = d < today && !isToday;
    
    var dayName = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][d.getDay()];
    var dayNum = d.getDate();
    
    var cls = 'cal-day';
    if (isSelected) cls += ' active';
    if (isToday) cls += ' today';
    if (isPast) cls += ' past';
    
    return '<button class="' + cls + '" onclick="selectDate(\'' + key + '\',' + isPast + ')">' +
      '<div class="cal-day-name">' + dayName + '</div>' +
      '<div class="cal-day-num">' + dayNum + '</div>' +
    '</button>';
  }).join('');
}

function selectDate(dateKey, isPast) {
  // Alert per giorni passati
  if (isPast) {
    if (!confirm('⚠️ Stai modificando un giorno passato. Le modifiche non intaccheranno la dispensa attuale. Vuoi continuare?')) {
      return;
    }
  }
  
  // Giorni futuri: nessun alert, ma non intaccano dispensa
  selectedDateKey = dateKey;
  var label = document.getElementById('selectedDateLabel');
  if (label) {
    var d = parseDateKey(dateKey);
    var today = formatDateKey(new Date());
    if (dateKey === today) {
      label.textContent = 'Oggi';
    } else {
      var dayName = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'][d.getDay()];
      label.textContent = dayName + ' ' + d.getDate() + '/' + (d.getMonth()+1);
    }
  }
  
  renderCalendar();
  renderMealPlan();
}

function formatDateKey(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function parseDateKey(key) {
  var parts = key.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/* Nota: le funzioni esistenti toggleUsedItem e choosePianoRecipe devono essere modificate
   per NON ridurre la dispensa se selectedDateKey non è oggi */
