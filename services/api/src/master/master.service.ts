import { Injectable } from "@nestjs/common";
import { access, statfs } from "node:fs/promises";
import { constants } from "node:fs";
import { redisReady } from "../health/redis-health";
import { Prisma, prisma } from "@lottivexa/database";
import { buildTenantSalesBreakdown, normalizeTenantSalesAggregates, platformTicketSalesWhere } from "./master-sales-policy";

type TenantSalesRow = { tenantId: string; tickets: number; amount: string };

function salesByCurrency(
  rows: readonly TenantSalesRow[],
  currencyByTenant: Map<string, string>,
) {
  const totals = new Map<string, { tickets: number; amount: Prisma.Decimal }>();
  for (const row of rows) {
    const currency = currencyByTenant.get(row.tenantId) ?? "USD";
    const current = totals.get(currency) ?? { tickets: 0, amount: new Prisma.Decimal(0) };
    current.tickets += row.tickets;
    current.amount = current.amount.add(new Prisma.Decimal(row.amount));
    totals.set(currency, current);
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, value]) => ({ currency, tickets: value.tickets, amount: value.amount.toString() }));
}

@Injectable()
export class MasterService {
  async systemHealth() {
    const started = Date.now();
    let database = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch {}
    const databaseLatencyMs = Date.now() - started,
      redisRequired = process.env.REDIS_REQUIRED === "true",
      redisStarted = Date.now(),
      redis = redisRequired ? await redisReady() : true,
      redisLatencyMs = redisRequired ? Date.now() - redisStarted : 0,
      storagePath = process.env.STORAGE_PATH ?? "/tmp";
    let storage: any = { writable: false, path: storagePath };
    try {
      await access(storagePath, constants.W_OK);
      const info = await statfs(storagePath);
      storage = {
        writable: true,
        path: storagePath,
        freeBytes: info.bavail * info.bsize,
        totalBytes: info.blocks * info.bsize,
      };
    } catch {}
    const [
      failedPrintJobs,
      failedNotifications,
      syncConflicts,
      pendingNotifications,
      leases,
    ] = await Promise.all([
      prisma.printJob.count({ where: { status: "FAILED" } }),
      prisma.notification.count({ where: { status: "FAILED" } }),
      prisma.syncJob.count({
        where: { status: { in: ["REJECTED", "CONFLICT"] } },
      }),
      prisma.notification.count({ where: { status: "PENDING" } }),
      prisma.schedulerLease.findMany({ orderBy: { name: "asc" } }),
    ]);
    return {
      status: database && storage.writable && (!redisRequired || redis) ? "HEALTHY" : "DEGRADED",
      api: {
        uptimeSeconds: Math.floor(process.uptime()),
        rssBytes: process.memoryUsage().rss,
      },
      database: { ready: database, latencyMs: databaseLatencyMs },
      redis: { ready: redis, latencyMs: redisLatencyMs },
      storage,
      queues: {
        failedPrintJobs,
        failedNotifications,
        syncConflicts,
        pendingNotifications,
      },
      scheduler: leases.map((x) => ({
        name: x.name,
        owner: x.owner,
        lockedUntil: x.lockedUntil,
      })),
    };
  }
  async dashboard() {
    const [
      tenants,
      active,
      subscriptions,
      merchants,
      branches,
      tenantSales,
      tenantCurrencies,
      tenantRows,
      failedPayments,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.merchantAccount.count({ where: { status: "ACTIVE" } }),
      prisma.branch.count({ where: { status: "ACTIVE" } }),
      prisma.ticket.groupBy({
        by: ["tenantId"],
        where: platformTicketSalesWhere(),
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.tenantSetting.findMany({ select: { tenantId: true, currency: true } }),
      prisma.tenant.findMany({ select: { id: true, slug: true, legalName: true }, orderBy: { legalName: "asc" } }),
      prisma.subscriptionPayment.count({ where: { status: "FAILED" } }),
    ]);
    const currencyByTenant = new Map<string, string>(tenantCurrencies.map((row) => [row.tenantId, row.currency] as const));
    const normalizedTenantSales = normalizeTenantSalesAggregates(tenantSales);
    const salesByTenant = buildTenantSalesBreakdown(tenantRows, normalizedTenantSales, currencyByTenant);
    return {
      tenants,
      activeTenants: active,
      activeSubscriptions: subscriptions,
      merchants,
      branches,
      tickets: normalizedTenantSales.reduce((sum, row) => sum + row.tickets, 0),
      salesByCurrency: salesByCurrency(normalizedTenantSales, currencyByTenant),
      salesByTenant,
      failedPayments,
    };
  }
  async reports() {
    const [
      tenantStatus,
      subscriptionStatus,
      planDistribution,
      revenueByCurrency,
      tenantSales,
      tenantCurrencies,
      tenantRows,
    ] = await Promise.all([
      prisma.tenant.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      prisma.subscription.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      prisma.subscription.groupBy({
        by: ["planId"],
        orderBy: { planId: "asc" },
        _count: { _all: true },
      }),
      prisma.subscriptionPayment.groupBy({
        by: ["currency"],
        where: { status: "VERIFIED" },
        orderBy: { currency: "asc" },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.ticket.groupBy({
        by: ["tenantId"],
        where: platformTicketSalesWhere(),
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.tenantSetting.findMany({ select: { tenantId: true, currency: true } }),
      prisma.tenant.findMany({ select: { id: true, slug: true, legalName: true }, orderBy: { legalName: "asc" } }),
    ]);
    const currencyByTenant = new Map<string, string>(tenantCurrencies.map((row) => [row.tenantId, row.currency] as const));
    const normalizedTenantSales = normalizeTenantSalesAggregates(tenantSales);
    const salesByTenant = buildTenantSalesBreakdown(tenantRows, normalizedTenantSales, currencyByTenant);
    return {
      tenantStatus: tenantStatus.map((x) => ({
        status: x.status,
        count: x._count._all,
      })),
      subscriptionStatus: subscriptionStatus.map((x) => ({
        status: x.status,
        count: x._count._all,
      })),
      planDistribution: planDistribution.map((x) => ({
        planId: x.planId,
        count: x._count._all,
      })),
      subscriptionRevenueByCurrency: revenueByCurrency.map((row) => ({
        currency: row.currency,
        payments: row._count._all,
        amount: row._sum.amount?.toString() ?? "0",
      })),
      platformSales: {
        tickets: normalizedTenantSales.reduce((sum, row) => sum + row.tickets, 0),
        byCurrency: salesByCurrency(normalizedTenantSales, currencyByTenant),
        byTenant: salesByTenant,
      },
    };
  }
  async audit() {
    const rows = await prisma.auditLog.findMany({
      take: 200,
      orderBy: { id: "desc" },
      include: {
        tenant: { select: { slug: true } },
        user: { select: { username: true } },
      },
    });
    return rows.map((x) => ({ ...x, id: x.id.toString() }));
  }
  devices() {
    return prisma.device.findMany({
      take: 200,
      orderBy: { updatedAt: "desc" },
      include: {
        tenant: { select: { slug: true } },
        branch: { select: { name: true } },
      },
    });
  }
  domains() {
    return prisma.tenantDomain.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { slug: true } } },
    });
  }
  lotteryCatalog() {
    return prisma.game.findMany({
      where: { catalogCode: { not: null }, archivedAt: null },
      select: { catalogCode: true, code: true, name: true, logoUrl: true, status: true, sourceUrl: true },
      orderBy: [{ catalogCode: "asc" }, { name: "asc" }],
    }).then(rows => {
      const byCode = new Map<string, typeof rows[number]>();
      for (const row of rows) if (row.catalogCode && !byCode.has(row.catalogCode)) byCode.set(row.catalogCode, row);
      return [...byCode.values()];
    });
  }
  async updateLotteryLogo(catalogCode: string, logoUrl: string) {
    const changed = await prisma.game.updateMany({ where: { catalogCode, archivedAt: null }, data: { logoUrl: logoUrl || null } });
    if (!changed.count) throw new Error("LOTTERY_CATALOG_NOT_FOUND");
    return { catalogCode, logoUrl: logoUrl || null, updatedGames: changed.count };
  }
  async failures() {
    const [sync, printing, notifications] = await Promise.all([
      prisma.syncJob.findMany({
        where: { status: { in: ["REJECTED", "CONFLICT"] } },
        take: 100,
        orderBy: { receivedAt: "desc" },
      }),
      prisma.printJob.findMany({
        where: { status: "FAILED" },
        take: 100,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.notification.findMany({
        where: { status: "FAILED" },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { sync, printing, notifications };
  }
  createPlan(dto: {
    code: string;
    name: string;
    monthlyPrice: string;
    yearlyPrice: string;
    currency: string;
    trialDays?: number;
  }) {
    return prisma.plan.create({
      data: {
        ...dto,
        currency: dto.currency.toUpperCase(),
        trialDays: dto.trialDays ?? 0,
      },
    });
  }
}
