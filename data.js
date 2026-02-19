/* ============================================================
   DATA.JS — ingredienti, piano, ricette, limiti, conversioni
   Piano alimentare: Claudia Manicone (vale fino al 02/05/2026)
   ============================================================ */

/* ============================================================
   CATEGORIE
   ============================================================ */
var CATEGORIES = [
  '🥩 Carne e Pesce',
  '🥛 Latticini e Uova',
  '🌾 Cereali e Legumi',
  '🥦 Verdure',
  '🍎 Frutta',
  '🥑 Grassi e Condimenti',
  '🍫 Dolci e Snack',
  '🧂 Cucina'
];

/* ============================================================
   INGREDIENTI DEFAULT (da piano alimentare PDF)
   ============================================================ */
var defaultIngredients = [

  /* ---- 🌾 CEREALI E LEGUMI ---- */
  { name: 'Pasta integrale',             category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🍝' },
  { name: 'Riso integrale',              category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🍚' },
  { name: 'Couscous integrale',          category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🌾' },
  { name: 'Pane integrale',              category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🍞' },
  { name: 'Fiocchi di avena',            category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🌾' },
  { name: 'Farina di avena',             category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🌾' },
  { name: 'Gnocchi di patate',           category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🥟' },
  { name: 'Piadina integrale',           category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🫓' },
  { name: 'Wasa',                        category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🍘' },
  { name: 'Gallette di riso',            category: '🌾 Cereali e Legumi', unit: 'pz', icon: '🍘' },
  { name: 'Crackers integrali',          category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🍘' },
  { name: 'Muesli',                      category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🌾' },
  { name: 'Farro soffiato',              category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🌾' },
  { name: 'Riso soffiato',               category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🌾' },
  { name: 'Barretta ai cereali',         category: '🌾 Cereali e Legumi', unit: 'pz', icon: '🍫' },
  { name: 'Patate',                      category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🥔' },
  { name: 'Patate dolci',                category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🍠' },
  { name: 'Purè di patate in fiocchi',   category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🥔' },
  { name: 'Ceci in scatola',             category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🫘' },
  { name: 'Fagioli in scatola',          category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🫘' },
  { name: 'Lenticchie in scatola',       category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🫘' },
  { name: 'Piselli in scatola',          category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🫛' },
  { name: 'Hummus',                      category: '🌾 Cereali e Legumi', unit: 'g',  icon: '🫘' },

  /* ---- 🥩 CARNE E PESCE ---- */
  { name: 'Straccetti di pollo',         category: '🥩 Carne e Pesce', unit: 'g', icon: '🍗' },
  { name: 'Petto di pollo',              category: '🥩 Carne e Pesce', unit: 'g', icon: '🍗' },
  { name: 'Tacchino',                    category: '🥩 Carne e Pesce', unit: 'g', icon: '🍗' },
  { name: 'Coniglio',                    category: '🥩 Carne e Pesce', unit: 'g', icon: '🥩' },
  { name: 'Carne rossa magra',           category: '🥩 Carne e Pesce', unit: 'g', icon: '🥩' },
  { name: 'Vitello',                     category: '🥩 Carne e Pesce', unit: 'g', icon: '🥩' },
  { name: 'Manzo magro',                 category: '🥩 Carne e Pesce', unit: 'g', icon: '🥩' },
  { name: 'Bresaola',                    category: '🥩 Carne e Pesce', unit: 'g', icon: '🥩' },
  { name: 'Fesa di tacchino',            category: '🥩 Carne e Pesce', unit: 'g', icon: '🍗' },
  { name: 'Prosciutto cotto',            category: '🥩 Carne e Pesce', unit: 'g', icon: '🥩' },
  { name: 'Prosciutto crudo',            category: '🥩 Carne e Pesce', unit: 'g', icon: '🥩' },
  { name: 'Merluzzo',                    category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Nasello',                     category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Spigola',                     category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Branzino',                    category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Salmone',                     category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Orata',                       category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Tonno fresco',                category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Pesce spada',                 category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Calamari',                    category: '🥩 Carne e Pesce', unit: 'g', icon: '🦑' },
  { name: 'Polpo',                       category: '🥩 Carne e Pesce', unit: 'g', icon: '🐙' },
  { name: 'Seppie',                      category: '🥩 Carne e Pesce', unit: 'g', icon: '🦑' },
  { name: 'Tonno al naturale',           category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Salmone affumicato',          category: '🥩 Carne e Pesce', unit: 'g', icon: '🐟' },
  { name: 'Tofu',                        category: '🥩 Carne e Pesce', unit: 'g', icon: '🧊' },

  /* ---- 🥛 LATTICINI E UOVA ---- */
  { name: 'Latte parzialmente scremato', category: '🥛 Latticini e Uova', unit: 'ml', icon: '🥛' },
  { name: 'Latte senza lattosio',        category: '🥛 Latticini e Uova', unit: 'ml', icon: '🥛' },
  { name: 'Yogurt greco 0%',             category: '🥛 Latticini e Uova', unit: 'g',  icon: '🥛' },
  { name: 'Skyr bianco',                 category: '🥛 Latticini e Uova', unit: 'g',  icon: '🥛' },
  { name: 'Kefir bianco',                category: '🥛 Latticini e Uova', unit: 'ml', icon: '🥛' },
  { name: 'Actimel 0%',                  category: '🥛 Latticini e Uova', unit: 'ml', icon: '🥛' },
  { name: 'Formaggio fresco light',      category: '🥛 Latticini e Uova', unit: 'g',  icon: '🧀' },
  { name: 'Grana Padano',                category: '🥛 Latticini e Uova', unit: 'g',  icon: '🧀' },
  { name: 'Parmigiano',                  category: '🥛 Latticini e Uova', unit: 'g',  icon: '🧀' },
  { name: 'Ricotta vaccina',             category: '🥛 Latticini e Uova', unit: 'g',  icon: '🧀' },
  { name: 'Formaggio spalmabile light',  category: '🥛 Latticini e Uova', unit: 'g',  icon: '🧀' },
  { name: 'Uova',                        category: '🥛 Latticini e Uova', unit: 'pz', icon: '🥚' },

  /* ---- 🥦 VERDURE ---- */
  { name: 'Verdure miste',               category: '🥦 Verdure', unit: 'g', icon: '🥦' },
  { name: 'Lattuga',                     category: '🥦 Verdure', unit: 'g', icon: '🥬' },
  { name: 'Zucchine',                    category: '🥦 Verdure', unit: 'g', icon: '🥒' },
  { name: 'Pomodori',                    category: '🥦 Verdure', unit: 'g', icon: '🍅' },
  { name: 'Pomodorini',                  category: '🥦 Verdure', unit: 'g', icon: '🍅' },
  { name: 'Peperoni',                    category: '🥦 Verdure', unit: 'g', icon: '🫑' },
  { name: 'Carote',                      category: '🥦 Verdure', unit: 'g', icon: '🥕' },
  { name: 'Spinaci',                     category: '🥦 Verdure', unit: 'g', icon: '🥬' },
  { name: 'Broccoli',                    category: '🥦 Verdure', unit: 'g', icon: '🥦' },
  { name: 'Fagiolini',                   category: '🥦 Verdure', unit: 'g', icon: '🫛' },
  { name: 'Melanzane',                   category: '🥦 Verdure', unit: 'g', icon: '🍆' },
  { name: 'Cipolla',                     category: '🥦 Verdure', unit: 'g', icon: '🧅' },
  { name: 'Aglio',                       category: '🥦 Verdure', unit: 'g', icon: '🧄' },
  { name: 'Cetrioli',                    category: '🥦 Verdure', unit: 'g', icon: '🥒' },
  { name: 'Radicchio',                   category: '🥦 Verdure', unit: 'g', icon: '🥬' },
  { name: 'Finocchio',                   category: '🥦 Verdure', unit: 'g', icon: '🌿' },
  { name: 'Asparagi',                    category: '🥦 Verdure', unit: 'g', icon: '🌿' },
  { name: 'Insalata mista',              category: '🥦 Verdure', unit: 'g', icon: '🥗' },

  /* ---- 🍎 FRUTTA ---- */
  { name: 'Frutta fresca',               category: '🍎 Frutta', unit: 'pz', icon: '🍎' },
  { name: 'Banana',                      category: '🍎 Frutta', unit: 'pz', icon: '🍌' },
  { name: 'Mela',                        category: '🍎 Frutta', unit: 'pz', icon: '🍎' },
  { name: 'Pera',                        category: '🍎 Frutta', unit: 'pz', icon: '🍐' },
  { name: 'Arancia',                     category: '🍎 Frutta', unit: 'pz', icon: '🍊' },
  { name: 'Kiwi',                        category: '🍎 Frutta', unit: 'pz', icon: '🥝' },
  { name: 'Fragole',                     category: '🍎 Frutta', unit: 'g',  icon: '🍓' },
  { name: 'Frutta secca a guscio',       category: '🍎 Frutta', unit: 'g',  icon: '🥜' },
  { name: 'Mandorle',                    category: '🍎 Frutta', unit: 'g',  icon: '🥜' },
  { name: 'Noci',                        category: '🍎 Frutta', unit: 'g',  icon: '🥜' },
  { name: 'Pistacchi',                   category: '🍎 Frutta', unit: 'g',  icon: '🥜' },
  { name: 'Crema di frutta secca 100%',  category: '🍎 Frutta', unit: 'g',  icon: '🥜' },

  /* ---- 🥑 GRASSI E CONDIMENTI ---- */
  { name: 'Olio EVO',                    category: '🥑 Grassi e Condimenti', unit: 'ml', icon: '🫒' },
  { name: 'Avocado',                     category: '🥑 Grassi e Condimenti', unit: 'g',  icon: '🥑' },
  { name: 'Pesto di basilico',           category: '🥑 Grassi e Condimenti', unit: 'g',  icon: '🌿' },
  { name: 'Olive in salamoia',           category: '🥑 Grassi e Condimenti', unit: 'g',  icon: '🫒' },
  { name: 'Miele',                       category: '🥑 Grassi e Condimenti', unit: 'g',  icon: '🍯' },
  { name: 'Marmellata',                  category: '🥑 Grassi e Condimenti', unit: 'g',  icon: '🍓' },
  { name: 'Nocciolata',                  category: '🥑 Grassi e Condimenti', unit: 'g',  icon: '🍫' },
  { name: 'Limone',                      category: '🥑 Grassi e Condimenti', unit: 'pz', icon: '🍋' },
  { name: 'Aceto',                       category: '🥑 Grassi e Condimenti', unit: 'ml', icon: '🧂' },

  /* ---- 🍫 DOLCI E SNACK ---- */
  { name: 'Cioccolato fondente',         category: '🍫 Dolci e Snack', unit: 'g',  icon: '🍫' },
  { name: 'Cacao amaro',                 category: '🍫 Dolci e Snack', unit: 'g',  icon: '🍫' },
  { name: 'Biscotti',                    category: '🍫 Dolci e Snack', unit: 'g',  icon: '🍪' },
  { name: 'Cornetto ripieno',            category: '🍫 Dolci e Snack', unit: 'pz', icon: '🥐' },
  { name: 'Budino proteico',             category: '🍫 Dolci e Snack', unit: 'pz', icon: '🍮' },
  { name: 'Cocco rapè',                  category: '🍫 Dolci e Snack', unit: 'g',  icon: '🥥' },

  /* ---- 🧂 CUCINA ---- */
  { name: 'Sale integrale',              category: '🧂 Cucina', unit: 'g',  icon: '🧂' },
  { name: 'Pepe nero',                   category: '🧂 Cucina', unit: 'g',  icon: '🧂' },
  { name: 'Curcuma',                     category: '🧂 Cucina', unit: 'g',  icon: '🧂' },
  { name: 'Paprika',                     category: '🧂 Cucina', unit: 'g',  icon: '🧂' },
  { name: 'Origano',                     category: '🧂 Cucina', unit: 'g',  icon: '🌿' },
  { name: 'Rosmarino',                   category: '🧂 Cucina', unit: 'g',  icon: '🌿' },
  { name: 'Basilico fresco',             category: '🧂 Cucina', unit: 'g',  icon: '🌿' },
  { name: 'Prezzemolo',                  category: '🧂 Cucina', unit: 'g',  icon: '🌿' }
];

/* ============================================================
   PIANO ALIMENTARE DEFAULT (turno mattina — Lunedì)
   Fonte: piano_alimentare PDF, Dott.ssa Rumeni
   ============================================================ */
var defaultMealPlan = {
  colazione: {
    principale: [
      { name: 'Pane integrale',            quantity: 50,  unit: 'g'  },
      { name: 'Crema di frutta secca 100%', quantity: 15, unit: 'g'  }
    ],
    contorno: [],
    frutta:    [],
    extra: [
      { name: 'Latte parzialmente scremato', quantity: 150, unit: 'ml' },
      { name: 'Marmellata',                  quantity: 15,  unit: 'g'  }
    ]
  },
  spuntino: {
    principale: [
      { name: 'Frutta fresca', quantity: 1, unit: 'pz' }
    ],
    contorno: [],
    frutta:   [],
    extra:    []
  },
  pranzo: {
    principale: [
      { name: 'Pasta integrale',     quantity: 70,  unit: 'g' },
      { name: 'Straccetti di pollo', quantity: 130, unit: 'g' }
    ],
    contorno: [
      { name: 'Verdure miste',       quantity: 200, unit: 'g' }
    ],
    frutta: [],
    extra: [
      { name: 'Olio EVO',            quantity: 10,  unit: 'ml' }
    ]
  },
  merenda: {
    principale: [
      { name: 'Skyr bianco',         quantity: 100, unit: 'g' }
    ],
    contorno: [],
    frutta:   [],
    extra: [
      { name: 'Cioccolato fondente', quantity: 10,  unit: 'g' }
    ]
  },
  cena: {
    principale: [
      { name: 'Pane integrale',      quantity: 60,  unit: 'g' },
      { name: 'Merluzzo',            quantity: 150, unit: 'g' }
    ],
    contorno: [
      { name: 'Verdure miste',       quantity: 200, unit: 'g' }
    ],
    frutta: [],
    extra: [
      { name: 'Olio EVO',            quantity: 10,  unit: 'ml' }
    ]
  }
};

/* ============================================================
   RICETTE DEFAULT (integrate dagli ingredienti del piano)
   ============================================================ */
var defaultRecipes = [
  {
    id: 'r001', icon: '🍝', name: 'Pasta integrale al tonno',
    pasto: ['pranzo', 'cena'],
    ingredienti: [
      { name: 'Pasta integrale',  quantity: 70,  unit: 'g'  },
      { name: 'Tonno al naturale', quantity: 100, unit: 'g' },
      { name: 'Pomodorini',       quantity: 100, unit: 'g'  },
      { name: 'Olio EVO',         quantity: 10,  unit: 'ml' },
      { name: 'Basilico fresco',  quantity: 5,   unit: 'g'  }
    ],
    preparazione: 'Cuoci la pasta. Scola il tonno e mescola con pomodorini tagliati. Condisci con olio e basilico.'
  },
  {
    id: 'r002', icon: '🍝', name: 'Pasta integrale al pesto',
    pasto: ['pranzo'],
    ingredienti: [
      { name: 'Pasta integrale',   quantity: 70, unit: 'g'  },
      { name: 'Pesto di basilico', quantity: 20, unit: 'g'  },
      { name: 'Pomodorini',        quantity: 80, unit: 'g'  },
      { name: 'Grana Padano',      quantity: 15, unit: 'g'  }
    ],
    preparazione: 'Cuoci la pasta al dente. Condisci con pesto, pomodorini freschi e una spolverata di grana.'
  },
  {
    id: 'r003', icon: '🫘', name: 'Pasta e ceci',
    pasto: ['pranzo', 'cena'],
    ingredienti: [
      { name: 'Pasta integrale',  quantity: 60,  unit: 'g'  },
      { name: 'Ceci in scatola',  quantity: 150, unit: 'g'  },
      { name: 'Pomodorini',       quantity: 80,  unit: 'g'  },
      { name: 'Olio EVO',         quantity: 10,  unit: 'ml' },
      { name: 'Rosmarino',        quantity: 3,   unit: 'g'  }
    ],
    preparazione: 'Soffriggi aglio in olio, aggiungi ceci e pomodorini, cuoci 10 min. Aggiungi pasta cotta e rosmarino.'
  },
  {
    id: 'r004', icon: '🍗', name: 'Pollo alla piastra con verdure',
    pasto: ['pranzo', 'cena'],
    ingredienti: [
      { name: 'Petto di pollo',  quantity: 130, unit: 'g'  },
      { name: 'Zucchine',        quantity: 150, unit: 'g'  },
      { name: 'Pomodorini',      quantity: 100, unit: 'g'  },
      { name: 'Olio EVO',        quantity: 10,  unit: 'ml' },
      { name: 'Origano',         quantity: 2,   unit: 'g'  }
    ],
    preparazione: 'Griglia il pollo 5 min per lato. Rosolate zucchine e pomodorini in padella con olio e origano.'
  },
  {
    id: 'r005', icon: '🐟', name: 'Merluzzo al forno con patate',
    pasto: ['cena'],
    ingredienti: [
      { name: 'Merluzzo',        quantity: 150, unit: 'g'  },
      { name: 'Patate',          quantity: 200, unit: 'g'  },
      { name: 'Olio EVO',        quantity: 10,  unit: 'ml' },
      { name: 'Rosmarino',       quantity: 3,   unit: 'g'  },
      { name: 'Limone',          quantity: 1,   unit: 'pz' }
    ],
    preparazione: 'Taglia le patate a cubetti, condisci con olio e rosmarino. Inforna a 200° per 20 min. Aggiungi il merluzzo e cuoci altri 15 min con limone.'
  },
  {
    id: 'r006', icon: '🐟', name: 'Salmone con insalata di avocado',
    pasto: ['pranzo', 'cena'],
    ingredienti: [
      { name: 'Salmone',         quantity: 120, unit: 'g'  },
      { name: 'Avocado',         quantity: 50,  unit: 'g'  },
      { name: 'Lattuga',         quantity: 80,  unit: 'g'  },
      { name: 'Pomodorini',      quantity: 80,  unit: 'g'  },
      { name: 'Olio EVO',        quantity: 10,  unit: 'ml' },
      { name: 'Limone',          quantity: 1,   unit: 'pz' }
    ],
    preparazione: 'Cuoci il salmone in padella 4 min per lato. Prepara insalata con avocado, lattuga e pomodorini. Condisci con olio e limone.'
  },
  {
    id: 'r007', icon: '🥚', name: 'Uova strapazzate con spinaci',
    pasto: ['pranzo', 'cena'],
    ingredienti: [
      { name: 'Uova',            quantity: 2,   unit: 'pz'  },
      { name: 'Spinaci',         quantity: 150, unit: 'g'   },
      { name: 'Olio EVO',        quantity: 5,   unit: 'ml'  },
      { name: 'Parmigiano',      quantity: 15,  unit: 'g'   }
    ],
    preparazione: 'Saltare gli spinaci in padella con olio. Aggiungi le uova sbattute e mescola fino a cottura. Finisci con parmigiano.'
  },
  {
    id: 'r008', icon: '🥗', name: 'Insalata di pollo e verdure',
    pasto: ['pranzo'],
    ingredienti: [
      { name: 'Straccetti di pollo', quantity: 130, unit: 'g'  },
      { name: 'Lattuga',             quantity: 80,  unit: 'g'  },
      { name: 'Pomodorini',          quantity: 80,  unit: 'g'  },
      { name: 'Cetrioli',            quantity: 80,  unit: 'g'  },
      { name: 'Olio EVO',            quantity: 10,  unit: 'ml' }
    ],
    preparazione: 'Griglia il pollo e taglialo a striscioline. Componi l\'insalata con lattuga, pomodorini e cetrioli. Aggiungi il pollo e condisci con olio e limone.'
  },
  {
    id: 'r009', icon: '🫓', name: 'Piadina integrale con bresaola e avocado',
    pasto: ['pranzo'],
    ingredienti: [
      { name: 'Piadina integrale',  quantity: 75, unit: 'g'  },
      { name: 'Bresaola',           quantity: 80, unit: 'g'  },
      { name: 'Avocado',            quantity: 50, unit: 'g'  },
      { name: 'Lattuga',            quantity: 40, unit: 'g'  },
      { name: 'Limone',             quantity: 1,  unit: 'pz' }
    ],
    preparazione: 'Scalda la piadina in padella. Spalma l\'avocado schiacciato con succo di limone. Farcisci con bresaola e lattuga.'
  },
  {
    id: 'r010', icon: '🍚', name: 'Riso integrale con verdure e tofu',
    pasto: ['pranzo', 'cena'],
    ingredienti: [
      { name: 'Riso integrale',     quantity: 70,  unit: 'g'  },
      { name: 'Tofu',               quantity: 100, unit: 'g'  },
      { name: 'Peperoni',           quantity: 100, unit: 'g'  },
      { name: 'Zucchine',           quantity: 100, unit: 'g'  },
      { name: 'Olio EVO',           quantity: 10,  unit: 'ml' },
      { name: 'Salsa di soia',      quantity: 10,  unit: 'ml' }
    ],
    preparazione: 'Cuoci il riso. Saltate le verdure con il tofu a cubetti. Condisci con salsa di soia e servi sul riso.'
  },
  {
    id: 'r011', icon: '🐙', name: 'Polpo con patate e olive',
    pasto: ['cena'],
    ingredienti: [
      { name: 'Polpo',              quantity: 200, unit: 'g'  },
      { name: 'Patate',             quantity: 150, unit: 'g'  },
      { name: 'Olive in salamoia',  quantity: 20,  unit: 'g'  },
      { name: 'Olio EVO',           quantity: 10,  unit: 'ml' },
      { name: 'Prezzemolo',         quantity: 5,   unit: 'g'  }
    ],
    preparazione: 'Lesci il polpo 40 min, taglia a pezzi. Lessa le patate a cubetti. Mescola con olive, prezzemolo e olio a crudo.'
  },
  {
    id: 'r012', icon: '🥣', name: 'Porridge avena con frutta',
    pasto: ['colazione'],
    ingredienti: [
      { name: 'Fiocchi di avena',           quantity: 30,  unit: 'g'  },
      { name: 'Latte parzialmente scremato', quantity: 150, unit: 'ml' },
      { name: 'Banana',                     quantity: 1,   unit: 'pz' },
      { name: 'Miele',                      quantity: 5,   unit: 'g'  },
      { name: 'Frutta secca a guscio',      quantity: 10,  unit: 'g'  }
    ],
    preparazione: 'Cuoci i fiocchi di avena nel latte per 3-4 min mescolando. Topping: banana a rondelle, miele e frutta secca.'
  },
  {
    id: 'r013', icon: '🥛', name: 'Yogurt greco con cacao e frutta secca',
    pasto: ['colazione', 'merenda'],
    ingredienti: [
      { name: 'Yogurt greco 0%',    quantity: 150, unit: 'g' },
      { name: 'Cacao amaro',        quantity: 5,   unit: 'g' },
      { name: 'Frutta secca a guscio', quantity: 10, unit: 'g' }
    ],
    preparazione: 'Mescola lo yogurt con il cacao amaro. Guarnisci con frutta secca a piacere.'
  },
  {
    id: 'r014', icon: '🦑', name: 'Calamari alla griglia con verdure',
    pasto: ['cena'],
    ingredienti: [
      { name: 'Calamari',           quantity: 200, unit: 'g'  },
      { name: 'Zucchine',           quantity: 150, unit: 'g'  },
      { name: 'Olio EVO',           quantity: 10,  unit: 'ml' },
      { name: 'Prezzemolo',         quantity: 5,   unit: 'g'  },
      { name: 'Limone',             quantity: 1,   unit: 'pz' }
    ],
    preparazione: 'Pulisci i calamari e grigliali 3-4 min per lato. Griglia anche le zucchine. Condisci con olio, prezzemolo e limone.'
  },
  {
    id: 'r015', icon: '🥬', name: 'Insalata di lenticchie e verdure',
    pasto: ['pranzo'],
    ingredienti: [
      { name: 'Lenticchie in scatola', quantity: 150, unit: 'g' },
      { name: 'Pomodorini',            quantity: 80,  unit: 'g' },
      { name: 'Cetrioli',              quantity: 80,  unit: 'g' },
      { name: 'Cipolla',               quantity: 30,  unit: 'g' },
      { name: 'Olio EVO',              quantity: 10,  unit: 'ml' }
    ],
    preparazione: 'Scola le lenticchie. Unisci pomodorini, cetrioli e cipolla tritata. Condisci con olio, sale e limone.'
  }
];

/* ============================================================
   LIMITI SETTIMANALI
   (da linee guida Dott.ssa Rumeni)
   ============================================================ */
var weeklyLimits = {
  'Carne rossa': {
    max: 1, current: 0, unit: 'volte/sett.',
    icon: '🥩',
    keywords: ['carne rossa', 'vitello', 'manzo', 'maiale', 'carne rossa magra']
  },
  'Pesce': {
    max: 4, current: 0, unit: 'volte/sett.',
    icon: '🐟',
    keywords: ['merluzzo', 'nasello', 'spigola', 'branzino', 'salmone', 'orata', 'tonno fresco', 'pesce spada', 'calamari', 'polpo', 'seppie', 'tonno al naturale', 'salmone affumicato']
  },
  'Uova': {
    max: 4, current: 0, unit: 'volte/sett.',
    icon: '🥚',
    keywords: ['uova', 'uovo']
  },
  'Affettati': {
    max: 1, current: 0, unit: 'volte/sett.',
    icon: '🥩',
    keywords: ['bresaola', 'prosciutto cotto', 'prosciutto crudo', 'fesa di tacchino', 'affettato']
  },
  'Dolci': {
    max: 3, current: 0, unit: 'volte/sett.',
    icon: '🍫',
    keywords: ['biscotti', 'cornetto', 'budino', 'barretta ai cereali']
  }
};

/* ============================================================
   CONVERSIONI UNITÀ
   ============================================================ */
var unitConversions = {
  kg:  { g: 1000 },
  g:   { kg: 0.001 },
  l:   { ml: 1000 },
  ml:  { l: 0.001 }
};
