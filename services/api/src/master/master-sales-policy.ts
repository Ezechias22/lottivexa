import { Prisma } from "@lottivexa/database";

export type TenantIdentity = { id: string; slug: string; legalName: string };
export type TenantTicketAggregate = {
  tenantId: string;
  tickets: number;
  amount: string;
};

export function normalizeTenantSalesAggregates(rows: readonly unknown[]): TenantTicketAggregate[] {
  return rows.map((value) => {
    if (!value || typeof value !== "object") throw new Error("INVALID_TENANT_SALES_AGGREGATE");
    const row = value as Record<string, unknown>;
    const counts = row._count && typeof row._count === "object"
      ? row._count as Record<string, unknown>
      : undefined;
    const sums = row._sum && typeof row._sum === "object"
      ? row._sum as Record<string, unknown>
      : undefined;
    const tenantId = row.tenantId;
    const tickets = counts?._all;
    const rawAmount = sums?.amount;
    if (typeof tenantId !== "string" || typeof tickets !== "number" || !Number.isInteger(tickets) || tickets < 0) {
      throw new Error("INVALID_TENANT_SALES_AGGREGATE");
    }
    const decimal = new Prisma.Decimal(rawAmount == null ? "0" : String(rawAmount));
    if (!decimal.isFinite()) throw new Error("INVALID_TENANT_SALES_AGGREGATE");
    return { tenantId, tickets, amount: decimal.toString() };
  });
}

export function platformTicketSalesWhere(): Prisma.TicketWhereInput {
  return {
    status: { notIn: ["CANCELLED", "VOID"] },
    events: { none: { type: "DELETED" } },
  };
}

export function buildTenantSalesBreakdown(
  tenants: readonly TenantIdentity[],
  aggregates: readonly TenantTicketAggregate[],
  currencyByTenant: ReadonlyMap<string, string>,
) {
  const aggregateByTenant = new Map(aggregates.map((row) => [row.tenantId, row] as const));
  return tenants.map((tenant) => {
    const aggregate = aggregateByTenant.get(tenant.id);
    return {
      tenantId: tenant.id,
      tenantName: tenant.legalName.trim() || tenant.slug,
      tenantSlug: tenant.slug,
      currency: currencyByTenant.get(tenant.id) ?? "USD",
      tickets: aggregate?.tickets ?? 0,
      amount: aggregate?.amount ?? "0",
    };
  });
}
