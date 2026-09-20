import { describe, expect, it } from 'vitest';
import { drawLabel, drawSession, drawSessionLabel } from './draw-label';

describe('draw session labels', () => {
  it('recognizes catalog day and evening sessions from the scheduled draw number', () => {
    expect(drawSession({ drawNumber: 'GA-20260920-1229' })).toBe('MIDDAY');
    expect(drawSession({ drawNumber: 'GA-20260920-1859' })).toBe('EVENING');
  });

  it('uses the Haitian local result time when no session code is provided', () => {
    expect(drawSession({ resultAt: '2026-09-20T16:29:00.000Z' })).toBe('MIDDAY');
  });

  it('uses the actual draw timestamp before a legacy schedule suffix', () => {
    expect(drawSession({ drawNumber: 'GA-20260920-1859', resultAt: '2026-09-20T16:29:00.000Z' })).toBe('MIDDAY');
  });

  it('prefers explicit session names when a draw provides them', () => {
    expect(drawSession({ sessionType: 'MATIN' })).toBe('MORNING');
    expect(drawSession({ drawNumber: 'GA-20260920-EVE' })).toBe('EVENING');
  });

  it('shows normal midday in Haitian Creole and French', () => {
    const draw = { game: { name: 'Georgia' }, drawNumber: 'GA-20260920-1229' };
    expect(drawSessionLabel(draw, 'ht')).toBe('Nòmal · Midi');
    expect(drawLabel(draw, 'fr')).toContain('Normal · Midi');
  });
});
