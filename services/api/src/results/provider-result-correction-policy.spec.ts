import{describe,expect,it}from'vitest';
import{hasSameWinningKeys,isLotteryResultsFeedManagedResult,isOlderLotteryResultsFeedUpdate}from'./provider-result-correction-policy';

describe('provider result correction policy',()=>{
  it('allows corrections only for results explicitly published by LotteryResultsFeed',()=>{
    expect(isLotteryResultsFeedManagedResult({source:'LOTTERY_RESULTS_FEED',winningKeys:['05','03','02']})).toBe(true);
    expect(isLotteryResultsFeedManagedResult({winningKeys:['506','62','64']})).toBe(false);
    expect(isLotteryResultsFeedManagedResult(null)).toBe(false);
  });

  it('compares ordered winning keys before treating an incoming result as a duplicate',()=>{
    expect(hasSameWinningKeys({winningKeys:['05','03','02']},['05','03','02'])).toBe(true);
    expect(hasSameWinningKeys({winningKeys:['05','03','02']},['02','03','05'])).toBe(false);
    expect(hasSameWinningKeys({winningKeys:['05','03']},['05','03','02'])).toBe(false);
  });

  it('does not let an older provider update replace a newer result',()=>{
    expect(isOlderLotteryResultsFeedUpdate({sourceUpdatedAt:'2026-10-10T18:05:00Z'},'2026-10-10T18:00:00Z')).toBe(true);
    expect(isOlderLotteryResultsFeedUpdate({sourceUpdatedAt:'2026-10-10T18:05:00Z'},'2026-10-10T18:06:00Z')).toBe(false);
  });
});
