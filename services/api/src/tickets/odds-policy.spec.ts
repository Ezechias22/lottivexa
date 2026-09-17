import {describe,expect,it} from 'vitest';
import {chooseOdds} from './ticket-policy';

describe('tenant-controlled Bolet payout positions',()=>{
 const odds=[{betTypeId:'bolet',resultPosition:null,multiplier:60},{betTypeId:'bolet',resultPosition:1,multiplier:60},{betTypeId:'bolet',resultPosition:2,multiplier:20},{betTypeId:'bolet',resultPosition:3,multiplier:10}];
 it('uses the configured payout for each position',()=>{expect(chooseOdds(odds,'bolet',1)?.multiplier).toBe(60);expect(chooseOdds(odds,'bolet',2)?.multiplier).toBe(20);expect(chooseOdds(odds,'bolet',3)?.multiplier).toBe(10)});
 it('falls back to the general multiplier for other games',()=>expect(chooseOdds(odds,'bolet')?.multiplier).toBe(60));
});
