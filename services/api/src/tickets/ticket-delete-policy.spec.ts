import { describe, expect, it } from 'vitest';
import { merchantTicketDeleteBlockReason } from './ticket-delete-policy';

const now = new Date('2026-10-09T12:00:00.000Z');
const openDraw = (id: string) => ({
  id,
  status: 'OPEN',
  closesAt: '2026-10-09T13:00:00.000Z',
});

const validTicket = (draws = [openDraw('draw-1')]) => ({
  status: 'VALID',
  hasPayout: false,
  hasWinningRecord: false,
  draws,
});

describe('merchant ticket deletion window', () => {
  it('allows a valid ticket while every attached draw remains open', () => {
    expect(merchantTicketDeleteBlockReason(validTicket(), now)).toBeNull();
  });

  it('blocks deletion after a draw closes by status or deadline', () => {
    expect(
      merchantTicketDeleteBlockReason(
        validTicket([{ ...openDraw('draw-1'), status: 'CLOSED' }]),
        now,
      ),
    ).toBe('TICKET_DELETE_DRAW_CLOSED');
    expect(
      merchantTicketDeleteBlockReason(
        validTicket([{ ...openDraw('draw-1'), closesAt: now.toISOString() }]),
        now,
      ),
    ).toBe('TICKET_DELETE_DRAW_CLOSED');
  });

  it('requires every draw on a multi-draw ticket to remain open', () => {
    expect(
      merchantTicketDeleteBlockReason(
        validTicket([openDraw('draw-1'), { ...openDraw('draw-2'), status: 'CLOSED' }]),
        now,
      ),
    ).toBe('TICKET_DELETE_DRAW_CLOSED');
  });

  it('blocks finalized, paid, winning, and drawless tickets for merchants', () => {
    expect(merchantTicketDeleteBlockReason({ ...validTicket(), status: 'PAID' }, now)).toBe(
      'TICKET_DELETE_FINALIZED',
    );
    expect(merchantTicketDeleteBlockReason({ ...validTicket(), hasPayout: true }, now)).toBe(
      'TICKET_DELETE_FINALIZED',
    );
    expect(merchantTicketDeleteBlockReason({ ...validTicket(), hasWinningRecord: true }, now)).toBe(
      'TICKET_DELETE_FINALIZED',
    );
    expect(merchantTicketDeleteBlockReason(validTicket([]), now)).toBe(
      'TICKET_DELETE_DRAW_CLOSED',
    );
  });
});
