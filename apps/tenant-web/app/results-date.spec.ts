import { describe, expect, it } from 'vitest';
import { drawResultDate, localResultDate, publishedResultsForDate } from './results-date';

describe('tenant result date filters', () => {
  it('formats the local calendar date without converting it to UTC', () => {
    expect(localResultDate(new Date(2026, 9, 7, 23, 30))).toBe('2026-10-07');
  });

  it('uses the draw date and falls back to publication date', () => {
    expect(drawResultDate({ drawDate: '2026-10-07T00:00:00.000Z', publishedAt: '2026-10-08T01:00:00.000Z' })).toBe('2026-10-07');
    expect(drawResultDate({ publishedAt: '2026-10-08T01:00:00.000Z' })).toBe('2026-10-08');
  });

  it('shows only published results for the selected draw day', () => {
    expect(publishedResultsForDate([
      { id: 'today', status: 'RESULT_PUBLISHED', drawDate: '2026-10-07T00:00:00.000Z' },
      { id: 'old', status: 'RESULT_PUBLISHED', drawDate: '2026-10-06T00:00:00.000Z' },
      { id: 'pending', status: 'CLOSED', drawDate: '2026-10-07T00:00:00.000Z' },
    ], '2026-10-07').map(row => row.id)).toEqual(['today']);
  });
});
