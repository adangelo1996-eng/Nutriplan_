function scoreRecipe(recipe){
    let match=0;
    recipe.ingredients.forEach(ing=>{
        const res=checkIngredientAvailability(ing);
        if(res.sufficient) match++;
        else if(res.matched) match+=0.4;
    });
    return(match/recipe.ingredients.length)*100;
}

function updateFridgeSuggestions(){
    const filter=document.getElementById('fridgeMealFilter')?.value||'tutti';
    const container=document.getElementById('fridgeSuggestionsList');
    if(!container) return;
    const available=Object.keys(pantryItems).filter(k=>(pantryItems[k].quantity||0)>0);
    if(!available.length){
        container.innerHTML='<div class="fridge-empty"><p>❄️ Il frigo è vuoto. Aggiungi ingredienti dalla Dispensa.</p></div>';
        return;
    }
    let recipes=[];
    const mealKeys=filter==='tutti'?Object.keys(allRecipes):[filter];
    mealKeys.forEach(mk=>{
        if(allRecipes[mk]) allRecipes[mk].forEach(r=>recipes.push({...r,mealType:mk}));
    });
    const scored=recipes
        .map(r=>({...r,score:scoreRecipe(r)}))
        .filter(r=>r.score>0)
        .sort((a,b)=>b.score-a.score);
    if(!scored.length){
        container.innerHTML='<div class="fridge-empty"><p>🤷 Nessuna ricetta compatibile con gli ingredienti presenti.</p></div>';
        return;
    }
    const ml={colazione:'Colazione',spuntino:'Spuntino',pranzo:'Pranzo',merenda:'Merenda',cena:'Cena'};
    container.innerHTML=scored.map(r=>`
    <div class="fridge-suggestion-card" onclick='openRecipeModal(${JSON.stringify(r)})'>
        <div class="fridge-suggestion-title">
            ${r.name}<span class="fridge-suggestion-score">${Math.round(r.score)}%</span>
        </div>
        <div class="fridge-suggestion-meta">
            🍽️ ${ml[r.mealType]||r.mealType} &nbsp;·&nbsp; ${r.ingredients.length} ingredienti
            ${r.limits.length?' &nbsp;·&nbsp; ⚠️ '+r.limits.map(l=>l.replace('_',' ')).join(', '):''}
        </div>
    </div>`).join('');
}

function initDayIngGrid(){
    const grid=document.getElementById('dayIngGrid');
    if(!grid) return;
    const available=allPantryItems.filter(i=>pantryItems[i.name]&&(pantryItems[i.name].quantity||0)>0);
    if(!available.length){
        grid.innerHTML='<p style="color:var(--text-light);font-size:.88em;">Nessun ingrediente disponibile nel frigo.</p>';
        return;
    }
    grid.innerHTML=available.map(item=>`
    <button class="day-ing-btn ${selectedDayIngredients.includes(item.name)?'selected':''}"
        onclick="toggleDayIng('${item.name.replace(/'/g,"\\'")}',this)">
        ${item.icon} ${item.name}
    </button>`).join('');
}

function toggleDayIng(name,el){
    const idx=selectedDayIngredients.indexOf(name);
    if(idx>-1) selectedDayIngredients.splice(idx,1);
    else selectedDayIngredients.push(name);
    el.classList.toggle('selected');
}

function clearDayIngredients(){
    selectedDayIngredients=[];
    document.querySelectorAll('.day-ing-btn').forEach(b=>b.classList.remove('selected'));
    document.getElementById('ingredientSuggestionsList').innerHTML='';
}

function searchByIngredients(){
    const container=document.getElementById('ingredientSuggestionsList');
    if(!selectedDayIngredients.length){
        container.innerHTML='<p style="color:#f44336;font-size:.88em;">⚠️ Seleziona almeno un ingrediente.</p>';
        return;
    }
    let recipes=[];
    Object.keys(allRecipes).forEach(mk=>allRecipes[mk].forEach(r=>recipes.push({...r,mealType:mk})));
    const scored=recipes.map(r=>{
        let hits=0;
        selectedDayIngredients.forEach(sel=>{
            if(r.ingredients.some(ing=>
                ing.name.toLowerCase().includes(sel.toLowerCase())||
                sel.toLowerCase().includes(ing.name.toLowerCase())
            )) hits++;
        });
        return{...r,hits,fridgeScore:scoreRecipe(r),combo:hits*40+scoreRecipe(r)*0.6};
    }).filter(r=>r.hits>0).sort((a,b)=>b.combo-a.combo);

    if(!scored.length){
        container.innerHTML='<div class="fridge-empty"><p>🤷 Nessuna ricetta trovata con questi ingredienti.</p></div>';
        return;
    }
    const ml={colazione:'Colazione',spuntino:'Spuntino',pranzo:'Pranzo',merenda:'Merenda',cena:'Cena'};
    container.innerHTML=
        `<h4 style="color:var(--primary);margin-bottom:12px;font-size:1em;">🔍 ${scored.length} ricette trovate</h4>`+
        scored.map(r=>`
        <div class="fridge-suggestion-card" onclick='openRecipeModal(${JSON.stringify(r)})'>
            <div class="fridge-suggestion-title">
                ${r.name}<span class="fridge-suggestion-score">${r.hits} ing. selezionati</span>
            </div>
            <div class="fridge-suggestion-meta">
                🍽️ ${ml[r.mealType]||r.mealType} &nbsp;·&nbsp; Frigo: ${Math.round(r.fridgeScore)}%
                ${r.limits.length?' &nbsp;·&nbsp; ⚠️ '+r.limits.map(l=>l.replace('_',' ')).join(', '):''}
            </div>
        </div>`).join('');
}

function openRecipeModal(recipe){
    currentModalRecipe=recipe;
    document.getElementById('recipeModalTitle').textContent='🥗 '+recipe.name;
    document.getElementById('recipeModalBody').innerHTML=buildRecipeHTML(recipe);
    const limitsOk=recipe.limits.every(l=>weeklyLimits[l]&&weeklyLimits[l].current<weeklyLimits[l].max);
    const btn=document.getElementById('recipeModalSelectBtn');
    btn.disabled=!limitsOk;
    btn.textContent=limitsOk?'✅ Usa questa ricetta':'❌ Limite Raggiunto';
    document.getElementById('recipeModal').classList.add('active');
}

function closeRecipeModal(){
    document.getElementById('recipeModal').classList.remove('active');
    currentModalRecipe=null;
}

function selectRecipeFromModal(){
    if(!currentModalRecipe) return;
    applyRecipe(currentModalRecipe);
    closeRecipeModal();
}

function buildRecipeHTML(recipe){
    let html='<div style="margin-bottom:16px;">';
    recipe.ingredients.forEach(ing=>{
        const res=checkIngredientAvailability(ing);
        const cls=res.sufficient?'ing-available':(res.matched?'ing-partial':'ing-missing');
        let qLabel='';
        if(res.matched){
            if(res.incompatibleUnits){
                qLabel=`<span class="ingredient-qty-label warn">⚠️ ${res.available.toFixed(1)} ${pantryItems[res.pantryName]?.unit||''}</span>`;
            } else {
                qLabel=`<span class="ingredient-qty-label ${res.sufficient?'ok':'warn'}">${res.available.toFixed(1)}/${ing.quantity} ${ing.unit}</span>`;
            }
        } else {
            qLabel=`<span class="ingredient-qty-label ko">✗ ${ing.quantity} ${ing.unit}</span>`;
        }
        html+=`
        <div class="ingredient-item ${cls}">
            <div class="ingredient-left">
                <input type="checkbox" class="ingredient-checkbox" ${res.sufficient?'checked':''} disabled>
                <span class="ingredient-name">${ing.name}</span>
            </div>
            ${qLabel}
        </div>`;
    });
    html+='</div>';
    html+=`
    <div style="padding:14px;background:linear-gradient(135deg,#f8fdf9,#e8f5ed);border-radius:10px;border-left:4px solid var(--primary);">
        <strong style="color:var(--primary);font-size:.9em;">👨‍🍳 Preparazione</strong>
        <p style="margin-top:8px;font-size:.88em;line-height:1.7;">${recipe.instructions}</p>
    </div>`;
    if(recipe.limits.length){
        html+=`
        <div style="margin-top:10px;padding:10px;background:#fff8f0;border-radius:8px;border-left:3px solid #ff9800;font-size:.82em;color:#ff9800;">
            ⚠️ Conta per i limiti: ${recipe.limits.map(l=>'<strong>'+l.replace('_',' ')+'</strong>').join(', ')}
        </div>`;
    }
    return html;
}

function applyRecipe(recipe){
    recipe.limits.forEach(l=>{if(weeklyLimits[l]) weeklyLimits[l].current++;});
    recipe.ingredients.forEach(ing=>{
        const res=checkIngredientAvailability(ing);
        if(res.matched&&res.pantryName&&res.sufficient&&!res.incompatibleUnits){
            const pUnit=pantryItems[res.pantryName].unit;
            const rUnit=ing.unit;
            let toSub=ing.quantity;
            if(pUnit!==rUnit){
                const c=convertUnit(toSub,rUnit,pUnit);
                if(c!==null) toSub=c;
            }
            pantryItems[res.pantryName].quantity=Math.max(0,parseFloat((pantryItems[res.pantryName].quantity-toSub).toFixed(3)));
        }
    });
    saveData();
    renderFridge();
    updateLimits();
    renderPantry();
    updateFridgeSuggestions();
    alert(`✅ Ricetta "${recipe.name}" selezionata!\nIngredienti sottratti e limiti aggiornati.`);
}
