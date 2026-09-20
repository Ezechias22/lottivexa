type DrawLabel={game?:{name?:string};resultAt?:string;opensAt?:string;closesAt?:string;drawNumber?:string;session?:string;sessionType?:string};
const zone='America/Port-au-Prince';
function sessionOf(draw:DrawLabel){const explicit=(draw.session??draw.sessionType??'').toUpperCase();if(['MORNING','MATIN','MORNING_DRAW'].includes(explicit))return'MORNING';if(['EVENING','SOIR','EVENING_DRAW'].includes(explicit))return'EVENING';const source=draw.resultAt??draw.closesAt??draw.opensAt;if(!source)return'UNKNOWN';const date=new Date(source);if(Number.isNaN(date.getTime()))return'UNKNOWN';const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(date));return hour<12?'MORNING':'EVENING'}
export function drawLabel(draw:DrawLabel,language:'ht'|'fr'){
 const source=draw.resultAt??draw.closesAt??draw.opensAt;
 const date=source?new Date(source):null;
 if(!date||Number.isNaN(date.getTime()))return`${draw.game?.name??(language==='fr'?'Loterie':'Lotri')} · ${draw.drawNumber??''}`;
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
 const period=sessionOf(draw)==='MORNING'?(language==='fr'?'Normal · Matin':'Nòmal · Maten'):sessionOf(draw)==='EVENING'?(language==='fr'?'Normal · Soir':'Nòmal · Swa'):(language==='fr'?'Séance à confirmer':'Sesyon pou verifye');
 const formattedDate=new Intl.DateTimeFormat(language==='fr'?'fr-FR':'fr-HT',{timeZone:zone,day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
 return`${draw.game?.name??(language==='fr'?'Loterie':'Lotri')} · ${period} · ${formattedDate} ${time} · #${draw.drawNumber??''}`;
}
export function drawSessionLabel(draw:DrawLabel,language:'ht'|'fr'){const session=sessionOf(draw);return session==='MORNING'?(language==='fr'?'Normal · Matin':'Nòmal · Maten'):session==='EVENING'?(language==='fr'?'Normal · Soir':'Nòmal · Swa'):(language==='fr'?'Séance à confirmer':'Sesyon pou verifye')}
