/* ══════════════════════════════════════════════════════════════════════════════
   NUTRIPLAN — piano.js
   Gestione Piano Pasto (con AI + scadenze + Piano Alimentare + ricerca opzione B)
══════════════════════════════════════════════════════════════════════════════ */

import { db, auth } from './firebase.js';
import {
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  push,
  child
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';
import { openRecipeModal } from './ricette.js';

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
  const wkRef = ref(db, `users/${u.uid}/weekRange`);
  remove(wkRef).then(() => console.log('weekRange rimosso'));
};

/* ══════════════════════════════════════════════════
   1A. GLOBAL FUNCTIONS — Esposte IMMEDIATAMENTE al caricamento del modulo
   FIX: non dentro initPiano() per garantire disponibilità anche prima dell'auth
══════════════════════════════════════════════════ */
_exposeGlobalFunctions();

function _exposeGlobalFunctions() {
  // selectMeal: chiamato dai bottoni pasto in HTML
  window.selectMeal = function(meal, btnElement) {
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
  window.filterOggiIngredients = function(query) {
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
  window.clearOggiSearch = function() {
    const input = document.getElementById('oggiSearch');
    if (input) {
      input.value = '';
      window.filterOggiIngredients('');
    }
  };

  // resetPiano: chiamato dal bottone reset nell'HTML
  window.resetPiano = function() {
    if (!confirm('Vuoi resettare tutti i pasti di oggi?')) return;
    const u = auth.currentUser; if (!u) return;
    const dayRef = ref(db, `users/${u.uid}/pianoPasto/${currentDate}`);
    remove(dayRef).then(() => {
      _checkDayMeals();
      _buildMealSelector();
      console.log('[piano] Piano resettato per', currentDate);
    });
  };

  // shiftCalendar: chiamato dai bottoni < > del calendario
  window.shiftCalendar = function(days) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    currentDate = d.toISOString().split('T')[0];
    _renderCalendarBar();
    _checkDayMeals();
    _buildDayNotes();
  };
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
  _initRecipeSearch();  // ← OPZIONE B: barra ricerca ricette
}

/* ══════════════════════════════════════════════════
   2. CALENDARIO TIMELINE (left → selected → right)
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

    // fade: calcola distanza dal selected
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
  // scroll to selected
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
  const fRef=ref(db,`users/${u.uid}/frigo`);
  onValue(fRef,snap=>{
    if (snap.exists()) frigoData=snap.val();
    else frigoData=[];
    // FIX: re-render ricette quando il frigo cambia
    _renderSuggestedRecipes();
  });
}

function _loadDietPreferences() {
  const u=auth.currentUser; if (!u) return;
  const dietRef=ref(db,`users/${u.uid}/diet`);
  onValue(dietRef,snap=>{
    if (snap.exists()) userDiet=snap.val();
    else userDiet=null;
    // FIX: re-render ricette quando la dieta cambia
    _renderSuggestedRecipes();
  });
}

function _loadRecipes() {
  const rRef=ref(db,'recipes');
  onValue(rRef,snap=>{
    if (snap.exists()) {
      const obj=snap.val();
      allRecipesList=Object.keys(obj).map(k=>({id:k,...obj[k]}));
    } else {
      allRecipesList=[];
    }
    // FIX: render ricette quando si caricano dal DB
    _renderSuggestedRecipes();
  });
}

function _initPianoAlimentare() {
  const u=auth.currentUser; if (!u) return;
  const paRef=ref(db,`users/${u.uid}/pianoAlimentare`);
  onValue(paRef,snap=>{
    paData= snap.exists() ? snap.val() : null;
  });
}

/* ══════════════════════════════════════════════════
   4. SELETTORE PASTO (colazione/pranzo/cena/spuntini)
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
  const dayRef=ref(db,`users/${u.uid}/pianoPasto/${currentDate}`);
  get(dayRef).then(snap=>{
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
        // FIX: aggiorna ricette suggerite quando cambia pasto
        _renderSuggestedRecipes();
      });
      sel.appendChild(btn);
    });
  });
}

/* ══════════════════════════════════════════════════
   5. CHECK E RENDER ITEM PASTO
══════════════════════════════════════════════════ */
function _checkDayMeals() {
  const u=auth.currentUser; if (!u) return;
  const dayPath=`users/${u.uid}/pianoPasto/${currentDate}`;
  const dRef=ref(db,dayPath);
  get(dRef).then(snap=>{
    const data= snap.exists() ? snap.val() : {};
    _renderMealItems(data);
  });
}

function _renderMealItems(data) {
  const list=document.getElementById('mealItemsList');
  if (!list) return;
  list.innerHTML='';

  const items=data[selectedMeal]?.items || [];
  const cons =data[selectedMeal]?.consumed || [];

  const catMap={
    '🥩':'Proteine', '🍚':'Carboidrati', '🥑':'Grassi',
    '🥦':'Verdure', '🍎':'Frutta', '🧀':'Latticini',
    '🥚':'Uova', '🥤':'Liquidi', '🍫':'Altro'
  };
  const grouped={};
  Object.keys(catMap).forEach(em=>{ grouped[em]=[]; });

  items.forEach((it,idx)=>{
    const cat= it.categoria || '🍫';
    if (!grouped[cat]) grouped[cat]=[];
    grouped[cat].push({...it, origIndex:idx});
  });

  Object.keys(catMap).forEach(em=>{
    const arr=grouped[em];
    if (!arr.length) return;
    const secDiv=document.createElement('div');
    secDiv.innerHTML=`<div class="meal-category-title">${em} ${catMap[em]}</div>`;
    arr.forEach(it=>{
      const ic= it.categoria || '🍫';
      const isUsed=cons.includes(it.origIndex);
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
          <button class="meal-item-btn btn-use-item" onclick="window.pianoModule.consumeItem(${it.origIndex})" 
            ${isUsed?'disabled':''} title="Consuma">✓</button>
          <button class="meal-item-btn btn-del-item" onclick="window.pianoModule.delItem(${it.origIndex})" 
            title="Rimuovi">✕</button>
        </div>
      `;
      secDiv.appendChild(div);
    });
    list.appendChild(secDiv);
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

function consumeItem(idx) {
  const u=auth.currentUser; if (!u) return;
  const cPath=`users/${u.uid}/pianoPasto/${currentDate}/${selectedMeal}/consumed`;
  const cRef=ref(db,cPath);
  get(cRef).then(snap=>{
    let arr=snap.exists() ? snap.val() : [];
    if (!arr.includes(idx)) arr.push(idx);
    set(cRef,arr).then(()=>{
      _checkDayMeals(); _buildMealSelector();
      console.log('[piano] Item consumato:',idx);
    });
  });
}

function delItem(idx) {
  if (!confirm('Rimuovere questo ingrediente dal pasto?')) return;
  const u=auth.currentUser; if (!u) return;
  const iPath=`users/${u.uid}/pianoPasto/${currentDate}/${selectedMeal}/items`;
  const iRef=ref(db,iPath);
  get(iRef).then(snap=>{
    if (!snap.exists()) return;
    let arr=snap.val(); arr.splice(idx,1);
    set(iRef,arr).then(()=>{
      _checkDayMeals(); _buildMealSelector();
      console.log('[piano] Item rimosso:',idx);
    });
  });
}

/* ══════════════════════════════════════════════════
   6. ADD ITEM MANUALE (row inline)
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

window.pianoModule.addManualItem=addManualItem;
function addManualItem() {
  const cat= document.getElementById('addItemCat')?.value || '🍫';
  const name=document.getElementById('addItemName')?.value.trim();
  const qty= parseFloat(document.getElementById('addItemQty')?.value) || 1;
  const unit=document.getElementById('addItemUnit')?.value.trim() || '';
  if (!name) { alert('Inserisci almeno il nome!'); return; }

  const u=auth.currentUser; if (!u) return;
  const iPath=`users/${u.uid}/pianoPasto/${currentDate}/${selectedMeal}/items`;
  const iRef=ref(db,iPath);
  get(iRef).then(snap=>{
    let arr=snap.exists()? snap.val():[];
    arr.push({name,quantity:qty,unit,categoria:cat});
    set(iRef,arr).then(()=>{
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
  const nPath=`users/${u.uid}/pianoPasto/${currentDate}/notes`;
  const nRef=ref(db,nPath);
  get(nRef).then(snap=>{
    noteEl.value= snap.exists() ? snap.val() : '';
  });
  noteEl.removeEventListener('blur',_saveNotes);
  noteEl.addEventListener('blur',_saveNotes);
}

function _saveNotes() {
  const noteEl=document.getElementById('dayNotesText');
  if (!noteEl) return;
  const u=auth.currentUser; if (!u) return;
  const nPath=`users/${u.uid}/pianoPasto/${currentDate}/notes`;
  const nRef=ref(db,nPath);
  set(nRef, noteEl.value.trim()).then(()=>console.log('[piano] Note salvate.'));
}

/* ══════════════════════════════════════════════════
   8. RICETTE SUGGERITE — visualizza ricette filtrate
   (Opzione B: con ricerca + ordinamento disponibilità)
══════════════════════════════════════════════════ */

// ═══ OPZIONE B: RICERCA CON CONTATORE DISPONIBILITÀ ═══
let searchQuery = '';

function _initRecipeSearch() {
  const searchBar = document.getElementById('recipeSearchBar');
  if (!searchBar) {
    // crea dinamicamente la barra di ricerca sopra la griglia
    const cont = document.getElementById('suggestedRecipesDiv');
    if (!cont) return;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText='margin-bottom:14px;';
    wrapper.innerHTML=`
      <input type="text" id="recipeSearchBar" class="form-control" 
        placeholder="🔍 Cerca ricette per nome o ingrediente..." 
        style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--r-lg);font-size:.88rem;">
    `;
    cont.insertBefore(wrapper, cont.firstChild);
  }
  
  const bar = document.getElementById('recipeSearchBar');
  if (bar) {
    bar.addEventListener('input', (e)=>{
      searchQuery = e.target.value.toLowerCase().trim();
      _renderSuggestedRecipes();
    });
  }
}

function _renderSuggestedRecipes() {
  const cont=document.getElementById('suggestedRecipesDiv');
  if (!cont) return;
  
  // trova griglia o creala
  let grid = cont.querySelector('.rc-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className='rc-grid';
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

  // 4) ORDINA PER DISPONIBILITÀ + calcola contatore
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

  // Ordina: 100% → 99% → … → 0%
  scored.sort((a,b)=> b.pct - a.pct);

  if (scored.length===0) {
    grid.innerHTML=`
      <div class="rc-empty">
        <div class="rc-empty-icon">🍽️</div>
        <div class="rc-empty-title">Nessuna ricetta</div>
        <div class="rc-empty-text">
          ${searchQuery ? 'Nessun risultato per questa ricerca.' : 'Nessuna ricetta trovata per questo pasto.'}
        </div>
      </div>
    `;
    return;
  }

  scored.forEach(s=>{
    const r= s.recipe;
    const card=document.createElement('div');
    card.className='rc-card';
    card.style.setProperty('--cc',_mealColor(r.pasto||''));

    // BADGE disponibilità: colori basati su pct
    let badgeClass='badge-grey', badgeText=`${s.available}/${s.total}`;
    if (s.pct===100) { badgeClass='badge-ok';   badgeText=`✓ Tutto disponibile`; }
    else if (s.pct>=50) { badgeClass='badge-warn'; badgeText=`${s.available}/${s.total} disponibile`; }
    else { badgeClass='badge-grey'; badgeText=`${s.available}/${s.total} disponibile`; }

    card.innerHTML=`
      <div class="rc-card-head">
        <div class="rc-icon-wrap">${_mealEmoji(r.pasto||'')}</div>
        <div class="rc-info">
          <div class="rc-name">${r.name||'Senza nome'}</div>
          <div class="rc-meta">
            <span class="rc-pasto">${r.pasto||'Vario'}</span>
            <span class="rc-badge ${badgeClass}">${badgeText}</span>
          </div>
        </div>
        <div class="rc-chevron">▼</div>
      </div>
      <div class="rc-card-body">
        <div class="rc-accordion">
          <div class="rc-accordion-inner">
            <ul class="rc-acc-list">
              ${(r.ingredients||[]).map(i=>{
                const ok=_checkAvailability(i.name,i.quantity||0,i.unit||'');
                return `<li class="rc-acc-item ${ok?'ok':''}">
                  <span class="rc-acc-dot"></span>
                  <span class="rc-acc-name">${i.name}</span>
                  <span class="rc-acc-qty">${i.quantity||0} ${i.unit||''}</span>
                </li>`;
              }).join('')}
            </ul>
            <button class="btn btn-s btn-primary" onclick="window.pianoModule.addRecipe('${r.id}')">
              + Aggiungi al Pasto
            </button>
          </div>
        </div>
      </div>
    `;
    card.querySelector('.rc-card-head').addEventListener('click',()=>{
      card.classList.toggle('open');
    });
    grid.appendChild(card);
  });
}

function _mealEmoji(pm='') {
  const m=pm.toLowerCase();
  if (m.includes('colaz')) return '☕️';
  if (m.includes('pranzo')) return '🍝';
  if (m.includes('cena')) return '🍖';
  if (m.includes('spunti')) return '🍪';
  return '🍽️';
}
function _mealColor(pm='') {
  const m=pm.toLowerCase();
  if (m.includes('colaz')) return '#f59e0b';
  if (m.includes('pranzo')) return '#3b82f6';
  if (m.includes('cena')) return '#8b5cf6';
  if (m.includes('spunti')) return '#ec4899';
  return '#6b7280';
}

window.pianoModule.addRecipe=addRecipe;
function addRecipe(recipeId) {
  const r= allRecipesList.find(x=>x.id===recipeId);
  if (!r) { alert('Ricetta non trovata.'); return; }

  const ings= r.ingredients || [];
  if (!ings.length) { alert('Ricetta senza ingredienti.'); return; }

  const u=auth.currentUser; if (!u) return;
  const iPath=`users/${u.uid}/pianoPasto/${currentDate}/${selectedMeal}/items`;
  const iRef=ref(db,iPath);
  get(iRef).then(snap=>{
    let arr=snap.exists()? snap.val():[];
    ings.forEach(ing=>{
      arr.push({
        name:ing.name,
        quantity:ing.quantity||0,
        unit:ing.unit||'',
        categoria:ing.categoria||'🍫'
      });
    });
    set(iRef,arr).then(()=>{
      _checkDayMeals(); _buildMealSelector(); _renderSuggestedRecipes();
      console.log('[piano] Ricetta aggiunta:',r.name);
      alert(`Ricetta "${r.name}" aggiunta al pasto!`);
    });
  });
}

/* ══════════════════════════════════════════════════
   9. AI — GENERA RICETTA CON GEMINI
══════════════════════════════════════════════════ */
function _setupAIRecipeGen() {
  const btn=document.getElementById('aiRecipeBtn');
  const modal=document.getElementById('aiRecipeModal');
  const closeBtn=modal?.querySelector('.modal-close');
  const genBtn=document.getElementById('aiGenRecipeBtn');
  const resDiv=document.getElementById('aiRecipeResult');

  if (!btn||!modal) return;
  btn.addEventListener('click',()=>{ modal.classList.add('active'); });
  closeBtn?.addEventListener('click',()=>{ modal.classList.remove('active'); });

  genBtn?.addEventListener('click',async()=>{
    const ingInput=document.getElementById('aiRecipeInput')?.value.trim();
    if (!ingInput) { alert('Inserisci almeno qualche ingrediente!'); return; }
    resDiv.innerHTML=`<div class="ai-loading"><div class="ai-spinner"></div>Gemini sta creando la ricetta…</div>`;

    const prompt=`Crea una ricetta italiana per ${selectedMeal}, usando questi ingredienti: ${ingInput}. 
Rispondi in Markdown. Titolo ##, ingredienti lista, preparazione lista numerata. Max 300 parole.`;

    try {
      const key='AIzaSyATILu4OjZ8PUzkPwgFBY5eMcV2OkTmk-E';
      const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const body={ contents:[{ parts:[{text:prompt}] }] };
      const res= await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await res.json();
      const txt=data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nessuna risposta da Gemini.';
      resDiv.innerHTML=`<div class="ai-recipe-text">${_parseMarkdown(txt)}</div>`;
    } catch (err) {
      resDiv.innerHTML=`<p style="color:var(--danger);">Errore: ${err.message}</p>`;
    }
  });
}

function _parseMarkdown(md) {
  let h= md.replace(/^## (.+)$/gm,'<h2 class="ai-h2">$1</h2>');
  h= h.replace(/^### (.+)$/gm,'<h3 class="ai-h3">$1</h3>');
  h= h.replace(/^#### (.+)$/gm,'<h4 class="ai-h4">$1</h4>');
  h= h.replace(/^\* (.+)$/gm,'<li class="ai-li">$1</li>');
  h= h.replace(/^\d+\. (.+)$/gm,'<li class="ai-li-num">$1</li>');
  h= h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  h= h.replace(/\*(.+?)\*/g,'<em>$1</em>');
  h= h.replace(/\n/g,'<br/>');
  return h;
}

/* ══════════════════════════════════════════════════
   10. AI STATS — Analisi settimanale con Gemini
══════════════════════════════════════════════════ */
function _setupAIStatsBtn() {
  const btn=document.getElementById('aiStatsBtn');
  const modal=document.getElementById('aiStatsModal');
  const closeBtn=modal?.querySelector('.modal-close');
  const resDiv=document.getElementById('aiStatsResult');

  if (!btn||!modal) return;
  btn.addEventListener('click',async()=>{
    modal.classList.add('active');
    resDiv.innerHTML=`<div class="ai-loading"><div class="ai-spinner"></div>Gemini sta analizzando i tuoi dati…</div>`;

    const weekData= await _gatherWeekData();
    const prompt=`Analizza questi dati nutrizionali settimanali:\n${JSON.stringify(weekData)}\n
Rispondi in italiano, formato Markdown. Max 250 parole.`;

    try {
      const key='AIzaSyATILu4OjZ8PUzkPwgFBY5eMcV2OkTmk-E';
      const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const body={ contents:[{ parts:[{text:prompt}] }] };
      const res= await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await res.json();
      const txt=data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nessuna risposta.';
      resDiv.innerHTML=`<div class="ai-recipe-text">${_parseMarkdown(txt)}</div>`;
    } catch (err) {
      resDiv.innerHTML=`<p style="color:var(--danger);">Errore: ${err.message}</p>`;
    }
  });
  closeBtn?.addEventListener('click',()=>{ modal.classList.remove('active'); });
}

async function _gatherWeekData() {
  const u=auth.currentUser; if (!u) return {};
  const today=new Date(); const arr=[];
  for (let i=0; i<7; i++) {
    const d=new Date(today); d.setDate(d.getDate()-i);
    const iso=d.toISOString().split('T')[0];
    const snap=await get(ref(db,`users/${u.uid}/pianoPasto/${iso}`));
    if (!snap.exists()) continue;
    const data=snap.val();
    arr.push({date:iso,data});
  }
  return arr;
}

/* ══════════════════════════════════════════════════
   11. SCADENZE — ingredienti in scadenza nel frigo
══════════════════════════════════════════════════ */
function _initExpiringSection() {
  const expDiv=document.getElementById('expiringItemsDiv');
  if (!expDiv) return;
  const u=auth.currentUser; if (!u) return;

  const fRef=ref(db,`users/${u.uid}/frigo`);
  onValue(fRef,snap=>{
    const data= snap.exists() ? snap.val() : [];
    const today= new Date(); today.setHours(0,0,0,0);

    const expiring= data.filter(f=>{
      if (!f.expiry) return false;
      const expDate= new Date(f.expiry); expDate.setHours(0,0,0,0);
      const diff= Math.floor((expDate-today)/(1000*60*60*24));
      return (diff>=0 && diff<=3);
    }).map(f=>{
      const expDate= new Date(f.expiry); expDate.setHours(0,0,0,0);
      const diff= Math.floor((expDate-today)/(1000*60*60*24));
      return {...f, daysLeft:diff};
    });

    if (!expiring.length) {
      expDiv.innerHTML='';
      return;
    }

    expDiv.innerHTML=`
      <div class="expiring-section">
        <div class="expiring-section-title">⏰ Ingredienti in scadenza</div>
        ${expiring.map(f=>`
          <div class="expiring-row">
            <div class="expiring-name">${f.name}</div>
            <span class="expiry-badge ${_expiryClass(f.daysLeft)}">
              ${_expiryLabel(f.daysLeft)}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  });
}

function _expiryClass(days) {
  if (days<0) return 'expiry-expired';
  if (days===0) return 'expiry-today';
  if (days<=3) return 'expiry-soon';
  return 'expiry-ok';
}

function _expiryLabel(days) {
  if (days<0) return 'Scaduto';
  if (days===0) return 'Oggi';
  return `${days}gg`;
}

/* ══════════════════════════════════════════════════
   12. WIZARD PIANO ALIMENTARE — gestione rapida PA
══════════════════════════════════════════════════ */
function _setupAIPianoWizardBtn() {
  const btn=document.getElementById('aiPianoWizardBtn');
  if (!btn) return;
  btn.addEventListener('click',()=>{
    window.location.href='piano-alimentare.html';
  });
}

console.log('[piano] piano.js caricato - global functions esposte immediatamente');
