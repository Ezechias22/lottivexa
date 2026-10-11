import{createHmac}from'node:crypto';
import{describe,expect,it}from'vitest';
import{feedDrawNumber,feedEventDedupeKey,feedWinningKeys,mapLotteryResultsFeedRestRow,parseFeedBindings,parseLotteryResultsFeedEvent,pick3Pick4WinningKeys,verifyLotteryResultsFeedSignature}from'./lottery-results-feed';

describe('LotteryResultsFeed adapter',()=>{
  const payload=Buffer.from(JSON.stringify({version:'1.0',event:'lottery.result.published',lottery_id:17,lottery_name:'New York',country:'us',draw_date:'2026-09-10',draw_type:'midday',numbers:[7,14,21],bonus_numbers:[],published_at:'2026-09-10T18:30:00Z'}));
  it('verifies the provider Signature header',()=>{const signature=createHmac('sha256','secret').update(payload).digest('hex');expect(verifyLotteryResultsFeedSignature(payload,signature,'secret')).toBe(true);expect(verifyLotteryResultsFeedSignature(payload,'bad','secret')).toBe(false)});
  it('validates and parses published results',()=>expect(parseLotteryResultsFeedEvent(payload).lottery_id).toBe(17));
  it('keeps ordered two-digit keys for Haitian result positions',()=>expect(feedWinningKeys([7,14,21])).toEqual(['07','14','21']));
  it('maps three single-digit balls to the single ordered Pick 3 result',()=>expect(feedWinningKeys([7,1,4])).toEqual(['714']));
  it('preserves leading zeroes in a three-digit Pick 3 result',()=>expect(feedWinningKeys([0,0,7])).toEqual(['007']));
  it('combines Pick 3 first prize and the first and last Pick 4 pairs as second and third prizes',()=>expect(pick3Pick4WinningKeys([5,0,6],[6,2,6,4])).toEqual(['506','62','64']));
  it('preserves leading zeroes across Pick 3 and Pick 4 prize positions',()=>expect(pick3Pick4WinningKeys([0,0,7],[0,6,0,4])).toEqual(['007','06','04']));
  it('rejects Pick 3 and Pick 4 results with a wrong number of digits',()=>expect(pick3Pick4WinningKeys([5,0],[6,2,6,4])).toBeUndefined());
  it('keeps the previous ordered multi-position mapping for four or five balls',()=>expect(feedWinningKeys([1,2,3,4])).toEqual(['01','02','03','04','1234']));
  it('creates an idempotency key per lottery, date, session and result values',()=>{
    const event=parseLotteryResultsFeedEvent(payload);
    expect(feedEventDedupeKey(event)).toBe('lottery-results-feed:17:2026-09-10:midday:7,14,21');
    expect(feedEventDedupeKey({...event,numbers:[7,14,22]})).not.toBe(feedEventDedupeKey(event));
  });
  it('maps the provider session to generated draw numbers',()=>expect(feedDrawNumber('NY','2026-09-10','14:30')).toBe('NY-20260910-1430'));
  it('maps provider REST balls and timestamp without mixing bonus balls',()=>expect(mapLotteryResultsFeedRestRow({draw_date:'2026-09-19',draw_type:'midday',balls:[7,14,21],ball_bonus:9,result_published_at:'2026-09-19T18:00:00Z'},17)).toMatchObject({lottery_id:17,draw_date:'2026-09-19',draw_type:'midday',numbers:[7,14,21],published_at:'2026-09-19T18:00:00Z'}));
  it('prefers canonical balls over compatibility numbers fields when both are present',()=>expect(mapLotteryResultsFeedRestRow({draw_date:'2026-09-19',draw_type:'midday',balls:[5,3,2],numbers:[7,8,9],winning_numbers:[1,1,1]},17).numbers).toEqual([5,3,2]));
  it('uses the provider result update timestamp so stale deliveries can be ignored',()=>expect(mapLotteryResultsFeedRestRow({draw_date:'2026-09-19',balls:[5,3,2],result_published_at:'2026-09-19T18:00:00Z',result_updated_at:'2026-09-19T18:05:00Z'},17).published_at).toBe('2026-09-19T18:05:00Z'));
  it('validates deployment bindings',()=>expect(parseFeedBindings('[{"catalogCode":"US-NY","lotteryId":17,"drawTimes":{"midday":"14:30"}}]')[0].lotteryId).toBe(17));
  it('validates matching Pick 3 and Pick 4 bindings as one prize pair',()=>expect(parseFeedBindings('[{"catalogCode":"US-NY","lotteryId":253,"prizeSource":"PICK3","drawTimes":{"midday":"14:30"}},{"catalogCode":"US-NY","lotteryId":255,"prizeSource":"PICK4","drawTimes":{"midday":"14:30"}}]')).toHaveLength(2));
  it('rejects Pick 3 and Pick 4 bindings with mismatched draw schedules',()=>expect(()=>parseFeedBindings('[{"catalogCode":"US-NY","lotteryId":253,"prizeSource":"PICK3","drawTimes":{"midday":"14:30"}},{"catalogCode":"US-NY","lotteryId":255,"prizeSource":"PICK4","drawTimes":{"midday":"14:31"}}]')).toThrow('INVALID_LOTTERY_RESULTS_FEED_PRIZE_PAIR:US-NY'));
});
