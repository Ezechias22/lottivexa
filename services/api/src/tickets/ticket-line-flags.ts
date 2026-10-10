import { Prisma } from '@lottivexa/database';
import { RESULT_EVALUATION_VERSION } from '../results/results-reconciliation-policy';

type EventRecord = { type: string; metadata: unknown; createdAt?: Date | string; id?: bigint | number };
type DrawResultRecord = {
  id?: string;
  status?: string;
  publishedAt?: Date | string | null;
  result?: unknown;
};


function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function ticketLineFlags(events: readonly EventRecord[], lineId: string) {
  const created = events.find(event => event.type === 'CREATED');
  const createdData = asRecord(created?.metadata);
  const promoIds = Array.isArray(createdData?.freeMaryajLineIds)
    ? createdData.freeMaryajLineIds.filter((id): id is string => typeof id === 'string')
    : [];

  const orderedEvents = [...events].sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return aTime - bTime;
    if (a.id !== undefined && b.id !== undefined && a.id !== b.id) return Number(a.id) - Number(b.id);
    return 0;
  });
  const latestCheckRecord = [...orderedEvents].reverse().flatMap(event => {
    if (event.type !== 'RESULT_CHECKED') return [];
    const data = asRecord(event.metadata);
    const counts = Array.isArray(data?.lineWinCounts) ? data.lineWinCounts : [];
    const item = counts.map(asRecord).find(value => value?.lineId === lineId);
    return item && data ? [{ item, data }] : [];
  })[0];
  const latestCheck = latestCheckRecord?.item;
  const lineWinningAmountRecord = (Array.isArray(latestCheckRecord?.data.lineWinAmounts) ? latestCheckRecord.data.lineWinAmounts : [])
    .map(asRecord)
    .find(value => value?.lineId === lineId);
  const rawLineWinningAmount = lineWinningAmountRecord?.amount;
  const lineWinningAmount = typeof rawLineWinningAmount === 'string' || typeof rawLineWinningAmount === 'number'
    ? String(rawLineWinningAmount)
    : undefined;
  const legacyWinner = latestCheck ? undefined : [...orderedEvents].reverse().find(event => event.type === 'MARKED_WINNER');
  const legacyData = asRecord(legacyWinner?.metadata);
  const legacyCounts = Array.isArray(legacyData?.lineWinCounts) ? legacyData.lineWinCounts : [];
  const legacyItem = legacyCounts.map(asRecord).find(item => item?.lineId === lineId);
  const lineCount = latestCheck ? latestCheck.winCount : legacyItem?.winCount;
  const winningDrawIds = typeof (latestCheck?.drawId ?? legacyItem?.drawId) === 'string'
    ? [String(latestCheck?.drawId ?? legacyItem?.drawId)]
    : legacyCounts
      .filter(item => item?.lineId === lineId && typeof item?.drawId === 'string')
      .map(item => item?.drawId as string);

  return {
    isPromotional: promoIds.includes(lineId),
    winCount: typeof lineCount === 'number' && Number.isInteger(lineCount) ? lineCount : 0,
    winningDrawIds,
    lineWinningAmount,
  };
}

export function confirmedLineWinningAmount(
  storedPayout: unknown,
  winCount: number,
  hasConfirmedTicketWin: boolean,
): string | undefined {
  if (!hasConfirmedTicketWin) return undefined;
  const payout = storedPayout as {
    mul?: (value: number) => { toString: () => string };
  } | undefined;
  if (!payout?.mul) return undefined;
  const count = Number.isInteger(winCount) && winCount > 0 ? winCount : 1;
  return payout.mul(count).toString();
}

function dateIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function hasCurrentDrawCheck(events: readonly EventRecord[], draw: DrawResultRecord): boolean {
  if (!draw.id || draw.status !== 'RESULT_PUBLISHED') return false;
  const publishedAt = dateIso(draw.publishedAt);
  if (!publishedAt) return false;

  return events.some(event => {
    if (event.type !== 'RESULT_CHECKED') return false;
    const metadata = asRecord(event.metadata);
    const versions = metadata?.checkedDrawVersions;
    return Array.isArray(versions) && versions.some(value => {
      const version = asRecord(value);
      return version !== undefined && version.drawId === draw.id
        && version?.publishedAt === publishedAt
        && version?.evaluationVersion === RESULT_EVALUATION_VERSION;
    });
  });
}

function currentLineCheck(
  events: readonly EventRecord[],
  lineId: string,
  drawId: string | undefined,
  draw: DrawResultRecord | undefined,
): { winCount: number } | undefined {
  if (!drawId || !draw || draw.id !== drawId || !hasCurrentDrawCheck(events, draw)) return undefined;

  const ordered = [...events].sort((left, right) => {
    const leftTime = left.createdAt instanceof Date ? left.createdAt.getTime() : left.createdAt ? Date.parse(left.createdAt) : Number.NaN;
    const rightTime = right.createdAt instanceof Date ? right.createdAt.getTime() : right.createdAt ? Date.parse(right.createdAt) : Number.NaN;
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
    if (left.id !== undefined && right.id !== undefined && left.id !== right.id) return Number(left.id) - Number(right.id);
    return 0;
  });

  for (const event of ordered.reverse()) {
    if (event.type !== 'RESULT_CHECKED') continue;
    const metadata = asRecord(event.metadata);
    const versions = metadata?.checkedDrawVersions;
    const isCurrent = Array.isArray(versions) && versions.some(value => {
      const version = asRecord(value);
      return version !== undefined && version.drawId === draw.id
        && version?.publishedAt === dateIso(draw.publishedAt)
        && version?.evaluationVersion === RESULT_EVALUATION_VERSION;
    });
    if (!isCurrent || !Array.isArray(metadata?.lineWinCounts)) continue;
    const line = metadata.lineWinCounts.map(asRecord).find(value => value?.lineId === lineId && value.drawId === drawId);
    if (typeof line?.winCount === 'number' && Number.isInteger(line.winCount) && line.winCount >= 0) {
      return { winCount: line.winCount };
    }
  }
  return undefined;
}

function normalizedBall(value: string): string {
  return value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/^0+(?=\d)/, '');
}

function winningKeysForLine(code: string | undefined, selectionKey: string | undefined, draw: DrawResultRecord | undefined): string[] {
  const rawKeys = asRecord(draw?.result)?.winningKeys;
  if (!selectionKey || !Array.isArray(rawKeys) || rawKeys.some(key => typeof key !== 'string')) return [];
  const [selection, positionText] = selectionKey.split('@');
  const position = positionText ? Number(positionText) : undefined;
  const keys = (rawKeys as string[]).map(value => value.split('@')[0]);
  const candidates = code === 'BOLET'
    // Legacy tickets stored an automatic @1 suffix; Bolet pays by the actual result rank.
    ? keys.slice(0, 3)
    : position && Number.isInteger(position) && position > 0 ? keys.slice(position - 1, position) : keys;
  const normalizedSelection = normalizedBall(selection);
  if (code === 'BOLET' || code === 'BOUL_PE') {
    return candidates.filter(value => {
      const normalized = normalizedBall(value);
      return normalized === normalizedSelection || (/^\d{3}$/.test(normalized) && normalized.slice(-2) === normalizedSelection);
    });
  }
  if (code === 'MARYAJ') {
    const selectionParts = selection.split('-').map(normalizedBall);
    if (selectionParts.length !== 2 || !selectionParts.every(part => keys.some(key => normalizedBall(key) === part))) return [];
    return keys.filter(key => selectionParts.includes(normalizedBall(key)));
  }
  const joinedSelection = normalizedBall(selection.split('-').join(''));
  return candidates.filter(value => normalizedBall(value) === normalizedSelection || normalizedBall(value) === joinedSelection);
}

export function presentTicketLines<T extends {
  events: EventRecord[];
  lines: Array<{ id: string; drawId?: string | null; isWinner?: boolean | null; potentialWin?: unknown; selectionKey?: string; betType?: { code?: string } }>;
  drawId?: string;
  draw?: DrawResultRecord | null;
  ticketDraws?: Array<{ drawId?: string; draw?: DrawResultRecord | null }>;
  status?: string;
  payout?: unknown;
  currencyCode?: string;
  potentialWin?: unknown;
  winning?: { winningAmount?: unknown } | null;
}>(ticket: T) {
  const { potentialWin: _ticketPotentialWin, ...visibleTicket } = ticket;
  const relatedDraws = ticket.ticketDraws?.length
    ? ticket.ticketDraws.map(item => item.draw).filter((draw): draw is DrawResultRecord => Boolean(draw))
    : ticket.draw ? [ticket.draw] : [];
  const drawById = new Map(relatedDraws.filter(draw => draw.id).map(draw => [draw.id!, draw]));
  const ticketDrawIds = ticket.ticketDraws?.length
    ? ticket.ticketDraws.map(item => item.drawId ?? item.draw?.id).filter((id): id is string => Boolean(id))
    : [ticket.drawId ?? ticket.draw?.id].filter((id): id is string => Boolean(id));
  const distinctDrawIds = [...new Set(ticketDrawIds)];
  const allDrawsResolved = distinctDrawIds.length > 0 && distinctDrawIds.every(id => {
    const draw = drawById.get(id);
    const result = asRecord(draw?.result);
    return draw?.status === 'RESULT_PUBLISHED' && Array.isArray(result?.winningKeys) && result.winningKeys.length > 0;
  });
  const drawChecksCurrent = allDrawsResolved && distinctDrawIds.every(id => {
    const draw = drawById.get(id);
    return Boolean(draw && hasCurrentDrawCheck(ticket.events, draw));
  });
  const lineOutcomes = ticket.lines.map(line => {
    const lineDrawId = line.drawId ?? ticket.drawId ?? ticket.draw?.id;
    const draw = lineDrawId ? drawById.get(lineDrawId) : undefined;
    const result = currentLineCheck(ticket.events, line.id, lineDrawId, draw);
    return { line, drawId: lineDrawId, draw, result };
  });
  const resultEvaluationConfirmed = Boolean(drawChecksCurrent && lineOutcomes.length > 0 && lineOutcomes.every(item => item.result !== undefined));
  const hasWinningLine = resultEvaluationConfirmed && lineOutcomes.some(item => (item.result?.winCount ?? 0) > 0);
  const expectedAmount = lineOutcomes.reduce((total, { line, result }) => {
    if (!result || result.winCount <= 0) return total;
    const flags = ticketLineFlags(ticket.events, line.id);
    const amount = flags.lineWinningAmount ?? confirmedLineWinningAmount(line.potentialWin, result.winCount, true);
    return amount ? total.add(new Prisma.Decimal(amount)) : total;
  }, new Prisma.Decimal(0));
  const storedAmount = new Prisma.Decimal(String((ticket.winning as { winningAmount?: unknown } | null)?.winningAmount ?? 0));
  const isPaid = Boolean(ticket.payout) || ticket.status === 'PAID';
  const hasConfirmedWinnings = Boolean(resultEvaluationConfirmed && hasWinningLine && expectedAmount.gt(0) && expectedAmount.equals(storedAmount));
  let status = ticket.status;
  if (!isPaid && !['CANCELLED', 'VOID', 'EXPIRED'].includes(String(ticket.status))) {
    if (resultEvaluationConfirmed) status = !hasWinningLine ? 'LOSER' : hasConfirmedWinnings ? 'WINNER' : 'PENDING';
    else if (ticket.status === 'WINNER' || ticket.status === 'LOSER') status = 'PENDING';
  }
  const winning = isPaid || hasConfirmedWinnings ? ticket.winning : null;
  return {
    ...visibleTicket,
    status,
    winning,
    resultEvaluationConfirmed,
    ...(ticket.currencyCode ? { currency: ticket.currencyCode } : {}),
    lines: lineOutcomes.map(({ line, draw, result }) => {
      const flags = ticketLineFlags(ticket.events, line.id);
      const { potentialWin: _linePotentialWin, ...visibleLine } = line;
      const isWinner = result ? result.winCount > 0 : null;
      const winCount = result?.winCount ?? 0;
      const winningAmount = hasConfirmedWinnings && isWinner === true && flags.lineWinningAmount !== undefined
        ? flags.lineWinningAmount
        : confirmedLineWinningAmount(line.potentialWin, winCount, hasConfirmedWinnings && isWinner === true);
      const matchedWinningKeys = result && result.winCount > 0 ? winningKeysForLine(line.betType?.code, line.selectionKey, draw) : [];
      return {
        ...visibleLine,
        isPromotional: flags.isPromotional,
        winCount,
        winningDrawIds: result && result.winCount > 0 && line.drawId ? [line.drawId] : [],
        resultConfirmed: Boolean(result),
        matchedWinningKeys,
        isWinner,
        ...(winningAmount ? { winningAmount } : {}),
      };
    }),
  };
}
