type TicketDraw = {
  id?: string;
  status?: string | null;
  closesAt?: string | Date | null;
};

type MerchantTicket = {
  status?: string | null;
  payout?: unknown;
  winning?: unknown;
  draw?: TicketDraw | null;
  ticketDraws?: readonly ({ draw?: TicketDraw | null } | null)[];
};

export function canMerchantDeleteTicket(
  ticket: MerchantTicket | null | undefined,
  now = Date.now(),
): boolean {
  if (!ticket || ticket.status !== 'VALID' || ticket.payout || ticket.winning) return false;

  const draws = [ticket.draw, ...(ticket.ticketDraws ?? []).map((item) => item?.draw)]
    .filter((draw): draw is TicketDraw => Boolean(draw));
  const uniqueDraws = [...new Map(draws.map((draw, index) => [draw.id ?? `draw-${index}`, draw])).values()];

  return uniqueDraws.length > 0 && uniqueDraws.every((draw) => {
    const closesAt = draw.closesAt ? new Date(draw.closesAt).getTime() : NaN;
    return draw.status === 'OPEN' && Number.isFinite(closesAt) && now < closesAt;
  });
}
