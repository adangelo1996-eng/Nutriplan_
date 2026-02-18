function renderStorico(){
    const container=document.getElementById('storicoContent');
    const keys=Object.keys(appHistory)
        .filter(dk=>{
            const d=appHistory[dk];
            return Object.keys(d.usedItems||{}).some(mk=>Object.keys(d.usedItems[mk]).length>0)||
                   Object.keys(d.substitutions||{}).some(mk=>Object.keys(d.substitutions[mk]).length>0);
        })
        .sort((a,b)=>b.localeCompare(a));

    if(!keys.length){
        container.innerHTML=`<div class="storico-empty"><h3>📭 Nessuno storico</h3><p>Le tue giornate alimentari appariranno qui.</p></div>`;
        return;
    }

    container.innerHTML=keys.map(dk=>buildStoricoDay(dk)).join('');
}

function buildStoricoDay(dk){
    const d=new Date(dk+'T00:00:00');
    const dayData=appHistory[dk];
    const DAYS=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    const MONTHS=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const dateLabel=`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const turnoLabel={mattina:'Mattina 🌅',pomeriggio:'Pomeriggio ☀️',notte1:'Notte Prima 🌙',notte2:'Notte Seconda 🌙'}[dayData.turno||'mattina'];
    const isToday=dk===getCurrentDateKey();

    const totalUsed=Object.values(dayData.usedItems||{}).reduce((sum,mk)=>sum+Object.keys(mk).length,0);
    const totalSubs=Object.values(dayData.substitutions||{}).reduce((sum,mk)=>sum+Object.keys(mk).length,0);

    const bodyHtml=buildStoricoBody(dk,dayData);

    return `
    <div class="storico-day" id="storicoDay_${dk}">
        <div class="storico-day-header ${isToday?'open':''}" onclick="toggleStoricoDay('${dk}')">
            <div>
                <div class="storico-day-title">${isToday?'📍 ':''} ${dateLabel}</div>
                <div class="storico-day-meta">Turno: ${turnoLabel} &nbsp;·&nbsp; ${totalUsed} usati &nbsp;·&nbsp; ${totalSubs} sostituzioni</div>
            </div>
            <div class="storico-day-badge">${isToday?'oggi':'▼'}</div>
        </div>
        <div class="storico-day-body ${isToday?'open':''}" id="storicoBody_${dk}">
            ${bodyHtml}
        </div>
    </div>`;
}

function buildStoricoBody(dk,dayData){
    const day=dayData.turno||'mattina';
    const meals=['colazione','spuntino','pranzo','merenda','cena'];
    const mealLabels={colazione:'☕ Colazione',spuntino:'🍎 Spuntino',pranzo:'🍽️ Pranzo',merenda:'🥪 Merenda',cena:'🌙 Cena'};
    let html='';

    meals.forEach(meal=>{
        const mealKey=day+'__'+meal;
        const planData=mealPlan[day]?.[meal]?.principale||[];
        if(!planData.length) return;

        const usedInMeal=dayData.usedItems?.[mealKey]||{};
        const subsInMeal=dayData.substitutions?.[mealKey]||{};
        if(!Object.keys(usedInMeal).length&&!Object.keys(subsInMeal).length) return;

        html+=`<div class="storico-meal-block"><div class="storico-meal-title">${mealLabels[meal]}</div>`;

        planData.forEach((item,idx)=>{
            const sub=subsInMeal[idx];
            const used=usedInMeal[idx];
            const effectiveItem=sub||item;

            if(used&&sub){
                html+=`<div class="storico-ing-row used">✅ <span><s style="opacity:.6">${item.label}</s> → <strong>${sub.label} ${sub.qty}${sub.unit}</strong> — usato</span></div>`;
            } else if(used){
                html+=`<div class="storico-ing-row used">✅ <span><strong>${item.label} ${item.qty}${item.unit}</strong> — usato</span></div>`;
            } else if(sub){
                html+=`<div class="storico-ing-row subbed">🔄 <span><s style="opacity:.6">${item.label}</s> → <strong>${sub.label} ${sub.qty}${sub.unit}</strong></span></div>`;
            }
        });

        html+='</div>';
    });

    if(!html) html='<p style="color:var(--text-light);font-size:.85em;">Nessuna azione registrata.</p>';
    return html;
}

function toggleStoricoDay(dk){
    const header=document.querySelector(`#storicoDay_${dk} .storico-day-header`);
    const body=document.getElementById(`storicoBody_${dk}`);
    if(!header||!body) return;
    const isOpen=body.classList.contains('open');
    header.classList.toggle('open',!isOpen);
    body.classList.toggle('open',!isOpen);
}
