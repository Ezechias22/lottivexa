import { describe, expect, it } from 'vitest';
import { ticketSearchPage, ticketSearchRange } from './ticket-search-policy';

describe('ticket search filters', () => {
  it('uses the complete Haiti business day for a selected calendar date', () => {
    const range = ticketSearchRange('2026-01-10', '2026-01-10');
    expect(range?.gte.toISOString()).toBe('2026-01-10T05:00:00.000Z');
    expect(range?.lte.toISOString()).toBe('2026-01-11T04:59:59.999Z');
  });

  it('requires both ends when a date filter is supplied', () => {
    expect(() => ticketSearchRange('2026-01-10', undefined)).toThrow('INVALID_DATE_RANGE');
    expect(() => ticketSearchRange(undefined, '2026-01-10')).toThrow('INVALID_DATE_RANGE');
  });

  it('validates one-based pagination', () => {
    expect(ticketSearchPage('2')).toBe(2);
    expect(ticketSearchPage(undefined)).toBeUndefined();
    expect(() => ticketSearchPage('0')).toThrow('INVALID_TICKET_PAGE');
    expect(() => ticketSearchPage('1.5')).toThrow('INVALID_TICKET_PAGE');
  });
});
