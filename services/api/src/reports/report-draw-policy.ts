import { Prisma } from '@lottivexa/database';

const zone = 'America/Port-au-Prince';
export type DrawSession = 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' | 'UNKNOWN';

export type ReportDraw = {
  id?: string;
  drawNumber?: string | null;
  drawDate?: Date | null;
  resultAt?: Date | null;
  opensAt?: Date | null;
  closesAt?: Date | null;
  game?: { name?: string | null; code?: string | null } | null;
};

type DrawTicket = {
  drawId: string;
  amount: Prisma.Decimal;
  draw: ReportDraw | null;
  lines: Array<{ drawId: string | null; stake: Prisma.Decimal; isPromotional: boolean }>;
  ticketDraws: Array<{ drawId: string; draw: ReportDraw | null }>;
};

export function reportDrawSession(date?: Date | null, drawNumber?: string | null): DrawSession {
  const scheduledTime = drawNumber?.match(/(?:^|[-_])(\d{4})$/)?.[1];
  if (scheduledTime) {
    const hour = Number(scheduledTime.slice(0, 2));
    const minute = Number(scheduledTime.slice(2));
    if (hour < 24 && minute < 60) {
      if (hour < 12) return 'MORNING';
      if (hour < 16) return 'MIDDAY';
      if (hour < 21) return 'EVENING';
      return 'NIGHT';
    }
  }
  if (!date) return 'UNKNOWN';
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date));
  if (hour < 12) return 'MORNING';
  if (hour < 16) return 'MIDDAY';
  if (hour < 21) return 'EVENING';
  return 'NIGHT';
}

export function groupTicketSalesByDraw(tickets: DrawTicket[]) {
  const grouped = new Map<string, { count: number; amount: Prisma.Decimal; draw: ReportDraw | null }>();
  for (const ticket of tickets) {
    const selected = ticket.ticketDraws.length
      ? ticket.ticketDraws.map((item) => ({
          drawId: item.drawId,
          draw: item.draw ?? (item.drawId === ticket.drawId ? ticket.draw : null),
        }))
      : [{ drawId: ticket.drawId, draw: ticket.draw }];

    for (const item of selected) {
      const ticketLines = ticket.lines.filter((line) => (line.drawId ?? ticket.drawId) === item.drawId);
      const paidLines = ticketLines.filter((line) => !line.isPromotional);
      const amount = ticketLines.length
        ? paidLines.reduce((sum, line) => sum.add(line.stake), new Prisma.Decimal(0))
        : ticket.lines.length === 0
          ? new Prisma.Decimal(ticket.amount)
          : new Prisma.Decimal(0);
      const current = grouped.get(item.drawId);
      if (current) {
        current.count += 1;
        current.amount = current.amount.add(amount);
      } else {
        grouped.set(item.drawId, { count: 1, amount, draw: item.draw });
      }
    }
  }

  return [...grouped.entries()].map(([drawId, item]) => {
    const draw = item.draw;
    const sessionTime = draw?.opensAt ?? draw?.closesAt ?? draw?.resultAt ?? draw?.drawDate;
    return {
      drawId,
      drawNumber: draw?.drawNumber ?? '',
      gameName: draw?.game?.name ?? '',
      gameCode: draw?.game?.code ?? '',
      drawDate: draw?.drawDate,
      drawTime: sessionTime,
      session: reportDrawSession(sessionTime, draw?.drawNumber),
      count: item.count,
      amount: item.amount.toString(),
    };
  }).sort((a, b) =>
    (a.drawDate?.getTime() ?? 0) - (b.drawDate?.getTime() ?? 0)
      || a.gameName.localeCompare(b.gameName)
      || a.session.localeCompare(b.session),
  );
}
