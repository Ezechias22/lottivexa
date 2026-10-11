import { describe, expect, it } from 'vitest';
import { localResultDate, orderedPick3Pick4Result, orderedThreeDigitResult, publishedResultsForDate, resultKeysForDisplay } from './results-date';

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

  it('orders same-day results by scheduled result time', () => {
    expect(publishedResultsForDate([
      { id: 'late', drawDate: '2026-10-10', resultAt: '2026-10-10T18:30:00.000Z' },
      { id: 'early', drawDate: '2026-10-10', resultAt: '2026-10-10T14:00:00.000Z' },
    ], '2026-10-10').map(row => row.id)).toEqual(['early', 'late']);
  });

  it('identifies ordered three-digit results but leaves other formats alone', () => {
    expect(orderedThreeDigitResult(['07', '04', '04', '744'])).toEqual({ positions: ['07', '04', '04'], combined: '744' });
    expect(orderedThreeDigitResult(['506', '62', '64'])).toBeNull();
    expect(orderedPick3Pick4Result(['506', '62', '64'])).toEqual({ positions: ['506', '62', '64'] });
  });

  it('recognizes the Pick 3 first prize and Pick 4 second and third prizes', () => {
    expect(orderedPick3Pick4Result(['506', '62', '64'])?.positions).toEqual(['506', '62', '64']);
  });

  it('shows a legacy Pick 3 feed result as one number and keeps manual New York values', () => {
    expect(resultKeysForDisplay(['07', '06', '03', '763'])).toEqual(['763']);
    expect(resultKeysForDisplay(['506', '62', '64'])).toEqual(['506', '62', '64']);
  });
});
