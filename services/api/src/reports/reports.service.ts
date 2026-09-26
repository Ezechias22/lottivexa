import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@lottivexa/database';
import type { Principal } from '../common/guards/jwt-auth.guard';
import { reportRange } from './report-policy';
import { buildSalesPdf } from './pdf-report';
import { ticketLineFlags } from '../tickets/ticket-line-flags';

const zone = 'America/Port-au-Prince';
type Session = 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' | 'UNKNOWN';

function sessionFor(date?: Date | null): Session {
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

@Injectable()
export class ReportsService {
  async sales(u: Principal, from?: string, to?: string) {
    const tenantId = this.tenant(u);
    const range = this.range(from, to);
    const merchant = await prisma.merchantAccount.findFirst({
      where: { tenantId, userId: u.sub, status: 'ACTIVE' },
      select: { id: true },
    });
    const merchantId = merchant?.id;
    const where = { tenantId, createdAt: range, ...(merchantId ? { merchantId } : {}) };
    const saleWhere = { ...where, status: { notIn: ['CANCELLED', 'VOID'] as any } };
    const cancelledWhere = { ...where, status: { in: ['CANCELLED', 'VOID'] as any } };
    const payoutWhere = { tenantId, paidAt: range, ...(merchantId ? { ticket: { merchantId } } : {}) };
    const commissionWhere = { tenantId, createdAt: range, ...(merchantId ? { merchantId } : {}) };

    const [totals, cancelledTotals, statuses, branches, games, payouts, commissions, settings, dayRows, winnerRows] = await Promise.all([
      prisma.ticket.aggregate({ where: saleWhere, _count: { _all: true }, _sum: { amount: true, potentialWin: true, commission: true } }),
      prisma.ticket.aggregate({ where: cancelledWhere, _count: { _all: true }, _sum: { amount: true } }),
      prisma.ticket.groupBy({ by: ['status'], where, orderBy: { status: 'asc' }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.ticket.groupBy({ by: ['branchId'], where: saleWhere, orderBy: { branchId: 'asc' }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.ticket.groupBy({ by: ['gameId'], where: saleWhere, orderBy: { gameId: 'asc' }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.payout.aggregate({ where: payoutWhere, _count: { _all: true }, _sum: { amount: true } }),
      prisma.commissionTransaction.aggregate({ where: commissionWhere, _sum: { commissionAmount: true } }),
      prisma.tenantSetting.findUnique({ where: { tenantId }, select: { currency: true } }),
      this.salesByDay(tenantId, merchantId, range),
      prisma.winningTicket.findMany({
        where: { tenantId, detectedAt: range, ...(merchantId ? { ticket: { merchantId } } : {}) },
        orderBy: [{ winningAmount: 'desc' }, { detectedAt: 'desc' }],
        take: 5,
        include: {
          ticket: {
            select: {
              ticketNumber: true,
              createdAt: true,
              amount: true,
              merchant: { select: { displayName: true } },
              draw: { select: { drawNumber: true, drawDate: true, resultAt: true, closesAt: true, opensAt: true, game: { select: { name: true } } } },
              lines: { where: { isWinner: true }, select: { id: true, selectionKey: true, betType: { select: { name: true } } } },
              events: { select: { type: true, metadata: true } },
            },
          },
        },
      }),
    ]);

    const [branchInfo, gameInfo] = await Promise.all([
      prisma.branch.findMany({ where: { tenantId, id: { in: branches.map(x => x.branchId) } }, select: { id: true, name: true, code: true } }),
      prisma.game.findMany({ where: { tenantId, id: { in: games.map(x => x.gameId) } }, select: { id: true, name: true, code: true } }),
    ]);
    const branchById = new Map(branchInfo.map(x => [x.id, x]));
    const gameById = new Map(gameInfo.map(x => [x.id, x]));

    return {
      period: { from: range.gte, to: range.lte },
      currency: settings?.currency ?? 'USD',
      tickets: {
        count: totals._count._all,
        sales: totals._sum.amount?.toString() ?? '0',
        potentialWin: totals._sum.potentialWin?.toString() ?? '0',
        commission: totals._sum.commission?.toString() ?? '0',
      },
      payouts: { count: payouts._count._all, amount: payouts._sum.amount?.toString() ?? '0' },
      commission: commissions._sum.commissionAmount?.toString() ?? '0',
      byDay: dayRows.map(row => ({ day: row.day, count: Number(row.tickets), amount: String(row.sales) })),
      accounting: {
        cancelledCount: cancelledTotals._count._all,
        cancelledAmount: cancelledTotals._sum.amount?.toString() ?? '0',
        netSales: ((totals._sum.amount ?? new Prisma.Decimal(0)) .sub(payouts._sum.amount ?? new Prisma.Decimal(0)).sub(commissions._sum.commissionAmount ?? new Prisma.Decimal(0))).toString(),
        deficit: Math.max(0, Number(payouts._sum.amount ?? 0) + Number(commissions._sum.commissionAmount ?? 0) - Number(totals._sum.amount ?? 0)).toFixed(2),
      },
      biggestWins: winnerRows.map(row => ({
        ticketNumber: row.ticket.ticketNumber,
        createdAt: row.ticket.createdAt,
        merchantName: row.ticket.merchant.displayName,
        gameName: row.ticket.draw.game.name,
        drawNumber: row.ticket.draw.drawNumber,
        session: sessionFor(row.ticket.draw.resultAt ?? row.ticket.draw.closesAt ?? row.ticket.draw.opensAt),
        amount: row.winningAmount.toString(),
        lines: row.ticket.lines.map(line => ({ selectionKey: line.selectionKey, ...ticketLineFlags(row.ticket.events, line.id), betName: line.betType.name })),
      })),
      byStatus: statuses.map(x => ({ status: x.status, count: x._count._all, amount: x._sum.amount?.toString() ?? '0' })),
      byBranch: branches.map(x => ({ branchId: x.branchId, branchName: branchById.get(x.branchId)?.name ?? x.branchId, branchCode: branchById.get(x.branchId)?.code ?? '', count: x._count._all, amount: x._sum.amount?.toString() ?? '0' })),
      byGame: games.map(x => ({ gameId: x.gameId, gameName: gameById.get(x.gameId)?.name ?? x.gameId, gameCode: gameById.get(x.gameId)?.code ?? '', count: x._count._all, amount: x._sum.amount?.toString() ?? '0' })),
    };
  }

  async draws(u: Principal, from?: string, to?: string) {
    const tenantId = this.tenant(u);
    const range = this.range(from, to);
    const merchant = await prisma.merchantAccount.findFirst({ where: { tenantId, userId: u.sub, status: 'ACTIVE' }, select: { id: true } });
    const grouped = await prisma.ticket.groupBy({
      by: ['drawId'],
      where: { tenantId, createdAt: range, ...(merchant ? { merchantId: merchant.id } : {}) },
      orderBy: { drawId: 'asc' },
      _count: { _all: true },
      _sum: { amount: true },
    });
    const draws = await prisma.draw.findMany({
      where: { tenantId, id: { in: grouped.map(x => x.drawId) } },
      select: { id: true, drawNumber: true, drawDate: true, resultAt: true, opensAt: true, closesAt: true, game: { select: { name: true, code: true } } },
    });
    const byId = new Map(draws.map(draw => [draw.id, draw]));
    return {
      period: { from: range.gte, to: range.lte },
      byDraw: grouped.map(item => {
        const draw = byId.get(item.drawId);
        const date = draw?.resultAt ?? draw?.closesAt ?? draw?.opensAt;
        return {
          drawId: item.drawId,
          drawNumber: draw?.drawNumber ?? '',
          gameName: draw?.game.name ?? '',
          gameCode: draw?.game.code ?? '',
          drawDate: draw?.drawDate,
          drawTime: date,
          session: sessionFor(date),
          count: item._count._all,
          amount: item._sum.amount?.toString() ?? '0',
        };
      }).sort((a, b) => (a.drawDate?.getTime() ?? 0) - (b.drawDate?.getTime() ?? 0) || a.gameName.localeCompare(b.gameName) || a.session.localeCompare(b.session)),
    };
  }

  async pdf(u: Principal, from?: string, to?: string) {
    const tenantId = this.tenant(u);
    const [report, tenant] = await Promise.all([
      this.sales(u, from, to),
      prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { legalName: true, branding: { select: { businessName: true } }, settings: { select: { currency: true } } } }),
    ]);
    return buildSalesPdf(report, tenant.branding?.businessName ?? tenant.legalName, tenant.settings?.currency ?? 'USD');
  }

  private salesByDay(tenantId: string, merchantId: string | undefined, range: { gte: Date; lte: Date }) {
    const merchantFilter = merchantId ? Prisma.sql`AND "merchantId" = ${merchantId}::uuid` : Prisma.empty;
    return prisma.$queryRaw<Array<{ day: string; tickets: number; sales: string }>>(Prisma.sql`
      SELECT TO_CHAR(DATE_TRUNC('day', "createdAt" AT TIME ZONE ${zone}), 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS tickets,
             COALESCE(SUM("amount"), 0)::text AS sales
      FROM "Ticket"
      WHERE "tenantId" = ${tenantId}::uuid
        AND "createdAt" >= ${range.gte}
        AND "createdAt" <= ${range.lte}
        AND "status" NOT IN ('CANCELLED', 'VOID')
        ${merchantFilter}
      GROUP BY 1
      ORDER BY 1
    `);
  }

  private range(from?: string, to?: string) {
    try { return reportRange(from, to); }
    catch { throw new BadRequestException('INVALID_DATE_RANGE'); }
  }

  private tenant(u: Principal) {
    if (!u.tenantId) throw new ForbiddenException('TENANT_ACCESS_REQUIRED');
    return u.tenantId;
  }
}
