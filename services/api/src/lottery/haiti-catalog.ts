export type HaitiCatalogDraw={code:string;name:string;opensAt:string;closesAt:string;resultAt:string;weekdays:number[];timezone?:string};
export type HaitiCatalogGame={catalogCode:string;code:string;name:string;logoUrl:string;provider:string;sourceUrl?:string;sourceVerifiedAt?:string;draws:HaitiCatalogDraw[]};

const daily=[0,1,2,3,4,5,6];
const weekday=[1,2,3,4,5,6];
export const HAITI_LOTTERY_CATALOG:HaitiCatalogGame[]=[
 {catalogCode:'US-NY',code:'NY',name:'New York',logoUrl:'',provider:'NEW_YORK_OFFICIAL',sourceUrl:'https://nylottery.ny.gov/draw-games',sourceVerifiedAt:'2026-09-08T00:00:00Z',draws:[{code:'MID',name:'Midi',opensAt:'00:00',closesAt:'14:15',resultAt:'14:30',weekdays:daily},{code:'EVE',name:'Aswè',opensAt:'14:31',closesAt:'22:20',resultAt:'22:30',weekdays:daily}]},
 {catalogCode:'US-FL',code:'FL',name:'Florida',logoUrl:'',provider:'FLORIDA_OFFICIAL',sourceUrl:'https://floridalottery.com/help',sourceVerifiedAt:'2026-09-08T00:00:00Z',draws:[{code:'MID',name:'Midi',opensAt:'00:00',closesAt:'13:17',resultAt:'13:30',weekdays:daily},{code:'EVE',name:'Aswè',opensAt:'13:31',closesAt:'21:32',resultAt:'21:45',weekdays:daily}]},
 {catalogCode:'US-GA',code:'GA',name:'Georgia',logoUrl:'',provider:'GEORGIA_OFFICIAL',sourceUrl:'https://www.galottery.com/en-us/player-zone/player-faqs.html',sourceVerifiedAt:'2026-09-08T00:00:00Z',draws:[{code:'MID',name:'Midi',opensAt:'04:00',closesAt:'12:20',resultAt:'12:29',weekdays:daily},{code:'EVE',name:'Aswè',opensAt:'12:30',closesAt:'18:50',resultAt:'18:59',weekdays:daily},{code:'NIGHT',name:'Nuit',opensAt:'19:00',closesAt:'22:45',resultAt:'23:34',weekdays:daily}]},
 {catalogCode:'US-NJ',code:'NJ',name:'New Jersey',logoUrl:'',provider:'NEW_JERSEY_OFFICIAL',draws:[{code:'MID',name:'Midi',opensAt:'00:00',closesAt:'12:50',resultAt:'12:59',weekdays:daily},{code:'EVE',name:'Aswè',opensAt:'13:00',closesAt:'22:47',resultAt:'22:57',weekdays:daily}]},
 {catalogCode:'US-CT',code:'CT',name:'Connecticut',logoUrl:'',provider:'CONNECTICUT_OFFICIAL',draws:[{code:'DAY',name:'Jounen',opensAt:'00:00',closesAt:'13:50',resultAt:'14:00',weekdays:daily},{code:'NIGHT',name:'Nuit',opensAt:'14:01',closesAt:'22:20',resultAt:'22:29',weekdays:daily}]},
 {catalogCode:'US-PA',code:'PA',name:'Pennsylvania',logoUrl:'',provider:'PENNSYLVANIA_OFFICIAL',draws:[{code:'DAY',name:'Jounen',opensAt:'00:00',closesAt:'13:25',resultAt:'13:35',weekdays:daily},{code:'EVE',name:'Aswè',opensAt:'13:36',closesAt:'18:50',resultAt:'18:59',weekdays:daily}]},
 {catalogCode:'US-MD',code:'MD',name:'Maryland',logoUrl:'',provider:'MARYLAND_OFFICIAL',draws:[{code:'MID',name:'Midi',opensAt:'00:00',closesAt:'12:20',resultAt:'12:30',weekdays:daily},{code:'EVE',name:'Aswè',opensAt:'12:31',closesAt:'19:50',resultAt:'20:00',weekdays:daily}]},
 {catalogCode:'US-VA',code:'VA',name:'Virginia',logoUrl:'',provider:'VIRGINIA_OFFICIAL',draws:[{code:'DAY',name:'Jounen',opensAt:'00:00',closesAt:'13:50',resultAt:'14:00',weekdays:daily},{code:'NIGHT',name:'Nuit',opensAt:'14:01',closesAt:'22:50',resultAt:'23:00',weekdays:daily}]},
 {catalogCode:'US-TN',code:'TN',name:'Tennessee',logoUrl:'',provider:'TENNESSEE_OFFICIAL',draws:[{code:'MID',name:'Midi',opensAt:'00:00',closesAt:'12:20',resultAt:'12:28',weekdays:daily},{code:'EVE',name:'Aswè',opensAt:'12:29',closesAt:'18:20',resultAt:'18:28',weekdays:daily}]},
 {catalogCode:'US-TX',code:'TX',name:'Texas',logoUrl:'',provider:'TEXAS_OFFICIAL',sourceUrl:'https://www.texaslottery.com/export/sites/lottery/Games/Pick_3/',sourceVerifiedAt:'2026-09-10T00:00:00Z',draws:[{code:'MORNING',name:'Texas Morning',opensAt:'00:00',closesAt:'09:50',resultAt:'10:00',weekdays:weekday,timezone:'America/Chicago'},{code:'DAY',name:'Texas Day',opensAt:'10:01',closesAt:'12:17',resultAt:'12:27',weekdays:weekday,timezone:'America/Chicago'},{code:'EVENING',name:'Texas Evening',opensAt:'12:28',closesAt:'17:50',resultAt:'18:00',weekdays:weekday,timezone:'America/Chicago'},{code:'NIGHT',name:'Texas Night',opensAt:'18:01',closesAt:'22:02',resultAt:'22:12',weekdays:weekday,timezone:'America/Chicago'}]},
 {catalogCode:'DO-NACIONAL',code:'LN',name:'Lotería Nacional Dominicana',logoUrl:'',provider:'DOMINICAN_OFFICIAL',draws:[{code:'NIGHT',name:'Aswè',opensAt:'00:00',closesAt:'20:40',resultAt:'21:00',weekdays:daily}]},
 {catalogCode:'DO-LEIDSA',code:'LEIDSA',name:'Leidsa',logoUrl:'',provider:'DOMINICAN_OFFICIAL',draws:[{code:'NIGHT',name:'Aswè',opensAt:'00:00',closesAt:'20:40',resultAt:'21:00',weekdays:[3,6]}]},
];

export const HAITI_BET_TYPES=[
 {code:'BOLET',name:'Bolèt',selectionCount:1,numberMin:0,numberMax:99,allowRepeats:true,multiplier:'60'},
 {code:'BOUL_PE',name:'Boul Pè',selectionCount:1,numberMin:0,numberMax:99,allowRepeats:true,multiplier:'60'},
 {code:'MARYAJ',name:'Maryaj',selectionCount:2,numberMin:0,numberMax:99,allowRepeats:false,multiplier:'1000'},
 {code:'LOTO3',name:'Loto 3',selectionCount:1,numberMin:0,numberMax:999,allowRepeats:true,multiplier:'500'},
 {code:'LOTO4',name:'Loto 4',selectionCount:1,numberMin:0,numberMax:9999,allowRepeats:true,multiplier:'5000'},
 {code:'LOTO5',name:'Loto 5',selectionCount:1,numberMin:0,numberMax:99999,allowRepeats:true,multiplier:'50000'},
];
