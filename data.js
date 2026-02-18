function _vAlt(qty){
    return [
        {label:'Carote',qty,unit:'g'},
        {label:'Broccoli',qty,unit:'g'},
        {label:'Peperoni',qty,unit:'g'},
        {label:'Fagiolini',qty,unit:'g'},
        {label:'Insalata',qty:Math.round(qty*.75),unit:'g'},
        {label:'Rucola',qty:Math.round(qty*.5),unit:'g'},
        {label:'Pomodorini',qty,unit:'g'},
        {label:'Zucchine',qty,unit:'g'}
    ];
}

const unitConversions={
    'g':{'g':1,'kg':.001},'kg':{'g':1000,'kg':1},
    'ml':{'ml':1,'l':.001},'l':{'ml':1000,'l':1},
    'pezzi':{'pezzi':1},'pezzo':{'pezzo':1},
    'spicchi':{'spicchi':1},'fette':{'fette':1},
    'teste':{'teste':1},'mazzetti':{'mazzetti':1},
    'rametti':{'rametti':1},'confezioni':{'confezioni':1},
    'pacchi':{'pacchi':1},'scatole':{'scatole':1},
    'lattine':{'lattine':1},'vasetti':{'vasetti':1},
    'brick':{'brick':1},'bottiglie':{'bottiglie':1},
    'vaschette':{'vaschette':1},'buste':{'buste':1},
    'cespi':{'cespi':1},'filetti':{'filetti':1},
    'tranci':{'tranci':1},'forme':{'forme':1},
    'tavolette':{'tavolette':1},'petti':{'petti':1}
};

const pantryCategories=[
    {id:'cereali',label:'🌾 Cereali & Carboidrati',items:[
        {name:'Pasta integrale',icon:'🍝',units:['g','kg','pacchi'],step:50},
        {name:'Riso integrale',icon:'🍚',units:['g','kg','pacchi'],step:50},
        {name:'Pane integrale',icon:'🍞',units:['g','fette','pezzi'],step:10},
        {name:'Fiocchi avena',icon:'🌾',units:['g','kg','pacchi'],step:30},
        {name:'Farro soffiato',icon:'🌾',units:['g','pacchi'],step:20},
        {name:'Gnocchi',icon:'🥟',units:['g','kg','confezioni'],step:50},
        {name:'Purè fiocchi',icon:'🥔',units:['g','confezioni'],step:35},
        {name:'Wasa',icon:'🍘',units:['g','fette','pacchi'],step:20},
        {name:'Gallette',icon:'🍘',units:['g','pezzi','pacchi'],step:20},
        {name:'Pangrattato',icon:'🍞',units:['g','confezioni'],step:20}
    ]},
    {id:'proteine',label:'🥩 Proteine & Pesce',items:[
        {name:'Pollo',icon:'🍗',units:['g','kg','petti'],step:130},
        {name:'Tacchino',icon:'🦃',units:['g','kg','fette'],step:130},
        {name:'Merluzzo',icon:'🐟',units:['g','filetti','confezioni'],step:150},
        {name:'Salmone',icon:'🐠',units:['g','tranci','confezioni'],step:120},
        {name:'Orata',icon:'🐟',units:['g','pezzi','tranci'],step:100},
        {name:'Tonno vetro',icon:'🐟',units:['g','vasetti','scatole'],step:100},
        {name:'Polpo',icon:'🦑',units:['g','kg','confezioni'],step:200},
        {name:'Calamari',icon:'🦑',units:['g','kg','confezioni'],step:200},
        {name:'Salmone affumicato',icon:'🐠',units:['g','confezioni'],step:100},
        {name:'Uova',icon:'🥚',units:['pezzi','confezioni'],step:1},
        {name:'Legumi scatola',icon:'🫘',units:['g','scatole','lattine'],step:150},
        {name:'Tofu',icon:'🫘',units:['g','confezioni'],step:100}
    ]},
    {id:'latticini',label:'🥛 Latticini & Formaggi',items:[
        {name:'Latte ps',icon:'🥛',units:['ml','l','brick'],step:150},
        {name:'Yogurt greco',icon:'🥣',units:['g','vasetti','confezioni'],step:100},
        {name:'Skyr',icon:'🥛',units:['g','vasetti','confezioni'],step:100},
        {name:'Ricotta',icon:'🥛',units:['g','vaschette','confezioni'],step:100},
        {name:'Parmigiano',icon:'🧀',units:['g','kg','forme'],step:30},
        {name:'Formaggio light',icon:'🧀',units:['g','confezioni'],step:100},
        {name:'Kefir',icon:'🥛',units:['ml','l','bottiglie'],step:100}
    ]},
    {id:'verdure',label:'🥦 Verdure',items:[
        {name:'Zucchine',icon:'🥒',units:['g','kg','pezzi'],step:100},
        {name:'Carote',icon:'🥕',units:['g','kg','pezzi'],step:100},
        {name:'Broccoli',icon:'🥦',units:['g','kg','pezzi'],step:100},
        {name:'Peperoni',icon:'🫑',units:['g','kg','pezzi'],step:100},
        {name:'Fagiolini',icon:'🫛',units:['g','kg'],step:100},
        {name:'Insalata',icon:'🥗',units:['g','cespi','buste'],step:80},
        {name:'Rucola',icon:'🥬',units:['g','buste'],step:50},
        {name:'Pomodori pelati',icon:'🍅',units:['g','scatole','lattine'],step:200},
        {name:'Pomodorini',icon:'🍅',units:['g','kg','vaschette'],step:150}
    ]},
    {id:'frutta',label:'🍎 Frutta & Frutta Secca',items:[
        {name:'Banana',icon:'🍌',units:['pezzi','kg'],step:1},
        {name:'Mela',icon:'🍎',units:['pezzi','kg'],step:1},
        {name:'Limone',icon:'🍋',units:['pezzi','g'],step:1},
        {name:'Frutti di bosco',icon:'🫐',units:['g','vaschette','confezioni'],step:50},
        {name:'Frutta fresca',icon:'🍊',units:['g','kg','pezzi'],step:100},
        {name:'Mandorle',icon:'🌰',units:['g','pezzi','confezioni'],step:15},
        {name:'Noci',icon:'🌰',units:['g','pezzi','confezioni'],step:15},
        {name:'Nocciole',icon:'🌰',units:['g','pezzi'],step:15}
    ]},
    {id:'condimenti',label:'🫒 Condimenti & Salse',items:[
        {name:'Olio EVO',icon:'🫒',units:['ml','l','bottiglie'],step:10},
        {name:'Pesto',icon:'🌿',units:['g','vasetti','ml'],step:20},
        {name:'Hummus',icon:'🥙',units:['g','vasetti','confezioni'],step:30},
        {name:'Olive',icon:'🫒',units:['g','vasetti'],step:20},
        {name:'Capperi',icon:'🌿',units:['g','vasetti'],step:10},
        {name:'Miele',icon:'🍯',units:['g','ml','vasetti'],step:5},
        {name:'Marmellata s/z',icon:'🍓',units:['g','vasetti'],step:15},
        {name:'Aglio',icon:'🧄',units:['spicchi','teste','g'],step:1},
        {name:'Cipolla',icon:'🧅',units:['pezzi','g','kg'],step:1},
        {name:'Basilico',icon:'🌿',units:['g','mazzetti'],step:5},
        {name:'Rosmarino',icon:'🌿',units:['g','rametti'],step:3}
    ]},
    {id:'colazione',label:'☕ Colazione & Dolci',items:[
        {name:'Nocciolata',icon:'🍫',units:['g','vasetti'],step:10},
        {name:'Crema mandorle',icon:'🥜',units:['g','vasetti'],step:15},
        {name:'Burro arachidi',icon:'🥜',units:['g','vasetti'],step:15},
        {name:'Cioccolato fondente',icon:'🍫',units:['g','tavolette'],step:10},
        {name:'Cacao amaro',icon:'🍫',units:['g','confezioni'],step:5},
        {name:'Barretta cereali',icon:'🍫',units:['pezzi','confezioni'],step:1},
        {name:'Spezie varie',icon:'🌿',units:['g','confezioni'],step:5},
        {name:'Cannella',icon:'🌰',units:['g','confezioni'],step:2},
        {name:'Pepe nero',icon:'🌶️',units:['g','confezioni'],step:2}
    ]},
    {id:'grassi',label:'🥑 Grassi Buoni',items:[
        {name:'Avocado',icon:'🥑',units:['g','pezzi'],step:50}
    ]}
];

const allPantryItems=[];
pantryCategories.forEach(cat=>cat.items.forEach(item=>allPantryItems.push(item)));

const weeklyLimits={
    'uova':        {max:4, current:0,unit:'porzioni',icon:'🥚'},
    'carne_bianca':{max:3, current:0,unit:'volte',   icon:'🍗'},
    'carne_rossa': {max:1, current:0,unit:'volta',   icon:'🥩'},
    'affettati':   {max:1, current:0,unit:'volta',   icon:'🥓'},
    'pesce':       {max:4, current:0,unit:'volte',   icon:'🐟'},
    'molluschi':   {max:3, current:0,unit:'volte',   icon:'🦑'},
    'formaggi':    {max:3, current:0,unit:'volte',   icon:'🧀'},
    'patate':      {max:3, current:0,unit:'volte',   icon:'🥔'},
    'piadina':     {max:2, current:0,unit:'volte',   icon:'🫓'},
    'barrette':    {max:2, current:0,unit:'volte',   icon:'🍫'},
    'biscotti':    {max:3, current:0,unit:'volte',   icon:'🍪'}
};

const mealPlan={
    mattina:{
        colazione:{principale:[
            {label:'Pane integrale',qty:50,unit:'g',alternatives:[{label:'Gallette',qty:30,unit:'g'},{label:'Wasa',qty:25,unit:'g'},{label:'Fiocchi avena',qty:30,unit:'g',note:'Come porridge'}]},
            {label:'Latte ps',qty:150,unit:'ml',alternatives:[{label:'Yogurt greco',qty:100,unit:'g'},{label:'Skyr',qty:100,unit:'g'},{label:'Kefir',qty:150,unit:'ml'}]},
            {label:'Crema mandorle',qty:15,unit:'g',note:'Opzionale',alternatives:[{label:'Burro arachidi',qty:15,unit:'g'},{label:'Nocciolata',qty:10,unit:'g'},{label:'Marmellata s/z',qty:15,unit:'g'}]}
        ]},
        spuntino:{principale:[
            {label:'Frutta fresca',qty:1,unit:'pezzo',alternatives:[{label:'Mandorle',qty:15,unit:'g'},{label:'Noci',qty:15,unit:'g'},{label:'Nocciole',qty:15,unit:'g'},{label:'Crema mandorle',qty:15,unit:'g'}]}
        ]},
        pranzo:{principale:[
            {label:'Cereali integrali',qty:70,unit:'g',note:'Pasta/Riso',alternatives:[{label:'Patate',qty:300,unit:'g',limit:'patate'},{label:'Pane integrale',qty:80,unit:'g'},{label:'Gnocchi',qty:180,unit:'g',limit:'patate'}]},
            {label:'Pollo',qty:130,unit:'g',alternatives:[{label:'Tacchino',qty:130,unit:'g'},{label:'Carne rossa',qty:100,unit:'g',limit:'carne_rossa'},{label:'Merluzzo',qty:150,unit:'g',limit:'pesce'},{label:'Salmone',qty:120,unit:'g',limit:'pesce'},{label:'Tonno vetro',qty:100,unit:'g',limit:'pesce'},{label:'Legumi scatola',qty:150,unit:'g'},{label:'Formaggio light',qty:100,unit:'g',limit:'formaggi'},{label:'Uova',qty:2,unit:'pezzi',limit:'uova'},{label:'Tofu',qty:100,unit:'g'},{label:'Polpo',qty:200,unit:'g',limit:'molluschi'},{label:'Calamari',qty:200,unit:'g',limit:'molluschi'},{label:'Parmigiano',qty:30,unit:'g',limit:'formaggi'},{label:'Ricotta',qty:100,unit:'g'},{label:'Salmone affumicato',qty:100,unit:'g',limit:'pesce'}]},
            {label:'Zucchine',qty:200,unit:'g',note:'Metà piatto',alternatives:_vAlt(200).filter(v=>v.label!=='Zucchine')},
            {label:'Olio EVO',qty:10,unit:'g',alternatives:[{label:'Pesto',qty:20,unit:'g'},{label:'Avocado',qty:50,unit:'g'}]}
        ]},
        merenda:{principale:[
            {label:'Skyr',qty:100,unit:'g',alternatives:[{label:'Yogurt greco',qty:100,unit:'g'},{label:'Kefir',qty:100,unit:'ml'}]},
            {label:'Cioccolato fondente',qty:10,unit:'g',note:'Opzionale',alternatives:[{label:'Cacao amaro',qty:5,unit:'g'},{label:'Frutti di bosco',qty:50,unit:'g'}]}
        ]},
        cena:{principale:[
            {label:'Pane integrale',qty:60,unit:'g',alternatives:[{label:'Patate',qty:220,unit:'g',limit:'patate'},{label:'Purè fiocchi',qty:35,unit:'g',limit:'patate'},{label:'Gallette',qty:30,unit:'g'},{label:'Wasa',qty:25,unit:'g'}]},
            {label:'Merluzzo',qty:150,unit:'g',alternatives:[{label:'Salmone',qty:120,unit:'g',limit:'pesce'},{label:'Orata',qty:100,unit:'g',limit:'pesce'},{label:'Pollo',qty:130,unit:'g',limit:'carne_bianca'},{label:'Tacchino',qty:130,unit:'g',limit:'carne_bianca'},{label:'Carne rossa',qty:100,unit:'g',limit:'carne_rossa'},{label:'Tonno vetro',qty:100,unit:'g',limit:'pesce'},{label:'Legumi scatola',qty:150,unit:'g'},{label:'Formaggio light',qty:100,unit:'g',limit:'formaggi'},{label:'Uova',qty:2,unit:'pezzi',limit:'uova'},{label:'Tofu',qty:100,unit:'g'},{label:'Polpo',qty:200,unit:'g',limit:'molluschi'},{label:'Ricotta',qty:100,unit:'g'},{label:'Salmone affumicato',qty:100,unit:'g',limit:'pesce'}]},
            {label:'Broccoli',qty:200,unit:'g',note:'Metà piatto',alternatives:_vAlt(200).filter(v=>v.label!=='Broccoli')},
            {label:'Olio EVO',qty:10,unit:'ml',alternatives:[{label:'Avocado',qty:50,unit:'g'},{label:'Olive',qty:20,unit:'g'}]}
        ]}
    },
    pomeriggio:{
        colazione:{principale:[
            {label:'Fiocchi avena',qty:30,unit:'g',alternatives:[{label:'Muesli',qty:40,unit:'g'},{label:'Yogurt greco',qty:150,unit:'g',note:'In alternativa alla base'}]},
            {label:'Latte ps',qty:150,unit:'ml',alternatives:[{label:'Yogurt greco',qty:100,unit:'g'},{label:'Kefir',qty:150,unit:'ml'}]},
            {label:'Miele',qty:5,unit:'ml',alternatives:[{label:'Marmellata s/z',qty:10,unit:'g'},{label:'Frutta fresca',qty:80,unit:'g'}]},
            {label:'Frutta secca',qty:10,unit:'g',note:'Opzionale',alternatives:[{label:'Mandorle',qty:10,unit:'g'},{label:'Noci',qty:10,unit:'g'},{label:'Cioccolato fondente',qty:10,unit:'g'}]}
        ]},
        spuntino:{principale:[
            {label:'Frutta fresca',qty:1,unit:'pezzo',alternatives:[{label:'Barretta cereali',qty:1,unit:'pezzo',limit:'barrette'},{label:'Crema mandorle',qty:15,unit:'g'},{label:'Mandorle',qty:10,unit:'g'},{label:'Noci',qty:10,unit:'g'}]}
        ]},
        pranzo:{principale:[
            {label:'Cereali integrali',qty:70,unit:'g',alternatives:[{label:'Patate',qty:300,unit:'g',limit:'patate'},{label:'Pane integrale',qty:80,unit:'g'},{label:'Gnocchi',qty:180,unit:'g',limit:'patate'}]},
            {label:'Pollo',qty:130,unit:'g',alternatives:[{label:'Tacchino',qty:130,unit:'g'},{label:'Carne rossa',qty:100,unit:'g',limit:'carne_rossa'},{label:'Merluzzo',qty:150,unit:'g',limit:'pesce'},{label:'Salmone',qty:120,unit:'g',limit:'pesce'},{label:'Tonno vetro',qty:100,unit:'g',limit:'pesce'},{label:'Legumi scatola',qty:150,unit:'g'},{label:'Formaggio light',qty:100,unit:'g',limit:'formaggi'},{label:'Uova',qty:2,unit:'pezzi',limit:'uova'},{label:'Tofu',qty:100,unit:'g'},{label:'Polpo',qty:200,unit:'g',limit:'molluschi'},{label:'Parmigiano',qty:30,unit:'g',limit:'formaggi'},{label:'Ricotta',qty:100,unit:'g'}]},
            {label:'Peperoni',qty:200,unit:'g',note:'Metà piatto',alternatives:_vAlt(200).filter(v=>v.label!=='Peperoni')},
            {label:'Olio EVO',qty:10,unit:'ml',alternatives:[{label:'Pesto',qty:20,unit:'g'},{label:'Avocado',qty:50,unit:'g'}]}
        ]},
        merenda:{principale:[
            {label:'Pane integrale',qty:60,unit:'g',alternatives:[{label:'Patate',qty:220,unit:'g',limit:'patate'},{label:'Purè fiocchi',qty:35,unit:'g',limit:'patate'},{label:'Gallette',qty:30,unit:'g'},{label:'Wasa',qty:25,unit:'g'}]},
            {label:'Merluzzo',qty:150,unit:'g',alternatives:[{label:'Salmone',qty:120,unit:'g',limit:'pesce'},{label:'Pollo',qty:130,unit:'g',limit:'carne_bianca'},{label:'Uova',qty:2,unit:'pezzi',limit:'uova'},{label:'Legumi scatola',qty:150,unit:'g'},{label:'Formaggio light',qty:100,unit:'g',limit:'formaggi'},{label:'Ricotta',qty:100,unit:'g'},{label:'Tonno vetro',qty:100,unit:'g',limit:'pesce'},{label:'Tofu',qty:100,unit:'g'}]},
            {label:'Carote',qty:200,unit:'g',note:'Metà piatto',alternatives:_vAlt(200).filter(v=>v.label!=='Carote')},
            {label:'Olio EVO',qty:10,unit:'ml',alternatives:[{label:'Avocado',qty:50,unit:'g'},{label:'Olive',qty:20,unit:'g'}]}
        ]},
        cena:{principale:[
            {label:'Skyr',qty:100,unit:'g',alternatives:[{label:'Yogurt greco',qty:100,unit:'g'},{label:'Kefir',qty:100,unit:'ml'}]},
            {label:'Barretta cereali',qty:1,unit:'pezzo',note:'Max 2/settimana',alternatives:[{label:'Cioccolato fondente',qty:10,unit:'g'},{label:'Frutta fresca',qty:80,unit:'g'}]}
        ]}
    },
    notte1:{
        colazione:{principale:[
            {label:'Fiocchi avena',qty:30,unit:'g',alternatives:[{label:'Muesli',qty:40,unit:'g'},{label:'Yogurt greco',qty:150,unit:'g'}]},
            {label:'Latte ps',qty:150,unit:'ml',alternatives:[{label:'Yogurt greco',qty:100,unit:'g'},{label:'Kefir',qty:150,unit:'ml'}]},
            {label:'Banana',qty:1,unit:'pezzo',alternatives:[{label:'Frutta fresca',qty:100,unit:'g'},{label:'Frutti di bosco',qty:80,unit:'g'}]},
            {label:'Crema mandorle',qty:15,unit:'g',alternatives:[{label:'Burro arachidi',qty:15,unit:'g'},{label:'Cioccolato fondente',qty:15,unit:'g'},{label:'Cacao amaro',qty:10,unit:'g'}]}
        ]},
        spuntino:{principale:[]},
        pranzo:{principale:[
            {label:'Cereali integrali',qty:70,unit:'g',alternatives:[{label:'Patate',qty:300,unit:'g',limit:'patate'},{label:'Pane integrale',qty:80,unit:'g'},{label:'Gnocchi',qty:180,unit:'g',limit:'patate'}]},
            {label:'Pollo',qty:130,unit:'g',alternatives:[{label:'Tacchino',qty:130,unit:'g'},{label:'Carne rossa',qty:100,unit:'g',limit:'carne_rossa'},{label:'Merluzzo',qty:150,unit:'g',limit:'pesce'},{label:'Salmone',qty:120,unit:'g',limit:'pesce'},{label:'Tonno vetro',qty:100,unit:'g',limit:'pesce'},{label:'Legumi scatola',qty:150,unit:'g'},{label:'Formaggio light',qty:100,unit:'g',limit:'formaggi'},{label:'Uova',qty:2,unit:'pezzi',limit:'uova'},{label:'Tofu',qty:100,unit:'g'},{label:'Polpo',qty:200,unit:'g',limit:'molluschi'},{label:'Parmigiano',qty:30,unit:'g',limit:'formaggi'},{label:'Ricotta',qty:100,unit:'g'}]},
            {label:'Fagiolini',qty:200,unit:'g',note:'Metà piatto',alternatives:_vAlt(200).filter(v=>v.label!=='Fagiolini')},
            {label:'Olio EVO',qty:10,unit:'ml',alternatives:[{label:'Pesto',qty:20,unit:'g'},{label:'Avocado',qty:50,unit:'g'}]}
        ]},
        merenda:{principale:[
            {label:'Wasa',qty:20,unit:'g',alternatives:[{label:'Gallette',qty:20,unit:'g'},{label:'Pane integrale',qty:40,unit:'g'}]},
            {label:'Hummus',qty:30,unit:'g',alternatives:[{label:'Parmigiano',qty:20,unit:'g',limit:'formaggi'},{label:'Ricotta',qty:50,unit:'g'},{label:'Crema mandorle',qty:15,unit:'g'}]}
        ]},
        cena:{principale:[
            {label:'Pane integrale',qty:60,unit:'g',alternatives:[{label:'Patate',qty:220,unit:'g',limit:'patate'},{label:'Purè fiocchi',qty:35,unit:'g',limit:'patate'},{label:'Gallette',qty:30,unit:'g'},{label:'Wasa',qty:25,unit:'g'}]},
            {label:'Merluzzo',qty:150,unit:'g',alternatives:[{label:'Salmone',qty:120,unit:'g',limit:'pesce'},{label:'Orata',qty:100,unit:'g',limit:'pesce'},{label:'Pollo',qty:130,unit:'g',limit:'carne_bianca'},{label:'Tacchino',qty:130,unit:'g',limit:'carne_bianca'},{label:'Carne rossa',qty:100,unit:'g',limit:'carne_rossa'},{label:'Tonno vetro',qty:100,unit:'g',limit:'pesce'},{label:'Legumi scatola',qty:150,unit:'g'},{label:'Uova',qty:2,unit:'pezzi',limit:'uova'},{label:'Formaggio light',qty:100,unit:'g',limit:'formaggi'},{label:'Ricotta',qty:100,unit:'g'},{label:'Tofu',qty:100,unit:'g'},{label:'Polpo',qty:200,unit:'g',limit:'molluschi'},{label:'Salmone affumicato',qty:100,unit:'g',limit:'pesce'}]},
            {label:'Insalata',qty:200,unit:'g',note:'Metà piatto',alternatives:_vAlt(200).filter(v=>v.label!=='Insalata')},
            {label:'Olio EVO',qty:10,unit:'ml',alternatives:[{label:'Avocado',qty:50,unit:'g'},{label:'Olive',qty:20,unit:'g'}]}
        ]}
    },
    notte2:{
        colazione:{principale:[
            {label:'Yogurt greco',qty:150,unit:'g',alternatives:[{label:'Latte ps',qty:200,unit:'ml'},{label:'Kefir',qty:150,unit:'ml'},{label:'Skyr',qty:150,unit:'g'}]},
            {label:'Farro soffiato',qty:20,unit:'g',alternatives:[{label:'Fiocchi avena',qty:30,unit:'g'},{label:'Muesli',qty:40,unit:'g'}]},
            {label:'Frutta fresca',qty:1,unit:'pezzo',alternatives:[{label:'Frutti di bosco',qty:80,unit:'g'},{label:'Banana',qty:1,unit:'pezzo'}]},
            {label:'Crema mandorle',qty:10,unit:'g',note:'Opzionale',alternatives:[{label:'Miele',qty:5,unit:'g'},{label:'Cioccolato fondente',qty:10,unit:'g'}]}
        ]},
        spuntino:{principale:[]},
        pranzo:{principale:[
            {label:'Cereali integrali',qty:70,unit:'g',alternatives:[{label:'Patate',qty:300,unit:'g',limit:'patate'},{label:'Pane integrale',qty:80,unit:'g'},{label:'Gnocchi',qty:180,unit:'g',limit:'patate'}]},
            {label:'Pollo',qty:130,unit:'g',alternatives:[{label:'Tacchino',qty:130,unit:'g'},{label:'Carne rossa',qty:100,unit:'g',limit:'carne_rossa'},{label:'Merluzzo',qty:150,unit:'g',limit:'pesce'},{label:'Salmone',qty:120,unit:'g',limit:'pesce'},{label:'Tonno vetro',qty:100,unit:'g',limit:'pesce'},{label:'Legumi scatola',qty:150,unit:'g'},{label:'Formaggio light',qty:100,unit:'g',limit:'formaggi'},{label:'Uova',qty:2,unit:'pezzi',limit:'uova'},{label:'Tofu',qty:100,unit:'g'},{label:'Polpo',qty:200,unit:'g',limit:'molluschi'},{label:'Parmigiano',qty:30,unit:'g',limit:'formaggi'},{label:'Avocado',qty:60,unit:'g'},{label:'Ricotta',qty:100,unit:'g'}]},
            {label:'Zucchine',qty:200,unit:'g',note:'Metà piatto',alternatives:_vAlt(200).filter(v=>v.label!=='Zucchine')},
            {label:'Olio EVO',qty:10,unit:'ml',alternatives:[{label:'Pesto',qty:20,unit:'g'},{label:'Avocado',qty:60,unit:'g'}]}
        ]},
        merenda:{principale:[]},
        cena:{principale:[
            {label:'Pane integrale',qty:60,unit:'g',alternatives:[{label:'Patate',qty:220,unit:'g',limit:'patate'},{label:'Purè fiocchi',qty:35,unit:'g',limit:'patate'},{label:'Gallette',qty:30,unit:'g'},{label:'Wasa',qty:25,unit:'g'}]},
            {label:'Merluzzo',qty:150,unit:'g',alternatives:[{label:'Salmone',qty:120,unit:'g',limit:'pesce'},{label:'Orata',qty:100,unit:'g',limit:'pesce'},{label:'Pollo',qty:130,unit:'g',limit:'carne_bianca'},{label:'Tacchino',qty:130,unit:'g',limit:'carne_bianca'},{label:'Carne rossa',qty:100,unit:'g',limit:'carne_rossa'},{label:'Tonno vetro',qty:100,unit:'g',limit:'pesce'},{label:'Legumi scatola',qty:150,unit:'g'},{label:'Uova',qty:2,unit:'pezzi',limit:'uova'},{label:'Formaggio light',qty:100,unit:'g',limit:'formaggi'},{label:'Ricotta',qty:100,unit:'g'},{label:'Tofu',qty:100,unit:'g'},{label:'Polpo',qty:200,unit:'g',limit:'molluschi'},{label:'Calamari',qty:250,unit:'g',limit:'molluschi'},{label:'Salmone affumicato',qty:100,unit:'g',limit:'pesce'}]},
            {label:'Broccoli',qty:200,unit:'g',note:'Metà piatto',alternatives:_vAlt(200).filter(v=>v.label!=='Broccoli')},
            {label:'Olio EVO',qty:10,unit:'ml',alternatives:[{label:'Avocado',qty:50,unit:'g'},{label:'Olive',qty:20,unit:'g'}]}
        ]}
    }
};

const allRecipes={
    colazione:[
        {name:'Toast Integrale con Crema di Mandorle',ingredients:[{name:'Pane integrale',quantity:50,unit:'g'},{name:'Crema mandorle',quantity:15,unit:'g'},{name:'Latte ps',quantity:150,unit:'ml'}],instructions:'Tosta il pane integrale. Spalma la crema di mandorle sul pane caldo. Accompagna con latte.',limits:[]},
        {name:'Porridge alla Banana',ingredients:[{name:'Fiocchi avena',quantity:30,unit:'g'},{name:'Latte ps',quantity:150,unit:'ml'},{name:'Banana',quantity:1,unit:'pezzi'},{name:'Miele',quantity:5,unit:'ml'}],instructions:'Scalda il latte, aggiungi i fiocchi di avena e cuoci 5-7 minuti. Aggiungi la banana a fette e il miele.',limits:[]},
        {name:'Yogurt Bowl con Cereali',ingredients:[{name:'Yogurt greco',quantity:150,unit:'g'},{name:'Farro soffiato',quantity:20,unit:'g'},{name:'Frutti di bosco',quantity:50,unit:'g'},{name:'Miele',quantity:5,unit:'g'}],instructions:'Versa lo yogurt in una ciotola. Aggiungi il farro soffiato, i frutti di bosco e un filo di miele.',limits:[]},
        {name:'Pane con Nocciolata',ingredients:[{name:'Pane integrale',quantity:50,unit:'g'},{name:'Nocciolata',quantity:10,unit:'g'},{name:'Latte ps',quantity:150,unit:'ml'}],instructions:'Spalma la nocciolata sul pane integrale. Accompagna con un bicchiere di latte.',limits:[]},
        {name:'Pancake Avena e Banana',ingredients:[{name:'Fiocchi avena',quantity:30,unit:'g'},{name:'Banana',quantity:1,unit:'pezzi'},{name:'Uova',quantity:1,unit:'pezzi'},{name:'Cannella',quantity:2,unit:'g'}],instructions:'Frulla avena, banana e uovo. Cuoci piccoli pancake in padella. Servi con cannella.',limits:['uova']}
    ],
    spuntino:[
        {name:'Mela e Mandorle',ingredients:[{name:'Mela',quantity:1,unit:'pezzi'},{name:'Mandorle',quantity:15,unit:'g'}],instructions:'Taglia la mela a fette. Accompagna con mandorle non salate.',limits:[]},
        {name:'Banana con Burro Arachidi',ingredients:[{name:'Banana',quantity:1,unit:'pezzi'},{name:'Burro arachidi',quantity:15,unit:'g'}],instructions:'Taglia la banana a rondelle e spalma il burro di arachidi.',limits:[]},
        {name:'Mix Frutta Secca',ingredients:[{name:'Mandorle',quantity:7,unit:'g'},{name:'Noci',quantity:5,unit:'g'},{name:'Nocciole',quantity:3,unit:'g'}],instructions:'Prepara un mix di frutta secca non salata per circa 15g totali.',limits:[]},
        {name:'Barretta Cereali',ingredients:[{name:'Barretta cereali',quantity:1,unit:'pezzi'}],instructions:'Consuma una barretta ai cereali. Massimo 2 volte a settimana.',limits:['barrette']}
    ],
    pranzo:[
        {name:'Pasta al Pomodoro con Pollo',ingredients:[{name:'Pasta integrale',quantity:70,unit:'g'},{name:'Pollo',quantity:130,unit:'g'},{name:'Pomodori pelati',quantity:200,unit:'g'},{name:'Basilico',quantity:5,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Zucchine',quantity:150,unit:'g'}],instructions:'Cuoci la pasta. Rosola il pollo a straccetti, aggiungi pomodori e basilico. Manteca con la pasta. Servi con zucchine grigliate.',limits:['carne_bianca']},
        {name:'Riso Integrale con Salmone',ingredients:[{name:'Riso integrale',quantity:70,unit:'g'},{name:'Salmone',quantity:120,unit:'g'},{name:'Zucchine',quantity:100,unit:'g'},{name:'Carote',quantity:100,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Limone',quantity:1,unit:'pezzi'}],instructions:'Cuoci il riso. Cuoci il salmone al forno con limone 15 min. Salta le verdure.',limits:['pesce']},
        {name:'Gnocchi al Pesto',ingredients:[{name:'Gnocchi',quantity:180,unit:'g'},{name:'Pesto',quantity:20,unit:'g'},{name:'Fagiolini',quantity:200,unit:'g'},{name:'Parmigiano',quantity:10,unit:'g'}],instructions:'Cuoci gli gnocchi. Lessa i fagiolini al vapore. Condisci con pesto e parmigiano.',limits:['patate']},
        {name:'Pasta con Tonno',ingredients:[{name:'Pasta integrale',quantity:70,unit:'g'},{name:'Tonno vetro',quantity:100,unit:'g'},{name:'Pomodorini',quantity:150,unit:'g'},{name:'Olive',quantity:30,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Insalata',quantity:100,unit:'g'}],instructions:'Cuoci la pasta. Unisci tonno, pomodorini, olive. Manteca e servi con insalata.',limits:['pesce']},
        {name:'Pasta Cacio e Pepe',ingredients:[{name:'Pasta integrale',quantity:70,unit:'g'},{name:'Parmigiano',quantity:30,unit:'g'},{name:'Pepe nero',quantity:2,unit:'g'},{name:'Broccoli',quantity:200,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'}],instructions:'Cuoci la pasta. Manteca con parmigiano, pepe e acqua di cottura. Servi con broccoli al vapore.',limits:['formaggi']},
        {name:'Pasta e Legumi',ingredients:[{name:'Pasta integrale',quantity:70,unit:'g'},{name:'Legumi scatola',quantity:150,unit:'g'},{name:'Pomodori pelati',quantity:100,unit:'g'},{name:'Rosmarino',quantity:2,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Carote',quantity:100,unit:'g'}],instructions:'Cuoci la pasta. Prepara un soffritto con legumi, pomodoro e rosmarino. Manteca. Servi con carote.',limits:[]},
        {name:'Frittata di Pasta',ingredients:[{name:'Pasta integrale',quantity:70,unit:'g'},{name:'Uova',quantity:2,unit:'pezzi'},{name:'Zucchine',quantity:100,unit:'g'},{name:'Peperoni',quantity:100,unit:'g'},{name:'Parmigiano',quantity:20,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'}],instructions:'Cuoci la pasta. Sbatti uova con parmigiano. Salta le verdure. Cuoci la frittata.',limits:['uova']},
        {name:'Riso con Pollo e Verdure',ingredients:[{name:'Riso integrale',quantity:70,unit:'g'},{name:'Pollo',quantity:130,unit:'g'},{name:'Peperoni',quantity:100,unit:'g'},{name:'Zucchine',quantity:100,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Spezie varie',quantity:3,unit:'g'}],instructions:'Cuoci il riso. Rosola il pollo con spezie. Salta le verdure. Componi il piatto.',limits:['carne_bianca']}
    ],
    merenda:[
        {name:'Skyr con Cioccolato',ingredients:[{name:'Skyr',quantity:100,unit:'g'},{name:'Cioccolato fondente',quantity:10,unit:'g'}],instructions:'Versa lo skyr in una ciotola. Grattugia il cioccolato fondente 70% sopra.',limits:[]},
        {name:'Wasa con Hummus',ingredients:[{name:'Wasa',quantity:20,unit:'g'},{name:'Hummus',quantity:30,unit:'g'},{name:'Pomodorini',quantity:50,unit:'g'},{name:'Rucola',quantity:20,unit:'g'}],instructions:'Spalma l\'hummus sulle fette di wasa. Aggiungi pomodorini e rucola fresca.',limits:[]},
        {name:'Yogurt con Cacao',ingredients:[{name:'Yogurt greco',quantity:100,unit:'g'},{name:'Cacao amaro',quantity:5,unit:'g'}],instructions:'Mescola lo yogurt greco con il cacao amaro.',limits:[]},
        {name:'Gallette con Ricotta e Miele',ingredients:[{name:'Gallette',quantity:20,unit:'g'},{name:'Ricotta',quantity:50,unit:'g'},{name:'Miele',quantity:5,unit:'g'}],instructions:'Spalma la ricotta sulle gallette. Completa con un filo di miele.',limits:[]}
    ],
    cena:[
        {name:'Merluzzo al Forno con Patate',ingredients:[{name:'Merluzzo',quantity:150,unit:'g'},{name:'Patate',quantity:220,unit:'g'},{name:'Rosmarino',quantity:3,unit:'g'},{name:'Aglio',quantity:1,unit:'spicchi'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Insalata',quantity:100,unit:'g'}],instructions:'Patate a spicchi con rosmarino a 200°C per 20 min, aggiungi merluzzo con olio e aglio per altri 15 min.',limits:['pesce','patate']},
        {name:'Frittata con Verdure',ingredients:[{name:'Uova',quantity:2,unit:'pezzi'},{name:'Zucchine',quantity:150,unit:'g'},{name:'Peperoni',quantity:100,unit:'g'},{name:'Pane integrale',quantity:60,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Insalata',quantity:100,unit:'g'}],instructions:'Sbatti le uova. Salta le verdure a dadini. Cuoci la frittata coperta. Servi con pane e insalata.',limits:['uova']},
        {name:'Pollo alla Piastra con Purè',ingredients:[{name:'Pollo',quantity:130,unit:'g'},{name:'Purè fiocchi',quantity:35,unit:'g'},{name:'Latte ps',quantity:120,unit:'ml'},{name:'Broccoli',quantity:150,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'}],instructions:'Cuoci il petto di pollo alla piastra. Prepara il purè con latte. Cuoci i broccoli al vapore.',limits:['carne_bianca','patate']},
        {name:'Salmone con Verdure al Vapore',ingredients:[{name:'Salmone',quantity:120,unit:'g'},{name:'Broccoli',quantity:150,unit:'g'},{name:'Carote',quantity:100,unit:'g'},{name:'Pane integrale',quantity:60,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Limone',quantity:1,unit:'pezzi'}],instructions:'Cuoci il salmone al forno con limone a 180°C per 15 min. Cuoci le verdure al vapore.',limits:['pesce']},
        {name:'Polpette di Legumi',ingredients:[{name:'Legumi scatola',quantity:150,unit:'g'},{name:'Pangrattato',quantity:20,unit:'g'},{name:'Spezie varie',quantity:3,unit:'g'},{name:'Pane integrale',quantity:60,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Insalata',quantity:150,unit:'g'}],instructions:'Frulla legumi con spezie e pangrattato. Forma polpette e cuoci in forno a 180°C per 20 min.',limits:[]},
        {name:'Tacchino con Patate al Forno',ingredients:[{name:'Tacchino',quantity:130,unit:'g'},{name:'Patate',quantity:220,unit:'g'},{name:'Rosmarino',quantity:3,unit:'g'},{name:'Fagiolini',quantity:150,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'}],instructions:'Cuoci patate e tacchino al forno con rosmarino a 200°C per 30 min. Lessa i fagiolini.',limits:['carne_bianca','patate']},
        {name:'Orata al Cartoccio',ingredients:[{name:'Orata',quantity:100,unit:'g'},{name:'Pomodorini',quantity:100,unit:'g'},{name:'Olive',quantity:20,unit:'g'},{name:'Capperi',quantity:10,unit:'g'},{name:'Pane integrale',quantity:60,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Insalata',quantity:100,unit:'g'}],instructions:'Prepara un cartoccio con orata, pomodorini, olive e capperi. Cuoci a 180°C per 20 min.',limits:['pesce']},
        {name:'Tofu Saltato con Verdure',ingredients:[{name:'Tofu',quantity:100,unit:'g'},{name:'Peperoni',quantity:100,unit:'g'},{name:'Zucchine',quantity:100,unit:'g'},{name:'Carote',quantity:80,unit:'g'},{name:'Olio EVO',quantity:10,unit:'ml'},{name:'Spezie varie',quantity:3,unit:'g'},{name:'Pane integrale',quantity:60,unit:'g'}],instructions:'Rosola il tofu a cubetti con spezie. Salta le verdure a julienne. Servi con pane integrale.',limits:[]}
    ]
};
