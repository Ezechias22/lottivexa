import { describe, expect, it } from 'vitest';
import { ticketBelongsInWinnersList, ticketDisplayStatus, ticketNeedsWinningReview, ticketWinningAmount } from './ticket-status';

describe('ticket result status presentation', () => {
  it('keeps stale winner and loser records out of the winners list until evaluated', () => {
    for (const status of ['WINNER', 'LOSER']) {
      const ticket = { status, winning: { winningAmount: '500' }, draw: { status: 'RESULT_PUBLISHED' }, lines: [{ isWinner: true, winCount: 1 }] };
      expect(ticketDisplayStatus(ticket)).toBe('PENDING');
      expect(ticketWinningAmount(ticket)).toBe(0);
      expect(ticketBelongsInWinnersList(ticket)).toBe(false);
    }
  });

  it('shows a winner and exact amount only after the API confirms current line results', () => {
    const ticket = { status: 'WINNER', resultEvaluationConfirmed: true, winning: { winningAmount: '25' }, lines: [{ resultConfirmed: true, isWinner: true, winCount: 1, winningAmount: '25' }] };
    expect(ticketDisplayStatus(ticket)).toBe('WINNER');
    expect(ticketWinningAmount(ticket)).toBe(25);
    expect(ticketBelongsInWinnersList(ticket)).toBe(true);
    expect(ticketNeedsWinningReview(ticket)).toBe(false);
  });

  it('shows a losing result only when every line result is confirmed', () => {
    expect(ticketDisplayStatus({ status: 'LOSER', resultEvaluationConfirmed: true, lines: [{ resultConfirmed: true, isWinner: false }] })).toBe('LOSER');
    expect(ticketDisplayStatus({ status: 'WINNER', resultEvaluationConfirmed: true, lines: [{ resultConfirmed: false, isWinner: true }] })).toBe('PENDING');
  });

  it('keeps any multi-draw ticket pending until the server confirms all line outcomes', () => {
    const ticket = { status: 'WINNER', ticketDraws: [{ draw: { status: 'RESULT_PUBLISHED' } }, { draw: { status: 'RESULT_PENDING' } }], lines: [{ isWinner: true }] };
    expect(ticketDisplayStatus(ticket)).toBe('PENDING');
  });

  it('shows paid tickets and retains the payout amount', () => {
    const ticket = { status: 'WINNER', payout: { amount: '50' } };
    expect(ticketDisplayStatus(ticket)).toBe('PAID');
    expect(ticketWinningAmount(ticket)).toBe(50);
    expect(ticketBelongsInWinnersList(ticket)).toBe(true);
  });

  it('does not mark cancelled tickets as winners', () => {
    expect(ticketDisplayStatus({ status: 'CANCELLED', resultEvaluationConfirmed: true, lines: [{ resultConfirmed: true, isWinner: true }] })).toBe('CANCELLED');
    expect(ticketBelongsInWinnersList({ status: 'CANCELLED' })).toBe(false);
  });
});
