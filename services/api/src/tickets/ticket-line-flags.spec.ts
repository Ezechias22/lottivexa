import { describe, expect, it } from 'vitest';
import { presentTicketLines, ticketLineFlags } from './ticket-line-flags';

describe('ticket line flags from ticket events', () => {
  const events = [
    { type: 'CREATED', metadata: { freeMaryajLineIds: ['gift-1'] } },
    { type: 'MARKED_WINNER', metadata: { lineWinCounts: [{ lineId: 'bet-1', winCount: 2 }] } },
  ];

  it('marks free Maryaj lines and reports dekabes counts without extra columns', () => {
    expect(ticketLineFlags(events, 'gift-1')).toMatchObject({ isPromotional: true, winCount: 0 });
    expect(ticketLineFlags(events, 'bet-1')).toMatchObject({ isPromotional: false, winCount: 2 });
  });

  it('adds event-derived flags to ticket lines', () => {
    const ticket = presentTicketLines({
      events,
      lines: [{ id: 'gift-1', selectionKey: '00-11' }, { id: 'bet-1', selectionKey: '12' }],
    });
    expect(ticket.lines[0]).toMatchObject({ isPromotional: true, winCount: 0 });
    expect(ticket.lines[1]).toMatchObject({ isPromotional: false, winCount: 2 });
  });

  it('uses a newer result check to clear a line that an earlier result marked as a winner', () => {
    const ticket = presentTicketLines({
      events: [
        { type: 'MARKED_WINNER', metadata: { lineWinCounts: [{ lineId: 'bet-1', drawId: 'draw-1', winCount: 2 }] }, createdAt: '2026-10-01T12:00:00Z' },
        { type: 'RESULT_CHECKED', metadata: { lineWinCounts: [{ lineId: 'bet-1', drawId: 'draw-1', winCount: 0 }] }, createdAt: '2026-10-01T13:00:00Z' },
      ],
      lines: [{ id: 'bet-1', isWinner: false }],
    });

    expect(ticket.lines[0]).toMatchObject({ isWinner: false, winCount: 0 });
  });

  it('keeps a result count of zero authoritative instead of reviving an old winner flag', () => {
    expect(ticketLineFlags([
      { type: 'RESULT_CHECKED', metadata: { lineWinCounts: [{ lineId: 'bet-1', drawId: 'draw-1', winCount: null }] } },
      { type: 'MARKED_WINNER', metadata: { lineWinCounts: [{ lineId: 'bet-1', drawId: 'draw-1', winCount: 2 }] } },
    ], 'bet-1')).toMatchObject({ winCount: 0 });
  });
});
