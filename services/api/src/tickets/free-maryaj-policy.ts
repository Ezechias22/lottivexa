import { randomInt } from 'node:crypto';

export type FreeMaryajPolicy = {
  countryCode: string;
  minimumAmount: string;
  freeTicketCount: number;
  payoutAmount: string | null;
};

const DEFAULTS: Record<string, Omit<FreeMaryajPolicy, 'countryCode'>> = {
  US: { minimumAmount: '20', freeTicketCount: 2, payoutAmount: '50' },
};

const DEFAULT_POLICY: Omit<FreeMaryajPolicy, 'countryCode'> = {
  minimumAmount: '100',
  freeTicketCount: 2,
  payoutAmount: null,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function positiveMoney(value: unknown): string | undefined {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  if (!/^\d{1,9}(?:\.\d{1,4})?$/.test(text) || Number(text) <= 0) return undefined;
  return text;
}

export function resolveFreeMaryajPolicy(countryCode: string, storedValue?: unknown): FreeMaryajPolicy {
  const normalizedCountry = countryCode.trim().toUpperCase();
  const defaults = DEFAULTS[normalizedCountry] ?? DEFAULT_POLICY;
  const value = asRecord(storedValue);
  const minimumAmount = positiveMoney(value.minimumAmount) ?? defaults.minimumAmount;
  const count = Number(value.freeTicketCount);
  const freeTicketCount = Number.isInteger(count) && count >= 1 && count <= 10
    ? count
    : defaults.freeTicketCount;
  const payoutAmount = value.payoutAmount === null || value.payoutAmount === ''
    ? null
    : positiveMoney(value.payoutAmount) ?? defaults.payoutAmount;
  return { countryCode: normalizedCountry, minimumAmount, freeTicketCount, payoutAmount };
}

export function validateFreeMaryajPolicy(input: unknown): Omit<FreeMaryajPolicy, 'countryCode'> | undefined {
  const value = asRecord(input);
  const minimumAmount = positiveMoney(value.minimumAmount);
  const count = Number(value.freeTicketCount);
  const payoutAmount = value.payoutAmount === null || value.payoutAmount === ''
    ? null
    : positiveMoney(value.payoutAmount);
  if (!minimumAmount || !Number.isInteger(count) || count < 1 || count > 10
    || (value.payoutAmount !== null && value.payoutAmount !== '' && !payoutAmount)) return undefined;
  return { minimumAmount, freeTicketCount: count, payoutAmount: payoutAmount ?? null };
}

/** Generate the promotional selections on the server so every client follows the same rule. */
export function randomFreeMaryajSelections(
  count: number,
  pick: (max: number) => number = randomInt,
  blockedNumberKeys: readonly string[] = [],
): string[][] {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new RangeError('INVALID_FREE_MARYAJ_COUNT');
  const selections: string[][] = [];
  const used = new Set<string>();
  const canonicalNumber = (value: string) => value.replace(/^0+(?=\d)/, '');
  const canonicalPair = (value: string) => value.split('@')[0].split('-')
    .map(canonicalNumber).sort((a, b) => Number(a) - Number(b)).join('-');
  const blockedPairs = new Set(blockedNumberKeys.filter(value => value.split('@')[0].includes('-')).map(canonicalPair));
  const blockedBalls = new Set(blockedNumberKeys.filter(value => !value.split('@')[0].includes('-'))
    .map(value => canonicalNumber(value.split('@')[0])));
  let attempts = 0;
  while (selections.length < count) {
    if (++attempts > 20_000) throw new RangeError('FREE_MARYAJ_NUMBERS_BLOCKED');
    const left = pick(100);
    const right = pick(100);
    if (left < 0 || left > 99 || right < 0 || right > 99 || left === right) continue;
    const pair = [String(left).padStart(2, '0'), String(right).padStart(2, '0')];
    const key = canonicalPair(pair.join('-'));
    if (used.has(key) || blockedPairs.has(key) || pair.some(number => blockedBalls.has(canonicalNumber(number)))) continue;
    used.add(key);
    selections.push(pair);
  }
  return selections;
}
