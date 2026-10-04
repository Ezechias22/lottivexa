import { describe, expect, it } from 'vitest';
import { drawLabel, drawSession, drawSessionLabel, ticketDrawLabels } from './draw-label';

describe('draw session labels', () => {
  it('recognizes catalog day and evening sessions from the scheduled draw number', () => {
    expect(drawSession({ drawNumber: 'GA-20260920-1229' })).toBe('MIDDAY');
    expect(drawSession({ drawNumber: 'GA-20260920-1859' })).toBe('EVENING');
  });

  it('uses the Haitian local result time when no session code is provided', () => {
    expect(drawSession({ resultAt: '2026-09-20T16:29:00.000Z' })).toBe('MIDDAY');
  });

  it('uses the scheduled time encoded in the draw number before stale timestamps', () => {
    expect(drawSession({ drawNumber: 'GA-20260920-1859', resultAt: '2026-09-20T16:29:00.000Z' })).toBe('EVENING');
  });

  it('shows the encoded calendar date and time without a timezone day shift', () => {
    const label = drawLabel({ game: { name: 'New York' }, drawNumber: 'NY-20260912-2230', drawDate: '2026-09-13T00:00:00.000Z' }, 'fr');
    expect(label).toContain('12/09/2026');
    expect(label).toContain('22:30');
    expect(label).toContain('Nuit');
  });

  it('prefers explicit session names when a draw provides them', () => {
    expect(drawSession({ sessionType: 'MATIN' })).toBe('MORNING');
    expect(drawSession({ drawNumber: 'GA-20260920-EVE' })).toBe('EVENING');
  });

  it('shows the concise midday label in Haitian Creole and French', () => {
    const draw = { game: { name: 'Georgia' }, drawNumber: 'GA-20260920-1229' };
    expect(drawSessionLabel(draw, 'ht')).toBe('Midi');
    expect(drawLabel(draw, 'fr')).toContain('Midi');
  });

  it('lists the linked draw and falls back to the primary draw', () => {
    const gameDraw = { game: { name: 'Georgia' }, sessionType: 'EVENING' };
    expect(ticketDrawLabels({ draw: { game: { name: 'Florida' } }, ticketDraws: [{ draw: gameDraw }] }, 'ht'))
      .toBe('Georgia · Swa');
    expect(ticketDrawLabels({ draw: gameDraw }, 'fr')).toBe('Georgia · Soir');
  });
});
