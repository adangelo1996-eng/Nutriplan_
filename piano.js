function renderMealPlan(){
    const day=document.getElementById('daySelect').value;
    const meal=document.getElementById('mealSelect').value;
    const mealKey=day+'__'+meal;
    const data=mealPlan[day]?.[meal];
    const container=document.getElementById('mealPlanContainer');

    if(!data||!data.principale||!data.principale.length){
        container.innerHTML='<div style="padding:20px;color:var(--text-light);text-align:center;font-size:.9em;">Nessuna indicazione per questo turno/pasto.</div>';
        return;
    }

    if(!substitutions[mealKey]) substitutions[mealKey]={};
    if(!usedItems[mealKey]) usedItems[mealKey]={};

    let html='<div class="meal-section"><div class="meal-section-title">🌱 Ingredienti — tocca per sostituire o segnare come usato</div><div class="meal-items-grid">';

    data.principale.forEach((item,idx)=>{
        const hasSubs=item.alternatives&&item.alternatives.length>0;
        const sub=substitutions[mealKey]?.[idx];
        const isUsed=usedItems[mealKey]?.[idx];
        const drawerId=`dr_${mealKey.replace(/[^a-z0-9]/gi,'_')}_${idx}`;
        const available=checkAvailByName(sub?sub.label:item.label);
        const dot=available?'🟢':'⚪';

        let btnClass='meal-item-btn';
        if(isUsed) btnClass+=' used';
        else if(sub) btnClass+=' substituted';
        else if(hasSubs) btnClass+=' has-alt';

        let nameHtml='';
        if(isUsed){
            const el=sub?sub:item;
            nameHtml=`<span class="meal-item-name used-name">${dot} ${el.label} — <strong>${el.qty}${el.unit}</strong> ✓ usato</span>`;
        } else if(sub){
            nameHtml=`<span class="meal-item-name">${dot} <span class="substituted-name">${item.label}</span> → <strong style="color:var(--accent)">${sub.label} ${sub.qty}${sub.unit}</strong>${sub.note?` <em style="color:var(--text-light);font-size:.82em">(${sub.note})</em>`:''}</span>`;
        } else {
            nameHtml=`<span class="meal-item-name">${dot} ${item.label} — <strong>${item.qty}${item.unit}</strong>${item.note?` <em style="color:var(--text-light);font-size:.82em">(${item.note})</em>`:''}</span>`;
        }

        let badgeHtml='';
        if(isUsed)       badgeHtml=`<span class="meal-item-badge badge-used">✓ usato</span>`;
        else if(sub)     badgeHtml=`<span class="meal-item-badge badge-sub">🔄</span>`;
        else if(hasSubs) badgeHtml=`<span class="meal-item-badge badge-alt">🔄 sostituisci</span>`;
        else             badgeHtml=`<span class="meal-item-badge badge-fixed">fisso</span>`;

        html+=`
        <div>
            <button class="${btnClass}" onclick="toggleDrawer('${drawerId}')">
                ${nameHtml}${badgeHtml}
            </button>
            <div class="sub-drawer" id="${drawerId}">
                <div class="sub-drawer-title">⚙️ Opzioni per "${item.label}"</div>
                <div class="sub-drawer-actions">
                    ${isUsed
                        ?`<button class="used-toggle-btn unmark" onclick="toggleUsed('${mealKey}',${idx})">↩ Segna come non usato</button>`
                        :`<button class="used-toggle-btn mark" onclick="toggleUsed('${mealKey}',${idx})">✅ Segna come usato</button>`
                    }
                    ${sub?`<button class="sub-restore-btn" onclick="restoreOriginal('${mealKey}',${idx})">↩ Ripristina originale</button>`:''}
                </div>
                ${hasSubs&&!isUsed?`
                <div style="margin-top:10px;">
                    <div class="sub-drawer-title">🔄 Sostituisci con:</div>
                    <div class="sub-options">
                        ${item.alternatives.map(alt=>buildSubOptionBtn(alt,mealKey,idx,sub)).join('')}
                    </div>
                </div>`:''}
            </div>
        </div>`;
    });

    html+='</div></div>';

    const activeSubs=Object.entries(substitutions[mealKey]||{}).filter(([,v])=>v);
    const activeUsed=Object.entries(usedItems[mealKey]||{}).filter(([,v])=>v);

    if(activeSubs.length||activeUsed.length){
        html+='<div class="piano-summary"><h4>📋 Riepilogo pasto</h4>';
        data.principale.forEach((item,idx)=>{
            const sub=substitutions[mealKey]?.[idx];
            const used=usedItems[mealKey]?.[idx];
            html+=`<div class="summary-item">`;
            if(used&&sub)  html+=`<span>✅</span><span><span class="summary-orig">${item.label}</span> → <span class="summary-used">${sub.label} ${sub.qty}${sub.unit} — usato</span></span>`;
            else if(used)  html+=`<span>✅</span><span><span class="summary-used">${item.label} ${item.qty}${item.unit} — usato</span></span>`;
            else if(sub)   html+=`<span>🔄</span><span><span class="summary-orig">${item.label}</span> → <span class="summary-subs">${sub.label} ${sub.qty}${sub.unit}</span></span>`;
            else           html+=`<span>⚪</span><span>${item.label} ${item.qty}${item.unit}</span>`;
            html+=`</div>`;
        });
        const usedCount=activeUsed.length;
        const totalCount=data.principale.length;
        const pct=Math.round((usedCount/totalCount)*100);
        html+=`<div style="margin-top:12px;padding:10px;background:linear-gradient(135deg,#e8f5e9,#f1f8f4);border-radius:10px;text-align:center;font-size:.88em;font-weight:600;color:#4caf50;">`;
        html+=`${usedCount}/${totalCount} ingredienti usati (${pct}%)</div>`;
        html+='</div>';
    }

    container.innerHTML=html;
}

function buildSubOptionBtn(alt,mealKey,idx,currentSub){
    const isActive=currentSub&&currentSub.label===alt.label;
    const available=checkAvailByName(alt.label);
    const limitOk=!alt.limit||(weeklyLimits[alt.limit]&&weeklyLimits[alt.limit].current<weeklyLimits[alt.limit].max);

    let availHtml='';
    if(available&&limitOk)   availHtml=`<span class="sub-option-avail sub-avail-ok">✓ disponibile</span>`;
    else if(available&&!limitOk) availHtml=`<span class="sub-option-avail sub-avail-warn">⚠ limite</span>`;
    else                     availHtml=`<span class="sub-option-avail sub-avail-ko">✗ mancante</span>`;

    const altJson=JSON.stringify(alt).replace(/'/g,'&apos;').replace(/"/g,'&quot;');
    return `
    <button class="sub-option-btn ${isActive?'active-sub':''}" onclick="selectSubstitution('${mealKey}',${idx},${altJson})">
        <span class="sub-option-name">🔄 ${alt.label} ${alt.qty}${alt.unit}${alt.note?` <em style="color:var(--text-light);font-size:.85em">(${alt.note})</em>`:''}</span>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
            ${alt.limit?`<span class="sub-option-qty">⚠️ ${alt.limit.replace('_',' ')}</span>`:''}
            ${availHtml}
        </div>
    </button>`;
}

function toggleDrawer(id){
    document.querySelectorAll('.sub-drawer.open').forEach(d=>{
        if(d.id!==id) d.classList.remove('open');
    });
    const el=document.getElementById(id);
    if(el) el.classList.toggle('open');
}

function selectSubstitution(mealKey,idx,alt){
    if(!substitutions[mealKey]) substitutions[mealKey]={};
    substitutions[mealKey][idx]=alt;
    if(!usedItems[mealKey]) usedItems[mealKey]={};
    delete usedItems[mealKey][idx];
    saveData();
    renderMealPlan();
    setTimeout(()=>{
        const drawerId=`dr_${mealKey.replace(/[^a-z0-9]/gi,'_')}_${idx}`;
        const el=document.getElementById(drawerId);
        if(el) el.classList.add('open');
    },50);
}

function restoreOriginal(mealKey,idx){
    if(substitutions[mealKey]) delete substitutions[mealKey][idx];
    saveData();
    renderMealPlan();
}

function toggleUsed(mealKey,idx){
    if(!usedItems[mealKey]) usedItems[mealKey]={};

    if(usedItems[mealKey][idx]){
        delete usedItems[mealKey][idx];
    } else {
        usedItems[mealKey][idx]=true;
        const day=mealKey.split('__')[0];
        const meal=mealKey.split('__')[1];
        const item=mealPlan[day]?.[meal]?.principale?.[idx];
        const sub=substitutions[mealKey]?.[idx];
        const effectiveItem=sub||item;

        if(effectiveItem?.limit&&weeklyLimits[effectiveItem.limit]){
            weeklyLimits[effectiveItem.limit].current++;
        }

        const ingName=effectiveItem?.label||'';
        for(const [pName,pData] of Object.entries(pantryItems)){
            const pnl=pName.toLowerCase();
            const nl=ingName.toLowerCase();
            const match=pnl===nl||pnl.includes(nl)||nl.includes(pnl)||
                pnl.split(' ').some(w=>w.length>2&&nl.includes(w))||
                nl.split(' ').some(w=>w.length>2&&pnl.includes(w));
            if(match&&(pData.quantity||0)>0){
                const step=allPantryItems.find(i=>i.name===pName)?.step||10;
                const qty=effectiveItem?.qty||step;
                const unit=effectiveItem?.unit||pData.unit;
                const pUnit=pData.unit;
                let toSub=qty;
                if(pUnit!==unit){
                    const c=convertUnit(qty,unit,pUnit);
                    if(c!==null) toSub=c;
                }
                pantryItems[pName].quantity=Math.max(0,parseFloat((pData.quantity-toSub).toFixed(3)));
                break;
            }
        }
    }

    saveData();
    renderMealPlan();
    updateLimits();
    renderFridge();
    renderPantry();
}
