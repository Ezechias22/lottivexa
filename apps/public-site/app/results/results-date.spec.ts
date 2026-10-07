import { describe, expect, it } from 'vitest';
import { localResultDate, publishedResultsForDate } from './results-date';

describe('public result date filters', () => {
  it('uses the local calendar date by default', () => {
    expect(localResultDate(new Date(2026, 9, 7, 23, 30))).toBe('2026-10-07');
  });

  it('keeps only results whose draw belongs to the selected date', () => {
    expect(publishedResultsForDate([
      { id: 'today', drawDate: '2026-10-07T00:00:00.000Z' },
      { id: 'old', drawDate: '2026-10-06T00:00:00.000Z' },
    ], '2026-10-07').map(row => row.id)).toEqual(['today']);
  });
});
