import { describe, expect, it } from 'vitest';
import { localResultDate, publishedResultsForDate } from './results-date';

describe('merchant result date filters', () => {
  it('uses the local calendar day as the default', () => {
    expect(localResultDate(new Date(2026, 9, 7, 23, 30))).toBe('2026-10-07');
  });

  it('returns only published results from the requested draw date', () => {
    expect(publishedResultsForDate([
      { id: 'today', status: 'RESULT_PUBLISHED', drawDate: '2026-10-07T00:00:00.000Z' },
      { id: 'old', status: 'RESULT_PUBLISHED', drawDate: '2026-10-06T00:00:00.000Z' },
    ], '2026-10-07').map(row => row.id)).toEqual(['today']);
  });
});
