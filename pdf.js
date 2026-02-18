function generatePDF(){
    const area=document.getElementById('printArea');
    const today=new Date();
    const dk=selectedDateKey||formatDateKey(today);
    const d=new Date(dk+'T00:00:00');
    const DAYS=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    const MONTHS_F=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

    const dateStr=`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_F[d.getMonth()]} ${d.getFullYear()}`;
    const generatedStr=today.toLocaleString('it-IT');
    const turno=appHistory[dk]?.turno||'mattina';
    const turnoLabel={mattina:'Mattina',pomeriggio:'Pomeriggio',notte1:'Notte (Prima)',notte2:'Notte (Seconda)'}[turno];

    let html=`
    <div class="print-header">
        <h1>🌿 NutriPlan</h1>
        <p>Riepilogo: <strong>${dateStr}</strong> — Turno: <strong>${turnoLabel}</strong></p>
        <p style="font-size:.8em;color:#888;">Generato il ${generatedStr}</p>
    </div>`;

    // Piano pasti
    html+=`<div class="print-section"><h2>📅 Piano Pasti</h2>`;
    const meals=['colazione','spuntino','pranzo','merenda','cena'];
    const mealLabels={colazione:'Colazione',spuntino:'Spuntino',pranzo:'Pranzo',merenda:'Merenda',cena:'Cena'};
    const dayData=appHistory[dk]||{usedItems:{},substitutions:{},turno};

    meals.forEach(meal=>{
        const planData=mealPlan[turno]?.[meal]?.principale||[];
        if(!planData.length) return;
        html+=`<h3 style="color:#4a9b7f;font-size:1em;margin:12px 0 6px;">${mealLabels[meal]}</h3>`;
        html+=`<table class="print-table"><thead><tr><th>Ingrediente</th><th>Quantità</th><th>Stato</th></tr></thead><tbody>`;
        const mealKey=turno+'__'+meal;
        planData.forEach((item,idx)=>{
            const sub=dayData.substitutions?.[mealKey]?.[idx];
            const used=dayData.usedItems?.[mealKey]?.[idx];
            const eff=sub||item;
            let stato='',statoClass='';
            if(used&&sub){stato='✓ usato (sost.)';statoClass='ok';}
            else if(used){stato='✓ usato';statoClass='ok';}
            else if(sub){stato='→ sostituito';statoClass='warn';}
            else{stato='–';statoClass='';}
            const nameCell=sub?`<s style="color:#aaa">${item.label}</s> → <strong>${sub.label}</strong>`:item.label;
            html+=`<tr>
                <td>${nameCell}</td>
                <td>${eff.qty}${eff.unit}</td>
                <td><span class="print-badge ${statoClass}">${stato}</span></td>
            </tr>`;
        });
        html+=`</tbody></table>`;
    });
    html+='</div>';

    // Lista spesa
    const spesaTurno=turno;
    const spesaItems=buildSpesaList(spesaTurno);
    const mancanti=spesaItems.filter(i=>categorizeItem(i)==='mancante');
    const scarsi=spesaItems.filter(i=>categorizeItem(i)==='scarso');
    if(mancanti.length||scarsi.length){
        html+=`<div class="print-section"><h2>🛒 Lista della Spesa</h2>
        <table class="print-table"><thead><tr><th>Ingrediente</th><th>Necessario</th><th>Nel frigo</th><th>Stato</th></tr></thead><tbody>`;
        [...mancanti,...scarsi].forEach(item=>{
            const fi=getFridgeInfo(item);
            const stato=mancanti.includes(item)?'Mancante':'Insufficiente';
            const cls=mancanti.includes(item)?'ko':'warn';
            html+=`<tr>
                <td>${item.label}</td>
                <td>${item.qty}${item.unit}</td>
                <td>${fi?fi.qty+' '+fi.unit:'–'}</td>
                <td><span class="print-badge ${cls}">${stato}</span></td>
            </tr>`;
        });
        html+=`</tbody></table></div>`;
    }

    // Limiti settimanali
    html+=`<div class="print-section"><h2>📊 Limiti Settimanali</h2>
    <table class="print-table"><thead><tr><th>Categoria</th><th>Usato</th><th>Massimo</th><th>Stato</th></tr></thead><tbody>`;
    Object.entries(weeklyLimits).forEach(([key,data])=>{
        const pct=(data.current/data.max)*100;
        const stato=pct>=100?'Superato':pct>=70?'Attenzione':'OK';
        const cls=pct>=100?'ko':pct>=70?'warn':'ok';
        html+=`<tr>
            <td>${data.icon} ${key.replace(/_/g,' ')}</td>
            <td>${data.current} ${data.unit}</td>
            <td>${data.max} ${data.unit}</td>
            <td><span class="print-badge ${cls}">${stato}</span></td>
        </tr>`;
    });
    html+=`</tbody></table></div>`;

    // Frigo attuale
    const fridgeItems=Object.entries(pantryItems).filter(([,d])=>(d.quantity||0)>0);
    if(fridgeItems.length){
        html+=`<div class="print-section"><h2>❄️ Contenuto Frigo</h2>
        <table class="print-table"><thead><tr><th>Ingrediente</th><th>Quantità</th><th>Unità</th></tr></thead><tbody>`;
        fridgeItems.forEach(([name,data])=>{
            const item=allPantryItems.find(i=>i.name===name);
            html+=`<tr><td>${item?.icon||''} ${name}</td><td>${data.quantity}</td><td>${data.unit}</td></tr>`;
        });
        html+=`</tbody></table></div>`;
    }

    area.innerHTML=html;
    setTimeout(()=>window.print(),100);
}


