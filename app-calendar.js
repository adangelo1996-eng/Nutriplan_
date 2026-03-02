/* ============================================================
   APP-CALENDAR.JS — Date utilities, calendario, selectDate
============================================================ */

function formatDateKey(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function parseDateKey(dk) {
  if (!dk) return new Date();
  var parts = dk.split('-');
  if (parts.length !== 3) return new Date();
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

var DAYS_IT   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
var MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

var _calOffset = 0;

function buildCalendarBar() {
  var bar = document.getElementById('calendarBar');
  if (!bar) return;
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var activeDk = (typeof selectedDateKey !== 'undefined' && selectedDateKey) ? selectedDateKey : getCurrentDateKey();
  var activeD = parseDateKey(activeDk);
  activeD.setHours(0, 0, 0, 0);
  var html = '';
  var start = -20 + _calOffset;
  var end   =  10 + _calOffset;
  for (var i = start; i <= end; i++) {
    var d = new Date(today);
    d.setDate(today.getDate() + i);
    var dk = formatDateKey(d);
    var isToday  = dk === getCurrentDateKey();
    var isActive = dk === selectedDateKey;
    var hd = (typeof appHistory !== 'undefined' && appHistory[dk]) ? appHistory[dk] : {};
    var hasData = Object.keys(hd.usedItems || {}).some(function(mk) {
      return Object.keys((hd.usedItems || {})[mk] || {}).length > 0;
    }) || Object.keys(hd.ricette || {}).some(function(mk){
      return Object.keys((hd.ricette || {})[mk] || {}).length > 0;
    });
    var isPast   = d < today && !isToday;
    var isFuture = d > today && !isToday;
    var dist = Math.abs(Math.round((d - activeD) / 86400000));
    var distCls = dist === 0 ? '' : dist === 1 ? ' cal-d1' : dist === 2 ? ' cal-d2' : dist === 3 ? ' cal-d3' : ' cal-dfar';
    var cls = 'cal-day' +
      (isToday  ? ' today'      : '') +
      (isActive ? ' active'     : '') +
      (hasData  ? ' has-data'   : '') +
      (isPast   ? ' cal-past'   : '') +
      (isFuture ? ' cal-future' : '') +
      distCls;
    html +=
      '<div class="' + cls + '" onclick="selectDate(\'' + dk + '\')" data-dk="' + dk + '">' +
        '<span class="cal-day-name">' + DAYS_IT[d.getDay()] + '</span>' +
        '<span class="cal-day-num">'  + d.getDate() + '</span>' +
        '<span class="cal-day-month">' + MONTHS_IT[d.getMonth()] + '</span>' +
        (hasData ? '<span class="cal-dot"></span>' : '') +
      '</div>';
  }
  bar.innerHTML = html;
  setTimeout(function() {
    var active = bar.querySelector('.cal-day.active') || bar.querySelector('.cal-day.today');
    if (active) {
      var barWidth  = bar.offsetWidth;
      var dayLeft   = active.offsetLeft;
      var dayWidth  = active.offsetWidth;
      var targetScroll = dayLeft - (barWidth / 2) + (dayWidth / 2);
      bar.scrollLeft = Math.max(0, targetScroll);
    }
  }, 80);
  var prevBtn = document.getElementById('calPrevBtn');
  var nextBtn = document.getElementById('calNextBtn');
  if (prevBtn) prevBtn.disabled = _calOffset <= -710;
  if (nextBtn) nextBtn.disabled = _calOffset >= 20;
}

function shiftCalendar(delta) {
  _calOffset = Math.max(-710, Math.min(20, _calOffset + delta));
  buildCalendarBar();
}

function updateDateLabel() {
  var el = document.getElementById('selectedDateLabel');
  if (!el) return;
  var d = selectedDateKey ? parseDateKey(selectedDateKey) : new Date();
  var today = new Date(); today.setHours(0,0,0,0);
  var diff = Math.round((d - today) / 86400000);
  var prefix = diff === 0 ? 'Oggi, ' : diff === -1 ? 'Ieri, ' : diff === 1 ? 'Domani, ' : '';
  el.textContent = prefix + DAYS_IT[d.getDay()] + ' ' + d.getDate() + ' ' +
                   MONTHS_IT[d.getMonth()] + ' ' + d.getFullYear();
}

function selectDate(dk) {
  var todayDk = typeof getCurrentDateKey === 'function' ? getCurrentDateKey() : '';
  if (dk !== todayDk) {
    var d = typeof parseDateKey === 'function' ? parseDateKey(dk) : new Date(dk + 'T00:00:00');
    var todayD = new Date(); todayD.setHours(0,0,0,0);
    if (d < todayD) {
      var hd = (typeof appHistory !== 'undefined' && appHistory && appHistory[dk]) ? appHistory[dk] : {};
      var hasData = Object.keys(hd.usedItems||{}).some(function(m){ return Object.keys((hd.usedItems||{})[m]||{}).length>0; });
      if (hasData) {
        showAppConfirm({
          title: 'Modifica dati',
          message: 'Vuoi modificare i dati di ' + dk + '?\nLe modifiche aggiornano i dati storici.',
          primaryText: 'Sì',
          primaryAction: function() {
            selectedDateKey = dk;
            buildCalendarBar();
            updateDateLabel();
            if (typeof renderPiano === 'function') renderPiano();
          }
        });
        return;
      }
    }
  }
  selectedDateKey = dk;
  buildCalendarBar();
  updateDateLabel();
  if (typeof renderPiano === 'function') renderPiano();
}
