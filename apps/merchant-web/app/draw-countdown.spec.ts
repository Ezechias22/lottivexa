import { describe, expect, it } from 'vitest';
import { drawSaleClosingAt, formatDrawCountdown, isDrawOpenForSale } from './draw-countdown';

describe('merchant draw countdown', () => {
  const now = Date.parse('2026-10-07T12:00:00.000Z');

  it('counts down to the configured sales cutoff before the draw closes', () => {
    const draw = { status: 'OPEN', closesAt: '2026-10-07T12:10:00.000Z', game: { cutoffSeconds: 60 } };
    expect(drawSaleClosingAt(draw)).toBe(Date.parse('2026-10-07T12:09:00.000Z'));
    expect(formatDrawCountdown(drawSaleClosingAt(draw)!, now)).toBe('00:09:00');
  });

  it('formats countdowns beyond one day and expired draws', () => {
    expect(formatDrawCountdown(now + 90_061_000, now)).toBe('1j 01:01:01');
    expect(formatDrawCountdown(now - 1, now)).toBe('00:00:00');
  });

  it('hides draws that are closed, disabled, invalid, or past the cutoff', () => {
    expect(isDrawOpenForSale({ status: 'OPEN', closesAt: '2026-10-07T12:01:00.000Z', game: { cutoffSeconds: 60 } }, now)).toBe(false);
    expect(isDrawOpenForSale({ status: 'CLOSED', closesAt: '2026-10-07T12:10:00.000Z' }, now)).toBe(false);
    expect(isDrawOpenForSale({ status: 'OPEN', scheduleEnabled: false, closesAt: '2026-10-07T12:10:00.000Z' }, now)).toBe(false);
    expect(isDrawOpenForSale({ status: 'OPEN', closesAt: 'invalid' }, now)).toBe(false);
  });
});
