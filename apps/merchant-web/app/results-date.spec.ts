import { describe, expect, it } from 'vitest';
import { localResultDate, orderedThreeDigitResult, publishedResultsForDate, resultKeysForDisplay } from './results-date';

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

  it('orders published results by scheduled result time instead of publication order', () => {
    expect(publishedResultsForDate([
      { id: 'new-york', status: 'RESULT_PUBLISHED', drawDate: '2026-10-10', resultAt: '2026-10-10T18:30:00.000Z' },
      { id: 'georgia', status: 'RESULT_PUBLISHED', drawDate: '2026-10-10', resultAt: '2026-10-10T16:29:00.000Z' },
      { id: 'texas', status: 'RESULT_PUBLISHED', drawDate: '2026-10-10', resultAt: '2026-10-10T14:00:00.000Z' },
    ], '2026-10-10').map(row => row.id)).toEqual(['texas', 'georgia', 'new-york']);
  });

  it('identifies the ordered digits and complete three-digit result', () => {
    expect(orderedThreeDigitResult(['05', '03', '02', '532'])).toEqual({ positions: ['05', '03', '02'], combined: '532' });
    expect(orderedThreeDigitResult(['506', '62', '64'])).toBeNull();
  });

  it('shows a legacy Pick 3 feed result as one number and keeps manual New York values', () => {
    expect(resultKeysForDisplay(['07', '06', '03', '763'])).toEqual(['763']);
    expect(resultKeysForDisplay(['506', '62', '64'])).toEqual(['506', '62', '64']);
  });
});
