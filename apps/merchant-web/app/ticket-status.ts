export type TicketStatusView = Record<string, any>;

export function ticketDisplayStatus(ticket: TicketStatusView): string {
  const raw = String(ticket?.status ?? 'VALID');
  if (ticket?.payout || raw === 'PAID') return 'PAID';
  if (['CANCELLED', 'VOID', 'EXPIRED'].includes(raw)) return raw;

  const linkedDraws = Array.isArray(ticket?.ticketDraws)
    ? ticket.ticketDraws.map((item: TicketStatusView) => item?.draw).filter(Boolean)
    : [];
  const draws = linkedDraws.length
    ? linkedDraws
    : Array.isArray(ticket?.draws) && ticket.draws.length
      ? ticket.draws
      : ticket?.draw ? [ticket.draw] : [];
  const allDrawsResolved = draws.length > 0 && draws.every((draw: TicketStatusView) =>
    draw?.status === 'RESULT_PUBLISHED' || Boolean(draw?.result?.winningKeys?.length),
  );
  if (draws.length > 0 && !allDrawsResolved) return 'PENDING';

  const lines = Array.isArray(ticket?.lines) ? ticket.lines : [];
  if (allDrawsResolved && lines.length > 0 && lines.every((line: TicketStatusView) => typeof line?.isWinner === 'boolean')) {
    return lines.some((line: TicketStatusView) => line.isWinner === true) ? 'WINNER' : 'LOSER';
  }
  if (lines.some((line: TicketStatusView) => line?.isWinner === true)
    || Number(ticket?.winning?.winningAmount ?? 0) > 0) return 'WINNER';
  if (raw === 'WINNER' || raw === 'LOSER') return raw;
  return 'PENDING';
}

export function ticketWinningAmount(ticket: TicketStatusView): number {
  const stored = Number(ticket?.winning?.winningAmount ?? 0);
  if (stored > 0) return stored;
  return (Array.isArray(ticket?.lines) ? ticket.lines : []).reduce((sum: number, line: TicketStatusView) => {
    if (line?.isWinner !== true) return sum;
    const count = Number(line?.winCount ?? 1);
    if (!Number.isFinite(count) || count <= 0) return sum;
    return sum + Number(line?.potentialWin ?? 0) * count;
  }, 0);
}

export function ticketNeedsWinningReview(ticket: TicketStatusView): boolean {
  if (ticketDisplayStatus(ticket) !== 'WINNER') return false;
  const storedAmount = Number(ticket?.winning?.winningAmount ?? 0);
  const hasWinningLine = (Array.isArray(ticket?.lines) ? ticket.lines : [])
    .some((line: TicketStatusView) => line?.isWinner === true);
  return storedAmount <= 0 || ticketWinningAmount(ticket) <= 0 || !hasWinningLine;
}
