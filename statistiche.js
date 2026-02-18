function renderStatistiche(){
    const container=document.getElementById('statisticheContent');
    const histKeys=Object.keys(appHistory).sort((a,b)=>b.localeCompare(a));
    if(!histKeys.length){
        container.innerHTML=`<div class="storico-empty"><h3>📭 Nessun dato</h3><p>Le statistiche si popoleranno man mano che usi l'app.</p></div>`;
        return;
    }

    const today=new Date();today.setHours(0,0,0,0);
    const last7=histKeys.filter(dk=>{const d=new Date(dk+'T00:00:00');return(today-d)<=7*86400000;});
    const last30=histKeys.filter(dk=>{const d=new Date(dk+'T00:00:00');return(today-d)<=30*86400000;});

    // Streak
    let streak=0;
    for(let i=0;i<365;i++){
        const d=new Date(today);d.setDate(today.getDate()-i);
        const dk=formatDateKey(d);
        const hd=appHistory[dk];
        const hasActivity=hd&&Object.values(hd.usedItems||{}).some(mk=>Object.keys(mk).length>0);
        if(hasActivity) streak++;
        else if(i>0) break;
    }

    // Pasti completati (almeno 1 ingrediente usato)
    function countMealsWithActivity(keys){
        let count=0;
        keys.forEach(dk=>{
            const hd=appHistory[dk];
            if(!hd) return;
            Object.values(hd.usedItems||{}).forEach(mk=>{
                if(Object.keys(mk).length>0) count++;
            });
        });
        return count;
    }

    // Ingredienti più usati
    function countTopFoods(keys,topN=8){
        const freq={};
        keys.forEach(dk=>{
            const hd=appHistory[dk];
            if(!hd) return;
            const day=hd.turno||'mattina';
            Object.entries(hd.usedItems||{}).forEach(([mealKey,idxMap])=>{
                const meal=mealKey.split('__')[1];
                Object.keys(idxMap).forEach(idx=>{
                    const item=mealPlan[day]?.[meal]?.principale?.[parseInt(idx)];
                    const sub=hd.substitutions?.[mealKey]?.[idx];
                    const name=(sub||item)?.label||'';
                    if(name) freq[name]=(freq[name]||0)+1;
                });
            });
        });
        return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,topN);
    }

    // Turni più usati
    function countTurni(keys){
        const t={mattina:0,pomeriggio:0,notte1:0,notte2:0};
        keys.forEach(dk=>{
            const hd=appHistory[dk];
            if(!hd) return;
            const turno=hd.turno||'mattina';
            if(t[turno]!==undefined) t[turno]++;
        });
        return t;
    }

    // Aderenza settimanale limiti
    function getLimitsStatus(){
        return Object.entries(weeklyLimits).map(([k,v])=>({
            key:k,label:k.replace(/_/g,' '),icon:v.icon,
            current:v.current,max:v.max,
            pct:Math.min(Math.round((v.current/v.max)*100),100)
        }));
    }

    const meals7=countMealsWithActivity(last7);
    const meals30=countMealsWithActivity(last30);
    const topFoods7=countTopFoods(last7);
    const topFoods30=countTopFoods(last30,10);
    const turni30=countTurni(last30);
    const limitsStatus=getLimitsStatus();
    const totalDays=histKeys.filter(dk=>{
        const hd=appHistory[dk];
        return hd&&Object.values(hd.usedItems||{}).some(mk=>Object.keys(mk).length>0);
    }).length;

    const turniLabels={mattina:'🌅 Mattina',pomeriggio:'☀️ Pomeriggio',notte1:'🌙 Notte 1',notte2:'🌙 Notte 2'};
    const maxTurno=Math.max(...Object.values(turni30),1);

    let html='';

    // KPI cards
    html+=`<div class="stats-grid">
        <div class="stat-card">
            <div class="stat-card-icon">🔥</div>
            <div class="stat-card-value">${streak}</div>
            <div class="stat-card-label">Giorni consecutivi</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon">📅</div>
            <div class="stat-card-value">${totalDays}</div>
            <div class="stat-card-label">Giorni registrati</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon">🍽️</div>
            <div class="stat-card-value">${meals7}</div>
            <div class="stat-card-label">Pasti ultime 7gg</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon">📈</div>
            <div class="stat-card-value">${meals30}</div>
            <div class="stat-card-label">Pasti ultimi 30gg</div>
        </div>
    </div>`;

    // Streak badge
    if(streak>=3){
        html+=`<div style="margin-bottom:18px;">
            <div class="streak-badge">
                🔥 Streak attiva: ${streak} ${streak===1?'giorno':'giorni'} consecutivi!
                ${streak>=7?' 🏆 Una settimana piena!':streak>=14?' 🥇 Due settimane!':streak>=30?' 🎖️ Un mese!':''}
            </div>
        </div>`;
    }

    // Limiti settimanali
    html+=`<div class="stats-section">
        <div class="stats-section-title">📊 Limiti Settimanali — settimana in corso</div>`;
    limitsStatus.forEach(l=>{
        const cls=l.pct>=100?'exceeded':l.pct>=70?'warning':'';
        html+=`<div class="stat-bar-row">
            <div class="stat-bar-label">${l.icon} ${l.label}</div>
            <div class="stat-bar-track">
                <div class="stat-bar-fill ${cls}" style="width:${l.pct}%"></div>
            </div>
            <div class="stat-bar-val ${cls}">${l.current}/${l.max}</div>
        </div>`;
    });
    html+='</div>';

    // Turni ultimi 30gg
    html+=`<div class="stats-section">
        <div class="stats-section-title">🔄 Turni — ultimi 30 giorni</div>`;
    Object.entries(turni30).forEach(([key,val])=>{
        const pct=Math.round((val/maxTurno)*100);
        html+=`<div class="stat-bar-row">
            <div class="stat-bar-label">${turniLabels[key]}</div>
            <div class="stat-bar-track">
                <div class="stat-bar-fill" style="width:${pct}%"></div>
            </div>
            <div class="stat-bar-val">${val}</div>
        </div>`;
    });
    html+='</div>';

    // Top alimenti ultime 7gg
    if(topFoods7.length){
        html+=`<div class="stats-section">
            <div class="stats-section-title">🥇 Alimenti più usati — ultime 7gg</div>
            <div class="top-foods-grid">`;
        topFoods7.forEach(([name,count])=>{
            const item=allPantryItems.find(i=>i.name===name);
            html+=`<div class="top-food-item">
                <div style="font-size:1.6em;">${item?.icon||'🍽️'}</div>
                <div class="top-food-count">${count}x</div>
                <div class="top-food-name">${name}</div>
            </div>`;
        });
        html+='</div></div>';
    }

    // Top alimenti ultimi 30gg
    if(topFoods30.length){
        html+=`<div class="stats-section">
            <div class="stats-section-title">🏆 Alimenti più usati — ultimi 30gg</div>
            <div class="top-foods-grid">`;
        topFoods30.forEach(([name,count])=>{
            const item=allPantryItems.find(i=>i.name===name);
            html+=`<div class="top-food-item">
                <div style="font-size:1.6em;">${item?.icon||'🍽️'}</div>
                <div class="top-food-count">${count}x</div>
                <div class="top-food-name">${name}</div>
            </div>`;
        });
        html+='</div></div>';
    }

    container.innerHTML=html;
}
