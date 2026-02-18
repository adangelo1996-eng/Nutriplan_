/* ═══════════════════════════════════
   RICETTE CUSTOM — stato locale
═══════════════════════════════════ */
let ricettaEditId=null;
let ricettaMealFilter='tutti';
let ricetteSearchQuery='';
let rfIngCount=0;

/* ── INIT AUTOCOMPLETE ── */
function initIngredientiDatalist(){
    const dl=document.getElementById('ingredientiSuggeriti');
    if(!dl) return;
    dl.innerHTML=allPantryItems.map(i=>`<option value="${i.name}">`).join('');
}

/* ══════════════════════════════════
   RENDER PAGINA RICETTE
══════════════════════════════════ */
function renderRicettePage(){
    renderCatalogoRicette();
    renderCustomRicette();
}

/* ── TAB SWITCHER ── */
function showRicetteTab(tab,btn){
    document.querySelectorAll('#ricettePage .page-tab-content').forEach(c=>c.classList.remove('active'));
    document.querySelectorAll('#ricettePage .page-tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('ricetteTab'+tab.charAt(0).toUpperCase()+tab.slice(1)).classList.add('active');
    if(btn) btn.classList.add('active');
    if(tab==='catalogo') renderCatalogoRicette();
    if(tab==='custom') renderCustomRicette();
}

/* ══════════════════════════════════
   CATALOGO (built-in + custom)
══════════════════════════════════ */
function getAllRecipesFlat(){
    const built=[];
    Object.entries(ricette||{}).forEach(([key,r])=>{
        built.push({...r,_id:key,_source:'builtin'});
    });
    customRecipes.forEach(r=>{
        built.push({...r,_id:r.id,_source:'custom'});
    });
    return built;
}

function filterRicette(val){
    ricetteSearchQuery=val;
    const clearBtn=document.getElementById('ricetteClearBtn');
    if(clearBtn) clearBtn.style.display=val?'block':'none';
    renderCatalogoRicette();
}
function clearRicetteSearch(){
    const input=document.getElementById('ricetteSearch');
    if(input) input.value='';
    ricetteSearchQuery='';
    const clearBtn=document.getElementById('ricetteClearBtn');
    if(clearBtn) clearBtn.style.display='none';
    renderCatalogoRicette();
    input?.focus();
}
function setRicetteMealFilter(val,btn){
    ricettaMealFilter=val;
    document.querySelectorAll('.ricette-filter-btn').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    renderCatalogoRicette();
}

function renderCatalogoRicette(){
    const container=document.getElementById('ricetteCatalogoContent');
    if(!container) return;
    let all=getAllRecipesFlat();

    if(ricettaMealFilter!=='tutti'){
        all=all.filter(r=>{
            if(r.pasto) return r.pasto===ricettaMealFilter;
            if(r.meal) return r.meal===ricettaMealFilter;
            return true;
        });
    }
    if(ricetteSearchQuery){
        const q=ricetteSearchQuery.toLowerCase();
        all=all.filter(r=>{
            const name=(r.nome||r.name||'').toLowerCase();
            const ings=(r.ingredienti||r.ingredients||[]).map(i=>(i.nome||i.name||i.label||'').toLowerCase()).join(' ');
            return name.includes(q)||ings.includes(q);
        });
    }

    if(!all.length){
        container.innerHTML=`<div class="ricette-empty">
            <div style="font-size:2.5em;margin-bottom:10px;">🔍</div>
            <p>Nessuna ricetta trovata.</p>
        </div>`;
        return;
    }

    container.innerHTML=`<div class="ricette-grid">${all.map(r=>buildRicettaCard(r)).join('')}</div>`;
}

function buildRicettaCard(r){
    const name=r.nome||r.name||'Ricetta';
    const pasto=r.pasto||r.meal||'–';
    const ings=r.ingredienti||r.ingredients||[];
    const isCustom=r._source==='custom';
    const pastoLabel={colazione:'☕ Colazione',spuntino:'🍎 Spuntino',pranzo:'🍽️ Pranzo',merenda:'🥪 Merenda',cena:'🌙 Cena'}[pasto]||pasto;

    let availCount=0;
    ings.forEach(ing=>{
        const ingName=ing.nome||ing.name||ing.label||'';
        if(checkAvailByName(ingName)) availCount++;
    });
    const total=ings.length||1;
    const pct=Math.round((availCount/total)*100);
    let availBadge='';
    if(pct===100) availBadge=`<span class="rcb rcb-avail">✓ tutto disponibile</span>`;
    else if(pct>=50) availBadge=`<span class="rcb rcb-partial">⚠ ${pct}% disponibile</span>`;
    else availBadge=`<span class="rcb rcb-missing">✗ ingredienti mancanti</span>`;

    const ingPreview=ings.slice(0,4).map(i=>i.nome||i.name||i.label||'').filter(Boolean).join(', ')+(ings.length>4?` +${ings.length-4}`:'');
    const idStr=JSON.stringify(r._id).replace(/"/g,'&quot;');
    const srcStr=r._source;

    return `<div class="ricetta-card ${isCustom?'custom-card':''}" onclick="openRicettaDetail('${r._id}','${srcStr}')">
        <div class="ricetta-card-head">
            <div class="ricetta-card-icon">${isCustom?'⭐':'🍽️'}</div>
            <div class="ricetta-card-info">
                <div class="ricetta-card-name">${name}</div>
                <div class="ricetta-card-badges">
                    <span class="rcb rcb-pasto">${pastoLabel}</span>
                    ${isCustom?'<span class="rcb rcb-custom">Mia ricetta</span>':''}
                    ${availBadge}
                </div>
            </div>
        </div>
        <div class="ricetta-card-ings">🥦 ${ingPreview||'Nessun ingrediente'}</div>
        <div class="ricetta-card-footer">
            <span style="font-size:.75em;color:var(--text-light);">${ings.length} ingredient${ings.length===1?'e':'i'}</span>
            <div class="ricetta-card-footer-actions">
                ${isCustom?`<button class="btn btn-secondary btn-small" onclick="event.stopPropagation();editRicettaCustom('${r._id}')">✏️</button>
                <button class="btn btn-warning btn-small" onclick="event.stopPropagation();deleteRicettaCustom('${r._id}')">🗑️</button>`:''}
            </div>
        </div>
    </div>`;
}

function openRicettaDetail(id,source){
    let r;
    if(source==='custom'){
        r=customRecipes.find(x=>x.id===id);
    } else {
        r=ricette?.[id];
    }
    if(!r) return;
    const name=r.nome||r.name||'Ricetta';
    const ings=r.ingredienti||r.ingredients||[];
    const prep=r.istruzioni||r.instructions||r.preparazione||'';
    const pasto=r.pasto||r.meal||'';
    const pastoLabel={colazione:'☕ Colazione',spuntino:'🍎 Spuntino',pranzo:'🍽️ Pranzo',merenda:'🥪 Merenda',cena:'🌙 Cena'}[pasto]||pasto;

    let ingHtml=ings.map(ing=>{
        const ingName=ing.nome||ing.name||ing.label||'';
        const qty=ing.quantita||ing.quantity||ing.qty||'';
        const unit=ing.unita||ing.unit||'';
        const avail=checkAvailByName(ingName);
        return `<div class="ingredient-item ${avail?'ing-available':'ing-missing'}">
            <div class="ingredient-left">
                <span class="ingredient-name">${ingName}</span>
            </div>
            <span class="ingredient-qty-label ${avail?'ok':'ko'}">${qty}${unit}</span>
        </div>`;
    }).join('');

    document.getElementById('recipeModalTitle').textContent=`${source==='custom'?'⭐':'🍽️'} ${name} — ${pastoLabel}`;
    document.getElementById('recipeModalBody').innerHTML=`
        ${ingHtml}
        ${prep?`<div style="margin-top:14px;padding:12px;background:var(--bg-light);border-radius:10px;font-size:.87em;line-height:1.7;white-space:pre-wrap;color:var(--text-dark);">${prep}</div>`:''}
    `;
    document.getElementById('recipeModalSelectBtn').style.display='none';
    document.getElementById('recipeModal').classList.add('active');
}

/* ══════════════════════════════════
   LE MIE RICETTE
══════════════════════════════════ */
function renderCustomRicette(){
    const container=document.getElementById('ricetteCustomContent');
    if(!container) return;
    if(!customRecipes.length){
        container.innerHTML=`<div class="custom-ricette-empty">
            <div style="font-size:3em;margin-bottom:10px;">📖</div>
            <h3>Nessuna ricetta personalizzata</h3>
            <p>Clicca "➕ Nuova Ricetta" per aggiungerne una.</p>
        </div>`;
        return;
    }
    container.innerHTML=customRecipes.map(r=>{
        const ings=r.ingredienti||[];
        const pastoLabel={colazione:'☕ Colazione',spuntino:'🍎 Spuntino',pranzo:'🍽️ Pranzo',merenda:'🥪 Merenda',cena:'🌙 Cena'}[r.pasto]||r.pasto;
        const limitsUsed=(r.limiti||[]).map(l=>`⚠️ ${l.replace(/_/g,' ')}`).join(' ');
        return `<div class="custom-ricetta-item">
            <div class="custom-ricetta-header">
                <div>
                    <div class="custom-ricetta-name">⭐ ${r.nome}</div>
                    <div class="custom-ricetta-meta">
                        <span class="rcb rcb-pasto">${pastoLabel}</span>
                        ${limitsUsed?`<span class="rcb" style="background:var(--orange-bg);color:var(--orange);">${limitsUsed}</span>`:''}
                    </div>
                </div>
                <div class="custom-ricetta-actions">
                    <button class="btn btn-secondary btn-small" onclick="editRicettaCustom('${r.id}')">✏️</button>
                    <button class="btn btn-warning btn-small" onclick="deleteRicettaCustom('${r.id}')">🗑️</button>
                </div>
            </div>
            <div class="custom-ricetta-ings">
                🥦 ${ings.map(i=>`${i.nome} ${i.quantita}${i.unita}`).join(' · ')||'Nessun ingrediente'}
            </div>
            ${r.istruzioni?`<div class="custom-ricetta-prep">${r.istruzioni}</div>`:''}
        </div>`;
    }).join('');
}

/* ══════════════════════════════════
   FORM NUOVA / MODIFICA
══════════════════════════════════ */
function openRicettaForm(id=null){
    ricettaEditId=id;
    rfIngCount=0;
    document.getElementById('ricettaFormTitle').textContent=id?'✏️ Modifica Ricetta':'🍳 Nuova Ricetta';

    // Reset campi
    document.getElementById('rfNome').value='';
    document.getElementById('rfPasto').value='pranzo';
    document.getElementById('rfIstruzioni').value='';
    document.getElementById('rfIngList').innerHTML='';

    // Build limiti checkboxes
    const limGrid=document.getElementById('rfLimitsGrid');
    limGrid.innerHTML=Object.entries(weeklyLimits).map(([key,data])=>`
        <label class="rf-limit-check" id="rflc_${key}">
            <input type="checkbox" id="rfl_${key}" value="${key}" onchange="updateRfLimitStyle('${key}')">
            <label for="rfl_${key}" style="cursor:pointer;">${data.icon} ${key.replace(/_/g,' ')}</label>
        </label>`).join('');

    // Se modifica, popola i dati
    if(id){
        const r=customRecipes.find(x=>x.id===id);
        if(r){
            document.getElementById('rfNome').value=r.nome||'';
            document.getElementById('rfPasto').value=r.pasto||'pranzo';
            document.getElementById('rfIstruzioni').value=r.istruzioni||'';
            (r.ingredienti||[]).forEach(ing=>addRfIng(ing));
            (r.limiti||[]).forEach(l=>{
                const cb=document.getElementById('rfl_'+l);
                if(cb){cb.checked=true;updateRfLimitStyle(l);}
            });
        }
    } else {
        addRfIng();
        addRfIng();
    }

    initIngredientiDatalist();
    document.getElementById('ricettaFormModal').classList.add('active');
    setTimeout(()=>document.getElementById('rfNome').focus(),150);
}

function closeRicettaForm(){
    document.getElementById('ricettaFormModal').classList.remove('active');
    ricettaEditId=null;
}

function addRfIng(data=null){
    const idx=rfIngCount++;
    const nome=data?.nome||'';
    const qty=data?.quantita||'';
    const unit=data?.unita||'g';
    const units=['g','kg','ml','l','cucchiaio','cucchiaino','pz','foglie','fette','qb'];
    const row=document.createElement('div');
    row.className='rf-ing-row';
    row.id=`rfIng_${idx}`;
    row.innerHTML=`
        <input type="text" class="rf-input rf-ing-name" id="rfIngNome_${idx}"
            placeholder="Ingrediente" value="${nome}" list="ingredientiSuggeriti">
        <input type="number" class="rf-input rf-ing-qty" id="rfIngQty_${idx}"
            placeholder="Qtà" value="${qty}" min="0">
        <select class="rf-input rf-ing-unit" id="rfIngUnit_${idx}">
            ${units.map(u=>`<option value="${u}" ${u===unit?'selected':''}>${u}</option>`).join('')}
        </select>
        <button class="rf-ing-del" onclick="removeRfIng('rfIng_${idx}')">🗑</button>`;
    document.getElementById('rfIngList').appendChild(row);
}

function removeRfIng(rowId){
    const el=document.getElementById(rowId);
    if(el) el.remove();
}

function updateRfLimitStyle(key){
    const cb=document.getElementById('rfl_'+key);
    const wrap=document.getElementById('rflc_'+key);
    if(cb&&wrap) wrap.classList.toggle('checked',cb.checked);
}

function saveRicettaForm(){
    const nome=document.getElementById('rfNome').value.trim();
    const pasto=document.getElementById('rfPasto').value;
    const istruzioni=document.getElementById('rfIstruzioni').value.trim();

    if(!nome){alert('❌ Inserisci il nome della ricetta.');return;}
    if(!istruzioni){alert('❌ Inserisci le istruzioni di preparazione.');return;}

    // Raccogli ingredienti
    const ingredienti=[];
    document.querySelectorAll('#rfIngList .rf-ing-row').forEach(row=>{
        const idx=row.id.replace('rfIng_','');
        const nome_ing=document.getElementById(`rfIngNome_${idx}`)?.value.trim();
        const qty=document.getElementById(`rfIngQty_${idx}`)?.value;
        const unit=document.getElementById(`rfIngUnit_${idx}`)?.value;
        if(nome_ing) ingredienti.push({nome:nome_ing,quantita:parseFloat(qty)||0,unita:unit});
    });

    // Raccogli limiti
    const limiti=[];
    Object.keys(weeklyLimits).forEach(k=>{
        if(document.getElementById('rfl_'+k)?.checked) limiti.push(k);
    });

    const ricetta={
        id:ricettaEditId||'custom_'+Date.now(),
        nome,pasto,istruzioni,ingredienti,limiti,
        createdAt:ricettaEditId
            ?(customRecipes.find(r=>r.id===ricettaEditId)?.createdAt||Date.now())
            :Date.now()
    };

    if(ricettaEditId){
        const idx=customRecipes.findIndex(r=>r.id===ricettaEditId);
        if(idx>-1) customRecipes[idx]=ricetta;
    } else {
        customRecipes.push(ricetta);
    }

    saveData();
    closeRicettaForm();
    renderCustomRicette();
    renderCatalogoRicette();
    alert(`✅ Ricetta "${nome}" salvata!`);
}

function editRicettaCustom(id){
    openRicettaForm(id);
}

function deleteRicettaCustom(id){
    const r=customRecipes.find(x=>x.id===id);
    if(!r||!confirm(`Eliminare la ricetta "${r.nome}"?`)) return;
    customRecipes=customRecipes.filter(x=>x.id!==id);
    saveData();
    renderCustomRicette();
    renderCatalogoRicette();
    alert('✅ Ricetta eliminata.');
}
