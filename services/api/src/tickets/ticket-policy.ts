import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@lottivexa/database';
import { validateSelection } from '../lottery/lottery-policy';

export type SelectionValue = number | string;
export type PricedLine = {
  betTypeId: string;
  selection: SelectionValue[];
  stake: string;
  resultPosition?: number;
  odds: string;
  selectionCount: number;
  numberMin: number;
  numberMax: number;
  allowRepeats: boolean;
};

export function normalizeSelection(code: string, selection: SelectionValue[]) {
  const width = ({ BOLET: 2, BOUL_PE: 2, MARYAJ: 2, LOTO3: 3, LOTO4: 4, LOTO5: 5 } as Record<string, number>)[code];
  return selection.map(value => {
    const raw = String(value);
    if (width && /^\d+$/.test(raw)) {
      if (raw.length > width) throw new BadRequestException('INVALID_SELECTION_FORMAT');
      return raw.padStart(width, '0');
    }
    return raw;
  });
}

export function chooseOdds<T extends { betTypeId: string; resultPosition: number | null }>(odds: T[], betTypeId: string, position?: number) {
  return odds.find(item => item.betTypeId === betTypeId && item.resultPosition === position)
    ?? odds.find(item => item.betTypeId === betTypeId && item.resultPosition === null);
}

export function priceLines<T extends PricedLine>(lines: T[]) {
  if (!lines.length) throw new BadRequestException('TICKET_EMPTY');
  return lines.map(line => {
    validateSelection(line.selection, line.selectionCount, line.numberMin, line.numberMax, line.allowRepeats);
    if (line.resultPosition !== undefined && ![1, 2, 3].includes(line.resultPosition)) throw new BadRequestException('INVALID_RESULT_POSITION');
    const stake = new Prisma.Decimal(line.stake);
    const odds = new Prisma.Decimal(line.odds);
    if (!stake.gt(0) || !odds.gt(0)) throw new BadRequestException('INVALID_AMOUNT');
    return { ...line, selectionKey: line.selection.join('-') + (line.resultPosition ? '@' + line.resultPosition : ''), stake, potentialWin: stake.mul(odds).toDecimalPlaces(4) };
  });
}

export function resultWinningKeys(result: unknown): string[] {
  if (!result || typeof result !== 'object' || !Array.isArray((result as { winningKeys?: unknown }).winningKeys)) throw new BadRequestException('INVALID_RESULT_FORMAT');
  const keys = (result as { winningKeys: unknown[] }).winningKeys;
  if (keys.some(key => typeof key !== 'string')) throw new BadRequestException('INVALID_RESULT_FORMAT');
  return keys as string[];
}

function clean(value: string) { return value.trim().replace(/^0+(?=\d)/, ''); }

export function winningSelectionCount(betTypeCode: string, storedSelectionKey: string, winningKeys: readonly string[] | Set<string>) {
  const ordered = [...winningKeys].map(clean);
  const hasPosition = storedSelectionKey.includes('@');
  const [selectionKey, positionText] = hasPosition ? storedSelectionKey.split('@') : [storedSelectionKey, undefined];
  const resultPosition = positionText === undefined ? undefined : Number(positionText);
  if (betTypeCode === 'MARYAJ') {
    const selection = selectionKey.split('-').map(clean);
    return selection.length === 2 && selection.every(value => ordered.includes(value)) ? 1 : 0;
  }
  if (betTypeCode === 'BOLET' || betTypeCode === 'BOUL_PE') {
    const matches = ordered.filter(value => value === clean(selectionKey)).length;
    return resultPosition ? (ordered[resultPosition - 1] === clean(selectionKey) ? matches : 0) : matches;
  }
  if (resultPosition) return ordered[resultPosition - 1] === clean(selectionKey) ? 1 : 0;
  const selection = selectionKey.split('-').map(clean);
  return ordered.some(value => value === clean(selectionKey) || value === selection.join('-')) ? 1 : 0;
}

export function isWinningSelection(betTypeCode: string, storedSelectionKey: string, winningKeys: readonly string[] | Set<string>) {
  return winningSelectionCount(betTypeCode, storedSelectionKey, winningKeys) > 0;
}

export const BOUL_PE_NUMBERS = ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99'] as const;

export function validateHaitianBetType(code: string, selection: SelectionValue[]) {
  if (code !== 'BOUL_PE') return;
  if (selection.length !== 1) throw new BadRequestException('INVALID_BOUL_PE');
  const value = String(selection[0]).padStart(2, '0');
  if (!/^\d{2}$/.test(value) || !BOUL_PE_NUMBERS.includes(value as typeof BOUL_PE_NUMBERS[number])) throw new BadRequestException('INVALID_BOUL_PE');
}

export function deriveFreeMaryajSelections(lines: Array<{ code: string; selection: SelectionValue[] }>) {
  const values: string[] = [];
  for (const line of lines) {
    if (line.code === 'BOLET' || line.code === 'BOUL_PE' || line.code === 'MARYAJ') {
      for (const value of line.selection) {
        const raw = String(value);
        if (/^\d{1,2}$/.test(raw)) values.push(raw.padStart(2, '0'));
      }
      continue;
    }
    if (!/^LOTO[345]$/.test(line.code)) continue;
    for (const value of line.selection) {
      const digits = String(value).replace(/\D/g, '');
      for (let index = 0; index + 1 < digits.length; index += 2) values.push(digits.slice(index, index + 2));
      if (digits.length >= 3 && digits.length % 2 === 1) values.push(digits.slice(-2));
    }
  }
  const numbers = [...new Set(values)];
  if (numbers.length < 2) return [];
  const first = [numbers[0], numbers[1]];
  const second = [numbers[0], numbers[2] ?? numbers[1]];
  return [first, second];
}

export function cancellationDeadline(createdAt: Date, drawClosesAt: Date, seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new BadRequestException('INVALID_CANCELLATION_WINDOW');
  return new Date(Math.min(drawClosesAt.getTime(), createdAt.getTime() + seconds * 1000));
}
