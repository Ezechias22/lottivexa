export function drawLabel(draw:{game?:{name?:string};resultAt?:string;drawNumber?:string},language:'ht'|'fr'){
 const source=draw.resultAt?new Date(draw.resultAt):null;
 if(!source||Number.isNaN(source.getTime()))return `${draw.game?.name??'Lotri'} · ${draw.drawNumber??''}`;
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Port-au-Prince',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(source);
 const hour=Number(time.slice(0,2));
 const period=hour<12?(language==='fr'?'Matin':'Maten'):hour<17?'Midi':hour<21?(language==='fr'?'Soir':'Swa'):(language==='fr'?'Nuit':'Lannuit');
 const date=new Intl.DateTimeFormat('fr-HT',{timeZone:'America/Port-au-Prince',day:'2-digit',month:'2-digit',year:'numeric'}).format(source);
 return `${draw.game?.name??'Lotri'} · ${period} · ${date} ${time} · ${draw.drawNumber??''}`;
}
