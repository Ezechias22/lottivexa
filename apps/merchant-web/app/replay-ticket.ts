export type ReplayTicket = {
  lines?: Array<Record<string, unknown>>;
};

export type ReplayLine = {
  betTypeId: string;
  selection: string;
  stake: string;
  resultPosition?: number;
  betName?: string;
};

/** Copies the bets but deliberately drops their old draw assignments. */
export function replayTicketLines(ticket: ReplayTicket): ReplayLine[] {
  return (ticket.lines ?? []).map((line) => {
    const selectionKey = String(line.selectionKey ?? line.selection ?? '');
    const [selection, positionText] = selectionKey.split('@');
    const betType = line.betType as Record<string, unknown> | undefined;
    const code = String(betType?.code ?? '');
    const resultPosition = /^LOTO[345]$/.test(code) && positionText
      ? Number(positionText)
      : undefined;

    return {
      betTypeId: String(line.betTypeId ?? ''),
      selection,
      stake: String(line.stake ?? ''),
      ...(resultPosition ? { resultPosition } : {}),
      ...(betType?.name ? { betName: String(betType.name) } : {}),
    };
  });
}
