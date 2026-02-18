let spesaChecked={};
let spesaCustomItems=[];

function buildSpesaList(turno){
    const needed={};
    const meals=['colazione','spuntino','pranzo','merenda','cena'];
    meals.forEach(meal=>{
        const items=mealPlan[turno]?.[meal]?.principale||[];
        items.forEach(item=>{
            const key=item.label;
            if(!needed[key]) needed[key]={label:key,qty:item.qty,unit:item.unit,count:0};
            needed[key].count++;
        });
    });
    return Object.values(needed);
}

function categorizeItem(item){
    const nl=item.label.toLowerCase();
    let inFridge=false,sufficient=false,fridgeQty=0,fridgeUnit='';
    for(const [pName,pData] of Object.entries(pantryItems)){
        const pnl=pName.toLowerCase();
        const match=pnl===nl||pnl.includes(nl)||nl.includes(pnl)||
            pnl.split(' ').some(w=>w.length>2&&nl.includes(w))||
            nl.split(' ').some(w=>w.length>2&&pnl.includes(w));
        if(match){
            inFridge=true;
            fridgeQty=pData.quantity||0;
            fridgeUnit=pData.unit||item.unit;
            const converted=convertUnit(fridgeQty,fridgeUnit,item.unit);
            const available=converted!==null?converted:fridgeQty;
            sufficient=available>=item.qty;
            break;
        }
    }
    if(!inFridge) return 'mancante';
    if(!sufficient) return 'scarso';
    return 'ok';
}

function getFridgeInfo(item){
    const nl=item.label.toLowerCase();
    for(const [pName,pData] of Object.entries(pantryItems)){
        const pnl=pName.toLowerCase();
        const match=pnl===nl||pnl.includes(nl)||nl.includes(pnl)||
            pnl.split(' ').some(w=>w.length>2&&nl.includes(w))||
            nl.split(' ').some(w=>w.length>2&&pnl.includes(w));
        if(match) return{qty:pData.quantity||0,unit:pData.unit||item.unit};
    }
    return null;
}

function renderSpesa(){
    const turno=document.getElementById('spesaTurnoSelect').value;
    const container=document.getElementById('spesaContent');
    const items=buildSpesaList(turno);

    const mancanti=items.filter(i=>categorizeItem(i)==='mancante');
    const scarsi  =items.filter(i=>categorizeItem(i)==='scarso');
    const ok      =items.filter(i=>categorizeItem(i)==='ok');

    const totalItems=mancanti.length+scarsi.length+spesaCustomItems.length;
    const boughtCount=Object.values(spesaChecked).filter(Boolean).length;
    const pct=totalItems>0?Math.round((boughtCount/totalItems)*100):0;

    let html='';

    if(mancanti.length){
        html+=`<div class="spesa-section">
            <div class="spesa-section-title mancanti">
                ❌ Mancanti nel frigo
                <span class="spesa-count">${mancanti.length}</span>
            </div>`;
        mancanti.forEach(item=>{
            const id=`spesa_${item.label.replace(/\s/g,'_')}`;
            const bought=spesaChecked[id]||false;
            html+=buildSpesaItemHTML(id,item,bought,'miss');
        });
        html+='</div>';
    }

    if(scarsi.length){
        html+=`<div class="spesa-section">
            <div class="spesa-section-title scarsi">
                ⚠️ Quantità insufficiente
                <span class="spesa-count">${scarsi.length}</span>
            </div>`;
        scarsi.forEach(item=>{
            const id=`spesa_${item.label.replace(/\s/g,'_')}`;
            const bought=spesaChecked[id]||false;
            const fi=getFridgeInfo(item);
            const extra={fridgeQty:fi?.qty,fridgeUnit:fi?.unit};
            html+=buildSpesaItemHTML(id,{...item,...extra},bought,'low');
        });
        html+='</div>';
    }

    if(spesaCustomItems.length){
        html+=`<div class="spesa-section">
            <div class="spesa-section-title custom">
                ➕ Aggiunti manualmente
                <span class="spesa-count">${spesaCustomItems.length}</span>
            </div>`;
        spesaCustomItems.forEach((item,idx)=>{
            const id=`custom_${idx}`;
            const bought=spesaChecked[id]||false;
            html+=`<button class="spesa-item ${bought?'bought':''}" onclick="toggleSpesaItem('${id}')">
                <div class="spesa-item-check">${bought?'✓':''}</div>
                <span class="spesa-item-name">${item.label}</span>
                <span class="spesa-item-qty">${item.qty||''}</span>
                <button onclick="event.stopPropagation();removeCustomSpesaItem(${idx})"
                    style="background:none;border:none;cursor:pointer;color:var(--red);font-size:1em;padding:0 4px;">🗑</button>
            </button>`;
        });
        html+='</div>';
    }

    if(ok.length){
        html+=`<div class="spesa-section">
            <div class="spesa-section-title ok">
                ✅ Già disponibile
                <span class="spesa-count">${ok.length}</span>
            </div>`;
        ok.forEach(item=>{
            const fi=getFridgeInfo(item);
            html+=`<div class="spesa-item" style="cursor:default;opacity:.7;">
                <div class="spesa-item-check" style="background:var(--green);border-color:var(--green);color:#fff;">✓</div>
                <span class="spesa-item-name">${item.label}</span>
                <span class="spesa-item-qty">${fi?fi.qty+' '+fi.unit:'–'} / serve ${item.qty}${item.unit}</span>
            </div>`;
        });
        html+='</div>';
    }

    if(!mancanti.length&&!scarsi.length&&!spesaCustomItems.length){
        html=`<div class="spesa-empty">
            <div style="font-size:3em;margin-bottom:12px;">🎉</div>
            <h3>Frigo al completo!</h3>
            <p>Hai tutto il necessario per il turno ${turno}.</p>
        </div>`;
    } else {
        html+=`<div class="spesa-progress">
            <div class="spesa-progress-label">
                <span>Acquisti completati</span>
                <span>${boughtCount} / ${totalItems}</span>
            </div>
            <div class="spesa-progress-bar">
                <div class="spesa-progress-fill" style="width:${pct}%"></div>
            </div>
        </div>`;
    }

    container.innerHTML=html;
}

function buildSpesaItemHTML(id,item,bought,statusType){
    const statusLabel=statusType==='miss'?'mancante':'scarso';
    const statusClass=statusType==='miss'?'spesa-status-miss':'spesa-status-low';
    let qtyLabel=`${item.qty}${item.unit}`;
    if(statusType==='low'&&item.fridgeQty!==undefined){
        qtyLabel=`${item.fridgeQty}${item.fridgeUnit} → serve ${item.qty}${item.unit}`;
    }
    return `<button class="spesa-item ${bought?'bought':''}" onclick="toggleSpesaItem('${id}')">
        <div class="spesa-item-check">${bought?'✓':''}</div>
        <span class="spesa-item-name">${item.label}</span>
        <span class="spesa-item-qty">${qtyLabel}</span>
        <span class="spesa-item-status ${statusClass}">${statusLabel}</span>
    </button>`;
}

function toggleSpesaItem(id){
    spesaChecked[id]=!spesaChecked[id];
    renderSpesa();
}

function clearSpesaChecked(){
    spesaChecked={};
    renderSpesa();
}

function openSpesaItemModal(){
    document.getElementById('spesaItemName').value='';
    document.getElementById('spesaItemQty').value='';
    document.getElementById('spesaItemModal').classList.add('active');
    setTimeout(()=>document.getElementById('spesaItemName').focus(),100);
}

function closeSpesaItemModal(){
    document.getElementById('spesaItemModal').classList.remove('active');
}

function confirmAddSpesaItem(){
    const name=document.getElementById('spesaItemName').value.trim();
    const qty=document.getElementById('spesaItemQty').value.trim();
    if(!name){alert('❌ Inserisci un nome.');return;}
    spesaCustomItems.push({label:name,qty});
    closeSpesaItemModal();
    renderSpesa();
}

function removeCustomSpesaItem(idx){
    spesaCustomItems.splice(idx,1);
    renderSpesa();
}
