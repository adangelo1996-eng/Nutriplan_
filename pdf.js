function generatePDF(){
    const area=document.getElementById('printArea');
    const today=new Date();
    const dk=selectedDateKey||formatDateKey(today);
    const d=new Date(dk+'T00:00:00');
    const DAYS=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    const MONTHS_F=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const dateStr=`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_F[d.getMonth()]} ${d.getFullYear()}`;
    const turno=appHistory[dk]?.turno||'mattina';
    const turnoLabel={mattina:'Mattina',pomeriggio:'Pomeriggio',notte1:'Notte (Prima)',notte2:'Notte (Seconda)'}[turno];
    const dayData=appHistory[dk]||{usedItems:{},substitutions:{},turno};
    const meals=['colazione','spuntino','pranzo','merenda','cena'];
    const mealLabels={colazione:'Colazione ☕',spuntino:'Spuntino 🍎',pranzo:'Pranzo 🍽️',merenda:'Merenda 🥪',cena:'Cena 🌙'};

    /* ── SEZIONE 1: Piano del giorno ── */
    let pianoRows='';
    meals.forEach(meal=>{
        const planData=mealPlan[turno]?.[meal]?.principale||[];
        if(!planData.length) return;
        const mealKey=turno+'__'+meal;
        planData.forEach((item,idx)=>{
            const sub=dayData.substitutions?.[mealKey]?.[idx];
            const used=dayData.usedItems?.[mealKey]?.[idx];
            const eff=sub||item;
            let stato,cls;
            if(used&&sub){stato='✓ Usato (sost.)';cls='ok';}
            else if(used){stato='✓ Usato';cls='ok';}
            else if(sub){stato='↔ Sostituito';cls='warn';}
            else{stato='–';cls='';}
            const nomeCell=sub
                ?`<span style="text-decoration:line-through;color:#aaa;">${item.label}</span> → <strong>${sub.label}</strong>`
                :item.label;
            pianoRows+=`<tr>
                <td>${mealLabels[meal]}</td>
                <td>${nomeCell}</td>
                <td>${eff.qty}${eff.unit}</td>
                <td><span class="print-badge ${cls}">${stato}</span></td>
            </tr>`;
        });
    });

    /* ── SEZIONE 2: Lista spesa ── */
    const spesaItems=buildFullSpesaList();
    const mancanti=spesaItems.filter(i=>categorizeItem(i)==='mancante');
    const scarsi=spesaItems.filter(i=>categorizeItem(i)==='scarso');
    let spesaRows='';
    [...mancanti,...scarsi].forEach(item=>{
        const fi=getFridgeInfo(item);
        const isMiss=mancanti.includes(item);
        spesaRows+=`<tr>
            <td>${item.label}</td>
            <td>${item.qty}${item.unit}</td>
            <td>${fi?fi.qty+' '+fi.unit:'–'}</td>
            <td><span class="print-badge ${isMiss?'ko':'warn'}">${isMiss?'Mancante':'Insufficiente'}</span></td>
        </tr>`;
    });

    /* ── SEZIONE 3: Limiti ── */
    let limitiRows='';
    Object.entries(weeklyLimits).forEach(([key,data])=>{
        const pct=(data.current/data.max)*100;
        limitiRows+=`<tr>
            <td>${data.icon} ${key.replace(/_/g,' ')}</td>
            <td>${data.current} ${data.unit}</td>
            <td>${data.max} ${data.unit}</td>
            <td><span class="print-badge ${pct>=100?'ko':pct>=70?'warn':'ok'}">${pct>=100?'Superato':pct>=70?'Attenzione':'OK'}</span></td>
        </tr>`;
    });

    /* ── SEZIONE 4: Frigo ── */
    const fridgeItems=Object.entries(pantryItems).filter(([,d])=>(d.quantity||0)>0);
    let fridgeRows=fridgeItems.map(([name,data])=>{
        const item=getAllIngredients().find(i=>i.name===name);
        return `<tr><td>${item?.icon||''} ${name}</td><td>${data.quantity} ${data.unit}</td></tr>`;
    }).join('');

    /* ── BUILD HTML ── */
    area.innerHTML=`
    <div class="print-header">
        <h1>🌿 NutriPlan</h1>
        <p>Riepilogo giornaliero — <strong>${dateStr}</strong></p>
        <p>Turno: <strong>${turnoLabel}</strong> &nbsp;|&nbsp; Generato: ${today.toLocaleString('it-IT')}</p>
    </div>

    ${pianoRows?`
    <div class="print-section">
        <h2>📅 Piano Pasti del Giorno</h2>
        <table class="print-table">
            <thead><tr><th>Pasto</th><th>Ingrediente</th><th>Quantità</th><th>Stato</th></tr></thead>
            <tbody>${pianoRows}</tbody>
        </table>
    </div>`:''}

    ${spesaRows?`
    <div class="print-section">
        <h2>🛒 Lista della Spesa</h2>
        <table class="print-table">
            <thead><tr><th>Ingrediente</th><th>Necessario</th><th>Nel frigo</th><th>Stato</th></tr></thead>
            <tbody>${spesaRows}</tbody>
        </table>
    </div>`:''}

    <div class="print-section">
        <h2>📊 Limiti Settimanali</h2>
        <table class="print-table">
            <thead><tr><th>Categoria</th><th>Usato</th><th>Massimo</th><th>Stato</th></tr></thead>
            <tbody>${limitiRows}</tbody>
        </table>
    </div>

    ${fridgeRows?`
    <div class="print-section">
        <h2>❄️ Contenuto Frigo</h2>
        <table class="print-table" style="max-width:400px;">
            <thead><tr><th>Ingrediente</th><th>Disponibile</th></tr></thead>
            <tbody>${fridgeRows}</tbody>
        </table>
    </div>`:''}
    `;

    setTimeout(()=>window.print(),120);
}
