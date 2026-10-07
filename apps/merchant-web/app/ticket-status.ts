export type TicketStatusView = Record<string, any>;

export function ticketDisplayStatus(ticket: TicketStatusView): string {
  const raw = String(ticket?.status ?? 'VALID');
  if (ticket?.payout || raw === 'PAID') return 'PAID';
  if (['CANCELLED', 'VOID', 'EXPIRED'].includes(raw)) return raw;
  if (ticket?.resultEvaluationConfirmed !== true) return 'PENDING';

  const lines = Array.isArray(ticket?.lines) ? ticket.lines : [];
  if (!lines.length || lines.some((line: TicketStatusView) => line?.resultConfirmed !== true || typeof line?.isWinner !== 'boolean')) return 'PENDING';
  return lines.some((line: TicketStatusView) => line.isWinner === true) ? 'WINNER' : 'LOSER';
}

export function ticketBelongsInWinnersList(ticket: TicketStatusView): boolean {
  const status = ticketDisplayStatus(ticket);
  return status === 'WINNER' || status === 'PAID';
}

export function ticketWinningAmount(ticket: TicketStatusView): number {
  const paidAmount = Number(ticket?.payout?.amount ?? ticket?.winning?.winningAmount ?? ticket?.winningAmount ?? 0);
  if (ticket?.payout || ticket?.status === 'PAID') return Number.isFinite(paidAmount) && paidAmount > 0 ? paidAmount : 0;
  if (ticket?.resultEvaluationConfirmed !== true || ticketDisplayStatus(ticket) !== 'WINNER') return 0;
  const confirmed = Number(ticket?.winning?.winningAmount ?? ticket?.winningAmount ?? 0);
  return Number.isFinite(confirmed) && confirmed > 0 ? confirmed : 0;
}

export function ticketNeedsWinningReview(ticket: TicketStatusView): boolean {
  if (ticketDisplayStatus(ticket) !== 'WINNER') return false;
  const storedAmount = Number(ticket?.winning?.winningAmount ?? 0);
  const hasWinningLine = (Array.isArray(ticket?.lines) ? ticket.lines : [])
    .some((line: TicketStatusView) => line?.resultConfirmed === true && line?.isWinner === true && Number(line?.winningAmount ?? 0) > 0);
  return storedAmount <= 0 || ticketWinningAmount(ticket) <= 0 || !hasWinningLine;
}
