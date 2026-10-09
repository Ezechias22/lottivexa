import { describe, expect, it } from 'vitest';
import { replayTicketLines } from './replay-ticket';

describe('ticket replay', () => {
  it('copies bets without carrying over old New York and Florida draw assignments', () => {
    const copied = replayTicketLines({
      lines: [
        { betTypeId: 'bolet', selectionKey: '55@1', stake: '4', drawId: 'new-york', betType: { code: 'BOLET', name: 'Bolet' } },
        { betTypeId: 'loto', selectionKey: '255@2', stake: '2', drawId: 'florida', betType: { code: 'LOTO3', name: 'Loto 3' } },
      ],
    });

    expect(copied).toEqual([
      { betTypeId: 'bolet', selection: '55', stake: '4', betName: 'Bolet' },
      { betTypeId: 'loto', selection: '255', stake: '2', resultPosition: 2, betName: 'Loto 3' },
    ]);
    expect(copied.every((line) => !('drawId' in line))).toBe(true);
  });
});
