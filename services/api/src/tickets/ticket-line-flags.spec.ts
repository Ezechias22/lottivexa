import { describe, expect, it } from 'vitest';
import { presentTicketLines, ticketLineFlags } from './ticket-line-flags';

describe('ticket line flags from ticket events', () => {
  const events = [
    { type: 'CREATED', metadata: { freeMaryajLineIds: ['gift-1'] } },
    { type: 'MARKED_WINNER', metadata: { lineWinCounts: [{ lineId: 'bet-1', winCount: 2 }] } },
  ];

  it('marks free Maryaj lines and reports dekabes counts without extra columns', () => {
    expect(ticketLineFlags(events, 'gift-1')).toEqual({ isPromotional: true, winCount: 0 });
    expect(ticketLineFlags(events, 'bet-1')).toEqual({ isPromotional: false, winCount: 2 });
  });

  it('adds event-derived flags to ticket lines', () => {
    const ticket = presentTicketLines({
      events,
      lines: [{ id: 'gift-1', selectionKey: '00-11' }, { id: 'bet-1', selectionKey: '12' }],
    });
    expect(ticket.lines[0]).toMatchObject({ isPromotional: true, winCount: 0 });
    expect(ticket.lines[1]).toMatchObject({ isPromotional: false, winCount: 2 });
  });
});
