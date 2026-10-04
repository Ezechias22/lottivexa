import { describe, expect, it } from 'vitest';
import { randomFreeMaryajSelections, resolveFreeMaryajPolicy, validateFreeMaryajPolicy } from './free-maryaj-policy';

describe('free Maryaj policy', () => {
  it('uses the US defaults and keeps other country defaults', () => {
    expect(resolveFreeMaryajPolicy('us')).toEqual({ countryCode: 'US', minimumAmount: '20', freeTicketCount: 2, payoutAmount: '50' });
    expect(resolveFreeMaryajPolicy('HT')).toEqual({ countryCode: 'HT', minimumAmount: '100', freeTicketCount: 2, payoutAmount: null });
  });

  it('accepts tenant overrides and rejects invalid settings', () => {
    expect(validateFreeMaryajPolicy({ minimumAmount: '35', freeTicketCount: 3, payoutAmount: '75' }))
      .toEqual({ minimumAmount: '35', freeTicketCount: 3, payoutAmount: '75' });
    expect(validateFreeMaryajPolicy({ minimumAmount: '0', freeTicketCount: 3, payoutAmount: '75' })).toBeUndefined();
    expect(validateFreeMaryajPolicy({ minimumAmount: '35', freeTicketCount: 11, payoutAmount: '75' })).toBeUndefined();
  });

  it('generates the configured number of distinct valid pairs', () => {
    const values = [1, 2, 3, 4, 5, 6];
    const selections = randomFreeMaryajSelections(3, () => values.shift() ?? 0);
    expect(selections).toEqual([['01', '02'], ['03', '04'], ['05', '06']]);
    expect(new Set(selections.map(pair => [...pair].sort().join('-'))).size).toBe(3);
  });

  it('does not generate a blocked Maryaj pair when pair order and zero padding differ', () => {
    const values = [2, 10, 2, 11, 3, 12];
    const selections = randomFreeMaryajSelections(2, () => values.shift() ?? 0, ['10-02']);
    expect(selections).toEqual([['02', '11'], ['03', '12']]);
  });

  it('does not include a blocked single ball in a free Maryaj pair', () => {
    const values = [12, 34, 56, 78];
    const selections = randomFreeMaryajSelections(1, () => values.shift() ?? 0, ['12']);
    expect(selections).toEqual([['56', '78']]);
  });
});
