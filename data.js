/* ============================================================
   DATA.JS — ingredienti, piano, ricette, limiti
   ============================================================ */

/* ── CATEGORIE ── */
var CATEGORIES = [
  '🥩 Carne','🐟 Pesce','🥛 Latticini e Uova','🌾 Cereali e Legumi',
  '🥦 Verdure','🍎 Frutta','🥑 Grassi e Condimenti',
  '🍫 Dolci e Snack','🧂 Cucina',
  '🥩 Carne e Pesce' /* compatibilità dati precedenti */
];

/* ============================================================
   INGREDIENTI DEFAULT
   ============================================================ */
var defaultIngredients = [
  /* ── 🌾 CEREALI E LEGUMI ── */
  { name:'Pasta integrale',          category:'🌾 Cereali e Legumi', unit:'g',  icon:'🍝' },
  { name:'Riso integrale',           category:'🌾 Cereali e Legumi', unit:'g',  icon:'🍚' },
  { name:'Couscous integrale',       category:'🌾 Cereali e Legumi', unit:'g',  icon:'🌾' },
  { name:'Pane integrale',           category:'🌾 Cereali e Legumi', unit:'g',  icon:'🍞' },
  { name:'Fiocchi di avena',         category:'🌾 Cereali e Legumi', unit:'g',  icon:'🌾' },
  { name:'Farina di avena',          category:'🌾 Cereali e Legumi', unit:'g',  icon:'🌾' },
  { name:'Gnocchi di patate',        category:'🌾 Cereali e Legumi', unit:'g',  icon:'🥟' },
  { name:'Piadina integrale',        category:'🌾 Cereali e Legumi', unit:'g',  icon:'🫓' },
  { name:'Wasa',                     category:'🌾 Cereali e Legumi', unit:'g',  icon:'🍘' },
  { name:'Gallette di riso',         category:'🌾 Cereali e Legumi', unit:'pz', icon:'🍘' },
  { name:'Crackers integrali',       category:'🌾 Cereali e Legumi', unit:'g',  icon:'🍘' },
  { name:'Muesli',                   category:'🌾 Cereali e Legumi', unit:'g',  icon:'🌾' },
  { name:'Farro soffiato',           category:'🌾 Cereali e Legumi', unit:'g',  icon:'🌾' },
  { name:'Riso soffiato',            category:'🌾 Cereali e Legumi', unit:'g',  icon:'🌾' },
  { name:'Barretta ai cereali',      category:'🌾 Cereali e Legumi', unit:'pz', icon:'🍫' },
  { name:'Patate',                   category:'🌾 Cereali e Legumi', unit:'g',  icon:'🥔' },
  { name:'Patate dolci',             category:'🌾 Cereali e Legumi', unit:'g',  icon:'🍠' },
  { name:'Purè di patate in fiocchi',category:'🌾 Cereali e Legumi', unit:'g',  icon:'🥔' },
  { name:'Ceci in scatola',          category:'🌾 Cereali e Legumi', unit:'g',  icon:'🫘' },
  { name:'Fagioli in scatola',       category:'🌾 Cereali e Legumi', unit:'g',  icon:'🫘' },
  { name:'Lenticchie in scatola',    category:'🌾 Cereali e Legumi', unit:'g',  icon:'🫘' },
  { name:'Piselli in scatola',       category:'🌾 Cereali e Legumi', unit:'g',  icon:'🫛' },
  { name:'Hummus',                   category:'🌾 Cereali e Legumi', unit:'g',  icon:'🫘' },
  { name:'Farro perlato',            category:'🌾 Cereali e Legumi', unit:'g',  icon:'🌾' },
  /* ── 🥩 CARNE ── */
  { name:'Straccetti di pollo', category:'🥩 Carne', unit:'g', icon:'🍗' },
  { name:'Petto di pollo',      category:'🥩 Carne', unit:'g', icon:'🍗' },
  { name:'Tacchino',            category:'🥩 Carne', unit:'g', icon:'🍗' },
  { name:'Coniglio',            category:'🥩 Carne', unit:'g', icon:'🥩' },
  { name:'Carne rossa magra',   category:'🥩 Carne', unit:'g', icon:'🥩' },
  { name:'Vitello',             category:'🥩 Carne', unit:'g', icon:'🥩' },
  { name:'Manzo magro',         category:'🥩 Carne', unit:'g', icon:'🥩' },
  { name:'Bresaola',            category:'🥩 Carne', unit:'g', icon:'🥩' },
  { name:'Fesa di tacchino',    category:'🥩 Carne', unit:'g', icon:'🍗' },
  { name:'Prosciutto cotto',    category:'🥩 Carne', unit:'g', icon:'🥩' },
  { name:'Prosciutto crudo',    category:'🥩 Carne', unit:'g', icon:'🥩' },
  { name:'Tofu',                category:'🥩 Carne', unit:'g', icon:'🧊' },
  /* ── 🐟 PESCE ── */
  { name:'Merluzzo',            category:'🐟 Pesce', unit:'g', icon:'🐟' },
  { name:'Nasello',             category:'🐟 Pesce', unit:'g', icon:'🐟' },
  { name:'Spigola',             category:'🐟 Pesce', unit:'g', icon:'🐟' },
  { name:'Branzino',            category:'🐟 Pesce', unit:'g', icon:'🐟' },
  { name:'Salmone',             category:'🐟 Pesce', unit:'g', icon:'🐟' },
  { name:'Orata',               category:'🐟 Pesce', unit:'g', icon:'🐟' },
  { name:'Tonno fresco',        category:'🐟 Pesce', unit:'g', icon:'🐟' },
  { name:'Pesce spada',         category:'🐟 Pesce', unit:'g', icon:'🐟' },
  { name:'Calamari',            category:'🐟 Pesce', unit:'g', icon:'🦑' },
  { name:'Polpo',               category:'🐟 Pesce', unit:'g', icon:'🐙' },
  { name:'Seppie',              category:'🐟 Pesce', unit:'g', icon:'🦑' },
  { name:'Tonno al naturale',   category:'🐟 Pesce', unit:'g', icon:'🐟' },
  { name:'Salmone affumicato',  category:'🐟 Pesce', unit:'g', icon:'🐟' },
  /* ── 🥛 LATTICINI E UOVA ── */
  { name:'Latte parzialmente scremato', category:'🥛 Latticini e Uova', unit:'ml', icon:'🥛' },
  { name:'Latte senza lattosio',        category:'🥛 Latticini e Uova', unit:'ml', icon:'🥛' },
  { name:'Yogurt greco 0%',             category:'🥛 Latticini e Uova', unit:'g',  icon:'🥛' },
  { name:'Skyr bianco',                 category:'🥛 Latticini e Uova', unit:'g',  icon:'🥛' },
  { name:'Kefir bianco',                category:'🥛 Latticini e Uova', unit:'ml', icon:'🥛' },
  { name:'Actimel 0%',                  category:'🥛 Latticini e Uova', unit:'ml', icon:'🥛' },
  { name:'Formaggio fresco light',      category:'🥛 Latticini e Uova', unit:'g',  icon:'🧀' },
  { name:'Grana Padano',                category:'🥛 Latticini e Uova', unit:'g',  icon:'🧀' },
  { name:'Parmigiano',                  category:'🥛 Latticini e Uova', unit:'g',  icon:'🧀' },
  { name:'Ricotta vaccina',             category:'🥛 Latticini e Uova', unit:'g',  icon:'🧀' },
  { name:'Formaggio spalmabile light',  category:'🥛 Latticini e Uova', unit:'g',  icon:'🧀' },
  { name:'Uova',                        category:'🥛 Latticini e Uova', unit:'pz', icon:'🥚' },
  /* ── 🥦 VERDURE ── */
  { name:'Verdure miste',  category:'🥦 Verdure', unit:'g', icon:'🥦' },
  { name:'Lattuga',        category:'🥦 Verdure', unit:'g', icon:'🥬' },
  { name:'Zucchine',       category:'🥦 Verdure', unit:'g', icon:'🥒' },
  { name:'Pomodori',       category:'🥦 Verdure', unit:'g', icon:'🍅' },
  { name:'Pomodorini',     category:'🥦 Verdure', unit:'g', icon:'🍅' },
  { name:'Peperoni',       category:'🥦 Verdure', unit:'g', icon:'🫑' },
  { name:'Carote',         category:'🥦 Verdure', unit:'g', icon:'🥕' },
  { name:'Spinaci',        category:'🥦 Verdure', unit:'g', icon:'🥬' },
  { name:'Broccoli',       category:'🥦 Verdure', unit:'g', icon:'🥦' },
  { name:'Fagiolini',      category:'🥦 Verdure', unit:'g', icon:'🫛' },
  { name:'Melanzane',      category:'🥦 Verdure', unit:'g', icon:'🍆' },
  { name:'Cipolla',        category:'🥦 Verdure', unit:'g', icon:'🧅' },
  { name:'Aglio',          category:'🥦 Verdure', unit:'g', icon:'🧄' },
  { name:'Cetrioli',       category:'🥦 Verdure', unit:'g', icon:'🥒' },
  { name:'Radicchio',      category:'🥦 Verdure', unit:'g', icon:'🥬' },
  { name:'Finocchio',      category:'🥦 Verdure', unit:'g', icon:'🌿' },
  { name:'Asparagi',       category:'🥦 Verdure', unit:'g', icon:'🌿' },
  { name:'Insalata mista', category:'🥦 Verdure', unit:'g', icon:'🥗'  },
  /* ── 🍎 FRUTTA ── */
  { name:'Frutta fresca',           category:'🍎 Frutta', unit:'pz', icon:'🍎' },
  { name:'Banana',                  category:'🍎 Frutta', unit:'pz', icon:'🍌' },
  { name:'Mela',                    category:'🍎 Frutta', unit:'pz', icon:'🍎' },
  { name:'Pera',                    category:'🍎 Frutta', unit:'pz', icon:'🍐' },
  { name:'Arancia',                 category:'🍎 Frutta', unit:'pz', icon:'🍊' },
  { name:'Kiwi',                    category:'🍎 Frutta', unit:'pz', icon:'🥝' },
  { name:'Fragole',                 category:'🍎 Frutta', unit:'g',  icon:'🍓' },
  { name:'Frutta secca a guscio',   category:'🍎 Frutta', unit:'g',  icon:'🥜' },
  { name:'Mandorle',                category:'🍎 Frutta', unit:'g',  icon:'🥜' },
  { name:'Noci',                    category:'🍎 Frutta', unit:'g',  icon:'🥜' },
  { name:'Pistacchi',               category:'🍎 Frutta', unit:'g',  icon:'🥜' },
  { name:'Crema di frutta secca 100%', category:'🍎 Frutta', unit:'g', icon:'🥜' },
  /* ── 🥑 GRASSI E CONDIMENTI ── */
  { name:'Olio EVO',       category:'🥑 Grassi e Condimenti', unit:'ml', icon:'🫒' },
  { name:'Avocado',        category:'🥑 Grassi e Condimenti', unit:'g',  icon:'🥑' },
  { name:'Pesto di basilico', category:'🥑 Grassi e Condimenti', unit:'g', icon:'🌿' },
  { name:'Olive in salamoia', category:'🥑 Grassi e Condimenti', unit:'g', icon:'🫒' },
  { name:'Miele',          category:'🥑 Grassi e Condimenti', unit:'g',  icon:'🍯' },
  { name:'Marmellata',     category:'🥑 Grassi e Condimenti', unit:'g',  icon:'🍓' },
  { name:'Nocciolata',     category:'🥑 Grassi e Condimenti', unit:'g',  icon:'🍫' },
  { name:'Limone',         category:'🥑 Grassi e Condimenti', unit:'pz', icon:'🍋' },
  { name:'Aceto',          category:'🥑 Grassi e Condimenti', unit:'ml', icon:'🧂' },
  { name:'Tahini',         category:'🥑 Grassi e Condimenti', unit:'g',  icon:'🫙' },
  /* ── 🍫 DOLCI E SNACK ── */
  { name:'Cioccolato fondente', category:'🍫 Dolci e Snack', unit:'g',  icon:'🍫' },
  { name:'Cacao amaro',         category:'🍫 Dolci e Snack', unit:'g',  icon:'🍫' },
  { name:'Biscotti',            category:'🍫 Dolci e Snack', unit:'g',  icon:'🍪' },
  { name:'Cornetto ripieno',    category:'🍫 Dolci e Snack', unit:'pz', icon:'🥐' },
  { name:'Budino proteico',     category:'🍫 Dolci e Snack', unit:'pz', icon:'🍮' },
  { name:'Cocco rapè',          category:'🍫 Dolci e Snack', unit:'g',  icon:'🥥' },
  /* ── 🧂 CUCINA ── */
  { name:'Sale integrale', category:'🧂 Cucina', unit:'g', icon:'🧂' },
  { name:'Pepe nero',      category:'🧂 Cucina', unit:'g', icon:'🧂' },
  { name:'Curcuma',        category:'🧂 Cucina', unit:'g', icon:'🧂' },
  { name:'Paprika',        category:'🧂 Cucina', unit:'g', icon:'🧂' },
  { name:'Origano',        category:'🧂 Cucina', unit:'g', icon:'🌿' },
  { name:'Rosmarino',      category:'🧂 Cucina', unit:'g', icon:'🌿' },
  { name:'Basilico fresco',category:'🧂 Cucina', unit:'g', icon:'🌿' },
  { name:'Prezzemolo',     category:'🧂 Cucina', unit:'g', icon:'🌿' },
  { name:'Brodo vegetale', category:'🧂 Cucina', unit:'ml',icon:'🫙' },
  { name:'Salsa di soia',  category:'🧂 Cucina', unit:'ml',icon:'🫙' }
];

/* ============================================================
   PIANO ALIMENTARE DEFAULT
   ============================================================ */
var defaultMealPlan = {
  colazione: {
    principale: [
      { name:'Pane integrale',           quantity:50,  unit:'g'  },
      { name:'Crema di frutta secca 100%',quantity:15, unit:'g'  }
    ],
    contorno:[], frutta:[], extra:[
      { name:'Latte parzialmente scremato', quantity:150, unit:'ml' },
      { name:'Marmellata',                  quantity:15,  unit:'g'  }
    ]
  },
  spuntino: {
    principale:[{ name:'Frutta fresca', quantity:1, unit:'pz' }],
    contorno:[], frutta:[], extra:[]
  },
  pranzo: {
    principale:[
      { name:'Pasta integrale',    quantity:70,  unit:'g' },
      { name:'Straccetti di pollo',quantity:130, unit:'g' }
    ],
    contorno:[{ name:'Verdure miste', quantity:200, unit:'g' }],
    frutta:[], extra:[{ name:'Olio EVO', quantity:10, unit:'ml' }]
  },
  merenda: {
    principale:[{ name:'Skyr bianco', quantity:100, unit:'g' }],
    contorno:[], frutta:[],
    extra:[{ name:'Cioccolato fondente', quantity:10, unit:'g' }]
  },
  cena: {
    principale:[
      { name:'Pane integrale', quantity:60,  unit:'g' },
      { name:'Merluzzo',       quantity:150, unit:'g' }
    ],
    contorno:[{ name:'Verdure miste', quantity:200, unit:'g' }],
    frutta:[], extra:[{ name:'Olio EVO', quantity:10, unit:'ml' }]
  }
};

/* ============================================================
   RICETTE — 55 ricette su tutti i pasti
   ============================================================ */
var defaultRecipes = [

  /* ════════════ COLAZIONE (9) ════════════ */
  {
    id:'r001', icon:'🥣', name:'Porridge di avena con banana e miele',
    pasto:['colazione'],
    ingredienti:[
      { name:'Fiocchi di avena',              quantity:40,  unit:'g'  },
      { name:'Latte parzialmente scremato',   quantity:150, unit:'ml' },
      { name:'Banana',                        quantity:1,   unit:'pz' },
      { name:'Miele',                         quantity:10,  unit:'g'  },
      { name:'Frutta secca a guscio',         quantity:10,  unit:'g'  }
    ],
    preparazione:'Cuoci i fiocchi di avena nel latte a fuoco medio per 3-4 minuti mescolando. Versa in una ciotola, aggiungi banana a rondelle, miele e frutta secca.'
  },
  {
    id:'r002', icon:'🥛', name:'Yogurt greco con cacao e frutta secca',
    pasto:['colazione','merenda'],
    ingredienti:[
      { name:'Yogurt greco 0%',      quantity:150, unit:'g' },
      { name:'Cacao amaro',          quantity:5,   unit:'g' },
      { name:'Frutta secca a guscio',quantity:15,  unit:'g' },
      { name:'Miele',                quantity:5,   unit:'g' }
    ],
    preparazione:'Mescola lo yogurt con il cacao amaro e il miele. Guarnisci con frutta secca a piacere.'
  },
  {
    id:'r003', icon:'🍞', name:'Pane integrale con crema di nocciole e banana',
    pasto:['colazione'],
    ingredienti:[
      { name:'Pane integrale',              quantity:50, unit:'g'  },
      { name:'Crema di frutta secca 100%',  quantity:20, unit:'g'  },
      { name:'Banana',                      quantity:1,  unit:'pz' },
      { name:'Latte parzialmente scremato', quantity:150,unit:'ml' }
    ],
    preparazione:'Tosta il pane. Spalma la crema di frutta secca. Aggiungi fette di banana. Accompagna con un bicchiere di latte.'
  },
  {
    id:'r004', icon:'🍞', name:'Pane integrale con ricotta e marmellata',
    pasto:['colazione'],
    ingredienti:[
      { name:'Pane integrale',  quantity:50, unit:'g' },
      { name:'Ricotta vaccina', quantity:50, unit:'g' },
      { name:'Marmellata',      quantity:15, unit:'g' },
      { name:'Kiwi',            quantity:1,  unit:'pz'}
    ],
    preparazione:'Tosta leggermente il pane. Spalma la ricotta e la marmellata. Accompagna con un kiwi fresco.'
  },
  {
    id:'r005', icon:'🥚', name:'Uova strapazzate su pane integrale',
    pasto:['colazione','pranzo'],
    ingredienti:[
      { name:'Uova',           quantity:2,  unit:'pz' },
      { name:'Pane integrale', quantity:50, unit:'g'  },
      { name:'Pomodorini',     quantity:60, unit:'g'  },
      { name:'Olio EVO',       quantity:5,  unit:'ml' },
      { name:'Basilico fresco',quantity:3,  unit:'g'  }
    ],
    preparazione:'Sbatti le uova con sale e pepe. Cuoci in padella antiaderente con olio a fuoco basso. Servi sul pane tostato con pomodorini e basilico.'
  },
  {
    id:'r006', icon:'🌾', name:'Muesli con skyr e frutta fresca',
    pasto:['colazione'],
    ingredienti:[
      { name:'Muesli',         quantity:40, unit:'g'  },
      { name:'Skyr bianco',    quantity:100,unit:'g'  },
      { name:'Frutta fresca',  quantity:1,  unit:'pz' },
      { name:'Miele',          quantity:5,  unit:'g'  }
    ],
    preparazione:'Versa il muesli in una ciotola. Aggiungi lo skyr, la frutta a pezzi e un filo di miele.'
  },
  {
    id:'r007', icon:'🥛', name:'Skyr con avena, fragole e miele',
    pasto:['colazione','merenda'],
    ingredienti:[
      { name:'Skyr bianco',    quantity:150, unit:'g' },
      { name:'Fiocchi di avena',quantity:20, unit:'g' },
      { name:'Fragole',         quantity:80, unit:'g' },
      { name:'Miele',           quantity:8,  unit:'g' }
    ],
    preparazione:'Mescola skyr, avena cruda e miele in una ciotola. Aggiungi le fragole tagliate a pezzi. Ideale anche preparato la sera prima (overnight).'
  },
  {
    id:'r008', icon:'🥞', name:'Pancake di avena e banana',
    pasto:['colazione'],
    ingredienti:[
      { name:'Farina di avena', quantity:50, unit:'g'  },
      { name:'Uova',            quantity:2,  unit:'pz' },
      { name:'Banana',          quantity:1,  unit:'pz' },
      { name:'Latte senza lattosio', quantity:50, unit:'ml' },
      { name:'Miele',           quantity:10, unit:'g'  }
    ],
    preparazione:'Frulla avena, uova, banana e latte fino a ottenere una pastella liscia. Cuoci cucchiaiate in padella antiaderente 2 min per lato. Servi con miele.'
  },
  {
    id:'r009', icon:'☕', name:'Smoothie proteico con latte e avena',
    pasto:['colazione','spuntino'],
    ingredienti:[
      { name:'Latte parzialmente scremato', quantity:200, unit:'ml' },
      { name:'Fiocchi di avena',            quantity:30,  unit:'g'  },
      { name:'Banana',                      quantity:1,   unit:'pz' },
      { name:'Cacao amaro',                 quantity:5,   unit:'g'  },
      { name:'Mandorle',                    quantity:10,  unit:'g'  }
    ],
    preparazione:'Frulla tutti gli ingredienti fino a ottenere un composto cremoso. Servi fresco. Ideale come colazione veloce o spuntino post-allenamento.'
  },

  /* ════════════ SPUNTINO (7) ════════════ */
  {
    id:'r010', icon:'🍎', name:'Frutta fresca con mandorle',
    pasto:['spuntino'],
    ingredienti:[
      { name:'Mela',     quantity:1,  unit:'pz' },
      { name:'Mandorle', quantity:15, unit:'g'  }
    ],
    preparazione:'Abbinamento classico: la mela (o qualsiasi frutto fresco di stagione) con una piccola porzione di mandorle per aggiungere grassi buoni e prolungare il senso di sazietà.'
  },
  {
    id:'r011', icon:'🥝', name:'Yogurt greco con kiwi e pistacchi',
    pasto:['spuntino','merenda'],
    ingredienti:[
      { name:'Yogurt greco 0%', quantity:125, unit:'g'  },
      { name:'Kiwi',            quantity:1,   unit:'pz' },
      { name:'Pistacchi',       quantity:10,  unit:'g'  }
    ],
    preparazione:'Versa lo yogurt in una ciotola. Aggiungi kiwi a fette e i pistacchi. Dolcifica solo se necessario con un filo di miele.'
  },
  {
    id:'r012', icon:'🍘', name:'Gallette di riso con hummus e carote',
    pasto:['spuntino'],
    ingredienti:[
      { name:'Gallette di riso', quantity:2,  unit:'pz' },
      { name:'Hummus',           quantity:40, unit:'g'  },
      { name:'Carote',           quantity:60, unit:'g'  }
    ],
    preparazione:'Spalma l\'hummus sulle gallette. Servi con bastoncini di carota fresca. Spuntino croccante e saziante.'
  },
  {
    id:'r013', icon:'🍘', name:'Wasa con formaggio fresco e pomodorino',
    pasto:['spuntino'],
    ingredienti:[
      { name:'Wasa',                    quantity:2,  unit:'pz' },
      { name:'Formaggio fresco light',  quantity:40, unit:'g'  },
      { name:'Pomodorini',              quantity:40, unit:'g'  },
      { name:'Basilico fresco',         quantity:2,  unit:'g'  }
    ],
    preparazione:'Spalma il formaggio fresco sui Wasa. Aggiungi pomodorini a fette e basilico. Spolverata di pepe a piacere.'
  },
  {
    id:'r014', icon:'🍘', name:'Crackers integrali con bresaola e rucola',
    pasto:['spuntino'],
    ingredienti:[
      { name:'Crackers integrali', quantity:25, unit:'g' },
      { name:'Bresaola',           quantity:40, unit:'g' },
      { name:'Limone',             quantity:1,  unit:'pz'}
    ],
    preparazione:'Abbina i crackers integrali alla bresaola. Spruzza succo di limone fresco. Spuntino veloce e proteico.'
  },
  {
    id:'r015', icon:'🥜', name:'Banana con crema di frutta secca',
    pasto:['spuntino','merenda'],
    ingredienti:[
      { name:'Banana',                    quantity:1,  unit:'pz' },
      { name:'Crema di frutta secca 100%',quantity:15, unit:'g'  }
    ],
    preparazione:'Pela la banana e intingila nella crema di frutta secca. Spuntino energetico pre o post allenamento.'
  },
  {
    id:'r016', icon:'🧀', name:'Ricotta con miele e noci',
    pasto:['spuntino','merenda'],
    ingredienti:[
      { name:'Ricotta vaccina', quantity:80, unit:'g' },
      { name:'Miele',           quantity:8,  unit:'g' },
      { name:'Noci',            quantity:10, unit:'g' }
    ],
    preparazione:'Versa la ricotta in una ciotola. Aggiungi miele e noci spezzettate. Fonte bilanciata di proteine e grassi buoni.'
  },

  /* ════════════ PRANZO (22) ════════════ */
  {
    id:'r017', icon:'🍝', name:'Pasta integrale al tonno e pomodorini',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Pasta integrale', quantity:70,  unit:'g'  },
      { name:'Tonno al naturale',quantity:100,unit:'g'  },
      { name:'Pomodorini',      quantity:100, unit:'g'  },
      { name:'Olio EVO',        quantity:10,  unit:'ml' },
      { name:'Basilico fresco', quantity:5,   unit:'g'  }
    ],
    preparazione:'Cuoci la pasta al dente. Scola il tonno e mescola con pomodorini tagliati a metà. Condisci con olio e basilico fresco a crudo.'
  },
  {
    id:'r018', icon:'🍝', name:'Pasta integrale al pesto e grana',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Pasta integrale',  quantity:70, unit:'g'  },
      { name:'Pesto di basilico',quantity:20, unit:'g'  },
      { name:'Pomodorini',       quantity:80, unit:'g'  },
      { name:'Grana Padano',     quantity:15, unit:'g'  }
    ],
    preparazione:'Cuoci la pasta al dente. Scola tenendo un po\' di acqua di cottura. Condisci con pesto allungato con acqua di cottura, pomodorini e grana.'
  },
  {
    id:'r019', icon:'🫘', name:'Pasta e ceci al rosmarino',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Pasta integrale', quantity:60,  unit:'g'  },
      { name:'Ceci in scatola', quantity:150, unit:'g'  },
      { name:'Pomodorini',      quantity:80,  unit:'g'  },
      { name:'Olio EVO',        quantity:10,  unit:'ml' },
      { name:'Rosmarino',       quantity:3,   unit:'g'  },
      { name:'Aglio',           quantity:5,   unit:'g'  }
    ],
    preparazione:'Soffriggi l\'aglio in olio. Aggiungi ceci e pomodorini, cuoci 10 min. Unisci la pasta cotta, rosmarino e un mestolo di acqua di cottura.'
  },
  {
    id:'r020', icon:'🍝', name:'Pasta integrale con ricotta e spinaci',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Pasta integrale', quantity:70,  unit:'g'  },
      { name:'Ricotta vaccina', quantity:80,  unit:'g'  },
      { name:'Spinaci',         quantity:150, unit:'g'  },
      { name:'Olio EVO',        quantity:8,   unit:'ml' },
      { name:'Parmigiano',      quantity:10,  unit:'g'  }
    ],
    preparazione:'Cuoci la pasta. Saltate gli spinaci in padella con olio. Fuori dal fuoco aggiungi la ricotta e mescola con la pasta scolata. Finisci con parmigiano.'
  },
  {
    id:'r021', icon:'🍆', name:'Pasta integrale alla Norma',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Pasta integrale', quantity:70,  unit:'g'  },
      { name:'Melanzane',       quantity:200, unit:'g'  },
      { name:'Pomodorini',      quantity:150, unit:'g'  },
      { name:'Olio EVO',        quantity:10,  unit:'ml' },
      { name:'Basilico fresco', quantity:5,   unit:'g'  },
      { name:'Ricotta vaccina', quantity:30,  unit:'g'  }
    ],
    preparazione:'Taglia le melanzane a cubetti, griglia o cuoci al forno con poco olio. Prepara il sugo con pomodorini e basilico. Condisci la pasta con sugo, melanzane e ricotta grattugiata.'
  },
  {
    id:'r022', icon:'🍚', name:'Riso integrale con verdure e tofu saltato',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Riso integrale', quantity:70,  unit:'g'  },
      { name:'Tofu',           quantity:100, unit:'g'  },
      { name:'Peperoni',       quantity:100, unit:'g'  },
      { name:'Zucchine',       quantity:100, unit:'g'  },
      { name:'Olio EVO',       quantity:10,  unit:'ml' },
      { name:'Salsa di soia',  quantity:10,  unit:'ml' }
    ],
    preparazione:'Cuoci il riso. Taglia il tofu a cubetti e rosola in padella con olio fino a doratura. Aggiungi peperoni e zucchine, cuoci 8 min. Condisci tutto con salsa di soia.'
  },
  {
    id:'r023', icon:'🍚', name:'Riso integrale con salmone e avocado',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Riso integrale',    quantity:70,  unit:'g'  },
      { name:'Salmone affumicato',quantity:80,  unit:'g'  },
      { name:'Avocado',           quantity:50,  unit:'g'  },
      { name:'Cetrioli',          quantity:60,  unit:'g'  },
      { name:'Limone',            quantity:1,   unit:'pz' },
      { name:'Olio EVO',          quantity:8,   unit:'ml' }
    ],
    preparazione:'Prepara una bowl con riso caldo, salmone affumicato, avocado a cubetti e cetrioli. Condisci con limone e olio EVO. Versione light di un sushi bowl.'
  },
  {
    id:'r024', icon:'🌾', name:'Couscous con pollo e verdure grigliate',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Couscous integrale', quantity:70,  unit:'g'  },
      { name:'Petto di pollo',     quantity:120, unit:'g'  },
      { name:'Zucchine',           quantity:100, unit:'g'  },
      { name:'Peperoni',           quantity:80,  unit:'g'  },
      { name:'Olio EVO',           quantity:10,  unit:'ml' },
      { name:'Curcuma',            quantity:2,   unit:'g'  }
    ],
    preparazione:'Reidrata il couscous con acqua calda salata. Griglia il pollo e le verdure. Condisci il couscous con olio e curcuma. Servi con pollo e verdure sopra.'
  },
  {
    id:'r025', icon:'🥗', name:'Insalata di farro con tonno e verdure',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Farro perlato',       quantity:70,  unit:'g'  },
      { name:'Tonno al naturale',   quantity:100, unit:'g'  },
      { name:'Pomodorini',          quantity:80,  unit:'g'  },
      { name:'Cetrioli',            quantity:60,  unit:'g'  },
      { name:'Olive in salamoia',   quantity:20,  unit:'g'  },
      { name:'Olio EVO',            quantity:10,  unit:'ml' }
    ],
    preparazione:'Cuoci il farro, lascia raffreddare. Unisci tonno sgocciolato, pomodorini, cetrioli e olive. Condisci con olio e limone. Ottima anche preparata il giorno prima.'
  },
  {
    id:'r026', icon:'🍗', name:'Pollo alla piastra con verdure grigliate',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Petto di pollo', quantity:130, unit:'g'  },
      { name:'Zucchine',       quantity:150, unit:'g'  },
      { name:'Pomodorini',     quantity:100, unit:'g'  },
      { name:'Olio EVO',       quantity:10,  unit:'ml' },
      { name:'Origano',        quantity:2,   unit:'g'  }
    ],
    preparazione:'Condisci il pollo con olio, origano, sale e pepe. Cuoci sulla piastra 5-6 min per lato. Griglia le zucchine a fette. Servi con pomodorini freschi.'
  },
  {
    id:'r027', icon:'🥗', name:'Bowl di pollo con avocado e insalata',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Straccetti di pollo',quantity:130, unit:'g'  },
      { name:'Lattuga',            quantity:80,  unit:'g'  },
      { name:'Avocado',            quantity:50,  unit:'g'  },
      { name:'Pomodorini',         quantity:80,  unit:'g'  },
      { name:'Olio EVO',           quantity:10,  unit:'ml' },
      { name:'Limone',             quantity:1,   unit:'pz' }
    ],
    preparazione:'Cuoci il pollo alla piastra e taglia a striscioline. Componi la bowl con lattuga, avocado, pomodorini e pollo. Condisci con olio e limone.'
  },
  {
    id:'r028', icon:'🫓', name:'Piadina con bresaola, avocado e lattuga',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Piadina integrale', quantity:75, unit:'g'  },
      { name:'Bresaola',          quantity:80, unit:'g'  },
      { name:'Avocado',           quantity:50, unit:'g'  },
      { name:'Lattuga',           quantity:40, unit:'g'  },
      { name:'Limone',            quantity:1,  unit:'pz' }
    ],
    preparazione:'Scalda la piadina in padella. Schiaccia l\'avocado con succo di limone. Farcisci con bresaola, avocado e lattuga. Arrotola e servi.'
  },
  {
    id:'r029', icon:'🫓', name:'Piadina con prosciutto cotto e zucchine',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Piadina integrale',       quantity:75, unit:'g'  },
      { name:'Prosciutto cotto',        quantity:80, unit:'g'  },
      { name:'Zucchine',                quantity:100,unit:'g'  },
      { name:'Formaggio fresco light',  quantity:30, unit:'g'  }
    ],
    preparazione:'Griglia le zucchine a fette. Scalda la piadina e spalma il formaggio fresco. Farcisci con prosciutto e zucchine grigliate.'
  },
  {
    id:'r030', icon:'🥬', name:'Insalata di lenticchie, pomodori e cetrioli',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Lenticchie in scatola', quantity:150, unit:'g'  },
      { name:'Pomodorini',            quantity:80,  unit:'g'  },
      { name:'Cetrioli',              quantity:80,  unit:'g'  },
      { name:'Cipolla',               quantity:30,  unit:'g'  },
      { name:'Olio EVO',              quantity:10,  unit:'ml' },
      { name:'Limone',                quantity:1,   unit:'pz' }
    ],
    preparazione:'Scola le lenticchie. Unisci pomodorini, cetrioli a dadini e cipolla tritata finemente. Condisci con olio e limone. Lascia riposare 10 min prima di servire.'
  },
  {
    id:'r031', icon:'🫘', name:'Insalata di fagioli e tonno',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Fagioli in scatola',  quantity:150, unit:'g'  },
      { name:'Tonno al naturale',   quantity:80,  unit:'g'  },
      { name:'Cipolla',             quantity:30,  unit:'g'  },
      { name:'Pomodori',            quantity:100, unit:'g'  },
      { name:'Olio EVO',            quantity:10,  unit:'ml' }
    ],
    preparazione:'Scola i fagioli e il tonno. Unisci cipolla rossa affettata sottile e pomodori a dadini. Condisci con olio, sale e aceto a piacere.'
  },
  {
    id:'r032', icon:'🥟', name:'Gnocchi di patate al pomodoro fresco',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Gnocchi di patate', quantity:200, unit:'g'  },
      { name:'Pomodorini',        quantity:150, unit:'g'  },
      { name:'Basilico fresco',   quantity:5,   unit:'g'  },
      { name:'Olio EVO',          quantity:8,   unit:'ml' },
      { name:'Parmigiano',        quantity:10,  unit:'g'  }
    ],
    preparazione:'Cuoci i gnocchi in acqua salata finché non salgono in superficie. Prepara un sugo veloce con pomodorini schiacciati, olio e basilico (5 min). Condisci e finisci con parmigiano.'
  },
  {
    id:'r033', icon:'🥚', name:'Frittata di spinaci e ricotta al forno',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Uova',            quantity:3,   unit:'pz' },
      { name:'Spinaci',         quantity:150, unit:'g'  },
      { name:'Ricotta vaccina', quantity:60,  unit:'g'  },
      { name:'Olio EVO',        quantity:5,   unit:'ml' },
      { name:'Parmigiano',      quantity:10,  unit:'g'  }
    ],
    preparazione:'Saltate gli spinaci in padella. Sbatti le uova con ricotta, parmigiano e spinaci raffreddati. Cuoci in forno a 180° in una pirofila oliata per 20 min.'
  },
  {
    id:'r034', icon:'🍗', name:'Bowl di tacchino con riso e verdure',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Tacchino',       quantity:120, unit:'g'  },
      { name:'Riso integrale', quantity:70,  unit:'g'  },
      { name:'Broccoli',       quantity:150, unit:'g'  },
      { name:'Carote',         quantity:80,  unit:'g'  },
      { name:'Olio EVO',       quantity:10,  unit:'ml' }
    ],
    preparazione:'Cuoci il riso. Cuoci al vapore broccoli e carote. Griglia il tacchino. Componi la bowl e condisci con olio EVO e un pizzico di curcuma.'
  },
  {
    id:'r035', icon:'🐟', name:'Insalata di salmone affumicato e avocado',
    pasto:['pranzo'],
    ingredienti:[
      { name:'Salmone affumicato', quantity:80,  unit:'g'  },
      { name:'Avocado',            quantity:70,  unit:'g'  },
      { name:'Lattuga',            quantity:80,  unit:'g'  },
      { name:'Cetrioli',           quantity:60,  unit:'g'  },
      { name:'Limone',             quantity:1,   unit:'pz' },
      { name:'Olio EVO',           quantity:8,   unit:'ml' }
    ],
    preparazione:'Componi un letto di lattuga. Aggiungi salmone affumicato, avocado a dadini e cetrioli. Condisci con limone e olio. Spolvera con pepe nero.'
  },
  {
    id:'r036', icon:'🥚', name:'Uova strapazzate con spinaci e parmigiano',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Uova',           quantity:2,   unit:'pz' },
      { name:'Spinaci',        quantity:150, unit:'g'  },
      { name:'Olio EVO',       quantity:5,   unit:'ml' },
      { name:'Parmigiano',     quantity:15,  unit:'g'  }
    ],
    preparazione:'Saltate gli spinaci in padella con olio. Aggiungi le uova sbattute e mescola a fuoco basso fino alla cottura desiderata. Finisci con parmigiano.'
  },
  {
    id:'r037', icon:'🍚', name:'Riso integrale con legumi e curry',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Riso integrale',  quantity:70,  unit:'g'  },
      { name:'Ceci in scatola', quantity:100, unit:'g'  },
      { name:'Spinaci',         quantity:100, unit:'g'  },
      { name:'Pomodorini',      quantity:80,  unit:'g'  },
      { name:'Olio EVO',        quantity:10,  unit:'ml' },
      { name:'Curcuma',         quantity:2,   unit:'g'  },
      { name:'Paprika',         quantity:1,   unit:'g'  }
    ],
    preparazione:'Soffriggi cipolla con olio. Aggiungi ceci, pomodorini, curcuma e paprika. Cuoci 10 min. Unisci gli spinaci e cuoci 3 min. Servi sul riso caldo.'
  },
  {
    id:'r038', icon:'🐟', name:'Salmone al forno con verdure e limone',
    pasto:['pranzo','cena'],
    ingredienti:[
      { name:'Salmone',   quantity:130, unit:'g'  },
      { name:'Asparagi',  quantity:150, unit:'g'  },
      { name:'Pomodorini',quantity:80,  unit:'g'  },
      { name:'Olio EVO',  quantity:8,   unit:'ml' },
      { name:'Limone',    quantity:1,   unit:'pz' }
    ],
    preparazione:'Disponi il salmone su carta forno con asparagi e pomodorini. Condisci con olio, succo di limone, sale e pepe. Cuoci a 190° per 18-20 min.'
  },

  /* ════════════ CENA (17) ════════════ */
  {
    id:'r039', icon:'🐟', name:'Merluzzo al forno con patate al rosmarino',
    pasto:['cena'],
    ingredienti:[
      { name:'Merluzzo',   quantity:150, unit:'g'  },
      { name:'Patate',     quantity:200, unit:'g'  },
      { name:'Olio EVO',   quantity:10,  unit:'ml' },
      { name:'Rosmarino',  quantity:3,   unit:'g'  },
      { name:'Limone',     quantity:1,   unit:'pz' }
    ],
    preparazione:'Taglia le patate a cubetti, condisci con olio e rosmarino. Inforna a 200° per 20 min. Aggiungi il merluzzo e cuoci altri 15 min con succo di limone.'
  },
  {
    id:'r040', icon:'🦑', name:'Calamari alla griglia con zucchine',
    pasto:['cena'],
    ingredienti:[
      { name:'Calamari',       quantity:200, unit:'g'  },
      { name:'Zucchine',       quantity:150, unit:'g'  },
      { name:'Olio EVO',       quantity:10,  unit:'ml' },
      { name:'Prezzemolo',     quantity:5,   unit:'g'  },
      { name:'Limone',         quantity:1,   unit:'pz' }
    ],
    preparazione:'Pulisci i calamari e grigliali 3-4 min per lato. Griglia le zucchine a fette. Condisci tutto con olio, prezzemolo tritato e limone a crudo.'
  },
  {
    id:'r041', icon:'🐙', name:'Polpo con patate e olive',
    pasto:['cena'],
    ingredienti:[
      { name:'Polpo',           quantity:200, unit:'g'  },
      { name:'Patate',          quantity:150, unit:'g'  },
      { name:'Olive in salamoia',quantity:20, unit:'g'  },
      { name:'Olio EVO',        quantity:10,  unit:'ml' },
      { name:'Prezzemolo',      quantity:5,   unit:'g'  }
    ],
    preparazione:'Lessa il polpo per 40 min, taglia a pezzi. Lessa le patate a cubetti. Mescola con olive e prezzemolo. Condisci con olio EVO a crudo. Ottimo anche tiepido.'
  },
  {
    id:'r042', icon:'🐟', name:'Spigola al forno con patate e pomodorini',
    pasto:['cena'],
    ingredienti:[
      { name:'Spigola',    quantity:180, unit:'g'  },
      { name:'Patate',     quantity:150, unit:'g'  },
      { name:'Pomodorini', quantity:80,  unit:'g'  },
      { name:'Olio EVO',   quantity:10,  unit:'ml' },
      { name:'Origano',    quantity:2,   unit:'g'  }
    ],
    preparazione:'Disponi le patate a rondelle nella teglia. Adagia la spigola sopra con pomodorini. Condisci con olio e origano. Cuoci a 190° per 25-30 min.'
  },
  {
    id:'r043', icon:'🐟', name:'Orata al cartoccio con limone e aglio',
    pasto:['cena'],
    ingredienti:[
      { name:'Orata',          quantity:180, unit:'g'  },
      { name:'Limone',         quantity:1,   unit:'pz' },
      { name:'Aglio',          quantity:5,   unit:'g'  },
      { name:'Rosmarino',      quantity:3,   unit:'g'  },
      { name:'Olio EVO',       quantity:8,   unit:'ml' },
      { name:'Verdure miste',  quantity:150, unit:'g'  }
    ],
    preparazione:'Incidi l\'orata, farcisci con fette di limone, aglio e rosmarino. Avvolgi nel cartoccio con olio. Cuoci in forno a 200° per 25 min. Servi con verdure al vapore.'
  },
  {
    id:'r044', icon:'🐟', name:'Branzino al vapore con asparagi',
    pasto:['cena'],
    ingredienti:[
      { name:'Branzino',   quantity:180, unit:'g'  },
      { name:'Asparagi',   quantity:150, unit:'g'  },
      { name:'Limone',     quantity:1,   unit:'pz' },
      { name:'Olio EVO',   quantity:8,   unit:'ml' },
      { name:'Prezzemolo', quantity:3,   unit:'g'  }
    ],
    preparazione:'Cuoci il branzino al vapore per 12-15 min. Cuoci gli asparagi al vapore per 8 min. Condisci con olio, limone e prezzemolo fresco.'
  },
  {
    id:'r045', icon:'🐟', name:'Pesce spada alla piastra con pomodorini',
    pasto:['cena'],
    ingredienti:[
      { name:'Pesce spada', quantity:150, unit:'g'  },
      { name:'Pomodorini',  quantity:100, unit:'g'  },
      { name:'Olio EVO',    quantity:8,   unit:'ml' },
      { name:'Origano',     quantity:2,   unit:'g'  },
      { name:'Limone',      quantity:1,   unit:'pz' }
    ],
    preparazione:'Cuoci il pesce spada sulla piastra calda 4-5 min per lato. Prepara una salsina con pomodorini tagliati, olio, origano e limone. Versa sul pesce.'
  },
  {
    id:'r046', icon:'🐟', name:'Nasello al vapore con fagiolini',
    pasto:['cena'],
    ingredienti:[
      { name:'Nasello',    quantity:150, unit:'g'  },
      { name:'Fagiolini',  quantity:150, unit:'g'  },
      { name:'Olio EVO',   quantity:8,   unit:'ml' },
      { name:'Limone',     quantity:1,   unit:'pz' }
    ],
    preparazione:'Cuoci il nasello al vapore per 12 min. Lessate i fagiolini finché sono teneri. Condisci tutto con olio e limone. Piatto leggero e digeribile.'
  },
  {
    id:'r047', icon:'🦑', name:'Seppie in umido con piselli',
    pasto:['cena'],
    ingredienti:[
      { name:'Seppie',           quantity:200, unit:'g'  },
      { name:'Piselli in scatola',quantity:100,unit:'g'  },
      { name:'Pomodorini',       quantity:100, unit:'g'  },
      { name:'Olio EVO',         quantity:10,  unit:'ml' },
      { name:'Prezzemolo',       quantity:5,   unit:'g'  }
    ],
    preparazione:'Soffriggi aglio in olio. Aggiungi le seppie pulite, cuoci 10 min. Unisci pomodorini e piselli, cuoci 15 min a fuoco medio. Finisci con prezzemolo.'
  },
  {
    id:'r048', icon:'🐟', name:'Tonno fresco alla piastra con insalata',
    pasto:['cena'],
    ingredienti:[
      { name:'Tonno fresco',  quantity:150, unit:'g'  },
      { name:'Insalata mista',quantity:100, unit:'g'  },
      { name:'Pomodorini',    quantity:80,  unit:'g'  },
      { name:'Olio EVO',      quantity:10,  unit:'ml' },
      { name:'Limone',        quantity:1,   unit:'pz' }
    ],
    preparazione:'Cuoci il trancio di tonno sulla piastra caldissima 2-3 min per lato (rosato all\'interno). Servi su letto di insalata mista con pomodorini e condimento.'
  },
  {
    id:'r049', icon:'🥩', name:'Vitello con spinaci e limone',
    pasto:['cena'],
    ingredienti:[
      { name:'Vitello',    quantity:130, unit:'g'  },
      { name:'Spinaci',    quantity:200, unit:'g'  },
      { name:'Olio EVO',   quantity:8,   unit:'ml' },
      { name:'Limone',     quantity:1,   unit:'pz' },
      { name:'Aglio',      quantity:5,   unit:'g'  }
    ],
    preparazione:'Cuoci il vitello in padella con olio e aglio, 4 min per lato. Saltate gli spinaci separatamente. Servi la carne con gli spinaci e succo di limone.'
  },
  {
    id:'r050', icon:'🥚', name:'Frittata di verdure miste al forno',
    pasto:['cena','pranzo'],
    ingredienti:[
      { name:'Uova',          quantity:3,   unit:'pz' },
      { name:'Zucchine',      quantity:100, unit:'g'  },
      { name:'Peperoni',      quantity:80,  unit:'g'  },
      { name:'Cipolla',       quantity:40,  unit:'g'  },
      { name:'Olio EVO',      quantity:8,   unit:'ml' },
      { name:'Parmigiano',    quantity:10,  unit:'g'  }
    ],
    preparazione:'Saltate le verdure tagliate fini con cipolla. Sbatti le uova con parmigiano. Unisci le verdure alle uova. Cuoci in forno a 180° per 15-18 min in stampo oliato.'
  },
  {
    id:'r051', icon:'🫘', name:'Zuppa di lenticchie e verdure',
    pasto:['cena'],
    ingredienti:[
      { name:'Lenticchie in scatola', quantity:150, unit:'g'  },
      { name:'Carote',                quantity:100, unit:'g'  },
      { name:'Spinaci',               quantity:100, unit:'g'  },
      { name:'Pomodori',              quantity:100, unit:'g'  },
      { name:'Brodo vegetale',        quantity:300, unit:'ml' },
      { name:'Olio EVO',              quantity:10,  unit:'ml' },
      { name:'Curcuma',               quantity:2,   unit:'g'  }
    ],
    preparazione:'Soffriggi carote e cipolla in olio. Aggiungi pomodori, lenticchie e brodo. Cuoci 15 min. Unisci gli spinaci e curcuma. Cuoci altri 5 min. Ottima con pane integrale.'
  },
  {
    id:'r052', icon:'🫘', name:'Zuppa di ceci e spinaci',
    pasto:['cena'],
    ingredienti:[
      { name:'Ceci in scatola', quantity:150, unit:'g'  },
      { name:'Spinaci',         quantity:150, unit:'g'  },
      { name:'Pomodorini',      quantity:100, unit:'g'  },
      { name:'Brodo vegetale',  quantity:250, unit:'ml' },
      { name:'Olio EVO',        quantity:10,  unit:'ml' },
      { name:'Rosmarino',       quantity:2,   unit:'g'  }
    ],
    preparazione:'Soffriggi aglio in olio. Aggiungi ceci, pomodorini e brodo. Cuoci 10 min. Unisci gli spinaci e rosmarino. Cuoci 5 min. Servi con un filo d\'olio a crudo.'
  },
  {
    id:'r053', icon:'🧊', name:'Tofu saltato con verdure e riso integrale',
    pasto:['cena'],
    ingredienti:[
      { name:'Tofu',           quantity:150, unit:'g'  },
      { name:'Riso integrale', quantity:70,  unit:'g'  },
      { name:'Broccoli',       quantity:150, unit:'g'  },
      { name:'Carote',         quantity:80,  unit:'g'  },
      { name:'Olio EVO',       quantity:8,   unit:'ml' },
      { name:'Salsa di soia',  quantity:15,  unit:'ml' }
    ],
    preparazione:'Cuoci il riso. Rosola il tofu a cubetti in olio finché dorato. Aggiungi broccoli e carote tagliate fini. Cuoci 8 min a fuoco vivo. Condisci con salsa di soia. Servi sul riso.'
  },
  {
    id:'r054', icon:'🥩', name:'Coniglio al forno con verdure mediterranee',
    pasto:['cena'],
    ingredienti:[
      { name:'Coniglio',       quantity:200, unit:'g'  },
      { name:'Patate dolci',   quantity:150, unit:'g'  },
      { name:'Pomodorini',     quantity:100, unit:'g'  },
      { name:'Olive in salamoia',quantity:20,unit:'g'  },
      { name:'Olio EVO',       quantity:10,  unit:'ml' },
      { name:'Rosmarino',      quantity:3,   unit:'g'  }
    ],
    preparazione:'Marina il coniglio con olio, rosmarino e aglio. Disponi in teglia con patate dolci, pomodorini e olive. Inforna a 190° per 40-45 min.'
  },

  /* ════════════ MERENDA (5) ════════════ */
  {
    id:'r055', icon:'🍫', name:'Skyr con cioccolato fondente e noci',
    pasto:['merenda'],
    ingredienti:[
      { name:'Skyr bianco',          quantity:125, unit:'g' },
      { name:'Cioccolato fondente',  quantity:10,  unit:'g' },
      { name:'Noci',                 quantity:10,  unit:'g' }
    ],
    preparazione:'Versa lo skyr in una ciotola. Aggiungi cioccolato fondente spezzettato e noci. Dolce, proteico e saziante.'
  },
  {
    id:'r056', icon:'🍮', name:'Budino proteico con fragole',
    pasto:['merenda'],
    ingredienti:[
      { name:'Budino proteico', quantity:1,  unit:'pz' },
      { name:'Fragole',         quantity:50, unit:'g'  }
    ],
    preparazione:'Accompagna il budino proteico con fragole fresche. Spuntino dolce e proteico pronto in 30 secondi.'
  },
  {
    id:'r057', icon:'🥛', name:'Yogurt greco con banana e avena tostata',
    pasto:['merenda'],
    ingredienti:[
      { name:'Yogurt greco 0%',  quantity:125, unit:'g'  },
      { name:'Banana',           quantity:1,   unit:'pz' },
      { name:'Fiocchi di avena', quantity:15,  unit:'g'  },
      { name:'Miele',            quantity:5,   unit:'g'  }
    ],
    preparazione:'Tosta leggermente i fiocchi di avena in padella senza olio. Versa lo yogurt in una ciotola, aggiungi banana a rondelle, avena tostata e miele.'
  },
  {
    id:'r058', icon:'🍘', name:'Gallette di riso con crema di nocciole',
    pasto:['merenda'],
    ingredienti:[
      { name:'Gallette di riso',          quantity:2,  unit:'pz' },
      { name:'Crema di frutta secca 100%',quantity:15, unit:'g'  },
      { name:'Banana',                    quantity:1,  unit:'pz' }
    ],
    preparazione:'Spalma la crema di frutta secca sulle gallette. Aggiungi fettine di banana. Merenda semplice e nutriente.'
  },
  {
    id:'r059', icon:'🍫', name:'Cioccolato fondente con mandorle e kiwi',
    pasto:['merenda'],
    ingredienti:[
      { name:'Cioccolato fondente', quantity:15, unit:'g'  },
      { name:'Mandorle',            quantity:10, unit:'g'  },
      { name:'Kiwi',                quantity:1,  unit:'pz' }
    ],
    preparazione:'Abbina quadratini di cioccolato fondente (min. 70%) con mandorle e un kiwi fresco. Il kiwi apporta vitamina C, il cioccolato fondente antiossidanti.'
  }
];

/* ============================================================
   LIMITI SETTIMANALI
   ============================================================ */
var weeklyLimits = {
  'Carne rossa': {
    max:1, current:0, unit:'volte/sett.', icon:'🥩',
    keywords:['carne rossa','vitello','manzo','coniglio','carne rossa magra']
  },
  'Pesce': {
    max:4, current:0, unit:'volte/sett.', icon:'🐟',
    keywords:['merluzzo','nasello','spigola','branzino','salmone','orata','tonno fresco','pesce spada','calamari','polpo','seppie','tonno al naturale','salmone affumicato']
  },
  'Uova': {
    max:4, current:0, unit:'volte/sett.', icon:'🥚',
    keywords:['uova','uovo']
  },
  'Affettati': {
    max:1, current:0, unit:'volte/sett.', icon:'🥩',
    keywords:['bresaola','prosciutto cotto','prosciutto crudo','fesa di tacchino','affettato']
  },
  'Dolci': {
    max:3, current:0, unit:'volte/sett.', icon:'🍫',
    keywords:['biscotti','cornetto','budino','barretta ai cereali']
  }
};

/* ── CONVERSIONI UNITÀ ── */
var unitConversions = {
  kg:  { g:  1000   },
  g:   { kg: 0.001  },
  l:   { ml: 1000   },
  ml:  { l:  0.001  }
};
