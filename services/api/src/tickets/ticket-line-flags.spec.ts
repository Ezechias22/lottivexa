import { describe, expect, it } from 'vitest';
import { confirmedLineWinningAmount, presentTicketLines, ticketLineFlags } from './ticket-line-flags';
import { checkedDrawVersion } from '../results/results-reconciliation-policy';

describe('ticket line flags from ticket events', () => {
  it('calculates a multi-draw Bolet by each actual result rank and preserves confirmed amounts', () => {
    const nyPublished = new Date('2026-10-09T18:00:00.000Z');
    const floridaPublished = new Date('2026-10-09T21:00:00.000Z');
    const ny = { id: 'draw-ny', status: 'RESULT_PUBLISHED', publishedAt: nyPublished, result: { winningKeys: ['33', '10', '20'] } };
    const florida = { id: 'draw-fl', status: 'RESULT_PUBLISHED', publishedAt: floridaPublished, result: { winningKeys: ['10', '20', '33'] } };
    const lineWinCounts = [
      { lineId: 'line-ny', drawId: 'draw-ny', winCount: 1 },
      { lineId: 'line-fl', drawId: 'draw-fl', winCount: 1 },
    ];
    const lineWinAmounts = [
      { lineId: 'line-ny', drawId: 'draw-ny', amount: '900' },
      { lineId: 'line-fl', drawId: 'draw-fl', amount: '150' },
    ];
    const ticket = presentTicketLines({
      status: 'WINNER',
      winning: { winningAmount: 1050 },
      ticketDraws: [
        { drawId: 'draw-ny', draw: ny },
        { drawId: 'draw-fl', draw: florida },
      ],
      events: [{ type: 'RESULT_CHECKED', metadata: {
        checkedDrawVersions: [checkedDrawVersion('draw-ny', nyPublished), checkedDrawVersion('draw-fl', floridaPublished)],
        lineWinCounts,
        lineWinAmounts,
      } }],
      lines: [
        { id: 'line-ny', drawId: 'draw-ny', selectionKey: '33@1', betType: { code: 'BOLET' }, potentialWin: { mul: () => ({ toString: () => '900' }) } },
        { id: 'line-fl', drawId: 'draw-fl', selectionKey: '33@1', betType: { code: 'BOLET' }, potentialWin: { mul: () => ({ toString: () => '900' }) } },
      ],
    });

    expect(ticket.resultEvaluationConfirmed).toBe(true);
    expect(ticket.status).toBe('WINNER');
    expect(ticket.winning).toEqual({ winningAmount: 1050 });
    expect(ticket.lines[0]).toMatchObject({ isWinner: true, winningAmount: '900', matchedWinningKeys: ['33'] });
    expect(ticket.lines[1]).toMatchObject({ isWinner: true, winningAmount: '150', matchedWinningKeys: ['33'] });
  });

  const events = [
    { type: 'CREATED', metadata: { freeMaryajLineIds: ['gift-1'] } },
    { type: 'MARKED_WINNER', metadata: { lineWinCounts: [{ lineId: 'bet-1', winCount: 2 }] } },
  ];

  it('marks free Maryaj lines and reports dekabes counts without extra columns', () => {
    expect(ticketLineFlags(events, 'gift-1')).toMatchObject({ isPromotional: true, winCount: 0 });
    expect(ticketLineFlags(events, 'bet-1')).toMatchObject({ isPromotional: false, winCount: 2 });
  });

  it('preserves promotional tags but does not trust historical win events without a current draw check', () => {
    const ticket = presentTicketLines({
      events,
      lines: [{ id: 'gift-1', selectionKey: '00-11' }, { id: 'bet-1', selectionKey: '12' }],
    });
    expect(ticket.lines[0]).toMatchObject({ isPromotional: true, winCount: 0 });
    expect(ticket.lines[1]).toMatchObject({ isPromotional: false, winCount: 0, isWinner: null, resultConfirmed: false });
  });

  it('hides stored potential amounts and exposes a line amount only after a confirmed win', () => {
    const publishedAt = new Date('2026-10-06T18:59:00.000Z');
    const linePotential = {
      mul: (count: number) => ({ toString: () => String(25 * count) }),
      toString: () => '55',
    };
    const ticket = presentTicketLines({
      potentialWin: { toString: () => '80' },
      currencyCode: 'USD',
      status: 'WINNER',
      drawId: 'draw-1',
      draw: { id: 'draw-1', status: 'RESULT_PUBLISHED', publishedAt, result: { winningKeys: ['255'] } },
      winning: { winningAmount: 25 },
      events: [{ type: 'RESULT_CHECKED', metadata: {
        checkedDrawVersions: [checkedDrawVersion('draw-1', publishedAt)],
        lineWinCounts: [{ lineId: 'winner', drawId: 'draw-1', winCount: 1 }, { lineId: 'open', drawId: 'draw-1', winCount: 0 }],
      } }],
      lines: [
        { id: 'winner', isWinner: true, selectionKey: '55', betType: { code: 'BOUL_PE' }, potentialWin: linePotential },
        { id: 'open', isWinner: null, potentialWin: linePotential },
      ],
    });
    expect(ticket.resultEvaluationConfirmed).toBe(true);
    expect(ticket.status).toBe('WINNER');
    expect(ticket).not.toHaveProperty('potentialWin');
    expect(ticket.currency).toBe('USD');
    expect(ticket.lines[0]).not.toHaveProperty('potentialWin');
    expect(ticket.lines[0].winningAmount).toBe('25');
    expect(ticket.lines[0].matchedWinningKeys).toEqual(['255']);
    expect(ticket.lines[0].matchedWinningKeys).toEqual(['255']);
    expect(ticket.lines[1]).not.toHaveProperty('winningAmount');
  });

  it('withholds the winner label and payout when stored winnings do not equal evaluated line prizes', () => {
    const publishedAt = new Date('2026-10-06T18:59:00Z');
    const ticket = presentTicketLines({
      status: 'WINNER', drawId: 'draw-1',
      draw: { id: 'draw-1', status: 'RESULT_PUBLISHED', publishedAt, result: { winningKeys: ['255'] } },
      winning: { winningAmount: 500 },
      events: [{ type: 'RESULT_CHECKED', metadata: { checkedDrawVersions: [checkedDrawVersion('draw-1', publishedAt)], lineWinCounts: [{ lineId: 'line-55', drawId: 'draw-1', winCount: 1 }] } }],
      lines: [{ id: 'line-55', selectionKey: '55', betType: { code: 'BOUL_PE' }, isWinner: true, potentialWin: { mul: () => ({ toString: () => '25' }) } }],
    });
    expect(ticket.resultEvaluationConfirmed).toBe(true);
    expect(ticket.status).toBe('PENDING');
    expect(ticket.winning).toBeNull();
    expect(ticket.lines[0]).toMatchObject({ isWinner: true, matchedWinningKeys: ['255'] });
    expect(ticket.lines[0]).not.toHaveProperty('winningAmount');
  });

  it('does not present stale winner rows or line flags before a current result check', () => {
    const ticket = presentTicketLines({
      status: 'WINNER',
      drawId: 'draw-1',
      draw: { id: 'draw-1', status: 'RESULT_PUBLISHED', publishedAt: new Date('2026-10-06T18:59:00Z'), result: { winningKeys: ['255'] } },
      winning: { winningAmount: 500 },
      events: [{ type: 'RESULT_CHECKED', metadata: {
        checkedDrawVersions: [{ drawId: 'draw-1', publishedAt: '2026-10-06T18:59:00.000Z', evaluationVersion: 3 }],
        lineWinCounts: [{ lineId: 'line-55', drawId: 'draw-1', winCount: 0 }],
      } }],
      lines: [{ id: 'line-55', isWinner: true, potentialWin: { mul: (count: number) => ({ toString: () => String(500 * count) }) } }],
    });

    expect(ticket.status).toBe('PENDING');
    expect(ticket.winning).toBeNull();
    expect(ticket.resultEvaluationConfirmed).toBe(false);
    expect(ticket.lines[0]).toMatchObject({ isWinner: null, resultConfirmed: false, winCount: 0 });
    expect(ticket.lines[0]).not.toHaveProperty('winningAmount');
  });

  it('uses a current zero-win result to clear stale database winner flags and amounts', () => {
    const publishedAt = new Date('2026-10-06T18:59:00Z');
    const ticket = presentTicketLines({
      status: 'WINNER',
      drawId: 'draw-1',
      draw: { id: 'draw-1', status: 'RESULT_PUBLISHED', publishedAt, result: { winningKeys: ['256'] } },
      winning: { winningAmount: 500 },
      events: [{ type: 'RESULT_CHECKED', metadata: {
        checkedDrawVersions: [checkedDrawVersion('draw-1', publishedAt)],
        lineWinCounts: [{ lineId: 'line-55', drawId: 'draw-1', winCount: 0 }],
      } }],
      lines: [{ id: 'line-55', isWinner: true, potentialWin: { mul: (count: number) => ({ toString: () => String(500 * count) }) } }],
    });

    expect(ticket.status).toBe('LOSER');
    expect(ticket.winning).toBeNull();
    expect(ticket.resultEvaluationConfirmed).toBe(true);
    expect(ticket.lines[0]).toMatchObject({ isWinner: false, resultConfirmed: true, winCount: 0 });
  });

  it('does not let printer payloads expose an unconfirmed line payout', () => {
    const storedOdds = { mul: (count: number) => ({ toString: () => String(50 * count) }) };
    expect(confirmedLineWinningAmount(storedOdds, 1, false)).toBeUndefined();
    expect(confirmedLineWinningAmount(storedOdds, 1, true)).toBe('50');
    expect(confirmedLineWinningAmount(storedOdds, 2, true)).toBe('100');
  });

  it('does not trust an old result check that lacks the current published draw version', () => {
    const ticket = presentTicketLines({
      events: [
        { type: 'MARKED_WINNER', metadata: { lineWinCounts: [{ lineId: 'bet-1', drawId: 'draw-1', winCount: 2 }] }, createdAt: '2026-10-01T12:00:00Z' },
        { type: 'RESULT_CHECKED', metadata: { lineWinCounts: [{ lineId: 'bet-1', drawId: 'draw-1', winCount: 0 }] }, createdAt: '2026-10-01T13:00:00Z' },
      ],
      lines: [{ id: 'bet-1', isWinner: false }],
    });

    expect(ticket.lines[0]).toMatchObject({ isWinner: null, winCount: 0, resultConfirmed: false });
  });

  it('keeps a result count of zero authoritative instead of reviving an old winner flag', () => {
    expect(ticketLineFlags([
      { type: 'RESULT_CHECKED', metadata: { lineWinCounts: [{ lineId: 'bet-1', drawId: 'draw-1', winCount: null }] } },
      { type: 'MARKED_WINNER', metadata: { lineWinCounts: [{ lineId: 'bet-1', drawId: 'draw-1', winCount: 2 }] } },
    ], 'bet-1')).toMatchObject({ winCount: 0 });
  });
});
