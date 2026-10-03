import { winningSelectionCount } from '../tickets/ticket-policy';

export type ResultLine = {
  id: string;
  drawId: string | null;
  selectionKey: string;
  betType: { code: string };
};

export function evaluateTicketResults(
  primaryDrawId: string,
  ticketDrawIds: readonly string[],
  lines: readonly ResultLine[],
  resultKeysByDraw: ReadonlyMap<string, readonly string[]>,
) {
  const drawIds = [...new Set(ticketDrawIds.length ? ticketDrawIds : [primaryDrawId])];
  const lineResults = lines.map(line => {
    const drawId = line.drawId ?? primaryDrawId;
    const winningKeys = resultKeysByDraw.get(drawId);
    if (!winningKeys) return { lineId: line.id, drawId, winCount: null, isWinner: null };
    const winCount = winningSelectionCount(line.betType.code, line.selectionKey, winningKeys);
    return { lineId: line.id, drawId, winCount, isWinner: winCount > 0 };
  });

  return {
    drawIds,
    allDrawsResolved: drawIds.every(drawId => resultKeysByDraw.has(drawId)),
    lineResults,
  };
}
