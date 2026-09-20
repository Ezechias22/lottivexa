import { describe, expect, it } from 'vitest';
import {
  buildAutomaticBoulPe,
  buildAutomaticLoto4,
  buildAutomaticMaryaj,
  collectAutomaticNumbers,
} from './sell-tools';

describe('automatic lottery tools', () => {
  const bets = [
    { id: 'bolet', code: 'BOLET', name: 'Bolet' },
    { id: 'pair', code: 'BOUL_PE', name: 'Boul Pè' },
    { id: 'maryaj', code: 'MARYAJ', name: 'Maryaj' },
    { id: 'loto', code: 'LOTO4', name: 'Loto 4' },
  ];

  it('uses two-digit Bolet and Boul Pè entries as automatic inputs, keeping 00', () => {
    expect(collectAutomaticNumbers([
      { betTypeId: 'bolet', selection: '07', stake: '10' },
      { betTypeId: 'pair', selection: '00', stake: '10' },
      { betTypeId: 'pair', selection: '11', stake: '10' },
      { betTypeId: 'maryaj', selection: '12 25', stake: '10' },
      { betTypeId: 'loto', selection: '0045', stake: '10' },
    ], bets)).toEqual(['00', '07', '11']);
  });

  it('creates Maryaj pairs from the selected two-digit values', () => {
    expect(buildAutomaticMaryaj(['00', '11', '22'], bets[2], '5').map((line) => line.selection))
      .toEqual(['00 11', '00 22', '11 22']);
  });

  it('creates both Loto 4 orders for each selected result position', () => {
    expect(buildAutomaticLoto4(['00', '11'], bets[3], '2', [1, 3]))
      .toEqual([
        { betTypeId: 'loto', betName: 'Loto 4', selection: '0011', stake: '2', resultPosition: 1 },
        { betTypeId: 'loto', betName: 'Loto 4', selection: '0011', stake: '2', resultPosition: 3 },
        { betTypeId: 'loto', betName: 'Loto 4', selection: '1100', stake: '2', resultPosition: 1 },
        { betTypeId: 'loto', betName: 'Loto 4', selection: '1100', stake: '2', resultPosition: 3 },
      ]);
  });

  it('generates each Boul Pè as a two-digit string', () => {
    expect(buildAutomaticBoulPe(bets[1], '25').map((line) => line.selection))
      .toEqual(['00', '11', '22', '33', '44', '55', '66', '77', '88', '99']);
  });
});
