export type TicketSaleLine = {
  drawId?: string;
  betTypeId: string;
  selection: string;
  stake: string;
  resultPosition?: number;
};

type FreeMaryajLine = { selection: string[] };

type TicketApiLine = Omit<TicketSaleLine, 'drawId' | 'selection'> & {
  selection: string[];
};

export function buildTicketSalePayload(
  lines: TicketSaleLine[],
  selectedDrawId: string,
  idempotencyKey: string,
  deviceId?: string,
  freeMaryaj: FreeMaryajLine[] = [],
) {
  const byDraw = new Map<string, TicketApiLine[]>();
  for (const line of lines) {
    const drawId = line.drawId || selectedDrawId;
    if (!drawId) throw new Error('DRAW_REQUIRED');
    const group = byDraw.get(drawId) ?? [];
    group.push({
      betTypeId: line.betTypeId,
      selection: line.selection.split(/[ ,.-]+/).filter(Boolean),
      stake: line.stake,
      resultPosition: line.resultPosition,
    });
    byDraw.set(drawId, group);
  }

  const groups = [...byDraw].map(([drawId, groupedLines]) => ({ drawId, lines: groupedLines }));
  if (!groups.length) throw new Error('TICKET_EMPTY');
  if (freeMaryaj.length > 0 && groups.length > 1) {
    groups.sort((left, right) => Number(right.drawId === selectedDrawId) - Number(left.drawId === selectedDrawId));
  }

  const common = { deviceId: deviceId || undefined, idempotencyKey };
  if (groups.length > 1) return { ...common, draws: groups, ...(freeMaryaj.length ? { freeMaryaj } : {}) };
  return {
    ...common,
    drawId: groups[0].drawId,
    lines: groups[0].lines,
    ...(freeMaryaj.length ? { freeMaryaj } : {}),
  };
}
