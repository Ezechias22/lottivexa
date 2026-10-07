import { describe, expect, it } from 'vitest';
import { drawDateFilter } from './draw-date-filter';

describe('draw date filtering', () => {
  it('creates an inclusive date range in UTC for database date fields', () => {
    expect(drawDateFilter('2026-10-07', '2026-10-07')).toEqual({
      gte: new Date('2026-10-07T00:00:00.000Z'),
      lte: new Date('2026-10-07T00:00:00.000Z'),
    });
  });

  it('allows filtering from or through a single date', () => {
    expect(drawDateFilter('2026-10-07')).toEqual({ gte: new Date('2026-10-07T00:00:00.000Z') });
    expect(drawDateFilter(undefined, '2026-10-07')).toEqual({ lte: new Date('2026-10-07T00:00:00.000Z') });
  });

  it('rejects invalid dates and reversed ranges', () => {
    expect(() => drawDateFilter('2026-02-30', '2026-03-01')).toThrow('INVALID_DRAW_DATE');
    expect(() => drawDateFilter('2026-10-08', '2026-10-07')).toThrow('INVALID_DRAW_DATE_RANGE');
  });
});
