# Casa Scene — React Three Fiber

Scena 3D per la pagina Casa di NutriPlan: cucina italiana low-poly, illuminazione dinamica (CET), etichetta fluttuante con suggerimento pasto.

## Sviluppo

```bash
npm install
npm run build
```

La build produce `dist/casa-scene.iife.js` caricato dall'app principale.  
Senza build, l'app usa il fallback HTML.

## Test in locale

Dalla **root del progetto** (non da `casa-scene`):

```bash
npm start
```

Poi apri http://localhost:3000 e vai alla scheda Casa. Evita di aprire `index.html` con `file://` (i path potrebbero non funzionare).

## Pubblicare su GitHub

1. **Crea un nuovo repository su GitHub** (es. `casa-scene` o `nutriplan-casa-scene`), senza README/gitignore (sono già in cartella).

2. **Dalla cartella `casa-scene`** esegui:

```bash
cd casa-scene
git init
git add .
git commit -m "Initial commit: Casa Scene R3F"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/TUO-REPO.git
git push -u origin main
```

Sostituisci `TUO-USERNAME` e `TUO-REPO` con utente e nome del repository.

## Cosa caricare su GitHub (per la casa 3D online)

Per vedere la scena 3D sul sito pubblicato, sul repo devono esserci:

- **`casa-scene/dist/casa-scene.iife.js`** (file generato con `npm run build` in questa cartella)
- **`casa.js`** (nella root del progetto, aggiornato con il fallback per la scena)

Se la cartella `casa-scene` è già sul repo ma manca `dist/`, carica almeno il file `casa-scene/dist/casa-scene.iife.js`.

## Deploy

Il workflow GitHub Actions (`.github/workflows/build.yml`) esegue automaticamente `npm ci && npm run build` a ogni push su `main`; l’artefatto `dist/` è disponibile negli Artifacts della run.
