type EventRecord = { type: string; metadata: unknown; createdAt?: Date | string; id?: bigint | number };

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
  const latestCheck = [...orderedEvents].reverse().flatMap(event => {
    if (event.type !== 'RESULT_CHECKED') return [];
    const data = asRecord(event.metadata);
    const counts = Array.isArray(data?.lineWinCounts) ? data.lineWinCounts : [];
    const item = counts.map(asRecord).find(value => value?.lineId === lineId);
    return item ? [{ item }] : [];
  })[0]?.item;
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
  };
}

export function presentTicketLines<T extends {
  events: EventRecord[];
  lines: Array<{ id: string; isWinner?: boolean | null }>;
}>(ticket: T) {
  return {
    ...ticket,
    lines: ticket.lines.map(line => {
      const flags = ticketLineFlags(ticket.events, line.id);
      // Rehydrate winner flags from the authoritative result event.
      return {
        ...line,
        ...flags,
        ...(line.isWinner == null && flags.winCount > 0 ? { isWinner: true } : {}),
      };
    }),
  };
}
