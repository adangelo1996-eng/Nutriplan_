let dispensaFilterText='';

function getAllIngredients(){
    return[
        ...allPantryItems,
        ...customIngredients.map(ci=>({
            name:ci.name,icon:ci.icon||'📦',
            units:[ci.unit||'g'],step:ci.step||10,
            _custom:true,_id:ci.id
        }))
    ];
}

function refreshAllViews(){
    renderFridge();
    renderMealPlan();
    updateFridgeSuggestions();
    initDayIngGrid();
    buildCalendarBar();
}

function renderPantry(){
    dispensaFilterText=document.getElementById('dispensaSearch')?.value||'';
    renderPantryFiltered(dispensaFilterText);
}

function renderPantryFiltered(query){
    const container=document.getElementById('pantryContent');
    if(!container) return;
    const q=query.toLowerCase().trim();
    let totalVisible=0;
    let html='';

    // Categorie built-in
    pantryCategories.forEach(cat=>{
        const visibleItems=cat.items.filter(item=>!q||item.name.toLowerCase().includes(q));
        if(!visibleItems.length) return;
        totalVisible+=visibleItems.length;
        html+=`<div class="category-section">
            <div class="category-title">${cat.label}</div>
            <div class="pantry-grid">`;
        visibleItems.forEach(item=>{ html+=buildPantryItemHTML(item,false); });
        html+='</div></div>';
    });

    // Ingredienti custom
    const visibleCustom=customIngredients.filter(ci=>!q||ci.name.toLowerCase().includes(q));
    if(visibleCustom.length){
        totalVisible+=visibleCustom.length;
        html+=`<div class="category-section">
            <div class="category-title">⭐ Ingredienti Personalizzati</div>
            <div class="pantry-grid">`;
        visibleCustom.forEach(item=>{ html+=buildPantryItemHTML(item,true); });
        html+='</div></div>';
    }

    if(!totalVisible){
        html=`<div class="dispensa-no-results">
            <div style="font-size:2.5em;margin-bottom:10px;">🔍</div>
            <p>Nessun ingrediente trovato per "<strong>${query}</strong>".</p>
        </div>`;
    }

    container.innerHTML=html;
}

function buildPantryItemHTML(item,isCustom=false){
    const name=item.name;
    const inPantry=pantryItems[name]!==undefined;
    const qty=pantryItems[name]?.quantity||0;
    const unit=pantryItems[name]?.unit||(item.units?item.units[0]:item.unit)||'g';
    const step=item.step||10;
    const esc=name.replace(/'/g,"\\'");
    const units=item.units||[item.unit||'g'];

    return `<div class="pantry-item ${inPantry?'active':'inactive'}" id="pantryItem_${esc.replace(/\s/g,'_')}">
        <div class="pantry-item-row">
            <div class="pantry-name">${item.icon||'📦'} ${name}</div>
            <div class="pantry-item-actions">
                ${!inPantry
                    ?`<button class="pantry-add-btn" onclick="addToPantry('${esc}')">+ Aggiungi</button>`
                    :''
                }
                ${isCustom
                    ?`<button class="pantry-delete-btn" onclick="deleteCustomIngredient('${esc}')" title="Elimina">🗑</button>`
                    :''
                }
            </div>
        </div>
        ${inPantry?`
        <div class="pantry-quantity-row">
            <button class="qty-btn minus" onclick="adjustQty('${esc}',-${step})" ontouchend="this.blur()">−</button>
            <input type="number" class="quantity-input" value="${qty}" min="0"
                onchange="updatePantryQuantity('${esc}',this.value,null)">
            <select class="unit-select" onchange="updatePantryQuantity('${esc}',null,this.value)">
                ${units.map(u=>`<option value="${u}" ${u===unit?'selected':''}>${u}</option>`).join('')}
            </select>
            <button class="pantry-remove-btn" onclick="removeFromPantry('${esc}')">✕</button>
        </div>`:''}
    </div>`;
}

function filterDispensa(val){
    dispensaFilterText=val;
    const clearBtn=document.getElementById('dispensaClearBtn');
    if(clearBtn) clearBtn.style.display=val?'block':'none';
    renderPantryFiltered(val);
}

function clearDispensaSearch(){
    const input=document.getElementById('dispensaSearch');
    if(input) input.value='';
    const clearBtn=document.getElementById('dispensaClearBtn');
    if(clearBtn) clearBtn.style.display='none';
    dispensaFilterText='';
    renderPantryFiltered('');
    input?.focus();
}

/* ── AGGIUNGI / RIMUOVI da pantry ── */
function addToPantry(name){
    const item=getAllIngredients().find(i=>i.name===name);
    pantryItems[name]={quantity:0,unit:item?.units?.[0]||item?.unit||'g'};
    saveData();
    renderPantryFiltered(dispensaFilterText);
    refreshAllViews();
}

function removeFromPantry(name){
    delete pantryItems[name];
    saveData();
    renderPantryFiltered(dispensaFilterText);
    refreshAllViews();
}

function adjustQty(name,delta){
    if(!pantryItems[name]) return;
    pantryItems[name].quantity=Math.max(0,parseFloat(((pantryItems[name].quantity||0)+delta).toFixed(3)));
    saveData();
    renderPantryFiltered(dispensaFilterText);
    refreshAllViews();
}

function updatePantryQuantity(name,quantity,unit){
    if(!pantryItems[name]) return;
    if(quantity!==null) pantryItems[name].quantity=Math.max(0,parseFloat(quantity)||0);
    if(unit!==null) pantryItems[name].unit=unit;
    saveData();
    renderPantryFiltered(dispensaFilterText);
    refreshAllViews();
}

/* ══════════════════════════════════
   INGREDIENTI CUSTOM
══════════════════════════════════ */
function openCustomIngModal(){
    document.getElementById('ciName').value='';
    document.getElementById('ciIcon').value='';
    document.getElementById('ciUnit').value='g';
    document.getElementById('ciStep').value='10';
    document.getElementById('customIngModal').classList.add('active');
    setTimeout(()=>document.getElementById('ciName').focus(),100);
}

function closeCustomIngModal(){
    document.getElementById('customIngModal').classList.remove('active');
}
function saveCustomIngredient(){
    const name=document.getElementById('ciName').value.trim();
    const icon=document.getElementById('ciIcon').value.trim()||'📦';
    const unit=document.getElementById('ciUnit').value||'g';
    const step=parseFloat(document.getElementById('ciStep').value)||10;
    if(!name){alert('❌ Inserisci il nome.');return;}
    if(getAllIngredients().some(i=>i.name.toLowerCase()===name.toLowerCase())){
        alert('❌ Ingrediente già esistente.');return;
    }
    customIngredients.push({id:'ci_'+Date.now(),name,icon,unit,step});
    saveData();
    closeCustomIngModal();
    renderPantryFiltered(dispensaFilterText);
    initIngredientiDatalist();
    alert(`✅ Ingrediente "${name}" aggiunto!`);
}
function deleteCustomIngredient(name){
    if(!confirm(`Eliminare "${name}" dagli ingredienti personalizzati?`)) return;
    customIngredients=customIngredients.filter(ci=>ci.name!==name);
    delete pantryItems[name];
    saveData();
    renderPantryFiltered(dispensaFilterText);
    refreshAllViews();
}

/* ══════════════════════════════════
   FRIGO
══════════════════════════════════ */
function renderFridge(){
    const container=document.getElementById('fridgeContent');
    if(!container) return;
    const available=Object.entries(pantryItems).filter(([,d])=>(d.quantity||0)>0);
    if(!available.length){
        container.innerHTML='<div class="fridge-empty"><h3>🍃 Frigorifero vuoto</h3><p>Aggiungi e quantifica gli ingredienti dalla Dispensa.</p></div>';
        return;
    }
    let html='';
    const allIngs=getAllIngredients();
    pantryCategories.forEach(cat=>{
        const catItems=available.filter(([name])=>cat.items.some(i=>i.name===name));
        if(!catItems.length) return;
        html+=`<div class="fridge-section"><h3>${cat.label}</h3><div class="fridge-items">`;
        catItems.forEach(([name,data])=>{ html+=buildFridgeItemHTML(name,data,allIngs); });
        html+='</div></div>';
    });
    // Custom ingredients in fridge
    const customInFridge=available.filter(([name])=>customIngredients.some(ci=>ci.name===name));
    if(customInFridge.length){
        html+=`<div class="fridge-section"><h3>⭐ Personalizzati</h3><div class="fridge-items">`;
        customInFridge.forEach(([name,data])=>{ html+=buildFridgeItemHTML(name,data,allIngs); });
        html+='</div></div>';
    }
    container.innerHTML=html;
}

function buildFridgeItemHTML(name,data,allIngs){
    const item=allIngs.find(i=>i.name===name);
    const step=item?.step||10;
    const esc=name.replace(/'/g,"\\'");
    return `<div class="fridge-item">
        <div class="fridge-item-icon">${item?.icon||'📦'}</div>
        <div class="fridge-item-name">${name}</div>
        <div class="fridge-item-quantity-row">
            <span class="fridge-qty-val">${data.quantity}</span>
            <span class="fridge-qty-unit">${data.unit}</span>
        </div>
        <div class="fridge-qty-btns">
            <button class="qty-btn minus btn-small" onclick="adjustQty('${esc}',-${step})">−</button>
            <button class="qty-btn plus btn-small" onclick="adjustQty('${esc}',${step})">+</button>
        </div>
    </div>`;
}

function openSaveFridgeModal(){
    document.getElementById('fridgeName').value='';
    document.getElementById('saveFridgeModal').classList.add('active');
    setTimeout(()=>document.getElementById('fridgeName').focus(),100);
}
function closeSaveFridgeModal(){ document.getElementById('saveFridgeModal').classList.remove('active'); }

function saveFridge(){
    const name=document.getElementById('fridgeName').value.trim();
    if(!name){alert('❌ Inserisci un nome.');return;}
    savedFridges[Date.now().toString()]={
        name,date:new Date().toLocaleString('it-IT'),
        items:JSON.parse(JSON.stringify(pantryItems))
    };
    saveData();closeSaveFridgeModal();updateSavedFridges();
    alert(`✅ Frigorifero "${name}" salvato!`);
}

function updateSavedFridges(){
    const card=document.getElementById('savedFridgesCard');
    const list=document.getElementById('savedFridgeList');
    const keys=Object.keys(savedFridges);
    if(!keys.length){card.style.display='none';return;}
    card.style.display='block';
    list.innerHTML=keys.map(id=>{
        const f=savedFridges[id];
        return `<div class="saved-fridge-item">
            <div class="saved-fridge-name">🧊 ${f.name}</div>
            <div class="saved-fridge-date">📅 ${f.date}</div>
            <div class="saved-fridge-date">📦 ${Object.keys(f.items).length} ingredienti</div>
            <div class="saved-fridge-actions">
                <button class="btn btn-primary btn-small" onclick="loadFridge('${id}')">📥 Carica</button>
                <button class="btn btn-warning btn-small" onclick="deleteFridge('${id}')">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function loadFridge(id){
    if(!confirm('Caricare questo frigorifero? Sostituirà i dati attuali.')) return;
    pantryItems=JSON.parse(JSON.stringify(savedFridges[id].items));
    saveData();renderPantryFiltered(dispensaFilterText);refreshAllViews();
    alert(`✅ Frigorifero "${savedFridges[id].name}" caricato!`);
}
function deleteFridge(id){
    if(!confirm(`Eliminare il frigorifero "${savedFridges[id].name}"?`)) return;
    delete savedFridges[id];saveData();updateSavedFridges();
}
function clearFridge(){
    if(!confirm('Svuotare completamente il frigorifero?')) return;
    Object.keys(pantryItems).forEach(k=>pantryItems[k].quantity=0);
    saveData();renderPantryFiltered(dispensaFilterText);refreshAllViews();
}
