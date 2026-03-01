/* ============================================================
   CASA-WEATHER.JS — Meteo per pagina Casa
   Geolocation + Open-Meteo (gratuito, no API key), cache, contesto per suggerimenti.
   ============================================================ */

var casaWeatherCache = null;
var CASA_WEATHER_CACHE_MS = 20 * 60 * 1000; /* 20 minuti */

/* WMO weather codes → condizione e etichetta IT */
function wmoToCondition(code) {
  if (code === 0) return { key: 'sunny', label: 'Sereno', icon: '☀️' };
  if (code >= 1 && code <= 3) return { key: 'cloudy', label: code === 1 ? 'Prevalentemente sereno' : code === 2 ? 'Parzialmente nuvoloso' : 'Nuvoloso', icon: '☁️' };
  if (code === 45 || code === 48) return { key: 'fog', label: 'Nebbia', icon: '🌫️' };
  if (code >= 51 && code <= 67) return { key: 'rain', label: 'Pioggia', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { key: 'snow', label: 'Neve', icon: '❄️' };
  if (code >= 80 && code <= 82) return { key: 'rain', label: 'Rovesci', icon: '🌦️' };
  if (code >= 95 && code <= 99) return { key: 'thunderstorm', label: 'Temporale', icon: '⛈️' };
  return { key: 'cloudy', label: 'Variabile', icon: '🌤️' };
}

/**
 * Ottiene meteo per Casa: posizione → Open-Meteo → callback con { temp, condition, label, icon, error }.
 * Usa cache se valida (CASA_WEATHER_CACHE_MS).
 */
function getWeatherForCasa(callback) {
  if (typeof callback !== 'function') return;
  var now = Date.now();
  if (casaWeatherCache && (now - casaWeatherCache.fetchedAt) < CASA_WEATHER_CACHE_MS) {
    callback(casaWeatherCache);
    return;
  }
  if (!navigator.geolocation) {
    callback({ error: 'Geolocalizzazione non supportata' });
    return;
  }
  navigator.geolocation.getCurrentPosition(
    function (position) {
      var lat = position.coords.latitude;
      var lon = position.coords.longitude;
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon) + '&current=temperature_2m,weather_code';
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        try {
          if (xhr.status !== 200) {
            callback({ error: 'Meteo non disponibile' });
            return;
          }
          var data = JSON.parse(xhr.responseText);
          var current = data.current;
          if (!current) {
            callback({ error: 'Dati meteo non validi' });
            return;
          }
          var temp = current.temperature_2m;
          var code = current.weather_code || 0;
          var cond = wmoToCondition(code);
          var result = {
            temp: temp != null ? Math.round(temp) : null,
            condition: cond.key,
            label: cond.label,
            icon: cond.icon,
            fetchedAt: now
          };
          casaWeatherCache = result;
          callback(result);
        } catch (e) {
          callback({ error: 'Errore meteo' });
        }
      };
      xhr.onerror = function () { callback({ error: 'Errore di rete' }); };
      xhr.send();
    },
    function () {
      callback({ error: 'Posizione non disponibile' });
    },
    { timeout: 10000, maximumAge: CASA_WEATHER_CACHE_MS }
  );
}

/**
 * Contesto per suggerimenti pasto: { type: 'cold'|'hot'|'rain'|'neutral', season?: 'summer'|'winter'|'spring'|'autumn' }.
 */
function getWeatherSuggestionContext(weather) {
  if (!weather || weather.error) return null;
  var type = 'neutral';
  var temp = weather.temp;
  var cond = weather.condition;
  if (cond === 'snow' || (temp != null && temp < 12)) type = 'cold';
  else if (temp != null && temp > 28) type = 'hot';
  else if (cond === 'rain' || cond === 'thunderstorm') type = 'rain';
  var month = new Date().getMonth() + 1;
  var season = month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
  return { type: type, season: season };
}
