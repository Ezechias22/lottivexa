import { describe, expect, it } from 'vitest';
import { priceLines, winningSelectionCount } from './ticket-policy';
import { checkedDrawVersion } from '../results/results-reconciliation-policy';
import { presentTicketLines } from './ticket-line-flags';

const lineBase = {
  betTypeId: 'bolet-id',
  selection: ['55'],
  stake: '4',
  odds: '10',
  selectionCount: 1,
  numberMin: 0,
  numberMax: 99,
  allowRepeats: true,
};

describe('Bolet result-position payout regressions', () => {
  it('recognizes 55 as the first-place Bolet when the published result is 255', () => {
    expect(winningSelectionCount('BOLET', '55@1', ['255'])).toBe(1);
    expect(winningSelectionCount('BOLET', '55', ['255'])).toBe(1);
    expect(winningSelectionCount('BOUL_PE', '55', ['255'])).toBe(1);
  });

  it('pays a second-position hit once, even when the number repeats in other result positions', () => {
    const priced = priceLines([{ ...lineBase, resultPosition: 2 }])[0];
    const winCount = winningSelectionCount('BOLET', priced.selectionKey, ['255', '255', '255', '255', '255', '255']);

    expect(winCount).toBe(1);
    expect(priced.potentialWin.mul(winCount).toFixed(2)).toBe('40.00');
  });

  it('does not treat another result position as a win for a position-specific line', () => {
    expect(winningSelectionCount('BOLET', '55@2', ['255', '12', '255'])).toBe(0);
  });

  it('shows the same confirmed rank-specific amount in ticket details as the API recorded', () => {
    const publishedAt = new Date('2026-10-07T18:00:00.000Z');
    const ticket = presentTicketLines({
      status: 'WINNER',
      drawId: 'draw-1',
      draw: { id: 'draw-1', status: 'RESULT_PUBLISHED', publishedAt, result: { winningKeys: ['12', '255', '34'] } },
      winning: { winningAmount: 40 },
      events: [{
        type: 'RESULT_CHECKED',
        metadata: {
          checkedDrawVersions: [checkedDrawVersion('draw-1', publishedAt)],
          lineWinCounts: [{ lineId: 'line-1', drawId: 'draw-1', winCount: 1 }],
          lineWinAmounts: [{ lineId: 'line-1', drawId: 'draw-1', amount: '40' }],
        },
      }],
      lines: [{
        id: 'line-1',
        drawId: 'draw-1',
        selectionKey: '55',
        betType: { code: 'BOLET' },
        potentialWin: { mul: (count: number) => ({ toString: () => String(240 * count) }) },
      }],
    });

    expect(ticket.status).toBe('WINNER');
    expect(ticket.winning?.winningAmount).toBe(40);
    expect(ticket.lines[0].winningAmount).toBe('40');
  });
});
