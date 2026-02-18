if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
        const sw=`
            const C='nutriplan-v5';
            self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['/']))));
            self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)).catch(()=>caches.match('/'))));
            self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>k!==C&&caches.delete(k))))));
        `;
        navigator.serviceWorker.register(
            URL.createObjectURL(new Blob([sw],{type:'application/javascript'}))
        ).catch(()=>{});
    });
}

const mf={name:'NutriPlan',short_name:'NutriPlan',start_url:'/',display:'standalone',background_color:'#e8f5ed',theme_color:'#4a9b7f',icons:[{src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="%234a9b7f"/><text x="256" y="340" font-size="280" text-anchor="middle" fill="white">🌿</text></svg>',sizes:'512x512',type:'image/svg+xml'}]};
document.getElementById('manifest-placeholder').href=URL.createObjectURL(new Blob([JSON.stringify(mf)],{type:'application/json'}));

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();deferredPrompt=e;
    if(!localStorage.getItem('installDismissed')) document.getElementById('installBanner').classList.add('show');
});
document.getElementById('installBtn').addEventListener('click',async()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();deferredPrompt=null;
    document.getElementById('installBanner').classList.remove('show');
});
document.getElementById('dismissBtn').addEventListener('click',()=>{
    document.getElementById('installBanner').classList.remove('show');
    localStorage.setItem('installDismissed','true');
});
window.addEventListener('online', ()=>document.getElementById('offlineIndicator').classList.remove('show'));
window.addEventListener('offline',()=>document.getElementById('offlineIndicator').classList.add('show'));

const DAYS_IT=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const MONTHS_IT=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function buildCalendarBar(){
    const bar=document.getElementById('calendarBar');
    const today=new Date();
    today.setHours(0,0,0,0);
    const days=[];
    for(let i=-30;i<=30;i++){
        const d=new Date(today);
        d.setDate(today.getDate()+i);
        days.push(d);
    }
    bar.innerHTML=days.map(d=>{
        const dk=formatDateKey(d);
        const isToday=dk===getCurrentDateKey();
        const isActive=dk===selectedDateKey;
        const hasData=appHistory[dk]&&(
            Object.keys(appHistory[dk].usedItems||{}).length>0||
            Object.keys(appHistory[dk].substitutions||{}).length>0
        );
        const isPast=d<today;
        return `<div class="cal-day${isToday?' today':''}${isActive?' active':''}${hasData?' has-data':''}${isPast&&!isToday?' cal-past':''}"
            data-date="${dk}" onclick="selectCalendarDay('${dk}')">
            <div class="cal-dow">${DAYS_IT[d.getDay()]}</div>
            <div class="cal-num">${d.getDate()}</div>
            <div class="cal-mon">${MONTHS_IT[d.getMonth()]}</div>
        </div>`;
    }).join('');
    setTimeout(()=>{
        const active=bar.querySelector('.cal-day.active');
        if(active) active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    },100);
}

function formatDateKey(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function selectCalendarDay(dk){
    selectedDateKey=dk;
    const d=new Date(dk+'T00:00:00');
    const label=`${DAYS_IT[d.getDay()]} ${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
    document.getElementById('currentDateLabel').textContent=label;
    getDayData(dk);
    const turnoSel=document.getElementById('daySelect');
    turnoSel.value=appHistory[dk]?.turno||'mattina';
    buildCalendarBar();
    renderMealPlan();
}

function onTurnoChange(){
    const dk=selectedDateKey||getCurrentDateKey();
    getDayData(dk);
    appHistory[dk].turno=document.getElementById('daySelect').value;
    saveData();
    renderMealPlan();
}

function enterApp(){
    document.getElementById('landingPage').style.display='none';
    document.getElementById('mainApp').classList.add('active');
    loadData();
    selectedDateKey=getCurrentDateKey();
    getDayData(selectedDateKey);
    const savedTurno=appHistory[selectedDateKey]?.turno||'mattina';
    document.getElementById('daySelect').value=savedTurno;
    buildCalendarBar();
    selectCalendarDay(selectedDateKey);
    renderPantry();
    renderFridge();
    updateLimits();
    initDayIngGrid();
    updateFridgeSuggestions();
}

function showPage(name,btn){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
    document.getElementById(name+'Page').classList.add('active');
    if(btn) btn.classList.add('active');
    if(name==='frigo'){renderFridge();updateSavedFridges();}
    if(name==='limiti') updateLimits();
    if(name==='dispensa') renderPantry();
    if(name==='storico') renderStorico();
}

function showPianoTab(tab,btn){
    document.querySelectorAll('.page-tab-content').forEach(c=>c.classList.remove('active'));
    document.querySelectorAll('#pianoPage .page-tab').forEach(t=>t.classList.remove('active'));
    const id='pianoTab'+tab.charAt(0).toUpperCase()+tab.slice(1);
    document.getElementById(id).classList.add('active');
    if(btn) btn.classList.add('active');
    if(tab==='frigo') updateFridgeSuggestions();
}

function updateLimits(){
    const grid=document.getElementById('limitsGrid');
    if(!grid) return;
    grid.innerHTML=Object.entries(weeklyLimits).map(([key,data])=>{
        const pct=Math.min((data.current/data.max)*100,100);
        const cls=pct>=100?'exceeded':pct>=70?'warning':'';
        return `<div class="limit-card">
            <div class="limit-card-icon">${data.icon}</div>
            <div class="limit-card-name">${key.replace(/_/g,' ')}</div>
            <div class="limit-progress-bar"><div class="limit-progress-fill ${cls}" style="width:${pct}%"></div></div>
            <div class="limit-text ${cls}">${data.current} / ${data.max} ${data.unit}</div>
        </div>`;
    }).join('');
}

function resetWeek(){
    if(!confirm('Resettare tutti i contatori settimanali?')) return;
    Object.keys(weeklyLimits).forEach(k=>weeklyLimits[k].current=0);
    saveData();
    updateLimits();
    renderMealPlan();
    alert('✅ Settimana resettata!');
}

document.getElementById('saveFridgeModal').addEventListener('click',e=>{if(e.target.id==='saveFridgeModal') closeSaveFridgeModal();});
document.getElementById('recipeModal').addEventListener('click',e=>{if(e.target.id==='recipeModal') closeRecipeModal();});
document.getElementById('fridgeName').addEventListener('keypress',e=>{if(e.key==='Enter') saveFridge();});
document.addEventListener('click',e=>{
    if(!e.target.closest('.sub-drawer')&&!e.target.closest('.meal-item-btn')){
        document.querySelectorAll('.sub-drawer.open').forEach(d=>d.classList.remove('open'));
    }
});
