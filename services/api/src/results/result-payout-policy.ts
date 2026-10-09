import { Prisma } from '@lottivexa/database';
import { winningResultPositions } from '../tickets/ticket-policy';

export type ResultPositionOdds = {
  resultPosition: number | null;
  multiplier: Prisma.Decimal | string | number;
};

export function calculateLineWinningAmount(input: {
  betTypeCode: string;
  selectionKey: string;
  winningKeys: readonly string[];
  winCount: number;
  stake: Prisma.Decimal | string | number;
  storedOdds: Prisma.Decimal | string | number;
  potentialWin: Prisma.Decimal | string | number;
  positionOdds: readonly ResultPositionOdds[];
}): Prisma.Decimal {
  const zero = new Prisma.Decimal(0);
  if (!Number.isInteger(input.winCount) || input.winCount <= 0) return zero;

  if (input.betTypeCode !== 'BOLET' && input.betTypeCode !== 'BOUL_PE') {
    return new Prisma.Decimal(input.potentialWin).mul(input.winCount);
  }

  const positions = winningResultPositions(input.betTypeCode, input.selectionKey, input.winningKeys);
  const stake = new Prisma.Decimal(input.stake);
  const storedOdds = new Prisma.Decimal(input.storedOdds);
  return positions.reduce((total, position) => {
    const multiplier = input.positionOdds.find(rule => rule.resultPosition === position)?.multiplier
      ?? input.positionOdds.find(rule => rule.resultPosition === null)?.multiplier
      ?? storedOdds;
    return total.add(stake.mul(multiplier).toDecimalPlaces(4));
  }, zero);
}
