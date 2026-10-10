import {beforeEach,describe,expect,it,vi} from 'vitest';

const database=vi.hoisted(()=>({$transaction:vi.fn()}));

vi.mock('@lottivexa/database',()=>({
  prisma:database,
  Prisma:{TransactionIsolationLevel:{Serializable:'Serializable'}},
}));

import {ResultsService} from './results.service';

describe('result publishing transaction timeout',()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    const tx={
      draw:{updateMany:vi.fn().mockResolvedValue({count:1})},
      ticket:{findMany:vi.fn().mockResolvedValue([])},
      auditLog:{create:vi.fn().mockResolvedValue({})},
    };
    database.$transaction.mockImplementation(async(callback: (client: typeof tx)=>Promise<unknown>)=>callback(tx));
  });

  it('allows result publishing more than Prisma interactive transactions default five seconds',async()=>{
    const service=new ResultsService();
    await service.publish(
      {sub:'master-admin',tenantId:'tenant-1',permissions:['settings.edit'],platform:true,tokenVersion:1},
      'draw-1',
      {winningKeys:['12','34']},
    );

    expect(database.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel:'Serializable',
        maxWait:10_000,
        timeout:60_000,
      }),
    );
  });
});
