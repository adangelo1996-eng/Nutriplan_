/* ============================================================
   DEFAULT MEAL PLAN — struttura a 5 pasti (no turni)
   ============================================================ */
var defaultMealPlan = {
    colazione: {
        principale: [
            { label: 'Latte parzialmente scremato', qty: 200, unit: 'ml' },
            { label: 'Fiocchi d\'avena', qty: 40, unit: 'g' },
            { label: 'Banana', qty: 1, unit: 'pz' }
        ]
    },
    spuntino: {
        principale: [
            { label: 'Yogurt greco', qty: 125, unit: 'g' },
            { label: 'Mandorle', qty: 20, unit: 'g' }
        ]
    },
    pranzo: {
        principale: [
            { label: 'Pasta integrale', qty: 80, unit: 'g' },
            { label: 'Passata di pomodoro', qty: 150, unit: 'ml' },
            { label: 'Olio extravergine', qty: 10, unit: 'ml' }
        ]
    },
    merenda: {
        principale: [
            { label: 'Frutta di stagione', qty: 150, unit: 'g' },
            { label: 'Crackers integrali', qty: 20, unit: 'g' }
        ]
    },
    cena: {
        principale: [
            { label: 'Petto di pollo', qty: 150, unit: 'g' },
            { label: 'Verdure miste', qty: 200, unit: 'g' },
            { label: 'Riso', qty: 70, unit: 'g' },
            { label: 'Olio extravergine', qty: 10, unit: 'ml' }
        ]
    }
};

/* ============================================================
   CATEGORIE DISPENSA
   ============================================================ */
var pantryCategories = [
    {
        label: '🥩 Carne e Pesce',
        items: [
            { name: 'Petto di pollo',    icon: '🍗', units: ['g'],       step: 50 },
            { name: 'Tacchino',          icon: '🦃', units: ['g'],       step: 50 },
            { name: 'Manzo',             icon: '🥩', units: ['g'],       step: 50 },
            { name: 'Salmone',           icon: '🐟', units: ['g'],       step: 50 },
            { name: 'Tonno in scatola',  icon: '🐠', units: ['g'],       step: 50 },
            { name: 'Merluzzo',          icon: '🐡', units: ['g'],       step: 50 },
            { name: 'Prosciutto cotto',  icon: '🥓', units: ['g'],       step: 30 },
            { name: 'Sgombro',           icon: '🐟', units: ['g'],       step: 50 }
        ]
    },
    {
        label: '🥛 Latticini e Uova',
        items: [
            { name: 'Latte parzialmente scremato', icon: '🥛', units: ['ml'],        step: 100 },
            { name: 'Yogurt greco',                icon: '🍶', units: ['g'],         step: 125 },
            { name: 'Ricotta',                     icon: '🧀', units: ['g'],         step: 50  },
            { name: 'Mozzarella',                  icon: '🧀', units: ['g'],         step: 50  },
            { name: 'Parmigiano',                  icon: '🧀', units: ['g'],         step: 10  },
            { name: 'Uova',                        icon: '🥚', units: ['pz'],        step: 1   },
            { name: 'Burro',                       icon: '🧈', units: ['g'],         step: 10  },
            { name: 'Kefir',                       icon: '🥛', units: ['ml'],        step: 100 }
        ]
    },
    {
        label: '🌾 Cereali e Legumi',
        items: [
            { name: 'Pasta integrale',     icon: '🍝', units: ['g'],    step: 10 },
            { name: 'Riso',                icon: '🍚', units: ['g'],    step: 10 },
            { name: 'Farro',               icon: '🌾', units: ['g'],    step: 10 },
            { name: 'Fiocchi d\'avena',    icon: '🌾', units: ['g'],    step: 10 },
            { name: 'Pane integrale',      icon: '🍞', units: ['g','fette'], step: 1 },
            { name: 'Crackers integrali',  icon: '🍘', units: ['g','pz'],   step: 5 },
            { name: 'Ceci',                icon: '🫘', units: ['g'],    step: 50 },
            { name: 'Lenticchie',          icon: '🫘', units: ['g'],    step: 50 },
            { name: 'Fagioli',             icon: '🫘', units: ['g'],    step: 50 },
            { name: 'Quinoa',              icon: '🌾', units: ['g'],    step: 10 }
        ]
    },
    {
        label: '🥦 Verdure',
        items: [
            { name: 'Spinaci',          icon: '🥬', units: ['g'], step: 50 },
            { name: 'Broccoli',         icon: '🥦', units: ['g'], step: 50 },
            { name: 'Zucchine',         icon: '🥒', units: ['g'], step: 50 },
            { name: 'Pomodori',         icon: '🍅', units: ['g'], step: 50 },
            { name: 'Carote',           icon: '🥕', units: ['g'], step: 50 },
            { name: 'Lattuga',          icon: '🥗', units: ['g'], step: 50 },
            { name: 'Peperoni',         icon: '🫑', units: ['g'], step: 50 },
            { name: 'Cipolla',          icon: '🧅', units: ['g'], step: 30 },
            { name: 'Aglio',            icon: '🧄', units: ['g','pz'], step: 1 },
            { name: 'Verdure miste',    icon: '🥗', units: ['g'], step: 50 },
            { name: 'Melanzane',        icon: '🍆', units: ['g'], step: 50 },
            { name: 'Asparagi',         icon: '🌿', units: ['g'], step: 50 },
            { name: 'Cavolo',           icon: '🥬', units: ['g'], step: 50 },
            { name: 'Finocchio',        icon: '🌿', units: ['g'], step: 50 }
        ]
    },
    {
        label: '🍎 Frutta',
        items: [
            { name: 'Banana',              icon: '🍌', units: ['pz','g'], step: 1  },
            { name: 'Mela',                icon: '🍎', units: ['pz','g'], step: 1  },
            { name: 'Arancia',             icon: '🍊', units: ['pz','g'], step: 1  },
            { name: 'Fragole',             icon: '🍓', units: ['g'],      step: 50 },
            { name: 'Mirtilli',            icon: '🫐', units: ['g'],      step: 50 },
            { name: 'Kiwi',                icon: '🥝', units: ['pz'],     step: 1  },
            { name: 'Frutta di stagione',  icon: '🍑', units: ['g'],      step: 50 },
            { name: 'Pera',                icon: '🍐', units: ['pz','g'], step: 1  },
            { name: 'Uva',                 icon: '🍇', units: ['g'],      step: 50 }
        ]
    },
    {
        label: '🥑 Grassi e Condimenti',
        items: [
            { name: 'Olio extravergine', icon: '🫒', units: ['ml'],             step: 5  },
            { name: 'Mandorle',          icon: '🌰', units: ['g'],              step: 10 },
            { name: 'Noci',              icon: '🌰', units: ['g'],              step: 10 },
            { name: 'Avocado',           icon: '🥑', units: ['pz','g'],         step: 1  },
            { name: 'Tahini',            icon: '🫙', units: ['g','cucchiai'],   step: 10 },
            { name: 'Semi di chia',      icon: '🌱', units: ['g','cucchiaini'], step: 5  },
            { name: 'Semi di lino',      icon: '🌱', units: ['g'],              step: 5  },
            { name: 'Passata di pomodoro', icon: '🍅', units: ['ml','g'],       step: 50 }
        ]
    },
    {
        label: '🍫 Dolci e Snack',
        items: [
            { name: 'Cioccolato fondente', icon: '🍫', units: ['g'],          step: 10 },
            { name: 'Miele',               icon: '🍯', units: ['g','cucchiaini'], step: 5 },
            { name: 'Datteri',             icon: '🌴', units: ['g','pz'],     step: 1  }
        ]
    },
    {
        label: '🧂 Cucina',
        items: [
            { name: 'Sale',                icon: '🧂', units: ['g'],  step: 1  },
            { name: 'Brodo vegetale',      icon: '🍲', units: ['ml'], step: 50 },
            { name: 'Aceto balsamico',     icon: '🫙', units: ['ml','cucchiai'], step: 5 },
            { name: 'Senape',              icon: '🫙', units: ['g','cucchiaini'], step: 5 }
        ]
    }
];

/* Lista piatta ricavata dalle categorie */
var allPantryItems = (function () {
    var list = [];
    pantryCategories.forEach(function (cat) {
        cat.items.forEach(function (item) { list.push(item); });
    });
    return list;
}());

/* ============================================================
   RICETTE PREDEFINITE
   ============================================================ */
var ricette = {
    pasta_pomodoro: {
        nome: 'Pasta al Pomodoro',
        pasto: 'pranzo',
        ingredienti: [
            { nome: 'Pasta integrale',     quantita: 80,  unita: 'g'  },
            { nome: 'Passata di pomodoro', quantita: 150, unita: 'ml' },
            { nome: 'Aglio',               quantita: 1,   unita: 'pz' },
            { nome: 'Olio extravergine',   quantita: 10,  unita: 'ml' }
        ],
        istruzioni: 'Cuocere la pasta al dente. Soffriggere l\'aglio in olio, aggiungere la passata e cuocere 10 minuti. Condire la pasta e servire.',
        limiti: []
    },
    pollo_verdure: {
        nome: 'Pollo con Verdure',
        pasto: 'cena',
        ingredienti: [
            { nome: 'Petto di pollo',    quantita: 150, unita: 'g'  },
            { nome: 'Zucchine',          quantita: 100, unita: 'g'  },
            { nome: 'Peperoni',          quantita: 80,  unita: 'g'  },
            { nome: 'Olio extravergine', quantita: 10,  unita: 'ml' }
        ],
        istruzioni: 'Tagliare il pollo a strisce. Saltare in padella con olio, aggiungere le verdure a cubetti. Cuocere 15 minuti a fuoco medio.',
        limiti: []
    },
    porridge_avena: {
        nome: 'Porridge d\'Avena',
        pasto: 'colazione',
        ingredienti: [
            { nome: 'Fiocchi d\'avena',            quantita: 50,  unita: 'g'  },
            { nome: 'Latte parzialmente scremato', quantita: 200, unita: 'ml' },
            { nome: 'Banana',                      quantita: 1,   unita: 'pz' },
            { nome: 'Miele',                       quantita: 10,  unita: 'g'  }
        ],
        istruzioni: 'Cuocere i fiocchi d\'avena nel latte per 5 minuti mescolando. Servire con banana a rondelle e miele.',
        limiti: []
    },
    insalata_tonno: {
        nome: 'Insalata di Tonno',
        pasto: 'pranzo',
        ingredienti: [
            { nome: 'Tonno in scatola', quantita: 80,  unita: 'g'  },
            { nome: 'Lattuga',          quantita: 100, unita: 'g'  },
            { nome: 'Pomodori',         quantita: 100, unita: 'g'  },
            { nome: 'Olio extravergine',quantita: 10,  unita: 'ml' }
        ],
        istruzioni: 'Lavare e tagliare le verdure. Sgocciolare il tonno. Condire con olio, sale e pepe.',
        limiti: []
    },
    yogurt_frutta: {
        nome: 'Yogurt con Frutta e Mandorle',
        pasto: 'spuntino',
        ingredienti: [
            { nome: 'Yogurt greco', quantita: 125, unita: 'g' },
            { nome: 'Fragole',      quantita: 80,  unita: 'g' },
            { nome: 'Mandorle',     quantita: 15,  unita: 'g' }
        ],
        istruzioni: 'Versare lo yogurt in una ciotola. Aggiungere la frutta fresca e le mandorle intere o tritate.',
        limiti: []
    },
    riso_salmone: {
        nome: 'Riso con Salmone',
        pasto: 'cena',
        ingredienti: [
            { nome: 'Riso',              quantita: 70,  unita: 'g'  },
            { nome: 'Salmone',           quantita: 120, unita: 'g'  },
            { nome: 'Zucchine',          quantita: 80,  unita: 'g'  },
            { nome: 'Olio extravergine', quantita: 10,  unita: 'ml' }
        ],
        istruzioni: 'Cuocere il riso. Grigliare il salmone con olio e limone. Saltare le zucchine a rondelle. Servire tutto insieme.',
        limiti: []
    },
    farro_legumi: {
        nome: 'Farro con Legumi',
        pasto: 'pranzo',
        ingredienti: [
            { nome: 'Farro',             quantita: 70,  unita: 'g' },
            { nome: 'Ceci',              quantita: 80,  unita: 'g' },
            { nome: 'Spinaci',           quantita: 80,  unita: 'g' },
            { nome: 'Olio extravergine', quantita: 10,  unita: 'ml'}
        ],
        istruzioni: 'Cuocere il farro in acqua salata. Scaldare i ceci in padella con olio e spinaci. Mescolare tutto e servire tiepido.',
        limiti: []
    },
    merenda_banana: {
        nome: 'Banana e Mandorle',
        pasto: 'merenda',
        ingredienti: [
            { nome: 'Banana',   quantita: 1,  unita: 'pz' },
            { nome: 'Mandorle', quantita: 20, unita: 'g'  }
        ],
        istruzioni: 'Sbucciare la banana e abbinare alle mandorle. Merenda rapida ed energetica.',
        limiti: []
    }
};

/* ============================================================
   LIMITI SETTIMANALI
   ============================================================ */
var weeklyLimits = {
    'Carne rossa': { icon: '🥩', current: 0, max: 2,  unit: 'volte/sett.' },
    'Pesce':       { icon: '🐟', current: 0, max: 3,  unit: 'volte/sett.' },
    'Uova':        { icon: '🥚', current: 0, max: 4,  unit: 'pz/sett.'    },
    'Dolci':       { icon: '🍫', current: 0, max: 1,  unit: 'volte/sett.' },
    'Legumi':      { icon: '🫘', current: 0, max: 4,  unit: 'volte/sett.' }
};

/* ============================================================
   CONVERSIONI UNITÀ
   ============================================================ */
var unitConversions = {
    'kg':          { 'g': 1000 },
    'g':           { 'kg': 0.001 },
    'l':           { 'ml': 1000 },
    'ml':          { 'l': 0.001 },
    'cucchiai':    { 'ml': 15, 'g': 15 },
    'cucchiaini':  { 'ml': 5,  'g': 5  },
    'tazze':       { 'ml': 240, 'g': 240 }
};
