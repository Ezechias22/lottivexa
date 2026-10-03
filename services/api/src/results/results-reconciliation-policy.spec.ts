import { describe, expect, it } from 'vitest';
import { hasCurrentResultCheck, needsWinnerRepair } from './results-reconciliation-policy';

describe('automatic ticket result reconciliation policy', () => {
  const publishedAt = new Date('2026-10-02T18:30:00.000Z');

  it('rechecks tickets that have no result check event', () => {
    expect(hasCurrentResultCheck([], 'draw-1', publishedAt)).toBe(false);
  });

  it('rechecks legacy result check events without a published result version', () => {
    expect(hasCurrentResultCheck([
      { type: 'RESULT_CHECKED', metadata: { drawId: 'draw-1', lineWinCounts: [] } },
    ], 'draw-1', publishedAt)).toBe(false);
  });

  it('accepts a result check for the same draw and published version', () => {
    expect(hasCurrentResultCheck([
      { type: 'RESULT_CHECKED', metadata: { checkedDrawVersions: [{ drawId: 'draw-1', publishedAt: publishedAt.toISOString() }] } },
    ], 'draw-1', publishedAt)).toBe(true);
  });

  it('rechecks when a draw result is edited or the event belongs to another draw', () => {
    const events = [{ type: 'RESULT_CHECKED', metadata: { checkedDrawVersions: [{ drawId: 'draw-2', publishedAt: publishedAt.toISOString() }] } }];
    expect(hasCurrentResultCheck(events, 'draw-1', publishedAt)).toBe(false);
    expect(hasCurrentResultCheck(events, 'draw-2', new Date('2026-10-02T18:31:00.000Z'))).toBe(false);
  });

  it('repairs a winner whose result check exists but whose payout amount or winning line is missing', () => {
    expect(needsWinnerRepair('WINNER', 0, true)).toBe(true);
    expect(needsWinnerRepair('WINNER', 25, false)).toBe(true);
    expect(needsWinnerRepair('WINNER', 25, true)).toBe(false);
    expect(needsWinnerRepair('PENDING', 0, false)).toBe(false);
  });
});
