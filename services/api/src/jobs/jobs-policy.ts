export function nextSubscriptionStatus(periodEnd:Date,graceEnd:Date|null,now:Date){
  if(periodEnd>now)return null;
  if(!graceEnd||graceEnd>now)return 'PAST_DUE' as const;
  return 'SUSPENDED' as const;
}
export function retryDelay(attempt:number){return Math.min(3600,2**Math.min(Math.max(attempt,1),12))}
export function deliveryTarget(channel:string,user:{email:string|null;phone:string|null}|null,pushTokens:string[]){if(channel==='EMAIL')return user?.email?[user.email]:[];if(channel==='SMS')return user?.phone?[user.phone]:[];if(channel==='PUSH')return pushTokens;return[]}
export function localDateParts(date:Date,timeZone:string){const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),get=(type:string)=>parts.find(x=>x.type===type)!.value,dateKey=`${get('year')}-${get('month')}-${get('day')}`;return{date:dateKey,weekday:new Date(`${dateKey}T00:00:00Z`).getUTCDay()}}
export function zonedTimeToUtc(date:string,time:string,timeZone:string){const[y,m,d]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number),wanted=Date.UTC(y,m-1,d,hour,minute);let guess=wanted;for(let i=0;i<2;i++){const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)),get=(type:string)=>Number(parts.find(x=>x.type===type)!.value),seen=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'));guess+=wanted-seen}return new Date(guess)}
