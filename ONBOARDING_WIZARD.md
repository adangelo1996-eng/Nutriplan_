# Onboarding Multi-Step Wizard

## Panoramica

Il nuovo sistema di onboarding utilizza un **wizard a 3 passi** con progress bar visuale e navigazione bidirezionale.

## Flusso Utente

```
[🍽 Step 1: Pasti] → [📊 Step 2: Limiti] → [✅ Step 3: Review] → [Salva]
       ↑                        ↑                        ↑
    Indietro              Indietro/Salta          Indietro
```

### Step 1: Cosa mangi di solito?

**Funzionalità:**
- 5 tab per pasti (colazione, spuntino, pranzo, merenda, cena)
- Chip preimpostati per selezione rapida
- Input custom con autocomplete
- Badge conteggio alimenti per tab
- Validazione: almeno 1 alimento per procedere

**Interazioni:**
- Click su chip preset: toggle on/off
- Input custom + "Aggiungi": aggiunge alimento
- Click su X nei chip aggiunti: rimuove
- "Salta per ora": chiude onboarding con conferma
- "Avanti →": passa allo step 2 (disabilitato se vuoto)

### Step 2: Imposta i limiti (opzionale)

**Funzionalità:**
- 8 categorie: carne, pesce, uova, latticini, legumi, cereali, frutta, verdura
- Input numerici per quantità settimanali/giornaliere
- Badge "opzionali" per chiarire che si può saltare
- Nessuna validazione richiesta

**Interazioni:**
- Input numerico: salva automaticamente in `weeklyLimits`
- "← Indietro": torna allo step 1
- "Salta limiti": passa direttamente allo step 3
- "Avanti →": passa allo step 3

### Step 3: Riepilogo finale

**Funzionalità:**
- Conta totale alimenti inseriti
- Card per ogni pasto con ingredienti
- Pasti vuoti mostrati in grigio
- Box riepilogo limiti (se settati)
- Messaggio di congratulazioni

**Interazioni:**
- "← Indietro": torna allo step 2
- "💾 Salva e inizia!": completa onboarding

## Progress Indicator

3 dots orizzontali:
- **Grigio**: step non ancora raggiunto
- **Verde pieno**: step attivo
- **Verde chiaro**: step completato

Animazione pulsante su step attivo.

## Modifiche Tecniche

### JavaScript (`onboarding.js`)

**Nuove variabili:**
```javascript
var _obCurrentStep = 1;  // Step corrente (1-3)
```

**Nuove funzioni:**
- `_renderObStep()`: router per step corrente
- `_updateObHeader()`: aggiorna titolo/sottotitolo per step
- `_updateObProgress()`: renderizza dots di progresso
- `_renderStep1Meals()`: contenuto step 1
- `_renderStep2Limits()`: contenuto step 2
- `_renderStep3Review()`: contenuto step 3 (riepilogo)
- `_updateObFooter()`: aggiorna pulsanti footer per step
- `obNextStep()`: avanza di 1 step
- `obPrevStep()`: torna indietro di 1 step
- `obSkipLimits()`: salta direttamente a step 3

### CSS (`components.css`)

**Nuove classi:**
- `.wizard-progress`: container dots
- `.wizard-progress-dot`: singolo dot
- `.wizard-progress-dot.active`: dot step attivo
- `.wiz-review-intro`: testo introduzione review
- `.wiz-review-meal`: card pasto nel review
- `.wiz-review-meal-header`: header card con nome + count
- `.wiz-review-count`: badge conteggio ingredienti
- `.wiz-review-ings`: wrapper chips ingredienti
- `.wiz-review-ing-chip`: singolo chip ingrediente

**Animazioni:**
- `fadeSlideIn`: transizione smooth tra step
- Dot pulsante con scale e shadow su attivo

## Validazioni

### Step 1
- **Blocco:** Pulsante "Avanti" disabilitato se nessun alimento inserito
- **Warning:** Box giallo "Aggiungi almeno un alimento"

### Step 2
- **Nessuna validazione**: si può procedere senza impostare limiti

### Step 3
- **Solo review**: nessuna modifica possibile, solo "Indietro" o "Salva"

## Compatibilità

### Backwards Compatibility
- Onboarding esistente già completato: non mostrato
- Piano già popolato: skip automatico
- LocalStorage key invariata: `nutriplan_onboarding_done`

### Dati Salvati
- `pianoAlimentare`: struttura invariata
- `weeklyLimits`: struttura invariata
- Auto-categorizzazione ingredienti tramite `_getCategoryForIngredient()`

## Testing

### Test Manuali

1. **Primo avvio (nessun dato)**
   ```
   localStorage.removeItem('nutriplan_onboarding_done');
   localStorage.removeItem('nutriplan');
   location.reload();
   ```
   - Aspettativa: onboarding mostrato

2. **Navigazione completa**
   - Step 1: aggiungi alimenti, prova tutti i tab
   - Step 2: imposta alcuni limiti
   - Step 3: verifica riepilogo corretto
   - Salva: verifica piano salvato

3. **Navigazione indietro**
   - Avanza a step 2, torna indietro
   - Verifica alimenti preservati
   - Avanza a step 3, torna a step 2
   - Verifica limiti preservati

4. **Skip e validazioni**
   - Step 1: prova "Avanti" senza alimenti (disabilitato)
   - Step 1: click "Salta per ora" (conferma richiesta)
   - Step 2: click "Salta limiti" (va a step 3)

5. **Mobile responsive**
   - Verifica layout su 320px width
   - Footer con pulsanti verticali
   - Tabs scrollabili orizzontalmente

### Test Edge Cases

1. **Piano già esistente**
   ```javascript
   localStorage.setItem('nutriplan', JSON.stringify({
     colazione: {'🥛 Latticini': [{name:'Latte'}]}
   }));
   ```
   - Aspettativa: onboarding skipped

2. **Alimenti con caratteri speciali**
   - Input: `Burro d'arachidi`, `Pane casarèccio`
   - Aspettativa: gestiti correttamente

3. **Limiti decimali**
   - Input: `2.5` per cereali
   - Aspettativa: salvato come numero

## Screenshot

### Step 1 - Pasti
![Step 1](docs/onboarding-step1.png)

### Step 2 - Limiti
![Step 2](docs/onboarding-step2.png)

### Step 3 - Review
![Step 3](docs/onboarding-step3.png)

## Performance

- **Render Step 1-2**: ~30ms
- **Render Step 3 (review)**: ~50ms (dipende da # alimenti)
- **Transizione step**: 300ms (animazione CSS)

## Accessibilità

### Attuale
- Focus visibile su input e pulsanti
- Contrast ratio: AA compliant

### Da Implementare (Future)
- Label ARIA per progress dots
- Annunci screen reader su cambio step
- Keyboard navigation tra tabs

## Metriche Onboarding

### Tracking Suggerito
```javascript
// Step completions
trackEvent('onboarding_step1_complete', {items_count: totalItems});
trackEvent('onboarding_step2_complete', {limits_set: limitsCount});
trackEvent('onboarding_complete', {total_items: totalItems});

// Abandonment
trackEvent('onboarding_skipped', {at_step: currentStep});
```

## Roadmap Future

- [ ] Salvataggio bozza progressiva
- [ ] Suggerimenti AI per pasti
- [ ] Import da template predefiniti
- [ ] Preview piano in tempo reale
- [ ] Gamification (badge per completamento)

---

**Autore**: Andrea D'Angelo  
**Data**: 24 Febbraio 2026  
**Versione**: 1.0.0
