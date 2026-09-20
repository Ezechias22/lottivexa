export type AutomaticBetLine = {
  betTypeId: string;
  selection: string;
  stake: string;
  resultPosition?: number;
  betName?: string;
};

type BetType = { id: string; code: string; name?: string };

export function collectAutomaticNumbers(lines: AutomaticBetLine[], betTypes: BetType[]) {
  const sourceIds = new Set(
    betTypes.filter((bet) => bet.code === 'BOLET' || bet.code === 'BOUL_PE').map((bet) => bet.id),
  );
  return [...new Set(lines
    .filter((line) => sourceIds.has(line.betTypeId) && /^\d{2}$/.test(line.selection))
    .map((line) => line.selection.padStart(2, '0')))]
    .sort((left, right) => Number(left) - Number(right));
}

export function buildAutomaticMaryaj(numbers: string[], bet: BetType, stake: string): AutomaticBetLine[] {
  const lines: AutomaticBetLine[] = [];
  for (let first = 0; first < numbers.length; first++) {
    for (let second = first + 1; second < numbers.length; second++) {
      lines.push({
        betTypeId: bet.id,
        betName: bet.name,
        selection: `${numbers[first]} ${numbers[second]}`,
        stake,
      });
    }
  }
  return lines;
}

export function buildAutomaticLoto4(numbers: string[], bet: BetType, stake: string, positions: number[]) {
  const lines: AutomaticBetLine[] = [];
  for (let first = 0; first < numbers.length; first++) {
    for (let second = first + 1; second < numbers.length; second++) {
      for (const selection of [`${numbers[first]}${numbers[second]}`, `${numbers[second]}${numbers[first]}`]) {
        for (const resultPosition of positions) {
          lines.push({ betTypeId: bet.id, betName: bet.name, selection, stake, resultPosition });
        }
      }
    }
  }
  return lines;
}

export function buildAutomaticBoulPe(bet: BetType, stake: string): AutomaticBetLine[] {
  return ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99']
    .map((selection) => ({ betTypeId: bet.id, betName: bet.name, selection, stake }));
}
