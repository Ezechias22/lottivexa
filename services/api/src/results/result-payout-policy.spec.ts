import { describe, expect, it } from 'vitest';
import { calculateLineWinningAmount } from './result-payout-policy';

describe('result-specific Bolet payout calculation', () => {
  const positionOdds = [
    { resultPosition: null, multiplier: '60' },
    { resultPosition: 1, multiplier: '60' },
    { resultPosition: 2, multiplier: '10' },
    { resultPosition: 3, multiplier: '5' },
  ];

  it('uses the historical second-place rate instead of the ticket’s general rate', () => {
    const amount = calculateLineWinningAmount({
      betTypeCode: 'BOLET',
      selectionKey: '55',
      winningKeys: ['12', '255', '34'],
      winCount: 1,
      stake: '4',
      storedOdds: '60',
      potentialWin: '240',
      positionOdds,
    });

    expect(amount.toFixed(2)).toBe('40.00');
  });

  it('adds the configured payout for each rank when an unpositioned number hits more than once', () => {
    const amount = calculateLineWinningAmount({
      betTypeCode: 'BOLET',
      selectionKey: '55',
      winningKeys: ['255', '55', '55'],
      winCount: 3,
      stake: '4',
      storedOdds: '60',
      potentialWin: '240',
      positionOdds,
    });

    expect(amount.toFixed(2)).toBe('300.00');
  });

  it('pays a position-specific line only once using that position’s rate', () => {
    const amount = calculateLineWinningAmount({
      betTypeCode: 'BOLET',
      selectionKey: '55@2',
      winningKeys: ['255', '255', '255', '255'],
      winCount: 1,
      stake: '4',
      storedOdds: '10',
      potentialWin: '40',
      positionOdds,
    });

    expect(amount.toFixed(2)).toBe('40.00');
  });

  it('keeps the stored potential payout for other bet types', () => {
    const amount = calculateLineWinningAmount({
      betTypeCode: 'LOTO4',
      selectionKey: '1234',
      winningKeys: ['1234'],
      winCount: 1,
      stake: '4',
      storedOdds: '5000',
      potentialWin: '20000',
      positionOdds: [],
    });

    expect(amount.toFixed(2)).toBe('20000.00');
  });
});
