import { describe, expect, it } from 'vitest';
import { canMerchantDeleteTicket } from './ticket-delete';

const now = Date.parse('2026-10-09T12:00:00.000Z');
const openDraw = (id: string) => ({ id, status: 'OPEN', closesAt: '2026-10-09T13:00:00.000Z' });
const ticket = (draw = openDraw('draw-1')) => ({ status: 'VALID', draw });

describe('merchant ticket deletion visibility', () => {
  it('allows a valid ticket before all draws close', () => {
    expect(canMerchantDeleteTicket({
      ...ticket(),
      ticketDraws: [{ draw: openDraw('draw-2') }],
    }, now)).toBe(true);
  });

  it('hides the delete action when any draw is closed or overdue', () => {
    expect(canMerchantDeleteTicket(ticket({ ...openDraw('draw-1'), status: 'CLOSED' }), now)).toBe(false);
    expect(canMerchantDeleteTicket(ticket({ ...openDraw('draw-1'), closesAt: new Date(now).toISOString() }), now)).toBe(false);
    expect(canMerchantDeleteTicket({ ...ticket(), ticketDraws: [{ draw: { ...openDraw('draw-2'), status: 'CLOSED' } }] }, now)).toBe(false);
  });

  it('hides the delete action for settled tickets and tickets without draw data', () => {
    expect(canMerchantDeleteTicket({ ...ticket(), status: 'PAID' }, now)).toBe(false);
    expect(canMerchantDeleteTicket({ ...ticket(), payout: { id: 'payout' } }, now)).toBe(false);
    expect(canMerchantDeleteTicket({ status: 'VALID' }, now)).toBe(false);
  });
});
