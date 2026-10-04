import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@lottivexa/database';
import type { Principal } from '../common/guards/jwt-auth.guard';
import { reportRange } from './report-policy';
import { buildSalesPdf } from './pdf-report';
import { ticketLineFlags } from '../tickets/ticket-line-flags';
import { groupTicketSalesByDraw, reportDrawSession } from './report-draw-policy';
import { parseMerchantIds } from './report-scope-policy';

const zone = 'America/Port-au-Prince';
type ReportFilterInput = { merchantIds?: string | string[]; branchId?: string };
type ReportScope = { merchantIds?: string[]; branchId?: string };

@Injectable()
export class ReportsService {
  async sales(u: Principal, from?: string, to?: string, filters: ReportFilterInput = {}) {
    const tenantId = this.tenant(u);
    const range = this.range(from, to);
    const scope = await this.scope(u, tenantId, filters);
    const ticketScope = {
      ...(scope.merchantIds ? { merchantId: { in: scope.merchantIds } } : {}),
      ...(scope.branchId ? { branchId: scope.branchId } : {}),
    };
    const where = { tenantId, createdAt: range, ...ticketScope };
    const saleWhere = { ...where, status: { notIn: ['CANCELLED', 'VOID'] as any } };
    const cancelledWhere = { ...where, status: { in: ['CANCELLED', 'VOID'] as any } };
    const payoutWhere = {
      tenantId,
      paidAt: range,
      ticket: ticketScope,
    };
    const commissionWhere = {
      tenantId,
      createdAt: range,
      ticket: { status: { notIn: ['CANCELLED', 'VOID'] as any } },
      ...(scope.merchantIds ? { merchantId: { in: scope.merchantIds } } : {}),
      ...(scope.branchId ? { merchant: { branchId: scope.branchId } } : {}),
    };

    const [totals, cancelledTotals, statuses, branches, games, payouts, commissions, commissionDetails, merchantSales, settings, dayRows, winnerRows] = await Promise.all([
      prisma.ticket.aggregate({ where: saleWhere, _count: { _all: true }, _sum: { amount: true, commission: true } }),
      prisma.ticket.aggregate({ where: cancelledWhere, _count: { _all: true }, _sum: { amount: true } }),
      prisma.ticket.groupBy({ by: ['status'], where, orderBy: { status: 'asc' }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.ticket.groupBy({ by: ['branchId'], where: saleWhere, orderBy: { branchId: 'asc' }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.ticket.groupBy({ by: ['gameId'], where: saleWhere, orderBy: { gameId: 'asc' }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.payout.aggregate({ where: payoutWhere, _count: { _all: true }, _sum: { amount: true } }),
      prisma.commissionTransaction.aggregate({ where: commissionWhere, _sum: { commissionAmount: true } }),
      prisma.commissionTransaction.findMany({
        where: commissionWhere,
        select: { merchantId: true, commissionAmount: true, rule: { select: { kind: true, percentage: true } } },
      }),
      prisma.ticket.groupBy({ by: ['merchantId'], where: saleWhere, orderBy: { merchantId: 'asc' }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.tenantSetting.findUnique({ where: { tenantId }, select: { currency: true } }),
      this.salesByDay(tenantId, scope, range),
      prisma.winningTicket.findMany({
        where: { tenantId, detectedAt: range, ticket: ticketScope },
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
              lines: { where: { isWinner: true }, select: { id: true, selectionKey: true, drawId: true, draw: { select: { drawNumber: true, game: { select: { name: true } } } }, betType: { select: { name: true } } } },
              ticketDraws: { select: { draw: { select: { id: true, drawNumber: true, drawDate: true, resultAt: true, closesAt: true, opensAt: true, game: { select: { name: true } } } } } },
              events: { select: { type: true, metadata: true } },
            },
          },
        },
      }),
    ]);

    const [branchInfo, gameInfo, merchantInfo] = await Promise.all([
      prisma.branch.findMany({ where: { tenantId, id: { in: branches.map(x => x.branchId) } }, select: { id: true, name: true, code: true } }),
      prisma.game.findMany({ where: { tenantId, id: { in: games.map(x => x.gameId) } }, select: { id: true, name: true, code: true } }),
      prisma.merchantAccount.findMany({ where: { tenantId, id: { in: merchantSales.map(x => x.merchantId) } }, select: { id: true, displayName: true, merchantNumber: true } }),
    ]);
    const branchById = new Map(branchInfo.map(x => [x.id, x]));
    const gameById = new Map(gameInfo.map(x => [x.id, x]));
    const merchantById = new Map(merchantInfo.map(x => [x.id, x]));
    const commissionByMerchant = new Map<string, { amount: Prisma.Decimal; rates: Set<string> }>();
    for (const row of commissionDetails) {
      const current = commissionByMerchant.get(row.merchantId) ?? { amount: new Prisma.Decimal(0), rates: new Set<string>() };
      current.amount = current.amount.add(row.commissionAmount);
      if (row.rule?.kind === 'PERCENTAGE' && row.rule.percentage) current.rates.add(`${row.rule.percentage.toString()}%`);
      commissionByMerchant.set(row.merchantId, current);
    }

    return {
      period: { from: range.gte, to: range.lte },
      currency: settings?.currency ?? 'USD',
      filters: { merchantIds: scope.merchantIds ?? [], branchId: scope.branchId ?? null },
      tickets: {
        count: totals._count._all,
        sales: totals._sum.amount?.toString() ?? '0',
        commission: totals._sum.commission?.toString() ?? '0',
      },
      payouts: { count: payouts._count._all, amount: payouts._sum.amount?.toString() ?? '0' },
      commission: commissions._sum.commissionAmount?.toString() ?? '0',
      byDay: dayRows.map(row => ({ day: row.day, count: Number(row.tickets), amount: String(row.sales) })),
      byMerchant: merchantSales.map(row => {
        const merchant = merchantById.get(row.merchantId);
        const commission = commissionByMerchant.get(row.merchantId);
        return {
          merchantId: row.merchantId,
          merchantName: merchant?.displayName ?? row.merchantId,
          merchantNumber: merchant?.merchantNumber ?? '',
          commissionRate: commission?.rates.size ? [...commission.rates].join(', ') : '—',
          count: row._count._all,
          amount: row._sum.amount?.toString() ?? '0',
          commission: commission?.amount.toString() ?? '0',
        };
      }).sort((a, b) => Number(b.amount) - Number(a.amount)),
      accounting: {
        cancelledCount: cancelledTotals._count._all,
        cancelledAmount: cancelledTotals._sum.amount?.toString() ?? '0',
        netSales: ((totals._sum.amount ?? new Prisma.Decimal(0)).sub(payouts._sum.amount ?? new Prisma.Decimal(0)).sub(commissions._sum.commissionAmount ?? new Prisma.Decimal(0))).toString(),
        deficit: Math.max(0, Number(payouts._sum.amount ?? 0) + Number(commissions._sum.commissionAmount ?? 0) - Number(totals._sum.amount ?? 0)).toFixed(2),
      },
      biggestWins: winnerRows.map(row => ({
        ticketNumber: row.ticket.ticketNumber,
        createdAt: row.ticket.createdAt,
        merchantName: row.ticket.merchant.displayName,
        gameName: row.ticket.draw.game.name,
        drawNumber: row.ticket.draw.drawNumber,
        session: reportDrawSession(row.ticket.draw.resultAt ?? row.ticket.draw.closesAt ?? row.ticket.draw.opensAt, row.ticket.draw.drawNumber),
        amount: row.winningAmount.toString(),
        draws: row.ticket.ticketDraws.map(item => ({ drawNumber: item.draw.drawNumber, drawDate: item.draw.drawDate, gameName: item.draw.game.name })),
        lines: row.ticket.lines.map(line => ({ selectionKey: line.selectionKey, drawId: line.drawId, drawNumber: line.draw?.drawNumber ?? '', drawGame: line.draw?.game.name ?? '', ...ticketLineFlags(row.ticket.events, line.id), betName: line.betType.name })),
      })),
      byStatus: statuses.map(x => ({ status: x.status, count: x._count._all, amount: x._sum.amount?.toString() ?? '0' })),
      byBranch: branches.map(x => ({ branchId: x.branchId, branchName: branchById.get(x.branchId)?.name ?? x.branchId, branchCode: branchById.get(x.branchId)?.code ?? '', count: x._count._all, amount: x._sum.amount?.toString() ?? '0' })),
      byGame: games.map(x => ({ gameId: x.gameId, gameName: gameById.get(x.gameId)?.name ?? x.gameId, gameCode: gameById.get(x.gameId)?.code ?? '', count: x._count._all, amount: x._sum.amount?.toString() ?? '0' })),
    };
  }

  async draws(u: Principal, from?: string, to?: string, filters: ReportFilterInput = {}) {
    const tenantId = this.tenant(u);
    const range = this.range(from, to);
    const scope = await this.scope(u, tenantId, filters);
    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        createdAt: range,
        status: { notIn: ['CANCELLED', 'VOID'] },
        ...(scope.merchantIds ? { merchantId: { in: scope.merchantIds } } : {}),
        ...(scope.branchId ? { branchId: scope.branchId } : {}),
      },
      select: {
        drawId: true,
        amount: true,
        lines: { select: { id: true, drawId: true, stake: true } },
        events: { select: { id: true, type: true, metadata: true, createdAt: true } },
        draw: { select: { id: true, drawNumber: true, drawDate: true, resultAt: true, opensAt: true, closesAt: true, game: { select: { name: true, code: true } } } },
        ticketDraws: { select: { drawId: true, draw: { select: { id: true, drawNumber: true, drawDate: true, resultAt: true, opensAt: true, closesAt: true, game: { select: { name: true, code: true } } } } } },
      },
    });
    return {
      period: { from: range.gte, to: range.lte },
      byDraw: groupTicketSalesByDraw(tickets.map(ticket => ({
        ...ticket,
        lines: ticket.lines.map(line => ({ drawId: line.drawId, stake: line.stake, isPromotional: ticketLineFlags(ticket.events, line.id).isPromotional })),
      }))),
    };
  }

  async pdf(u: Principal, from?: string, to?: string, filters: ReportFilterInput = {}) {
    const tenantId = this.tenant(u);
    const [report, drawReport, tenant] = await Promise.all([
      this.sales(u, from, to, filters),
      this.draws(u, from, to, filters),
      prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { legalName: true, branding: { select: { businessName: true } }, settings: { select: { currency: true } } } }),
    ]);
    return buildSalesPdf({
      ...report,
      byDraw: drawReport.byDraw.map(draw => ({
        ...draw,
        drawDate: draw.drawDate ?? undefined,
        drawTime: draw.drawTime ?? undefined,
      })),
    }, tenant.branding?.businessName ?? tenant.legalName, tenant.settings?.currency ?? 'USD');
  }

  private async scope(u: Principal, tenantId: string, filters: ReportFilterInput): Promise<ReportScope> {
    const signedInMerchant = await prisma.merchantAccount.findFirst({
      where: { tenantId, userId: u.sub, status: 'ACTIVE', archivedAt: null },
      select: { id: true, branchId: true },
    });
    if (signedInMerchant) return { merchantIds: [signedInMerchant.id], branchId: signedInMerchant.branchId };

    const merchantIds = parseMerchantIds(filters.merchantIds);
    const branchId = filters.branchId?.trim() || undefined;
    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId, archivedAt: null }, select: { id: true } });
      if (!branch) throw new BadRequestException('INVALID_REPORT_FILTER');
    }
    if (merchantIds) {
      const merchants = await prisma.merchantAccount.findMany({ where: { tenantId, id: { in: merchantIds }, archivedAt: null }, select: { id: true, branchId: true } });
      if (merchants.length !== merchantIds.length) throw new BadRequestException('INVALID_REPORT_FILTER');
      if (branchId && merchants.some(merchant => merchant.branchId !== branchId)) throw new BadRequestException('REPORT_MERCHANT_OFFICE_MISMATCH');
    }
    return { merchantIds, branchId };
  }

  private salesByDay(tenantId: string, scope: ReportScope, range: { gte: Date; lte: Date }) {
    const merchantFilter = scope.merchantIds?.length
      ? Prisma.sql`AND "merchantId" IN (${Prisma.join(scope.merchantIds.map(id => Prisma.sql`${id}::uuid`))})`
      : Prisma.empty;
    const branchFilter = scope.branchId ? Prisma.sql`AND "branchId" = ${scope.branchId}::uuid` : Prisma.empty;
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
        ${branchFilter}
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
