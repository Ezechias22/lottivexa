export type TicketDeleteDraw = {
  id?: string;
  status?: string | null;
  closesAt?: Date | string | null;
};

export type MerchantTicketDeleteReason =
  | 'TICKET_DELETE_DRAW_CLOSED'
  | 'TICKET_DELETE_FINALIZED';

export function merchantTicketDeleteBlockReason(
  ticket: {
    status?: string | null;
    hasPayout?: boolean;
    hasWinningRecord?: boolean;
    draws: readonly TicketDeleteDraw[];
  },
  now = new Date(),
): MerchantTicketDeleteReason | null {
  if (
    ticket.status !== 'VALID' ||
    ticket.hasPayout ||
    ticket.hasWinningRecord
  ) {
    return 'TICKET_DELETE_FINALIZED';
  }

  if (
    ticket.draws.length === 0 ||
    ticket.draws.some((draw) => {
      const closesAt = draw.closesAt ? new Date(draw.closesAt).getTime() : NaN;
      return draw.status !== 'OPEN' || !Number.isFinite(closesAt) || now.getTime() >= closesAt;
    })
  ) {
    return 'TICKET_DELETE_DRAW_CLOSED';
  }

  return null;
}
