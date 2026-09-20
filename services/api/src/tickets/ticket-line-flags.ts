type EventRecord = { type: string; metadata: unknown };

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

  const winner = [...events].reverse().find(event => event.type === 'MARKED_WINNER');
  const winnerData = asRecord(winner?.metadata);
  const counts = Array.isArray(winnerData?.lineWinCounts) ? winnerData.lineWinCounts : [];
  const lineCount = counts.map(asRecord).find(item => item?.lineId === lineId)?.winCount;

  return {
    isPromotional: promoIds.includes(lineId),
    winCount: typeof lineCount === 'number' && Number.isInteger(lineCount) ? lineCount : 0,
  };
}

export function presentTicketLines<T extends {
  events: EventRecord[];
  lines: Array<{ id: string }>;
}>(ticket: T) {
  return {
    ...ticket,
    lines: ticket.lines.map(line => ({ ...line, ...ticketLineFlags(ticket.events, line.id) })),
  };
}
