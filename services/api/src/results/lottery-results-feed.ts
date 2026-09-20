import {createHmac,timingSafeEqual} from 'node:crypto';

export type LotteryResultsFeedEvent={
  version?:string;
  event:string;
  lottery_id?:number;
  lottery_name?:string;
  country?:string;
  draw_date?:string;
  draw_type?:string|null;
  numbers?:number[];
  bonus_numbers?:number[];
  jackpot?:number|null;
  prize_breakdown?:unknown;
  extra_draws?:unknown[];
  published_at?:string;
};

export type FeedBinding={
  catalogCode:string;
  lotteryId:number;
  drawTimes:Record<string,string>;
};

export function mapLotteryResultsFeedRestRow(row:Record<string,unknown>,lotteryId:number):LotteryResultsFeedEvent{
  const numbers=row.numbers??row.winning_numbers??row.balls;
  return{
    version:'1.0',event:'lottery.result.published',lottery_id:lotteryId,
    lottery_name:String(row.lottery_name??(row.lottery as Record<string,unknown>|undefined)?.name??''),
    draw_date:String(row.draw_date??row.date??''),draw_type:typeof row.draw_type==='string'?row.draw_type:null,
    numbers:Array.isArray(numbers)?numbers as number[]:undefined,
    published_at:String(row.published_at??row.result_published_at??row.updated_at??new Date().toISOString()),
  };
}

export function verifyLotteryResultsFeedSignature(raw:Buffer,signature:string|undefined,secret:string){
  if(!signature||!secret)return false;
  const expected=Buffer.from(createHmac('sha256',secret).update(raw).digest('hex'));
  const received=Buffer.from(signature.trim().toLowerCase().replace(/^sha256=/,''));
  return expected.length===received.length&&timingSafeEqual(expected,received);
}

export function parseLotteryResultsFeedEvent(raw:Buffer):LotteryResultsFeedEvent{
  const value=JSON.parse(raw.toString('utf8')) as LotteryResultsFeedEvent;
  if(value.event==='test')return value;
  if(value.event!=='lottery.result.published'||!Number.isInteger(value.lottery_id)||!/^\d{4}-\d{2}-\d{2}$/.test(value.draw_date??'')||!Array.isArray(value.numbers)||!value.numbers.length||value.numbers.some(x=>!Number.isInteger(x)||x<0))throw new Error('INVALID_LOTTERY_RESULTS_FEED_EVENT');
  if(!value.published_at||Number.isNaN(Date.parse(value.published_at)))throw new Error('INVALID_LOTTERY_RESULTS_FEED_TIMESTAMP');
  return value;
}

export function parseFeedBindings(raw:string|undefined):FeedBinding[]{
  if(!raw)return[];
  const value=JSON.parse(raw) as unknown;
  if(!Array.isArray(value))throw new Error('INVALID_LOTTERY_RESULTS_FEED_BINDINGS');
  return value.map((row:any)=>{
    if(!row||typeof row.catalogCode!=='string'||!Number.isInteger(row.lotteryId)||!row.drawTimes||typeof row.drawTimes!=='object')throw new Error('INVALID_LOTTERY_RESULTS_FEED_BINDING');
    for(const [key,time] of Object.entries(row.drawTimes))if(!key||typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('INVALID_LOTTERY_RESULTS_FEED_DRAW_TIME');
    return{catalogCode:row.catalogCode,lotteryId:row.lotteryId,drawTimes:row.drawTimes};
  });
}

export function feedWinningKeys(numbers:number[]){
  const ordered=numbers.map(value=>String(value).padStart(2,'0'));
  const digitCombination=numbers.length>=3&&numbers.length<=5&&numbers.every(value=>value<=9)?numbers.join(''):undefined;
  return[...ordered,...(digitCombination&&!ordered.includes(digitCombination)?[digitCombination]:[])];
}

export function feedEventDedupeKey(event:LotteryResultsFeedEvent){return`lottery-results-feed:${event.lottery_id}:${event.draw_date}:${event.draw_type?.trim().toLowerCase()||'default'}`}

export function feedDrawNumber(gameCode:string,date:string,time:string){
  return`${gameCode}-${date.replaceAll('-','')}-${time.replace(':','')}`;
}
