let pantryItems={};
let savedFridges={};
let selectedDayIngredients=[];
let currentModalRecipe=null;
let appHistory={};
let selectedDateKey='';

function getCurrentDateKey(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDayData(dateKey){
    if(!appHistory[dateKey]){
        appHistory[dateKey]={turno:'mattina',usedItems:{},substitutions:{}};
    }
    return appHistory[dateKey];
}

function loadData(){
    const saved=localStorage.getItem('nutriplanDataV5');
    if(!saved) return;
    const data=JSON.parse(saved);
    if(data.limits) Object.keys(data.limits).forEach(k=>{
        if(weeklyLimits[k]) Object.assign(weeklyLimits[k],data.limits[k]);
    });
    pantryItems=data.pantry||{};
    savedFridges=data.savedFridges||{};
    appHistory=data.history||{};
    const cutoff=new Date();
    cutoff.setFullYear(cutoff.getFullYear()-1);
    Object.keys(appHistory).forEach(dk=>{
        if(new Date(dk)<cutoff) delete appHistory[dk];
    });
}

function saveData(){
    localStorage.setItem('nutriplanDataV5',JSON.stringify({
        limits:weeklyLimits,
        pantry:pantryItems,
        savedFridges,
        history:appHistory
    }));
}

function convertUnit(v,from,to){
    if(from===to) return v;
    if(unitConversions[from]&&unitConversions[from][to]) return v*unitConversions[from][to];
    return null;
}

function checkIngredientAvailability(ing){
    const nl=ing.name.toLowerCase();
    for(const [pName,pData] of Object.entries(pantryItems)){
        const pnl=pName.toLowerCase();
        const match=pnl===nl||pnl.includes(nl)||nl.includes(pnl)||
            pnl.split(' ').some(w=>w.length>2&&nl.includes(w))||
            nl.split(' ').some(w=>w.length>2&&pnl.includes(w));
        if(!match) continue;
        const pQty=pData.quantity||0;
        const pUnit=pData.unit;
        const rQty=ing.quantity;
        const rUnit=ing.unit;
        const converted=convertUnit(pQty,pUnit,rUnit);
        const available=converted!==null?converted:pQty;
        const sameFamily=converted!==null||pUnit===rUnit;
        return{
            matched:true,pantryName:pName,available,
            availableUnit:rUnit,required:rQty,requiredUnit:rUnit,
            sufficient:sameFamily&&available>=rQty,
            incompatibleUnits:!sameFamily
        };
    }
    return{matched:false,sufficient:false};
}

function checkAvailByName(name){
    const nl=name.toLowerCase();
    for(const [pName,pData] of Object.entries(pantryItems)){
        const pnl=pName.toLowerCase();
        const match=pnl===nl||pnl.includes(nl)||nl.includes(pnl)||
            pnl.split(' ').some(w=>w.length>2&&nl.includes(w))||
            nl.split(' ').some(w=>w.length>2&&pnl.includes(w));
        if(match&&(pData.quantity||0)>0) return true;
    }
    return false;
}
