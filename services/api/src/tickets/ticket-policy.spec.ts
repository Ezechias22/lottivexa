import { describe, expect, it } from 'vitest';
import { cancellationDeadline, deriveFreeMaryajSelections, isWinningSelection, normalizeSelection, priceLines, resultWinningKeys, winningSelectionCount } from './ticket-policy';

const line = { betTypeId: 'bet-1', selection: ['12'], stake: '1.25', odds: '20.5', selectionCount: 1, numberMin: 0, numberMax: 99, allowRepeats: true };

describe('ticket pricing', () => {
  it('uses exact decimal math', () => {
    const priced = priceLines([{ ...line, stake: '1.25' }]);
    expect(priced[0].potentialWin.toFixed(4)).toBe('25.6250');
    expect(priced[0].selectionKey).toBe('12');
  });
  it('rejects zero and negative stakes', () => {
    expect(() => priceLines([{ ...line, stake: '0' }])).toThrow('INVALID_AMOUNT');
  });
  it('preserves ordered duplicate result balls for dekabès calculations', () => {
    expect(resultWinningKeys({ winningKeys: ['12', '12', '34'] })).toEqual(['12', '12', '34']);
  });
  it('rejects malformed result keys', () => {
    expect(() => resultWinningKeys({ numbers: [12, 34] })).toThrow('INVALID_RESULT_FORMAT');
  });
});

describe('Haitian result positions and dekabès', () => {
  it('matches maryaj regardless of order', () => expect(isWinningSelection('MARYAJ', '56-12', ['12', '34', '56'])).toBe(true));
  it('rejects incomplete maryaj', () => expect(isWinningSelection('MARYAJ', '12-99', ['12', '34', '56'])).toBe(false));
  it('keeps loto exact', () => expect(isWinningSelection('LOTO4', '1234', ['12', '34', '56', '1234'])).toBe(true));
  it('prices and evaluates first, second and third choices', () => {
    const priced = priceLines([{ ...line, selection: ['34'], resultPosition: 2 }]);
    expect(priced[0].selectionKey).toBe('34@2');
    expect(isWinningSelection('BOLET', '34@2', ['12', '34', '56'])).toBe(true);
    expect(isWinningSelection('BOLET', '34@1', ['12', '34', '56'])).toBe(false);
  });
  it('counts repeated winning positions as dekabès for a Bolet line', () => {
    expect(winningSelectionCount('BOLET', '12', ['12', '12', '34'])).toBe(2);
    expect(winningSelectionCount('BOLET', '12@1', ['12', '12', '34'])).toBe(2);
    expect(winningSelectionCount('BOLET', '12@3', ['12', '12', '34'])).toBe(0);
  });
  it('rejects positions outside 1 through 3', () => {
    expect(() => priceLines([{ ...line, resultPosition: 4 }])).toThrow('INVALID_RESULT_POSITION');
  });
});

describe('selection formatting and cancellation', () => {
  it('keeps the leading zero in Boul Pè', () => expect(normalizeSelection('BOUL_PE', [0])).toEqual(['00']));
  it('limits cancellation to the earlier deadline', () => {
    expect(cancellationDeadline(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T00:10:00Z'), 60).toISOString()).toBe('2026-01-01T00:01:00.000Z');
  });
});

describe('100 HTG Maryaj bonus suggestions', () => {
  it('derives two free Maryaj lines from Bolet and Boul Pè numbers while preserving zeroes', () => {
    expect(deriveFreeMaryajSelections([
      { code: 'BOLET', selection: ['00'] },
      { code: 'BOUL_PE', selection: ['11'] },
      { code: 'BOUL_PE', selection: ['22'] },
    ])).toEqual([['00', '11'], ['00', '22']]);
  });

  it('derives two free Maryaj lines from Loto digits', () => {
    expect(deriveFreeMaryajSelections([{ code: 'LOTO4', selection: ['0011'] }]))
      .toEqual([['00', '11'], ['00', '11']]);
  });

  it('asks the seller for bonus numbers when a ticket has only one usable two-digit number', () => {
    expect(deriveFreeMaryajSelections([{ code: 'BOLET', selection: ['00'] }])).toEqual([]);
  });
});
