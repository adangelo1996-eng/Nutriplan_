# Casa Scene — React Three Fiber

Scena 3D per la pagina Casa di NutriPlan: cucina italiana low-poly, illuminazione dinamica (CET), etichetta fluttuante con suggerimento pasto.

## Sviluppo

```bash
npm install
npm run build
```

La build produce `dist/casa-scene.iife.js` caricato dall'app principale.  
Senza build, l'app usa il fallback HTML.

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

## Deploy

Il workflow GitHub Actions (`.github/workflows/build.yml`) esegue automaticamente `npm ci && npm run build` a ogni push su `main`; l’artefatto `dist/` è disponibile negli Artifacts della run.
