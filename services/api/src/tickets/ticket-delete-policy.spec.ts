import { describe, expect, it } from 'vitest';
import { canTenantDeleteTicket } from './ticket-delete-policy';

describe('permanent ticket deletion', () => {
  it('denies permanent deletion to merchant accounts', () => {
    expect(canTenantDeleteTicket(true)).toBe(false);
  });

  it('allows tenant accounts to delete tickets independently of draw status', () => {
    expect(canTenantDeleteTicket(false)).toBe(true);
  });
});
