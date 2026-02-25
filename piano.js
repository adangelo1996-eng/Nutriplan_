/* ══════════════════════════════════════════════════════════════════════════════
   NUTRIPLAN — piano.js
   Gestione Piano Pasto (con AI + scadenze + Piano Alimentare + ricerca opzione B)
   
   FIX: Usa Firebase compat API (db.ref(), snapshot.val(), etc.)
   invece delle modular imports che non funzionano con firebase-compat SDK.
   
   FIX: Popola le stub functions create da piano-global.js per compatibilità
   con gli inline event handlers HTML (oninput, onclick, etc.)
══════════════════════════════════════════════════════════════════════════════ */

import { db, auth } from './firebase.js';

/* ══════════════════════════════════════════════════
   1. INIT
══════════════════════════════════════════════════ */
let currentDate     = new Date().toISOString().split('T')[0];
let selectedMeal    = 'colazione';
let allRecipesList  = [];    // tutte le ricette del DB
let suggestedRecipes= [];    // suggerimenti extra
let userDiet        = null;  // obj dieta utente
let frigoData       = [];    // dati frigo
let paData          = null;  // dati Piano Alimentare

/* DEBUG — per rimuovere YYYY-MM-DD fixati */
window.dbgWeekRange = () => {
  const u = auth.currentUser; if (!u) return;
  const wkRef = db.ref(`users/${u.uid}/weekRange`);
  wkRef.remove().then(() => console.log('weekRange rimosso'));
};

/* ══════════════════════════════════════════════════
   1A. GLOBAL FUNCTIONS — Popola le implementazioni reali nelle stub
   create da piano-global.js per garantire compatibilità con inline handlers
══════════════════════════════════════════════════ */
_exposeGlobalFunctions();

function _exposeGlobalFunctions() {
  // selectMeal: chiamato dai bottoni pasto in HTML
  const selectMealImpl = function(meal, btnElement) {
    selectedMeal = meal;
    
    // Aggiorna UI bottoni
    const buttons = document.querySelectorAll('.meal-btn');
    buttons.forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    // Refresh contenuti
    _checkDayMeals();
    _renderSuggestedRecipes();
  };
  
  // filterOggiIngredients: chiamato dalla barra ricerca in HTML
  const filterOggiIngredientsImpl = function(query) {
    const searchQuery = (query || '').toLowerCase().trim();
    const itemsWrap = document.getElementById('mealItemsWrap');
    if (!itemsWrap) return;
    
    const items = itemsWrap.querySelectorAll('.meal-item');
    let visibleCount = 0;
    
    items.forEach(item => {
      const name = (item.querySelector('.meal-item-name')?.textContent || '').toLowerCase();
      const cat = (item.querySelector('.meal-item-icon')?.textContent || '').toLowerCase();
      
      if (!searchQuery || name.includes(searchQuery) || cat.includes(searchQuery)) {
        item.style.display = '';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    // Aggiorna contatore
    const counter = document.getElementById('oggiSearchCounter');
    if (counter) {
      if (searchQuery) {
        counter.textContent = `${visibleCount} risultati`;
        counter.style.display = 'block';
      } else {
        counter.style.display = 'none';
      }
    }
  };
  
  // clearOggiSearch: resetta la ricerca
  const clearOggiSearchImpl = function() {
    const input = document.getElementById('oggiSearch');
    if (input) {
      input.value = '';
      filterOggiIngredientsImpl('');
    }
  };

  // resetPiano: chiamato dal bottone reset nell'HTML
  const resetPianoImpl = function() {
    if (!confirm('Vuoi resettare tutti i pasti di oggi?')) return;
    const u = auth.currentUser; if (!u) return;
    const dayRef = db.ref(`users/${u.uid}/pianoPasto/${currentDate}`);
    dayRef.remove().then(() => {
      _checkDayMeals();
      _buildMealSelector();
      console.log('[piano] Piano resettato per', currentDate);
    });
  };

  // shiftCalendar: chiamato dai bottoni < > del calendario
  const shiftCalendarImpl = function(days) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    currentDate = d.toISOString().split('T')[0];
    _renderCalendarBar();
    _checkDayMeals();
    _buildDayNotes();
  };
  
  // Popola le implementazioni reali nelle stub create da piano-global.js
  // Questo approccio permette agli inline handlers HTML di funzionare
  // anche quando il modulo ES6 non è ancora stato caricato (deferred)
  window._piano_filterOggiIngredients = filterOggiIngredientsImpl;
  window._piano_clearOggiSearch = clearOggiSearchImpl;
  window._piano_selectMeal = selectMealImpl;
  window._piano_resetPiano = resetPianoImpl;
  window._piano_shiftCalendar = shiftCalendarImpl;
  
  // Sovrascrivi le stub con le implementazioni reali
  window.filterOggiIngredients = filterOggiIngredientsImpl;
  window.clearOggiSearch = clearOggiSearchImpl;
  window.selectMeal = selectMealImpl;
  window.resetPiano = resetPianoImpl;
  window.shiftCalendar = shiftCalendarImpl;
  
  // Processa eventuali chiamate in coda fatte prima che il modulo fosse pronto
  if (typeof window._processPianoQueue === 'function') {
    window._processPianoQueue();
  }
  
  console.log('[piano] Funzioni globali caricate - piano.js pronto');
}

export function initPiano() {
  if (!auth.currentUser) {
    console.log('[piano] Utente non autenticato, skip init.');
    return;
  }
  console.log('[piano] Init Piano Pasto');
  _setupCalendar();
  _loadFrigoData();
  _loadDietPreferences();
  _loadRecipes();
  _buildMealSelector();
  _renderAddItemRow();
  _buildDayNotes();
  _setupAIRecipeGen();
  _setupAIStatsBtn();
  _checkDayMeals();
  _initExpiringSection();
  _initPianoAlimentare();
  _setupAIPianoWizardBtn();
  _initRecipeSearch();
}

/* ══════════════════════════════════════════════════
   2. CALENDARIO TIMELINE
══════════════════════════════════════════════════ */
let pastRange = 3, futureRange = 3;

function _setupCalendar() {
  const barEl = document.getElementById('calendarBar');
  if (!barEl) return;
  _renderCalendarBar();
  barEl.dataset.listen = 'true';
}

function _renderCalendarBar() {
  const bar = document.getElementById('calendarBar');
  if (!bar) return;
  bar.innerHTML = '';

  const selDate  = new Date(currentDate);
  const todayStr = new Date().toISOString().split('T')[0];
  const today    = new Date(todayStr);
  const minDate  = new Date(today); minDate.setDate(minDate.getDate() - pastRange);
  const maxDate  = new Date(today); maxDate.setDate(maxDate.getDate() + futureRange);

  const start = new Date(minDate);
  const end   = new Date(maxDate);
  const days  = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
    days.push(new Date(d));
  }

  days.forEach(d => {
    const iso = d.toISOString().split('T')[0];
    const isActive= (iso === currentDate);
    const isToday = (iso === todayStr);
    const isPast  = (d < today && !isToday);

    const dayName = d.toLocaleDateString('it-IT',{weekday:'short'});
    const dayNum  = d.getDate();
    const month   = d.toLocaleDateString('it-IT',{month:'short'}).replace('.','');

    let distClass = '';
    if (!isActive && !isToday) {
      const diffDays = Math.abs(Math.floor((d - selDate)/(1000*60*60*24)));
      if      (diffDays===1) distClass='cal-d1';
      else if (diffDays===2) distClass='cal-d2';
      else if (diffDays===3) distClass='cal-d3';
      else                   distClass='cal-dfar';
    }

    const div = document.createElement('div');
    div.className='cal-day';
    if (isActive) div.classList.add('active');
    if (isToday)  div.classList.add('today');
    if (isPast)   div.classList.add('cal-past');
    if (distClass) div.classList.add(distClass);
    div.dataset.date=iso;

    div.innerHTML=`
      <span class="cal-day-name">${dayName}</span>
      <span class="cal-day-num">${dayNum}</span>
      <span class="cal-day-month">${month}</span>
    `;
    div.addEventListener('click',()=>{
      currentDate=iso; 
      _renderCalendarBar(); 
      _checkDayMeals(); 
      _buildDayNotes();
    });
    bar.appendChild(div);
  });
  setTimeout(()=>{
    const active=bar.querySelector('.cal-day.active');
    if (active) active.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
  },50);
}

/* ══════════════════════════════════════════════════
   3. LOAD DATI (frigo, dieta, ricette, PA)
══════════════════════════════════════════════════ */
function _loadFrigoData() {
  const u=auth.currentUser; if (!u) return;
  const fRef=db.ref(`users/${u.uid}/frigo`);
  fRef.on('value', snap=>{
    if (snap.exists()) frigoData=snap.val();
    else frigoData=[];
    _renderSuggestedRecipes();
  });
}

function _loadDietPreferences() {
  const u=auth.currentUser; if (!u) return;
  const dietRef=db.ref(`users/${u.uid}/diet`);
  dietRef.on('value', snap=>{
    if (snap.exists()) userDiet=snap.val();
    else userDiet=null;
    _renderSuggestedRecipes();
  });
}

function _loadRecipes() {
  const rRef=db.ref('recipes');
  rRef.on('value', snap=>{
    if (snap.exists()) {
      const obj=snap.val();
      allRecipesList=Object.keys(obj).map(k=>({id:k,...obj[k]}));
    } else {
      allRecipesList=[];
    }
    _renderSuggestedRecipes();
  });
}

function _initPianoAlimentare() {
  const u=auth.currentUser; if (!u) return;
  const paRef=db.ref(`users/${u.uid}/pianoAlimentare`);
  paRef.on('value', snap=>{
    paData= snap.exists() ? snap.val() : null;
  });
}

/* ══════════════════════════════════════════════════
   4. SELETTORE PASTO
══════════════════════════════════════════════════ */
function _buildMealSelector() {
  const sel=document.getElementById('mealSelector');
  if (!sel) return;
  const u=auth.currentUser; if (!u) return;

  const meals = [
    {key:'colazione',icon:'☕️',label:'Colazione'},
    {key:'pranzo',icon:'🍝',label:'Pranzo'},
    {key:'cena',icon:'🍖',label:'Cena'},
    {key:'spuntini',icon:'🍪',label:'Spuntini'},
  ];

  sel.innerHTML='';
  const dayRef=db.ref(`users/${u.uid}/pianoPasto/${currentDate}`);
  dayRef.once('value').then(snap=>{
    const data= snap.exists() ? snap.val() : {};
    meals.forEach(m=>{
      const items= data[m.key]?.items || [];
      const cons = data[m.key]?.consumed || [];
      const totCount=items.length;
      const consumedCount=cons.length;

      const btn=document.createElement('button');
      btn.className='meal-btn';
      if (m.key===selectedMeal) btn.classList.add('active');
      btn.innerHTML=`
        <div class="meal-btn-icon">${m.icon}</div>
        <div class="meal-btn-label">${m.label}</div>
        <div class="meal-btn-count">${consumedCount}/${totCount}</div>
      `;
      btn.addEventListener('click',()=>{
        selectedMeal=m.key; 
        _buildMealSelector(); 
        _checkDayMeals();
        _renderSuggestedRecipes();
      });
      sel.appendChild(btn);
    });
  });
}

/* ══════════════════════════════════════════════════
   5. RENDER INGREDIENTI PASTO
══════════════════════════════════════════════════ */
function _checkDayMeals() {
  const u=auth.currentUser; if (!u) return;
  const dayRef=db.ref(`users/${u.uid}/pianoPasto/${currentDate}`);
  dayRef.once('value').then(snap=>{
    const data= snap.exists() ? snap.val() : {};
    _renderMealItems(data);
  });
}

function _renderMealItems(data) {
  const list=document.getElementById('mealItemsWrap');
  if (!list) return;
  list.innerHTML='';

  const items=data[selectedMeal]?.items || [];
  const cons =data[selectedMeal]?.consumed || [];

  if (!items.length) {
    list.innerHTML='<p style="text-align:center;color:var(--text-3);padding:24px;">Nessun ingrediente aggiunto</p>';
    return;
  }

  items.forEach((it,idx)=>{
    const ic= it.categoria || '🍫';
    const isUsed=cons.includes(idx);
    const div=document.createElement('div');
    div.className='meal-item';
    if (isUsed) div.classList.add('used');

    let stat='';
    if (!isUsed) {
      const avail= _checkAvailability(it.name,it.quantity || 0,it.unit || '');
      if (avail) stat=`<span class="meal-item-status avail">✓ In frigo</span>`;
      else       stat=`<span class="meal-item-status missing">✗ Mancante</span>`;
    }

    div.innerHTML=`
      <div class="meal-item-icon">${ic}</div>
      <div class="meal-item-info">
        <div class="meal-item-name">${it.name}</div>
        <div class="meal-item-qty">${it.quantity||0} ${it.unit||''}</div>
        ${stat}
      </div>
      <div class="meal-item-actions">
        <button class="meal-item-btn btn-use-item" onclick="window.pianoModule.consumeItem(${idx})" 
          ${isUsed?'disabled':''} title="Consuma">✓</button>
        <button class="meal-item-btn btn-del-item" onclick="window.pianoModule.delItem(${idx})" 
          title="Rimuovi">✕</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function _checkAvailability(ingName,qNeeded,unit) {
  const norm= s=>s?.toLowerCase().trim()||'';
  const ingN= norm(ingName); const uN=norm(unit);
  return frigoData.some(f=>{
    if (norm(f.name)!==ingN) return false;
    if (uN && norm(f.unit)!==uN) return false;
    return (f.quantity||0)>=qNeeded;
  });
}

window.pianoModule=window.pianoModule||{};
window.pianoModule.consumeItem=consumeItem;
window.pianoModule.delItem=delItem;
window.pianoModule.addManualItem=addManualItem;
window.pianoModule.addRecipe=addRecipe;

function consumeItem(idx) {
  const u=auth.currentUser; if (!u) return;
  const cRef=db.ref(`users/${u.uid}/pianoPasto/${currentDate}/${selectedMeal}/consumed`);
  cRef.once('value').then(snap=>{
    let arr=snap.exists() ? snap.val() : [];
    if (!arr.includes(idx)) arr.push(idx);
    cRef.set(arr).then(()=>{
      _checkDayMeals(); _buildMealSelector();
      console.log('[piano] Item consumato:',idx);
    });
  });
}

function delItem(idx) {
  if (!confirm('Rimuovere questo ingrediente dal pasto?')) return;
  const u=auth.currentUser; if (!u) return;
  const iRef=db.ref(`users/${u.uid}/pianoPasto/${currentDate}/${selectedMeal}/items`);
  iRef.once('value').then(snap=>{
    if (!snap.exists()) return;
    let arr=snap.val(); arr.splice(idx,1);
    iRef.set(arr).then(()=>{
      _checkDayMeals(); _buildMealSelector();
      console.log('[piano] Item rimosso:',idx);
    });
  });
}

/* ══════════════════════════════════════════════════
   6. ADD ITEM MANUALE
══════════════════════════════════════════════════ */
function _renderAddItemRow() {
  const cont=document.getElementById('addItemRow');
  if (!cont) return;
  cont.innerHTML=`
    <select id="addItemCat">
      <option value="🥩">🥩 Proteine</option>
      <option value="🍚">🍚 Carboidrati</option>
      <option value="🥑">🥑 Grassi</option>
      <option value="🥦">🥦 Verdure</option>
      <option value="🍎">🍎 Frutta</option>
      <option value="🧀">🧀 Latticini</option>
      <option value="🥚">🥚 Uova</option>
      <option value="🥤">🥤 Liquidi</option>
      <option value="🍫">🍫 Altro</option>
    </select>
    <input type="text" id="addItemName" placeholder="Nome ingrediente" />
    <input type="number" id="addItemQty" placeholder="Quantità" value="1" style="max-width:80px;" />
    <input type="text" id="addItemUnit" placeholder="Unità (g,ml…)" style="max-width:80px;" />
    <button class="btn btn-s btn-primary" onclick="window.pianoModule.addManualItem()">+ Aggiungi</button>
  `;
}

function addManualItem() {
  const cat= document.getElementById('addItemCat')?.value || '🍫';
  const name=document.getElementById('addItemName')?.value.trim();
  const qty= parseFloat(document.getElementById('addItemQty')?.value) || 1;
  const unit=document.getElementById('addItemUnit')?.value.trim() || '';
  if (!name) { alert('Inserisci almeno il nome!'); return; }

  const u=auth.currentUser; if (!u) return;
  const iRef=db.ref(`users/${u.uid}/pianoPasto/${currentDate}/${selectedMeal}/items`);
  iRef.once('value').then(snap=>{
    let arr=snap.exists()? snap.val():[];
    arr.push({name,quantity:qty,unit,categoria:cat});
    iRef.set(arr).then(()=>{
      _checkDayMeals(); _buildMealSelector();
      document.getElementById('addItemName').value='';
      document.getElementById('addItemQty').value='1';
      document.getElementById('addItemUnit').value='';
      console.log('[piano] Item manuale aggiunto:',name);
    });
  });
}

/* ══════════════════════════════════════════════════
   7. NOTE GIORNO
══════════════════════════════════════════════════ */
function _buildDayNotes() {
  const noteEl=document.getElementById('dayNotesText');
  if (!noteEl) return;
  const u=auth.currentUser; if (!u) return;
  const nRef=db.ref(`users/${u.uid}/pianoPasto/${currentDate}/notes`);
  nRef.once('value').then(snap=>{
    noteEl.value= snap.exists() ? snap.val() : '';
  });
  noteEl.removeEventListener('blur',_saveNotes);
  noteEl.addEventListener('blur',_saveNotes);
}

function _saveNotes() {
  const noteEl=document.getElementById('dayNotesText');
  if (!noteEl) return;
  const u=auth.currentUser; if (!u) return;
  const nRef=db.ref(`users/${u.uid}/pianoPasto/${currentDate}/notes`);
  nRef.set(noteEl.value.trim()).then(()=>console.log('[piano] Note salvate.'));
}

/* ══════════════════════════════════════════════════
   8. RICETTE SUGGERITE
══════════════════════════════════════════════════ */
let searchQuery = '';

function _initRecipeSearch() {
  const cont=document.getElementById('pianoRicetteWrap');
  if (!cont) return;
  
  let searchBar = cont.querySelector('#recipeSearchBar');
  if (!searchBar) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText='margin-bottom:12px;';
    wrapper.innerHTML=`
      <input type="text" id="recipeSearchBar" class="form-control" 
        placeholder="🔍 Cerca ricette per nome o ingrediente..." 
        style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--r-lg);font-size:.88rem;">
    `;
    cont.insertBefore(wrapper, cont.firstChild);
    searchBar = document.getElementById('recipeSearchBar');
  }
  
  if (searchBar) {
    searchBar.addEventListener('input', (e)=>{
      searchQuery = e.target.value.toLowerCase().trim();
      _renderSuggestedRecipes();
    });
  }
}

function _renderSuggestedRecipes() {
  const cont=document.getElementById('pianoRicetteWrap');
  if (!cont) return;
  
  let grid = cont.querySelector('.rc-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className='rc-grid';
    grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:12px;';
    cont.appendChild(grid);
  }
  grid.innerHTML='';

  let filteredList = allRecipesList.slice();

  // 1) FILTRO DIETA
  if (userDiet?.enabled) {
    const ex = userDiet.excluded || [];
    const all= userDiet.allergens || [];
    filteredList = filteredList.filter(r=>{
      const tags=(r.tags||'').toLowerCase();
      if (ex.some(e=>tags.includes(e.toLowerCase()))) return false;
      const ings=(r.ingredients||[]).map(i=>i.name?.toLowerCase()||'');
      if (all.some(a=>ings.some(ing=>ing.includes(a.toLowerCase())))) return false;
      return true;
    });
  }

  // 2) FILTRO PASTO
  filteredList=filteredList.filter(r=> {
    const pm=(r.pasto||'').toLowerCase();
    if (selectedMeal==='spuntini') return pm.includes('spuntin');
    return pm.includes(selectedMeal);
  });

  // 3) FILTRO RICERCA
  if (searchQuery) {
    filteredList = filteredList.filter(r=> {
      const name = (r.name || '').toLowerCase();
      if (name.includes(searchQuery)) return true;
      const ings = (r.ingredients || []).map(i=>(i.name||'').toLowerCase());
      return ings.some(ing=>ing.includes(searchQuery));
    });
  }

  // 4) ORDINA PER DISPONIBILITÀ
  const scored = filteredList.map(r=>{
    const ings = r.ingredients || [];
    let available=0, missing=0;
    ings.forEach(ing=>{
      const avail=_checkAvailability(ing.name, ing.quantity||0, ing.unit||'');
      if (avail) available++; else missing++;
    });
    const total=ings.length||1;
    const pct= (available/total)*100;
    return { recipe:r, available, missing, total, pct };
  });
  scored.sort((a,b)=> b.pct - a.pct);

  if (scored.length===0) {
    grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-3);">
      <div style="font-size:2.5rem;margin-bottom:8px;">🍽️</div>
      <div style="font-weight:600;margin-bottom:4px;">Nessuna ricetta</div>
      <div style="font-size:.88rem;">${searchQuery ? 'Nessun risultato per questa ricerca.' : 'Nessuna ricetta trovata per questo pasto.'}</div>
    </div>`;
    return;
  }

  scored.forEach(s=>{
    const r= s.recipe;
    const card=document.createElement('div');
    card.style.cssText='background:var(--bg-2);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:14px;cursor:pointer;transition:all .2s;';
    card.onmouseenter=()=>card.style.borderColor='var(--primary)';
    card.onmouseleave=()=>card.style.borderColor='var(--border)';

    let badgeClass='badge-grey', badgeText=`${s.available}/${s.total}`;
    if (s.pct===100) { badgeClass='badge-ok';   badgeText=`✓ Tutto disponibile`; }
    else if (s.pct>=50) { badgeClass='badge-warn'; badgeText=`${s.available}/${s.total} disponibile`; }

    card.innerHTML=`
      <div style="font-weight:700;margin-bottom:6px;">${r.name||'Senza nome'}</div>
      <div style="font-size:.82rem;color:var(--text-3);margin-bottom:8px;">${r.pasto||'Vario'}</div>
      <span style="display:inline-block;padding:2px 8px;border-radius:var(--r-sm);font-size:.75rem;font-weight:600;
        ${s.pct===100?'background:#dcfce7;color:#16a34a;':s.pct>=50?'background:#fef3c7;color:#ca8a04;':'background:var(--bg-3);color:var(--text-3);'}">
        ${badgeText}
      </span>
      <button class="btn btn-primary btn-small" style="width:100%;margin-top:10px;" 
        onclick="window.pianoModule.addRecipe('${r.id}');event.stopPropagation();">
        + Aggiungi al Pasto
      </button>
    `;
    grid.appendChild(card);
  });
}

function addRecipe(recipeId) {
  const r= allRecipesList.find(x=>x.id===recipeId);
  if (!r) { alert('Ricetta non trovata.'); return; }
  const ings= r.ingredients || [];
  if (!ings.length) { alert('Ricetta senza ingredienti.'); return; }

  const u=auth.currentUser; if (!u) return;
  const iRef=db.ref(`users/${u.uid}/pianoPasto/${currentDate}/${selectedMeal}/items`);
  iRef.once('value').then(snap=>{
    let arr=snap.exists()? snap.val():[];
    ings.forEach(ing=>{
      arr.push({
        name:ing.name,
        quantity:ing.quantity||0,
        unit:ing.unit||'',
        categoria:ing.categoria||'🍫'
      });
    });
    iRef.set(arr).then(()=>{
      _checkDayMeals(); _buildMealSelector(); _renderSuggestedRecipes();
      console.log('[piano] Ricetta aggiunta:',r.name);
      alert(`Ricetta "${r.name}" aggiunta al pasto!`);
    });
  });
}

/* ══════════════════════════════════════════════════
   9. AI RICETTE (stub)
══════════════════════════════════════════════════ */
function _setupAIRecipeGen() { /* gestito da gemini.js */ }
function _setupAIStatsBtn() { /* gestito da gemini.js */ }
function _initExpiringSection() { /* opzionale */ }
function _setupAIPianoWizardBtn() { /* opzionale */ }

console.log('[piano] piano.js caricato - compat API + global functions');
