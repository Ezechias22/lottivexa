import { describe, expect, it } from 'vitest';
import { activeOperationalTicketFilter, isOperationallyDeleted } from './ticket-visibility-policy';

describe('ticket operational visibility', () => {
  it('filters the deletion tombstone from operational ticket queries', () => {
    expect(activeOperationalTicketFilter()).toEqual({ events: { none: { type: 'DELETED' } } });
  });

  it('keeps ordinary tickets visible and permanently hides deleted tickets from app lists', () => {
    expect(isOperationallyDeleted([{ type: 'CREATED' }, { type: 'PAID' }])).toBe(false);
    expect(isOperationallyDeleted([{ type: 'CREATED' }, { type: 'DELETED' }])).toBe(true);
  });
});
