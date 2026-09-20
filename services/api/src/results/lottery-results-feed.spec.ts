import{createHmac}from'node:crypto';
import{describe,expect,it}from'vitest';
import{feedDrawNumber,feedEventDedupeKey,feedWinningKeys,mapLotteryResultsFeedRestRow,parseFeedBindings,parseLotteryResultsFeedEvent,verifyLotteryResultsFeedSignature}from'./lottery-results-feed';

describe('LotteryResultsFeed adapter',()=>{
  const payload=Buffer.from(JSON.stringify({version:'1.0',event:'lottery.result.published',lottery_id:17,lottery_name:'New York',country:'us',draw_date:'2026-09-10',draw_type:'midday',numbers:[7,14,21],bonus_numbers:[],published_at:'2026-09-10T18:30:00Z'}));
  it('verifies the provider Signature header',()=>{const signature=createHmac('sha256','secret').update(payload).digest('hex');expect(verifyLotteryResultsFeedSignature(payload,signature,'secret')).toBe(true);expect(verifyLotteryResultsFeedSignature(payload,'bad','secret')).toBe(false)});
  it('validates and parses published results',()=>expect(parseLotteryResultsFeedEvent(payload).lottery_id).toBe(17));
  it('keeps ordered two-digit keys for Haitian result positions',()=>expect(feedWinningKeys([7,14,21])).toEqual(['07','14','21']));
  it('also derives a loto combination when the provider returns individual digits',()=>expect(feedWinningKeys([7,1,4])).toEqual(['07','01','04','714']));
  it('creates an idempotency key per lottery, date and session',()=>expect(feedEventDedupeKey(parseLotteryResultsFeedEvent(payload))).toBe('lottery-results-feed:17:2026-09-10:midday'));
  it('maps the provider session to generated draw numbers',()=>expect(feedDrawNumber('NY','2026-09-10','14:30')).toBe('NY-20260910-1430'));
  it('maps provider REST balls and timestamp without mixing bonus balls',()=>expect(mapLotteryResultsFeedRestRow({draw_date:'2026-09-19',draw_type:'midday',balls:[7,14,21],ball_bonus:9,result_published_at:'2026-09-19T18:00:00Z'},17)).toMatchObject({lottery_id:17,draw_date:'2026-09-19',draw_type:'midday',numbers:[7,14,21],published_at:'2026-09-19T18:00:00Z'}));
  it('validates deployment bindings',()=>expect(parseFeedBindings('[{"catalogCode":"US-NY","lotteryId":17,"drawTimes":{"midday":"14:30"}}]')[0].lotteryId).toBe(17));
});
