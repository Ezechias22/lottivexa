import { describe, expect, it } from 'vitest';
import { evaluateTicketResults } from './results-policy';

describe('ticket results across draws', () => {
  it('marks a two-digit Georgia Bolet selection as a winner for the first result 255', () => {
    const result = evaluateTicketResults('georgia-draw', ['georgia-draw'], [
      { id: 'line-55', drawId: 'georgia-draw', selectionKey: '55@1', betType: { code: 'BOLET' } },
    ], new Map([['georgia-draw', ['255']]]));

    expect(result.allDrawsResolved).toBe(true);
    expect(result.lineResults[0]).toMatchObject({ winCount: 1, isWinner: true });
  });

  it('checks each line against its own draw result', () => {
    const result = evaluateTicketResults('draw-a', ['draw-a', 'draw-b'], [
      { id: 'line-a', drawId: 'draw-a', selectionKey: '12', betType: { code: 'BOLET' } },
      { id: 'line-b', drawId: 'draw-b', selectionKey: '34', betType: { code: 'BOLET' } },
    ], new Map([
      ['draw-a', ['12', '99']],
      ['draw-b', ['34', '88']],
    ]));

    expect(result.allDrawsResolved).toBe(true);
    expect(result.lineResults).toEqual([
      { lineId: 'line-a', drawId: 'draw-a', winCount: 1, isWinner: true },
      { lineId: 'line-b', drawId: 'draw-b', winCount: 1, isWinner: true },
    ]);
  });

  it('keeps unresolved draw lines pending until every draw has a result', () => {
    const result = evaluateTicketResults('draw-a', ['draw-a', 'draw-b'], [
      { id: 'line-a', drawId: 'draw-a', selectionKey: '12', betType: { code: 'BOLET' } },
      { id: 'line-b', drawId: 'draw-b', selectionKey: '34', betType: { code: 'BOLET' } },
    ], new Map([['draw-a', ['12']]]));

    expect(result.allDrawsResolved).toBe(false);
    expect(result.lineResults).toEqual([
      { lineId: 'line-a', drawId: 'draw-a', winCount: 1, isWinner: true },
      { lineId: 'line-b', drawId: 'draw-b', winCount: null, isWinner: null },
    ]);
  });

  it('uses the ticket draw for legacy single-draw lines without drawId', () => {
    const result = evaluateTicketResults('draw-a', [], [
      { id: 'line-a', drawId: null, selectionKey: '12', betType: { code: 'BOLET' } },
    ], new Map([['draw-a', ['12']]]));

    expect(result.allDrawsResolved).toBe(true);
    expect(result.lineResults[0]).toMatchObject({ drawId: 'draw-a', isWinner: true, winCount: 1 });
  });
});
