/* ═══════════════════════════════════
   ICONA APP — Canvas
═══════════════════════════════════ */
function drawAppIcon(canvas,size=512){
    canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');
    const r=size*.18;
    ctx.beginPath();
    ctx.moveTo(r,0);ctx.lineTo(size-r,0);
    ctx.quadraticCurveTo(size,0,size,r);
    ctx.lineTo(size,size-r);
    ctx.quadraticCurveTo(size,size,size-r,size);
    ctx.lineTo(r,size);
    ctx.quadraticCurveTo(0,size,0,size-r);
    ctx.lineTo(0,r);
    ctx.quadraticCurveTo(0,0,r,0);
    ctx.closePath();
    const grad=ctx.createLinearGradient(0,0,size,size);
    grad.addColorStop(0,'#4a9b7f');
    grad.addColorStop(1,'#2d6e55');
    ctx.fillStyle=grad;ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.08)';
    ctx.beginPath();ctx.arc(size*.3,size*.25,size*.35,0,Math.PI*2);ctx.fill();
    ctx.font=`bold ${size*.52}px serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#ffffff';
    ctx.shadowColor='rgba(0,0,0,0.2)';
    ctx.shadowBlur=size*.04;
    ctx.fillText('🌿',size/2,size*.52);
}

function initIcons(){
    const hc=document.getElementById('headerIcon');
    if(hc) drawAppIcon(hc,32);

    const lc=document.createElement('canvas');
    lc.width=90;lc.height=90;
    drawAppIcon(lc,90);
    const ldiv=document.getElementById('landingLogo');
    if(ldiv){ldiv.innerHTML='';ldiv.appendChild(lc);}

    const bigCanvas=document.createElement('canvas');
    drawAppIcon(bigCanvas,512);
    const iconUrl=bigCanvas.toDataURL('image/png');
    const ati=document.getElementById('appleTouchIcon');
    if(ati) ati.href=iconUrl;

    const mf={name:'NutriPlan',short_name:'NutriPlan',start_url:'/',display:'standalone',
        background_color:'#4a9b7f',theme_color:'#4a9b7f',
        icons:[{src:iconUrl,sizes:'512x512',type:'image/png'},{src:iconUrl,sizes:'192x192',type:'image/png'}]};
    const mp=document.getElementById('manifest-placeholder');
    if(mp) mp.href=URL.createObjectURL(new Blob([JSON.stringify(mf)],{type:'application/json'}));
}

/* ═══════════════════════════════════
   DARK MODE
═══════════════════════════════════ */
function initDarkMode(){
    const saved=localStorage.getItem('nutriplanDark');
    const prefersDark=window.matchMedia('(prefers-color-scheme:dark)').matches;
    const isDark=saved!==null?saved==='1':prefersDark;
    applyDarkMode(isDark,false);
}

function applyDarkMode(isDark,save=true){
    document.documentElement.setAttribute('data-theme',isDark?'dark':'light');
    const btn=document.getElementById('darkToggle');
    if(btn) btn.textContent=isDark?'☀️':'🌙';
    const meta=document.getElementById('metaThemeColor');
    if(meta) meta.content=isDark?'#152318':'#4a9b7f';
    if(save) localStorage.setItem('nutriplanDark',isDark?'1':'0');
}

function toggleDarkMode(){
    const isDark=document.documentElement.getAttribute('data-theme')==='dark';
    applyDarkMode(!isDark);
}

/* ═══════════════════════════════════
   IOS INSTALL BANNER
═══════════════════════════════════ */
function isIos(){
    return/iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isInStandaloneMode(){
    return window.navigator.standalone===true||window.matchMedia('(display-mode:standalone)').matches;
}
function closeIosBanner(){
    document.getElementById('iosBanner').classList.remove('show');
    localStorage.setItem('iosBannerDismissed','1');
}
function initIosBanner(){
    if(isIos()&&!isInStandaloneMode()&&!localStorage.getItem('iosBannerDismissed')){
        setTimeout(()=>document.getElementById('iosBanner').classList.add('show'),2000);
    }
}

/* ═══════════════════════════════════
   ANDROID PWA
═══════════════════════════════════ */
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();deferredPrompt=e;
    if(!localStorage.getItem('installDismissed'))
        document.getElementById('installBanner').classList.add('show');
});
document.getElementById('installBtn').addEventListener('click',async()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();deferredPrompt=null;
    document.getElementById('installBanner').classList.remove('show');
});
document.getElementById('dismissBtn').addEventListener('click',()=>{
    document.getElementById('installBanner').classList.remove('show');
    localStorage.setItem('installDismissed','1');
});

/* ═══════════════════════════════════
   SERVICE WORKER
═══════════════════════════════════ */
if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
        const sw=`
            const C='nutriplan-v6';
            const ASSETS=['/','index.html','style.css','data.js','storage.js',
                'app.js','piano.js','dispensa.js','ricette.js','storico.js',
                'spesa.js','statistiche.js','pdf.js'];
            self.addEventListener('install',e=>e.waitUntil(
                caches.open(C).then(c=>c.addAll(ASSETS).catch(()=>{}))
            ));
            self.addEventListener('fetch',e=>e.respondWith(
                caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('index.html')))
            ));
            self.addEventListener('activate',e=>e.waitUntil(
                caches.keys().then(ks=>Promise.all(ks.map(k=>k!==C&&caches.delete(k))))
            ));
        `;
        navigator.serviceWorker.register(
            URL.createObjectURL(new Blob([sw],{type:'application/javascript'}))
        ).catch(()=>{});
    });
}

window.addEventListener('online', ()=>document.getElementById('offlineIndicator').classList.remove('show'));
window.addEventListener('offline',()=>document.getElementById('offlineIndicator').classList.add('show'));

/* ═══════════════════════════════════
   CALENDARIO
═══════════════════════════════════ */
const DAYS_IT=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const MONTHS_IT=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const MONTHS_FULL=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

function buildCalendarBar(){
    const bar=document.getElementById('calendarBar');
    const today=new Date();today.setHours(0,0,0,0);
    const days=[];
    for(let i=-30;i<=30;i++){
        const d=new Date(today);d.setDate(today.getDate()+i);days.push(d);
    }
    bar.innerHTML=days.map(d=>{
        const dk=formatDateKey(d);
        const isToday=dk===getCurrentDateKey();
        const isActive=dk===selectedDateKey;
        const hasData=appHistory[dk]&&(
            Object.keys(appHistory[dk].usedItems||{}).some(mk=>Object.keys(appHistory[dk].usedItems[mk]).length>0)||
            Object.keys(appHistory[dk].substitutions||{}).some(mk=>Object.keys(appHistory[dk].substitutions[mk]).length>0)
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
    document.getElementById('daySelect').value=appHistory[dk]?.turno||'mattina';
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

/* ═══════════════════════════════════
   ENTER APP
═══════════════════════════════════ */
function enterApp(){
    document.getElementById('landingPage').style.display='none';
    document.getElementById('mainApp').classList.add('active');
    loadData();
    selectedDateKey=getCurrentDateKey();
    getDayData(selectedDateKey);
    document.getElementById('daySelect').value=appHistory[selectedDateKey]?.turno||'mattina';
    buildCalendarBar();
    selectCalendarDay(selectedDateKey);
    renderPantry();
    renderFridge();
    updateLimits();
    initDayIngGrid();
    updateFridgeSuggestions();
    initIosBanner();
}

/* ═══════════════════════════════════
   NAVIGAZIONE PAGINE
═══════════════════════════════════ */
function showPage(name,btn){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
    document.getElementById(name+'Page').classList.add('active');
    if(btn) btn.classList.add('active');
    if(name==='frigo'){renderFridge();updateSavedFridges();}
    if(name==='limiti') updateLimits();
    if(name==='dispensa') renderPantry();
    if(name==='storico') renderStorico();
    if(name==='statistiche') renderStatistiche();
    if(name==='spesa'){
        document.getElementById('spesaTurnoSelect').value=
            appHistory[selectedDateKey]?.turno||'mattina';
        renderSpesa();
    }
}

function showPianoTab(tab,btn){
    document.querySelectorAll('.page-tab-content').forEach(c=>c.classList.remove('active'));
    document.querySelectorAll('#pianoPage .page-tab').forEach(t=>t.classList.remove('active'));
    const id='pianoTab'+tab.charAt(0).toUpperCase()+tab.slice(1);
    document.getElementById(id).classList.add('active');
    if(btn) btn.classList.add('active');
    if(tab==='frigo') updateFridgeSuggestions();
}

/* ═══════════════════════════════════
   LIMITI
═══════════════════════════════════ */
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
    saveData();updateLimits();renderMealPlan();
    alert('✅ Settimana resettata!');
}

/* ═══════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════ */
document.getElementById('saveFridgeModal').addEventListener('click',e=>{
    if(e.target.id==='saveFridgeModal') closeSaveFridgeModal();
});
document.getElementById('recipeModal').addEventListener('click',e=>{
    if(e.target.id==='recipeModal') closeRecipeModal();
});
document.getElementById('spesaItemModal').addEventListener('click',e=>{
    if(e.target.id==='spesaItemModal') closeSpesaItemModal();
});
document.getElementById('fridgeName').addEventListener('keypress',e=>{
    if(e.key==='Enter') saveFridge();
});
document.addEventListener('click',e=>{
    if(!e.target.closest('.sub-drawer')&&!e.target.closest('.meal-item-btn')){
        document.querySelectorAll('.sub-drawer.open').forEach(d=>d.classList.remove('open'));
    }
});

/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */
initIcons();
initDarkMode();
