function renderPantry(){
    const container=document.getElementById('pantryContent');
    if(!container) return;
    let html='';
    pantryCategories.forEach(cat=>{
        html+=`<div class="category-section">
            <div class="category-title">${cat.label}</div>
            <div class="pantry-grid">`;
        cat.items.forEach(item=>{
            const checked=pantryItems[item.name]!==undefined;
            const qty=pantryItems[item.name]?.quantity||0;
            const unit=pantryItems[item.name]?.unit||item.units[0];
            const step=item.step||10;
            const esc=item.name.replace(/'/g,"\\'");
            html+=`
            <div class="pantry-item ${checked?'checked':''}">
                <input type="checkbox" class="pantry-checkbox" ${checked?'checked':''}
                    onchange="togglePantryItem('${esc}')">
                <div class="pantry-details">
                    <div class="pantry-name">${item.icon} ${item.name}</div>
                    <div class="pantry-quantity-row">
                        <button class="qty-btn minus" onclick="adjustQty('${esc}',-${step})" ${!checked?'disabled':''}>−</button>
                        <input type="number" class="quantity-input" value="${qty}" min="0"
                            onchange="updatePantryQuantity('${esc}',this.value,null)" ${!checked?'disabled':''}>
                        <button class="qty-btn plus" onclick="adjustQty('${esc}',${step})" ${!checked?'disabled':''}>+</button>
                        <select class="unit-select"
                            onchange="updatePantryQuantity('${esc}',null,this.value)" ${!checked?'disabled':''}>
                            ${item.units.map(u=>`<option value="${u}" ${u===unit?'selected':''}>${u}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>`;
        });
        html+='</div></div>';
    });
    container.innerHTML=html;
}

function togglePantryItem(name){
    if(pantryItems[name]){
        delete pantryItems[name];
    } else {
        const item=allPantryItems.find(i=>i.name===name);
        pantryItems[name]={quantity:0,unit:item?.units[0]||'g'};
    }
    saveData();
    renderPantry();
    renderFridge();
    updateFridgeSuggestions();
    initDayIngGrid();
}

function adjustQty(name,delta){
    if(!pantryItems[name]) return;
    pantryItems[name].quantity=Math.max(0,parseFloat(((pantryItems[name].quantity||0)+delta).toFixed(3)));
    saveData();
    renderPantry();
    renderFridge();
    updateFridgeSuggestions();
}

function updatePantryQuantity(name,quantity,unit){
    if(!pantryItems[name]) return;
    if(quantity!==null) pantryItems[name].quantity=Math.max(0,parseFloat(quantity)||0);
    if(unit!==null) pantryItems[name].unit=unit;
    saveData();
    renderFridge();
    updateFridgeSuggestions();
}

function renderFridge(){
    const container=document.getElementById('fridgeContent');
    if(!container) return;
    const available=Object.entries(pantryItems).filter(([,d])=>(d.quantity||0)>0);
    if(!available.length){
        container.innerHTML='<div class="fridge-empty"><h3>🍃 Frigorifero vuoto</h3><p>Aggiungi e quantifica gli ingredienti dalla Dispensa.</p></div>';
        return;
    }
    let html='';
    pantryCategories.forEach(cat=>{
        const catItems=available.filter(([name])=>cat.items.some(i=>i.name===name));
        if(!catItems.length) return;
        html+=`<div class="fridge-section"><h3>${cat.label}</h3><div class="fridge-items">`;
        catItems.forEach(([name,data])=>{
            const item=allPantryItems.find(i=>i.name===name);
            const step=item?.step||10;
            const esc=name.replace(/'/g,"\\'");
            html+=`
            <div class="fridge-item">
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
        });
        html+='</div></div>';
    });
    container.innerHTML=html;
}

function openSaveFridgeModal(){
    document.getElementById('fridgeName').value='';
    document.getElementById('saveFridgeModal').classList.add('active');
    setTimeout(()=>document.getElementById('fridgeName').focus(),100);
}

function closeSaveFridgeModal(){
    document.getElementById('saveFridgeModal').classList.remove('active');
}

function saveFridge(){
    const name=document.getElementById('fridgeName').value.trim();
    if(!name){alert('❌ Inserisci un nome.');return;}
    const id=Date.now().toString();
    savedFridges[id]={
        name,
        date:new Date().toLocaleString('it-IT'),
        items:JSON.parse(JSON.stringify(pantryItems))
    };
    saveData();
    closeSaveFridgeModal();
    updateSavedFridges();
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
        return `
        <div class="saved-fridge-item">
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
    saveData();
    renderPantry();
    renderFridge();
    updateFridgeSuggestions();
    initDayIngGrid();
    alert(`✅ Frigorifero "${savedFridges[id].name}" caricato!`);
}

function deleteFridge(id){
    if(!confirm(`Eliminare il frigorifero "${savedFridges[id].name}"?`)) return;
    delete savedFridges[id];
    saveData();
    updateSavedFridges();
}

function clearFridge(){
    if(!confirm('Svuotare completamente il frigorifero?')) return;
    Object.keys(pantryItems).forEach(k=>pantryItems[k].quantity=0);
    saveData();
    renderFridge();
    renderPantry();
    updateFridgeSuggestions();
    alert('✅ Frigorifero svuotato!');
}
