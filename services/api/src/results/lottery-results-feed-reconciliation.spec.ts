import{beforeEach,describe,expect,it,vi}from'vitest';

const database=vi.hoisted(()=>({providerResultEvent:{findMany:vi.fn(),count:vi.fn(),update:vi.fn()}}));

vi.mock('@lottivexa/database',()=>({prisma:database,Prisma:{}}));

import{ResultsService}from'./results.service';

describe('lottery results feed reconciliation',()=>{
  beforeEach(()=>vi.clearAllMocks());

  it('finds a paired Pick 4 event by configured draw time when its session label differs',async()=>{
    const service=new ResultsService();
    const binding={catalogCode:'US-CT',lotteryId:41,prizeSource:'PICK4' as const,drawTimes:{day:'14:00',night:'22:29'}};
    const reference={event:'lottery.result.published',lottery_id:39,draw_date:'2026-10-10',draw_type:'Day',numbers:[5,0,6]};
    const expected={event:'lottery.result.published',lottery_id:41,draw_date:'2026-10-10',draw_type:'Midday',numbers:[6,2,6,4],published_at:'2026-10-10T18:01:00Z'};
    database.providerResultEvent.findMany.mockResolvedValue([{payload:expected,createdAt:new Date('2026-10-10T18:01:00Z')}]);

    const found=await(service as any).latestLotteryResultsFeedEvent(binding,reference,'14:00');

    expect(database.providerResultEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{provider:'lottery-results-feed',dedupeKey:{startsWith:'lottery-results-feed:41:2026-10-10:'}}}));
    expect(found).toEqual(expected);
  });

  it('reports active bindings and queued feed event counts without exposing the token',async()=>{
    const previousBindings=process.env.LOTTERY_RESULTS_FEED_BINDINGS;
    const previousEnabled=process.env.LOTTERY_RESULTS_FEED_POLL_ENABLED;
    const previousToken=process.env.LOTTERY_RESULTS_FEED_TOKEN;
    process.env.LOTTERY_RESULTS_FEED_BINDINGS='[{"catalogCode":"US-CT","lotteryId":39,"prizeSource":"PICK3","drawTimes":{"day":"14:00","night":"22:29"}},{"catalogCode":"US-CT","lotteryId":41,"prizeSource":"PICK4","drawTimes":{"day":"14:00","night":"22:29"}}]';
    process.env.LOTTERY_RESULTS_FEED_POLL_ENABLED='true';
    process.env.LOTTERY_RESULTS_FEED_TOKEN='secret-token';
    database.providerResultEvent.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    try{
      const status=await new ResultsService().providerStatus();
      expect(status).toMatchObject({pollEnabled:true,tokenConfigured:true,bindingCount:2,bindingsValid:true,pendingEventCount:3,failedEventCount:1,waitingForPick3Pick4Count:2});
      expect(status).not.toHaveProperty('token');
    }finally{
      if(previousBindings===undefined)delete process.env.LOTTERY_RESULTS_FEED_BINDINGS;else process.env.LOTTERY_RESULTS_FEED_BINDINGS=previousBindings;
      if(previousEnabled===undefined)delete process.env.LOTTERY_RESULTS_FEED_POLL_ENABLED;else process.env.LOTTERY_RESULTS_FEED_POLL_ENABLED=previousEnabled;
      if(previousToken===undefined)delete process.env.LOTTERY_RESULTS_FEED_TOKEN;else process.env.LOTTERY_RESULTS_FEED_TOKEN=previousToken;
    }
  });

  it('replays recent Pick 3 events already marked applied and clears the waiting marker after recovery',async()=>{
    const previousBindings=process.env.LOTTERY_RESULTS_FEED_BINDINGS;
    process.env.LOTTERY_RESULTS_FEED_BINDINGS='[{"catalogCode":"US-CT","lotteryId":39,"prizeSource":"PICK3","drawTimes":{"day":"14:00","night":"22:29"}},{"catalogCode":"US-CT","lotteryId":41,"prizeSource":"PICK4","drawTimes":{"day":"14:00","night":"22:29"}}]';
    const event={event:'lottery.result.published',lottery_id:39,draw_date:'2026-10-10',draw_type:'Day',numbers:[5,0,6]};
    database.providerResultEvent.findMany.mockResolvedValue([{id:'event-p3',payload:event,error:'WAITING_FOR_PICK3_PICK4_PAIR'}]);
    database.providerResultEvent.update.mockResolvedValue({});
    const service:any=new ResultsService();
    service.applyLotteryResultsFeed=vi.fn().mockResolvedValue({applied:1,duplicates:0,missing:0});
    try{
      await service.reconcileAppliedPick3Pick4Events();
      expect(service.applyLotteryResultsFeed).toHaveBeenCalledWith(event);
      expect(database.providerResultEvent.update).toHaveBeenCalledWith({where:{id:'event-p3'},data:{error:null}});
    }finally{
      if(previousBindings===undefined)delete process.env.LOTTERY_RESULTS_FEED_BINDINGS;else process.env.LOTTERY_RESULTS_FEED_BINDINGS=previousBindings;
    }
  });
});
