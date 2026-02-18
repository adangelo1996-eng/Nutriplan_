let pantryItems={};
let savedFridges={};
let selectedDayIngredients=[];
let currentModalRecipe=null;
let substitutions={};
let usedItems={};

function loadData(){
    const saved=localStorage.getItem('nutriplanDataV4');
    if(!saved) return;
    const data=JSON.parse(saved);
    if(data.limits) Object.keys(data.limits).forEach(k=>{
        if(weeklyLimits[k]) Object.assign(weeklyLimits[k],data.limits[k]);
    });
    pantryItems=data.pantry||{};
    savedFridges=data.savedFridges||{};
    substitutions=data.substitutions||{};
    usedItems=data.usedItems||{};
}

function saveData(){
    localStorage.setItem('nutriplanDataV4',JSON.stringify({
        limits:weeklyLimits,
        pantry:pantryItems,
        savedFridges,
        substitutions,
        usedItems
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
            matched:true,
            pantryName:pName,
            available,
            availableUnit:rUnit,
            required:rQty,
            requiredUnit:rUnit,
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
