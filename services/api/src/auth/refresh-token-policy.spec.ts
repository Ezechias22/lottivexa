import { describe, expect, it } from 'vitest';
import { REFRESH_TOKEN_LIFETIME_MS, refreshTokenExpiry } from './refresh-token-policy';

describe('refresh token lifetime', () => {
  it('keeps an active session renewable for one year at a time', () => {
    const now = new Date('2026-10-04T00:00:00.000Z');
    expect(REFRESH_TOKEN_LIFETIME_MS).toBe(365 * 24 * 60 * 60 * 1000);
    expect(refreshTokenExpiry(now).toISOString()).toBe('2027-10-04T00:00:00.000Z');
  });
});
