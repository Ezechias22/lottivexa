import { describe, expect, it } from 'vitest';
import { assignUndrawnLinesToSelectedDraws, replayTicketLines } from './replay-ticket';

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
  it('assigns copied lines to each selected draw without duplicating already assigned lines', () => {
    expect(assignUndrawnLinesToSelectedDraws([
      { betTypeId: 'bolet', selection: '55', stake: '4' },
      { betTypeId: 'maryaj', selection: '12 55', stake: '1', drawId: 'florida' },
    ], ['florida', 'georgia'])).toEqual([
      { betTypeId: 'bolet', selection: '55', stake: '4', drawId: 'florida' },
      { betTypeId: 'bolet', selection: '55', stake: '4', drawId: 'georgia' },
      { betTypeId: 'maryaj', selection: '12 55', stake: '1', drawId: 'florida' },
    ]);
  });
});
