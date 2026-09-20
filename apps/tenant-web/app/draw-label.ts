type DrawLabel={drawNumber?:string;resultAt?:string;drawDate?:string;opensAt?:string;closesAt?:string;session?:string;sessionType?:string;game?:{name?:string}};
const zone='America/Port-au-Prince';
export function drawSessionLabel(draw:DrawLabel,language:'ht'|'fr'){
  const explicit=(draw.session??draw.sessionType??'').toUpperCase();
  const source=draw.resultAt??draw.closesAt??draw.opensAt??draw.drawDate;
  const date=source?new Date(source):null;
  const session=['MORNING','MATIN','MORNING_DRAW'].includes(explicit)?'MORNING':['EVENING','SOIR','EVENING_DRAW'].includes(explicit)?'EVENING':date&&!Number.isNaN(date.getTime())?(Number(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(date))<12?'MORNING':'EVENING'):'UNKNOWN';
  return session==='MORNING'?(language==='fr'?'Normal · Matin':'Nòmal · Maten'):session==='EVENING'?(language==='fr'?'Normal · Soir':'Nòmal · Swa'):(language==='fr'?'Séance à confirmer':'Sesyon pou verifye');
}
export function describeDraw(draw:DrawLabel,language:'ht'|'fr') {
  const source=draw.resultAt??draw.closesAt??draw.opensAt??draw.drawDate;
  const date=source?new Date(source):null;
  if(!date||Number.isNaN(date.getTime()))return`${draw.game?.name??(language==='fr'?'Loterie':'Lotri')} · ${draw.drawNumber??''}`;
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
  const formattedDate=new Intl.DateTimeFormat(language==='fr'?'fr-FR':'fr-HT',{timeZone:zone,day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
  return`${draw.game?.name??(language==='fr'?'Loterie':'Lotri')} · ${drawSessionLabel(draw,language)} · ${formattedDate} ${clock} · #${draw.drawNumber??''}`;
}
