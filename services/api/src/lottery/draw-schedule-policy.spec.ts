import { describe, expect, it } from 'vitest';
import { drawScheduleSlot, isDrawScheduleEnabled, type ScheduleSlot } from './draw-schedule-policy';

const draw = { gameId: 'texas-id', drawNumber: 'TEXAS-20261006-0830', drawDate: '2026-10-06' };
const schedule = (active: boolean, resultAt = '08:30', weekday = 2): ScheduleSlot => ({ gameId: draw.gameId, weekday, resultAt, active });

describe('draw schedule policy', () => {
  it('extracts the local weekday and session time from a generated draw number', () => {
    expect(drawScheduleSlot(draw)).toEqual({ gameId: draw.gameId, weekday: 2, resultAt: '08:30' });
  });

  it('blocks a generated draw when its matching recurring session is disabled', () => {
    expect(isDrawScheduleEnabled(draw, [schedule(false)])).toBe(false);
  });

  it('allows a session if one matching market schedule remains active', () => {
    expect(isDrawScheduleEnabled(draw, [schedule(false), schedule(true)])).toBe(true);
  });

  it('does not apply another weekday or time session setting to the draw', () => {
    expect(isDrawScheduleEnabled(draw, [schedule(false, '09:30'), schedule(false, '08:30', 3)])).toBe(true);
  });

  it('keeps manual or malformed draw numbers available when no recurring slot can be identified', () => {
    expect(isDrawScheduleEnabled({ ...draw, drawNumber: 'SPECIAL-DRAW' }, [schedule(false)])).toBe(true);
  });
});
