import { describe, expect, it } from 'vitest';
import { checkedDrawVersion, hasCurrentResultCheck, RESULT_EVALUATION_VERSION } from './results-reconciliation-policy';

describe('ticket result recalculation version regression', () => {
  const publishedAt = new Date('2026-10-07T18:00:00.000Z');

  it('rechecks tickets evaluated by the old payout and Bolet matching rules', () => {
    for (const oldVersion of [3, 4]) {
      expect(hasCurrentResultCheck([
        {
          type: 'RESULT_CHECKED',
          metadata: {
            checkedDrawVersions: [{ drawId: 'draw-1', publishedAt: publishedAt.toISOString(), evaluationVersion: oldVersion }],
          },
        },
      ], 'draw-1', publishedAt)).toBe(false);
    }

    expect(RESULT_EVALUATION_VERSION).toBe(5);
    expect(hasCurrentResultCheck([
      { type: 'RESULT_CHECKED', metadata: { checkedDrawVersions: [checkedDrawVersion('draw-1', publishedAt)] } },
    ], 'draw-1', publishedAt)).toBe(true);
  });
});
