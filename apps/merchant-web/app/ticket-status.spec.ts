import { describe, expect, it } from 'vitest';
import { ticketBelongsInWinnersList, ticketDisplayStatus, ticketNeedsWinningReview, ticketWinningAmount } from './ticket-status';

describe('ticket result status presentation', () => {
  it('keeps Gagnant visible without displaying an unconfirmed amount', () => {
    const ticket = { status: 'WINNER', winning: { winningAmount: '0' }, lines: [{ isWinner: true, winCount: 2 }] };
    expect(ticketDisplayStatus(ticket)).toBe('WINNER');
    expect(ticketWinningAmount(ticket)).toBe(0);
    expect(ticketNeedsWinningReview(ticket)).toBe(true);
  });

  it('signals an unconfirmed winning amount without changing the status', () => {
    const ticket = { status: 'WINNER', winning: { winningAmount: '0' }, lines: [{ isWinner: false }] };
    expect(ticketDisplayStatus(ticket)).toBe('WINNER');
    expect(ticketNeedsWinningReview(ticket)).toBe(true);
  });

  it('uses linked draws to keep a multi-draw ticket pending until every draw is published', () => {
    const ticket = {
      status: 'VALID',
      ticketDraws: [{ draw: { status: 'RESULT_PUBLISHED' } }, { draw: { status: 'RESULT_PENDING' } }],
      lines: [{ isWinner: false }],
    };
    expect(ticketDisplayStatus(ticket)).toBe('PENDING');
  });

  it('uses resolved line outcomes to show a winner or loser for a valid ticket', () => {
    const draw = { status: 'RESULT_PUBLISHED' };
    expect(ticketDisplayStatus({ status: 'VALID', draw, lines: [{ isWinner: true }] })).toBe('WINNER');
    expect(ticketDisplayStatus({ status: 'VALID', draw, lines: [{ isWinner: false }] })).toBe('LOSER');
  });

  it('does not keep an early WINNER status when one linked draw is still pending', () => {
    const ticket = {
      status: 'WINNER',
      ticketDraws: [{ draw: { status: 'RESULT_PUBLISHED' } }, { draw: { status: 'RESULT_PENDING' } }],
      lines: [{ isWinner: true }],
    };
    expect(ticketDisplayStatus(ticket)).toBe('PENDING');
  });

  it('reconciles a stale PENDING status from completed line outcomes', () => {
    expect(ticketDisplayStatus({ status: 'PENDING', draw: { status: 'RESULT_PUBLISHED' }, lines: [{ isWinner: false }] })).toBe('LOSER');
  });

  it('keeps the server WINNER status when line flags are stale, while requiring review', () => {
    const ticket = { status: 'WINNER', draw: { status: 'RESULT_PUBLISHED' }, winning: { winningAmount: '0' }, lines: [{ isWinner: false }] };
    expect(ticketDisplayStatus(ticket)).toBe('WINNER');
    expect(ticketNeedsWinningReview(ticket)).toBe(true);
  });

  it('shows paid when a payout exists even if the ticket status is stale', () => {
    expect(ticketDisplayStatus({ status: 'WINNER', payout: { amount: '50' } })).toBe('PAID');
  });

  it('does not label a confirmed winning amount as lost because line flags are stale', () => {
    expect(ticketDisplayStatus({ status: 'LOSER', winning: { winningAmount: '50' }, draw: { status: 'RESULT_PUBLISHED' }, lines: [{ isWinner: false }] })).toBe('WINNER');
  });

  it('reads the confirmed ticket amount from the top-level API field when provided', () => {
    expect(ticketWinningAmount({ status: 'WINNER', winningAmount: '50' })).toBe(50);
  });

  it('keeps losing, cancelled, and unresolved tickets out of the winners list', () => {
    expect(ticketBelongsInWinnersList({ status: 'LOSER' })).toBe(false);
    expect(ticketBelongsInWinnersList({ status: 'CANCELLED' })).toBe(false);
    expect(ticketBelongsInWinnersList({ status: 'VALID', draw: { status: 'OPEN' } })).toBe(false);
    expect(ticketBelongsInWinnersList({ status: 'WINNER', ticketDraws: [{ draw: { status: 'RESULT_PUBLISHED' } }, { draw: { status: 'RESULT_PENDING' } }], lines: [{ isWinner: true }] })).toBe(false);
  });

  it('includes only confirmed winners and paid winners', () => {
    expect(ticketBelongsInWinnersList({ status: 'WINNER', draw: { status: 'RESULT_PUBLISHED' }, lines: [{ isWinner: true }] })).toBe(true);
    expect(ticketBelongsInWinnersList({ status: 'PAID', payout: { amount: '50' } })).toBe(true);
  });
});
